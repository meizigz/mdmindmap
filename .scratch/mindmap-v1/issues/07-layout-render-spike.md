# 排版引擎与节点渲染原型验证

Type: prototype
Label: wayfinder:prototype
Status: resolved
Assignee: Claude (with pengyg)
Blocked by: —
Map: [map.md](../map.md)

## Question

「自建渲染还是复用现有库」选定了 `@plait/layouts` 排版 + HTML 节点 + SVG 连线层。这套组合在真实场景下站得住吗？

用手写的数据结构（不依赖语法定稿）做一个粗糙原型，验证：
- `@plait/layouts` 对以下情况的排版是否可接受：样例截图那张图；概要节点带多层子节点；同一父节点下多个相邻概要；bilateral 下左侧分支上的概要；节点尺寸差异很大（长句换行 vs 短词）
- HTML 节点先测量再排版的流程是否顺畅；KaTeX + mhchem 公式节点尺寸测量是否准确
- 300 节点下首次渲染与平移缩放是否流畅
- Obsidian 内置 `renderMath` 是否支持 `\ce{}`（决定 Obsidian 端用宿主 MathJax 还是自带 KaTeX）
- PNG 导出（DOM → SVG foreignObject → canvas）在 Chromium 下公式与字体是否正确

产出：可行 / 需退回自写排版的结论，以及发现的约束。

## Context

- 原型：分支 `prototype/layout-render-spike` 的 `prototypes/layout-spike/`（commit eabd01a）。运行 `npm i && npm start`，底部可切换 8 个验证用例；右上角显示各步耗时和帧率。
- 用例：截图样例、牛顿（相邻概要、概要带子节点、折叠）、金属（多层概要子节点、概要里套概要、mhchem；向右和双向各一）、尺寸悬殊、AI 实测里 Opus 生成的三角函数整章（133 节点）、生成的 300 节点和 1000 节点大图。

## Answer

**可行，不需要退回自写排版。** `@plait/layouts` 0.94.1 只依赖 tslib，842 行，是 MIT 许可。与 pengyg 一起在电脑和安卓手机上实测确认。iOS 由用户决定暂缓。

| 验证项 | 结果 |
|---|---|
| 排版边界情况 | 全部正确：截图样例、概要带多层子节点、相邻概要、概要子节点里再套概要、双向结构下左侧分支的概要、长短悬殊的节点 |
| 先测量再排版 | 顺畅：离屏插入节点，强制样式计算后 `await document.fonts.ready` 再测量，字体加载后重排 0 次。KaTeX + mhchem 尺寸准确 |
| 性能 | 1000 节点首次渲染 50–70 ms（排版本身 3–5 ms）。300 节点：电脑 60 fps，最慢一帧 17 ms。1000 节点：电脑 43 fps，安卓 93 fps（最慢一帧 17 ms）。折叠后重排加重绘 ≤10 ms，被点的节点原地不动 |
| Obsidian `renderMath` 是否支持 `\ce{}` | 支持。本机 1.13.7 的 MathJax 编译进了 mhchem，用户也在 Obsidian 里实测通过 → Obsidian 端用宿主的 MathJax，不另外打包 KaTeX |
| PNG 导出（DOM → SVG foreignObject → canvas） | 电脑 Chrome 和安卓都成功，公式、化学式、中文、颜色、括号都正确。金属图 80–160 ms；1000 节点电脑 0.35 s、安卓 3 s，长边封顶 16000 px。SVG 导出同样可用 |

**发现的约束**（实现时必须遵守）：
1. **数据映射**：概要以 `{ start, end }` 节点追加在父节点 `children` 的末尾。双向结构用 `rightNodeCount` 决定右侧有几个分支，**切分点不能落在任何概要范围内部**。原型按子树节点数均分，正式规则见迷雾「连线绘制细节」中的左右分配。
2. **不能换行的宽公式**：比如长化学方程式。会撑出节点最大宽度，需要发现溢出后按内容实际宽度放宽节点，再量一次高度。
3. **测量依赖字体**：必须等字体加载完再测量。尺寸缓存的键用「内容 + 样式类」。
4. **画布交互**：必须禁止选中文字，并拦截原生 `dragstart`，否则在节点文字上拖动会被浏览器的原生拖放打断，表现为卡住、光标变成禁止图标。代价是不能直接在导图上选中复制节点文字。
5. **导出**：需要把公式字体内联进 SVG（KaTeX 用 woff2 data URL）。Obsidian 端用 MathJax 输出，导出时同样要处理它的字体。
6. **语法歧义**：mhchem 用 ` ^` 表示生成气体，`$\ce{… H2 ^}$` 的行尾会被当成节点ID。已决定：只有符合ID字符集的 `^token` 才算节点ID，其余照常作为内容（已改进规格）。
7. **联系的起点和终点不能是同一个节点**，要报错。
8. 原型用 `el.style` 直接写位置，这会违反 Obsidian 的审查规则；正式实现要改用 CSS 变量等允许的方式。
9. 跨很多分支的长联系线会穿过节点，看起来很乱（真实的 133 节点图里很明显），见迷雾「连线绘制细节」。
10. iOS（WebKit）没有测：foreignObject 导出、画布约 1670 万像素的上限、渲染表现都未知。用户决定暂缓，已放进迷雾。
