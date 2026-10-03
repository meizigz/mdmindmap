// `mdmindmap check` 的核心：识别文件形态、逐块解析、把行号换算成文件行号。不碰文件系统，便于测试。

import { parse, type Diagnostic, type Inline, type Node } from "../parse";
import { diagnostic } from "../parse/diagnostics";
import { findSourceBlocks } from "../parse/extract";

/** 公式检查：返回出错信息，没有问题时返回 null。 */
export type MathCheck = (tex: string) => string | null;

/**
 * 含 mdmindmap 代码块的文件逐块解析；否则整个文件按整篇模式解析，标题取文件名。
 * 返回的诊断行号都是文件中的行号。
 */
export function checkText(
  fileName: string,
  text: string,
  checkMath?: MathCheck,
): Diagnostic[] {
  const blocks = findSourceBlocks(text);
  const units =
    blocks.length > 0
      ? blocks.map((block) => ({
          offset: block.fenceLine,
          result: parse(block.source),
        }))
      : [
          {
            offset: 0,
            result: parse(text, { document: { title: titleOf(fileName) } }),
          },
        ];

  const diagnostics: Diagnostic[] = [];
  for (const { offset, result } of units) {
    const found = [...result.diagnostics];
    if (checkMath && result.root) {
      for (const { line, tex } of formulas(result.root)) {
        const error = checkMath(tex);
        if (error !== null) {
          found.push(
            diagnostic(
              "MATH_ERROR",
              line,
              `公式 \`$${tex}$\` 渲染失败：${error}`,
              "检查 LaTeX 写法；化学式用 `\\ce{…}`。Obsidian 的 MathJax 支持的命令比 KaTeX 多，如果在 Obsidian 里显示正常，可以忽略这条。",
            ),
          );
        }
      }
    }
    for (const d of found) diagnostics.push({ ...d, line: d.line + offset });
  }
  return diagnostics.sort((a, b) => a.line - b.line);
}

function titleOf(fileName: string): string {
  const base = fileName.split(/[\\/]/).pop() ?? fileName;
  return base.replace(/\.md$/i, "");
}

function* formulas(node: Node): Generator<{ line: number; tex: string }> {
  for (const tex of mathIn(node.inline)) yield { line: node.line, tex };
  for (const child of node.children) yield* formulas(child);
  for (const summary of node.summaries) yield* formulas(summary.node);
}

function* mathIn(inline: readonly Inline[]): Generator<string> {
  for (const item of inline) {
    if (item.type === "math") yield item.tex;
    else if ("children" in item) yield* mathIn(item.children);
  }
}
