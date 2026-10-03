// npm run release <版本号>
// 把版本号同步写进 npm 包、插件、根目录的 package.json 和 manifest.json、versions.json，
// 跑 npm run check，提交并打上不带 v 的标签。到此为止，不做任何发布（spec §13）。
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("用法：npm run release <x.y.z>（不带 v）");
  process.exit(1);
}

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const output = (cmd) => execSync(cmd, { encoding: "utf8" }).trim();

if (output("git status --porcelain") !== "") {
  console.error("工作区有未提交的改动，请先提交或暂存。");
  process.exit(1);
}
if (output(`git tag --list ${version}`) !== "") {
  console.error(`标签 ${version} 已存在。`);
  process.exit(1);
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const writeJson = (file, data) =>
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

const packageFiles = [
  "package.json",
  "packages/mdmindmap/package.json",
  "packages/obsidian-plugin/package.json",
];
const touched = [
  ...packageFiles,
  "package-lock.json",
  "manifest.json",
  "versions.json",
];

for (const file of packageFiles) {
  const pkg = readJson(file);
  pkg.version = version;
  if (pkg.dependencies?.mdmindmap) pkg.dependencies.mdmindmap = version;
  writeJson(file, pkg);
}

const manifest = readJson("manifest.json");
manifest.version = version;
writeJson("manifest.json", manifest);

const versions = readJson("versions.json");
versions[version] = manifest.minAppVersion;
writeJson("versions.json", versions);

try {
  run("npm install --package-lock-only --ignore-scripts");
  run("npm run check");
} catch {
  run(`git checkout -- ${touched.join(" ")}`);
  console.error("检查没有通过，已还原版本号的改动。");
  process.exit(1);
}
run(`git add ${touched.join(" ")}`);
run(`git commit -m "release ${version}"`);
run(`git tag ${version}`);

console.log(`
已打标签 ${version}。接下来手动发布：
  npm publish -w mdmindmap
  在 GitHub 上建 Release，标签 ${version}，附上根目录的 main.js、manifest.json、styles.css`);
