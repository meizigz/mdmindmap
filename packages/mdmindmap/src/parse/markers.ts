// 节点文字两端的标记：行尾的颜色、折叠、节点ID（顺序任意），行首的概要括号，以及行内 %% 注释。
// 这里只处理块级标记自己的转义（\{ \} \^abc \🔴）；行内 markdown 的转义留给行内解析。

import type { PresetColor } from "./types";

const COLOR_EMOJI: Record<string, PresetColor> = {
  "🔴": "red",
  "🟠": "orange",
  "🟡": "yellow",
  "🟢": "green",
  "🔵": "blue",
  "🟣": "purple",
  "⚫": "gray",
};

// 色块 emoji 前面有没有空格都算颜色；⚫ 后面可能跟着变体选择符 U+FE0F。
const TRAILING_COLOR = /(\\?)(🔴|🟠|🟡|🟢|🔵|🟣|⚫)️?$/u;
const TRAILING_FOLD = /(?:^|[ \t])<!--[ \t]*(?:markmap:[ \t]*)?fold[ \t]*-->$/;
const TRAILING_CARET = /(^|[ \t])(\\?)\^(\S+)$/u;
const VALID_ID = /^[A-Za-z0-9-]+$/;
// 由文字、数字、- 和 _ 组成、却含有ID不允许的字符：多半是想写ID（如 ^期望）。
// 其余情况（如 mhchem 的 \ce{… H2 ^}）照常作为内容，不提示。
const ID_LIKE = /^[\p{L}\p{N}_-]+$/u;
// 连同注释前面的空白一起去掉，避免留下两个空格。
const INLINE_COMMENT = /[ \t]*%%.*?%%/g;

export interface TrailingMarkers {
  text: string;
  color?: PresetColor;
  fold: boolean;
  id?: string;
  /** 行尾 ^token 看起来像ID但含非法字符时，记下 token。 */
  invalidId?: string;
  /** 节点ID 后面还跟着其他标记（整篇模式下它就不是 Obsidian 块ID）。 */
  idNotLast: boolean;
}

export function stripInlineComments(text: string): string {
  return text.replace(INLINE_COMMENT, "").trim();
}

export function extractTrailingMarkers(input: string): TrailingMarkers {
  let rest = input.trimEnd();
  const result: TrailingMarkers = { text: "", fold: false, idNotLast: false };
  // 已经从行尾剥掉过别的标记：之后再找到的ID就不在最后。
  let seenAny = false;

  for (;;) {
    rest = rest.trimEnd();

    if (result.color === undefined) {
      const m = TRAILING_COLOR.exec(rest);
      if (m && !m[1]) {
        result.color = COLOR_EMOJI[m[2] ?? ""];
        rest = rest.slice(0, m.index);
        seenAny = true;
        continue;
      }
    }

    if (!result.fold) {
      const m = TRAILING_FOLD.exec(rest);
      if (m) {
        result.fold = true;
        rest = rest.slice(0, m.index);
        seenAny = true;
        continue;
      }
    }

    if (result.id === undefined) {
      const m = TRAILING_CARET.exec(rest);
      if (m) {
        const token = m[3] ?? "";
        const caretAt = m.index + (m[1] ?? "").length;
        if (m[2]) {
          rest = rest.slice(0, caretAt) + rest.slice(caretAt + 1);
        } else if (VALID_ID.test(token)) {
          result.id = token;
          result.idNotLast = seenAny;
          rest = rest.slice(0, m.index);
          continue;
        } else if (ID_LIKE.test(token)) {
          result.invalidId = token;
        }
      }
    }

    break;
  }

  // 行尾的 \🔴 是字面量：去掉反斜杠。
  const escaped = TRAILING_COLOR.exec(rest);
  if (escaped?.[1]) {
    rest = rest.slice(0, escaped.index) + rest.slice(escaped.index + 1);
  }

  result.text = rest.trim();
  return result;
}

export type Brace = "open" | "close";

/** 列表项文字开头的 `{ ` / `} `。`\{ ` / `\} ` 是字面量，去掉反斜杠。 */
export function extractLeadingBrace(text: string): {
  text: string;
  brace?: Brace;
} {
  const m = /^(\\?)([{}])(?:[ \t]+|$)/.exec(text);
  if (!m) return { text };
  if (m[1]) return { text: text.slice(1) };
  return {
    text: text.slice(m[0].length).trim(),
    brace: m[2] === "{" ? "open" : "close",
  };
}
