// 平移缩放、点击激活、折叠、自动高度（spec §8）。
import { afterEach, describe, expect, test } from "vitest";
import { userEvent } from "vitest/browser";
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
  container.style.width = "900px";
  if (options.height === undefined) container.style.height = "600px";
  document.body.append(container);
  const map = render(container, source, { math, ...options });
  mounted.push({ container, map });
  await map.ready;
  return {
    container,
    map,
    root: container.querySelector<HTMLElement>(".mdmm")!,
  };
}

const node = (c: HTMLElement, line: number) =>
  c.querySelector<HTMLElement>(`.mdmm-nodes .mdmm-node[data-line="${line}"]`);
const toggle = (c: HTMLElement, line: number) =>
  c.querySelector<HTMLElement>(`.mdmm-toggle[data-line="${line}"]`)!;
const scaleOf = (c: HTMLElement) =>
  parseFloat(
    c
      .querySelector<HTMLElement>(".mdmm-stage")!
      .style.getPropertyValue("--mdmm-scale"),
  );
const txOf = (c: HTMLElement) =>
  parseFloat(
    c
      .querySelector<HTMLElement>(".mdmm-stage")!
      .style.getPropertyValue("--mdmm-tx"),
  );

function wheel(c: HTMLElement, deltaY: number): WheelEvent {
  const surface = c.querySelector(".mdmm-viewport")!;
  const rect = surface.getBoundingClientRect();
  const e = new WheelEvent("wheel", {
    deltaY,
    clientX: rect.x + 200,
    clientY: rect.y + 200,
    bubbles: true,
    cancelable: true,
  });
  surface.dispatchEvent(e);
  return e;
}

function pointer(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 7,
      pointerType: "mouse",
      button: 0,
      clientX: x,
      clientY: y,
      bubbles: true,
    }),
  );
}

describe("折叠", () => {
  test("点折叠按钮：子节点收起，按钮显示后代数，节点原地不动；再点一次展开", async () => {
    const { container } = await mount(newton);
    const law2 = () => node(container, 6)!.getBoundingClientRect();
    const before = law2();

    await userEvent.click(toggle(container, 6));
    await expect.poll(() => node(container, 7)).toBeNull();
    // 牛顿第二定律：6 个子节点 + 2 个概要 + 三性下面 2 个子节点
    expect(toggle(container, 6).textContent).toBe("10");
    expect(toggle(container, 6).getAttribute("aria-expanded")).toBe("false");
    expect(law2().x).toBeCloseTo(before.x, 0);
    expect(law2().y).toBeCloseTo(before.y, 0);
    expect(container.querySelector('.mdmm-brace[data-line="9"]')).toBeNull();

    await userEvent.click(toggle(container, 6));
    await expect.poll(() => node(container, 7)).not.toBeNull();
    expect(law2().y).toBeCloseTo(before.y, 0);
  });

  test("<!-- fold --> 的节点默认折叠，按钮显示后代数", async () => {
    const { container } = await mount(newton);
    expect(node(container, 24)).toBeNull();
    expect(toggle(container, 23).textContent).toBe("3");
  });

  test("collapseAll(1)：只剩根和一级分支，并且整张图都在视口里", async () => {
    const { container, map } = await mount(newton);
    await map.collapseAll(1);
    const depths = [
      ...container.querySelectorAll<HTMLElement>(".mdmm-nodes .mdmm-node"),
    ].map((el) => el.dataset.depth);
    expect(new Set(depths)).toEqual(new Set(["0", "1"]));
    const view = container
      .querySelector(".mdmm-viewport")!
      .getBoundingClientRect();
    for (const el of container.querySelectorAll(".mdmm-nodes .mdmm-node")) {
      const r = el.getBoundingClientRect();
      expect(r.left).toBeGreaterThanOrEqual(view.left);
      expect(r.right).toBeLessThanOrEqual(view.right);
      expect(r.top).toBeGreaterThanOrEqual(view.top);
      expect(r.bottom).toBeLessThanOrEqual(view.bottom);
    }
  });
});

describe("自动高度", () => {
  test("可见叶子数 × 26 + 40，折叠的分支不计入", async () => {
    // 第一定律 2 + 第二定律（6 个子节点 + 定量关系 1 + 三性的 2 个子节点）9
    // + 第三定律（3 个子节点 + 概要的 1 个子节点）4 + 折叠的「应用」1 = 16
    const { root } = await mount(newton, { height: "auto" });
    expect(root.getBoundingClientRect().height).toBe(16 * 26 + 40);
  });

  test("限制在 220–600 px", async () => {
    const small = await mount("# 根\n- 甲\n", { height: "auto" });
    expect(small.root.getBoundingClientRect().height).toBe(220);
    const lines = [
      "# 根",
      ...Array.from({ length: 40 }, (_, i) => `- 节点 ${i}`),
    ];
    const large = await mount(lines.join("\n"), { height: "auto" });
    expect(large.root.getBoundingClientRect().height).toBe(600);
  });

  test("固定高度", async () => {
    const { root } = await mount(newton, { height: 333 });
    expect(root.getBoundingClientRect().height).toBe(333);
  });
});

describe("点击激活", () => {
  test("给了 height 时默认点击激活：激活前不拦截滚轮", async () => {
    const { container, root } = await mount(newton, { height: "auto" });
    expect(root.dataset.interaction).toBe("click-to-activate");
    const scale = scaleOf(container);
    expect(wheel(container, 100).defaultPrevented).toBe(false);
    expect(scaleOf(container)).toBe(scale);
  });

  test("第一下只激活、不折叠；激活后滚轮缩放", async () => {
    const { container, root } = await mount(newton, { height: "auto" });
    await userEvent.click(toggle(container, 6));
    expect(root.classList).toContain("mdmm-active");
    expect(node(container, 7)).not.toBeNull();

    const scale = scaleOf(container);
    expect(wheel(container, 100).defaultPrevented).toBe(true);
    expect(scaleOf(container)).toBeLessThan(scale);
  });

  test("按 Esc 或点导图外面退出", async () => {
    const { container, root } = await mount(newton, { height: "auto" });
    await userEvent.click(container.querySelector(".mdmm-viewport")!);
    expect(root.classList).toContain("mdmm-active");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root.classList).not.toContain("mdmm-active");

    await userEvent.click(container.querySelector(".mdmm-viewport")!);
    expect(root.classList).toContain("mdmm-active");
    pointer(document.body, "pointerdown", 1, 1);
    expect(root.classList).not.toContain("mdmm-active");
  });
});

describe("direct", () => {
  test("没给 height 时默认直接操作：滚轮缩放", async () => {
    const { container, root } = await mount(newton);
    expect(root.dataset.interaction).toBe("direct");
    const scale = scaleOf(container);
    wheel(container, -100);
    expect(scaleOf(container)).toBeGreaterThan(scale);
  });

  test("拖动平移", async () => {
    const { container } = await mount(newton);
    const surface = container.querySelector(".mdmm-viewport")!;
    const r = surface.getBoundingClientRect();
    const x0 = txOf(container);
    pointer(surface, "pointerdown", r.x + 300, r.y + 500);
    pointer(surface, "pointermove", r.x + 310, r.y + 505);
    pointer(surface, "pointermove", r.x + 360, r.y + 530);
    pointer(surface, "pointerup", r.x + 360, r.y + 530);
    expect(txOf(container) - x0).toBeCloseTo(60, 0);
  });

  test("拖动结束不触发折叠", async () => {
    const { container } = await mount(newton);
    const t = toggle(container, 6);
    const r = t.getBoundingClientRect();
    pointer(t, "pointerdown", r.x + 5, r.y + 5);
    pointer(t, "pointermove", r.x + 40, r.y + 5);
    pointer(t, "pointerup", r.x + 40, r.y + 5);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(node(container, 7)).not.toBeNull();
  });
});

describe("首次显示", () => {
  test("放得下就 fit（最大 100%）", async () => {
    const { container } = await mount(newton);
    expect(scaleOf(container)).toBe(1);
  });

  test("要缩到 60% 以下才放得下时，按 60% 显示，根节点靠左、上下居中", async () => {
    const lines = ["# 很大的图"];
    for (let i = 0; i < 60; i++) lines.push(`- 节点 ${i}`, `  - 子节点 ${i}`);
    const { container, map } = await mount(lines.join("\n"));
    expect(scaleOf(container)).toBeCloseTo(0.6, 5);
    const view = container
      .querySelector(".mdmm-viewport")!
      .getBoundingClientRect();
    const root = node(container, 1)!.getBoundingClientRect();
    expect(root.left - view.left).toBeCloseTo(24, 0);
    expect(
      root.top + root.height / 2 - (view.top + view.height / 2),
    ).toBeCloseTo(0, 0);

    map.fit();
    expect(scaleOf(container)).toBeLessThan(0.6);
  });
});
