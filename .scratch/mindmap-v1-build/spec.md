# mdmindmap v1 规格

一个用 Markdown 写、只读渲染的思维导图库，包括 npm 包 `mdmindmap` 和 Obsidian 插件「MD Mindmap」。

本文是实现 v1 的唯一入口。下面两份文件是本规格的**规范性附录**，与本文同等效力：

- **附录 A：源文语法** → [syntax-spec.md](../mindmap-v1/syntax-spec.md)
- **附录 B：给 AI 的写作说明** → [packages/mdmindmap/ai-guide.md](../../packages/mdmindmap/ai-guide.md)（随 npm 包原样发布，由 `mdmindmap guide` 打印；这是唯一的正式版本）

术语以仓库根目录的 [CONTEXT.md](../../CONTEXT.md) 为准：导图、源文、节点、根节点、节点ID、概要、联系、结构、预设颜色。每条决定的理由和实测数据，见 [map.md](../mindmap-v1/map.md) 中各工单的答案。本文只写结论，括号里注明出处。

---

## 1. 范围

**v1 要做**
- 只读渲染。交互：平移缩放、折叠展开、点节点跳转源码、导出 PNG/SVG、7 个预设颜色。
- 概要采用 XMind 的方式：只括同一父节点下相邻的兄弟；同一父节点下可以有多个概要，但不重叠、不嵌套；概要节点可以有子节点；任意层级都能用。
- 联系：有向，可带文字标签，有实线、虚线、粗线三种。
- 两种结构：logic（向右）和 bilateral（左右两侧）。
- 节点内容：固定子集的行内 markdown、`[[双链]]`、按最大宽度自动换行、行内 LaTeX 公式（含 mhchem）。
- 源文两种形态：` ```mdmindmap ` 代码块，以及整篇 `.md` 文件。
- 规模：一章一张图，常规 ≤ 300 个节点，上限约 1000 个。
- 主要写作方式是「AI 先生成，人工微调」：提供不依赖 DOM 的解析和校验接口、命令行工具 `mdmindmap check`，以及给 AI 的写作说明。
- Obsidian：阅读视图和实时预览都渲染，支持移动端，跟随明暗主题。

**v1 不做**：可视化编辑；在插件里调用 AI；多父节点汇合（DAG）；组织结构图、时间线、鱼骨图等其他结构；手绘风格；嵌套或重叠的概要；节点内图片和多段文字；按 frontmatter 自动打开导图；独立的 web 查看器；兼容 Style Settings 插件；导出时选择亮色主题；iOS 真机验证（暂缓，见 §14）。

---

## 2. 仓库与包

（来自「包拆分与对外 API」「工程与发布」）

```
/                         ← 插件的发布入口（Obsidian 要求放在根目录）
├── manifest.json         ← 插件唯一的 manifest
├── versions.json
├── LICENSE               ← MIT
├── README.md             ← 英文为主，顶部链接 README.zh-CN.md
├── README.zh-CN.md
├── package.json          ← npm workspaces；build / dev / check / release 脚本
└── packages/
    ├── mdmindmap/        ← npm 包
    └── obsidian-plugin/  ← 插件源码，构建时读根目录的 manifest.json
```

npm 包 `mdmindmap` 只出 ESM，`engines` 写 Node ≥ 20.19。它有以下几个入口：

| 入口 | 内容 | 能否在 Node 中使用 |
|---|---|---|
| `mdmindmap/parse` | `parse()`：块级解析、行内解析、诊断 | 可以，不碰 DOM、零依赖 |
| `mdmindmap` | `render()`：测量、排版、HTML 节点、SVG 连线层、交互、导出 | 只能在浏览器中使用 |
| `mdmindmap/katex` | web 端的公式对象。KaTeX 和 mhchem 是可选依赖，只有引用这个入口时才会加载 | 只能在浏览器中使用 |
| `mdmindmap/style.css` | 样式，由宿主引入；运行时不注入 `<style>` | — |
| `bin: mdmindmap` | `check`、`guide` 两个命令 | 可以 |

排版用 `@plait/layouts`，**版本锁定为 0.94.1**，并包在我们自己的排版接口后面，以后可以换掉实现或 fork。

插件 ID 为 `mdmindmap`，名称为 `MD Mindmap`，描述：`Render read-only mind maps from Markdown headings and lists, with summary braces, cross-branch relationships, colors and math.`

---

## 3. 源文语法

见**附录 A**。实现时要特别注意的几点：

- 代码块名是 `mdmindmap`，围栏行可以写 `height=500`。
- 行尾标记的完整形态是 `内容 [颜色] [折叠] [^id]`，三者**顺序任意**。
- 行尾的 `^token` 只有符合 `[A-Za-z0-9-]` 时才算节点ID，否则照常作为内容。这是为了 mhchem：`\ce{… H2 ^}` 里的 ` ^` 表示生成气体。
- 概要的标准写法是成对的 `{ … }`；单独写 `}` 也合法，不报任何提示。
- 联系区是源文末尾的 `%% … %%` 块，端点写**不带 `^`** 的节点ID。
- 转义统一用反斜杠。色块 emoji 前面有没有空格都算颜色。
- 整篇模式另有三条规则：非节点内容静默跳过；根节点的认定规则；联系区必须是文件的最后一个块。

行内 markdown 只认固定子集：`**粗体**`、`*斜体*`、`~~删除线~~`、`` `代码` ``、`==高亮==`、`[[双链]]`、`[[双链|显示文字]]`、`[文字](网址)`、`$公式$`。其余写法一律原样显示为文字。

---

## 4. 解析 API（`mdmindmap/parse`）

（来自「包拆分与对外 API」「解析器选型与语法错误提示」）

```ts
parse(source: string, options?: { document?: { title: string } }): {
  root: Node | null,
  relationships: Relationship[],
  diagnostics: Diagnostic[],
}

Node = {
  text: string,                // 去掉行尾标记、行首括号和行内 %% 注释；块级转义（\{ \} \^ \🔴）已去掉反斜杠，行内 markdown 的转义原样保留
  inline: Inline[],            // 行内解析结果（不碰 DOM）
  line: number,                // 在源文中的行号，从 1 开始；整篇模式下用文件名作的根节点没有对应行，为 0
  id?: string, color?: PresetColor, fold: boolean,
  children: Node[],
  summaries: { from: number, to: number, node: Node }[],   // from、to 是 children 的下标
}
Relationship = { from: string, to: string, style: 'solid' | 'dashed' | 'thick', label?: string, line: number }
Diagnostic   = { line: number, severity: 'error' | 'warning' | 'hint', code: string, message: string, fix?: string }
```

- 传了 `document` 就进入**整篇模式**，`title` 用于「根节点取文件名」那条规则。字段名在实现时可以微调，但 `parse` 和 `render` 必须保持一致。
- 块级解析按行手写，行内解析也手写。行内的优先级：代码和公式最先识别（里面的内容当原文），其次是双链和链接，最后是粗体、斜体、删除线、高亮。`$` 的判定与 Obsidian 一致：开头的 `$` 后面不能是空格；结尾的 `$` 前面不能是空格，后面不能紧跟数字。
- 行号一律相对源文。代码块模式下，由宿主换算成文件中的行号。
- `code` 是稳定的英文名，属于公开 API；`message` 和 `fix` 用中文写。

---

## 5. 诊断

**出错时尽量渲染**：能解析的部分照常画出，导图角落显示「⚠ N」，点开会列出问题，点某一条可以跳到对应的行。只有一个节点都没有时，才显示错误面板。

三个级别的含义：
- **error**：写下的东西没有按本意显示（被丢掉了，或挂错了地方）。
- **warning**：多半不是本意，但已经按合理的方式处理并显示了。
- **hint**：不影响显示的建议。

| 级别 | code | 情况 | 导图怎么显示 | `fix` 要点 |
|---|---|---|---|---|
| error | `NO_NODES` | 一个节点都没有 | 显示错误面板 | 用 `# 根` 加 `- ` 列表来写 |
| error | `MULTI_ROOT` | 代码块里有多个顶层节点 | 多出的挂到第一个根下面 | 加 `# 标题` 作根，或把其余节点缩进到根下 |
| error | `ID_DUP` | 节点ID重复 | 后出现的不算ID | 改成不重复的ID |
| error | `SUM_NO_SIBLINGS` | `}` 前没有可括的兄弟 | 当普通节点显示 | 如果上一层节点以 `{ ` 开头，要专门提示：「`{` 写在了父节点上，应该写在第一个被括住的兄弟上，并与 `}` 同级」 |
| error | `SUM_OPEN_UNCLOSED` | `{` 没有配对的 `}` | 忽略这个 `{` | 在范围内最后一个兄弟之后加 `- } 总结文字` |
| error | `SUM_DOUBLE_OPEN` | 同一层连续出现两个 `{` | 以后一个为准 | 每个 `{` 都要配一个 `}` |
| error | `REL_UNKNOWN_ID` | 联系端点不存在 | 这条联系不画 | 端点恰好是某个节点的文字时，提示「请给该节点加 `^id` 再引用」；与某个已有ID只差几个字母时，提示「是不是 `xxx`？」 |
| error | `REL_SELF` | 起点和终点相同 | 不画 | 删掉或改正端点 |
| error | `REL_UNPARSED` | 联系块里有无法解析的行 | 忽略 | 写明正确格式；箭头写错（如 `->`）时专门指出 |
| error | `REGION_UNCLOSED` | `%%` 块没有闭合 | 之后的内容全部忽略 | 补上结尾的 `%%` |
| error | `REGION_NOT_LAST` | 含联系的 `%%` 块后面还有内容 | 代码块模式：后面的内容忽略；整篇模式：这个块当普通注释 | 把联系块移到最末尾 |
| warning | `NON_NODE_LINE` | 代码块里出现非节点行（只在代码块模式下报） | 忽略 | 节点要写成 `- ` 列表项或标题 |
| warning | `SUM_EMPTY` | `- }` 后面没有总结文字（2026-10-03 经用户同意新增） | 画出空的概要节点 | 在 `}` 后面写上总结文字 |
| warning | `REL_OUTSIDE_REGION` | 像联系的行写在了 `%%` 块外面 | 忽略 | 移到文末的 `%%` 块里 |
| warning | `ID_INVALID` | 行尾有 `^期望` 这类含非法字符的ID | 当作内容显示 | ID 只能用英文字母、数字和 `-` |
| warning | `MATH_ERROR` | 公式渲染失败（只有 `check` 会报） | — | 附上 KaTeX 的出错信息 |
| hint | `ID_NOT_LAST` | `^id` 不在行尾（只在整篇模式下报） | 正常 | 移到行尾，才能被其他笔记引用 |

解析器**不设宽松接受清单**，重点放在精准报错：报出行号、原因和改法。

---

## 6. 渲染 API（`mdmindmap`）

（来自「包拆分与对外 API」，以及「实时预览与阅读视图中的交互和代码块尺寸」「样式与主题」对它的修订）

```ts
const mm = render(container: HTMLElement, source: string, {
  layout?: 'logic' | 'bilateral',                  // 默认 'logic'
  document?: { title: string },                    // 整篇模式
  math: {
    render(tex: string): HTMLElement,
    flush?(): void | Promise<void>,                // 一批公式渲染完、测量之前调用（对应 Obsidian 的 finishRenderMath）
    exportCss?(): Promise<string>,                 // 导出时要内联的字体和样式
  },
  interaction?: 'click-to-activate' | 'direct',    // 默认：给了 height（嵌入）时 click-to-activate，否则 direct
  height?: number | 'auto',                        // 不给时占满容器高度；给了才有底边拖动调整
  onNodeClick?: (node) => void,                    // node 带 line 字段
  onLinkClick?: (target: string, event) => void,   // 没传时，双链只显示样式、不可点击
  onNodeMenu?: (node, position) => void,           // 右键或长按节点；菜单由宿主弹出
  onDiagnostics?: (diagnostics) => void,         // render() 返回之后调用一次
  onDiagnosticClick?: (diagnostic) => void,       // 在问题列表里点某一条（实现时新增）；宿主用 diagnostic.line 跳到源码
});

mm.ready                         // Promise：字体加载完并首次画完时完成
mm.diagnostics
mm.update(source)                // 增量更新，保留视口和折叠状态
mm.fit()                         // 缩放并居中让整张图可见（最大 100%）
mm.setLayout(layout)
mm.collapseAll(depth?)           // 折叠深度 ≥ depth 的节点（默认 1：只留根和一级分支），然后 fit；返回 Promise
mm.revealLine(line, { flash? }) // 把源文第 line 行的节点移进视野并高亮（实现时新增，供「跟随编辑」用）；flash: "always" | "moved"
mm.exportSvg(): Promise<string>
mm.exportPng({ scale?, maxSide? }): Promise<Blob>
mm.destroy()
```

- `render` **同步返回实例**：Obsidian 的代码块处理器需要立刻拿到实例，才能注册清理。
- **没有 `maxNodeWidth` 选项**。最大宽度由 CSS 变量决定，见 §9。
- 外部链接在新窗口打开。
- 节点的身份由「从根到该节点的文字路径」确定。`update()` 后靠它来保留折叠状态、复用尺寸缓存。

---

## 7. 渲染流水线与实现约束

（来自「自建渲染还是复用现有库」「排版引擎与节点渲染原型验证」）

流水线是：**用 DOM API 构造节点内容（不用 innerHTML）→ 离屏测量 → 排版 → 定位 HTML 节点 → 画 SVG 连线层**。屏幕显示不用 SVG `foreignObject`，也不用 canvas。

1. **测量**：节点先插到离屏容器里，强制计算一次样式，`await document.fonts.ready` 之后再测量。尺寸缓存的键是「内容 + 样式类」。测量前要先调用 `math.flush()`。
2. **宽公式**：遇到不能换行的宽公式（比如长化学方程式），检测到溢出后，按内容的实际宽度放宽节点，再测一次高度。
3. **排版数据映射**：每个概要作为 `{ start, end }` 节点，追加到父节点 `children` 的末尾。bilateral 结构用 `rightNodeCount` 决定右侧有几个分支，**切分点不能落在任何概要的范围内部**。
4. **画布交互**：禁止选中文字，并拦截原生 `dragstart`，否则拖动会被浏览器的原生拖放打断。复制节点文字的需求由节点菜单代替（§8）。
5. **定位**：不能直接写 `el.style`（违反 Obsidian 审查规则），改用 CSS 自定义属性（`setProperty('--…')`）之类的允许做法。
6. **性能目标**（原型实测）：1000 个节点首次渲染约 60 ms；300 个节点 60 fps；1000 个节点电脑 43 fps、安卓 93 fps；折叠后重排加重绘 ≤ 10 ms，被点的节点原地不动。v1 不做「视口外不渲染」。

---

## 8. 交互

（来自「实时预览与阅读视图中的交互和代码块尺寸」）

- **点击激活**（`click-to-activate`，嵌入笔记时的默认值）：激活前，导图不响应滚轮和拖动，滚轮和手指滑动都交给笔记。点一下导图即激活，之后的行为与 `direct` 相同：滚轮缩放，拖动或单指平移，双指缩放。点导图外面、按 Esc，或导图可见部分不足 30% 时，退出激活。
- **`direct`**：始终直接操作，用于全屏视图、整篇文件视图和 web 端。
- **折叠**：节点上有折叠按钮，折叠后显示子节点数。源文里的 `<!-- fold -->` 决定默认折叠哪些节点。运行时的折叠状态不持久化。
  - 按钮位于分支的出发点（下划线式节点在下划线末端，其余在侧边中点）；展开状态的按钮平时隐藏，悬停才显示，没有悬停的触屏设备一直显示。按钮上的数字是被折叠的后代总数（含概要节点）。
- **首次显示**（实现时补充）：能以 ≥ 60% 的缩放放下整张图就 fit；否则按 60% 显示，根节点靠左（bilateral 时水平居中）、上下居中。`fit()` 不受这个下限影响。
- **节点菜单**：右键或长按（550 ms）节点时调用 `onNodeMenu`。安卓上长按会同时触发计时器和系统的 `contextmenu`，要防止菜单弹出两次。
- **自动高度**（`height: 'auto'`）：渲染前同步算好，避免页面跳动。高度 = 可见叶子数 × 26 + 40，限制在 220–600 px 之间，折叠的分支不计入。拖动导图底边可以调整高度，但不写回源文。
- **`update()` 增量更新**：路径和文字都没变的节点，直接复用元素和尺寸，只测量新增或改动过的节点。新画面画好之前，旧画面一直保留。更新后，按离视口中心最近的节点重新对齐视口，用它的**左侧中点**对齐（原型用左上角，节点变大后位置会漂移），缩放不变。

---

## 9. 样式与主题

（来自「样式与主题：CSS 变量约定与明暗跟随」）

**公开 API** = 下面列出的 CSS 变量，加上三个稳定的选择器属性 `data-depth`、`data-color`、`data-summary`。类名（前缀 `.mdmm-`）和其余 DOM 结构都属于内部实现。

| 类别 | 变量 |
|---|---|
| 基础色（由宿主提供） | `--mdmm-font`（默认 `inherit`）、`--mdmm-bg`（也是导出时的背景）、`--mdmm-text`、`--mdmm-text-muted`、`--mdmm-accent`、`--mdmm-link`、`--mdmm-red` / `orange` / `yellow` / `green` / `blue` / `purple` / `gray` |
| 派生色（用 `color-mix()` 算出默认值，可覆盖） | `--mdmm-branch`（约 35%）、`--mdmm-brace`（同 branch）、`--mdmm-l1-fill`（约 8%）、`--mdmm-summary-fill`（约 14%）、`--mdmm-relation`（同 accent）、`--mdmm-color-fill-amount`（20%） |
| 尺寸 | `--mdmm-{root,l1,node,summary}-{font-size,padding,radius}`、`--mdmm-node-max-width`（240px）、`--mdmm-root-max-width`（280px）、`--mdmm-line-height`、`--mdmm-branch-width` |

派生色括号里的百分比，指正文色混进背景色的比例。变量名一经发布就是 API；具体数值在实现时可以调整。

**节点的样子**（按参考截图，XMind 风格）：
- 根节点：粗体大字，没有边框。
- 一级分支：圆角色块。
- 二级及更深：下划线式，即文字下面一条横线，横线与连线接在一起。连线接在节点**底边**。
- 概要节点：填底色的圆角框。
- **预设颜色**：浅底加彩色边框，文字仍用正文色。浅底 = `color-mix(颜色 var(--mdmm-color-fill-amount), var(--mdmm-bg))`。有颜色的节点不论在哪一层，都画成色块。

**web 端**：默认跟随 `prefers-color-scheme`。在任意外层元素上加 `data-mdmm-theme="light" | "dark"` 可以强制某一种。7 个颜色采用 Radix Colors 的色阶：亮色用第 9 阶，暗色用对应暗色色阶的第 9 到 10 阶。背景和文字：亮色 `#ffffff` / `#1f2328`，暗色 `#1e1e1e` / `#dcddde`。

**Obsidian 端**只映射基础色：

| `--mdmm-*` | Obsidian 变量 |
|---|---|
| font | `--font-text` |
| bg | `--background-primary` |
| text | `--text-normal` |
| text-muted | `--text-muted` |
| accent | `--interactive-accent` |
| link | `--link-color` |
| red … purple | `--color-red` … `--color-purple` |
| gray | `--color-base-50` |

---

## 10. 导出

（来自「自建渲染还是复用现有库」「排版引擎与节点渲染原型验证」「样式与主题」）

- **PNG 为主**，做法是 DOM → SVG `foreignObject` → canvas，长边上限 16000 px。**SVG 尽力而为**：节点以 foreignObject 内嵌 HTML，浏览器能看，矢量编辑软件不保证能打开。
- 导出用**当前看到的主题**。
- 导出前必须**先把每个 `--mdmm-*` 变量算出实际值**，再写进导出的样式。Obsidian 的变量定义在 `body` 上，不这样做，导出的图离开 Obsidian 后就没有颜色。
- 公式字体要内联：web 端把 KaTeX 字体转成 woff2 data URL；Obsidian 端处理 MathJax 的字体。两种都通过 `math.exportCss()` 提供。
- **触发与保存**（实现时决定）：
  - web 端：核心库只提供 `exportSvg()` 和 `exportPng()`，由宿主决定怎么触发、存到哪里（演示页用下载）。
  - Obsidian 端：嵌入导图右上角的小工具栏有「导出」按钮（弹出 PNG / SVG 菜单）；整篇文件视图和全屏标签页的标题栏按钮、「更多选项」菜单里也有。文件存进 Obsidian 的附件文件夹（`fileManager.getAvailablePathForAttachment`，遵循用户的附件设置，重名时自动加序号），文件名「<笔记名> 导图.png」，完成后弹出提示，显示保存路径。

---

## 11. 命令行工具

（来自「包拆分与对外 API」「解析器选型与语法错误提示」）

- `mdmindmap check <文件…> [--json]`：自动识别两种文件：整篇 `.md` 文件（按整篇模式解析），以及含 `mdmindmap` 代码块的文件（逐块解析，行号换算成文件行号）。它会额外用 KaTeX + mhchem 试渲染每个公式，失败时报 `MATH_ERROR` 警告。`--json` 输出的结构与 `parse()` 的 `diagnostics` 相同。有 error 时退出码不为 0。
- `mdmindmap guide`：打印附录 B 的写作说明。

---

## 12. Obsidian 插件

（来自「Obsidian 插件 API 对本需求的支持情况」「整篇 .md 作为导图的识别与打开方式」「实时预览与阅读视图中的交互和代码块尺寸」）

**代码块**
- 用 `registerMarkdownCodeBlockProcessor('mdmindmap')` 注册，阅读视图和实时预览都会生效。处理器会被反复调用，所以渲染必须幂等。资源挂在 `MarkdownRenderChild` 上，随元素卸载而清理。
- 公式用宿主的 `renderMath` 和 `finishRenderMath`（MathJax 自带 mhchem），**不打包 KaTeX**。
- 在整个导图部件上（包括外围工具栏）拦截 `mousedown`、`pointerdown`、`click`、`dblclick` 的冒泡，防止实时预览把导图换成源码。
- 右上角有「在新标签页打开」按钮，用自定义 `ItemView` 全屏显示这张导图，交互模式为 `direct`。

**跳转源码**
- 先用 `ctx.getSectionInfo(el)` 拿到代码块的位置，文件行号 = 围栏所在行 + 节点在源文中的行号。拿不到位置时（嵌入、悬停预览、Canvas 等情况会返回 null），禁用跳转。
- 跳转步骤：切到编辑模式，调用 `view.setEphemeralState({ line })`，等一帧，再 `setCursor`，并居中 `scrollIntoView`。

**节点菜单**：用 Obsidian 的 `Menu`，菜单项为「复制节点文字」「跳到源码」「复制块引用」。最后一项只在整篇模式、且节点有 `^id` 时可用。

**双链**：用 `createEl` 构造 `a.internal-link`，点击时调用 `openLinkText`，悬停预览用 `registerHoverLinkSource` 加 `hover-link` 事件。代码块里的双链不进入 Obsidian 的索引（没有反链，改名时不会更新），这是已知限制。

**整篇文件视图**
- 任何 `.md` 都可以通过命令、文件菜单（`file-menu`）、视图菜单（`onPaneMenu`）在**同一个标签页**里切换成只读的 `TextFileView`。视图右上角有按钮可以切回文档。
- 点节点：桌面端在旁边分屏打开编辑器（`getLeaf('split')`）并定位到那一行，之后复用这个分屏；手机端在当前标签页切回编辑视图再定位。
- 编辑时监听 `editor-change`，停止输入约 300 ms 后刷新。

**分屏编辑时保持状态**
- 旧的代码块元素卸载时，不立刻销毁导图，而是放进**交接池**，保留 2 秒。新元素挂上页面后，如果「同一分屏、同一文件、第几个 `mdmindmap` 代码块」都对得上，就接手旧实例：把它的 DOM 移过来，再调用 `update(source)`。找不到时新建实例。
- **跟随编辑**：被编辑的行落在另一个分屏的某张导图里，而对应节点不在视野内时，用最小的平移把它移进视野，并短暂高亮。

**命令**：「以导图打开当前文件」「复制 AI 写作说明」「新建导图」。导出不做成命令，入口见 §10。

**新建导图**
- 在 `getNewFileParent` 给出的文件夹里建「未命名导图.md」，重名时加序号。内容是设置里的 frontmatter（可选）加上 `# 文件名` 这个根节点标题。
- 在新标签页里用编辑器打开，并选中根节点文字。桌面端再在右侧分屏打开导图视图；手机端不分屏。
- 设置页只有一项「新建导图的 frontmatter」，默认为空。插件不认识也不解读这些字段。用途举例：填 `disabled rules: [all]`，Linter 插件就会跳过导图文件。

**界面文字**：跟随 Obsidian 的语言设置，提供中文和英文两套。诊断信息和 AI 写作说明只有中文。

**样式**：`styles.css` = 核心库的 `style.css` + §9 中的 Obsidian 变量映射。v1 不提供样式设置。

**审查约束**（`eslint-plugin-obsidianmd`）：不用 `innerHTML`；不直接写 `el.style`；不长期持有 view 的引用；用 `activeDocument`；不用 Node 或 Electron 的 API；不用正则的后行断言；不做遥测；所有资源都内联进 `main.js` 和 `styles.css`。

---

## 13. 工程

（来自「工程与发布」）

- **构建**：npm 包用 tsdown，插件用 esbuild（打包核心库源码，产出单个 `main.js`）。根目录的 `build` 脚本构建全部内容。
- **`npm run dev`**：监听文件变化并重新构建。设置了 `OBSIDIAN_PLUGIN_DIR` 时，把 `main.js`、`manifest.json`、`styles.css` 直接写进这个目录。
- **测试**：用 Vitest。
  - 解析器：每个 `fixtures/**/*.md` 交给 `parse()`，结果与相邻的 `.json` 快照比对。样例分三组：`fixtures/spec/`（附录 A 的样例）、`fixtures/ai-trial/`（分支 `prototype/ai-generation-trial` 下 `trial/out/` 和 `trial/out-v2/` 中的 40 份输出）、`fixtures/diagnostics/<CODE>.md`（每个诊断 code 一份最小样例）。
  - 排版包装层：在 Node 里用假尺寸测。
  - 渲染器：在 Vitest 浏览器模式（Playwright + Chromium）里做几何断言。v1 不做像素截图对比。
- **代码规范**：两个包都开 TypeScript 严格模式，都接入 `eslint-plugin-obsidianmd` 的 recommended 配置，格式化用 Prettier 默认配置。`npm run check` = lint + 类型检查 + 测试 + 构建。**不配 CI**。代码目前放在自建的 Gitea 上。
- **版本**：npm 包和插件共用一个版本号，从 `0.1.0` 开始，实验期一直保持 `0.x`。`npm run release <版本号>` 的步骤：把版本号同步写进两个 `package.json`、`manifest.json`、`versions.json`；跑 check；打上不带 `v` 的标签。到这里停下，**发布全部手动**。实验期插件靠手动复制文件安装，npm 暂不发布。

---

## 14. 交给实现阶段的细节和已知风险

下面这些不影响公开 API，实现时自行决定（2026-10-03 与用户确认）：
- **连线绘制**：分支曲线的样式、概要括号的画法、联系线的路径与避让（跨很多分支的长联系线会穿过节点），以及 bilateral 结构下的左右分配（原型按子树节点数均分，切分点不能落在概要范围内部）。
- **导出的触发与保存**：在 web 和 Obsidian 里分别怎么触发、存到哪里。
- **大图性能优化**：v1 一次性画出全部节点。
- **运行时折叠状态是否持久化**。

**暂缓的风险：iOS（WebKit）**。WebKit 下的渲染表现、foreignObject 导出 PNG 是否被禁止、canvas 约 1670 万像素的上限，都还没有验证。安卓版 Obsidian 与 Chrome 同一内核，已经实测可用。
