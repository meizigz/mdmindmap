import {
  MarkdownView,
  Notice,
  Platform,
  Plugin,
  TFile,
  loadMathJax,
  normalizePath,
  type WorkspaceLeaf,
} from "obsidian";
import aiGuide from "mdmindmap/ai-guide.md";
import { BlockRegistry, HOVER_SOURCE, MindMapBlock } from "./block";
import { FILE_VIEW_TYPE, MindMapFileView } from "./file-view";
import { t } from "./i18n";
import { availableName, newMindmapSource } from "./new-file";
import { DEFAULT_SETTINGS, SettingsTab, type Settings } from "./settings";
import { MindMapTabView, TAB_VIEW_TYPE } from "./tab-view";

export default class MdMindmapPlugin extends Plugin {
  private readonly blocks = new BlockRegistry();
  private settings: Settings = { ...DEFAULT_SETTINGS };

  override async onload(): Promise<void> {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...((await this.loadData()) as Partial<Settings> | null),
    };
    this.addSettingTab(
      new SettingsTab(this.app, this, this.settings, () =>
        this.saveData(this.settings),
      ),
    );
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
      id: "new-mindmap",
      name: t("newMindmap"),
      callback: () => void this.createMindmap(),
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

  /**
   * 在「新建笔记的存放位置」建一个只有根节点的导图文件，在新标签页里用编辑器打开，选中根节点文字。
   * 桌面端再在右侧分屏打开它的导图视图，边写边看。
   */
  private async createMindmap(): Promise<void> {
    const { vault, workspace, fileManager } = this.app;
    const folder = fileManager.getNewFileParent(
      workspace.getActiveFile()?.path ?? "",
    );
    const pathOf = (name: string) => normalizePath(`${folder.path}/${name}.md`);
    const name = availableName(
      t("untitledMindmap"),
      (candidate) => vault.getAbstractFileByPath(pathOf(candidate)) !== null,
    );
    const { text, rootLine } = newMindmapSource(
      this.settings.newFileFrontmatter,
      name,
    );
    const file = await vault.create(pathOf(name), text);

    const editorLeaf = workspace.getLeaf("tab");
    await editorLeaf.openFile(file, { state: { mode: "source" } });
    if (!Platform.isMobile) {
      await workspace.createLeafBySplit(editorLeaf, "vertical").setViewState({
        type: FILE_VIEW_TYPE,
        state: { file: file.path },
      });
    }
    workspace.setActiveLeaf(editorLeaf, { focus: true });
    if (editorLeaf.view instanceof MarkdownView) {
      const { editor } = editorLeaf.view;
      editor.setSelection(
        { line: rootLine, ch: 2 },
        { line: rootLine, ch: editor.getLine(rootLine).length },
      );
      editor.focus();
    }
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
