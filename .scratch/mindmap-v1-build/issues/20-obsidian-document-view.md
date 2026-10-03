# Obsidian：整篇文件视图

Status: claimed
Blocked by: 19, 06
Spec: [spec.md](../spec.md) §12「整篇文件视图」

## 要做什么

- 只读的 `TextFileView`：可以通过命令「以导图打开当前文件」、`file-menu`、`onPaneMenu`，在同一个标签页里切换过去；视图右上角有按钮切回文档。
- 交互模式为 `direct`；`document.title` 用文件名（去掉 `.md`）。
- 点节点：桌面端用 `getLeaf('split')` 分屏打开编辑器，之后复用这个分屏；手机端切回编辑视图再定位。
- 监听 `editor-change`，停止输入约 300 ms 后调用 `update()`。

## 验收

- **需要用户在 Obsidian 中实测**（电脑 + 安卓）：用一份真实的章节笔记打开导图，编辑时导图跟着刷新，视口和折叠状态都不丢。
- `npm run check` 通过。

## Comments

**2026-10-03 代码完成，等待用户在 Obsidian 中实测**（Claude）。`src/file-view.ts`，在 `src/main.ts` 里注册。

- **打开方式**：
  - 命令「以导图打开当前文件」（`open-as-mindmap`）：当前标签页是 `.md` 文件、且还不是导图视图时才可用。
  - 文件菜单（`file-menu` 事件）：标签页右上角的「更多选项」菜单也会触发这个事件，所以 spec 里说的「视图菜单」也由它覆盖。
  - 两者都用 `leaf.setViewState({ type: "mdmindmap-file" })` 在**同一个标签页**里切换。
- **切回文档**：导图视图标题栏右侧有按钮，视图自己的「更多选项」菜单里也有「切回文档」。
- **只读**：`getViewData()` 原样返回读到的内容，这个视图不会改写文件。
- **渲染**：`interaction: "direct"`，占满标签页；`document.title` 是文件名（不含 `.md`）。Obsidian 重新加载文件时（`setViewData`，`clear=false`）走 `update()`，换文件时重建。
- **点节点**：
  - 桌面端：先找已经打开同一个文件的编辑器标签页，没有就 `getLeaf("split", "vertical")` 新开分屏，然后用 `revealLine` 定位。下次点击会复用这个已打开的编辑器，不再新开分屏。
  - 手机端（`Platform.isMobile`）：在当前标签页切回编辑视图，再定位。
  - 用文件名作的根（行号为 0）会跳到文件开头。
- **跟随编辑**：监听 `editor-change`，只处理同一个文件的变更，用 Obsidian 的 `debounce` 在停止输入 300 ms 后调用 `update(editor.getValue())`，不等文件保存。`update()` 会保留视口和折叠状态。
- **节点菜单**：多了「复制块引用」，生成 `[[链接文字#^id]]`，链接文字由 `metadataCache.fileToLinktext` 生成。
- 双链的点击和悬停预览与代码块相同。

**待实测**：用一份真实的章节笔记打开导图，编辑时导图跟着刷新，视口和折叠状态都不丢。
