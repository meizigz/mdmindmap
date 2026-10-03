# 包拆分与对外 API

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: Claude (with pengyg)
Blocked by: 03, 04
Map: [map.md](../map.md)

## Question

核心库、web 用法、Obsidian 插件如何拆包（monorepo 下几个包、各自职责、解析器与渲染器是否分开）？核心库对外 API 具体长什么样：`render(container, source, options)` 的 options 项（结构、主题、最大节点宽度、事件回调如节点点击/双链点击）、返回的实例方法（更新源文、适配视口、导出 SVG/PNG、销毁）？

已知约束（来自「自建渲染还是复用现有库」）：节点内容渲染需要一个可替换的接口——web 端默认用行内 markdown + KaTeX(mhchem)，Obsidian 端换成宿主的 markdown/公式渲染；核心库只负责测量、排版与 SVG 连线层。排版引擎也藏在自己的接口后面。

已知约束（来自「整篇 .md 作为导图的识别与打开方式」）：解析要支持整篇模式（静默跳过非节点内容；根节点缺省时用调用方传入的标题），所以 API 需要一个「整篇模式 + 标题」选项。Obsidian 整篇视图在编辑时会按约 300ms 防抖频繁调用「更新源文」，所以更新要足够轻。

已知约束（来自「排版引擎与节点渲染原型验证」）：排版用 `@plait/layouts` 0.94.1，锁定版本，包在自己的排版接口后面；渲染流程是「渲染内容 → 离屏测量（等字体加载完）→ 排版 → 定位 HTML 节点 + 画 SVG 连线层」。节点内容渲染接口除了「渲染」，还要给出**导出用的 CSS 和字体**（web 端是 KaTeX 字体，Obsidian 端是 MathJax 的字体）。导出 PNG 走 SVG foreignObject → canvas，长边要封顶。

已知约束（AI 为主的写作方式，见地图 Notes）：解析与校验要能脱离 DOM 单独调用（Node 环境也能用），返回结构化错误（行号、类别、信息）；提供命令行工具 `mdmindmap check <文件>`，放在哪个包里由本工单决定；给 AI 看的写作说明随 npm 包发布；Obsidian 插件提供「复制 AI 写作说明」命令。

## Answer

与 pengyg 逐项确认（grilling 共两轮）。

**拆包**
- 一个 npm 包 `mdmindmap`（名字未被占用，与代码块名一致），按入口细分：
  - `mdmindmap/parse`：纯解析和校验，不碰 DOM，Node 里也能用。
  - `mdmindmap`：渲染器，负责测量、排版（`@plait/layouts` 0.94.1 锁版本，包在自己的接口后面）、HTML 节点、SVG 连线层、交互、导出。
  - `mdmindmap/katex`：web 端的公式对象，KaTeX + mhchem 作为可选依赖，只有引用这个入口才会加载。
  - `mdmindmap/style.css`：样式文件，由宿主引入，运行时不注入 `<style>`。
  - 命令行工具 `mdmindmap`：`check <文件…> [--json]` 校验源文，自动识别整篇 `.md` 和含 `mdmindmap` 代码块的文件；`guide` 打印给 AI 的写作说明，写作说明随包发布。
- Obsidian 插件是同一仓库里的另一个项目，直接引用 `mdmindmap` 的源码打包，样式并入插件的 `styles.css`，公式用宿主的 `renderMath`，不打包 KaTeX。
- 仓库用 npm workspaces：`packages/mdmindmap`、`packages/obsidian-plugin`。构建、测试、发布流程留在迷雾「工程与发布」。

**行内 markdown 由核心库自己解析**，范围是固定子集：`**粗体**`、`*斜体*`、`~~删除线~~`、`` `代码` ``、`==高亮==`、`[[双链]]` / `[[双链|显示文字]]`、`[文字](网址)`、`$公式$`。其余写法原样显示为文字（已写进规格和写作说明）。外部链接默认在新窗口打开；双链交给 `onLinkClick`，没传这个回调时双链只显示样式、不可点。宿主只需提供公式对象：

```ts
math: {
  render(tex: string): HTMLElement,
  flush?(): void | Promise<void>,      // 一批渲染完、测量之前调用（Obsidian 的 finishRenderMath）
  exportCss?(): Promise<string>,       // 导出时内联的字体和样式
}
```

**解析 API**：`parse(source, { document?, title? })` 返回：
- 树：节点带 `text`、`line`、`id`、`color`、`fold`、`children`、`summaries: [{ from, to, node }]`；
- `relationships: [{ from, to, style, label, line }]`；
- `diagnostics: [{ line, severity: 'error' | 'warning' | 'hint', code, message, fix }]`：`code` 是稳定的英文类别名，`message` 和 `fix` 用中文写。

`check --json` 输出同一份结构。具体有哪些 `code`、出错时导图还画不画，交给「解析器选型与语法错误提示」。

**渲染 API**（骨架，字段名实现时可以微调）：
```ts
const mm = render(container, source, {
  layout: 'logic' | 'bilateral',            // 默认 logic
  document?: { title: string },             // 整篇模式
  maxNodeWidth?: number,                    // 已删除，见下方后续修订
  math,                                      // 见上
  onNodeClick?: (node) => void,             // 带 line，Obsidian 用来跳转源码
  onLinkClick?: (target, event) => void,
  wheel?: 'zoom' | 'modifier' | 'none',     // 实时预览里避免和笔记滚动冲突
});
mm.ready                       // 字体加载完、首次画完
mm.update(source)              // 重新解析，复用尺寸缓存，保留视口和折叠状态（节点按「从根到它的文字路径」识别）
mm.fit(); mm.setLayout(l); mm.collapseAll(depth?)
mm.exportSvg(): Promise<string>; mm.exportPng({ scale?, maxSide? }): Promise<Blob>
mm.destroy()
```
- `render` **同步返回实例**：Obsidian 的代码块处理器需要立刻拿到实例来注册清理。
- 主题走 CSS 变量，细节留在迷雾「样式与主题系统」。

## 后续修订

- 2026-10-03：「实时预览与阅读视图中的交互和代码块尺寸」实测后，`wheel` 选项改为 `interaction: 'click-to-activate' | 'direct'`（嵌入时默认点击激活）；新增 `height?: number | 'auto'`、`onNodeMenu?: (node, position) => void`。
- 2026-10-03：「[样式与主题：CSS 变量约定与明暗跟随](11-styling-and-theme.md)」决定删掉 `maxNodeWidth` 选项，最大节点宽度改由 CSS 变量 `--mdmm-node-max-width` / `--mdmm-root-max-width` 决定。
