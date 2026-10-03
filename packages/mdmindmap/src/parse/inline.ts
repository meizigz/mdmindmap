// 行内解析：只认 spec §3 的固定子集，其余写法原样作为文字。
// 先逐字切出代码、公式、双链、链接、转义和强调符号，再配对强调符号。
// 配对只要求开符号后、闭符号前不是空白；不用 CommonMark 的标点侧翼规则（它在中文里常常失效，
// 如 **“引号”**后）。

import type { Inline } from "./types";

interface Delim {
  kind: "delim";
  char: "*" | "~" | "=";
  count: number;
  canOpen: boolean;
  canClose: boolean;
}

type Item = Inline | Delim;

const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/;
const WHITESPACE = /\s/;
const DIGIT = /[0-9]/;

function isWhitespace(ch: string | undefined): boolean {
  return ch === undefined || WHITESPACE.test(ch);
}

function runLength(s: string, i: number, ch: string): number {
  let n = 0;
  while (s[i + n] === ch) n++;
  return n;
}

interface Scanned {
  node: Inline;
  end: number;
}

/** `` `代码` ``：反引号串与等长的反引号串配对。 */
function scanCode(s: string, i: number): Scanned | null {
  const n = runLength(s, i, "`");
  let j = i + n;
  while (j < s.length) {
    const k = s.indexOf("`", j);
    if (k === -1) return null;
    const m = runLength(s, k, "`");
    if (m === n) {
      let text = s.slice(i + n, k);
      if (
        text.length >= 2 &&
        text.startsWith(" ") &&
        text.endsWith(" ") &&
        text.trim() !== ""
      ) {
        text = text.slice(1, -1);
      }
      return { node: { type: "code", text }, end: k + m };
    }
    j = k + m;
  }
  return null;
}

/**
 * `$公式$`：开头的 $ 后面不能是空白，结尾的 $ 前面不能是空白、后面不能紧跟数字（与 Obsidian 一致）。
 * `$$公式$$` 也当作公式。公式里的 `\$` 不算结尾。
 */
function scanMath(s: string, i: number): Scanned | null {
  if (s.startsWith("$$", i)) {
    const k = s.indexOf("$$", i + 2);
    if (k === -1 || k === i + 2) return null;
    return { node: { type: "math", tex: s.slice(i + 2, k) }, end: k + 2 };
  }
  if (isWhitespace(s[i + 1])) return null;
  for (let k = i + 1; k < s.length; k++) {
    if (s[k] === "\\") {
      k++;
      continue;
    }
    if (s[k] !== "$") continue;
    if (isWhitespace(s[k - 1]) || DIGIT.test(s[k + 1] ?? "")) continue;
    return { node: { type: "math", tex: s.slice(i + 1, k) }, end: k + 1 };
  }
  return null;
}

/** `[[目标]]` 或 `[[目标|显示文字]]`。 */
function scanWikilink(s: string, i: number): Scanned | null {
  const k = s.indexOf("]]", i + 2);
  if (k === -1) return null;
  const inner = s.slice(i + 2, k);
  if (/[[\]\n]/.test(inner)) return null;
  const bar = inner.indexOf("|");
  const target = (bar === -1 ? inner : inner.slice(0, bar)).trim();
  if (target === "") return null;
  const node: Inline = { type: "wikilink", target };
  if (bar !== -1) {
    const alias = inner.slice(bar + 1).trim();
    if (alias !== "") node.alias = alias;
  }
  return { node, end: k + 2 };
}

/** 从 open 处的开括号找到配对的闭括号，跳过反斜杠转义。 */
function matchBracket(
  s: string,
  open: number,
  left: string,
  right: string,
): number {
  let depth = 0;
  for (let k = open; k < s.length; k++) {
    const ch = s[k];
    if (ch === "\\") {
      k++;
    } else if (ch === left) {
      depth++;
    } else if (ch === right) {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

/** `[文字](网址)`。返回链接文字的原文，由调用方继续解析。 */
function scanLink(
  s: string,
  i: number,
): { label: string; href: string; end: number } | null {
  const close = matchBracket(s, i, "[", "]");
  if (close === -1 || s[close + 1] !== "(") return null;
  const paren = matchBracket(s, close + 1, "(", ")");
  if (paren === -1) return null;
  const href =
    s
      .slice(close + 2, paren)
      .trim()
      .split(/\s+/)[0] ?? "";
  if (href === "") return null;
  return { label: s.slice(i + 1, close), href, end: paren + 1 };
}

function tokenize(s: string, allowLinks: boolean): Item[] {
  const items: Item[] = [];
  let text = "";
  const flush = (): void => {
    if (text !== "") items.push({ type: "text", text });
    text = "";
  };
  const push = (node: Inline): void => {
    flush();
    items.push(node);
  };

  let i = 0;
  while (i < s.length) {
    const ch = s[i] ?? "";

    if (ch === "\\" && ASCII_PUNCTUATION.test(s[i + 1] ?? "")) {
      text += s[i + 1];
      i += 2;
      continue;
    }

    if (ch === "`") {
      const code = scanCode(s, i);
      if (code) {
        push(code.node);
        i = code.end;
      } else {
        const n = runLength(s, i, "`");
        text += s.slice(i, i + n);
        i += n;
      }
      continue;
    }

    if (ch === "$") {
      const math = scanMath(s, i);
      if (math) {
        push(math.node);
        i = math.end;
        continue;
      }
    }

    if (allowLinks && ch === "!" && s[i + 1] === "[") {
      // 图片和嵌入（![alt](src)、![[文件]]）不支持，整段原样显示。
      const end =
        s[i + 2] === "["
          ? scanWikilink(s, i + 1)?.end
          : scanLink(s, i + 1)?.end;
      if (end !== undefined) {
        text += s.slice(i, end);
        i = end;
        continue;
      }
    }

    if (allowLinks && ch === "[") {
      if (s[i + 1] === "[") {
        const wikilink = scanWikilink(s, i);
        if (wikilink) {
          push(wikilink.node);
          i = wikilink.end;
          continue;
        }
      }
      const link = scanLink(s, i);
      if (link) {
        push({
          type: "link",
          href: link.href,
          children: parseInlineWith(link.label, false),
        });
        i = link.end;
        continue;
      }
    }

    if (ch === "*" || ch === "~" || ch === "=") {
      const n = runLength(s, i, ch);
      // ~~ 和 == 必须恰好两个；* 可以是 1 到 3 个。
      if (ch === "*" ? n <= 3 : n === 2) {
        flush();
        items.push({
          kind: "delim",
          char: ch,
          count: n,
          canOpen: !isWhitespace(s[i + n]),
          canClose: !isWhitespace(s[i - 1]),
        });
      } else {
        text += s.slice(i, i + n);
      }
      i += n;
      continue;
    }

    text += ch;
    i++;
  }
  flush();
  return items;
}

function isDelim(item: Item | undefined): item is Delim {
  return item !== undefined && "kind" in item;
}

const WRAPPER = { "~": "del", "=": "mark" } as const;

/** 配对强调符号，把配上的一段包成粗体、斜体、删除线或高亮；剩下的符号变回文字。 */
function resolveEmphasis(items: Item[]): Inline[] {
  let i = 0;
  while (i < items.length) {
    const closer = items[i];
    if (!isDelim(closer) || !closer.canClose || closer.count === 0) {
      i++;
      continue;
    }
    let j = i - 1;
    while (j >= 0) {
      const o = items[j];
      if (isDelim(o) && o.char === closer.char && o.canOpen && o.count > 0)
        break;
      j--;
    }
    if (j < 0) {
      i++;
      continue;
    }
    const opener = items[j] as Delim;
    const use =
      closer.char === "*" && (opener.count < 2 || closer.count < 2) ? 1 : 2;
    const children = resolveEmphasis(items.slice(j + 1, i));
    const node: Inline =
      closer.char === "*"
        ? { type: use === 2 ? "strong" : "em", children }
        : { type: WRAPPER[closer.char], children };
    opener.count -= use;
    closer.count -= use;
    items.splice(j + 1, i - j - 1, node);
    i = j + 2;
    if (opener.count === 0) {
      items.splice(j, 1);
      i--;
    }
    if (closer.count === 0) items.splice(i, 1);
  }

  const result: Inline[] = [];
  for (const item of items) {
    const node: Inline = isDelim(item)
      ? { type: "text", text: item.char.repeat(item.count) }
      : item;
    const last = result[result.length - 1];
    if (node.type === "text" && last?.type === "text") {
      last.text += node.text;
    } else if (node.type !== "text" || node.text !== "") {
      result.push(node);
    }
  }
  return result;
}

function parseInlineWith(s: string, allowLinks: boolean): Inline[] {
  return resolveEmphasis(tokenize(s, allowLinks));
}

export function parseInline(s: string): Inline[] {
  return parseInlineWith(s, true);
}
