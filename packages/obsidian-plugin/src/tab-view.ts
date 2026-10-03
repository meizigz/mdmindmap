// 「在新标签页打开」：用自定义 ItemView 全屏显示代码块里的这张导图，方便看大图（spec §12）。
// 打开时把源文和代码块位置记进视图状态；之后不再跟随源文变化（需要时重新从代码块打开）。

import {
  ItemView,
  Keymap,
  TFile,
  type HoverParent,
  type HoverPopover,
  type Menu,
  type ViewStateResult,
} from "obsidian";
import { render, type MindMap } from "mdmindmap";
import { HOVER_SOURCE } from "./block";
import { exportMap, showExportMenu } from "./export";
import { t } from "./i18n";
import { obsidianMath } from "./math";
import { showNodeMenu } from "./menu";
import { openEditorAt } from "./source";

export const TAB_VIEW_TYPE = "mdmindmap-tab";

export interface TabState {
  source: string;
  sourcePath: string;
  /** 代码块围栏所在的行（从 0 开始）；文件行 = lineStart + 节点在源文中的行号。 */
  lineStart: number;
  title: string;
}

function isTabState(value: unknown): value is TabState {
  const v = value as Partial<TabState> | null;
  return (
    typeof v?.source === "string" &&
    typeof v.sourcePath === "string" &&
    typeof v.lineStart === "number" &&
    typeof v.title === "string"
  );
}

export class MindMapTabView extends ItemView implements HoverParent {
  hoverPopover: HoverPopover | null = null;
  private state: TabState | null = null;
  private map: MindMap | null = null;

  override getViewType(): string {
    return TAB_VIEW_TYPE;
  }

  override getDisplayText(): string {
    return this.state
      ? `${this.state.title} · ${t("viewTitle")}`
      : t("viewTitle");
  }

  override getIcon(): string {
    return "git-fork";
  }

  override async onOpen(): Promise<void> {
    this.contentEl.addClass("mdmindmap-file-view");
    this.addAction("image-down", t("exportPng"), (event) => {
      if (this.map && this.state) {
        showExportMenu(
          this.app,
          this.map,
          this.state.sourcePath,
          this.state.title,
          event,
        );
      }
    });
    this.registerDomEvent(this.contentEl, "mouseover", (event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        ".mdmm-wikilink",
      );
      if (!target || !this.state) return;
      this.app.workspace.trigger("hover-link", {
        event,
        source: HOVER_SOURCE,
        hoverParent: this,
        targetEl: target,
        linktext: target.dataset.target ?? "",
        sourcePath: this.state.sourcePath,
      });
    });
    await Promise.resolve();
  }

  override async onClose(): Promise<void> {
    this.map?.destroy();
    this.map = null;
    await Promise.resolve();
  }

  override getState(): Record<string, unknown> {
    return { ...super.getState(), ...this.state };
  }

  override async setState(
    state: unknown,
    result: ViewStateResult,
  ): Promise<void> {
    if (isTabState(state)) {
      this.state = { ...state };
      this.show();
    }
    await super.setState(state, result);
  }

  override onPaneMenu(menu: Menu, source: string): void {
    for (const kind of ["png", "svg"] as const) {
      menu.addItem((item) =>
        item
          .setTitle(t(kind === "png" ? "exportPng" : "exportSvg"))
          .setIcon("image-down")
          .onClick(() => {
            const state = this.state;
            if (this.map && state) {
              void exportMap(
                this.app,
                this.map,
                kind,
                state.sourcePath,
                state.title,
              );
            }
          }),
      );
    }
    super.onPaneMenu(menu, source);
  }

  private show(): void {
    const state = this.state;
    if (!state) return;
    this.map?.destroy();
    this.contentEl.empty();
    this.map = render(this.contentEl, state.source, {
      math: obsidianMath,
      interaction: "direct",
      onNodeClick: (node) => void this.reveal(node.line),
      onDiagnosticClick: (d) => void this.reveal(d.line),
      onLinkClick: (target, event) =>
        void this.app.workspace.openLinkText(
          target,
          state.sourcePath,
          Keymap.isModEvent(event),
        ),
      onNodeMenu: (node, position) =>
        showNodeMenu({
          node,
          position,
          doc: this.contentEl.doc,
          jump: () => void this.reveal(node.line),
        }),
    });
  }

  private async reveal(line: number): Promise<void> {
    const state = this.state;
    if (!state) return;
    const file = this.app.vault.getAbstractFileByPath(state.sourcePath);
    if (file instanceof TFile) {
      await openEditorAt(this.app, file, state.lineStart + line, this.leaf);
    }
  }
}
