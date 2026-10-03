// 公式用宿主的 MathJax（自带 mhchem），不打包 KaTeX（spec §12）。
// 导出时：PNG 是把 SVG 放进 <img> 再画到 canvas，<img> 里加载不了外部字体，
// 所以要把 MathJax 的样式和字体（换成 data URL）一起写进导出的 SVG。

import {
  arrayBufferToBase64,
  finishRenderMath,
  renderMath,
  requestUrl,
} from "obsidian";
import type { MathRenderer } from "mdmindmap";

export const obsidianMath: MathRenderer = {
  render: (tex) => renderMath(tex, false),
  flush: () => finishRenderMath(),
  exportCss: () => collectMathJaxCss(activeDocument),
};

const FONT_URL = /url\((["']?)([^"')]+\.(woff2?|otf|ttf))\1\)/;
const FONT_TYPES: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  otf: "font/otf",
  ttf: "font/ttf",
};

async function collectMathJaxCss(doc: Document): Promise<string> {
  const rules: string[] = [];
  const fonts: Promise<string>[] = [];
  for (const sheet of Array.from(doc.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(list)) {
      const text = rule.cssText;
      if (!/mjx|MJX/.test(text)) continue;
      if (text.startsWith("@font-face")) {
        fonts.push(inlineFont(text, sheet.href ?? doc.baseURI));
      } else {
        rules.push(text);
      }
    }
  }
  return [...(await Promise.all(fonts)), ...rules].join("\n");
}

async function inlineFont(rule: string, base: string): Promise<string> {
  const match = FONT_URL.exec(rule);
  if (!match) return rule;
  const [whole, , url = "", ext = "woff"] = match;
  try {
    const absolute = new URL(url, base).href;
    // 网络地址走 requestUrl；Obsidian 自带的资源（app://、capacitor://）用窗口自己的 fetch。
    const data = /^https?:/.test(absolute)
      ? await requestUrl({ url: absolute }).arrayBuffer
      : await (await activeWindow.fetch(absolute)).arrayBuffer();
    const type = FONT_TYPES[ext] ?? "font/woff";
    return rule.replace(
      whole,
      `url(data:${type};base64,${arrayBufferToBase64(data)})`,
    );
  } catch {
    // 读不到字体时保留原样：Obsidian 里看导出的 SVG 仍然正常，只是 PNG 里的公式会退回系统字体。
    return rule;
  }
}
