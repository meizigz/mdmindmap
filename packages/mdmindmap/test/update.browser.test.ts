// update()：增量更新，保留视口和折叠状态（spec §6、§8）。
import { afterEach, expect, test, vi } from "vitest";
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
  container.style.height = "600px";
  document.body.append(container);
  const map = render(container, source, { math, ...options });
  mounted.push({ container, map });
  await map.ready;
  return { container, map };
}

/** 按文字找节点元素。 */
const byText = (c: HTMLElement, text: string) =>
  [...c.querySelectorAll<HTMLElement>(".mdmm-nodes .mdmm-node")].find(
    (el) => el.textContent === text,
  );
const scaleOf = (c: HTMLElement) =>
  c
    .querySelector<HTMLElement>(".mdmm-stage")!
    .style.getPropertyValue("--mdmm-scale");

test("只改一个节点的文字：其余节点复用原来的元素，改过的节点换成新元素", async () => {
  const { container, map } = await mount(newton);
  const kept = byText(container, "惯性：物体保持原有运动状态的性质")!;
  const changed = byText(container, "质量是惯性大小的唯一量度")!;

  await map.update(
    newton.replace("质量是惯性大小的唯一量度", "质量是惯性大小的量度"),
  );
  expect(byText(container, "惯性：物体保持原有运动状态的性质")).toBe(kept);
  expect(byText(container, "质量是惯性大小的唯一量度")).toBeUndefined();
  const replaced = byText(container, "质量是惯性大小的量度")!;
  expect(replaced).not.toBe(changed);
});

test("视口以离中心最近的节点为锚点，缩放不变", async () => {
  const { container, map } = await mount(newton);
  // 第二定律离视口中心最近
  const before = byText(container, "牛顿第二定律")!.getBoundingClientRect();
  const scale = scaleOf(container);

  // 在它上面插入几个节点，把它往下推
  const inserted = newton.replace(
    "- 牛顿第二定律",
    "- 新增一\n  - 子\n  - 子\n- 新增二\n- 牛顿第二定律",
  );
  await map.update(inserted);
  const after = byText(container, "牛顿第二定律")!.getBoundingClientRect();
  expect(scaleOf(container)).toBe(scale);
  expect(after.left).toBeCloseTo(before.left, 0);
  expect(after.top + after.height / 2).toBeCloseTo(
    before.top + before.height / 2,
    0,
  );
});

test("节点变宽变高时，锚点按左侧中点对齐", async () => {
  const { container, map } = await mount(newton);
  const before = byText(container, "牛顿第二定律")!.getBoundingClientRect();
  await map.update(
    newton.replace(
      "- 牛顿第二定律",
      "- 牛顿第二定律：加速度与合外力成正比、与质量成反比，方向相同",
    ),
  );
  const el = [
    ...container.querySelectorAll<HTMLElement>(".mdmm-nodes .mdmm-node"),
  ].find((e) => e.textContent?.startsWith("牛顿第二定律："))!;
  const after = el.getBoundingClientRect();
  expect(after.height).toBeGreaterThan(before.height);
  expect(after.left).toBeCloseTo(before.left, 0);
  expect(after.top + after.height / 2).toBeCloseTo(
    before.top + before.height / 2,
    0,
  );
});

test("折叠状态按路径保留；源文新加的 fold 标记生效", async () => {
  const { container, map } = await mount(newton);
  // 折叠「牛顿第一定律」（第 3 行）
  await userEvent.click(
    container.querySelector('.mdmm-toggle[data-line="3"]')!,
  );
  await expect
    .poll(() => byText(container, "质量是惯性大小的唯一量度"))
    .toBeUndefined();

  // 改别处，第一定律仍然折叠；「应用」仍按源文折叠
  await map.update(newton.replace("超重与失重", "超重和失重"));
  expect(byText(container, "质量是惯性大小的唯一量度")).toBeUndefined();
  expect(byText(container, "超重和失重")).toBeUndefined();

  // 给第三定律加上 fold 标记
  await map.update(
    newton.replace(
      "- 牛顿第三定律 ^law3",
      "- 牛顿第三定律 <!-- fold --> ^law3",
    ),
  );
  expect(byText(container, "作用在两个物体上")).toBeUndefined();

  // 去掉「应用」的 fold 标记：展开
  await map.update(newton.replace("- 应用 <!-- fold -->", "- 应用"));
  expect(byText(container, "超重与失重")).not.toBeUndefined();
});

test("行号随源文更新，onNodeClick 拿到新的行号", async () => {
  const onNodeClick = vi.fn();
  const { container, map } = await mount(newton, { onNodeClick });
  const el = byText(container, "牛顿第三定律")!;
  expect(el.dataset.line).toBe("17");
  await map.update(newton.replace("# 牛顿运动定律\n", "# 牛顿运动定律\n\n\n"));
  expect(byText(container, "牛顿第三定律")).toBe(el);
  expect(el.dataset.line).toBe("19");
  await userEvent.click(el);
  expect(onNodeClick).toHaveBeenCalledWith(
    expect.objectContaining({ line: 19 }),
  );
});

test("诊断随源文更新：出现、消失；onDiagnostics 再调用一次", async () => {
  const onDiagnostics = vi.fn();
  const { container, map } = await mount(newton, { onDiagnostics });
  await Promise.resolve();
  expect(container.querySelector(".mdmm-badge")).toBeNull();

  await map.update(
    newton.replace("law3 -->|对比| balance", "law3 -->|对比| nowhere"),
  );
  expect(container.querySelector(".mdmm-badge")!.textContent).toBe("⚠ 1");
  expect(map.diagnostics[0]!.code).toBe("REL_UNKNOWN_ID");

  await map.update(newton);
  expect(container.querySelector(".mdmm-badge")).toBeNull();
  expect(onDiagnostics).toHaveBeenCalledTimes(3);
});

test("改成一个节点都没有，再改回来", async () => {
  const { container, map } = await mount(newton);
  await map.update("只有文字。");
  expect(container.querySelectorAll(".mdmm-nodes .mdmm-node")).toHaveLength(0);
  expect(container.querySelector(".mdmm-problems-full")).not.toBeNull();
  await map.update(newton);
  expect(container.querySelector(".mdmm-problems-full")).toBeNull();
  expect(byText(container, "牛顿第二定律")).not.toBeUndefined();
});

test("revealLine：把远处的节点移进视野并高亮，缩放不变", async () => {
  const lines = ["# 很大的图"];
  for (let i = 0; i < 40; i++) lines.push(`- 节点 ${i}`, `  - 子节点 ${i}`);
  const { container, map } = await mount(lines.join("\n"));
  const scale = scaleOf(container);
  const target = byText(container, "子节点 39")!;
  const view = container
    .querySelector(".mdmm-viewport")!
    .getBoundingClientRect();
  expect(target.getBoundingClientRect().top).toBeGreaterThan(view.bottom);

  await map.revealLine(lines.indexOf("  - 子节点 39") + 1);
  const r = target.getBoundingClientRect();
  expect(r.top).toBeGreaterThanOrEqual(view.top);
  expect(r.bottom).toBeLessThanOrEqual(view.bottom);
  expect(target.classList).toContain("mdmm-flash");
  expect(scaleOf(container)).toBe(scale);
});

test("revealLine：已经在视野里时不平移；折叠里的节点取最近的可见祖先", async () => {
  const { container, map } = await mount(newton);
  const tx = container
    .querySelector<HTMLElement>(".mdmm-stage")!
    .style.getPropertyValue("--mdmm-tx");
  // 「超重与失重」（第 25 行）在默认折叠的「应用」（第 23 行）下面
  await map.revealLine(25);
  expect(byText(container, "应用")!.classList).toContain("mdmm-flash");
  expect(
    container
      .querySelector<HTMLElement>(".mdmm-stage")!
      .style.getPropertyValue("--mdmm-tx"),
  ).toBe(tx);
});

test("容器还没挂进页面时先等着，挂上后再测量", async () => {
  const container = document.createElement("div");
  container.style.width = "900px";
  container.style.height = "600px";
  const map = render(container, newton, { math });
  mounted.push({ container, map });
  await new Promise((resolve) => setTimeout(resolve, 50));
  document.body.append(container);
  await map.ready;
  const el = byText(container, "牛顿第二定律")!;
  expect(el.getBoundingClientRect().width).toBeGreaterThan(40);
});

test('revealLine({ flash: "moved" })：节点已在视野里时不高亮', async () => {
  const { container, map } = await mount(newton);
  await map.revealLine(6, { flash: "moved" });
  expect(byText(container, "牛顿第二定律")!.classList).not.toContain(
    "mdmm-flash",
  );
});
