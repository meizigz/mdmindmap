// 导出（spec §10）：整张图（按当前折叠状态）→ SVG（节点以 foreignObject 内嵌 HTML）→ PNG（画到 canvas）。
// 导出用当前看到的主题。所有 --mdmm-* 变量先算出实际值再写进导出的样式：Obsidian 的主题变量
// 定义在 body 上，不这样做，导出的图离开 Obsidian 就没有颜色。

import type { LayoutResult } from "../layout";
import { html, px, setVars } from "./dom";

const PADDING = 24;
const XHTML = "http://www.w3.org/1999/xhtml";
const SVG = "http://www.w3.org/2000/svg";
/** 只在单个元素上设置的变量（位置、尺寸、视口），不属于主题。 */
const PER_ELEMENT = new Set([
  "--mdmm-x",
  "--mdmm-y",
  "--mdmm-w",
  "--mdmm-h",
  "--mdmm-tx",
  "--mdmm-ty",
  "--mdmm-scale",
  "--mdmm-height",
  "--mdmm-c",
  "--mdmm-export-w",
  "--mdmm-export-h",
]);

export interface ExportInput {
  host: HTMLElement;
  stage: HTMLElement;
  result: LayoutResult;
  extraCss?: () => Promise<string>;
}

export interface SvgExport {
  svg: string;
  width: number;
  height: number;
  background: string;
}

/** 页面上已加载的、与导图有关的 CSS 规则（跨域且无 crossorigin 的样式表读不到，跳过）。 */
function collectCss(doc: Document): string {
  const rules: string[] = [];
  for (const sheet of Array.from(doc.styleSheets)) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(list)) {
      if (rule.cssText.includes("mdmm")) rules.push(rule.cssText);
    }
  }
  return rules.join("\n");
}

export async function exportSvg(input: ExportInput): Promise<SvgExport> {
  const { host, stage, result } = input;
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  if (!win) throw new Error("导图不在页面里，无法导出");

  const { left, top, right, bottom } = result.bounds;
  const width = Math.ceil(right - left + 2 * PADDING);
  const height = Math.ceil(bottom - top + 2 * PADDING);

  const css = collectCss(doc);
  const computed = win.getComputedStyle(host);
  const names = new Set(css.match(/--mdmm-[a-z0-9-]+/g) ?? []);
  const vars: string[] = [];
  for (const name of names) {
    if (PER_ELEMENT.has(name)) continue;
    const value = computed.getPropertyValue(name).trim();
    if (value) vars.push(`${name}: ${value};`);
  }
  const background = computed.getPropertyValue("--mdmm-bg").trim() || "#ffffff";
  // 选择器比 style.css 里的任何主题规则（含暗色、data-mdmm-theme）都更具体。
  const pinned = `.mdmm.mdmm-export[data-export] { ${vars.join(" ")} font-family: ${computed.fontFamily}; }`;
  const extra = input.extraCss ? await input.extraCss() : "";

  const wrapper = html(doc, "div", "mdmm mdmm-export");
  wrapper.setAttribute("xmlns", XHTML);
  wrapper.dataset.export = "";
  setVars(wrapper, {
    "--mdmm-export-w": px(width),
    "--mdmm-export-h": px(height),
  });
  const clone = stage.cloneNode(true) as HTMLElement;
  setVars(clone, {
    "--mdmm-tx": px(PADDING - left),
    "--mdmm-ty": px(PADDING - top),
    "--mdmm-scale": "1",
  });
  // 展开状态的折叠按钮平时就是隐藏的；折叠的数字留着，表示那里还有内容。
  for (const toggle of clone.querySelectorAll(
    '.mdmm-toggle[aria-expanded="true"]',
  )) {
    toggle.remove();
  }
  wrapper.append(clone);

  const serializer = new win.XMLSerializer();
  const body = serializer.serializeToString(wrapper);
  const style = escapeXml([css, pinned, extra].join("\n"));
  const svg =
    `<svg xmlns="${SVG}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<style>${style}</style>` +
    `<rect width="100%" height="100%" fill="${escapeXml(background)}"/>` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">${body}</foreignObject>` +
    `</svg>`;
  return { svg, width, height, background };
}

export interface PngOptions {
  /** 默认 2（高清）。 */
  scale?: number;
  /** 长边上限，默认 16000 px。超过时整体缩小。 */
  maxSide?: number;
}

export async function exportPng(
  doc: Document,
  { svg, width, height }: SvgExport,
  options: PngOptions = {},
): Promise<Blob> {
  const maxSide = options.maxSide ?? 16000;
  let scale = options.scale ?? 2;
  if (Math.max(width, height) * scale > maxSide) {
    scale = maxSide / Math.max(width, height);
  }

  const img = html(doc, "img");
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const canvas = html(doc, "canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法创建画布");
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("导出 PNG 失败"));
    }, "image/png");
  });
}

function escapeXml(text: string): string {
  return text.replace(/[<>&"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : "&quot;",
  );
}
