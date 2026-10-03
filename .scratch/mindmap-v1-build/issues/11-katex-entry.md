# web 公式入口与宽公式处理

Status: resolved
Blocked by: 10
Spec: [spec.md](../spec.md) §2、§7 第 2 条、§10

## 要做什么

- `mdmindmap/katex` 提供 `math` 对象：
  - `render` 用 KaTeX 加 `katex/contrib/mhchem`。KaTeX 是可选依赖，只在引用这个入口时加载。
  - `exportCss()` 返回 KaTeX 字体样式，字体内联为 woff2 data URL。
- 宽公式：检测到节点内容溢出后，按内容的实际宽度放宽节点，再测一次高度。

## 验收

- 演示页中，化学方程式和分式都显示正确。
- 一个很长的 `\ce{}` 节点不会溢出，节点宽度等于内容宽度。
- `npm run check` 通过。

## Comments

**2026-10-03 完成**（Claude）。共 5 条浏览器测试，使用真实的 KaTeX，全仓库 `npm run check` 通过（202 条测试）。两条验收都已满足：分式和化学式显示正确；很长的 `\ce{}` 节点会被放宽、不溢出，普通节点不受影响。

**接口**：`import { katexMath } from "mdmindmap/katex"`，用法是 `render(el, src, { math: katexMath({ macros? }) })`。KaTeX 的样式**由宿主页面自己引入**（`import "katex/dist/katex.min.css"`）：库的 JS 入口不导入 CSS，否则在 Node 和不支持 CSS 导入的环境里会出错。这一点要写进 README（「README 与使用文档」工单）。

**实现中做出的决定**：
- 公式出错时用 `throwOnError: false`，显示 KaTeX 的红色原文，导图照常画；校验交给 `mdmindmap check`。用 `strict: "ignore"` 是为了避免中文触发控制台警告。
- **`exportCss()`** 从页面上已加载的样式表里收集 `.katex` 规则，并把 KaTeX 的 `@font-face` 换成 woff2 data URL（20 个字体，约 300 KB）。**限制**：跨域加载、又没有 `crossorigin` 属性的样式表（例如某些 CDN）读不到规则，会被跳过，这时导出图里的公式会退回系统字体。也要写进 README。
- **宽内容放宽**：测量前检查 `scrollWidth > clientWidth`，溢出的节点加上内部类 `mdmm-wide`，宽度设为内容宽度（最多调整 3 次），之后统一测量的高度就是放宽后的高度。`getComputedStyle` 用节点所在窗口的版本，保证在 Obsidian 的弹出窗口里也正确。
- `src/katex.ts` 是只给 web 用的入口，在 lint 配置里对它单独关掉了 `no-restricted-globals`（允许 `fetch`）。
- 演示页已经改用 `mdmindmap/katex`。浏览器测试预先打包了 KaTeX，避免 Vite 重新加载测试。
