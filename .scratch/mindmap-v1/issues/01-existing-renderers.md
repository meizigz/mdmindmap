# 现有思维导图渲染库能否直接复用

Type: research
Label: wayfinder:research
Status: resolved
Assignee: Claude (research subagent)
Blocked by: —
Map: [map.md](../map.md)

## Question

有没有活跃、效果好的开源项目，能以**只读**方式渲染带**概要**和**联系**的思维导图，可以作为本库的渲染底座（我们只写 markdown 解析层 + Obsidian 外壳）？

至少覆盖：simple-mind-map、mind-elixir、markmap、jsMind，以及 Obsidian 社区里现有的导图插件（如 Enhancing Mindmap、Mindmap NextGen 等）。对每个候选，核实：

- 是否支持概要（括号，概要节点可再有子节点）与联系线（箭头、标签、线型）
- 能否关闭编辑，纯只读；能否以编程方式喂入数据结构（而非只能从它自己的格式导入）；是否自带 markdown 导入
- 结构：logic（向右）与 bilateral（左右）
- 渲染技术（SVG / canvas）、打包体积、是否依赖浏览器以外的环境（Obsidian 移动端可用性）
- 平移缩放、折叠、导出 SVG/PNG、节点点击事件
- 许可证（需与 MIT 兼容）、维护活跃度（最近提交/发布、issue 响应）

产出：一张对比表 + 推荐（复用哪个，或都不合适要自建，理由）。

## Context

完整调研（含实测体积、`@plait/layouts` 实跑脚本）：分支 `research/existing-renderers` 的 `research/existing-renderers.md`。

## Answer

结论：**没有能直接当底座的现成库**，卡在"概要节点可带子节点"这一硬需求。详见分支 `research/existing-renderers` 的 `research/existing-renderers.md`（commit 5d336d1）。

| | simple-mind-map | mind-elixir | markmap | jsMind | Plait `@plait/mind` |
|---|---|---|---|---|---|
| 维护 | 自称低维护，2026-04 起无合并 | 活跃（5.15.1 / v6 next） | 一般 | 稳定、功能少 | 活跃 |
| 许可 | MIT | MIT | MIT | BSD-3 | MIT |
| 概要 | ✅ 但不能带子节点（作者有意禁止，#1096） | ✅ 只有 label，不能带子节点 | ❌ | ❌ | ✅ 可带子节点 |
| 联系线 | ✅ 箭头/文字/线型 | ✅ 文字/虚线/线宽/双向 | ❌ | ❌ | ⚠️ 需另加 `@plait/draw` |
| 只读 | ✅（双击联系线仍可改字） | ✅ | ✅ | ✅ | ✅ |
| logic / bilateral | ✅/✅ | ✅/✅ | ✅/❌ | ✅/✅ | ✅/✅ |
| 渲染 | SVG | HTML + CSS flex，连线 SVG | SVG + foreignObject | HTML + canvas/SVG | SVG + Slate(React) |
| 体积 gzip | 97–105 KB | 29 KB 零依赖 | 26 KB（+解析器 236 KB） | 14 KB | ~209 KB |
| 导出 | ✅ | ⚠️ 依赖 DOM 截图 | ⚠️ | ⚠️ PNG 带水印 | ✅ |

Obsidian 现有插件均不可作底座：Mind Map（停更）、MarkMind（闭源付费）、Enhancing Mindmap（无概要/联系，停更）、Mindmap NextGen（无许可证）、Simple mind map（许可混乱、非 markdown 源文）。**Mind Elixir Mind Map**（0BSD）形态最接近（代码块 + 整篇视图 + 移动端），但同样受限于概要不能带子节点。

**推荐：自建轻量 SVG 渲染层，布局借用 `@plait/layouts`**（MIT、仅依赖 tslib、3.6 KB gzip，原生支持 logic/bilateral，概要节点按 start/end 区间定位且可带子节点，已实跑验证）。需自写：节点盒子与换行、分支曲线、概要括号、联系线（贝塞尔 + 箭头 + 标签 + 三种线型）、平移缩放、折叠、纯 SVG 导出转 PNG。可借鉴不依赖：simple-mind-map 的联系线/括号画法，mind-elixir plaintext 语法（`[^id]`、`}:2`、`> [^a] >-label-> [^b]`）。

**退路**：若可接受概要节点不带子节点，直接用 mind-elixir 5.x（最活跃、最小、语法接近、有移动端插件可参考），代价是排版靠 DOM/CSS、导出靠截图。

**未核实**：`@plait/layouts` 无独立文档（用法由类型与实跑反推），左侧分支概要、相邻多概要等边界未测，0.x 需锁版本；mind-elixir 只读下选中事件未实测。
