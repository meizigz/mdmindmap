// 由分好类的行建立节点树：标题按级别成层，列表项挂在上方最近的标题下、按缩进嵌套，
// 缩进的续行并入上一个列表项。节点文字两端的标记在全部行读完后统一处理。

import { diagnostic, quote } from "./diagnostics";
import type { Line } from "./lines";
import { parseInline } from "./inline";
import {
  extractLeadingBrace,
  extractTrailingMarkers,
  stripInlineComments,
  type Brace,
} from "./markers";
import type { Diagnostic, Node } from "./types";

export interface Tree {
  root: Node | null;
  /** 按源文顺序排列的全部节点。 */
  nodes: Node[];
  /** 列表项开头的概要括号，交给概要解析使用。 */
  braces: Map<Node, Brace>;
  /** 行尾ID后面还跟着别的标记的节点。 */
  idNotLast: Set<Node>;
  diagnostics: Diagnostic[];
}

export interface TreeOptions {
  /** 代码块模式下，非节点行要报 NON_NODE_LINE；整篇模式下静默跳过。 */
  reportNonNodeLines: boolean;
  /** 整篇模式下用文件名作的根：所有顶层节点都挂在它下面，不报 MULTI_ROOT。 */
  root?: Node;
}

interface Pending {
  node: Node;
  raw: string;
  isItem: boolean;
}

function newNode(line: number): Node {
  return {
    text: "",
    inline: [],
    line,
    fold: false,
    children: [],
    summaries: [],
  };
}

export function buildTree(lines: readonly Line[], options: TreeOptions): Tree {
  const diagnostics: Diagnostic[] = [];
  const pending: Pending[] = [];
  const headings: { level: number; node: Node }[] = [];
  let items: { indent: number; node: Node }[] = [];
  let root: Node | null = options.root ?? null;
  // 可以接续行的列表项；空行或非节点行之后清空。
  let continuable: { pending: Pending; indent: number } | null = null;

  const multiRoots: Node[] = [];
  const attach = (node: Node, parent: Node | undefined): void => {
    if (parent) {
      parent.children.push(node);
    } else if (options.root) {
      options.root.children.push(node);
    } else if (root === null) {
      root = node;
    } else {
      // 文字在全部行读完后才确定，先占位，结束时补上信息。
      multiRoots.push(node);
      root.children.push(node);
    }
  };

  for (const line of lines) {
    switch (line.kind) {
      case "blank":
        continuable = null;
        break;

      case "heading": {
        const node = newNode(line.line);
        while (
          headings.length > 0 &&
          headings[headings.length - 1]!.level >= line.level
        ) {
          headings.pop();
        }
        attach(node, headings[headings.length - 1]?.node);
        headings.push({ level: line.level, node });
        items = [];
        pending.push({ node, raw: line.text, isItem: false });
        continuable = null;
        break;
      }

      case "item": {
        const node = newNode(line.line);
        while (
          items.length > 0 &&
          items[items.length - 1]!.indent >= line.indent
        ) {
          items.pop();
        }
        attach(
          node,
          items[items.length - 1]?.node ?? headings[headings.length - 1]?.node,
        );
        items.push({ indent: line.indent, node });
        const p: Pending = { node, raw: line.text, isItem: true };
        pending.push(p);
        continuable = { pending: p, indent: line.indent };
        break;
      }

      case "other":
        if (continuable && line.indent > continuable.indent) {
          continuable.pending.raw += ` ${line.text}`;
        } else {
          continuable = null;
          if (options.reportNonNodeLines) {
            diagnostics.push(
              diagnostic(
                "NON_NODE_LINE",
                line.line,
                "这一行既不是标题也不是列表项，不会出现在导图里。",
                "要显示在导图里，请写成 `- ` 列表项或 `#` 标题；如果它是上一个节点的补充，缩进到那个列表项下面作为续行。",
              ),
            );
          }
        }
        break;
    }
  }

  const braces = new Map<Node, Brace>();
  const idNotLast = new Set<Node>();
  const idLines = new Map<string, number>();

  for (const { node, raw, isItem } of pending) {
    const markers = extractTrailingMarkers(stripInlineComments(raw));
    let text = markers.text;
    if (isItem) {
      const lead = extractLeadingBrace(text);
      text = lead.text;
      if (lead.brace) braces.set(node, lead.brace);
    }
    node.text = text;
    node.inline = parseInline(text);
    if (markers.color) node.color = markers.color;
    node.fold = markers.fold;

    if (markers.invalidId !== undefined) {
      diagnostics.push(
        diagnostic(
          "ID_INVALID",
          node.line,
          `行尾的 \`^${markers.invalidId}\` 不是有效的节点ID，已当作文字显示。`,
          "节点ID只能用英文字母、数字和 `-`，例如 `^law2`。",
        ),
      );
    }

    if (markers.id !== undefined) {
      const first = idLines.get(markers.id);
      if (first !== undefined) {
        diagnostics.push(
          diagnostic(
            "ID_DUP",
            node.line,
            `节点ID \`${markers.id}\` 已在第 ${first} 行用过，这里的ID不生效。`,
            "改成一个不重复的ID，并同步修改引用它的联系。",
          ),
        );
      } else {
        idLines.set(markers.id, node.line);
        node.id = markers.id;
        if (markers.idNotLast) idNotLast.add(node);
      }
    }
  }

  const finalRoot: Node | null = root;
  for (const node of multiRoots) {
    diagnostics.push(
      diagnostic(
        "MULTI_ROOT",
        node.line,
        `导图只能有一个根节点，这里又开始了一个顶层节点「${quote(node.text)}」，已暂时挂在根节点「${quote(finalRoot?.text ?? "")}」下面。`,
        "在最前面加一个 `# 标题` 作为唯一的根，或者把这一行及其下面的节点缩进到根节点下。",
      ),
    );
  }

  return {
    root: finalRoot,
    nodes: pending.map((p) => p.node),
    braces,
    idNotLast,
    diagnostics,
  };
}
