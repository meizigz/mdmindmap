// 联系线：方向、样式、标签，以及端点被折叠时不画。
import { afterEach, describe, expect, test } from "vitest";
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

async function mount(source: string) {
  const container = document.createElement("div");
  container.style.width = "900px";
  container.style.height = "600px";
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

/** 有 ^id 的节点所在行 → 盒子。 */
function boxById(container: HTMLElement, source: string, id: string): Rect {
  const lines = source.split("\n");
  const line = lines.findIndex((l) => new RegExp(`\\^${id}\\s*$`).test(l)) + 1;
  return boxOf(
    container.querySelector(`.mdmm-nodes .mdmm-node[data-line="${line}"]`)!,
  );
}

/** 点落在盒子的边上（容差 1.5px）。 */
function onEdge(p: DOMPoint, b: Rect): boolean {
  const t = 1.5;
  const inside =
    p.x >= b.x - t &&
    p.x <= b.x + b.width + t &&
    p.y >= b.y - t &&
    p.y <= b.y + b.height + t;
  const nearX = Math.abs(p.x - b.x) <= t || Math.abs(p.x - b.x - b.width) <= t;
  const nearY = Math.abs(p.y - b.y) <= t || Math.abs(p.y - b.y - b.height) <= t;
  return inside && (nearX || nearY);
}

describe.each([
  ["牛顿运动定律", newton],
  ["参考截图", screenshot],
])("%s", (_, source) => {
  test("联系线从起点节点的边出发，箭头指到终点节点的边", async () => {
    const container = await mount(source);
    const paths = container.querySelectorAll<SVGPathElement>(".mdmm-relation");
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      const from = boxById(container, source, path.dataset.from!);
      const to = boxById(container, source, path.dataset.to!);
      const start = path.getPointAtLength(0);
      const end = path.getPointAtLength(path.getTotalLength());
      expect(onEdge(start, from), `${path.dataset.from} 的起点`).toBe(true);
      expect(onEdge(end, to), `${path.dataset.to} 的终点`).toBe(true);
      expect(path.getAttribute("marker-end")).toMatch(
        /^url\(#mdmm-arrow-\d+\)$/,
      );
    }
  });
});

test("样式与标签", async () => {
  const container = await mount(newton);
  const dashed = container.querySelector<SVGPathElement>(
    '.mdmm-relation[data-from="law1"]',
  )!;
  expect(dashed.classList).toContain("mdmm-relation-dashed");
  expect(getComputedStyle(dashed).strokeDasharray).not.toBe("none");
  const labels = [...container.querySelectorAll(".mdmm-relation-label")].map(
    (t) => t.textContent,
  );
  expect(labels).toEqual(["合力为零时的特例", "对比"]);
});

test("粗线比实线粗", async () => {
  const container = await mount(
    "# 根\n- 甲 ^a\n- 乙 ^b\n- 丙 ^c\n\n%%\na ==> b\nb --> c\n%%\n",
  );
  const width = (from: string) =>
    parseFloat(
      getComputedStyle(
        container.querySelector(`.mdmm-relation[data-from="${from}"]`)!,
      ).strokeWidth,
    );
  expect(width("a")).toBeGreaterThan(width("b"));
});

test("端点被折叠时不画这条联系", async () => {
  const container = await mount(
    "# 根\n- 甲 ^a\n- 父 <!-- fold -->\n  - 子 ^b\n\n%%\na --> b\n%%\n",
  );
  expect(container.querySelectorAll(".mdmm-relation")).toHaveLength(0);
  expect(container.querySelector("marker")).toBeNull();
});

test("上下离得远、中间都是节点时，从外侧绕行", async () => {
  const lines = ["# 根", "- 起点 ^a"];
  for (let i = 0; i < 8; i++)
    lines.push(`- 中间的一个比较长的节点 ${i}`, `  - 子节点 ${i}`);
  lines.push("- 终点 ^b", "", "%%", "a --> b", "%%");
  const container = await mount(lines.join("\n"));
  const path = container.querySelector<SVGPathElement>(".mdmm-relation")!;
  const reach = path.getBBox().x + path.getBBox().width;
  let right = 0;
  for (const el of container.querySelectorAll(".mdmm-nodes .mdmm-node")) {
    const b = boxOf(el);
    right = Math.max(right, b.x + b.width);
  }
  expect(reach).toBeGreaterThan(right);
});

test("同一页面的两张导图用不同的箭头 ID", async () => {
  const a = await mount(newton);
  const b = await mount(newton);
  expect(a.querySelector("marker")!.id).not.toBe(b.querySelector("marker")!.id);
});

test("选穿过节点最少的路线：相邻的两个一级分支之间不穿过任何节点", async () => {
  const container = await mount(newton);
  const path = container.querySelector<SVGPathElement>(
    '.mdmm-relation[data-from="law1"]',
  )!;
  const from = boxById(container, newton, "law1");
  const to = boxById(container, newton, "law2");
  const others = [...container.querySelectorAll(".mdmm-nodes .mdmm-node")]
    .map(boxOf)
    .filter((b) => b.x !== from.x || b.y !== from.y)
    .filter((b) => b.x !== to.x || b.y !== to.y);
  const total = path.getTotalLength();
  for (let i = 1; i < 40; i++) {
    const p = path.getPointAtLength((total * i) / 40);
    for (const b of others) {
      const hit =
        p.x > b.x && p.x < b.x + b.width && p.y > b.y && p.y < b.y + b.height;
      expect(hit, `穿过了 (${b.x}, ${b.y}) 处的节点`).toBe(false);
    }
  }
});
