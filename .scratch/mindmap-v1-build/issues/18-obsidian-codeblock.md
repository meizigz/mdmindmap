# Obsidian 插件：代码块渲染

Status: claimed
Blocked by: 13, 14
Spec: [spec.md](../spec.md) §12「代码块」「样式」「审查约束」

## 要做什么

- 用 `registerMarkdownCodeBlockProcessor('mdmindmap')` 注册，阅读视图和实时预览都会生效。渲染要幂等；挂在 `MarkdownRenderChild` 上，随元素卸载而清理。
- 公式对象用 `renderMath` 和 `finishRenderMath`。
- 嵌入时用 `interaction: 'click-to-activate'`。读取围栏行上的 `height=`，没写时用 `'auto'`。
- 在整个部件上（包括外围工具栏）拦截 `mousedown`、`pointerdown`、`click`、`dblclick` 的冒泡。
- 在 `styles.css` 中加入 §9 的 Obsidian 变量映射。
- 界面文字准备中、英两套，跟随 Obsidian 的语言设置。

## 验收

- `npm run lint` 中，`eslint-plugin-obsidianmd` 不报错。
- **需要用户在 Obsidian 中实测**（电脑 + 安卓）：阅读视图和实时预览都能渲染；点导图不会变成源码；切换明暗主题后颜色跟着变；公式正常显示。
- `npm run check` 通过。

## Comments

**2026-10-03 代码完成，等待用户在 Obsidian 中实测**（Claude）。`npm run lint` 中 `eslint-plugin-obsidianmd` 没有报错，构建产出的 `main.js` 约 56 KB。

- **文件**：
  - `src/main.ts`：先 `loadMathJax()`，再注册 `mdmindmap` 代码块处理器。
  - `src/block.ts`：`MarkdownRenderChild`，`onunload` 时销毁导图。
  - `src/math.ts`：`renderMath` 加 `finishRenderMath`。
  - `src/fence.ts`：解析围栏行上的 `height=`，并算出这是文件里第几个 mdmindmap 代码块（给「分屏编辑时保持状态」用），有单元测试。
  - `src/i18n.ts`：中英两套界面文字，用 `getLanguage()` 判断语言，后续工单的菜单和命令文字都已放进去。
  - `src/styles.css`：§9 的 Obsidian 变量映射，外加嵌入导图的边框和间距。
- **嵌入的导图**：`interaction: "click-to-activate"`；围栏写了 `height=` 就用这个高度，否则用 `"auto"`。
- **拦截冒泡**：在整个部件（`.mdmindmap-block`）上用 `registerDomEvent` 拦住 `mousedown`、`pointerdown`、`click`、`dblclick` 的冒泡，所以插件卸载时监听会自动清理。核心库在 document 上的捕获阶段监听（点外面退出激活）不受影响。
- 跳转源码、节点菜单、双链由「跳转源码、节点菜单与双链」工单补上；交接池由「分屏编辑时保持状态」工单补上。

**待实测**：电脑和安卓上，阅读视图和实时预览都能渲染；点导图不会变成源码；切换明暗主题后颜色跟着变；公式正常显示。
