# Obsidian 插件 API 对本需求的支持情况

Type: research
Label: wayfinder:research
Status: resolved
Assignee: Claude (research subagent)
Blocked by: —
Map: [map.md](../map.md)

## Question

Obsidian 插件 API 能否支撑以下需求，各自怎么做、有什么限制？

- 用 ` ```mindmap ` 代码块渲染：阅读视图（`registerMarkdownCodeBlockProcessor`）与**实时预览**下的行为差异
- 把整篇 `.md` 当导图在**自定义视图**中打开：如何识别（frontmatter 标记 / 命令 / 文件扩展名）、现有插件的常见做法
- 点击节点**跳转到源码对应行**：代码块处理器能否拿到块在文件中的位置（`MarkdownPostProcessorContext.getSectionInfo` 等），编辑器如何定位
- `^id` 块 ID 在代码块**内部**是否会被 Obsidian 当作块引用处理（会不会冲突或被误识别）
- `[[双链]]` 在自定义渲染内容中如何做成可点击、可悬停预览
- 移动端限制（禁止 Node/Electron API、性能）；跟随明暗主题可用的 CSS 变量
- 社区插件提交审核的硬性要求（体积、禁止项等）

参考已有的 markmap 类 Obsidian 插件是怎么实现的。产出：逐项结论 + 风险点。

## Context

完整调研（带一手出处与行号）：分支 `research/obsidian-plugin-api` 的 `research/obsidian-plugin-api.md`。

## Answer

结论：**全部需求都能用公开 API 支撑**，但有几处需降级或绕行。详见分支 `research/obsidian-plugin-api` 的 `research/obsidian-plugin-api.md`（commit 558a478）。

1. **代码块**：`registerMarkdownCodeBlockProcessor` 阅读视图与实时预览都生效；实时预览下光标进块显示源码、离开显示渲染。处理器会被反复调用 → 渲染须幂等、按源文缓存；资源挂到 `MarkdownRenderChild` 上随 `el` 卸载。宽度随正文栏，**高度需插件自定**且应预先确定避免跳动。
2. **整篇文件模式**：`md` 已被核心视图占用，不能再注册。基线方案用公开 API：命令 + 文件/面板菜单调用 `leaf.setViewState` 打开只读 `TextFileView`，标题栏按钮切回 markdown。按 frontmatter 自动打开需 monkey-patch `setViewState`（Kanban/Excalidraw 做法）→ 做成默认关闭的设置项。
3. **跳转源码行**：点击时调用 `ctx.getSectionInfo(el)`，目标行 = `lineStart + 1 + 节点行偏移`；可能返回 null（嵌入、悬停预览、Canvas 等）→ 禁用跳转。用 `editor.setCursor` + `scrollIntoView`。阅读视图需先切编辑模式。
4. **`^id`**：代码块内大概率不被索引（推断，需原型验证）；整篇文件里列表项 `- 节点 ^id` 会成为真块ID，可被 `[[文件#^id]]` 引用。**Obsidian 块ID 只允许 `[A-Za-z0-9-]`**。
5. **双链**：`createEl` 构造 `a.internal-link`，点击走 `openLinkText`，悬停用 `registerHoverLinkSource` + `hover-link` 事件（载荷未类型化，社区惯例）。**代码块内的双链不进索引**（无反链、改名不更新）；整篇文件模式无此问题。
6. **移动端与主题**：禁 Node/Electron API、禁正则后行断言（iOS<16.4）。**最大风险：SVG `foreignObject` 在 WebKit/iOS 有长期 bug**（markmap 依赖它）→ 需早期真机验证，备选纯 SVG 文本或绝对定位 HTML。颜色全部走 Obsidian CSS 变量，自动跟随明暗。
7. **社区审核**：无官方体积上限；资源须内联进 `main.js`/`styles.css`；eslint-plugin-obsidianmd 自动审查（禁 innerHTML、禁直接写 `el.style`、不持有 view 引用、用 `activeDocument` 等）；禁遥测、混淆、自更新。

**风险（按严重度）**：iOS foreignObject 渲染；实时预览下点击/滚轮/触摸与笔记滚动冲突；getSectionInfo 返回 null；自动打开依赖 monkey-patch；hover-link 载荷未类型化；代码块双链不入索引；`^id` 字符集受限；`mindmap` 代码块名已被其他插件占用（Markdown Mindmap、Mindmap Blocks）→ 需可配置/别名；markmap 用 innerHTML 与 CDN 加载插件过不了审查；手机无分屏。
