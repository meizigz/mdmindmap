// bilateral 结构：左侧的分支、概要括号、下划线、折叠按钮全部镜像；setLayout 保留折叠状态。
import { afterEach, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
import { parse, type Node } from "mdmindmap/parse";
import {
  render,
  type MathRenderer,
  type MindMap,
  type RenderOptions,
} from "mdmindmap";
import "../src/style.css";
import newton from "./fixtures/spec/newton.md?raw";

const math: MathRenderer = {
  render(tex) {
    const span = document.createElement("span");
    span.textContent = tex;
    return span;
  },
};

const mounted: { container: HTMLElement; map: MindMap }[] = [];
afterEach(() => {
  for (const { container, map } of mounted.splice(0)) {
    map.destroy();
    container.remove();
  }
});

async function mount(source: string, options: Partial<RenderOptions> = {}) {
  const container = document.createElement("div");
  container.style.width = "1200px";
  container.style.height = "700px";
  document.body.append(container);
  const map = render(container, source, {
    math,
    layout: "bilateral",
    ...options,
  });
  mounted.push({ container, map });
  await map.ready;
  return { container, map };
}

const rect = (c: HTMLElement, line: number) =>
  c
    .querySelector(`.mdmm-nodes .mdmm-node[data-line="${line}"]`)!
    .getBoundingClientRect();

/** 左侧和右侧各有哪些一级分支（按行号）。 */
function sides(c: HTMLElement, root: Node) {
  const r = rect(c, root.line);
  const left: Node[] = [];
  const right: Node[] = [];
  for (const child of root.children) {
    (rect(c, child.line).right <= r.left ? left : right).push(child);
  }
  return { left, right };
}

const LEFT_SUMMARY = `# 根
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
`;

test("左侧的节点、概要括号和折叠按钮都朝左", async () => {
  const { container } = await mount(LEFT_SUMMARY);
  const root = parse(LEFT_SUMMARY).root!;
  const { left, right } = sides(container, root);
  expect(left.length).toBeGreaterThan(0);
  expect(right.length).toBeGreaterThan(0);

  // 左侧分支的后代都在它左边
  const walk = (n: Node) => {
    for (const c of [...n.children, ...n.summaries.map((s) => s.node)]) {
      expect(rect(container, c.line).right).toBeLessThanOrEqual(
        rect(container, n.line).left + 0.5,
      );
      walk(c);
    }
  };
  left.forEach(walk);

  // 左侧概要括号在被括兄弟的左边，概要节点在括号左边
  for (const branch of left) {
    for (const s of branch.summaries) {
      const brace = container
        .querySelector<SVGPathElement>(
          `.mdmm-brace[data-line="${s.node.line}"]`,
        )!
        .getBoundingClientRect();
      const first = rect(container, branch.children[s.from]!.line);
      expect(brace.right).toBeLessThanOrEqual(first.left + 1);
      expect(rect(container, s.node.line).right).toBeLessThanOrEqual(
        brace.left + 1,
      );
    }
  }

  // 左侧节点的折叠按钮在节点左边
  for (const branch of left) {
    const toggle = container
      .querySelector(`.mdmm-toggle[data-line="${branch.line}"]`)!
      .getBoundingClientRect();
    expect(toggle.right).toBeLessThanOrEqual(
      rect(container, branch.line).left + 0.5,
    );
  }
});

test("左侧的下划线式节点：连线接在下划线的右端", async () => {
  const { container } = await mount(LEFT_SUMMARY);
  const root = parse(LEFT_SUMMARY).root!;
  const { left } = sides(container, root);
  const stage = container.querySelector(".mdmm-stage")!.getBoundingClientRect();
  let checked = 0;
  for (const branch of left) {
    for (const child of branch.children) {
      const el = container.querySelector<HTMLElement>(
        `.mdmm-nodes .mdmm-node[data-line="${child.line}"]`,
      )!;
      if (!el.classList.contains("mdmm-node-underline")) continue;
      const r = el.getBoundingClientRect();
      const path = container.querySelector<SVGPathElement>(
        `.mdmm-branch[data-line="${child.line}"]`,
      )!;
      const end = path.getPointAtLength(path.getTotalLength());
      const scale = r.width / el.offsetWidth;
      expect(stage.x + end.x * scale).toBeCloseTo(r.right, 0);
      expect(stage.y + end.y * scale).toBeCloseTo(r.bottom, 0);
      checked++;
    }
  }
  expect(checked).toBeGreaterThan(0);
});

test("根节点上的概要不会被切到两边", async () => {
  const source = `# 根
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
`;
  const { container } = await mount(source);
  const root = parse(source).root!;
  const { left } = sides(container, root);
  const covered = root.children.slice(0, 3);
  const onLeft = covered.map((c) => left.includes(c));
  expect(new Set(onLeft).size).toBe(1);
});

test("setLayout 切换结构，保留折叠状态", async () => {
  const { container, map } = await mount(newton, { layout: "logic" });
  const root = parse(newton).root!;
  expect(sides(container, root).left).toHaveLength(0);

  await userEvent.click(
    container.querySelector('.mdmm-toggle[data-line="6"]')!,
  );
  await expect
    .poll(() => container.querySelector('.mdmm-node[data-line="7"]'))
    .toBeNull();

  await map.setLayout("bilateral");
  expect(sides(container, root).left.length).toBeGreaterThan(0);
  expect(container.querySelector('.mdmm-node[data-line="7"]')).toBeNull();

  await map.setLayout("logic");
  expect(sides(container, root).left).toHaveLength(0);
});
