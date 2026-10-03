# 整篇 .md 作为导图的识别与打开方式

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: Claude (with pengyg)
Blocked by: 02, 03
Map: [map.md](../map.md)

## Question

整篇 `.md` 文件作为导图源文时：文件如何声明自己是导图（frontmatter 字段？约定文件夹？命令手动打开？），根节点取自哪里（frontmatter title / 文件名 / 首个一级标题），在 Obsidian 里如何切换「文档视图 ↔ 导图视图」，web 端如何对应？

## Answer

与 pengyg 逐项确认（grilling 共两轮）。解析规则已并入 [syntax-spec.md](../syntax-spec.md) 的「整篇模式的额外规则」。

- **成为导图**：不需要声明。任何 `.md` 都可以通过命令、文件菜单（`file-menu`）、视图菜单（`onPaneMenu`）在**同一个标签页**里切换成只读导图视图（`TextFileView`），导图视图右上角有按钮切回文档。v1 **不做**按 frontmatter 自动打开（省掉 monkey-patch `setViewState`），也不定义 frontmatter 标记。理由：导图只读，自动打开会妨碍编辑。
- **非节点内容**：段落、表格、图片、callout、分隔线、代码块（包括 `mdmindmap` 代码块）都静默跳过，代码块整块跳过。
- **根节点**：只有一个一级标题、且其他节点都在它下面时，它就是根；否则用文件名作根。代码块模式仍要求只能有一个根。
- **联系区**：只有文件的最后一个块是 `%%…%%` 时才算联系区，正文中间的 `%%` 注释都跳过。节点文字里的行内 `%%…%%` 在两种模式下都会去掉。
- **点击节点跳转源码**：桌面端在旁边分屏打开编辑器（`getLeaf('split')`）并定位到那一行，之后复用这个分屏；手机端在当前标签页切回编辑视图再定位。
- **刷新**：分屏编辑时监听 `editor-change`，停止输入约 300ms 后按新源文重绘，不等文件保存。
- **列表项续行**（两种模式都适用）：没有空行隔开的缩进续行并进节点文字，用空格连接。
- **web 端**：核心库提供「整篇模式 + 标题」选项，按上面的整篇规则解析；读文件由调用方负责。v1 不做独立的 web 查看器。参数怎么命名交给「包拆分与对外 API」。
