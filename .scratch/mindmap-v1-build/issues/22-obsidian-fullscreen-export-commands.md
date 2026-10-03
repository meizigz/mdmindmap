# Obsidian：全屏标签页、导出与命令

Status: claimed
Blocked by: 17, 18
Spec: [spec.md](../spec.md) §10、§12「代码块」「命令」

## 要做什么

- 代码块右上角的「在新标签页打开」按钮：用自定义 `ItemView` 全屏显示，交互模式为 `direct`。
- 导出 PNG（为主）和 SVG：触发方式和保存位置由本工单决定（§14），定下来后写回 spec §10 和 §12。Obsidian 端要内联 MathJax 的字体。
- 命令「复制 AI 写作说明」：复制附录 B 的全文。

## 验收

- **需要用户在 Obsidian 中实测**（电脑 + 安卓）：电脑和安卓上都能导出含公式的 PNG，且显示正确；复制的写作说明与 `mdmindmap guide` 的输出一致。
- `npm run check` 通过。

## Comments

**2026-10-03 代码完成，等待用户在 Obsidian 中实测**（Claude）。

- **在新标签页打开**（`src/tab-view.ts`）：
  - 自定义 `ItemView`，交互模式为 `direct`。视图状态里记下源文、文件路径、代码块围栏所在的行和标题，所以重启 Obsidian 后标签页能恢复。
  - 这是打开时的快照，之后不跟随源文变化；要看最新内容，就从代码块重新打开。
  - 点节点、点问题列表，会在编辑器中打开源文件并定位（文件行 = 围栏行 + 节点行号）。整篇文件视图也改用同一个 `openEditorAt()`（`src/source.ts`）。
- **导出**（`src/export.ts`；触发方式和保存位置已写回 spec §10、§12）：
  - 入口：嵌入导图右上角工具栏的「导出」按钮（弹出 PNG / SVG 菜单）；整篇文件视图和全屏标签页的标题栏按钮，以及「更多选项」菜单。
  - 保存：用 `fileManager.getAvailablePathForAttachment` 存进附件文件夹，遵循用户的附件设置，重名时自动加序号。文件名「<笔记名> 导图.png」（英文界面为 Mind map），完成后提示保存路径。
- **工具栏**：嵌入导图右上角有两个 `clickable-icon` 按钮：「在新标签页打开」和「导出」。平时半透明，悬停时不透明，触屏设备上一直显示。按钮会随外层元素一起交接，所以用普通监听器，通过 `owner` 转给当前负责它的组件。
- **MathJax 字体内联**（`src/math.ts` 的 `exportCss`）：收集页面上含 `mjx` 的 CSS 规则，把 `@font-face` 的字体文件转成 data URL。网络地址用 `requestUrl` 读取；Obsidian 自带的资源（`app://`、`capacitor://`）用窗口自己的 `fetch` 读取。读不到时保留原样，这时 PNG 里的公式会退回系统字体。**这一点最需要实测**：导出的 PNG 里，公式要用 MathJax 字体正确显示。
- **「复制 AI 写作说明」命令**：npm 包新增了导出路径 `mdmindmap/ai-guide.md`；插件用 esbuild 的 text loader 把它作为字符串打进 `main.js`，内容与 `mdmindmap guide` 的输出相同。
- 构建产物 `main.js` 约 84 KB。

**待实测**：电脑和安卓上都能导出含公式的 PNG，且显示正确；复制的写作说明与 `mdmindmap guide` 的输出一致。
