import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    parse: "src/parse/index.ts",
    katex: "src/katex.ts",
    cli: "src/cli.ts",
  },
  format: "esm",
  platform: "neutral",
  target: "es2022",
  dts: true,
  clean: true,
  copy: [{ from: "src/style.css", to: "dist" }],
  // 命令行工具用到 Node 内置模块；其余入口不碰它们。
  external: [/^node:/],
});
