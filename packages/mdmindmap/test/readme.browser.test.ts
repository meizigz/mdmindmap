// README 里的示例（渲染、解析、CSS 代码片段）原样能跑（「README 与使用文档」验收）。
import { afterEach, expect, test } from "vitest";
import "katex/dist/katex.min.css";
import { render, type MindMap } from "mdmindmap";
import { katexMath } from "mdmindmap/katex";
import { parse } from "mdmindmap/parse";
import "../src/style.css";

const source = `# Newton's laws
- First law ^law1
  - Inertia
- Second law 🔴 ^law2
  - { $F=ma$
  - $a$ follows the net force
  - } Quantitative relation

%%
law1 -.->|special case| law2
%%`;

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

async function mountReadmeExample(): Promise<{
  el: HTMLElement;
  map: MindMap;
}> {
  const el = document.createElement("div");
  el.id = "map";
  el.style.height = "500px";
  document.body.append(el);
  // —— README 示例开始 ——
  const map = render(document.getElementById("map")!, source, {
    math: katexMath(),
  });
  await map.ready;
  // —— README 示例结束 ——
  cleanups.push(() => {
    map.destroy();
    el.remove();
  });
  return { el, map };
}

/** 把 rgb(…) 和 color(srgb …) 统一成 0–255 的三元组。 */
function toRgb(color: string): number[] {
  const nums = (color.match(/[\d.]+/g) ?? []).map(Number);
  return color.startsWith("color(")
    ? nums.slice(0, 3).map((n) => Math.round(n * 255))
    : nums.slice(0, 3);
}

function snippet(css: string): void {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  cleanups.push(() => style.remove());
}

test("渲染示例：节点、概要、联系和公式都画出来，没有诊断", async () => {
  const { el, map } = await mountReadmeExample();
  expect(map.diagnostics).toEqual([]);
  expect(el.querySelectorAll(".mdmm-nodes .mdmm-node").length).toBe(7);
  expect(el.querySelector(".mdmm-brace")).not.toBeNull();
  expect(el.querySelector(".mdmm-relation-label")!.textContent).toBe(
    "special case",
  );
  expect(el.querySelector(".katex")).not.toBeNull();
});

test("解析示例：不需要 DOM 也能拿到树、联系和诊断", () => {
  const { root, relationships, diagnostics } = parse(source);
  expect(root!.text).toBe("Newton's laws");
  expect(relationships).toHaveLength(1);
  expect(diagnostics).toEqual([]);
});

test("代码片段：实心红色节点", async () => {
  snippet(`.mdmm-node[data-color="red"] {
  --mdmm-color-fill-amount: 100%;
  color: white;
}`);
  const { el } = await mountReadmeExample();
  const red = el.querySelector<HTMLElement>(
    '.mdmm-nodes .mdmm-node[data-color="red"]',
  )!;
  const style = getComputedStyle(red);
  expect(style.color).toBe("rgb(255, 255, 255)");
  // 背景就是红色本身（不再混进背景色）
  const probe = document.createElement("div");
  probe.style.color = getComputedStyle(
    el.querySelector(".mdmm")!,
  ).getPropertyValue("--mdmm-red");
  document.body.append(probe);
  const expected = getComputedStyle(probe).color;
  probe.remove();
  expect(toRgb(style.backgroundColor)).toEqual(toRgb(expected));
});

test("代码片段：节点更宽一些再折行", async () => {
  snippet(".mdmm { --mdmm-node-max-width: 320px; }");
  const { el } = await mountReadmeExample();
  const max = getComputedStyle(el.querySelector(".mdmm")!).getPropertyValue(
    "--mdmm-node-max-width",
  );
  expect(max.trim()).toBe("320px");
});

test("代码片段：联系线换颜色", async () => {
  snippet(".mdmm { --mdmm-relation: rgb(255, 128, 0); }");
  const { el } = await mountReadmeExample();
  expect(getComputedStyle(el.querySelector(".mdmm-relation")!).stroke).toBe(
    "rgb(255, 128, 0)",
  );
});
