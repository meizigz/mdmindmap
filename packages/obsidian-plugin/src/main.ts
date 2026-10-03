import {
  Notice,
  Plugin,
  TFile,
  loadMathJax,
  type WorkspaceLeaf,
} from "obsidian";
import aiGuide from "mdmindmap/ai-guide.md";
import { BlockRegistry, HOVER_SOURCE, MindMapBlock } from "./block";
import { FILE_VIEW_TYPE, MindMapFileView } from "./file-view";
import { t } from "./i18n";
import { MindMapTabView, TAB_VIEW_TYPE } from "./tab-view";

export default class MdMindmapPlugin extends Plugin {
  private readonly blocks = new BlockRegistry();

  override async onload(): Promise<void> {
    // renderMath 之前要先加载 MathJax（笔记里没有公式时 Obsidian 不会主动加载）。
    await loadMathJax();
    this.registerHoverLinkSource(HOVER_SOURCE, {
      display: "MD Mindmap",
      defaultMod: true,
    });
    this.registerMarkdownCodeBlockProcessor("mdmindmap", (source, el, ctx) => {
      ctx.addChild(new MindMapBlock(el, this.app, this.blocks, source, ctx));
    });
    this.register(() => this.blocks.dispose());

    // 跟随编辑：被编辑的行落在另一个分屏的某张导图里时，把对应节点移进视野。
    this.registerEvent(
      this.app.workspace.on("editor-change", (editor, info) => {
        if (!info.file) return;
        const leafEl =
          "containerEl" in info
            ? info.containerEl.closest(".workspace-leaf")
            : null;
        this.blocks.edited(info.file.path, editor.getCursor().line, leafEl);
      }),
    );

    // 整篇文件视图、全屏标签页
    this.registerView(FILE_VIEW_TYPE, (leaf) => new MindMapFileView(leaf));
    this.registerView(TAB_VIEW_TYPE, (leaf) => new MindMapTabView(leaf));

    // 复制 AI 写作说明（与 npm 包里的 ai-guide.md、mdmindmap guide 的输出相同）
    this.addCommand({
      id: "copy-ai-guide",
      name: t("copyAiGuide"),
      callback: () =>
        void navigator.clipboard
          .writeText(aiGuide)
          .then(() => new Notice(t("aiGuideCopied"))),
    });
    this.addCommand({
      id: "open-as-mindmap",
      name: t("openAsMindmap"),
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const leaf = this.app.workspace.getMostRecentLeaf();
        if (!file || file.extension !== "md" || !leaf) return false;
        if (leaf.view.getViewType() === FILE_VIEW_TYPE) return false;
        if (!checking) void this.openAsMindmap(leaf, file);
        return true;
      },
    });
    // 文件菜单；标签页右上角「更多选项」菜单也会触发这个事件。
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file, _source, leaf) => {
        if (!(file instanceof TFile) || file.extension !== "md") return;
        if (leaf?.view.getViewType() === FILE_VIEW_TYPE) return;
        menu.addItem((item) =>
          item
            .setTitle(t("openAsMindmap"))
            .setIcon("git-fork")
            .onClick(
              () =>
                void this.openAsMindmap(
                  leaf ?? this.app.workspace.getLeaf(false),
                  file,
                ),
            ),
        );
      }),
    );
  }

  /** 在同一个标签页里切换成导图视图（v1 不做按 frontmatter 自动打开）。 */
  private async openAsMindmap(leaf: WorkspaceLeaf, file: TFile): Promise<void> {
    await leaf.setViewState({
      type: FILE_VIEW_TYPE,
      state: { file: file.path },
      active: true,
    });
  }
}
