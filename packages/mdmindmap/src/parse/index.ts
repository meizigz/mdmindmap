// mdmindmap/parse：纯解析与校验，不碰 DOM，Node 里也能用（spec §4）。

import { diagnostic } from "./diagnostics";
import {
  blockLines,
  classify,
  frontmatterLength,
  splitLines,
  type Line,
} from "./lines";
import {
  looksLikeRelationship,
  parseRelationships,
  splitRegion,
} from "./relationships";
import { buildSummaries } from "./summaries";
import { buildTree } from "./tree";
import type {
  Diagnostic,
  Node,
  ParseOptions,
  ParseResult,
  Relationship,
} from "./types";

export type {
  Diagnostic,
  Inline,
  Node,
  ParseOptions,
  ParseResult,
  PresetColor,
  Relationship,
  RelationshipStyle,
  Severity,
  Summary,
} from "./types";
export { parseInline } from "./inline";

export function parse(source: string, options: ParseOptions = {}): ParseResult {
  const raw = splitLines(source);
  const skip = frontmatterLength(raw);
  const document = options.document;
  // 整篇模式下，代码块和 $$ 公式块整块跳过。
  const excluded = document ? blockLines(raw, skip) : [];
  const split = splitRegion(raw, skip, document !== undefined, excluded);
  const outside: Diagnostic[] = [];

  // `%%` 块和代码块里的行当作空行：不成为节点，也会打断续行。
  const lines: Line[] = [];
  for (let i = skip; i < raw.length; i++) {
    const line = i + 1;
    if (!split.body[i]) {
      lines.push({ kind: "blank", line });
      continue;
    }
    const classified = classify(raw[i] ?? "", line);
    if (classified.kind === "other" && looksLikeRelationship(classified.text)) {
      outside.push(
        diagnostic(
          "REL_OUTSIDE_REGION",
          line,
          "这一行像是一条联系，但没有写在文末的 `%%` 块里，已忽略。",
          "把所有联系移到文末，用单独一行 `%%` 开始、单独一行 `%%` 结束。",
        ),
      );
      lines.push({ kind: "blank", line });
      continue;
    }
    lines.push(classified);
  }

  const titleRoot =
    document && !hasSingleTopHeading(lines)
      ? documentRoot(document.title)
      : undefined;
  const tree = buildTree(lines, {
    reportNonNodeLines: document === undefined,
    ...(titleRoot && { root: titleRoot }),
  });

  let diagnostics = [...split.diagnostics, ...outside, ...tree.diagnostics];
  if (document) {
    for (const node of tree.idNotLast) {
      diagnostics.push(
        diagnostic(
          "ID_NOT_LAST",
          node.line,
          `节点ID \`^${node.id}\` 不在行尾，在 Obsidian 里它不是块ID，其他笔记无法用 \`[[文件#^${node.id}]]\` 引用这个节点。`,
          `把 \`^${node.id}\` 移到这一行的最末尾（放在颜色和 \`<!-- fold -->\` 之后）。`,
        ),
      );
    }
  }

  const empty = tree.nodes.length === 0;
  if (empty) {
    // 一个节点都没有时，逐行的「不是节点」提示只是噪音。
    diagnostics = diagnostics.filter((d) => d.code !== "NON_NODE_LINE");
    diagnostics.push(
      diagnostic(
        "NO_NODES",
        1,
        "没有找到任何节点。",
        "第一行写 `# 根节点`，其余节点用 `- ` 列表，每深一级缩进 2 个空格。",
      ),
    );
  }

  const root = empty ? null : tree.root;
  let relationships: Relationship[] = [];
  if (root !== null) {
    buildSummaries(root, tree.braces, diagnostics);
    if (split.region) {
      relationships = parseRelationships(split.region, tree.nodes, diagnostics);
    }
  }

  return {
    root,
    relationships,
    diagnostics: diagnostics.sort((a, b) => a.line - b.line),
  };
}

/** 整篇模式下，全文恰好只有一个一级标题、而且它是第一个节点时，它就是根。 */
function hasSingleTopHeading(lines: readonly Line[]): boolean {
  const nodes = lines.filter((l) => l.kind === "heading" || l.kind === "item");
  const first = nodes[0];
  return (
    first?.kind === "heading" &&
    first.level === 1 &&
    nodes.filter((l) => l.kind === "heading" && l.level === 1).length === 1
  );
}

/** 用文件名作的根节点：源文里没有对应的行，line 为 0。 */
function documentRoot(title: string): Node {
  return {
    text: title,
    inline: [{ type: "text", text: title }],
    line: 0,
    fold: false,
    children: [],
    summaries: [],
  };
}
