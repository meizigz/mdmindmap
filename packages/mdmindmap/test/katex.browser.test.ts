// mdmindmap/katex 和宽公式处理：用真实的 KaTeX 在浏览器里渲染。
import { afterEach, expect, test } from "vitest";
import "katex/dist/katex.min.css";
import { render, type MindMap } from "mdmindmap";
import { katexMath } from "mdmindmap/katex";
import "../src/style.css";

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
  const map = render(container, source, { math: katexMath() });
  mounted.push({ container, map });
  await map.ready;
  return container;
}

const node = (container: HTMLElement, line: number) =>
  container.querySelector<HTMLElement>(
    `.mdmm-nodes .mdmm-node[data-line="${line}"]`,
  )!;

test("分式和 mhchem 化学式渲染成 KaTeX", async () => {
  const container = await mount(
    "# 根\n- 动能 $\\frac{1}{2}mv^2$\n- 水 $\\ce{2H2 + O2 -> 2H2O}$\n",
  );
  expect(node(container, 2).querySelector(".katex .mfrac")).not.toBeNull();
  const water = node(container, 3);
  expect(water.querySelector(".katex")).not.toBeNull();
  expect(water.querySelector(".katex-error")).toBeNull();
});

test("写错的公式显示为出错的原文，导图照常画", async () => {
  const container = await mount("# 根\n- 坏公式 $\\frac{1}{$\n- 正常节点\n");
  expect(node(container, 2).querySelector(".katex-error")).not.toBeNull();
  expect(node(container, 3)).not.toBeNull();
});

test("长化学方程式：节点按内容放宽，不溢出", async () => {
  const equation =
    "$\\ce{2KMnO4 + 16HCl(浓) -> 2KCl + 2MnCl2 + 5Cl2 ^ + 8H2O}$";
  const container = await mount(
    `# 根\n- 实验室制氯气\n  - ${equation}\n  - 短节点\n`,
  );
  const wide = node(container, 3);
  expect(wide.offsetWidth).toBeGreaterThan(240);
  expect(wide.scrollWidth).toBeLessThanOrEqual(wide.clientWidth + 1);
  // 普通节点不受影响
  expect(node(container, 4).offsetWidth).toBeLessThan(240);
});

test("文字和宽公式混在一起：放宽后文字重新折行，高度按放宽后的结果", async () => {
  const text =
    "这是一段比较长的说明文字，会在最大宽度处折行，后面跟着一个很长的方程式";
  const equation = "$\\ce{C6H12O6 + 6O2 -> 6CO2 + 6H2O + 能量能量能量}$";
  const container = await mount(`# 根\n- 呼吸作用\n  - ${text} ${equation}\n`);
  const el = node(container, 3);
  expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth + 1);
  expect(el.scrollHeight).toBeLessThanOrEqual(el.clientHeight + 1);
});

test("exportCss：KaTeX 规则和内联成 woff2 的字体", async () => {
  await mount("# 根\n- $x^2$\n");
  const css = await katexMath().exportCss!();
  expect(css).toContain(".katex");
  expect(css).toMatch(/@font-face \{ font-family: "?KaTeX_Main"?/);
  expect(css).toContain("data:font/woff2;base64,");
  expect(css).not.toMatch(/url\(["']?[^"')]*fonts\//);
});
