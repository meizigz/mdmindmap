// 整篇文件视图（spec §12）：任何 .md 都能在同一个标签页里切换成只读导图，右上角按钮切回文档。
// 点节点：桌面端在旁边分屏打开编辑器并定位（之后复用这个分屏）；手机端切回编辑视图再定位。
// 分屏编辑时监听 editor-change，停止输入约 300 ms 后增量刷新，不等文件保存。

import {
  Keymap,
  TextFileView,
  debounce,
  type Debouncer,
  type HoverParent,
  type HoverPopover,
  type Menu,
  type WorkspaceLeaf,
} from "obsidian";
import { render, type MindMap } from "mdmindmap";
import { HOVER_SOURCE } from "./block";
import { exportMap, showExportMenu } from "./export";
import { t } from "./i18n";
import { obsidianMath } from "./math";
import { showNodeMenu } from "./menu";
import { openEditorAt } from "./source";

export const FILE_VIEW_TYPE = "mdmindmap-file";
const REFRESH_DELAY = 300;

export class MindMapFileView extends TextFileView implements HoverParent {
  hoverPopover: HoverPopover | null = null;
  private map: MindMap | null = null;
  private readonly refreshLater: Debouncer<[string], void>;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.refreshLater = debounce(
      (source: string) => void this.map?.update(source),
      REFRESH_DELAY,
      true,
    );
  }

  override getViewType(): string {
    return FILE_VIEW_TYPE;
  }

  override getDisplayText(): string {
    return this.file?.basename ?? t("viewTitle");
  }

  override getIcon(): string {
    return "git-fork";
  }

  override canAcceptExtension(extension: string): boolean {
    return extension === "md";
  }

  override async onOpen(): Promise<void> {
    await super.onOpen();
    this.contentEl.addClass("mdmindmap-file-view");
    this.addAction(
      "file-text",
      t("backToDocument"),
      () => void this.backToDocument(),
    );
    this.addAction("image-down", t("exportPng"), (event) => {
      if (this.map && this.file) {
        showExportMenu(
          this.app,
          this.map,
          this.file.path,
          this.file.basename,
          event,
        );
      }
    });

    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, info) => {
        if (this.file && info.file?.path === this.file.path) {
          this.refreshLater(editor.getValue());
        }
      }),
    );
    this.registerDomEvent(this.contentEl, "mouseover", (event) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        ".mdmm-wikilink",
      );
      if (!target || !this.file) return;
      this.app.workspace.trigger("hover-link", {
        event,
        source: HOVER_SOURCE,
        hoverParent: this,
        targetEl: target,
        linktext: target.dataset.target ?? "",
        sourcePath: this.file.path,
      });
    });
  }

  override onPaneMenu(menu: Menu, source: string): void {
    menu.addItem((item) =>
      item
        .setTitle(t("backToDocument"))
        .setIcon("file-text")
        .onClick(() => void this.backToDocument()),
    );
    for (const kind of ["png", "svg"] as const) {
      menu.addItem((item) =>
        item
          .setTitle(t(kind === "png" ? "exportPng" : "exportSvg"))
          .setIcon("image-down")
          .onClick(() => {
            if (this.map && this.file) {
              void exportMap(
                this.app,
                this.map,
                kind,
                this.file.path,
                this.file.basename,
              );
            }
          }),
      );
    }
    super.onPaneMenu(menu, source);
  }

  // 只读：原样返回读到的内容，Obsidian 不会因为这个视图改写文件。
  override getViewData(): string {
    return this.data;
  }

  override setViewData(data: string, clear: boolean): void {
    if (clear || !this.map) {
      this.map?.destroy();
      this.map = this.createMap(data);
    } else {
      void this.map.update(data);
    }
  }

  override clear(): void {
    this.map?.destroy();
    this.map = null;
    this.contentEl.empty();
  }

  override async onClose(): Promise<void> {
    this.refreshLater.cancel();
    this.clear();
    await super.onClose();
  }

  private createMap(data: string): MindMap {
    const file = this.file;
    this.contentEl.empty();
    return render(this.contentEl, data, {
      math: obsidianMath,
      interaction: "direct",
      ...(file && { document: { title: file.basename } }),
      onNodeClick: (node) => void this.reveal(node.line),
      onDiagnosticClick: (d) => void this.reveal(d.line),
      onLinkClick: (target, event) =>
        void this.app.workspace.openLinkText(
          target,
          file?.path ?? "",
          Keymap.isModEvent(event),
        ),
      onNodeMenu: (node, position) =>
        showNodeMenu({
          node,
          position,
          doc: this.contentEl.doc,
          jump: () => void this.reveal(node.line),
          ...(file && {
            linkpath: this.app.metadataCache.fileToLinktext(file, ""),
          }),
        }),
    });
  }

  /** 跳到源文第 line 行（从 1 开始；用文件名作的根是 0，跳到文件开头）。 */
  private async reveal(line: number): Promise<void> {
    if (!this.file) return;
    await openEditorAt(this.app, this.file, Math.max(0, line - 1), this.leaf);
  }

  private async backToDocument(): Promise<void> {
    if (!this.file) return;
    await this.leaf.setViewState({
      type: "markdown",
      state: { file: this.file.path },
    });
  }
}
