# 自建渲染还是复用现有库

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: Claude (with pengyg)
Blocked by: 01, 02
Map: [map.md](../map.md)

## Question

基于「现有思维导图渲染库能否直接复用」和「Obsidian 插件 API 对本需求的支持情况」的调研结论：渲染层是直接复用某个现有库（哪个、需要补什么、fork 还是依赖）、在其基础上改造，还是自建（SVG 还是 canvas）？

已知约束：候选库若用 SVG `foreignObject` 或 innerHTML 渲染节点，会撞上 iOS WebKit bug 与 Obsidian 审查规则（见「Obsidian 插件 API 对本需求的支持情况」风险 1、9）。

核心取舍（来自「现有思维导图渲染库能否直接复用」）：
- **A. 自建 SVG 渲染 + `@plait/layouts` 布局**：满足全部需求（含概要带子节点），工作量最大；需原型验证 `@plait/layouts` 边界情况与稳定性。
- **B. 直接用 mind-elixir 5.x**：工作量最小，但概要节点不能带子节点（与样例截图不符），排版靠 DOM/CSS、导出靠截图，需另行确认 iOS 表现。
- 决策点实质是："概要带子节点"值不值自建渲染层的工作量。

## Answer

**自建渲染层（方案 A）。** 用户用它整理高中九科知识，"概要之后再分支"很常见，概要节点必须能带子节点；现成库（含 mind-elixir v6.0.0-next.10，`Summary` 仍只有 label）都做不到。不走"先 mind-elixir 后迁移"，避免接入工作做两遍。

- **排版**：依赖 `@plait/layouts`，锁定版本，藏在我们自己的排版接口后面，出问题可换实现或 fork；先由「排版引擎与节点渲染原型验证」确认边界情况，不行再退回自写排版。
- **节点渲染**：**HTML 节点（绝对定位）+ SVG 层**画分支线、概要括号、联系线。文字换行、行内 markdown、公式交给浏览器；节点尺寸靠 DOM 测量后喂给排版。不用 SVG `foreignObject` 做屏幕渲染（避开 iOS WebKit bug），也不用 canvas。
- **公式（进入 v1）**：行内 LaTeX，含 mhchem 化学式。web 端用 KaTeX + `katex/contrib/mhchem`（KaTeX 0.19.0 已核实自带）；Obsidian 端优先用宿主自带的 `renderMath`（MathJax），与笔记外观一致、不额外打包——其是否带 mhchem 待原型核实。
- **导出**：PNG 为主（用户用途：粘贴、打印、分享）；SVG 尽力而为（节点以 foreignObject 内嵌 HTML，浏览器可看，矢量编辑软件不保证）。
- **规模**：按"一章一张、常规 ≤300 节点、可撑到约 1000"设计，大图靠折叠 + 视口外不渲染。
- **推迟出 v1**：节点内图片（先用双链指向图片所在笔记）、多段文字（先靠自动换行）。
