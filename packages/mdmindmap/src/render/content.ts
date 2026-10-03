// 由行内解析结果构造节点内容（只用 DOM API，不用 innerHTML）。

import type { Inline } from "../parse";
import { html } from "./dom";

export interface MathRenderer {
  render(tex: string): HTMLElement;
  /** 一批公式渲染完、测量之前调用（Obsidian 的 finishRenderMath）。 */
  flush?(): void | Promise<void>;
  /** 导出时内联的字体和样式。 */
  exportCss?(): Promise<string>;
}

const WRAPPERS = {
  strong: "strong",
  em: "em",
  del: "del",
  mark: "mark",
} as const;

export function appendInline(
  doc: Document,
  parent: HTMLElement,
  inline: readonly Inline[],
  math: MathRenderer,
): void {
  for (const item of inline) {
    switch (item.type) {
      case "text":
        parent.append(item.text);
        break;
      case "strong":
      case "em":
      case "del":
      case "mark": {
        const el = html(doc, WRAPPERS[item.type]);
        appendInline(doc, el, item.children, math);
        parent.append(el);
        break;
      }
      case "code": {
        const el = html(doc, "code");
        el.textContent = item.text;
        parent.append(el);
        break;
      }
      case "math": {
        const el = html(doc, "span", "mdmm-math");
        el.append(math.render(item.tex));
        parent.append(el);
        break;
      }
      case "wikilink": {
        const el = html(doc, "a", "mdmm-wikilink");
        el.dataset.target = item.target;
        el.textContent = item.alias ?? item.target;
        parent.append(el);
        break;
      }
      case "link": {
        const el = html(doc, "a", "mdmm-link");
        el.href = item.href;
        el.target = "_blank";
        el.rel = "noopener noreferrer";
        appendInline(doc, el, item.children, math);
        parent.append(el);
        break;
      }
    }
  }
}
