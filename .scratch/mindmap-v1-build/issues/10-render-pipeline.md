# 渲染流水线、节点样式与概要括号

Status: resolved
Blocked by: 03, 04, 09
Spec: [spec.md](../spec.md) §6、§7、§9

## 要做什么

- `render()` 同步返回实例，`ready` 在首次画完后完成；`destroy()` 清理所有监听。
- 根据 `Inline[]` 用 DOM API 构造节点内容（不用 innerHTML）。公式交给 `math.render`，测量前调用 `math.flush()`。
- 离屏测量：先等 `document.fonts.ready`；尺寸缓存的键是「内容 + 样式类」。
- HTML 节点绝对定位（用 CSS 自定义属性定位，不直接写 `el.style`），加上 SVG 层画分支线和概要括号。本工单只做 logic 结构。
- `style.css` 包括：§9 的全部变量和派生色、各层级节点的样子、预设颜色、web 端的明暗切换、`data-depth` / `data-color` / `data-summary` 属性。
- 禁止选中文字；拦截 `dragstart`。
- 做一个只用于手动查看的 web 演示页，不发布。

## 验收

- 浏览器模式中的几何断言：节点不重叠；概要括号覆盖到其范围内首尾两个兄弟的上下边；下划线式节点的连线接在底边。
- 在 `data-mdmm-theme="dark"` 下，颜色变量会切换。
- 用 300 个节点的样本（`trig.sample.md` 或生成的数据）测首次渲染时间，与原型（每千节点约 60 ms）在同一量级。
- `npm run check` 通过。

## Comments

**2026-10-03 完成**（Claude）。`render()` 能画出 logic 结构的节点、分支线、下划线和概要括号，暗色主题也可用。`npm run check` 通过，共 197 条测试，其中 9 条是浏览器几何测试。三条验收都已满足：
- 牛顿样例和参考截图样例节点不重叠，概要括号覆盖到首尾兄弟，下划线式节点的连线接在底边、下划线与节点同宽。
- `data-mdmm-theme="dark"` 下变量和连线颜色都会切换。
- 300 个节点的首次渲染约 9 ms（测试用的是公式占位渲染器）。

另外用 Playwright 截图人工看过：牛顿和截图样例的亮色、暗色，带颜色的节点，以及 bilateral（作为提前预览）。

**结构**（`src/render/`）：
- `dom.ts`：用 `ownerDocument` 创建元素，`setVars()` 写 CSS 自定义属性。
- `content.ts`：根据 `Inline[]` 构造节点内容；同时定义 `MathRenderer` 接口。
- `draw.ts`：SVG 连线层。
- `index.ts`：`render()` 和实例。实例目前只有 `ready`、`diagnostics`、`destroy()`，其余方法由后续工单补上。

**实现中做出的决定和发现**：
- **定位方式与 Obsidian 审查规则**：`obsidianmd/no-static-styles-assignment` 只拦**字面量**取值；规则源码写明，从变量或模板字符串取值是允许的。所以 `el.style.setProperty("--mdmm-x", \`${x}px\`)` 合规。这条规则**不允许**用注释关掉（`eslint-comments/no-restricted-disable`），以后的工单都要按这种方式写。核心库关掉了 `prefer-create-el`（配置层面，只是警告）：web 端没有 Obsidian 的全局 `createEl`，统一用 `ownerDocument.createElement`，在 Obsidian 的弹出窗口里也正确。
- **节点高度也要固定**：测量值向上取整后交给排版，但节点如果按自然高度渲染，下划线会比节点底边低零点几像素（浏览器测试发现的）。现在宽高都通过 `--mdmm-w` / `--mdmm-h` 固定成排版用的尺寸。
- **下划线式节点**：由渲染器判定，条件是二级及更深、不是概要、没有颜色；加内部类 `mdmm-node-underline`，不新增公开的选择器属性。下划线画在 SVG 层，和分支线同色同粗，所以能无缝接上。
- **bilateral 的根节点**：分支从根的左右两侧出发，不从中心出发。原型的根有底色，从中心出发看不出问题；我们的根没有底色，线会穿过文字。
- **预设颜色的边框**用 `inset box-shadow`，不改变盒子尺寸。黄色用 Radix 的 amber 9（`#ffc53d`）：Radix yellow 9（`#ffe629`）作为白底上的边框几乎看不见。
- **折叠**：带 `<!-- fold -->` 的节点，子节点不创建也不排版，折叠按钮由「平移缩放、点击激活与折叠」工单补上。视口目前只做了「内容左上角离画布边 24px」，平移、缩放和 `fit()` 也在那张工单里。
- **演示页**：`npm run demo` 会用 Vite 打开 `packages/mdmindmap/demo/`，不发布。它可以选择 fixtures 里的任意样例、切换结构和主题，并列出诊断；公式暂时直接用 KaTeX，「web 公式入口」完成后改用 `mdmindmap/katex`。
- **测试环境**：浏览器测试用 `?raw` 导入样例。浏览器项目预先打包了 `@plait/layouts`，避免 Vite 重新加载测试。`tsconfig` 加入了 `vite/client` 类型。
