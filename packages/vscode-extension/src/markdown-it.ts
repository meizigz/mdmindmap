// 内置 Markdown 预览里的 ```mdmindmap 代码块：这里只把源文放进一个占位 div，
// 真正的渲染由预览页面里的脚本（webview/preview.ts）完成。

import type { MarkdownIt } from "markdown-it";

/** 围栏行 ```mdmindmap height=500 里的参数；没写时按叶子数自动估算高度。 */
export function parseInfo(info: string): { height?: number } | null {
  const [lang, ...rest] = info.trim().split(/\s+/);
  if (lang !== "mdmindmap") return null;
  const match = /(?:^|\s)height\s*=\s*(\d+)(?:px)?(?=\s|$)/.exec(rest.join(" "));
  const height = match ? Number(match[1]) : NaN;
  return height > 0 ? { height } : {};
}

export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
  const fallback = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const block = token && parseInfo(token.info);
    if (!token || !block) {
      return fallback
        ? fallback(tokens, index, options, env, self)
        : self.renderToken(tokens, index, options);
    }
    const height = block.height ? ` data-height="${block.height}"` : "";
    return `<div class="mdmindmap-block"${height} data-source="${md.utils.escapeHtml(token.content)}"></div>\n`;
  };
  return md;
}
