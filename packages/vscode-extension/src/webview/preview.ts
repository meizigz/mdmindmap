// 内置 Markdown 预览里的脚本：把 markdown-it 插件生成的占位 div 渲染成导图。
// 预览内容变化时 VS Code 会整段替换 DOM 并触发 vscode.markdown.updateContent。

import "katex/dist/katex.min.css";
import "mdmindmap/style.css";
import "./theme.css";
import { render, type MindMap } from "mdmindmap";
import { katexMath } from "mdmindmap/katex";
import { syncTheme } from "./theme";

const math = katexMath();
const maps = new Map<HTMLElement, MindMap>();

function renderAll(): void {
  for (const [el, map] of maps) {
    if (!el.isConnected) {
      map.destroy();
      maps.delete(el);
    }
  }
  for (const el of document.querySelectorAll<HTMLElement>(".mdmindmap-block")) {
    if (maps.has(el)) continue;
    const height = Number(el.dataset["height"]);
    maps.set(
      el,
      render(el, el.dataset["source"] ?? "", {
        math,
        height: height > 0 ? height : "auto",
      }),
    );
  }
}

syncTheme();
renderAll();
window.addEventListener("vscode.markdown.updateContent", renderAll);
