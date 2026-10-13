import * as vscode from "vscode";
import { extendMarkdownIt } from "./markdown-it";
import { MindMapPanel } from "./panel";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mdmindmap.openPreview",
      async (uri?: vscode.Uri) => {
        // 编辑器标题栏按钮不带参数（用当前编辑器），资源管理器右键会带上文件。
        const document = uri
          ? await vscode.workspace.openTextDocument(uri)
          : vscode.window.activeTextEditor?.document;
        if (document) MindMapPanel.show(context, document);
      },
    ),
  );
  // 内置 Markdown 预览会调用这里返回的 extendMarkdownIt。
  return { extendMarkdownIt };
}

export function deactivate() {}
