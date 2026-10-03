// 渲染流水线（spec §7）：用 DOM API 构造节点内容 → 离屏测量 → 排版 → 定位 HTML 节点 → 画 SVG 连线层。
// 折叠、展开时只测量新出现的节点，复用已有元素和尺寸。

import { parse, type Diagnostic, type Node, type Relationship } from "../parse";
import {
  layoutTree,
  type Box,
  type Layout,
  type LayoutResult,
  type Size,
} from "../layout";
import { appendInline, type MathRenderer } from "./content";
import { capture, html, px, releaseCapture, setVars, svg } from "./dom";
import { drawEdges } from "./draw";
import { exportPng, exportSvg, type PngOptions } from "./export";
import { drawRelationships } from "./relations";
import { MIN_SCALE, Viewport, type Interaction } from "./viewport";

export type { MathRenderer } from "./content";
export type { Layout } from "../layout";
export type { Interaction } from "./viewport";
export type { PngOptions } from "./export";

export interface RenderOptions {
  /** 默认 "logic"。 */
  layout?: Layout;
  /** 整篇模式。 */
  document?: { title: string };
  math: MathRenderer;
  /**
   * 默认：给了 height（嵌在页面或笔记里）时为 "click-to-activate"，否则为 "direct"。
   */
  interaction?: Interaction;
  /**
   * 不给时导图占满容器的高度。给了数字就用这个高度（px）；"auto" 按可见叶子数估算。
   * 给了 height 时，拖动导图底边可以调整高度（不写回源文）。
   */
  height?: number | "auto";
  /** 轻点节点。node.line 是节点在源文中的行号（用文件名作的根为 0）。 */
  onNodeClick?: (node: Node) => void;
  /** 轻点双链。没传时双链只显示样式、不可点击。外部链接总是在新窗口打开。 */
  onLinkClick?: (target: string, event: PointerEvent) => void;
  /** 右键或长按节点（触屏 550 ms）。菜单由宿主弹出；position 是视口坐标（clientX/Y）。 */
  onNodeMenu?: (node: Node, position: { x: number; y: number }) => void;
  /** 解析完成后调用一次（在 render() 返回之后）。 */
  onDiagnostics?: (diagnostics: readonly Diagnostic[]) => void;
  /** 在问题列表里点某一条。没传时列表只用来看。 */
  onDiagnosticClick?: (diagnostic: Diagnostic) => void;
}

export interface RevealOptions {
  /** "always"（默认）：总是高亮；"moved"：只有真的平移了才高亮（跟随编辑时用，免得每敲一个字都闪）。 */
  flash?: "always" | "moved";
}

export interface MindMap {
  /** 字体加载完、首次画完时完成。 */
  readonly ready: Promise<void>;
  readonly diagnostics: readonly Diagnostic[];
  /** 缩放并居中，让整张图都在视口里（最大 100%）。 */
  fit(): void;
  /**
   * 按新的源文增量更新：路径和文字都没变的节点复用元素和尺寸；折叠状态按节点路径保留；
   * 以更新前离视口中心最近的节点为锚点对齐视口，缩放不变。
   */
  update(source: string): Promise<void>;
  /** 折叠所有深度 ≥ depth 的节点（默认 1：只留根和一级分支）。 */
  collapseAll(depth?: number): Promise<void>;
  /** 导出整张图（按当前折叠状态和主题）为 SVG 字符串。节点以 foreignObject 内嵌 HTML。 */
  exportSvg(): Promise<string>;
  /** 导出为 PNG。默认 2 倍，长边上限 16000 px。 */
  exportPng(options?: PngOptions): Promise<Blob>;
  /** 切换结构，保留折叠状态，然后 fit。 */
  setLayout(layout: Layout): Promise<void>;
  /**
   * 把源文第 line 行（从 1 开始）对应的节点移进视野并短暂高亮：只做最小的平移，缩放不变。
   * 这一行不是节点行时（续行等）取它上方最近的节点；节点被折叠时取最近的可见祖先。
   */
  revealLine(line: number, options?: RevealOptions): Promise<void>;
  destroy(): void;
}

const PADDING = 24;
/** 首次显示时最小的缩放：再小就看不清字了。 */
const INITIAL_MIN_SCALE = 0.6;
/** 自动高度 = 可见叶子数 × 26 + 40，限制在 220–600 px（spec §8）。 */
const AUTO_HEIGHT = { perLeaf: 26, base: 40, min: 220, max: 600 };
const MIN_HEIGHT = 120;
/** 身份路径里分隔各层文字的字符（不会出现在节点文字里）。 */
const KEY_SEPARATOR = "\u0000";

interface NodeInfo {
  depth: number;
  summary: boolean;
}

class Instance implements MindMap {
  readonly ready: Promise<void>;
  diagnostics: Diagnostic[] = [];

  private readonly doc: Document;
  private readonly el: HTMLDivElement;
  private readonly stage: HTMLDivElement;
  private readonly edges: SVGSVGElement;
  private readonly nodes: HTMLDivElement;
  private readonly measure: HTMLDivElement;
  private readonly viewport: Viewport;
  private readonly info = new Map<Node, NodeInfo>();
  private readonly collapsed = new Set<Node>();
  private readonly elements = new Map<Node, HTMLElement>();
  private readonly toggles = new Map<Node, HTMLElement>();
  private readonly toggleNode = new WeakMap<Element, Node>();
  private readonly elementNode = new WeakMap<Element, Node>();
  private readonly sizes = new Map<Node, Size>();
  /** 节点身份：从根到它的文字路径（spec §6）。 */
  private readonly keys = new Map<Node, string>();
  private readonly byKey = new Map<string, Node>();
  private readonly parents = new Map<Node, Node>();
  private diagnosticEls: HTMLElement[] = [];
  private readonly cleanups: (() => void)[] = [];
  private destroyed = false;
  private root: Node | null = null;
  private relationships: Relationship[] = [];
  private layoutResult: LayoutResult | null = null;
  /** 刷新排队执行，避免连续折叠时测量交错。 */
  private queue: Promise<void> = Promise.resolve();

  constructor(
    container: HTMLElement,
    source: string,
    private readonly options: RenderOptions,
  ) {
    this.doc = container.ownerDocument;
    this.layout = options.layout ?? "logic";
    this.el = html(this.doc, "div", "mdmm");
    const surface = html(this.doc, "div", "mdmm-viewport");
    this.stage = html(this.doc, "div", "mdmm-stage");
    this.edges = svg(this.doc, "svg", "mdmm-edges");
    this.nodes = html(this.doc, "div", "mdmm-nodes");
    this.measure = html(this.doc, "div", "mdmm-measure");
    this.stage.append(this.edges, this.nodes);
    surface.append(this.stage);
    this.el.append(surface, this.measure);
    // 拖动节点文字时浏览器会启动原生拖放，打断平移（spec §7 第 4 条）。
    const preventDrag = (e: Event) => e.preventDefault();
    this.el.addEventListener("dragstart", preventDrag);
    this.cleanups.push(() =>
      this.el.removeEventListener("dragstart", preventDrag),
    );

    const result = parse(
      source,
      options.document ? { document: options.document } : {},
    );
    this.diagnostics = result.diagnostics;
    this.root = result.root;
    this.relationships = result.relationships;
    if (this.root) this.indexTree(this.root);

    const interaction =
      options.interaction ??
      (options.height !== undefined ? "click-to-activate" : "direct");
    this.el.dataset.interaction = interaction;
    this.viewport = new Viewport(this.el, surface, this.stage, interaction, {
      tap: (target, event) => this.tap(target, event),
      menu: (target, x, y) => this.menu(target, x, y),
    });
    if (options.onLinkClick) this.el.dataset.links = "";
    this.showDiagnostics();
    const { onDiagnostics } = options;
    if (onDiagnostics) queueMicrotask(() => onDiagnostics(this.diagnostics));
    if (options.height !== undefined) this.setupHeight(options.height);

    container.append(this.el);
    this.ready = this.enqueue(() => this.refresh({ initial: true }));
  }

  fit(): void {
    const result = this.layoutResult;
    if (!result) return;
    const { left, top, right, bottom } = result.bounds;
    const w = right - left;
    const h = bottom - top;
    const vw = this.viewport.width;
    const vh = this.viewport.height;
    const scale = Math.max(MIN_SCALE, this.fitScale());
    this.viewport.set({
      x: (vw - w * scale) / 2 - left * scale,
      y: (vh - h * scale) / 2 - top * scale,
      scale,
    });
  }

  /** 整张图放进视口所需的缩放（最大 100%）。 */
  private fitScale(): number {
    const result = this.layoutResult;
    if (!result) return 1;
    const { left, top, right, bottom } = result.bounds;
    return Math.min(
      1,
      (this.viewport.width - 2 * PADDING) / (right - left),
      (this.viewport.height - 2 * PADDING) / (bottom - top),
    );
  }

  /**
   * 首次显示：能以不小于 60% 的缩放放下整张图就 fit；否则按 60% 显示，
   * 根节点靠左（bilateral 时居中）、上下居中，和 XMind 打开时从根节点看起一样。
   */
  private initialView(): void {
    const rootBox = this.root && this.layoutResult?.boxes.get(this.root);
    if (!rootBox || this.fitScale() >= INITIAL_MIN_SCALE) {
      this.fit();
      return;
    }
    const scale = INITIAL_MIN_SCALE;
    const vw = this.viewport.width;
    const vh = this.viewport.height;
    const cx = rootBox.x + rootBox.width / 2;
    const cy = rootBox.y + rootBox.height / 2;
    this.viewport.set({
      x:
        this.layout === "bilateral"
          ? vw / 2 - cx * scale
          : PADDING - rootBox.x * scale,
      y: vh / 2 - cy * scale,
      scale,
    });
  }

  collapseAll(depth = 1): Promise<void> {
    for (const [node, info] of this.info) {
      if (!hasChildren(node) || node === this.root) continue;
      if (info.depth >= depth) this.collapsed.add(node);
      else this.collapsed.delete(node);
    }
    return this.enqueue(async () => {
      await this.refresh({});
      this.fit();
    });
  }

  update(source: string): Promise<void> {
    const result = parse(
      source,
      this.options.document ? { document: this.options.document } : {},
    );
    return this.enqueue(async () => {
      if (this.destroyed) return;
      const anchor = this.centerNode();
      const hadLayout = this.layoutResult !== null;

      // 旧的元素和尺寸按「签名」留着，旧的折叠状态按路径留着。
      const reusable = new Map<string, { el: HTMLElement; size?: Size }>();
      for (const [node, el] of this.elements) {
        reusable.set(this.signature(node), { el, size: this.sizes.get(node) });
      }
      const previous = {
        collapsed: new Set(
          [...this.collapsed].map((n) => this.keys.get(n) ?? ""),
        ),
        fold: new Map([...this.keys].map(([n, key]) => [key, n.fold])),
      };

      this.info.clear();
      this.elements.clear();
      this.sizes.clear();
      this.toggles.clear();
      this.keys.clear();
      this.byKey.clear();
      this.parents.clear();
      this.collapsed.clear();
      this.diagnostics = result.diagnostics;
      this.root = result.root;
      this.relationships = result.relationships;
      this.showDiagnostics();
      this.options.onDiagnostics?.(this.diagnostics);

      if (!this.root) {
        this.layoutResult = null;
        this.nodes.replaceChildren();
        this.edges.replaceChildren();
        return;
      }
      this.indexTree(this.root, previous);
      for (const node of this.info.keys()) {
        const signature = this.signature(node);
        const hit = reusable.get(signature);
        if (!hit) continue;
        reusable.delete(signature);
        hit.el.dataset.line = String(node.line);
        this.elements.set(node, hit.el);
        this.elementNode.set(hit.el, node);
        if (hit.size) this.sizes.set(node, hit.size);
      }

      const node = anchor && this.byKey.get(anchor.key);
      await this.refresh({
        initial: !hadLayout,
        ...(node && anchor && { anchor: { node, before: anchor.box } }),
      });
    });
  }

  async exportSvg(): Promise<string> {
    return (await this.prepareExport()).svg;
  }

  async exportPng(options?: PngOptions): Promise<Blob> {
    return exportPng(this.doc, await this.prepareExport(), options);
  }

  private async prepareExport() {
    await this.queue;
    const result = this.layoutResult;
    if (!result) throw new Error("没有可导出的导图");
    const { math } = this.options;
    return exportSvg({
      host: this.el,
      stage: this.stage,
      result,
      ...(math.exportCss && {
        extraCss: async () => (await math.exportCss?.()) ?? "",
      }),
    });
  }

  revealLine(line: number, options: RevealOptions = {}): Promise<void> {
    return this.enqueue(async () => {
      const result = this.layoutResult;
      if (!result) return;
      let target: Node | undefined;
      for (const node of this.info.keys()) {
        if (node.line <= line && (!target || node.line > target.line)) {
          target = node;
        }
      }
      while (target && !result.boxes.has(target))
        target = this.parents.get(target);
      const box = target && result.boxes.get(target);
      if (!target || !box) return;

      const { x, y, scale } = this.viewport.view;
      const margin = PADDING;
      const left = box.x * scale + x;
      const top = box.y * scale + y;
      const right = left + box.width * scale;
      const bottom = top + box.height * scale;
      const vw = this.viewport.width;
      const vh = this.viewport.height;
      const shift = (start: number, end: number, size: number) =>
        start < margin || end - start > size - 2 * margin
          ? margin - start
          : end > size - margin
            ? size - margin - end
            : 0;
      const dx = shift(left, right, vw);
      const dy = shift(top, bottom, vh);
      const moved = dx !== 0 || dy !== 0;
      if (moved) this.viewport.panBy(dx, dy);

      const el = this.elements.get(target);
      if (el && (moved || options.flash !== "moved")) {
        el.classList.remove("mdmm-flash");
        void el.offsetWidth; // 重新触发动画
        el.classList.add("mdmm-flash");
      }
      await Promise.resolve();
    });
  }

  /** 等到导图挂进页面（或被销毁）。 */
  private async whenConnected(): Promise<void> {
    const win = this.doc.defaultView;
    while (!this.el.isConnected && !this.destroyed && win) {
      await new Promise<void>((resolve) =>
        win.requestAnimationFrame(() => resolve()),
      );
    }
  }

  destroy(): void {
    this.destroyed = true;
    for (const cleanup of this.cleanups) cleanup();
    this.viewport.destroy();
    this.el.remove();
  }

  private layout: Layout;

  setLayout(layout: Layout): Promise<void> {
    this.layout = layout;
    return this.enqueue(async () => {
      await this.refresh({});
      this.fit();
    });
  }

  private readonly underline = (node: Node): boolean => {
    const info = this.info.get(node);
    return (
      info !== undefined &&
      info.depth >= 2 &&
      !info.summary &&
      node.color === undefined
    );
  };

  private readonly isCollapsed = (node: Node): boolean =>
    this.collapsed.has(node);

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.queue = this.queue.then(task, task);
    return this.queue;
  }

  /**
   * 记下每个节点的层级、是不是概要、身份路径，并决定初始折叠状态：
   * 更新时沿用同一路径节点原来的折叠状态；源文里的 fold 标记增删过的，以源文为准。
   */
  private indexTree(
    root: Node,
    previous?: {
      collapsed: ReadonlySet<string>;
      fold: ReadonlyMap<string, boolean>;
    },
  ): void {
    const visit = (
      node: Node,
      depth: number,
      summary: boolean,
      key: string,
    ) => {
      this.info.set(node, { depth, summary });
      this.keys.set(node, key);
      this.byKey.set(key, node);
      const oldFold = previous?.fold.get(key);
      const folded =
        previous === undefined || oldFold === undefined || oldFold !== node.fold
          ? node.fold
          : previous.collapsed.has(key);
      if (folded && node !== root && hasChildren(node))
        this.collapsed.add(node);

      // 同一父节点下文字相同的兄弟按出现顺序编号。
      const seen = new Map<string, number>();
      const childKey = (kind: string, n: Node) => {
        const base = `${kind}${n.text}`;
        const index = seen.get(base) ?? 0;
        seen.set(base, index + 1);
        return `${key}${KEY_SEPARATOR}${base}#${index}`;
      };
      for (const child of node.children) {
        this.parents.set(child, node);
        visit(child, depth + 1, false, childKey("c:", child));
      }
      for (const s of node.summaries) {
        this.parents.set(s.node, node);
        visit(s.node, depth + 1, true, childKey("s:", s.node));
      }
    };
    visit(root, 0, false, root.text);
  }

  /** 元素和尺寸能否复用：路径相同（文字相同），而且影响外观的属性都相同。 */
  private signature(node: Node): string {
    const info = this.info.get(node);
    return [
      this.keys.get(node),
      node.color ?? "",
      info?.summary ? "s" : "",
      this.underline(node) ? "u" : "",
    ].join("|");
  }

  /** 离视口中心最近的节点（按盒子中心算）。 */
  private centerNode(): { key: string; box: Box } | null {
    const result = this.layoutResult;
    if (!result) return null;
    const { x, y, scale } = this.viewport.view;
    const cx = (this.viewport.width / 2 - x) / scale;
    const cy = (this.viewport.height / 2 - y) / scale;
    let best: { key: string; box: Box } | null = null;
    let bestDistance = Infinity;
    for (const [node, box] of result.boxes) {
      const key = this.keys.get(node);
      const d = Math.hypot(
        box.x + box.width / 2 - cx,
        box.y + box.height / 2 - cy,
      );
      if (key !== undefined && d < bestDistance) {
        best = { key, box };
        bestDistance = d;
      }
    }
    return best;
  }

  private visibleNodes(): Node[] {
    const list: Node[] = [];
    const visit = (node: Node) => {
      list.push(node);
      if (this.collapsed.has(node)) return;
      node.children.forEach(visit);
      node.summaries.forEach((s) => visit(s.node));
    };
    if (this.root) visit(this.root);
    return list;
  }

  /**
   * 重新排版并绘制。anchor：这个节点（左侧中点）在屏幕上的位置保持不变；
   * before 是它在上一次排版里的盒子。
   */
  private async refresh({
    initial,
    anchor,
  }: {
    initial?: boolean;
    anchor?: { node: Node; before: Box };
  }) {
    const root = this.root;
    if (!root || this.destroyed) return;
    const visible = this.visibleNodes();

    const fresh = visible.filter((node) => !this.sizes.has(node));
    for (const node of fresh) {
      if (!this.elements.has(node))
        this.elements.set(node, this.createNode(node));
    }
    if (fresh.length > 0) {
      // 宿主可能先给一个还没挂进页面的元素（Obsidian 的代码块）；没挂上时量出来都是 0。
      await this.whenConnected();
      if (this.destroyed) return;
      const els = fresh.map((node) => this.elements.get(node)!);
      this.measure.replaceChildren(...els);
      await this.doc.fonts.ready;
      await this.options.math.flush?.();
      if (this.destroyed) return;
      widenOverflowing(els);
      for (const node of fresh) {
        const rect = this.elements.get(node)!.getBoundingClientRect();
        this.sizes.set(node, {
          width: Math.ceil(rect.width),
          height: Math.ceil(rect.height),
        });
      }
      this.measure.replaceChildren();
    }

    const result = layoutTree({
      root,
      layout: this.layout,
      size: (node) => this.sizes.get(node) ?? { width: 0, height: 0 },
      underline: this.underline,
      collapsed: this.isCollapsed,
    });
    this.layoutResult = result;

    const layer: HTMLElement[] = [];
    for (const node of visible) {
      const el = this.elements.get(node)!;
      const box = result.boxes.get(node);
      if (!box) continue;
      setVars(el, {
        "--mdmm-x": px(box.x),
        "--mdmm-y": px(box.y),
        "--mdmm-w": px(box.width),
        "--mdmm-h": px(box.height),
      });
      layer.push(el);
      const toggle = this.toggleFor(node);
      if (toggle) {
        const right = !box.left;
        const y = this.underline(node)
          ? box.y + box.height
          : box.y + box.height / 2;
        setVars(toggle, {
          "--mdmm-x": px(right ? box.x + box.width : box.x),
          "--mdmm-y": px(y),
        });
        const folded = this.collapsed.has(node);
        toggle.dataset.side = right ? "right" : "left";
        toggle.setAttribute("aria-expanded", String(!folded));
        toggle.textContent = folded ? String(countDescendants(node)) : "";
        layer.push(toggle);
      }
    }
    this.nodes.replaceChildren(...layer);

    // 只收可见节点的ID：端点被折叠的联系不画。
    const byId = new Map<string, Node>();
    for (const node of visible) if (node.id) byId.set(node.id, node);
    drawEdges(
      this.doc,
      this.edges,
      result,
      { underline: this.underline, collapsed: this.isCollapsed },
      drawRelationships(this.doc, this.relationships, byId, result),
    );

    const after = anchor && result.boxes.get(anchor.node);
    if (anchor && after) {
      // 用左侧中点对齐：节点变宽变高时，用左上角对齐会漂移。
      const { before } = anchor;
      const { scale } = this.viewport.view;
      this.viewport.panBy(
        (before.x - after.x) * scale,
        (before.y + before.height / 2 - (after.y + after.height / 2)) * scale,
      );
    } else if (initial) {
      this.initialView();
    }
  }

  private createNode(node: Node): HTMLElement {
    const info = this.info.get(node) ?? { depth: 0, summary: false };
    const el = html(this.doc, "div", "mdmm-node");
    el.dataset.depth = String(info.depth);
    el.dataset.line = String(node.line);
    if (info.summary) el.dataset.summary = "";
    if (node.color) el.dataset.color = node.color;
    if (this.underline(node)) el.classList.add("mdmm-node-underline");
    appendInline(this.doc, el, node.inline, this.options.math);
    this.elementNode.set(el, node);
    return el;
  }

  /** 有子节点（或概要）的非根节点才有折叠按钮。 */
  private toggleFor(node: Node): HTMLElement | null {
    if (node === this.root || !hasChildren(node)) return null;
    let toggle = this.toggles.get(node);
    if (!toggle) {
      toggle = html(this.doc, "div", "mdmm-toggle");
      toggle.setAttribute("role", "button");
      toggle.dataset.line = String(node.line);
      this.toggles.set(node, toggle);
      this.toggleNode.set(toggle, node);
    }
    return toggle;
  }

  private tap(target: Element, event: PointerEvent): void {
    const toggle = target.closest(".mdmm-toggle");
    const toggled = toggle && this.toggleNode.get(toggle);
    if (toggled) {
      void this.toggle(toggled);
      return;
    }
    const wikilink = target.closest<HTMLElement>(".mdmm-wikilink");
    if (wikilink && this.options.onLinkClick) {
      this.options.onLinkClick(wikilink.dataset.target ?? "", event);
      return;
    }
    // 外部链接交给浏览器自己打开（新窗口）。
    if (target.closest(".mdmm-link")) return;
    const el = target.closest(".mdmm-node");
    const node = el && this.elementNode.get(el);
    if (node) this.options.onNodeClick?.(node);
  }

  private menu(target: Element, x: number, y: number): boolean {
    const el = target.closest(".mdmm-node");
    const node = el && this.elementNode.get(el);
    if (!node || !this.options.onNodeMenu) return false;
    this.options.onNodeMenu(node, { x, y });
    return true;
  }

  /**
   * 出错时尽量渲染（spec §5）：角落显示「⚠ N」（错误和警告的条数），点开列出问题；
   * 一个节点都没有时显示错误面板。提示（hint）只出现在列表里，不单独显示角标。
   */
  private showDiagnostics(): void {
    for (const el of this.diagnosticEls) el.remove();
    this.diagnosticEls = [];
    const list = this.diagnostics;
    const shown = list.filter((d) => d.severity !== "hint");
    if (this.root && shown.length === 0) return;

    const panel = html(this.doc, "div", "mdmm-problems");
    for (const d of list) {
      const item = html(this.doc, "div", "mdmm-problem");
      item.dataset.severity = d.severity;
      item.dataset.line = String(d.line);
      const where = html(this.doc, "span", "mdmm-problem-line");
      where.textContent = `第 ${d.line} 行`;
      const message = html(this.doc, "span", "mdmm-problem-message");
      message.textContent = d.message;
      item.append(where, message);
      if (d.fix) {
        const fix = html(this.doc, "div", "mdmm-problem-fix");
        fix.textContent = d.fix;
        item.append(fix);
      }
      const onClick = this.options.onDiagnosticClick;
      if (onClick) {
        item.setAttribute("role", "button");
        item.addEventListener("click", () => onClick(d));
      }
      panel.append(item);
    }

    if (!this.root) {
      panel.classList.add("mdmm-problems-full");
      this.el.append(panel);
      this.diagnosticEls = [panel];
      return;
    }

    const badge = html(this.doc, "div", "mdmm-badge");
    badge.setAttribute("role", "button");
    badge.dataset.severity = shown.some((d) => d.severity === "error")
      ? "error"
      : "warning";
    badge.textContent = `⚠ ${shown.length}`;
    badge.addEventListener("click", () =>
      this.el.classList.toggle("mdmm-problems-open"),
    );
    this.el.append(badge, panel);
    this.diagnosticEls = [badge, panel];
  }

  private toggle(node: Node): Promise<void> {
    if (this.collapsed.has(node)) this.collapsed.delete(node);
    else this.collapsed.add(node);
    return this.enqueue(() => {
      const before = this.layoutResult?.boxes.get(node);
      return this.refresh(before ? { anchor: { node, before } } : {});
    });
  }

  private setupHeight(height: number | "auto"): void {
    const initial = height === "auto" ? this.autoHeight() : height;
    this.el.classList.add("mdmm-sized");
    setVars(this.el, { "--mdmm-height": px(initial) });

    // 拖动底边调整高度
    const handle = html(this.doc, "div", "mdmm-resize");
    this.el.append(handle);
    let startY = 0;
    let startHeight = 0;
    const move = (e: PointerEvent) => {
      const next = Math.max(MIN_HEIGHT, startHeight + e.clientY - startY);
      setVars(this.el, { "--mdmm-height": px(next) });
    };
    const up = (e: PointerEvent) => {
      releaseCapture(handle, e.pointerId);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      startY = e.clientY;
      startHeight = this.el.getBoundingClientRect().height;
      capture(handle, e.pointerId);
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    };
    handle.addEventListener("pointerdown", down);
    this.cleanups.push(() => handle.removeEventListener("pointerdown", down));
  }

  /** 渲染前同步算好，避免页面跳动：折叠的分支不计入。 */
  private autoHeight(): number {
    let leaves = 0;
    for (const node of this.visibleNodes()) {
      const open = !this.collapsed.has(node);
      if (!open || !hasChildren(node)) leaves++;
    }
    const h = leaves * AUTO_HEIGHT.perLeaf + AUTO_HEIGHT.base;
    return Math.min(AUTO_HEIGHT.max, Math.max(AUTO_HEIGHT.min, h));
  }
}

export function render(
  container: HTMLElement,
  source: string,
  options: RenderOptions,
): MindMap {
  return new Instance(container, source, options);
}

const hasChildren = (node: Node) =>
  node.children.length > 0 || node.summaries.length > 0;

function countDescendants(node: Node): number {
  let n = 0;
  const visit = (x: Node) => {
    for (const child of x.children) {
      n++;
      visit(child);
    }
    for (const s of x.summaries) {
      n++;
      visit(s.node);
    }
  };
  visit(node);
  return n;
}

/**
 * 不能换行的宽内容（如长化学方程式）会撑出节点的最大宽度：按内容的实际宽度放宽这些节点。
 * 放宽后文字按新宽度重新折行，随后统一测量的高度就是放宽后的高度（spec §7 第 2 条）。
 */
function widenOverflowing(elements: Iterable<HTMLElement>): void {
  for (const el of elements) {
    for (
      let attempt = 0;
      attempt < 3 && el.scrollWidth > el.clientWidth + 1;
      attempt++
    ) {
      const style = el.ownerDocument.defaultView?.getComputedStyle(el);
      const padding = parseFloat(style?.paddingRight ?? "") || 0;
      el.classList.add("mdmm-wide");
      setVars(el, { "--mdmm-w": px(el.scrollWidth + padding + 1) });
    }
  }
}
