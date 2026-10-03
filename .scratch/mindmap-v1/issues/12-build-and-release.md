# 工程与发布：构建、测试、发布流程与插件命名

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: Claude (with pengyg)
Blocked by: —
Map: [map.md](../map.md)

## Question

仓库结构已定为 npm workspaces 两个项目（`packages/mdmindmap`、`packages/obsidian-plugin`，见「包拆分与对外 API」）。开工前还要定：

- **构建工具**：npm 包（多个入口、ESM/CJS、类型声明、命令行工具）和 Obsidian 插件（单个 `main.js` + `styles.css`）分别用什么构建（tsup / esbuild / Vite library mode / tsdown……）？
- **测试**：用什么测试框架？解析器的回归测试（规格样例、AI 实测的 40 份输出、每个诊断 code 的最小样例，见「解析器选型与语法错误提示」）怎么组织？渲染器要不要测、怎么测（headless 浏览器截图对比？）？
- **代码规范**：是否接入 `eslint-plugin-obsidianmd`（社区插件审查会用它自动检查），TypeScript 严格模式等。
- **发布流程**：npm 发版和 Obsidian 插件发版（GitHub Release 附 `main.js`、`manifest.json`、`styles.css`）是手动还是 CI（GitHub Actions）？两者版本号要不要同步？
- **插件的 ID 和名称**：ID 不能含 `obsidian`、不能以 `plugin` 结尾（见「Obsidian 插件 API 对本需求的支持情况」第 7 项）；显示名称和描述（≤250 字符、以句号结尾）用什么？
- **仓库和开源事务**：GitHub 仓库名、LICENSE（MIT）、README 的语言（中文/英文/双语）。

## Answer

2026-10-03 与 pengyg 逐项确认（grilling 共三轮）。事实核查由子代理完成，出处如下：Obsidian 文档的 Submit your plugin、Submission requirements 和 Manifest 三页，`obsidianmd/eslint-plugin`，tsup 的 README，npm 的 trusted publishers 文档。

**代码托管**：目前放在用户自建的 Gitea 上，暂时不推送到 GitHub。只有在向 Obsidian 社区提交、或发布 npm 时，才需要建 GitHub 仓库，仓库名定为 `mdmindmap`。

**仓库结构**（采用 Meta Bind 的做法，满足 Obsidian 的根目录要求）
- 根目录：插件唯一的 `manifest.json`、`versions.json`、`LICENSE`（MIT）、`README.md`（英文为主，顶部链接 `README.zh-CN.md`），以及 npm workspaces 配置。
- 根目录的 `build` 脚本依次构建核心库和插件。Obsidian 的自动审查会运行这个脚本。
- `packages/mdmindmap/`：npm 包，有自己的 README（同样是英文为主，另附中文版）。
- `packages/obsidian-plugin/`：插件源码，构建时直接读根目录的 `manifest.json`。

**构建**
- npm 包用 **tsdown** 构建（tsup 已不再维护，并建议改用 tsdown）。**只出 ESM**，`engines` 写 Node ≥ 20.19，类型声明由 tsdown 生成。命令行工具 `mdmindmap` 是同一个包的 `bin`。
- 插件用 **esbuild** 构建，直接打包核心库源码，产出单个 `main.js`。`styles.css` = 核心库的 `style.css` + Obsidian 变量映射。
- `npm run dev`：监听并重新构建；设置了环境变量 `OBSIDIAN_PLUGIN_DIR` 时，把三个文件直接写到这个目录（实验期用户手动复制或直接写入库目录）。

**测试**：使用 **Vitest**。
- 解析器的回归测试用「样例文件 + 结果快照」组织：`fixtures/spec/`、`fixtures/ai-trial/`（AI 实测的 40 份输出）、`fixtures/diagnostics/<CODE>.md`。测试把每个 `.md` 交给 `parse()`，结果和相邻的 `.json` 快照比对。
- 排版包装层在 Node 里用假尺寸测。
- 渲染器在 Vitest 浏览器模式（Playwright 驱动 Chromium）里做几何断言：节点不重叠、概要括号覆盖的范围正确、折叠后节点被隐藏。v1 **不做**像素截图对比。

**代码规范**
- 两个包都开 TypeScript 严格模式，并且**都接入** `eslint-plugin-obsidianmd` 的 recommended 配置（flat config）。核心库会被打进插件，审查时会一起检查。
- 格式化用 Prettier 默认配置。
- `npm run check` = lint + 类型检查 + 测试 + 构建，推送前在本地运行。**v1 不配 CI。**

**版本与发版**
- npm 包和插件**共用同一个版本号**，共用一个更新日志。从 `0.1.0` 开始，实验期一直保持 `0.x`。
- **全部手动发版。** `npm run release <版本号>` 依次：把版本号同步写进两个 `package.json`、`manifest.json`、`versions.json`；构建并跑测试；打上不带 `v` 的标签。到这里停下，不自动发布。
- 实验期：插件靠**手动复制**三个文件到各设备上，不用 BRAT；**npm 暂不发布**，也不先发占位版本（目前 `mdmindmap` 包名还空着）。
- 以后公开发布时：先在本地手动 `npm publish` 第一个版本，再到 npm 网站上设置受信任发布（要求 Node ≥ 22.14、npm ≥ 11.5.1）；插件在 GitHub Release 上附 `main.js`、`manifest.json`、`styles.css`，标签和 `manifest.json` 里的版本号一致；然后到 community.obsidian.md 提交，那里会自动审查，不再走 PR。

**插件命名**
- ID：`mdmindmap`。只用小写字母，不含 "obsidian"，不以 "plugin" 结尾，未被占用（有一个相近的 `mdmap`）。
- 名称：**MD Mindmap**。未被占用；"Markdown Mindmap"、"Mindmap"、"Outline Mindmap" 都已被占用。
- 描述：`Render read-only mind maps from Markdown headings and lists, with summary braces, cross-branch relationships, colors and math.`
- 插件界面文字（命令、菜单、提示）跟随 Obsidian 的语言设置，提供中、英两套；诊断信息和 AI 写作说明保持中文（已定）。
