// 排版包装层：在 Node 里用假尺寸检查几何关系（「排版引擎与节点渲染原型验证」中的边界情况）。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { parse, type Node } from "mdmindmap/parse";
import {
  chooseRightCount,
  layoutTree,
  type Box,
  type Layout,
  type LayoutResult,
} from "../src/layout";

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, "fixtures", name), "utf8");

function rootOf(source: string): Node {
  const { root } = parse(source);
  if (!root) throw new Error("没有根节点");
  return root;
}

/** 假尺寸：每个字 13px 宽，最大宽度 240，超出就换行，每行 22px 高。 */
function fakeSize(node: Node) {
  const chars = [...node.text].length;
  const lines = Math.max(1, Math.ceil((chars * 13) / 224));
  return { width: Math.min(240, chars * 13 + 16), height: lines * 22 + 6 };
}

function depthOf(root: Node): Map<Node, number> {
  const depth = new Map<Node, number>();
  const walk = (n: Node, d: number) => {
    depth.set(n, d);
    n.children.forEach((c) => walk(c, d + 1));
    n.summaries.forEach((s) => walk(s.node, d + 1));
  };
  walk(root, 0);
  return depth;
}

function run(
  root: Node,
  layout: Layout = "logic",
  collapsed: ReadonlySet<Node> = new Set(),
): LayoutResult {
  const depth = depthOf(root);
  return layoutTree({
    root,
    layout,
    size: fakeSize,
    underline: (n) => (depth.get(n) ?? 0) >= 2 && !isSummaryNode(root, n),
    collapsed: (n) => collapsed.has(n),
  });
}

function isSummaryNode(root: Node, node: Node): boolean {
  let found = false;
  const walk = (n: Node) => {
    if (n.summaries.some((s) => s.node === node)) found = true;
    n.children.forEach(walk);
    n.summaries.forEach((s) => walk(s.node));
  };
  walk(root);
  return found;
}

const EPS = 0.5;
const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width - EPS &&
  b.x < a.x + a.width - EPS &&
  a.y < b.y + b.height - EPS &&
  b.y < a.y + a.height - EPS;

/** 所有通用的几何不变量。 */
function expectSane(root: Node, result: LayoutResult) {
  const boxes = [...result.boxes.entries()];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [na, a] = boxes[i]!;
      const [nb, b] = boxes[j]!;
      expect(overlaps(a, b), `「${na.text}」与「${nb.text}」重叠`).toBe(false);
    }
  }

  for (const [parent, p] of result.boxes) {
    for (const child of parent.children) {
      const c = result.boxes.get(child);
      if (!c) continue;
      if (c.left) {
        expect(
          c.x + c.width,
          `「${child.text}」应在父节点左侧`,
        ).toBeLessThanOrEqual(p.x + EPS);
      } else {
        expect(c.x, `「${child.text}」应在父节点右侧`).toBeGreaterThanOrEqual(
          p.x + p.width - EPS,
        );
      }
    }
  }

  for (const brace of result.braces) {
    const s = result.boxes.get(brace.summary.node)!;
    if (brace.left) {
      expect(s.x + s.width).toBeLessThanOrEqual(brace.x + EPS);
    } else {
      expect(s.x).toBeGreaterThanOrEqual(brace.x - EPS);
    }
    const covered = brace.parent.children.slice(
      brace.summary.from,
      brace.summary.to + 1,
    );
    for (const c of covered) {
      const b = result.boxes.get(c)!;
      expect(brace.top).toBeLessThanOrEqual(b.y + EPS);
      expect(brace.bottom).toBeGreaterThanOrEqual(b.y + b.height - EPS);
      expect(b.left).toBe(brace.left);
    }
  }

  // 所有可见节点都排进去了。
  const visible: Node[] = [];
  const walk = (n: Node) => {
    visible.push(n);
    if (result.boxes.get(n) && !isCollapsedIn(result, n)) {
      n.children.forEach(walk);
      n.summaries.forEach((s) => walk(s.node));
    }
  };
  walk(root);
  for (const n of visible)
    expect(result.boxes.has(n), `「${n.text}」没有位置`).toBe(true);
}

const collapsedSets = new WeakMap<LayoutResult, ReadonlySet<Node>>();
const isCollapsedIn = (r: LayoutResult, n: Node) =>
  collapsedSets.get(r)?.has(n) ?? false;

describe("边界情况", () => {
  test("参考截图那张图", () => {
    const root = rootOf(fixture("spec/screenshot.md"));
    expectSane(root, run(root));
  });

  test("概要带多层子节点（牛顿运动定律）", () => {
    const root = rootOf(fixture("spec/newton.md"));
    const result = run(root);
    expectSane(root, result);
    expect(result.braces).toHaveLength(3);
  });

  test("相邻概要", () => {
    const root = rootOf(`# 根
- 甲
  - 甲的子节点
- 乙
- } 总结一
  - 总结一的子节点
- 丙
- 丁
  - 丁的子节点一
  - 丁的子节点二
- } 总结二
`);
    const result = run(root);
    expectSane(root, result);
    const [one, two] = result.braces;
    expect(one!.bottom).toBeLessThanOrEqual(two!.top + EPS);
  });

  test("概要的子节点里再套概要", () => {
    const root = rootOf(fixture("summaries/summary-children-and-markers.md"));
    const result = run(root);
    expectSane(root, result);
    expect(result.braces).toHaveLength(3);
  });

  test("bilateral：左侧分支上的概要朝左", () => {
    const root = rootOf(`# 根
- 一
  - 一甲
  - 一乙
- 二
  - 二甲
- 三
  - { 三甲
  - 三乙
  - } 三的总结
- 四
  - { 四甲
  - 四乙
  - } 四的总结
    - 总结的子节点
`);
    const result = run(root, "bilateral");
    expectSane(root, result);
    const leftBraces = result.braces.filter((b) => b.left);
    expect(leftBraces.length).toBeGreaterThan(0);
    const r = result.boxes.get(root)!;
    for (const [n, b] of result.boxes) {
      if (n !== root && b.left)
        expect(b.x + b.width).toBeLessThanOrEqual(r.x + EPS);
    }
  });

  test("bilateral：根节点上的概要不会被切到两边", () => {
    const root = rootOf(`# 根
- { 一
  - 一甲
  - 一乙
  - 一丙
- 二
- 三
- } 前三个的总结
- 四
  - 四甲
- 五
`);
    const result = run(root, "bilateral");
    expectSane(root, result);
  });

  test("长短悬殊的节点", () => {
    const long =
      "这是一个非常长的节点，里面写了很多很多字，会按最大宽度自动换行，占好几行的高度。".repeat(
        2,
      );
    const root = rootOf(`# 根
- 短
  - ${long}
  - 短
- ${long}
  - 短
  - 短
- 短
`);
    expectSane(root, run(root));
    expectSane(root, run(root, "bilateral"));
  });
});

test("折叠的节点：后代不参与排版", () => {
  const root = rootOf(fixture("spec/newton.md"));
  const second = root.children[1]!;
  const collapsed = new Set([second]);
  const result = run(root, "logic", collapsed);
  collapsedSets.set(result, collapsed);
  expectSane(root, result);
  expect(result.boxes.has(second)).toBe(true);
  expect(result.boxes.has(second.children[0]!)).toBe(false);
  expect(result.braces.every((b) => b.parent !== second)).toBe(true);
});

describe("下划线式", () => {
  // 父节点要比子节点高（两行），否则居中对齐和下划线对齐的结果一样，区分不出来。
  const source = `# 根
- 一级
  - 二级父节点，文字比较长，会换成两行显示
    - 子一
    - 子二
    - 子三
`;
  const underlineGap = (underline: boolean) => {
    const root = rootOf(source);
    const result = layoutTree({
      root,
      layout: "logic",
      size: fakeSize,
      underline: () => underline,
      collapsed: () => false,
    });
    const parent = root.children[0]!.children[0]!;
    const p = result.boxes.get(parent)!;
    expect(p.height).toBeGreaterThan(
      result.boxes.get(parent.children[0]!)!.height,
    );
    const kids = parent.children.map((c) => result.boxes.get(c)!);
    const first = kids[0]!;
    const last = kids[kids.length - 1]!;
    const mid = (first.y + first.height + last.y + last.height) / 2;
    return Math.abs(p.y + p.height - mid);
  };

  test("父节点的下划线对齐到子节点下划线的中间", () => {
    expect(underlineGap(true)).toBeLessThan(1);
  });

  test("不是下划线式时按中线对齐，下划线不在中间", () => {
    expect(underlineGap(false)).toBeGreaterThan(5);
  });
});

describe("chooseRightCount", () => {
  test("按子树大小均分", () => {
    const root = rootOf("# 根\n- 一\n  - a\n  - b\n- 二\n- 三\n- 四\n");
    // 子树大小 3,1,1,1：右边放 1 个（3 对 3）。
    expect(chooseRightCount(root, () => false)).toBe(1);
  });

  test("切分点不落在概要范围内部", () => {
    const root = rootOf(
      "# 根\n- { 一\n  - a\n  - b\n- 二\n- } 总结\n- 三\n- 四\n",
    );
    // 最均匀的切法是 1（3 对 3），但会把概要切开，只能是 2。
    expect(chooseRightCount(root, () => false)).toBe(2);
  });

  test("折叠的子树只算一个节点", () => {
    const root = rootOf("# 根\n- 一\n  - a\n  - b\n  - c\n- 二\n");
    expect(chooseRightCount(root, (n) => n === root.children[0])).toBe(1);
  });
});
