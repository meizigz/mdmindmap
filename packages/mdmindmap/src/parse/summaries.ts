// 概要：把 `} ` 开头的列表项从 children 移到父节点的 summaries 里，括住它前面的一段兄弟。
// 范围默认从上一个概要之后的第一个兄弟开始；起点兄弟以 `{ ` 开头时从它开始（附录 A「概要」）。

import { diagnostic, quote } from "./diagnostics";
import type { Brace } from "./markers";
import type { Diagnostic, Node, Summary } from "./types";

export function buildSummaries(
  root: Node,
  braces: ReadonlyMap<Node, Brace>,
  diagnostics: Diagnostic[],
): void {
  const visit = (parent: Node): void => {
    const siblings: Node[] = [];
    const summaries: Summary[] = [];
    let rangeStart = 0;
    let open: { index: number; node: Node } | null = null;

    for (const child of parent.children) {
      const brace = braces.get(child);

      if (brace === "close") {
        const from = open?.index ?? rangeStart;
        const to = siblings.length - 1;
        if (to >= from) {
          summaries.push({ from, to, node: child });
          if (child.text === "") {
            diagnostics.push(
              diagnostic(
                "SUM_EMPTY",
                child.line,
                "概要 `}` 后面没有总结文字，导图里会画出一个空的概要节点。",
                "在 `}` 后面写上总结文字：`- } 总结文字`。",
              ),
            );
          }
          rangeStart = siblings.length;
          open = null;
          continue;
        }
        diagnostics.push(
          noSiblings(child, parent, braces.get(parent) === "open"),
        );
        siblings.push(child);
        continue;
      }

      if (brace === "open") {
        if (open !== null) {
          diagnostics.push(
            diagnostic(
              "SUM_DOUBLE_OPEN",
              child.line,
              `第 ${open.node.line} 行的 \`{\` 还没有配对的 \`}\`，这里又出现了一个 \`{\`；前一个已忽略，以这一个为准。`,
              "每个 `{` 都要配一个 `}`：在前一组的最后一个兄弟节点之后加 `- } 总结文字`，或者删掉多余的 `{`。",
            ),
          );
        }
        open = { index: siblings.length, node: child };
      }
      siblings.push(child);
    }

    parent.children = siblings;
    parent.summaries = summaries;
    for (const child of siblings) visit(child);
    for (const summary of summaries) visit(summary.node);

    if (open !== null) diagnostics.push(unclosed(open.node, braces));
  };

  visit(root);
}

function noSiblings(
  node: Node,
  parent: Node,
  parentOpens: boolean,
): Diagnostic {
  return diagnostic(
    "SUM_NO_SIBLINGS",
    node.line,
    `概要「${quote(node.text)}」前面没有可以括住的兄弟节点，已当作普通节点显示。`,
    parentOpens
      ? `\`{\` 写在了父节点「${quote(parent.text)}」上。\`{\` 应该写在第一个被括住的兄弟节点上，并与 \`}\` 同级。`
      : "概要 `- } 总结文字` 要写在被括住的那几个兄弟节点之后，并与它们缩进相同。",
  );
}

/** 子节点里出现过 `}`：多半是把 `{` 写在了父节点上、去括它的子节点。 */
function unclosed(node: Node, braces: ReadonlyMap<Node, Brace>): Diagnostic {
  const closesBelow =
    node.summaries.length > 0 ||
    node.children.some((child) => braces.get(child) === "close");
  return diagnostic(
    "SUM_OPEN_UNCLOSED",
    node.line,
    "这个 `{` 没有配对的 `}`，已忽略。",
    closesBelow
      ? `\`{\` 写在了父节点「${quote(node.text)}」上，去括它的子节点。应该把 \`{\` 写在第一个被括住的子节点上，与 \`- } …\` 同级。`
      : "在要括住的最后一个兄弟节点之后，另起一行同级的 `- } 总结文字`。",
  );
}
