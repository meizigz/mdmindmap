// 节点回调、链接、节点菜单（右键 / 长按），以及诊断角标与问题列表。
import { afterEach, describe, expect, test, vi } from "vitest";
import { userEvent } from "vitest/browser";
import {
  render,
  type Diagnostic,
  type MathRenderer,
  type MindMap,
  type Node,
  type RenderOptions,
} from "mdmindmap";
import "../src/style.css";

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
  container.style.height = "500px";
  document.body.append(container);
  const map = render(container, source, { math, ...options });
  mounted.push({ container, map });
  await map.ready;
  return { container, map };
}

const node = (c: HTMLElement, line: number) =>
  c.querySelector<HTMLElement>(`.mdmm-nodes .mdmm-node[data-line="${line}"]`)!;

const SOURCE = `# 根
- 双链 [[连接体问题|连接体]] 和 [外链](https://example.com)
- 普通节点 ^plain
`;

describe("轻点", () => {
  test("节点：onNodeClick 拿到带行号的节点", async () => {
    const onNodeClick = vi.fn<(node: Node) => void>();
    const { container } = await mount(SOURCE, { onNodeClick });
    await userEvent.click(node(container, 3));
    expect(onNodeClick).toHaveBeenCalledTimes(1);
    expect(onNodeClick.mock.calls[0]![0]).toMatchObject({
      line: 3,
      id: "plain",
    });
  });

  test("双链：onLinkClick 拿到目标，不再触发 onNodeClick", async () => {
    const onNodeClick = vi.fn();
    const onLinkClick = vi.fn();
    const { container } = await mount(SOURCE, { onNodeClick, onLinkClick });
    expect(container.querySelector(".mdmm")!.hasAttribute("data-links")).toBe(
      true,
    );
    await userEvent.click(container.querySelector(".mdmm-wikilink")!);
    expect(onLinkClick).toHaveBeenCalledWith("连接体问题", expect.anything());
    expect(onNodeClick).not.toHaveBeenCalled();
  });

  test("没传 onLinkClick 时，点双链就是点节点", async () => {
    const onNodeClick = vi.fn();
    const { container } = await mount(SOURCE, { onNodeClick });
    expect(container.querySelector(".mdmm")!.hasAttribute("data-links")).toBe(
      false,
    );
    await userEvent.click(container.querySelector(".mdmm-wikilink")!);
    expect(onNodeClick).toHaveBeenCalledTimes(1);
  });

  test("外部链接在新窗口打开，不触发 onNodeClick", async () => {
    const onNodeClick = vi.fn();
    const { container } = await mount(SOURCE, { onNodeClick });
    const link = container.querySelector<HTMLAnchorElement>(".mdmm-link")!;
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noopener");
    // 不真的打开：拦下浏览器的默认行为
    link.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(link);
    expect(onNodeClick).not.toHaveBeenCalled();
  });
});

describe("节点菜单", () => {
  test("右键：onNodeMenu 拿到节点和位置，并阻止浏览器菜单", async () => {
    const onNodeMenu = vi.fn();
    const { container } = await mount(SOURCE, { onNodeMenu });
    const el = node(container, 3);
    const r = el.getBoundingClientRect();
    const e = new MouseEvent("contextmenu", {
      clientX: r.x + 5,
      clientY: r.y + 5,
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(onNodeMenu).toHaveBeenCalledWith(
      expect.objectContaining({ line: 3 }),
      {
        x: r.x + 5,
        y: r.y + 5,
      },
    );
  });

  test("没传 onNodeMenu 时不拦浏览器菜单", async () => {
    const { container } = await mount(SOURCE);
    const e = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    node(container, 3).dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  test("触屏长按 550 ms：菜单只弹一次，抬起时不算轻点", async () => {
    const onNodeMenu = vi.fn();
    const onNodeClick = vi.fn();
    const { container } = await mount(SOURCE, { onNodeMenu, onNodeClick });
    const el = node(container, 3);
    const r = el.getBoundingClientRect();
    const touch = (type: string) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId: 3,
          pointerType: "touch",
          clientX: r.x + 5,
          clientY: r.y + 5,
          bubbles: true,
        }),
      );
    touch("pointerdown");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(onNodeMenu).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(onNodeMenu).toHaveBeenCalledTimes(1);
    // 安卓随后还会派发系统的 contextmenu
    const e = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(onNodeMenu).toHaveBeenCalledTimes(1);
    touch("pointerup");
    expect(onNodeClick).not.toHaveBeenCalled();
  });
});

describe("诊断", () => {
  const BROKEN = `# 根
- 甲 ^a
- 乙 ^a
- 丙 ^c 🔴

%%
a --> nowhere
%%
`;

  test("角标显示错误和警告的条数，点开列出问题，点某一条回调", async () => {
    const onDiagnosticClick = vi.fn<(d: Diagnostic) => void>();
    const { container, map } = await mount(BROKEN, { onDiagnosticClick });
    const badge = container.querySelector<HTMLElement>(".mdmm-badge")!;
    expect(badge.textContent).toBe("⚠ 2");
    expect(badge.dataset.severity).toBe("error");
    expect(map.diagnostics.map((d) => d.code)).toEqual([
      "ID_DUP",
      "REL_UNKNOWN_ID",
    ]);

    const panel = container.querySelector<HTMLElement>(".mdmm-problems")!;
    expect(getComputedStyle(panel).display).toBe("none");
    await userEvent.click(badge);
    expect(getComputedStyle(panel).display).toBe("block");
    const items = panel.querySelectorAll<HTMLElement>(".mdmm-problem");
    expect([...items].map((i) => i.dataset.line)).toEqual(["3", "7"]);
    await userEvent.click(items[1]!);
    expect(onDiagnosticClick).toHaveBeenCalledWith(
      expect.objectContaining({ code: "REL_UNKNOWN_ID", line: 7 }),
    );
  });

  test("onDiagnostics 在 render() 返回之后调用一次", async () => {
    const calls: number[] = [];
    let returned = false;
    const container = document.createElement("div");
    document.body.append(container);
    const map = render(container, BROKEN, {
      math,
      onDiagnostics: (d) => calls.push(returned ? d.length : -1),
    });
    returned = true;
    mounted.push({ container, map });
    await map.ready;
    expect(calls).toEqual([2]);
  });

  test("没有问题时不显示角标；只有提示时也不显示", async () => {
    const { container } = await mount("# 根\n- 甲\n");
    expect(container.querySelector(".mdmm-badge")).toBeNull();
    const doc = await mount("# 根\n- 甲 ^a 🔴\n", {
      document: { title: "笔记" },
    });
    expect(doc.map.diagnostics.map((d) => d.code)).toEqual(["ID_NOT_LAST"]);
    expect(doc.container.querySelector(".mdmm-badge")).toBeNull();
  });

  test("一个节点都没有时显示错误面板", async () => {
    const { container } = await mount("只有一段文字。\n");
    const panel = container.querySelector<HTMLElement>(".mdmm-problems")!;
    expect(panel.classList).toContain("mdmm-problems-full");
    expect(getComputedStyle(panel).display).toBe("block");
    expect(panel.textContent).toContain("没有找到任何节点");
    expect(container.querySelector(".mdmm-badge")).toBeNull();
  });
});
