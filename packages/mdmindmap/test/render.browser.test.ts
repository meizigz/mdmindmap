// 渲染流水线的浏览器测试（Vitest 浏览器模式，Chromium）：检查真实 DOM 的几何关系。
import { afterEach, describe, expect, test } from "vitest";
import { parse, type Node } from "mdmindmap/parse";
import { render, type MathRenderer, type MindMap } from "mdmindmap";
import "../src/style.css";
import newton from "./fixtures/spec/newton.md?raw";
import screenshot from "./fixtures/spec/screenshot.md?raw";

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

async function mount(source: string, attrs: Record<string, string> = {}) {
  const container = document.createElement("div");
  container.style.width = "900px";
  container.style.height = "600px";
  for (const [k, v] of Object.entries(attrs)) container.setAttribute(k, v);
  document.body.append(container);
  const map = render(container, source, { math });
  mounted.push({ container, map });
  await map.ready;
  return container;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 节点在 stage 坐标系里的盒子（与 SVG 连线层同一坐标系；缩放为 1）。 */
function boxOf(el: Element): Rect {
  const stage = el.closest(".mdmm-stage")!.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: r.x - stage.x,
    y: r.y - stage.y,
    width: r.width,
    height: r.height,
  };
}

function boxes(container: HTMLElement): Map<string, Rect> {
  const map = new Map<string, Rect>();
  for (const el of container.querySelectorAll<HTMLElement>(
    ".mdmm-nodes .mdmm-node",
  )) {
    map.set(el.dataset.line!, boxOf(el));
  }
  return map;
}

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width - 0.5 &&
  b.x < a.x + a.width - 0.5 &&
  a.y < b.y + b.height - 0.5 &&
  b.y < a.y + a.height - 0.5;

function expectNoOverlap(container: HTMLElement) {
  const list = [...boxes(container).entries()];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      expect(
        overlaps(list[i]![1], list[j]![1]),
        `第 ${list[i]![0]} 行与第 ${list[j]![0]} 行的节点重叠`,
      ).toBe(false);
    }
  }
}

describe.each([
  ["牛顿运动定律", newton],
  ["参考截图", screenshot],
])("%s", (_, source) => {
  test("节点不重叠", async () => {
    expectNoOverlap(await mount(source));
  });

  test("概要括号覆盖到首尾两个兄弟的上下边", async () => {
    const container = await mount(source);
    const rects = boxes(container);
    const walk = (node: Node) => {
      for (const s of node.summaries) {
        const path = container.querySelector<SVGPathElement>(
          `.mdmm-brace[data-line="${s.node.line}"]`,
        )!;
        const box = path.getBBox();
        const first = rects.get(String(node.children[s.from]!.line))!;
        const last = rects.get(String(node.children[s.to]!.line))!;
        expect(box.y).toBeLessThanOrEqual(first.y + 0.5);
        expect(box.y + box.height).toBeGreaterThanOrEqual(
          last.y + last.height - 0.5,
        );
        walk(s.node);
      }
      node.children.forEach(walk);
    };
    walk(parse(source).root!);
  });

  test("下划线式节点：连线接在底边，下划线与节点同宽", async () => {
    const container = await mount(source);
    const underlined = container.querySelectorAll<HTMLElement>(
      ".mdmm-nodes .mdmm-node-underline",
    );
    expect(underlined.length).toBeGreaterThan(0);
    for (const el of underlined) {
      const line = el.dataset.line!;
      const box = boxOf(el);
      const bottom = box.y + box.height;
      const branch = container.querySelector<SVGPathElement>(
        `.mdmm-branch[data-line="${line}"]`,
      )!;
      const end = branch.getPointAtLength(branch.getTotalLength());
      expect(end.x).toBeCloseTo(box.x, 1);
      expect(end.y).toBeCloseTo(bottom, 1);
      const underline = container
        .querySelector<SVGPathElement>(`.mdmm-underline[data-line="${line}"]`)!
        .getBBox();
      expect(underline.y).toBeCloseTo(bottom, 1);
      expect(underline.width).toBeCloseTo(box.width, 1);
    }
  });
});

test("层级、概要、颜色写在选择器属性上", async () => {
  const container = await mount(newton);
  const node = (line: number) =>
    container.querySelector<HTMLElement>(`.mdmm-node[data-line="${line}"]`)!;
  expect(node(1).dataset.depth).toBe("0");
  expect(node(6).dataset.depth).toBe("1");
  expect(node(6).dataset.color).toBe("red");
  expect(node(14).dataset.summary).toBe("");
  // 默认折叠的「应用」：子节点不渲染
  expect(node(23)).not.toBeNull();
  expect(container.querySelector('.mdmm-node[data-line="24"]')).toBeNull();
});

test("data-mdmm-theme 强制暗色", async () => {
  const light = await mount(newton, { "data-mdmm-theme": "light" });
  const dark = await mount(newton, { "data-mdmm-theme": "dark" });
  const bg = (c: HTMLElement) =>
    getComputedStyle(c.querySelector(".mdmm")!)
      .getPropertyValue("--mdmm-bg")
      .trim();
  expect(bg(light)).toBe("#ffffff");
  expect(bg(dark)).toBe("#1e1e1e");
  const branch = (c: HTMLElement) =>
    getComputedStyle(c.querySelector(".mdmm-branch")!).stroke;
  expect(branch(light)).not.toBe(branch(dark));
});

test("300 个节点的首次渲染时间", async () => {
  const lines = ["# 三百个节点"];
  for (let i = 0; i < 20; i++) {
    lines.push(`- 第 ${i + 1} 章 一些文字`);
    for (let j = 0; j < 14; j++) {
      lines.push(`  - 要点 ${i}-${j}：$F_${j}=ma$ 以及**加粗**`);
    }
  }
  const start = performance.now();
  const container = await mount(lines.join("\n"));
  const elapsed = performance.now() - start;
  console.log(`300 个节点首次渲染：${elapsed.toFixed(1)} ms`);
  expect(container.querySelectorAll(".mdmm-nodes .mdmm-node").length).toBe(301);
  expect(elapsed).toBeLessThan(1000);
  expectNoOverlap(container);
});
