import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import obsidianmd from "eslint-plugin-obsidianmd";

// 会打进插件 main.js 的代码（两个包的 src/，命令行工具除外）按 Obsidian 社区审查的规则检查；
// 只在 Node 里运行的工具代码和测试，放宽其中针对插件运行环境的几条。
export default defineConfig([
  globalIgnores([
    "**/node_modules/",
    "**/dist/",
    "main.js",
    "styles.css",
    ".scratch/",
    ".claude/",
    "test-vault/",
  ]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "eslint.config.mjs",
            "vitest.config.ts",
            "scripts/*.mjs",
            "packages/obsidian-plugin/esbuild.config.mjs",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // 核心库也在 web 端运行，那里没有 Obsidian 的全局 createEl；统一用 ownerDocument.createElement。
    files: ["packages/mdmindmap/src/**/*.ts"],
    rules: { "obsidianmd/prefer-create-el": "off" },
  },
  {
    // mdmindmap/katex 只给 web 端用，不打进 Obsidian 插件（插件用宿主的 MathJax），可以用 fetch。
    files: ["packages/mdmindmap/src/katex.ts"],
    rules: { "no-restricted-globals": "off" },
  },
  {
    // spec §12：不用 innerHTML（推荐配置里只是警告）。
    files: ["packages/*/src/**/*.ts"],
    rules: { "@microsoft/sdl/no-inner-html": "error" },
  },
  {
    // Node 工具：命令行工具、构建与发版脚本、配置文件。
    files: [
      "packages/mdmindmap/src/cli.ts",
      "packages/mdmindmap/src/cli/**",
      "**/*.mjs",
      "vitest.config.ts",
    ],
    languageOptions: { globals: globals.node },
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
      "obsidianmd/rule-custom-message": "off",
      // 构建脚本往仓库自带的测试 vault 里写，那里的配置目录就是 .obsidian。
      "obsidianmd/hardcoded-config-path": "off",
    },
  },
  {
    // 测试和演示页不打进插件：允许 Node 模块和根目录的开发依赖。
    files: ["packages/*/test/**", "packages/mdmindmap/demo/**"],
    languageOptions: { globals: globals.node },
    rules: {
      "obsidianmd/no-nodejs-modules": "off",
      "obsidianmd/no-static-styles-assignment": "off",
      "obsidianmd/prefer-window-timers": "off",
      "obsidianmd/no-forbidden-elements": "off",
      "obsidianmd/rule-custom-message": "off",
      "import/no-extraneous-dependencies": "off",
      "obsidianmd/prefer-create-el": "off",
    },
  },
]);
