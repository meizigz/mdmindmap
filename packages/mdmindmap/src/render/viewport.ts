// 视口：平移、缩放、轻点，以及「点击激活」（spec §8）。
// - click-to-activate：激活前不拦截滚轮和触摸，滚动交给页面；轻点一下导图才激活。
//   点导图外面、按 Esc、或导图可见部分不足 30% 时退出。
// - direct：始终可以操作。
// 激活后：滚轮缩放，拖动或单指平移，双指缩放。

import { capture, px, setVars } from "./dom";

export type Interaction = "click-to-activate" | "direct";

export interface View {
  x: number;
  y: number;
  scale: number;
}

export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;
/** 移动超过这个距离才算拖动，否则算轻点。 */
const TAP_SLOP = 4;
/** 触屏长按多久弹出节点菜单（spec §8）。 */
const LONG_PRESS_MS = 550;

export interface ViewportHandlers {
  /** 轻点（不是拖动，也不是用来激活的第一下）。 */
  tap(target: Element, event: PointerEvent): void;
  /** 右键或长按。返回 true 表示已处理（会阻止浏览器自己的菜单）。 */
  menu(target: Element, x: number, y: number): boolean;
}

/** 跨窗口安全地判断事件目标是不是元素（Obsidian 弹出窗口里 instanceof 不可靠）。 */
const asElement = (target: EventTarget | null): Element | null =>
  target && typeof (target as Element).closest === "function"
    ? (target as Element)
    : null;

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

export class Viewport {
  view: View = { x: 0, y: 0, scale: 1 };
  private active: boolean;
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private start: { x: number; y: number; wasActive: boolean } | null = null;
  private dragging = false;
  private pinch: { distance: number; scale: number } | null = null;
  /** 刚刚发生过拖动或激活：吞掉随后浏览器派发的 click（例如链接）。 */
  private swallowClick = false;
  private longPress: number | null = null;
  /** 长按弹出菜单的时间：安卓随后还会派发系统的 contextmenu，要忽略，免得弹两次。 */
  private longPressAt = 0;
  private suppressTap = false;
  private readonly win: Window | null;
  private readonly observer: IntersectionObserver | null;
  private readonly cleanups: (() => void)[] = [];

  constructor(
    private readonly host: HTMLElement,
    private readonly surface: HTMLElement,
    private readonly stage: HTMLElement,
    private readonly interaction: Interaction,
    private readonly handlers: ViewportHandlers,
  ) {
    this.active = interaction === "direct";
    this.syncActiveClass();

    const doc = host.ownerDocument;
    const win = doc.defaultView;
    this.win = win;
    this.listen(surface, "pointerdown", (e) => this.down(e));
    this.listen(surface, "pointermove", (e) => this.move(e));
    this.listen(surface, "pointerup", (e) => this.up(e));
    this.listen(surface, "pointercancel", (e) => this.cancel(e));
    this.listen(surface, "wheel", (e) => this.wheel(e), { passive: false });
    this.listen(surface, "contextmenu", (e) => this.contextMenu(e));
    this.listen(
      surface,
      "click",
      (e) => {
        if (this.swallowClick) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.swallowClick = false;
      },
      { capture: true },
    );

    if (interaction === "click-to-activate") {
      this.listen(
        doc,
        "pointerdown",
        (e) => {
          if (!host.contains(e.target as Element | null)) this.setActive(false);
        },
        { capture: true },
      );
      this.listen(doc, "keydown", (e) => {
        if (e.key === "Escape") this.setActive(false);
      });
    }

    const Observer = win?.IntersectionObserver;
    this.observer =
      interaction === "click-to-activate" && Observer
        ? new Observer(
            (entries) => {
              for (const entry of entries) {
                if (entry.intersectionRatio < 0.3) this.setActive(false);
              }
            },
            { threshold: [0, 0.3] },
          )
        : null;
    this.observer?.observe(host);
  }

  get isActive(): boolean {
    return this.active;
  }

  get width(): number {
    return this.surface.clientWidth;
  }

  get height(): number {
    return this.surface.clientHeight;
  }

  setActive(active: boolean): void {
    if (this.interaction === "direct" || this.active === active) return;
    this.active = active;
    this.pointers.clear();
    this.start = null;
    this.dragging = false;
    this.pinch = null;
    this.syncActiveClass();
  }

  set(view: View): void {
    this.view = { ...view, scale: clampScale(view.scale) };
    setVars(this.stage, {
      "--mdmm-tx": px(this.view.x),
      "--mdmm-ty": px(this.view.y),
      "--mdmm-scale": String(Math.round(this.view.scale * 1e4) / 1e4),
    });
  }

  /** 以视口内的点 (x, y) 为中心缩放。 */
  zoomAt(x: number, y: number, factor: number): void {
    const { view } = this;
    const scale = clampScale(view.scale * factor);
    const k = scale / view.scale;
    this.set({ x: x - (x - view.x) * k, y: y - (y - view.y) * k, scale });
  }

  panBy(dx: number, dy: number): void {
    this.set({ ...this.view, x: this.view.x + dx, y: this.view.y + dy });
  }

  destroy(): void {
    this.cancelLongPress();
    for (const cleanup of this.cleanups) cleanup();
    this.observer?.disconnect();
  }

  private listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement | Document,
    type: K,
    handler: (e: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void {
    const listener = handler as EventListener;
    target.addEventListener(type, listener, options);
    this.cleanups.push(() =>
      target.removeEventListener(type, listener, options),
    );
  }

  private syncActiveClass(): void {
    this.host.classList.toggle("mdmm-active", this.active);
  }

  private local(e: { clientX: number; clientY: number }) {
    const rect = this.surface.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private down(e: PointerEvent): void {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (this.pointers.size === 0) {
      this.start = { x: e.clientX, y: e.clientY, wasActive: this.active };
      this.dragging = false;
    }
    if (!this.active) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1 && e.pointerType !== "mouse") {
      const target = asElement(e.target);
      const { clientX, clientY } = e;
      this.cancelLongPress();
      this.longPress =
        this.win?.setTimeout(() => {
          this.longPress = null;
          if (target && this.handlers.menu(target, clientX, clientY)) {
            this.longPressAt = Date.now();
            this.suppressTap = true;
          }
        }, LONG_PRESS_MS) ?? null;
    } else {
      this.cancelLongPress();
    }
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      this.pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: this.view.scale,
      };
      this.dragging = true;
    }
  }

  private move(e: PointerEvent): void {
    if (!this.active) return;
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const current = { x: e.clientX, y: e.clientY };
    this.pointers.set(e.pointerId, current);

    if (this.pointers.size >= 2 && this.pinch) {
      const [a, b] = [...this.pointers.values()] as [
        { x: number; y: number },
        { x: number; y: number },
      ];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = this.local({
        clientX: (a.x + b.x) / 2,
        clientY: (a.y + b.y) / 2,
      });
      const target = this.pinch.scale * (distance / this.pinch.distance);
      this.zoomAt(mid.x, mid.y, target / this.view.scale);
      this.panBy((current.x - prev.x) / 2, (current.y - prev.y) / 2);
      return;
    }

    if (!this.dragging && this.start) {
      const moved = Math.hypot(
        e.clientX - this.start.x,
        e.clientY - this.start.y,
      );
      if (moved < TAP_SLOP) return;
      this.cancelLongPress();
      this.dragging = true;
      capture(this.surface, e.pointerId);
    }
    if (this.dragging) this.panBy(current.x - prev.x, current.y - prev.y);
  }

  private up(e: PointerEvent): void {
    this.cancelLongPress();
    const start = this.start;
    const wasDragging = this.dragging;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (this.pointers.size > 0) return;
    this.start = null;
    this.dragging = false;
    if (!start) return;

    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (this.suppressTap) {
      // 长按已经弹出了菜单，抬起时不再算一次轻点。
      this.suppressTap = false;
      this.swallowClick = true;
      return;
    }
    if (wasDragging || moved >= TAP_SLOP) {
      this.swallowClick = true;
      return;
    }
    if (!start.wasActive) {
      // 第一下只负责激活，不触发节点上的操作。
      if (this.interaction === "click-to-activate") {
        this.setActive(true);
        this.swallowClick = true;
      }
      return;
    }
    const target = asElement(e.target);
    if (target) this.handlers.tap(target, e);
  }

  private cancel(e: PointerEvent): void {
    this.cancelLongPress();
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.start = null;
      this.dragging = false;
      this.pinch = null;
    }
  }

  private cancelLongPress(): void {
    if (this.longPress !== null) this.win?.clearTimeout(this.longPress);
    this.longPress = null;
  }

  private contextMenu(e: MouseEvent): void {
    if (Date.now() - this.longPressAt < 1000) {
      e.preventDefault();
      return;
    }
    const target = asElement(e.target);
    if (
      this.active &&
      target &&
      this.handlers.menu(target, e.clientX, e.clientY)
    ) {
      e.preventDefault();
    }
  }

  private wheel(e: WheelEvent): void {
    if (!this.active) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.height : 1;
    // 触控板双指捏合会以 ctrlKey + wheel 的形式到达，灵敏度要高一些。
    const speed = e.ctrlKey ? 0.01 : 0.0015;
    const p = this.local(e);
    this.zoomAt(p.x, p.y, Math.exp(-e.deltaY * unit * speed));
  }
}
