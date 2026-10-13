// 构建扩展：宿主代码（Node，CJS）和两个页面脚本（panel：整篇导图 webview；preview：内置 Markdown 预览）。
// 页面脚本连同 KaTeX 的样式和字体一起打进 dist/。--watch：监听并重建。
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import esbuild from "esbuild";

const here = fileURLToPath(new URL(".", import.meta.url));
const watch = process.argv.includes("--watch");

const common = {
  bundle: true,
  logLevel: "info",
  sourcemap: watch,
  minify: !watch,
  // 直接用核心库源码，不依赖先构建出 dist
  conditions: ["@mdmindmap/source"],
};

const contexts = await Promise.all([
  esbuild.context({
    ...common,
    entryPoints: [join(here, "src/extension.ts")],
    outfile: join(here, "dist/extension.js"),
    platform: "node",
    format: "cjs",
    target: "node20",
    external: ["vscode"],
  }),
  esbuild.context({
    ...common,
    entryPoints: {
      panel: join(here, "src/webview/panel.ts"),
      preview: join(here, "src/webview/preview.ts"),
    },
    outdir: join(here, "dist"),
    platform: "browser",
    format: "iife",
    target: "es2022",
    // KaTeX 样式里的字体：只带 woff2（现代 webview 都支持），其余格式留空
    loader: { ".woff2": "file", ".woff": "empty", ".ttf": "empty" },
    assetNames: "fonts/[name]",
  }),
]);

if (watch) {
  await Promise.all(contexts.map((c) => c.watch()));
} else {
  await Promise.all(contexts.map((c) => c.rebuild()));
  await Promise.all(contexts.map((c) => c.dispose()));
}
