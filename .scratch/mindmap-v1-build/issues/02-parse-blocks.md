# 块级解析：节点树、行尾标记、转义

Status: resolved
Blocked by: 01
Spec: [spec.md](../spec.md) §3、§4、§5，附录 A「节点」「行尾标记」「转义与行内规则」

## 要做什么

- 在 `mdmindmap/parse` 中按行手写代码块模式的解析（零依赖，不碰 DOM）：
  - 标题和列表项成为节点，续行并入节点；只能有一个根；跳过 YAML frontmatter；去掉行内的 `%%…%%`。
  - 行尾标记：颜色 emoji、`<!-- fold -->`（也接受 `<!-- markmap: fold -->`）、`^id`，三者顺序任意。只有符合 `[A-Za-z0-9-]` 的 `^token` 才算ID。
  - 反斜杠转义：`\{ `、`\} `、`\^abc`、`\🔴`。
- 定义 §4 的 `Node`、`Diagnostic` 类型。`inline` 字段暂时留空数组。
- 诊断：`NO_NODES`、`MULTI_ROOT`、`ID_DUP`、`NON_NODE_LINE`、`ID_INVALID`。
- 建立 `fixtures/` 快照测试机制（§13），并为本工单涉及的每个诊断 code 放一份最小样例。

## 验收

- 每个 code 至少有一份 `fixtures/diagnostics/<CODE>.md`，快照与 §5 表格中「导图怎么显示」一列一致。
- mhchem 的 `$\ce{… H2 ^}$` 不被当成ID；`^期望` 报 `ID_INVALID`。
- `npm run check` 通过。

## Comments

**2026-10-03 完成**（Claude）。`npm run check` 通过：18 份样例的快照，加上 13 条行尾标记和行分类的单元测试。两条验收都已满足。

后续工单要知道的接口和约定：

- **模块划分**（`src/parse/`）：
  - `lines.ts`：逐行分类，分为 blank / heading / item / other 四种。
  - `markers.ts`：行尾标记、行首括号、行内 `%%` 注释。
  - `tree.ts`：建立节点树。
  - `diagnostics.ts`：全部 16 个 code 的级别表，以及 `diagnostic()` 工厂函数。
  - `index.ts`：`parse()`。
- **给后续工单准备好的接口**：`buildTree()` 除了返回节点树，还返回下面两项，目前 `parse()` 都还没用上：
  - `braces: Map<Node, 'open' | 'close'>`：列表项开头的 `{ ` 和 `} ` 已经剥掉并记在这里，交给「概要解析」使用。在它完成之前，`} 总结` 会显示成普通子节点。
  - `idNotLast: Set<Node>`：给「整篇模式」报 `ID_NOT_LAST` 用。
- **`Node.text` 的转义**：块级转义（`\{ ` `\} ` `\^abc` `\🔴`）由块级解析去掉反斜杠；行内 markdown 的转义（如 `\*`）原样保留，交给「行内解析」处理。spec §4 已同步更新。
- **规则细节**（为了让行为确定而做的选择）：
  - 根节点：第一个节点就是根。之后凡是不能成为它后代的节点（同级或更浅的标题，或在任何标题之前出现的顶层列表项），都报 `MULTI_ROOT`，并挂到根下面。
  - 列表嵌套：缩进比上一项大就算子节点（不按 CommonMark 的内容列计算），对 AI 写的源文更宽容。制表符按 4 列计。
  - 续行：没有空行隔开、缩进比列表项标记大的非节点行，并入该列表项，用空格连接。标题没有续行。
  - 标题：`#标签` 不是标题（与 Obsidian 一致）；结尾的 `##` 会去掉；`---`、`- - -`、`***` 是分隔线，不是列表项。
  - 行尾 `^token`：前面必须是空白或位于行首。token 只由字母、数字、`-`、`_` 组成、但含有ID不允许的字符时，报 `ID_INVALID`；其余情况静默当作内容，比如 `\ce{… ^}`。
  - 一个节点都没有时，只报 `NO_NODES`，不再逐行报 `NON_NODE_LINE`。
- **样例约定**：`test/fixtures/**/*.md` 的快照只记录结构（不含 `inline`）。文件名以 `.doc.md` 结尾的按整篇模式解析，标题取文件名，供「整篇模式」使用。`test/fixtures/` 已加入 `.prettierignore`，Prettier 会改写样例和快照。新增样例后，运行 `npx vitest run -u` 生成快照，并人工核对。
