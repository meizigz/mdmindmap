# 概要解析与诊断

Status: resolved
Blocked by: 02
Spec: [spec.md](../spec.md) 附录 A「概要」、§5

## 要做什么

- 以 `} ` 开头的列表项是概要，以 `{ ` 开头的标记显式起点。按附录 A 计算默认范围，概要本身不算兄弟。概要可以带子节点、颜色、折叠和 `^id`。
- 结果写入 `Node.summaries: { from, to, node }`。
- 诊断：
  - `SUM_NO_SIBLINGS`：上一层节点以 `{ ` 开头时，给专门的提示。
  - `SUM_OPEN_UNCLOSED`、`SUM_DOUBLE_OPEN`。
  - 单独的 `}` 不报任何提示。

## 验收

- 附录 A 的两份样例和参考截图那张图的源文，解析结果的快照正确，收入 `fixtures/spec/`。
- 写作说明「常见错误 1、2」中的写法会报出对应的 code，`fix` 文案能指出改法。
- `npm run check` 通过。

## Comments

**2026-10-03 完成**（Claude）。`src/parse/summaries.ts`，在 `parse()` 里紧接着建树执行。新增样例：`fixtures/spec/`（附录 A 的两份样例）、`fixtures/summaries/`（默认范围、中间单独的 `}`、概要带子节点和标记、概要里再套概要、写作说明的常见错误 1 和 2），以及三个诊断 code 的最小样例。`npm run check` 通过。

- **快照里的联系区**：`fixtures/spec/` 的快照目前把 `%%` 联系区的几行报成 `NON_NODE_LINE`。「联系区解析与诊断」完成后，需要用 `-u` 更新这些快照并重新核对。
- **常见错误 1**（`{` 写在父节点上，去括它的子节点）实际报的是 `SUM_OPEN_UNCLOSED`：子节点里的 `}` 括住了它前面的子节点，形成一个合法的概要，而父节点上的 `{` 没有配对。所以专门的改法提示同时加在了两个 code 上：`SUM_OPEN_UNCLOSED` 在该节点的子节点里出现过 `}` 时给出；`SUM_NO_SIBLINGS` 在父节点以 `{` 开头时给出。
- **常见错误 2 的后半句**（`- }` 后面不写总结文字）目前**不报任何诊断**：spec §5 的 16 个 code 里没有对应项，这时会画出一个空的概要节点。如果要报，需要新增一个 code（例如 `SUM_EMPTY`，warning）。code 属于公开 API，要先经用户同意，已在会话中提出。
