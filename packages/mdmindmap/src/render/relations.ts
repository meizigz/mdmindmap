// 联系线：有方向的箭头，实线 / 虚线 / 粗线，可带标签（spec §1、§9）。
// 路径与避让属于「交给实现阶段」的细节（spec §14）。做法：为每条联系生成几条候选曲线
// （向两侧弯的直连曲线、从外侧绕行、上下边相接），选穿过节点最少的一条，一样多时选最短的。
// 端点所在的节点被折叠（不可见）时，这条联系不画。

import type { Node, Relationship } from "../parse";
import type { Box, LayoutResult } from "../layout";
import { svg } from "./dom";

interface Point {
  x: number;
  y: number;
}

type Curve = [Point, Point, Point, Point];

const f = (n: number) => Math.round(n * 100) / 100;
const DETOUR_MARGIN = 28;
const SAMPLES = 48;

let markerSerial = 0;

const center = (b: Box): Point => ({
  x: b.x + b.width / 2,
  y: b.y + b.height / 2,
});

/** 从盒子中心朝 toward 方向射出，与盒子边缘的交点。 */
function edgePoint(box: Box, toward: Point): Point {
  const c = center(box);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  const sx = dx ? box.width / 2 / Math.abs(dx) : Infinity;
  const sy = dy ? box.height / 2 / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

function bezierAt([a, b, c, d]: Curve, t: number): Point {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return {
    x: w0 * a.x + w1 * b.x + w2 * c.x + w3 * d.x,
    y: w0 * a.y + w1 * b.y + w2 * c.y + w3 * d.y,
  };
}

/** 向一侧弯的直连曲线：sign 决定弯向哪边。 */
function direct(from: Box, to: Box, sign: number): Curve {
  const a = edgePoint(from, center(to));
  const b = edgePoint(to, center(from));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const off = sign * Math.min(60, len * 0.25);
  const nx = (-dy / len) * off;
  const ny = (dx / len) * off;
  return [
    a,
    { x: a.x + dx / 3 + nx, y: a.y + dy / 3 + ny },
    { x: a.x + (2 * dx) / 3 + nx, y: a.y + (2 * dy) / 3 + ny },
    b,
  ];
}

/** 从外侧绕行：两端都从朝外的一侧出发，曲线鼓出到两端之间所有节点的最外边之外。 */
function detour(from: Box, to: Box, boxes: readonly Box[]): Curve {
  const left = from.left;
  const a = { x: left ? from.x : from.x + from.width, y: center(from).y };
  const b = { x: left ? to.x : to.x + to.width, y: center(to).y };
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  let outer = left ? Math.min(a.x, b.x) : Math.max(a.x, b.x);
  for (const box of boxes) {
    if (box.y + box.height < top || box.y > bottom || box.left !== left)
      continue;
    outer = left ? Math.min(outer, box.x) : Math.max(outer, box.x + box.width);
  }
  // 两个控制点在同一竖线上时，曲线最多到达 0.75 处：控制点要再往外放一些。
  const k = left ? -1 : 1;
  const base = left ? Math.min(a.x, b.x) : Math.max(a.x, b.x);
  const cx = base + (k * (Math.abs(outer - base) + DETOUR_MARGIN)) / 0.75;
  return [a, { x: cx, y: a.y }, { x: cx, y: b.y }, b];
}

/** 上下边相接：上面的节点从底边出发，下面的节点从顶边进入。 */
function vertical(from: Box, to: Box): Curve {
  const down = center(to).y > center(from).y;
  const a = { x: center(from).x, y: down ? from.y + from.height : from.y };
  const b = { x: center(to).x, y: down ? to.y : to.y + to.height };
  const d = Math.max(20, Math.abs(b.y - a.y) / 2);
  const k = down ? 1 : -1;
  return [a, { x: a.x, y: a.y + k * d }, { x: b.x, y: b.y - k * d }, b];
}

function length(curve: Curve): number {
  let total = 0;
  let prev = curve[0];
  for (let i = 1; i <= SAMPLES; i++) {
    const p = bezierAt(curve, i / SAMPLES);
    total += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return total;
}

const inside = (p: Point, b: Box, pad: number) =>
  p.x > b.x - pad &&
  p.x < b.x + b.width + pad &&
  p.y > b.y - pad &&
  p.y < b.y + b.height + pad;

/** 曲线穿过了几个节点（两端节点只在离开端点后才算）。 */
function crossings(
  curve: Curve,
  from: Box,
  to: Box,
  boxes: readonly Box[],
): number {
  const hit = new Set<Box>();
  for (let i = 1; i < SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = bezierAt(curve, t);
    for (const box of boxes) {
      if (hit.has(box)) continue;
      if (box === from && t < 0.15) continue;
      if (box === to && t > 0.85) continue;
      if (inside(p, box, box === from || box === to ? -2 : 2)) hit.add(box);
    }
  }
  return hit.size;
}

function route(from: Box, to: Box, boxes: readonly Box[]): Curve {
  const candidates: Curve[] = [direct(from, to, 1), direct(from, to, -1)];
  if (from.left === to.left) candidates.push(detour(from, to, boxes));
  const gap =
    Math.max(from.y, to.y) - Math.min(from.y + from.height, to.y + to.height);
  if (gap > 8) candidates.push(vertical(from, to));

  let best = candidates[0]!;
  let bestScore = Infinity;
  for (const curve of candidates) {
    const score = crossings(curve, from, to, boxes) * 1e5 + length(curve);
    if (score < bestScore) {
      best = curve;
      bestScore = score;
    }
  }
  return best;
}

export function drawRelationships(
  doc: Document,
  relationships: readonly Relationship[],
  byId: ReadonlyMap<string, Node>,
  result: LayoutResult,
): SVGElement[] {
  const parts: SVGElement[] = [];
  const boxes = [...result.boxes.values()];
  const marker = `mdmm-arrow-${++markerSerial}`;
  let used = false;

  for (const r of relationships) {
    const fromNode = byId.get(r.from);
    const toNode = byId.get(r.to);
    const from = fromNode && result.boxes.get(fromNode);
    const to = toNode && result.boxes.get(toNode);
    if (!from || !to) continue;
    used = true;

    const p = route(from, to, boxes);
    const [a, c1, c2, b] = p;
    const path = svg(doc, "path", `mdmm-relation mdmm-relation-${r.style}`);
    path.setAttribute(
      "d",
      `M${f(a.x)} ${f(a.y)}C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(b.x)} ${f(b.y)}`,
    );
    path.setAttribute("marker-end", `url(#${marker})`);
    path.dataset.line = String(r.line);
    path.dataset.from = r.from;
    path.dataset.to = r.to;
    parts.push(path);

    if (r.label) {
      const mid = bezierAt(p, 0.5);
      const text = svg(doc, "text", "mdmm-relation-label");
      text.setAttribute("x", String(f(mid.x)));
      text.setAttribute("y", String(f(mid.y)));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.dataset.line = String(r.line);
      text.textContent = r.label;
      parts.push(text);
    }
  }

  if (used) {
    const defs = svg(doc, "defs");
    const m = svg(doc, "marker", "mdmm-arrow");
    m.id = marker;
    for (const [k, v] of Object.entries({
      viewBox: "0 0 10 10",
      refX: "9",
      refY: "5",
      markerWidth: "9",
      markerHeight: "9",
      markerUnits: "userSpaceOnUse",
      orient: "auto-start-reverse",
    })) {
      m.setAttribute(k, v);
    }
    const head = svg(doc, "path");
    head.setAttribute("d", "M0 0L10 5L0 10z");
    m.append(head);
    defs.append(m);
    parts.unshift(defs);
  }
  return parts;
}
