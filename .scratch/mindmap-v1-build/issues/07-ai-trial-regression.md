# 收入 AI 实测样本作为回归测试

Status: resolved
Blocked by: 03, 04, 05, 06
Spec: [spec.md](../spec.md) §13

## 要做什么

- 把分支 `prototype/ai-generation-trial` 下 `trial/out/` 和 `trial/out-v2/` 中的 40 份输出复制到 `fixtures/ai-trial/`，保留按模型和版本划分的子目录。
- 整篇笔记按整篇模式解析；对话回答先提取其中的 `mdmindmap` 代码块再解析（判断方式与命令行工具一致）。
- 生成快照，并逐一人工核对：Haiku 的错误样本要报出预期的 code，其余样本没有 error。

## 验收

- 40 份样本全部有快照。
- 有错误的样本，与「AI 生成实测与写作说明」中统计的错误一一对应。核对结果写在本工单的 Comments 里。
- `npm run check` 通过。

## Comments

**2026-10-03 完成**（Claude）。40 份样本已复制到 `fixtures/ai-trial/{out,out-v2}/<模型>/`，都有快照。`npm run check` 通过，共 119 条测试。

**怎么解析**：`.block.md`（对话回答）先用新增的 `src/parse/extract.ts` 中的 `findSourceBlocks()` 提取 `mdmindmap` 代码块，再逐块解析；快照里记下每块的 `fenceLine`（文件行 = `fenceLine` + 源文行）。「命令行工具」要复用这个函数。`.doc.md` 按整篇模式解析。

**与原型检查器报告（`trial/report-out*.json`）逐份核对的结果**：

- **诊断**：
  - v2 的 10 份完全一致：`REL_UNKNOWN_ID` 1 处；`^id` 不在行尾的 13 处，在我们这里报为 `ID_NOT_LAST`（hint）。
  - v1 Haiku 10 号文件的 27 条概要错误和 `ID_NOT_LAST`，逐行一致。
  - 不一致的只有 3 处（v1 Haiku 的 05、06、09 号文件）：原型报 `SUM_OPEN_UNCLOSED`，我们原本什么都不报。原因是这三处都写成了 `- }`、后面没有总结文字。原型不把它认作闭括号，而定稿规格中单独的 `}` 是合法写法。**经用户同意，新增第 17 个诊断 code `SUM_EMPTY`（warning）**，现在这三处都会在空 `}` 那一行报出。spec §5 和 syntax-spec 已同步更新。
  - Opus 和 Sonnet 的 20 份没有任何 error 或 warning，Haiku 的错误样本都报出了预期的 code。
- **结构统计**（节点数、概要数、带子节点的概要数、联系数、颜色、折叠、ID 数）：40 份中有 37 份与原型完全相同。另外 3 份就是上面那三个文件，只差一个概要：我们把空的 `- }` 认作概要，原型不认。
- 原型的 note 级提示（`SUM_LONE_CLOSE`、`COLOR_EMOJI_INLINE`、`LONG_TEXT`）不在 spec 的诊断清单里，按定稿不报。
