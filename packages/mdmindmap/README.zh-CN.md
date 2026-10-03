# mdmindmap

[English](README.md)

用 Markdown 标题和列表渲染只读思维导图，支持概要括号、跨分支联系、预设颜色和公式；另外提供不依赖 DOM 的解析器，以及校验源文的命令行工具 `check`（方便 AI 写完后自查）。

同一个仓库里还有 Obsidian 插件 **MD Mindmap**。

## 安装

```sh
npm install mdmindmap
```

只提供 ESM。解析器和命令行工具需要 Node ≥ 20.19，渲染器在浏览器中运行。

## 渲染

```ts
import "mdmindmap/style.css";
import "katex/dist/katex.min.css";
import { render } from "mdmindmap";
import { katexMath } from "mdmindmap/katex";

const source = `# 牛顿运动定律
- 牛顿第一定律 ^law1
  - 惯性
- 牛顿第二定律 🔴 ^law2
  - { $F=ma$
  - $a$ 由合外力决定
  - } 定量关系

%%
law1 -.->|合力为零时的特例| law2
%%`;

const map = render(document.getElementById("map")!, source, {
  math: katexMath(),
});
await map.ready;
```

容器要有高度（导图会占满它），或者传入 `height`。

### 选项

| 选项 | 默认值 | 说明 |
|---|---|---|
| `math` | 必填 | 公式渲染器。用 `mdmindmap/katex` 的 `katexMath()`（KaTeX + mhchem），或者自己实现 `{ render(tex): HTMLElement, flush?(), exportCss?() }`。 |
| `layout` | `"logic"` | `"logic"`（向右）或 `"bilateral"`（左右两侧）。 |
| `height` | 占满容器 | 数字（px），或 `"auto"`（按可见叶子数估算，220–600 px）。给了高度时，可以拖动底边调整。 |
| `interaction` | 给了 `height` 时为 `"click-to-activate"`，否则为 `"direct"` | 点击激活：点一下导图之前，滚轮和触摸滚动都交给页面。 |
| `document` | 无 | `{ title }`：整篇模式，跳过非节点内容；唯一的 `#` 标题作根，否则用 `title` 作根。 |
| `onNodeClick(node)` | 无 | `node.line` 是节点在源文中的行号（从 1 开始）。 |
| `onLinkClick(target, event)` | 无 | 点击 `[[双链]]` 时调用。没传时，双链按普通文字处理。外部链接在新窗口打开。 |
| `onNodeMenu(node, { x, y })` | 无 | 右键或长按（550 ms）节点时调用。 |
| `onDiagnostics(list)` / `onDiagnosticClick(d)` | 无 | 源文的问题。导图角落的 ⚠ 角标会列出这些问题。 |

### 实例

```ts
map.ready                    // Promise：首次画完时完成
map.diagnostics              // 源文的问题
await map.update(source)     // 增量更新：保留视口和折叠状态，复用没变的节点
map.fit()
await map.setLayout("bilateral")
await map.collapseAll(1)     // 只留根和一级分支
await map.revealLine(12)     // 把第 12 行的节点移进视野并高亮
await map.exportSvg()        // 字符串；节点以 foreignObject 内嵌
await map.exportPng({ scale: 2, maxSide: 16000 })  // Blob
map.destroy()
```

导出用当前的主题，所有 `--mdmm-*` 变量都会先算出实际值，所以导出的文件离开页面也显示正确。用 `katexMath()` 时，KaTeX 字体会被内联进去；前提是 KaTeX 的样式表同源（或者带 `crossorigin` 属性加载），否则读不到它的规则。

## 解析（不需要 DOM）

```ts
import { parse } from "mdmindmap/parse";

const { root, relationships, diagnostics } = parse(source);
for (const d of diagnostics) console.log(d.line, d.severity, d.code, d.message, d.fix);
```

`code` 是稳定的英文标识；`message` 和 `fix` 用中文写。

## 命令行工具

```sh
npx mdmindmap check 笔记/*.md          # 整篇 .md，或含 mdmindmap 代码块的文件
npx mdmindmap check 回答.md --json     # 输出 [{ file, diagnostics }]，行号是文件中的行号
npx mdmindmap guide                    # 打印给 AI 看的写作说明
```

有错误时 `check` 的退出码为 1。它还会用 KaTeX + mhchem 试渲染每个公式，渲染失败时报 `MATH_ERROR` 警告。

## CSS 变量

公开的样式接口就是下面这些变量，加上节点上的 `data-depth`、`data-color`、`data-summary` 属性。类名属于内部实现。

| 类别 | 变量 |
|---|---|
| 基础色 | `--mdmm-font`、`--mdmm-bg`、`--mdmm-text`、`--mdmm-text-muted`、`--mdmm-accent`、`--mdmm-link`、`--mdmm-red`、`--mdmm-orange`、`--mdmm-yellow`、`--mdmm-green`、`--mdmm-blue`、`--mdmm-purple`、`--mdmm-gray` |
| 派生色（由基础色算出） | `--mdmm-branch`、`--mdmm-brace`、`--mdmm-l1-fill`、`--mdmm-summary-fill`、`--mdmm-relation`、`--mdmm-color-fill-amount` |
| 尺寸 | `--mdmm-{root,l1,node,summary}-{font-size,padding,radius}`、`--mdmm-node-max-width`、`--mdmm-root-max-width`、`--mdmm-line-height`、`--mdmm-branch-width` |

亮色和暗色默认跟随 `prefers-color-scheme`。在任意外层元素（例如 `<html>`）上加 `data-mdmm-theme="light"` 或 `"dark"`，可以强制其中一种。

## 许可

MIT
