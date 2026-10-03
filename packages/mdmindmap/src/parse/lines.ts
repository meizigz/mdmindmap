// 把源文切成行并逐行分类。只看单行的形状，不管上下文（续行、联系区等由后续步骤处理）。

export type Line =
  | { kind: "blank"; line: number }
  | { kind: "heading"; line: number; level: number; text: string }
  | { kind: "item"; line: number; indent: number; text: string }
  | { kind: "other"; line: number; indent: number; text: string };

const HEADING = /^ {0,3}(#{1,6})(?=[ \t]|$)[ \t]*(.*)$/;
const HEADING_CLOSING = /(?:^|[ \t]+)#+[ \t]*$/;
const ITEM = /^([ \t]*)(?:[-*+]|\d{1,9}[.)])(?:[ \t]+(.*)|[ \t]*)$/;
const THEMATIC_BREAK = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const FRONTMATTER_OPEN = /^---[ \t]*$/;
const FRONTMATTER_CLOSE = /^(?:---|\.\.\.)[ \t]*$/;

/** 缩进的列数，制表符按 4 列计。 */
export function indentWidth(s: string): number {
  let width = 0;
  for (const ch of s) {
    if (ch === " ") width += 1;
    else if (ch === "\t") width += 4 - (width % 4);
    else break;
  }
  return width;
}

export function splitLines(source: string): string[] {
  return source.split(/\r\n|\r|\n/);
}

/** 开头的 YAML frontmatter 占几行（没有则为 0）。 */
export function frontmatterLength(lines: readonly string[]): number {
  if (lines.length === 0 || !FRONTMATTER_OPEN.test(lines[0] ?? "")) return 0;
  for (let i = 1; i < lines.length; i++) {
    if (FRONTMATTER_CLOSE.test(lines[i] ?? "")) return i + 1;
  }
  return 0;
}

const CODE_FENCE = /^ {0,3}(`{3,}|~{3,})/;
const MATH_FENCE = /^[ \t]*\$\$[ \t]*$/;

/**
 * 整篇模式下要整块跳过的行：围栏代码块（包括 mdmindmap 代码块）和独占一行的 `$$` 公式块。
 * 块里的 `#`、`-`、`%%` 都不算数。没有闭合的围栏一直延续到文件末尾（与 CommonMark 一致）。
 */
export function blockLines(lines: readonly string[], from: number): boolean[] {
  const inBlock = lines.map(() => false);
  for (let i = from; i < lines.length; i++) {
    const text = lines[i] ?? "";
    const fence = CODE_FENCE.exec(text);
    let end = -1;
    if (fence) {
      const marker = fence[1] ?? "```";
      const close = new RegExp(
        `^ {0,3}${marker[0] === "`" ? "`" : "~"}{${marker.length},}[ \\t]*$`,
      );
      end = lines.length - 1;
      for (let j = i + 1; j < lines.length; j++) {
        if (close.test(lines[j] ?? "")) {
          end = j;
          break;
        }
      }
    } else if (MATH_FENCE.test(text)) {
      for (let j = i + 1; j < lines.length; j++) {
        if ((lines[j] ?? "").trimEnd().endsWith("$$")) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) continue;
    for (let k = i; k <= end; k++) inBlock[k] = true;
    i = end;
  }
  return inBlock;
}

export function classify(raw: string, line: number): Line {
  if (raw.trim() === "") return { kind: "blank", line };

  const heading = HEADING.exec(raw);
  if (heading) {
    const level = heading[1]?.length ?? 1;
    const text = (heading[2] ?? "").replace(HEADING_CLOSING, "").trim();
    return { kind: "heading", line, level, text };
  }

  if (!THEMATIC_BREAK.test(raw)) {
    const item = ITEM.exec(raw);
    if (item) {
      return {
        kind: "item",
        line,
        indent: indentWidth(item[1] ?? ""),
        text: (item[2] ?? "").trim(),
      };
    }
  }

  return { kind: "other", line, indent: indentWidth(raw), text: raw.trim() };
}
