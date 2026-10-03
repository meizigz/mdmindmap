# Obsidian：跳转源码、节点菜单与双链

Status: claimed
Blocked by: 18
Spec: [spec.md](../spec.md) §12「跳转源码」「节点菜单」「双链」

## 要做什么

- 点节点跳转源码：
  - 用 `getSectionInfo` 换算出文件行号；返回 null 时禁用跳转。
  - 步骤：切到编辑模式 → `setEphemeralState({ line })` → 等一帧 → `setCursor`，并居中 `scrollIntoView`。
- 节点菜单用 Obsidian 的 `Menu`，菜单项：复制节点文字、跳到源码、复制块引用（只在整篇模式、且节点有 `^id` 时可用）。
- 双链：构造 `a.internal-link`，点击时调用 `openLinkText`，悬停预览用 `registerHoverLinkSource` 加 `hover-link`。
- 诊断角标中的条目，也能跳到对应的行。

## 验收

- **需要用户在 Obsidian 中实测**（电脑 + 安卓）：源码很长时，跳转后目标行在屏幕中间；安卓长按菜单只弹一次；双链悬停预览可用。
- `npm run check` 通过。

## Comments

**2026-10-03 代码完成，等待用户在 Obsidian 中实测**（Claude）。

- **跳转源码**（`src/source.ts`）：
  - 每次点击时，用 `iterateAllLeaves` 现找包含这个代码块的 `MarkdownView`，不长期持有 view 的引用。
  - 阅读视图先 `setState({ mode: "source" })` 切到编辑模式；然后 `setEphemeralState({ line })`；等一帧；`setCursor`；居中 `scrollIntoView`；`focus`。
  - 文件行（从 0 开始）= `getSectionInfo().lineStart` + 节点在源文中的行号。拿不到位置（返回 null）时弹提示，不跳转。
- **节点菜单**（`src/menu.ts`）：用 Obsidian 的 `Menu.showAtPosition`，传入节点所在的 document（弹出窗口里也能正确显示）。菜单项：
  - 复制节点文字：复制的是源文中的文字（带 markdown 标记）。
  - 跳到源码：拿得到代码块位置时才显示。
  - 复制块引用：只在整篇模式、且节点有 `^id` 时提供，供「整篇文件视图」使用。代码块里的 `^id` 不是 Obsidian 的块ID，所以代码块不提供这一项。
- **双链**：
  - 点击：`openLinkText(target, sourcePath, Keymap.isModEvent(event))`，按住修饰键时在新标签页打开。
  - 悬停：插件 `registerHoverLinkSource("mdmindmap", { defaultMod: true })`；代码块在双链的 `mouseover` 上触发 `hover-link`，`hoverParent` 是这个代码块组件（实现了 `HoverParent`）。和 Obsidian 的默认设置一致，要按住 Ctrl/Cmd 悬停才显示预览，可以在「页面预览」核心插件的设置里修改。
- **诊断角标**：点问题列表中的某一条，也会跳到对应的行。

**待实测**：源码很长时，跳转后目标行在屏幕中间；安卓长按菜单只弹一次；双链悬停预览可用。
