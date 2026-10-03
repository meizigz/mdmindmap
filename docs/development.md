# 开发与调试

## 准备

需要 Node.js 22 或更高版本。在仓库根目录：

```sh
npm install
npx playwright install chromium   # 渲染器的测试跑在浏览器里
```

## 常用命令

都在仓库根目录运行。

| 命令            | 作用                                                             |
| --------------- | ---------------------------------------------------------------- |
| `npm run dev`   | 监听源码，改动后重新构建插件，并复制到测试 vault                 |
| `npm run build` | 构建核心库和插件，产出根目录的 `main.js`、`styles.css`（压缩版） |
| `npm run check` | lint、类型检查、测试、构建，全部跑一遍；提交前先跑               |
| `npm run test`  | 只跑测试                                                         |
| `npm run demo`  | 在浏览器里打开核心库的演示页，不需要 Obsidian                    |

## 在 Obsidian 里调试：仓库自带的测试 vault

仓库里的 `test-vault/` 本身就是一个 Obsidian vault。里面已经装好了 [Hot Reload](https://github.com/pjeby/hot-reload)，还有几篇示例笔记：

| 笔记            | 用来测                                                       |
| --------------- | ------------------------------------------------------------ |
| `代码块导图.md` | 代码块渲染，覆盖所有写法：概要、联系、颜色、折叠、公式、双链 |
| `整篇导图.md`   | 命令「以导图打开当前文件」                                   |
| `错误示例.md`   | 源文有问题时的 ⚠ 角标                                        |
| `连接体问题.md` | 双链跳转的目标                                               |

第一次使用：

1. 运行 `npm run dev`，让它一直开着。
2. 在 Obsidian 的仓库列表里选「打开本地仓库」，选中仓库里的 `test-vault` 文件夹。
3. Obsidian 会询问是否信任这个仓库的作者，选信任，开启第三方插件。

之后每次保存源码，esbuild 都会重新构建，并把 `main.js`、`manifest.json`、`styles.css` 复制到 `test-vault/.obsidian/plugins/mdmindmap/`。Hot Reload 发现文件变了，就会自动重载插件，不用重启 Obsidian。

想看报错和日志，按 `Ctrl+Shift+I`（macOS 上按 `Cmd+Option+I`）打开开发者工具。dev 构建不压缩，而且带内联 sourcemap，断点可以直接打在 TypeScript 源码上。

### 复制到别的 vault

设置环境变量 `OBSIDIAN_PLUGIN_DIR`，指向目标 vault 的插件目录：

```sh
# macOS / Linux / Git Bash
OBSIDIAN_PLUGIN_DIR="<vault>/.obsidian/plugins/mdmindmap" npm run dev
```

```powershell
# PowerShell
$env:OBSIDIAN_PLUGIN_DIR = "<vault>\.obsidian\plugins\mdmindmap"; npm run dev
```

如果目标 vault 里的这个插件是用 BRAT 装的，dev 构建会覆盖它，BRAT 下次更新时又会覆盖回来。所以日常开发用 `test-vault` 就好。

### 提交什么

`test-vault` 里只提交示例笔记、`.obsidian/community-plugins.json` 和 Hot Reload。dev 构建产物和 Obsidian 自己生成的状态文件（`workspace.json` 等）都在 `.gitignore` 里。新加的示例笔记直接提交即可。

## 用 BRAT 测试发布版

BRAT 从 GitHub Release 下载插件，和用户安装的方式一样。适合在发版前确认 Release 本身没问题，也适合在手机上测试。

### 发一个测试版

1. 工作区要干净。运行：

   ```sh
   npm run release <x.y.z>   # 不带 v
   ```

   它会把版本号写进各个 `package.json`、`manifest.json` 和 `versions.json`，跑 `npm run check`，然后提交并打标签，最后把核心库打包成根目录的 `mdmindmap-<x.y.z>.tgz`。

2. 推送提交和标签：

   ```sh
   git push origin main <x.y.z>
   ```

3. 在 GitHub 的 Releases 页面新建 Release：
   - 选刚推上去的标签。
   - 附上根目录的 `main.js`、`manifest.json`、`styles.css`，以及 `mdmindmap-<x.y.z>.tgz`（核心库还没发布到 npm，其他 web 应用从这里安装）。
   - 测试版勾选 "Set as a pre-release"。

`npm run dev` 会把根目录的 `main.js` 换成不压缩的调试版。`npm run release` 会先重新构建，所以不受影响；但如果是手动上传附件，上传前先跑一次 `npm run build`；tgz 要重新打的话，再跑 `npm pack -w mdmindmap`。

### 在 Obsidian 里安装

1. 在社区插件里安装并启用 BRAT。
2. 运行命令 `BRAT: Add a beta plugin for testing`，仓库填 `meizigz/mdmindmap`，勾选 "Enable after installing"。
3. 发了新版本后，运行 `BRAT: Check for updates to all beta plugins`。

BRAT 只看 `manifest.json` 里的版本号来判断有没有更新。所以每一轮测试都要发一个新版本号，不能只替换同一个 Release 的附件。
