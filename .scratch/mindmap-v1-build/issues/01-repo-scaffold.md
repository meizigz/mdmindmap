# 仓库骨架与工程脚本

Status: resolved
Blocked by: —
Spec: [spec.md](../spec.md) §2、§13

## 要做什么

- 按 §2 建立 npm workspaces：`packages/mdmindmap`、`packages/obsidian-plugin`。根目录放：
  - `manifest.json`：ID `mdmindmap`，名称 `MD Mindmap`，描述按 §2，`version: 0.1.0`，`isDesktopOnly: false`。
  - `versions.json`、MIT `LICENSE`、README 占位。
- npm 包：用 tsdown 构建，只出 ESM，`engines.node >= 20.19`。`exports` 预留 §2 的全部入口和 `bin`，各入口先放空实现。
- 插件：用 esbuild 打包出 `main.js`；`styles.css` 由核心库的 `style.css` 加上插件自己的映射样式拼接而成。
- 根目录脚本：
  - `build`
  - `dev`：设置了 `OBSIDIAN_PLUGIN_DIR` 时，把三个文件写进这个目录。
  - `check`：lint + 类型检查 + 测试 + 构建。
  - `release <版本号>`：按 §13 同步版本号、跑 check、打不带 `v` 的标签，然后停下。
- Vitest：配好 Node 环境和浏览器模式（Playwright + Chromium），各放一个示例测试。
- TypeScript 严格模式；`eslint-plugin-obsidianmd` 的 recommended 配置（flat config）覆盖两个包；Prettier 用默认配置。

## 验收

- 在干净的环境中执行 `npm ci && npm run check`，能通过。
- `npm run build` 之后，根目录有插件的三个文件，`packages/mdmindmap/dist` 下有各入口和类型声明。
- `npm run release 0.1.1` 把四处版本号同步改好并打上标签，不做任何发布。
- `npm run check` 通过。

## Comments

**2026-10-03 完成**（Claude）。三条验收都已在全新副本中验证：`npm ci` → `npm run check` 通过；`npm run build` 产出根目录的插件三个文件和 `packages/mdmindmap/dist`；`npm run release 0.1.1` 同步改好四处版本号，并提交、打标签，不做任何发布。`npm run dev` 设置 `OBSIDIAN_PLUGIN_DIR` 后，三个文件都会写进该目录。

实现中做出的决定，后续工单要知道：

- **版本**：TypeScript 锁定为 `~6.0.3`（typescript-eslint 8 只支持 `<6.1`，TS 7 暂时不能用）。`obsidian` 类型包用 `1.8.7`，与 `eslint-plugin-obsidianmd` 0.4.2 锁定的 peer 版本一致，因此 `manifest.json` 的 `minAppVersion` 也写 `1.8.7`。ESLint 用 9.x，npm 安装时提示 9 已停止支持，但插件的 peer 依赖是按 9 写的，暂不升级到 10。
- **源码入口**：npm 包的 `exports` 中有自定义条件 `@mdmindmap/source`，指向 `src/*.ts`。插件的 esbuild、TypeScript（`customConditions`）和 Vitest 都用这个条件直接引用核心库源码，不需要先构建 `dist`。Vitest 的 Node 项目要同时设置 `ssr.resolve.conditions`，否则会去找 `dist`。
- **测试分组**：`packages/*/test/**/*.test.ts` 跑在 Node 里；`*.browser.test.ts` 跑在浏览器里（Playwright + Chromium，首次运行前要执行 `npx playwright install chromium`）。
- **lint 范围**：Obsidian 审查规则作用于全部代码；只在 Node 里运行的文件（`src/cli.ts`、`*.mjs`、`vitest.config.ts`）关闭 `no-nodejs-modules` 和 `no-console`；测试文件关闭 `prefer-create-el` 和 `no-extraneous-dependencies`。会打进插件的 `src/` 中，`innerHTML` 从警告升级为错误。
- **插件构建**：esbuild 产出根目录的 `main.js`（CJS，external 为 `obsidian`、`electron`、`@codemirror/*`、`@lezer/*`、Node 内置模块）；`styles.css` = `packages/mdmindmap/src/style.css` + `packages/obsidian-plugin/src/styles.css`。两个产物都已加入 `.gitignore`。
- **换行符**：新增 `.gitattributes`（`* text=auto eol=lf`）。
- **发版脚本**：要求工作区干净、标签不存在；`check` 失败时自动还原版本号的改动。
- **还没有声明的依赖**：`katex`（「web 公式入口」「命令行工具」工单再加，届时决定放在 `optionalDependencies` 还是 peer 依赖）、`@plait/layouts`（「排版包装层」工单再加，锁定 0.94.1）。
