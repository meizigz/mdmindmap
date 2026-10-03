// 导出 SVG 与 PNG（spec §10）。
import { afterEach, expect, test } from "vitest";
import "katex/dist/katex.min.css";
import {
  render,
  type MathRenderer,
  type MindMap,
  type RenderOptions,
} from "mdmindmap";
import { katexMath } from "mdmindmap/katex";
import "../src/style.css";
import newton from "./fixtures/spec/newton.md?raw";

const plainMath: MathRenderer = {
  render(tex) {
    const span = document.createElement("span");
    span.textContent = tex;
    return span;
  },
};

const mounted: { container: HTMLElement; map: MindMap }[] = [];
const extraStyles: HTMLStyleElement[] = [];
afterEach(() => {
  for (const { container, map } of mounted.splice(0)) {
    map.destroy();
    container.remove();
  }
  for (const s of extraStyles.splice(0)) s.remove();
});

async function mount(
  source: string,
  options: Partial<RenderOptions> = {},
  hostClass = "",
) {
  const container = document.createElement("div");
  container.className = hostClass;
  container.style.width = "900px";
  container.style.height = "600px";
  document.body.append(container);
  const map = render(container, source, { math: plainMath, ...options });
  mounted.push({ container, map });
  await map.ready;
  return { container, map };
}

/** 模拟宿主（例如 Obsidian）在外层用自己的规则改变量：导出的图离开页面后这条规则就不存在了。 */
function hostTheme(css: string) {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);
  extraStyles.push(style);
}

async function decode(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  return {
    width: bitmap.width,
    height: bitmap.height,
    pixel: (x: number, y: number) => [...ctx.getImageData(x, y, 1, 1).data],
  };
}

test("SVG：整张图、节点和连线都在，变量写成实际值", async () => {
  hostTheme(
    ".host-a .mdmm { --mdmm-bg: rgb(10, 20, 30); --mdmm-red: rgb(0, 200, 0); }",
  );
  const { map } = await mount(newton, {}, "host-a");
  const svg = await map.exportSvg();
  expect(svg.startsWith("<svg")).toBe(true);
  expect(svg).toContain("<foreignObject");
  expect(svg).toContain("牛顿第二定律");
  expect(svg).toContain("mdmm-relation");
  expect(svg).toContain("--mdmm-bg: rgb(10, 20, 30);");
  expect(svg).toContain("--mdmm-red: rgb(0, 200, 0);");
  expect(svg).toContain('fill="rgb(10, 20, 30)"');
  // 视口的平移缩放不带进导出
  expect(svg).toContain("--mdmm-scale: 1");

  // 解析成合法的 XML
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  expect(parsed.querySelector("parsererror")).toBeNull();
});

test("SVG 放进 <img> 单独打开时颜色正确（宿主的规则已经不在了）", async () => {
  hostTheme(".host-b .mdmm { --mdmm-bg: rgb(10, 20, 30); }");
  const { map } = await mount(newton, {}, "host-b");
  const svg = await map.exportSvg();
  const img = document.createElement("img");
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  expect([...ctx.getImageData(2, 2, 1, 1).data]).toEqual([10, 20, 30, 255]);
});

test("PNG：默认 2 倍，背景是当前主题的背景色，折叠的分支不导出", async () => {
  hostTheme(".host-c .mdmm { --mdmm-bg: rgb(250, 240, 230); }");
  const { map } = await mount(newton, {}, "host-c");
  const svg = await map.exportSvg();
  const width = Number(/width="(\d+)"/.exec(svg)![1]);
  const height = Number(/height="(\d+)"/.exec(svg)![1]);
  expect(svg).not.toContain("超重与失重");

  const png = await map.exportPng();
  expect(png.type).toBe("image/png");
  const image = await decode(png);
  expect(image.width).toBe(width * 2);
  expect(image.height).toBe(height * 2);
  expect(image.pixel(3, 3)).toEqual([250, 240, 230, 255]);
  // 图里确实画了东西：中间某处不是纯背景色
  let drawn = false;
  for (let x = 0; x < image.width && !drawn; x += 7) {
    const [r, g, b] = image.pixel(x, Math.floor(image.height / 2));
    drawn = r !== 250 || g !== 240 || b !== 230;
  }
  expect(drawn).toBe(true);
});

test("PNG：长边超过上限时整体缩小", async () => {
  const { map } = await mount(newton);
  const image = await decode(await map.exportPng({ scale: 4, maxSide: 500 }));
  expect(Math.max(image.width, image.height)).toBe(500);
});

test("KaTeX：导出的 SVG 内联了公式字体", async () => {
  const { map } = await mount(newton, { math: katexMath() });
  const svg = await map.exportSvg();
  expect(svg).toContain("katex");
  expect(svg).toContain("data:font/woff2;base64,");
});

test("暗色主题按当前看到的样子导出", async () => {
  const { container, map } = await mount(newton);
  container.querySelector(".mdmm")!.setAttribute("data-mdmm-theme", "dark");
  const svg = await map.exportSvg();
  expect(svg).toContain("--mdmm-bg: #1e1e1e;");
  expect(svg).toContain('fill="#1e1e1e"');
});
