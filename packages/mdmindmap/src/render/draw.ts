// SVG 连线层：分支线、下划线、概要括号。坐标与节点层相同（都在 stage 里）。
// 分支曲线、括号的具体画法属于「交给实现阶段」的细节（spec §14），可以随时调整。

import type { Node } from "../parse";
import type { Box, Brace, LayoutResult } from "../layout";
import { svg } from "./dom";

export interface Shape {
  underline: (node: Node) => boolean;
  collapsed: (node: Node) => boolean;
}

interface Point {
  x: number;
  y: number;
}

const f = (n: number) => Math.round(n * 100) / 100;

/**
 * 分支从父节点出发的点：下划线式在下划线末端，其余在朝向子节点那一侧的中点。
 * bilateral 的根也从左右两侧出发（根没有底色，从中心出发的线会穿过文字）。
 */
function startPoint(box: Box, toLeft: boolean, underline: boolean): Point {
  const x = toLeft ? box.x : box.x + box.width;
  return { x, y: underline ? box.y + box.height : box.y + box.height / 2 };
}

/** 分支到达子节点的点：下划线式在下划线起点，其余在侧边中点。 */
function endPoint(box: Box, underline: boolean): Point {
  const x = box.left ? box.x + box.width : box.x;
  return { x, y: underline ? box.y + box.height : box.y + box.height / 2 };
}

function curve(a: Point, b: Point): string {
  const mx = (a.x + b.x) / 2;
  return `M${f(a.x)} ${f(a.y)}C${f(mx)} ${f(a.y)} ${f(mx)} ${f(b.y)} ${f(b.x)} ${f(b.y)}`;
}

function bracePath(brace: Brace, summary: Box): string {
  const { top, bottom } = brace;
  const k = brace.left ? -1 : 1;
  const x = brace.x + k * 6;
  const r = Math.min(8, (bottom - top) / 4);
  const mid = (top + bottom) / 2;
  const tip = x + k * 2 * r;
  const to = brace.left ? summary.x + summary.width : summary.x;
  return (
    `M${f(x)} ${f(top)}Q${f(x + k * r)} ${f(top)} ${f(x + k * r)} ${f(top + r)}` +
    `L${f(x + k * r)} ${f(mid - r)}Q${f(x + k * r)} ${f(mid)} ${f(tip)} ${f(mid)}` +
    `Q${f(x + k * r)} ${f(mid)} ${f(x + k * r)} ${f(mid + r)}` +
    `L${f(x + k * r)} ${f(bottom - r)}Q${f(x + k * r)} ${f(bottom)} ${f(x)} ${f(bottom)}` +
    `M${f(tip)} ${f(mid)}L${f(to)} ${f(summary.y + summary.height / 2)}`
  );
}

export function drawEdges(
  doc: Document,
  layer: SVGSVGElement,
  result: LayoutResult,
  shape: Shape,
  /** 画在最上层的其他元素（联系线）。 */
  overlay: readonly SVGElement[] = [],
): void {
  const parts: SVGElement[] = [];
  const path = (className: string, d: string, node?: Node) => {
    const p = svg(doc, "path", className);
    p.setAttribute("d", d);
    if (node) p.dataset.line = String(node.line);
    parts.push(p);
  };

  for (const [node, box] of result.boxes) {
    if (shape.underline(node)) {
      const y = box.y + box.height;
      path(
        "mdmm-underline",
        `M${f(box.x)} ${f(y)}H${f(box.x + box.width)}`,
        node,
      );
    }
    if (shape.collapsed(node)) continue;
    for (const child of node.children) {
      const childBox = result.boxes.get(child);
      if (!childBox) continue;
      const a = startPoint(box, childBox.left, shape.underline(node));
      path(
        "mdmm-branch",
        curve(a, endPoint(childBox, shape.underline(child))),
        child,
      );
    }
  }

  for (const brace of result.braces) {
    const summary = result.boxes.get(brace.summary.node);
    if (summary)
      path("mdmm-brace", bracePath(brace, summary), brace.summary.node);
  }

  layer.replaceChildren(...parts, ...overlay);
}
