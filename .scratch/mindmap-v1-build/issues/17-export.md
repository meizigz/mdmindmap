# 导出 SVG 与 PNG

Status: resolved
Blocked by: 11, 12
Spec: [spec.md](../spec.md) §10

## 要做什么

- `exportSvg()`：
  - 克隆当前的导图，节点用 foreignObject 内嵌。
  - 把所有 `--mdmm-*` 变量算出实际值，写进内联样式。
  - 加入 `math.exportCss()` 返回的样式。
  - 背景用 `--mdmm-bg`。
- `exportPng({ scale?, maxSide? })`：SVG → canvas → Blob，长边默认上限 16000 px。
- 导出的是整张导图，不只是视口内的部分，并按当前的折叠状态。

## 验收

- 在电脑 Chrome 和安卓 Chrome 中，导出含公式、化学式、中文、颜色、概要和联系的图，PNG 显示正确。
- 把导出的 SVG 放进 `<img>` 单独打开，颜色正确（说明变量已经算成实际值）。
- `npm run check` 通过。

## Comments

**2026-10-03 完成**（Claude），安卓手动验收待用户确认。`src/render/export.ts`。共 6 条浏览器测试，全仓库 `npm run check` 通过（252 条测试）。

**验收**：
- **电脑 Chrome**：Playwright 驱动 Chromium，导出了电磁感应样例的暗色 PNG。公式、化学式、中文、预设颜色、概要括号、联系线和标签、折叠数字都正确。
- **安卓 Chrome**：需要用户手动验证。演示页新增了「导出 PNG」「导出 SVG」按钮，运行 `npm run demo -- --host` 后用手机打开即可。
- **变量已写成实际值**（测试证明）：宿主用 `.host .mdmm { --mdmm-bg: … }` 改了颜色，导出的 SVG 放进 `<img>` 单独打开时，背景像素仍是宿主的颜色（这时宿主的规则已经不在了）。

**做法**：
- **SVG**：克隆 stage，去掉视口的平移和缩放（设为 1，内容放在离边 24px 处），去掉展开状态的折叠按钮（折叠的数字保留）。外面包一层 `div.mdmm.mdmm-export[data-export]`，放进 `foreignObject`。
- **样式**：先收集页面上所有含 `mdmm` 的 CSS 规则（跨域又没有 `crossorigin` 的样式表读不到，跳过）。然后用选择器 `.mdmm.mdmm-export[data-export]` 写一条规则，把每个 `--mdmm-*` 主题变量的**计算值**和实际的 `font-family` 钉住；它比任何主题规则都更具体，所以暗色媒体查询、`data-mdmm-theme` 都不会在离开页面后改变颜色。最后附上 `math.exportCss()` 的结果（web 端内联 KaTeX 字体；Obsidian 端由插件提供 MathJax 的样式）。
- **背景**：画一个铺满的矩形，颜色取 `--mdmm-bg` 的计算值。导出用当前看到的主题。
- **PNG**：SVG 转成 data URL，用 `img.decode()` 解码后画到 canvas，再 `toBlob`。默认 2 倍；长边超过 `maxSide`（默认 16000）时整体缩小。
- 导出前会等排队中的刷新完成，所以导出的总是最新状态。
- **限制**：自定义变量的计算值里，`color-mix()` 会原样保留（浏览器不会把它算成具体颜色）。浏览器打开导出的 SVG 没问题，但矢量编辑软件可能不支持，spec 写明 SVG 是「尽力而为」。
