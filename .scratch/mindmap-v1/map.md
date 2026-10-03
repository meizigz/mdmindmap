# 地图：Markdown 驱动的只读思维导图库 v1

Label: wayfinder:map

## Destination

一份可直接开工的 **v1 规格**：语法定稿（节点 / 节点ID / 概要 / 联系 / 样式）、自建还是复用已决定、渲染与排版方案、包拆分与对外 API（核心库 + web + Obsidian 插件）都已确定，没有遗留需要先拍板的问题。

## Notes

- 领域术语以仓库根目录 [CONTEXT.md](../../CONTEXT.md) 为准（导图、源文、节点、节点ID、概要、联系、结构）。grilling 类工单同时调用 `grilling` 与 `domain-modeling` 技能。
- 参考样例：仓库根目录 `Snipaste_2026-10-03_08-58-50.jpg`（XMind 导图：含概要括号、跨分支虚线联系、红色高亮节点）。语法与排版方案都应拿它当试金石。
- 已定的前提（charting 时与用户确认）：
  - 只读渲染，**不做可视化编辑**；v1 交互 = 平移缩放、折叠展开、点击跳转源码行、导出 SVG/PNG、少量预设节点颜色。
  - 概要 = XMind 式（只括同一父节点下相邻兄弟；可多个、不重叠、不嵌套；概要节点可有子节点；任意层级）。不做多父节点 DAG。
  - 联系 = 有向，可带文字标签；用 mermaid 子集写法（`-->`、`-.->`、`==>`、`|标签|`），端点通过 Obsidian 风格 `^id` 节点ID 引用，统一写在源文末尾的区域。
  - 源文两种形态都要：` ```mdmindmap ` 代码块（主场景）+ 整篇 `.md`（独立视图打开）；扩展标记在普通 markdown 预览里只能是轻微噪音。
  - 结构 v1 只做 logic（向右）和 bilateral（左右）。
  - 节点内容：行内 markdown、`[[双链]]`、按最大宽度自动换行、行内 LaTeX 公式（含 mhchem 化学式）。
  - 核心库框架无关、TypeScript、`render(container, source, options)` 形式；规模按"一章一张、常规 ≤300、上限约 1000 节点"设计。
  - Obsidian：阅读视图 + 实时预览都渲染、支持移动端（不用 Node API）、跟随明暗主题。
  - MIT 开源，发布 npm 与 Obsidian 社区插件。
- 使用场景：用户用它整理**高中九科知识**（数理化公式多、概要后再分支常见）。所有方案以此为试金石。
- **主要写作方式是「AI 先生成，人工微调」**（2026-10-03 与用户确认）。AI 在外部生成（聊天窗口、Claude Code 等），本项目不调用任何模型。每张工单都要同时用两件事检验：AI 能不能稳定写对，人能不能顺手改。由此定下：
  - v1 必须有**不依赖 DOM 的解析与校验接口**（返回带行号和类别的结构化错误）和命令行工具 `mdmindmap check`，供 AI 生成后自己校验并修改。
  - v1 必须有一份**给 AI 看的写作说明**，随 npm 包发布；Obsidian 插件提供「复制 AI 写作说明」命令。
  - 对 AI 常见的写偏宽松接受并给出警告，具体接受哪些由实测决定。
  - 实测可以推翻已定的语法，但每一项都要先经用户同意。
- 用户态度：若有活跃、效果好的现成项目，可以直接拿来用，减少工作量是首要目标。

- **交接（2026-10-03）**：全部决策工单已解决，汇总后的 v1 规格见 [spec.md](../mindmap-v1-build/spec.md)，实现工单在 [mindmap-v1-build/issues/](../mindmap-v1-build/issues/)。

## Decisions so far

<!-- 每个已关闭工单一行 -->

- [现有思维导图渲染库能否直接复用](issues/01-existing-renderers.md)：无可直接复用的底座（只有 Plait 支持概要带子节点但太重）；推荐自建 SVG 渲染 + `@plait/layouts` 布局，退路是放弃"概要带子节点"改用 mind-elixir。
- [Obsidian 插件 API 对本需求的支持情况](issues/02-obsidian-plugin-api.md)：公开 API 可全部支撑（代码块两种视图、只读自定义视图、getSectionInfo 跳转、双链悬停）；主要风险是 iOS 上 SVG foreignObject 渲染 bug、`^id` 仅限 `[A-Za-z0-9-]`、代码块内双链不入索引、`mindmap` 块名已被占用。
- [扩展语法候选方案对比](issues/03-syntax-candidates.md)：语法定稿见 [syntax-spec.md](syntax-spec.md)。概要用 `}`（可选起点 `{`；改为 AI 为主后，标准写法是成对的 `{ … }`）；颜色用行尾色块 emoji；折叠用 `<!-- fold -->`；联系写在文末 `%%` 注释块里，端点用裸ID；节点ID限 `[A-Za-z0-9-]`；代码块名 `mdmindmap`。
- [整篇 .md 作为导图的识别与打开方式](issues/05-whole-file-mode.md)：不用声明，任何 `.md` 都能通过命令或菜单在同一标签页切到只读导图，不做自动打开；非节点内容静默跳过；只有一个一级标题时它是根，否则用文件名；点节点在分屏编辑器中定位，手机上切回编辑视图；编辑时停止输入约 300ms 后刷新。
- [AI 生成实测与写作说明](issues/09-ai-generation-trial.md)：按写作说明（定稿见 [ai-authoring-guide.md](ai-authoring-guide.md)），Sonnet 和 Opus 20/20 无错误，Haiku 在 v2 说明下 9/10。语法只改一处：行尾标记顺序任意。解析器不设宽松接受清单，重点做精准报错；联系端点只能写ID。
- [排版引擎与节点渲染原型验证](issues/07-layout-render-spike.md)：可行。`@plait/layouts` 排版边界情况全部正确，1000 节点首次渲染约 60 ms；300 节点 60 fps，1000 节点电脑 43 fps、安卓 93 fps。Obsidian 自带 MathJax 支持 `\ce`。PNG 导出在 Chrome 和安卓可用。实现约束：宽公式要放宽节点、测量前等字体加载、禁止选中文字和原生拖放、导出时内联字体。iOS 暂缓。
- [包拆分与对外 API](issues/06-packages-and-api.md)：一个 npm 包 `mdmindmap`，按入口分为 `/parse`（不碰 DOM）、主渲染器、`/katex`、`/style.css`，命令行工具提供 `check` 和 `guide`；Obsidian 插件在同一仓库（npm workspaces）。行内 markdown 由核心库按固定子集解析，宿主只提供公式对象和双链回调；`render()` 同步返回实例并带 `ready`，`update()` 保留视口和折叠状态。
- [解析器选型与语法错误提示](issues/08-parser-and-errors.md)：块级和行内解析都手写（零依赖，行号精确）；出错时尽量渲染，角落列出问题；转义统一用反斜杠；`check` 额外用 KaTeX 检查公式；定下 16 个诊断 code，含针对弱模型常犯错误的专门提示；AI 实测样本收为回归测试。
- [实时预览与阅读视图中的交互和代码块尺寸](issues/10-live-preview-interaction.md)：嵌入的导图采用「点击激活」（激活前滚轮和滑动都交给笔记）；整个部件拦截鼠标事件的冒泡，防止实时预览把它换成源码；高度按叶子数自动估算，可选 `height=` 覆盖；跳转源码用 `setEphemeralState`；右键或长按节点弹出复制菜单；另一分屏编辑时，接手旧实例并增量 `update()`，保持缩放和折叠，并跟随被编辑的节点。API 的 `wheel` 改为 `interaction`。
- [自建渲染还是复用现有库](issues/04-build-vs-reuse.md)：自建；`@plait/layouts` 排版（锁版本、包一层）+ HTML 节点 + SVG 连线层；行内 LaTeX 含 mhchem 进 v1；导出以 PNG 为主；按 ≤300 常规 / ~1000 上限设计。
- [样式与主题：CSS 变量约定与明暗跟随](issues/11-styling-and-theme.md)：公开 API 是 `--mdmm-*` 变量（宿主只需提供少数基础色，其余用 `color-mix()` 派生）和 `data-depth` / `data-color` / `data-summary` 三个属性。节点样式照截图：根节点无框、一级圆角色块、更深层下划线式、概要节点填底；预设颜色 = 浅底 + 彩色边框。web 默认跟随系统明暗，可用 `data-mdmm-theme` 强制；Obsidian 映射到其主题变量，v1 不做样式设置；导出用当前主题。删掉 `maxNodeWidth` 选项，改用 CSS 变量。
- [工程与发布：构建、测试、发布流程与插件命名](issues/12-build-and-release.md)：代码先放自建 Gitea。根目录放插件的 `manifest.json`，根目录 `build` 构建全部；npm 包用 tsdown 构建、只出 ESM，插件用 esbuild 构建；测试用 Vitest（解析器用样例文件和快照，渲染器在浏览器模式里做几何断言）；两个包都接入 `eslint-plugin-obsidianmd`；不配 CI，全部手动发版，版本号同步；实验期手动复制插件文件、npm 暂不发。插件 ID 为 `mdmindmap`，名称为「MD Mindmap」。

## Not yet specified

- **iOS 真机验证**（用户决定暂缓）：WebKit 下的渲染、foreignObject 导出 PNG 是否被禁止、画布约 1670 万像素的上限。安卓版 Obsidian 与 Chrome 同一内核，已实测可用。

## Out of scope

- 可视化编辑（拖拽、在画布上改文字）——用户明确不做。
- 插件内置 AI 生成（调用模型、配置 API key）——AI 在外部生成，本项目只提供写作说明和校验工具。
- 多父节点汇合（DAG）布局——跨分支汇合只用联系表达。
- 组织结构图、时间线、鱼骨图等其他结构。
- 手绘风格渲染。
- 嵌套或重叠的概要。
- 节点内图片、多段文字——推迟到 v1 之后（见「自建渲染还是复用现有库」）。
- 兼容 Style Settings 插件、导出时可选亮色主题——推迟到 v1 之后（见「样式与主题：CSS 变量约定与明暗跟随」）。
- 以下几项**交给实现阶段**，不需要开工前定（2026-10-03 与用户确认：局部、改起来便宜，不影响公开 API）：
  - **连线绘制细节**：分支曲线样式、概要括号画法、联系线路径与避让（原型里跨很多分支的长联系线会穿过节点）、bilateral 下的左右分配（切分点不能落在概要范围内部，原型按子树节点数均分）。
  - **导出的触发与保存**：PNG（主）/ SVG 在 web 与 Obsidian 中如何触发、存到哪里。技术路线已验证（foreignObject → canvas，Chrome 和安卓可用）；Obsidian 端 MathJax 字体如何内联，实现时处理。
  - **大图性能**：一次性画出全部节点时，300 节点无需优化；1000 节点电脑 43 fps、安卓 93 fps。视口外不渲染等优化，等真实使用中遇到再做。
  - **折叠状态是否持久化**：源文里的默认折叠已定为 `<!-- fold -->`；运行时的展开/折叠要不要记住，以后再加也不影响别的部分。
