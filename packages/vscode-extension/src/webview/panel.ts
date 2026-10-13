// 整篇导图 webview：宿主发来源文就渲染，之后增量更新；点节点让宿主跳到源码。

import "katex/dist/katex.min.css";
import "mdmindmap/style.css";
import "./theme.css";
import { render, type Layout, type MindMap } from "mdmindmap";
import { katexMath } from "mdmindmap/katex";
import { syncTheme } from "./theme";

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
};

interface SourceMessage {
  type: "source";
  text: string;
  title: string;
  layout: Layout;
}

const vscode = acquireVsCodeApi();
const root = document.getElementById("root") as HTMLElement;
const math = katexMath();
let map: MindMap | null = null;
let layout: Layout | null = null;

syncTheme();

window.addEventListener("message", (event: MessageEvent<SourceMessage>) => {
  const { text, title, layout: next } = event.data;
  if (!map) {
    layout = next;
    map = render(root, text, {
      math,
      layout: next,
      document: { title },
      interaction: "direct",
      onNodeClick: (node) => vscode.postMessage({ type: "reveal", line: node.line }),
      onDiagnosticClick: (d) => vscode.postMessage({ type: "reveal", line: d.line }),
    });
    return;
  }
  void map.update(text);
  if (next !== layout) {
    layout = next;
    void map.setLayout(next);
  }
});

vscode.postMessage({ type: "ready" });
