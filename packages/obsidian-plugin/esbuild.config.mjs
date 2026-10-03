// 构建插件：打包核心库源码，产出仓库根目录的 main.js 和 styles.css。
// --watch：监听并重建；设置了 OBSIDIAN_PLUGIN_DIR 时，每次构建后把三个文件复制过去。
import { readFile, writeFile, copyFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
import esbuild from "esbuild";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(here, "../..");
const watch = process.argv.includes("--watch");
const pluginDir = process.env.OBSIDIAN_PLUGIN_DIR;

async function writeStyles() {
  const core = await readFile(
    join(root, "packages/mdmindmap/src/style.css"),
    "utf8",
  );
  const host = await readFile(join(here, "src/styles.css"), "utf8");
  await writeFile(
    join(root, "styles.css"),
    `${core.trimEnd()}\n\n${host.trimEnd()}\n`,
  );
}

async function copyToVault() {
  if (!pluginDir) return;
  await mkdir(pluginDir, { recursive: true });
  for (const file of ["main.js", "manifest.json", "styles.css"]) {
    await copyFile(join(root, file), join(pluginDir, file));
  }
  console.log(`已复制到 ${pluginDir}`);
}

const afterBuild = {
  name: "mdmindmap-after-build",
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) return;
      await writeStyles();
      await copyToVault();
    });
  },
};

const context = await esbuild.context({
  entryPoints: [join(here, "src/main.ts")],
  outfile: join(root, "main.js"),
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2021",
  conditions: ["@mdmindmap/source"],
  // AI 写作说明作为字符串打进 main.js（「复制 AI 写作说明」命令）。
  loader: { ".md": "text" },
  external: [
    "obsidian",
    "electron",
    "@codemirror/*",
    "@lezer/*",
    ...builtinModules,
  ],
  sourcemap: watch ? "inline" : false,
  minify: !watch,
  treeShaking: true,
  logLevel: "info",
  plugins: [afterBuild],
});

if (watch) {
  await context.watch();
} else {
  await context.rebuild();
  await context.dispose();
}
