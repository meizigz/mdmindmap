// mdmindmap 代码块：阅读视图和实时预览都会调用。处理器会被反复调用，每次都是新元素，渲染要幂等。
//
// 分屏编辑时保持状态（spec §12）：在分屏 1 编辑时，Obsidian 会让分屏 2 的代码块重新执行。
// 旧元素卸载时不立刻销毁导图，而是放进交接池 2 秒；新元素挂上页面后，按「同一分屏、同一文件、
// 第几个 mdmindmap 代码块」找回旧实例，把它的 DOM 移过来再 update(source)，缩放和折叠都不丢。

import {
  Keymap,
  MarkdownRenderChild,
  Notice,
  type App,
  type HoverParent,
  type HoverPopover,
  type MarkdownPostProcessorContext,
  setIcon,
} from "obsidian";
import { render, type MindMap } from "mdmindmap";
import { showExportMenu } from "./export";
import { blockOrdinal, parseFence } from "./fence";
import { t } from "./i18n";
import { obsidianMath } from "./math";
import { showNodeMenu } from "./menu";
import { markdownViewOf, revealLine } from "./source";
import { TAB_VIEW_TYPE, type TabState } from "./tab-view";

/** 实时预览把点进代码块的鼠标事件当作「把光标放进去」：在整个部件上拦住这些事件的冒泡。 */
const SWALLOWED = ["mousedown", "pointerdown", "click", "dblclick"] as const;
const HANDOFF_MS = 2000;
/** 等元素挂进页面最多等几帧；等不到就直接新建（核心库自己会等挂上再测量）。 */
const CONNECT_FRAMES = 30;
/** 编辑发生后多久之内，重新渲染的导图还要跟随。 */
const FOLLOW_MS = 5000;

export const HOVER_SOURCE = "mdmindmap";

/** 一张活着的导图。owner 指向当前负责它的代码块组件，交接时改指新组件，回调随之换人。 */
interface Live {
  map: MindMap;
  wrap: HTMLElement;
  owner: { block: MindMapBlock | null };
  key: string | null;
  leafEl: Element | null;
  /** 交接池里等待销毁的定时器，以及设定它的窗口（Obsidian 弹出窗口有自己的定时器）。 */
  timer: { id: number; win: Window } | null;
}

/** 插件级的共享状态：交接池、活着的代码块、最近一次编辑的位置。 */
export class BlockRegistry {
  readonly pool = new Set<Live>();
  readonly blocks = new Set<MindMapBlock>();
  edit: {
    path: string;
    line: number;
    leafEl: Element | null;
    time: number;
  } | null = null;

  /** 记下一次编辑，并让另一个分屏里的导图跟随。line 是文件中的行（从 0 开始）。 */
  edited(path: string, line: number, leafEl: Element | null): void {
    this.edit = { path, line, leafEl, time: Date.now() };
    for (const block of this.blocks) block.follow();
  }

  dispose(): void {
    for (const live of this.pool) {
      if (live.timer) live.timer.win.clearTimeout(live.timer.id);
      live.map.destroy();
    }
    this.pool.clear();
  }
}

export class MindMapBlock extends MarkdownRenderChild implements HoverParent {
  hoverPopover: HoverPopover | null = null;
  private live: Live | null = null;
  private unloaded = false;

  constructor(
    containerEl: HTMLElement,
    private readonly app: App,
    private readonly registry: BlockRegistry,
    private readonly source: string,
    private readonly ctx: MarkdownPostProcessorContext,
  ) {
    super(containerEl);
  }

  override onload(): void {
    this.registry.blocks.add(this);
    this.mount(0);
  }

  override onunload(): void {
    this.unloaded = true;
    this.registry.blocks.delete(this);
    const live = this.live;
    this.live = null;
    if (!live) return;
    live.owner.block = null;
    if (live.key === null) {
      live.map.destroy();
      return;
    }
    const { pool } = this.registry;
    const win = this.containerEl.win;
    live.timer = {
      win,
      id: win.setTimeout(() => {
        if (pool.delete(live)) live.map.destroy();
      }, HANDOFF_MS),
    };
    pool.add(live);
  }

  /** 另一个分屏刚编辑过这个代码块里的某一行，而对应节点不在视野内：最小平移把它移进来并高亮。 */
  follow(): void {
    const edit = this.registry.edit;
    const live = this.live;
    if (!edit || !live || edit.path !== this.ctx.sourcePath) return;
    if (Date.now() - edit.time > FOLLOW_MS) return;
    const leafEl = this.containerEl.closest(".workspace-leaf");
    if (!leafEl || leafEl === edit.leafEl) return;
    const info = this.ctx.getSectionInfo(this.containerEl);
    if (!info || edit.line <= info.lineStart || edit.line >= info.lineEnd)
      return;
    void live.map.revealLine(edit.line - info.lineStart, { flash: "moved" });
  }

  /** 等元素挂进页面、知道自己在哪个分屏后：能接手旧实例就接手，否则新建。 */
  private mount(frames: number): void {
    if (this.unloaded) return;
    if (!this.containerEl.isConnected && frames < CONNECT_FRAMES) {
      this.containerEl.win.requestAnimationFrame(() => this.mount(frames + 1));
      return;
    }
    const leafEl = this.containerEl.closest(".workspace-leaf");
    const info = this.ctx.getSectionInfo(this.containerEl);
    const key = info
      ? `${this.ctx.sourcePath}#${blockOrdinal(info.text, info.lineStart)}`
      : null;

    const previous =
      key === null
        ? undefined
        : [...this.registry.pool].find(
            (e) => e.key === key && e.leafEl === leafEl,
          );
    if (previous) {
      if (previous.timer) previous.timer.win.clearTimeout(previous.timer.id);
      this.registry.pool.delete(previous);
      previous.owner.block = this;
      previous.timer = null;
      this.live = previous;
      this.containerEl.append(previous.wrap);
      this.bindDom(previous.wrap);
      void previous.map.update(this.source).then(() => this.follow());
      return;
    }

    const wrap = this.containerEl.createDiv({ cls: "mdmindmap-block" });
    this.bindDom(wrap);
    const fence = info ? (info.text.split("\n")[info.lineStart] ?? "") : "";
    const { height } = parseFence(fence);
    const owner: Live["owner"] = { block: this };
    const map = render(wrap, this.source, {
      math: obsidianMath,
      height: height ?? "auto",
      interaction: "click-to-activate",
      onNodeClick: (node) => void owner.block?.jump(node.line),
      onDiagnosticClick: (d) => void owner.block?.jump(d.line),
      onLinkClick: (target, event) => owner.block?.openLink(target, event),
      onNodeMenu: (node, position) => {
        const block = owner.block;
        if (!block) return;
        showNodeMenu({
          node,
          position,
          doc: block.containerEl.doc,
          ...(block.ctx.getSectionInfo(block.containerEl) && {
            jump: () => void block.jump(node.line),
          }),
        });
      },
    });
    this.addToolbar(wrap, owner, map);
    this.live = { map, wrap, owner, key, leafEl, timer: null };
    void map.ready.then(() => this.follow());
  }

  /**
   * 右上角的小工具栏：在新标签页打开、导出。按钮随外层元素一起交接，
   * 所以用普通监听器、经 owner 转给当前负责的组件。
   */
  private addToolbar(
    wrap: HTMLElement,
    owner: Live["owner"],
    map: MindMap,
  ): void {
    const bar = wrap.createDiv({ cls: "mdmindmap-toolbar" });
    const button = (
      icon: string,
      label: string,
      onClick: (e: MouseEvent) => void,
    ) => {
      const el = bar.createEl("button", {
        cls: "clickable-icon",
        attr: { "aria-label": label },
      });
      setIcon(el, icon);
      el.addEventListener("click", onClick);
    };
    button(
      "maximize-2",
      t("openInNewTab"),
      () => void owner.block?.openInTab(),
    );
    button("image-down", t("exportPng"), (event) => {
      const block = owner.block;
      if (block) {
        showExportMenu(
          block.app,
          map,
          block.ctx.sourcePath,
          block.baseName(),
          event,
        );
      }
    });
  }

  private baseName(): string {
    const name = this.ctx.sourcePath.split("/").pop() ?? "";
    return name.replace(/\.md$/i, "");
  }

  private async openInTab(): Promise<void> {
    const info = this.ctx.getSectionInfo(this.containerEl);
    const state: TabState = {
      source: this.source,
      sourcePath: this.ctx.sourcePath,
      lineStart: info?.lineStart ?? 0,
      title: this.baseName(),
    };
    await this.app.workspace.getLeaf("tab").setViewState({
      type: TAB_VIEW_TYPE,
      state: { ...state },
      active: true,
    });
  }

  private bindDom(wrap: HTMLElement): void {
    for (const type of SWALLOWED) {
      this.registerDomEvent(wrap, type, (e) => e.stopPropagation());
    }
    // 双链悬停预览：交给 Obsidian 的页面预览（默认按住 Ctrl/Cmd 悬停）。
    this.registerDomEvent(wrap, "mouseover", (event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        ".mdmm-wikilink",
      );
      if (!target) return;
      this.app.workspace.trigger("hover-link", {
        event,
        source: HOVER_SOURCE,
        hoverParent: this,
        targetEl: target,
        linktext: target.dataset.target ?? "",
        sourcePath: this.ctx.sourcePath,
      });
    });
  }

  private openLink(target: string, event: PointerEvent): void {
    void this.app.workspace.openLinkText(
      target,
      this.ctx.sourcePath,
      Keymap.isModEvent(event),
    );
  }

  /**
   * 跳到源文第 line 行（从 1 开始）。文件里的行 = 代码块围栏所在行 + line。
   * 嵌入、悬停预览、Canvas 等拿不到代码块位置（getSectionInfo 为 null），这时不跳转。
   */
  private async jump(line: number): Promise<void> {
    const info = this.ctx.getSectionInfo(this.containerEl);
    const view = markdownViewOf(this.app, this.containerEl);
    if (!info || !view) {
      new Notice(t("noSection"));
      return;
    }
    await revealLine(view, info.lineStart + line);
  }
}
