// 联系区：源文末尾的 `%%` … `%%` 块，每行一条 `起点 箭头 终点` 或 `起点 箭头|标签| 终点`（附录 A「联系区」）。
// 正文中间的 `%%` 块是普通注释；但如果里面写了联系，就报 REGION_NOT_LAST。

import { diagnostic } from "./diagnostics";
import type {
  Diagnostic,
  Node,
  Relationship,
  RelationshipStyle,
} from "./types";

export interface RegionLine {
  line: number;
  text: string;
}

export interface RegionSplit {
  /** 每一行是否属于正文（不在任何 `%%` 块里，也不是整行的 `%%注释%%`）。 */
  body: boolean[];
  /** 联系区里的行；没有联系区时为 null。 */
  region: RegionLine[] | null;
  diagnostics: Diagnostic[];
}

const FENCE = /^[ \t]*%%[ \t]*$/;
const WHOLE_LINE_COMMENT = /^[ \t]*%%.*%%[ \t]*$/;
const STYLES: Record<string, RelationshipStyle> = {
  "-->": "solid",
  "-.->": "dashed",
  "==>": "thick",
};
const RELATIONSHIP =
  /^(.+?)[ \t]*(-->|-\.->|==>)[ \t]*(?:\|([^|]*)\|[ \t]*)?(.+)$/;
// 箭头写错时（->、=>、→ 等）仍能认出这是一条联系，给出专门的提示。
const WRONG_ARROW =
  /^(\S+)[ \t]*(->|=>|-\.>|<--|<-|<==|---|--|==|→|⟶|⇒)[ \t]*(?:\|[^|]*\|[ \t]*)?(\S+)$/;
const RELATIONSHIP_LIKE =
  /^[^\s|]+[ \t]*(?:-->|-\.->|==>)[ \t]*(?:\|[^|]*\|[ \t]*)?[^\s|]+$/;
const VALID_ID = /^[A-Za-z0-9-]+$/;

/** 写在 `%%` 块外面、看起来像联系的行。 */
export function looksLikeRelationship(text: string): boolean {
  return RELATIONSHIP_LIKE.test(text.trim());
}

/**
 * 找出 `%%` 块和联系区。from 之前的行（frontmatter）不参与；excluded 标出的行（整篇模式下的代码块）
 * 不算正文，其中的 `%%` 也不算数。
 * document 为 true 时是整篇模式：只有最后一个块才是联系区，正文中间写了联系的块当普通注释。
 */
export function splitRegion(
  lines: readonly string[],
  from: number,
  document: boolean,
  excluded: readonly boolean[] = [],
): RegionSplit {
  const body = lines.map((_, i) => i >= from && !excluded[i]);
  const diagnostics: Diagnostic[] = [];
  const isBlank = (i: number): boolean => (lines[i] ?? "").trim() === "";
  const isFence = (i: number): boolean =>
    !excluded[i] && FENCE.test(lines[i] ?? "");

  const blocks: { open: number; close: number | null }[] = [];
  for (let i = from; i < lines.length; i++) {
    const text = lines[i] ?? "";
    if (excluded[i]) continue;
    if (isFence(i)) {
      let close: number | null = null;
      for (let j = i + 1; j < lines.length; j++) {
        if (isFence(j)) {
          close = j;
          break;
        }
      }
      blocks.push({ open: i, close });
      const end = close ?? lines.length - 1;
      for (let k = i; k <= end; k++) body[k] = false;
      if (close === null) break;
      i = close;
    } else if (WHOLE_LINE_COMMENT.test(text)) {
      body[i] = false;
    }
  }

  let region: RegionLine[] | null = null;
  for (const block of blocks) {
    if (block.close === null) {
      diagnostics.push(
        diagnostic(
          "REGION_UNCLOSED",
          block.open + 1,
          "这个 `%%` 块没有闭合，从这里往后的内容都被忽略了。",
          "在联系区最后补上单独一行 `%%`。",
        ),
      );
      break;
    }

    const contents: RegionLine[] = [];
    for (let k = block.open + 1; k < block.close; k++) {
      if (!isBlank(k))
        contents.push({ line: k + 1, text: (lines[k] ?? "").trim() });
    }
    let next = block.close + 1;
    while (next < lines.length && isBlank(next)) next++;
    const isLast = next >= lines.length;
    const hasRelationships = contents.some((c) => RELATIONSHIP.test(c.text));

    if (isLast) {
      region = contents;
    } else if (hasRelationships) {
      if (document) {
        diagnostics.push(
          diagnostic(
            "REGION_NOT_LAST",
            block.open + 1,
            "这个写了联系的 `%%` 块后面还有正文，所以它只被当作普通注释，里面的联系没有画出。",
            "把联系块移到文件最末尾。",
          ),
        );
      } else {
        diagnostics.push(
          diagnostic(
            "REGION_NOT_LAST",
            next + 1,
            "联系块后面还有内容，从这里往后的内容都被忽略了。",
            "把联系块移到最末尾，节点都写在它前面。",
          ),
        );
        region = contents;
        for (let k = next; k < lines.length; k++) body[k] = false;
        break;
      }
    }
  }

  return { body, region, diagnostics };
}

export function parseRelationships(
  region: readonly RegionLine[],
  nodes: readonly Node[],
  diagnostics: Diagnostic[],
): Relationship[] {
  const ids = new Set<string>();
  for (const node of nodes) if (node.id !== undefined) ids.add(node.id);
  const relationships: Relationship[] = [];

  for (const { line, text } of region) {
    const m = RELATIONSHIP.exec(text);
    if (!m) {
      diagnostics.push(unparsed(line, text));
      continue;
    }
    const from = (m[1] ?? "").trim();
    const to = (m[4] ?? "").trim();
    const label = (m[3] ?? "").trim();

    const badFrom = checkEndpoint(from, "起点", line, ids, nodes);
    const badTo = checkEndpoint(to, "终点", line, ids, nodes);
    if (badFrom) diagnostics.push(badFrom);
    if (badTo) diagnostics.push(badTo);
    if (badFrom || badTo) continue;

    if (from === to) {
      diagnostics.push(
        diagnostic(
          "REL_SELF",
          line,
          `联系的起点和终点都是 \`${from}\`，这条联系没有画出。`,
          "删掉这一行，或者改正其中一个端点。",
        ),
      );
      continue;
    }

    const relationship: Relationship = {
      from,
      to,
      style: STYLES[m[2] ?? ""] ?? "solid",
      line,
    };
    if (label !== "") relationship.label = label;
    relationships.push(relationship);
  }
  return relationships;
}

function unparsed(line: number, text: string): Diagnostic {
  const wrong = WRONG_ARROW.exec(text);
  return diagnostic(
    "REL_UNPARSED",
    line,
    wrong
      ? `箭头 \`${wrong[2]}\` 写错了，这一行被忽略。`
      : "联系区里这一行看不懂，已忽略。",
    wrong
      ? "箭头只能用 `-->`（实线）、`-.->`（虚线）、`==>`（粗线），例如 `lenz -->|决定方向| faraday`。"
      : "每行写一条联系：`起点ID 箭头 终点ID`，可以在箭头后加 `|标签|`，例如 `lenz -->|决定方向| faraday`。",
  );
}

function checkEndpoint(
  endpoint: string,
  role: string,
  line: number,
  ids: ReadonlySet<string>,
  nodes: readonly Node[],
): Diagnostic | null {
  if (ids.has(endpoint)) return null;
  const message = `联系的${role} \`${endpoint}\` 不是已定义的节点ID，这条联系没有画出。`;

  const bare = endpoint.startsWith("^") ? endpoint.slice(1) : null;
  if (bare !== null && VALID_ID.test(bare)) {
    return diagnostic(
      "REL_UNKNOWN_ID",
      line,
      message,
      ids.has(bare)
        ? `端点不要带 \`^\`，写成 \`${bare}\`。`
        : `端点不要带 \`^\`；并且还没有节点定义 \`^${bare}\`，请在那个节点行末尾加上它。`,
    );
  }

  if (nodes.some((node) => node.text === endpoint)) {
    return diagnostic(
      "REL_UNKNOWN_ID",
      line,
      message,
      `「${endpoint}」是节点文字，不是ID。请在那个节点行末尾加 \`^id\`（只用英文字母、数字和 \`-\`），再在这里写这个ID（不带 \`^\`）。`,
    );
  }

  const guess = closest(endpoint, ids);
  return diagnostic(
    "REL_UNKNOWN_ID",
    line,
    message,
    guess !== null
      ? `是不是 \`${guess}\`？`
      : "给要连接的节点行末尾加 `^id`，再在这里引用这个ID（不带 `^`）。",
  );
}

/** 编辑距离不超过 2（且小于ID长度）的最近ID。 */
function closest(word: string, ids: ReadonlySet<string>): string | null {
  let best: string | null = null;
  let bestDistance = 3;
  for (const id of ids) {
    const d = editDistance(word, id);
    if (d < bestDistance && d < id.length) {
      best = id;
      bestDistance = d;
    }
  }
  return best;
}

function editDistance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}
