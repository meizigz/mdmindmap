// 排版包装层：把解析树和测量好的尺寸交给 @plait/layouts（锁定 0.94.1），换算出每个节点和概要括号的位置。
// 不碰 DOM，可以在 Node 里测试。以后要换排版实现或 fork，只改这个文件。

import {
  ConnectingPosition,
  GlobalLayout,
  MindLayoutType,
  type LayoutNode,
  type LayoutOptions,
  type OriginNode,
} from "@plait/layouts";
import type { Node, Summary } from "../parse";

export type Layout = "logic" | "bilateral";

export interface Size {
  width: number;
  height: number;
}

export interface LayoutInput {
  root: Node;
  layout: Layout;
  size: (node: Node) => Size;
  /** 下划线式节点：连线接在底边，父节点的下划线对齐到子节点下划线的中间。 */
  underline: (node: Node) => boolean;
  /** 折叠的节点：子节点和概要都不参与排版。 */
  collapsed: (node: Node) => boolean;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 在根节点左侧（只出现在 bilateral 结构里）。 */
  left: boolean;
}

export interface Brace {
  parent: Node;
  summary: Summary;
  left: boolean;
  /** 括住的那几个兄弟（连同它们的子树）的上下边。 */
  top: number;
  bottom: number;
  /** 括号贴着的一侧：右侧括号是子树的最右边，左侧括号是最左边。 */
  x: number;
}

export interface LayoutResult {
  /** 只包含可见的节点（折叠节点的后代不在里面）。 */
  boxes: Map<Node, Box>;
  braces: Brace[];
  bounds: { left: number; top: number; right: number; bottom: number };
}

interface Origin extends OriginNode {
  node: Node;
  depth: number;
  isSummary: boolean;
  children: Origin[];
  start?: number;
  end?: number;
}

// 间距沿用原型里调好的值。
const H_GAP = { root: 30, l1: 22, deeper: 16, summary: 20 };
const V_GAP = { l1: 9, deeper: 4 };

export function layoutTree(input: LayoutInput): LayoutResult {
  const toOrigin = (node: Node, depth: number, isSummary: boolean): Origin => {
    const origin: Origin = {
      node,
      depth,
      isSummary,
      children: [],
      rightNodeCount: 0,
      isCollapsed: input.collapsed(node),
    };
    if (!origin.isCollapsed) {
      origin.children = node.children.map((c) => toOrigin(c, depth + 1, false));
      for (const s of node.summaries) {
        origin.children.push({
          ...toOrigin(s.node, depth + 1, true),
          start: s.from,
          end: s.to,
        });
      }
    }
    return origin;
  };

  const origin = toOrigin(input.root, 0, false);
  if (input.layout === "bilateral") {
    origin.rightNodeCount = chooseRightCount(input.root, input.collapsed);
  }

  const asOrigin = (o: OriginNode): Origin => o as Origin;
  const options: LayoutOptions = {
    getWidth: (o) => input.size(asOrigin(o).node).width,
    getHeight: (o) => input.size(asOrigin(o).node).height,
    getHorizontalGap: (o) => {
      const { depth, isSummary } = asOrigin(o);
      if (isSummary) return H_GAP.summary;
      return depth === 0 ? H_GAP.root : depth === 1 ? H_GAP.l1 : H_GAP.deeper;
    },
    getVerticalGap: (o) => (asOrigin(o).depth === 1 ? V_GAP.l1 : V_GAP.deeper),
    getVerticalConnectingPosition: (o) =>
      input.underline(asOrigin(o).node)
        ? ConnectingPosition.bottom
        : (null as unknown as ConnectingPosition),
    getExtendHeight: () => 0,
    getExtendWidth: () => 0,
    getIndentedCrossLevelGap: () => 0,
  };

  const laid = GlobalLayout.layout(
    origin,
    options,
    input.layout === "bilateral"
      ? MindLayoutType.standard
      : MindLayoutType.right,
  );

  const boxes = new Map<Node, Box>();
  const layoutNodes = new Map<Node, LayoutNode>();
  laid.eachNode((ln) => {
    const node = asOrigin(ln.origin).node;
    const { width, height } = input.size(node);
    layoutNodes.set(node, ln);
    boxes.set(node, {
      x: ln.x + ln.hGap,
      y: ln.y + ln.vGap,
      width,
      height,
      left: ln.left,
    });
  });
  const area = (ln: LayoutNode) => subtreeArea(ln, boxes);

  const braces: Brace[] = [];
  for (const [parent] of boxes) {
    if (input.collapsed(parent)) continue;
    for (const summary of parent.summaries) {
      const covered = parent.children
        .slice(summary.from, summary.to + 1)
        .map((c) => layoutNodes.get(c))
        .filter((ln): ln is LayoutNode => ln !== undefined);
      const summaryBox = boxes.get(summary.node);
      if (covered.length === 0 || !summaryBox) continue;
      const areas = covered.map(area);
      braces.push({
        parent,
        summary,
        left: summaryBox.left,
        top: Math.min(...areas.map((a) => a.top)),
        bottom: Math.max(...areas.map((a) => a.bottom)),
        x: summaryBox.left
          ? Math.min(...areas.map((a) => a.left))
          : Math.max(...areas.map((a) => a.right)),
      });
    }
  }

  const all = [...boxes.values()];
  return {
    boxes,
    braces,
    bounds: {
      left: Math.min(...all.map((b) => b.x)),
      top: Math.min(...all.map((b) => b.y)),
      right: Math.max(...all.map((b) => b.x + b.width)),
      bottom: Math.max(...all.map((b) => b.y + b.height)),
    },
  };
}

/** 一个节点连同它全部可见后代所占的矩形。 */
function subtreeArea(
  ln: LayoutNode,
  boxes: ReadonlyMap<Node, Box>,
): { left: number; top: number; right: number; bottom: number } {
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  ln.eachNode((n) => {
    const box = boxes.get((n.origin as Origin).node);
    if (!box) return;
    left = Math.min(left, box.x);
    top = Math.min(top, box.y);
    right = Math.max(right, box.x + box.width);
    bottom = Math.max(bottom, box.y + box.height);
  });
  return { left, top, right, bottom };
}

/**
 * bilateral 结构下右侧放几个一级分支：按可见子树的节点数尽量均分，
 * 切分点不能落在任何概要的范围内部（否则一个概要会被切到两边）。
 */
export function chooseRightCount(
  root: Node,
  collapsed: (node: Node) => boolean,
): number {
  const n = root.children.length;
  if (n < 2) return n;
  const count = (node: Node): number => {
    if (collapsed(node)) return 1;
    let k = 1;
    for (const c of node.children) k += count(c);
    for (const s of node.summaries) k += count(s.node);
    return k;
  };
  const sizes = root.children.map(count);
  const total = sizes.reduce((a, b) => a + b, 0);
  let best = n;
  let bestDiff = Infinity;
  let acc = 0;
  for (let k = 1; k < n; k++) {
    acc += sizes[k - 1] ?? 0;
    if (root.summaries.some((s) => s.from < k && k <= s.to)) continue;
    // 差不多时偏向右侧多放一些。
    const diff = Math.abs(acc - (total - acc)) + (acc < total - acc ? 0.5 : 0);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = k;
    }
  }
  return best;
}
