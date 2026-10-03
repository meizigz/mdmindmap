# 命令行工具 check 与 guide

Status: resolved
Blocked by: 03, 04, 06
Spec: [spec.md](../spec.md) §11

## 要做什么

- `mdmindmap check <文件…> [--json]`：
  - 自动识别整篇 `.md` 文件和含 `mdmindmap` 代码块的文件，行号换算成文件中的行号。
  - 用 KaTeX + mhchem 试渲染每个公式，失败时报 `MATH_ERROR` 警告。
  - 默认输出供人阅读（文件:行、级别、code、message、fix）；`--json` 输出 §4 的结构。
  - 有 error 时退出码不为 0。
- `mdmindmap guide`：打印附录 B 的写作说明。写作说明作为包内文件发布。

## 验收

- 对 `fixtures/` 里的样本运行，输出与 `parse()` 的结果一致。
- 用 `npm pack` 打包并安装到临时目录后，`npx mdmindmap guide` 可用。
- `npm run check` 通过。

## Comments

**2026-10-03 完成**（Claude）。`npm run check` 通过，共 176 条测试。两条验收都已满足：
- `fixtures/` 里全部 `.doc.md` 和 `.block.md` 样本，`checkText()` 的结果与 `parse()` 逐条一致（行号已换算）。
- 用 `npm pack` 打包，装进临时项目后，`npx mdmindmap guide` 能打印写作说明；`npx mdmindmap check` 能报出 `REL_UNKNOWN_ID`（退出码 1），坏公式报 `MATH_ERROR`（只有警告时退出码 0），`\ce{}` 不误报。

**结构**：
- `src/cli/check.ts`：`checkText(文件名, 文本, 公式检查?)`，纯函数。
- `src/cli/math.ts`：动态加载 KaTeX 和 mhchem。
- `src/cli.ts`：处理参数和输入输出。
- 提取代码块用的是「收入 AI 实测样本」工单写的 `findSourceBlocks()`。

**实现中做出的决定**：
- **KaTeX 放在 `optionalDependencies`**（`^0.19.0`，自带类型）。用户执行 `npx mdmindmap check` 时会默认装上，公式检查才能生效；web 端只有引用 `mdmindmap/katex` 时才会把它打包进去。没装 KaTeX 时，`check` 跳过公式检查，并输出一行说明。KaTeX 用 `strict: "ignore"`，否则 `$F_合$` 这类公式里的中文会在控制台刷警告。
- **自动识别文件形态**：文件里有 `mdmindmap` 代码块，就逐块解析；否则整个文件按整篇模式解析，标题取去掉 `.md` 的文件名。
- **输出**：
  - 默认格式为 `文件:行  级别  CODE  信息`，下一行是「改法：…」，最后一行汇总。
  - `--json` 输出 `[{ file, diagnostics }]`，其中 `diagnostics` 与 `parse()` 的结构相同，行号已换算成文件行号。
  - 退出码：有 error 时为 1；读不到文件或缺少参数时为 2；其余为 0。
- **写作说明**移到 `packages/mdmindmap/ai-guide.md`，随包发布，是唯一的正式版本。spec 附录 B 的链接已更新；`.scratch/mindmap-v1/ai-authoring-guide.md` 改成了指向它的指针。插件的「复制 AI 写作说明」命令也应读这个文件（esbuild 用 text loader 导入）。
- `tsdown.config.ts` 把 `node:*` 标为 external，因为命令行工具用到 Node 内置模块，而 neutral 平台默认解析不了它们。
