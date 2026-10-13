// 由 packages/mdmindmap/ai-guide.md 生成 .claude/skills/mdmindmap/SKILL.md。
// ai-guide.md 是唯一的正式版本；技能文件 = frontmatter + 它的全文，可单独拷走使用。
// 用法：npm run sync-skill
import { readFileSync, writeFileSync } from "node:fs";

const guide = readFileSync(new URL("../packages/mdmindmap/ai-guide.md", import.meta.url), "utf8");

const frontmatter = `---
name: mdmindmap
description: 用 mdmindmap 格式（Markdown 标题 + 列表）在文档里写思维导图。当用户要求画思维导图、导图、脑图、知识结构图、知识框架，或在写笔记、学习资料、总结、方案文档时需要用层级结构梳理内容，或提到 mdmindmap、MD Mindmap 时使用。不要改用 mermaid mindmap 或 mind-elixir 的写法。
---

<!-- 本文件由 scripts/sync-skill.mjs 从 packages/mdmindmap/ai-guide.md 生成，请改 ai-guide.md 后重新运行 npm run sync-skill。 -->

`;

writeFileSync(new URL("../.claude/skills/mdmindmap/SKILL.md", import.meta.url), frontmatter + guide);
