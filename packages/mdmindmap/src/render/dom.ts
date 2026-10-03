// 创建元素都通过容器所在的 document（Obsidian 的弹出窗口里不是全局 document）。

const SVG_NS = "http://www.w3.org/2000/svg";

export function html<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const el = doc.createElement(tag);
  if (className) el.className = className;
  return el;
}

export function svg<K extends keyof SVGElementTagNameMap>(
  doc: Document,
  tag: K,
  className?: string,
): SVGElementTagNameMap[K] {
  const el = doc.createElementNS(SVG_NS, tag);
  if (className) el.setAttribute("class", className);
  return el;
}

/** 用 CSS 自定义属性传位置、尺寸等动态值；样式本身都在 style.css 里。 */
export function setVars(el: HTMLElement, vars: Record<string, string>): void {
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value);
  }
}

export const px = (n: number): string => `${Math.round(n * 100) / 100}px`;

/** 指针捕获失败（指针已经抬起、或不是真实指针）时不影响拖动本身。 */
export function capture(el: Element, pointerId: number): void {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // 忽略
  }
}

export function releaseCapture(el: Element, pointerId: number): void {
  try {
    el.releasePointerCapture(pointerId);
  } catch {
    // 忽略
  }
}
