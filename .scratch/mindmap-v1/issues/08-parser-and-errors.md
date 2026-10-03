# 解析器选型与语法错误提示

Type: grilling
Label: wayfinder:grilling
Status: resolved
Assignee: Claude (with pengyg)
Blocked by: 06, 09
Map: [map.md](../map.md)

## Question

按 [syntax-spec.md](../syntax-spec.md) 解析源文：用哪个 markdown 解析器（markdown-it / remark / 只按行手写，再把节点文字交给内容渲染器）？如何保留每个节点的源码行号，供点击跳转使用？

语法出错时（联系引用了不存在的ID、`{` 没闭合、ID 含非法字符、出现第二个根等）是整张图拒绝渲染，还是尽量渲染并在导图角落列出问题？错误如何通过核心库 API 暴露给 web 和 Obsidian？

所选解析器还要能处理整篇模式（见 syntax-spec「整篇模式的额外规则」）：整块跳过代码块，识别文末的 `%%` 块，并合并列表项续行。

「AI 生成实测与写作说明」的结论：**不需要专门宽松接受任何写偏**（预计会出现的写偏在 40 个文件里一次都没出现；唯一常见的标记顺序问题已改为合法）。重点改为**报错信息**：每条都要写明行号、错在哪、怎么改，方便 AI 用 `mdmindmap check` 自己修好；实测里弱模型常犯的错要有专门的提示，例如 `{` 写在父节点上、`{` 没有配对、联系端点写成了节点文字。实测用的检查器原型（分支 `prototype/ai-generation-trial` 上的 `trial/check.prototype.mjs`）可以作为参考，它已经实现了定稿规则和整篇模式。

「排版引擎与节点渲染原型验证」又补了两条：mhchem 的 ` ^`（生成气体）会与行尾节点ID冲突，规格已改为「符合字符集才算ID」，「`^期望` 这类像是写错的ID」如何提示要在这里定；联系的起点和终点相同要报错。

诊断的结构已在「包拆分与对外 API」定好：`{ line, severity: 'error' | 'warning' | 'hint', code, message, fix }`，`code` 是稳定的英文类别名，`message` 和 `fix` 用中文；`mdmindmap check --json` 输出同一结构。解析器放在不碰 DOM 的 `mdmindmap/parse` 入口，节点里的行内 markdown 也由核心库按固定子集解析（见 syntax-spec），选型时一并考虑。

另需定下转义写法：节点内容真的以 `} `、`{ ` 开头，或以色块 emoji 结尾时，怎么写。

## Answer

与 pengyg 逐项确认（grilling 共两轮）。规则已并入 [syntax-spec.md](../syntax-spec.md) 的「转义与行内规则」和「诊断」两节。

1. **块级解析按行手写**：零依赖，放在 `mdmindmap/parse`，Node 里也能用。原型和 AI 实测检查器已经验证过这种做法，覆盖整篇模式、续行、`%%` 联系区。与 CommonMark 边缘行为的差异写进规格，并用测试用例固定。没有选 markdown-it（解压约 2 MB，我们的标记都要在它的 token 上二次处理）和 micromark/remark（同样要二次处理，扩展写起来复杂）。
2. **行号**：节点和联系都记录在源文中的行号（从 1 开始）；代码块模式由宿主换算成文件行号（Obsidian：代码块起始行 + 1 + 偏移）。
3. **行内解析也手写，只认固定子集**，生成节点树后由核心库用 DOM API 构造节点内容，不用 innerHTML。优先级：代码和公式先识别（里面的内容当原文），然后是双链和链接，最后是粗体、斜体、删除线、高亮。`$` 的判定照 Obsidian/Pandoc：开头的 `$` 后面不能是空格，结尾的 `$` 前面不能是空格、后面不能紧跟数字。反斜杠可以转义 markdown 标点。
4. **出错时尽量渲染**：能解析的部分照常画，导图角落显示「⚠ N」，点开列出问题，可跳到对应行。只有一个节点都没有时才显示错误面板。API 提供 `mm.diagnostics` 和 `onDiagnostics`。
5. **转义统一用反斜杠**：`\{ `、`\} `、`\^abc`、`\🔴`。色块 emoji 前面有没有空格都算颜色（AI 实测的 118 个里有 3 个前面没有空格，且都是有意上色）。
6. **`mdmindmap check` 用 KaTeX + mhchem 试渲染每个公式**，失败报 `MATH_ERROR` 警告（不报错误，因为 Obsidian 的 MathJax 支持的命令更多）；运行时渲染导图时不做这项检查，`parse()` 不碰公式。
7. **三个严重级别**：error = 写下的东西没按本意显示（被丢掉、挂错了地方）；warning = 多半不是本意，但已按合理方式处理并显示；hint = 不影响显示的建议。
8. **诊断清单**：

| 级别 | code | 情况 | 导图怎么显示 | `fix` 要点 |
|---|---|---|---|---|
| error | `NO_NODES` | 一个节点都没有 | 显示错误面板 | 用 `# 根` 加 `- ` 列表来写 |
| error | `MULTI_ROOT` | 代码块里有多个顶层节点 | 多出的挂到第一个根下面 | 加 `# 标题` 作根，或把其余节点缩进到根下 |
| error | `ID_DUP` | 节点ID重复 | 后出现的不算ID | 改成不重复的ID |
| error | `SUM_NO_SIBLINGS` | `}` 前没有可括的兄弟 | 当普通节点显示 | 上一层节点以 `{ ` 开头时专门提示「`{` 写在了父节点上，应写在第一个被括住的兄弟上并与 `}` 同级」 |
| error | `SUM_OPEN_UNCLOSED` | `{` 没有配对的 `}` | 忽略这个 `{` | 在范围最后一个兄弟后加 `- } 总结文字` |
| error | `SUM_DOUBLE_OPEN` | 同一层连续两个 `{` | 以后一个为准 | 每个 `{` 都要配一个 `}` |
| error | `REL_UNKNOWN_ID` | 联系端点不存在 | 这条不画 | 端点等于某个节点文字时专门提示「请给该节点加 `^id` 再引用」；ID 只差几个字母时提示「是不是 `xxx`？」 |
| error | `REL_SELF` | 起点和终点相同 | 不画 | 删掉或改正端点 |
| error | `REL_UNPARSED` | 联系块里有看不懂的行 | 忽略 | 写明格式；箭头写错（如 `->`）时专门指出 |
| error | `REGION_UNCLOSED` | `%%` 块没有闭合 | 之后的内容全部忽略 | 补上结尾的 `%%` |
| error | `REGION_NOT_LAST` | 含联系的 `%%` 块后面还有内容 | 代码块：后面的内容忽略；整篇：这个块当普通注释 | 把联系块移到最末尾 |
| warning | `NON_NODE_LINE` | 代码块里的非节点行（只在代码块模式下报） | 忽略 | 节点要写成 `- ` 列表项或标题 |
| warning | `REL_OUTSIDE_REGION` | 像联系的行写在 `%%` 块外 | 忽略 | 移到文末的 `%%` 块里 |
| warning | `ID_INVALID` | 行尾 `^期望` 这类字符不合法的ID | 当作内容显示 | ID 只能用英文字母、数字和 `-` |
| warning | `MATH_ERROR` | 公式渲染失败（只有 `check` 会报） | — | 附 KaTeX 的出错信息 |
| hint | `ID_NOT_LAST` | `^id` 不在行尾（只在整篇模式下报） | 正常 | 移到行尾，才能被其他笔记引用 |

单独的 `}` 是合法写法，不报任何提示。

9. **回归测试**：规格样例、AI 实测的 40 份输出（分支 `prototype/ai-generation-trial`，包括 Haiku 的错误样本）、每个 code 的最小样例，都收进解析器的测试用例。测试框架留在迷雾「工程与发布」。
