# 样式与主题：CSS 变量约定与明暗跟随

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: Claude (with pengyg)
Blocked by: —
Map: [map.md](../map.md)

## Question

导图的外观通过 CSS 变量定制（「包拆分与对外 API」）。这组 CSS 变量本身就是公开 API，开工前要定下来：

- **有哪些变量**：背景、文字、连线、括号、联系线、各层级节点的字号/内边距/圆角/背景、7 个预设颜色、最大节点宽度等等。命名前缀是什么（比如 `--mm-*`）？
- **Obsidian 端**：每个变量默认映射到 Obsidian 的哪个 CSS 变量（`--text-normal`、`--background-primary`、`--interactive-accent`、`--color-red` 等），才能自动跟随明暗主题和第三方主题？
- **web 端**：默认给出亮色和暗色两套值吗？是跟随 `prefers-color-scheme`，还是由使用方切换？
- **节点层级样式**：根节点、一级分支、更深层节点、概要节点分别长什么样（参考样例截图：一级分支是圆角色块，更深层是下划线还是边框）？
- **7 个预设颜色**在明、暗两种背景下各取什么值，才能都有足够对比度？
- 导出 PNG/SVG 时用当前主题还是固定亮色？

需要时可以用「排版引擎与节点渲染原型验证」的原型页面（分支 `prototype/layout-render-spike`）快速试样式。

另：「实时预览与阅读视图中的交互和代码块尺寸」的原型插件（分支 `prototype/obsidian-interaction-spike`）已经用 Obsidian 的 CSS 变量画出了一版样式，可以在 Obsidian 里直接试主题。

## Answer

2026-10-03 与 pengyg 逐项确认（grilling 共两轮）。

**命名与公开范围**
- 变量和类名都用前缀 `mdmm`：`--mdmm-*`、`.mdmm-*`。
- 公开 API = CSS 变量 + 三个稳定的选择器属性 `data-depth`、`data-color`、`data-summary`（写进文档，供高级用户在 CSS 片段里精细覆盖）。类名和其余 DOM 结构属于内部实现。

**变量清单**（数值可以在实现时调，变量名一经发布就是 API）
- 基础色，由宿主提供；web 端自带亮、暗两套值：`--mdmm-font`（默认 `inherit`）、`--mdmm-bg`（也是导出背景）、`--mdmm-text`、`--mdmm-text-muted`、`--mdmm-accent`、`--mdmm-link`，以及 7 个预设颜色 `--mdmm-red/orange/yellow/green/blue/purple/gray`。
- 派生色，由核心样式用 `color-mix()` 从基础色算出默认值，用户也可以覆盖：`--mdmm-branch`（树的连线和下划线，约为正文色 35% 混进背景）、`--mdmm-brace`（同 branch）、`--mdmm-l1-fill`（约 8%）、`--mdmm-summary-fill`（约 14%）、`--mdmm-relation`（同 accent）、`--mdmm-color-fill-amount`（20%）。
- 尺寸：`--mdmm-{root,l1,node,summary}-{font-size,padding,radius}`，以及 `--mdmm-node-max-width`（240px）、`--mdmm-root-max-width`（280px）、`--mdmm-line-height`、`--mdmm-branch-width`。
- **最大节点宽度只用 CSS 变量**，`render()` 的 `maxNodeWidth` 选项删掉；测量本来就读 DOM，这样所有尺寸都只来自 CSS。

**各层级节点的样子**（照参考截图，XMind 风格）
- 根节点：粗体大字，没有边框。
- 一级分支：圆角色块（`--mdmm-l1-fill`）。
- 二级及更深：下划线式，文字下面一条横线，并和连线接在一起；连线接在节点**底边**，不接在垂直中点。
- 概要节点：用 `--mdmm-summary-fill` 填底的圆角框。

**预设颜色**
- 浅底 + 彩色边框，文字仍用正常文字色：浅底 = `color-mix(颜色 var(--mdmm-color-fill-amount), var(--mdmm-bg))`。这样在明暗主题、第三方主题下都能自动保证对比度。
- 有颜色的节点不论在哪一层（包括根节点、下划线式节点）都画成色块。
- 想要实心效果（截图里的红底白字），覆盖 `--mdmm-color-fill-amount: 100%` 再改文字色即可，README 给示例。

**web 端**
- 默认跟随 `prefers-color-scheme`；在任意外层元素（比如 `<html>`）上加 `data-mdmm-theme="light" | "dark"` 可以强制某一种。只用 CSS 实现，不加 JS 选项。
- 7 个颜色采用 Radix Colors 色阶：亮色主题用第 9 阶，暗色主题用对应暗色色阶的第 9 到 10 阶。背景 / 文字：亮色 `#ffffff` / `#1f2328`，暗色 `#1e1e1e` / `#dcddde`。具体色值实现时可以微调。

**Obsidian 端映射**（只映射基础色）

| `--mdmm-*` | Obsidian 变量 |
|---|---|
| font | `--font-text` |
| bg | `--background-primary` |
| text / text-muted | `--text-normal` / `--text-muted` |
| accent | `--interactive-accent` |
| link | `--link-color` |
| red … purple | `--color-red` … `--color-purple` |
| gray | `--color-base-50` |

联系线默认用强调色，以便和树的连线区分开（截图里联系线是灰色虚线）。插件 v1 **不提供**样式设置，README 给几段 CSS 片段示例（实心红色节点、加宽节点、更换联系线颜色）。

**导出**：用当前看到的主题（所见即所得）。

**实现约束**
- 导出时必须先把每个 `--mdmm-*` 变量算出实际值再写进导出的样式。Obsidian 的变量定义在 `body` 上，不这样做，导出的 SVG 离开 Obsidian 就会变成无色。
- 节点定位不能用 `el.style` 直接写（Obsidian 审查规则）；宽度等可以用 `setProperty('--mdmm-…')` 写变量。

**推迟到 v1 之后**：兼容 Style Settings 插件（在 `styles.css` 里写 `@settings` 注释）；导出时可选亮色主题。
