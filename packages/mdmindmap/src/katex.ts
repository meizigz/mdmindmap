// mdmindmap/katex：web 端的公式对象（KaTeX + mhchem）。只有引用这个入口才会加载 KaTeX。
// 宿主页面要自己引入 KaTeX 的样式：import "katex/dist/katex.min.css"。

import katex from "katex";
import "katex/contrib/mhchem";
import type { MathRenderer } from "./render";

export interface KatexOptions {
  /** 公式里允许的宏，例如 { "\\R": "\\mathbb{R}" }。 */
  macros?: Record<string, string>;
}

export function katexMath(options: KatexOptions = {}): MathRenderer {
  const macros = { ...options.macros };
  return {
    render(tex) {
      const span = document.createElement("span");
      // 出错时 KaTeX 会显示红色的原文，导图照常画；校验交给 mdmindmap check。
      katex.render(tex, span, {
        throwOnError: false,
        strict: "ignore",
        output: "html",
        macros,
      });
      return span;
    },
    exportCss: () => collectKatexCss(document),
  };
}

const KATEX_FONT = /font-family:\s*"?KaTeX_/;
const FONT_URL = /url\((["']?)([^"')]+\.woff2)\1\)/;

/**
 * 导出 SVG/PNG 时要内联的样式：页面上已加载的 KaTeX 规则，字体换成 woff2 data URL。
 * 跨域加载（且没有 crossorigin）的样式表读不到规则，会被跳过。
 */
export async function collectKatexCss(doc: Document): Promise<string> {
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
      if (text.startsWith("@font-face")) {
        if (!KATEX_FONT.test(text)) continue;
        const url = FONT_URL.exec(text)?.[2];
        if (!url) continue;
        const absolute = new URL(url, sheet.href ?? doc.baseURI).href;
        fonts.push(inlineFont(text, absolute));
      } else if (text.includes(".katex")) {
        rules.push(text);
      }
    }
  }

  return [...(await Promise.all(fonts)), ...rules].join("\n");
}

async function inlineFont(rule: string, url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const family = /font-family:\s*([^;]+);/.exec(rule)?.[1] ?? "";
    const weight = /font-weight:\s*([^;]+);/.exec(rule)?.[1] ?? "normal";
    const style = /font-style:\s*([^;]+);/.exec(rule)?.[1] ?? "normal";
    return `@font-face { font-family: ${family}; font-weight: ${weight}; font-style: ${style}; src: url(data:font/woff2;base64,${btoa(binary)}) format("woff2"); }`;
  } catch {
    return rule;
  }
}
