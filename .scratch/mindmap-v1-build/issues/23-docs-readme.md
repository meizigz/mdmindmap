# README 与使用文档

Status: resolved
Blocked by: 08, 22
Spec: [spec.md](../spec.md) §2、§9、§11、§12

## 要做什么

- 根目录的 `README.md`（英文为主）和 `README.zh-CN.md`：插件的用法、语法速览（链接到写作说明）、交互、已知限制（代码块中的双链不进 Obsidian 的索引；iOS 未验证）。
- `packages/mdmindmap/README.md`（英文，另附中文版）：安装方法；`render()` 和 `parse()` 的示例；`/katex` 的用法；CSS 变量清单；`check` 和 `guide`。
- CSS 片段示例：实心红色节点、加宽节点、更换联系线颜色。

## 验收

- README 中的代码示例能在演示页里原样运行。
- `npm run check` 通过。

## Comments

**2026-10-03 完成**（Claude）。全仓库 `npm run check` 通过（263 条测试）。

- **根目录 `README.md`**（英文）**和 `README.zh-CN.md`**：插件用法、语法速览表（完整规则链接到 `ai-guide.md`）、交互、整篇笔记视图、工具栏（新标签页、导出）、CSS 片段示例、已知限制（代码块中的双链不进 Obsidian 的索引；iOS 未验证；不能可视化编辑）。注明了写作说明和诊断信息只有中文。
- **`packages/mdmindmap/README.md`**（英文）**和 `README.zh-CN.md`**：安装、`render()` 加 `katexMath()` 示例、选项表、实例方法、导出的限制（KaTeX 样式表需同源或带 `crossorigin`）、`parse()` 示例、`check` 和 `guide`、CSS 变量清单、明暗主题。`README.zh-CN.md` 已加进 npm 包的 `files`。
- **CSS 片段示例**：实心红色节点、加宽节点、更换联系线颜色。
- **验收**：新增 `test/readme.browser.test.ts`。它原样运行 README 的渲染示例（真实 KaTeX）和解析示例，并逐个应用三个代码片段、检查效果：红色节点变为实心红底白字；最大宽度变为 320px；联系线颜色改变。共 5 条，全部通过。
