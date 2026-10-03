// 演示页：用 Vite 打开（npm run demo），手动查看渲染效果。不发布。

import "katex/dist/katex.min.css";
import { render, type Layout, type MindMap } from "mdmindmap";
import { katexMath } from "mdmindmap/katex";
import "../src/style.css";

const samples = import.meta.glob<string>("../test/fixtures/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

const math = katexMath();

const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const sampleSelect = $<HTMLSelectElement>("sample");
const layoutSelect = $<HTMLSelectElement>("layout");
const themeSelect = $<HTMLSelectElement>("theme");
const mapEl = $<HTMLDivElement>("map");
const diagnosticsEl = $<HTMLPreElement>("diagnostics");

const names = Object.keys(samples).sort((a, b) => {
  // 规格样例排在最前面
  const rank = (s: string) =>
    s.includes("/spec/") ? 0 : s.includes("/ai-trial/") ? 1 : 2;
  return rank(a) - rank(b) || a.localeCompare(b);
});
for (const name of names) {
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name.replace("../test/fixtures/", "");
  sampleSelect.append(option);
}

const params = new URLSearchParams(location.search);
sampleSelect.value = params.get("sample") ?? names[0] ?? "";
layoutSelect.value = params.get("layout") ?? "logic";
themeSelect.value = params.get("theme") ?? "";

let current: MindMap | null = null;

function show(): void {
  current?.destroy();
  const name = sampleSelect.value;
  const source = samples[name] ?? "";
  const file = name.split("/").pop() ?? "";
  document.documentElement.toggleAttribute(
    "data-mdmm-theme",
    themeSelect.value !== "",
  );
  if (themeSelect.value)
    document.documentElement.dataset.mdmmTheme = themeSelect.value;
  document.body.style.background = themeSelect.value === "dark" ? "#111" : "";
  document.body.style.color = themeSelect.value === "dark" ? "#ddd" : "";

  current = render(mapEl, source, {
    math,
    layout: layoutSelect.value as Layout,
    ...(file.endsWith(".doc.md") && {
      document: { title: file.replace(/\.doc\.md$/, "") },
    }),
  });
  diagnosticsEl.textContent = current.diagnostics
    .map((d) => `第 ${d.line} 行  ${d.severity}  ${d.code}  ${d.message}`)
    .join("\n");

  const url = new URL(location.href);
  url.searchParams.set("sample", name);
  url.searchParams.set("layout", layoutSelect.value);
  url.searchParams.set("theme", themeSelect.value);
  history.replaceState(null, "", url);
}

for (const el of [sampleSelect, layoutSelect, themeSelect])
  el.addEventListener("change", show);
show();

function download(blob: Blob, name: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

$<HTMLButtonElement>("export-png").addEventListener("click", () => {
  void current?.exportPng().then((blob) => download(blob, "mdmindmap.png"));
});
$<HTMLButtonElement>("export-svg").addEventListener("click", () => {
  void current
    ?.exportSvg()
    .then((svg) =>
      download(new Blob([svg], { type: "image/svg+xml" }), "mdmindmap.svg"),
    );
});

// 方便在控制台和自动化脚本里调用
(window as unknown as { mdmm: () => MindMap | null }).mdmm = () => current;
