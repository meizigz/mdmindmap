// 跳到源码的某一行（spec §12）。不长期持有 view：每次点击时现找。

import {
  MarkdownView,
  Platform,
  type App,
  type TFile,
  type WorkspaceLeaf,
} from "obsidian";

/** 包含这个元素的 Markdown 视图（嵌在笔记里的代码块）。 */
export function markdownViewOf(app: App, el: HTMLElement): MarkdownView | null {
  let found: MarkdownView | null = null;
  app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
    const view = leaf.view;
    if (
      !found &&
      view instanceof MarkdownView &&
      view.containerEl.contains(el)
    ) {
      found = view;
    }
  });
  return found;
}

/**
 * 切到编辑模式 → setEphemeralState({ line }) 让 Obsidian 滚到那一行 → 等一帧 → 放光标并居中。
 * 只用 scrollIntoView 时，源码很长的话目标行会停在屏幕外（「实时预览」工单实测）。
 * line 从 0 开始（编辑器的行号）。
 */
export async function revealLine(
  view: MarkdownView,
  line: number,
): Promise<void> {
  if (view.getMode() !== "source") {
    await view.setState(
      { ...view.getState(), mode: "source" },
      { history: false },
    );
  }
  view.setEphemeralState({ line });
  await new Promise<void>((resolve) => {
    const win = view.containerEl.win;
    win.requestAnimationFrame(() => resolve());
  });
  const editor = view.editor;
  const target = Math.min(Math.max(0, line), editor.lineCount() - 1);
  editor.setCursor({ line: target, ch: 0 });
  editor.scrollIntoView(
    { from: { line: target, ch: 0 }, to: { line: target, ch: 0 } },
    true,
  );
  editor.focus();
}

/**
 * 在编辑器里打开文件并定位到 line 行（从 0 开始），给整篇文件视图和全屏标签页用。
 * 桌面端：复用已经打开着这个文件的编辑器，没有就在旁边分屏打开；手机端：在 from 这个标签页里切回编辑视图。
 */
export async function openEditorAt(
  app: App,
  file: TFile,
  line: number,
  from: WorkspaceLeaf,
): Promise<void> {
  if (Platform.isMobile) {
    await from.setViewState({
      type: "markdown",
      state: { file: file.path, mode: "source" },
    });
    if (from.view instanceof MarkdownView) await revealLine(from.view, line);
    return;
  }

  let leaf: WorkspaceLeaf | null = null;
  app.workspace.iterateAllLeaves((candidate) => {
    if (
      !leaf &&
      candidate !== from &&
      candidate.view instanceof MarkdownView &&
      candidate.view.file?.path === file.path
    ) {
      leaf = candidate;
    }
  });
  const target: WorkspaceLeaf =
    leaf ?? app.workspace.getLeaf("split", "vertical");
  if (
    !(target.view instanceof MarkdownView) ||
    target.view.file?.path !== file.path
  ) {
    await target.openFile(file, { active: false });
  }
  if (target.view instanceof MarkdownView) {
    await app.workspace.revealLeaf(target);
    await revealLine(target.view, line);
  }
}
