// 整篇文件的导图：在编辑器侧边开一个 webview，随编辑实时更新，点节点跳到源码对应行。

import * as vscode from "vscode";

/** 停止输入多久后刷新（毫秒）。 */
const REFRESH_DELAY = 300;

type WebviewMessage = { type: "ready" } | { type: "reveal"; line: number };

export class MindMapPanel {
  private static readonly panels = new Map<string, MindMapPanel>();
  private readonly disposables: vscode.Disposable[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;

  static show(context: vscode.ExtensionContext, document: vscode.TextDocument) {
    const key = document.uri.toString();
    const existing = MindMapPanel.panels.get(key);
    if (existing) {
      existing.panel.reveal(vscode.ViewColumn.Beside, true);
      return;
    }
    const dist = vscode.Uri.joinPath(context.extensionUri, "dist");
    const panel = vscode.window.createWebviewPanel(
      "mdmindmap.preview",
      `${basename(document)} ${"Mind Map"}`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        // 保留缩放和折叠状态
        retainContextWhenHidden: true,
        localResourceRoots: [dist],
      },
    );
    MindMapPanel.panels.set(key, new MindMapPanel(panel, document, dist));
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly document: vscode.TextDocument,
    dist: vscode.Uri,
  ) {
    panel.webview.html = html(panel.webview, dist);
    this.disposables.push(
      panel.onDidDispose(() => this.dispose()),
      panel.webview.onDidReceiveMessage((m: WebviewMessage) => {
        if (m.type === "ready") this.send();
        else void this.reveal(m.line);
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document !== document) return;
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.send(), REFRESH_DELAY);
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("mdmindmap.layout")) this.send();
      }),
    );
  }

  private send() {
    void this.panel.webview.postMessage({
      type: "source",
      text: this.document.getText(),
      title: basename(this.document),
      layout: vscode.workspace
        .getConfiguration("mdmindmap")
        .get<string>("layout", "logic"),
    });
  }

  /** line 从 1 开始；用文件名作的根是 0，跳到文件开头。 */
  private async reveal(line: number) {
    const target = Math.min(Math.max(0, line - 1), this.document.lineCount - 1);
    const position = new vscode.Position(target, 0);
    const editor = await vscode.window.showTextDocument(this.document, {
      viewColumn:
        vscode.window.visibleTextEditors.find((e) => e.document === this.document)
          ?.viewColumn ?? vscode.ViewColumn.Beside,
      selection: new vscode.Range(position, position),
    });
    editor.revealRange(
      new vscode.Range(position, position),
      vscode.TextEditorRevealType.InCenterIfOutsideViewport,
    );
  }

  private dispose() {
    clearTimeout(this.timer);
    MindMapPanel.panels.delete(this.document.uri.toString());
    for (const d of this.disposables) d.dispose();
  }
}

function basename(document: vscode.TextDocument): string {
  return (
    document.uri.path
      .split("/")
      .pop()
      ?.replace(/\.md$/i, "") ?? "mindmap"
  );
}

function html(webview: vscode.Webview, dist: vscode.Uri): string {
  const uri = (file: string) =>
    webview.asWebviewUri(vscode.Uri.joinPath(dist, file));
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `script-src 'nonce-${nonce}'`,
  ].join("; ");
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link rel="stylesheet" href="${uri("panel.css").toString()}">
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${uri("panel.js").toString()}"></script>
</body>
</html>`;
}
