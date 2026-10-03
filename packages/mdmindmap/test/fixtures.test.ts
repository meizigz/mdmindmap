// 解析器的回归测试（spec §13）：每个 fixtures/**/*.md 交给 parse()，结果与相邻的 .json 快照比对。
// 文件名以 .doc.md 结尾的按整篇模式解析，标题取去掉 .doc.md 的文件名；
// 以 .block.md 结尾的是对话回答，先提取其中的 mdmindmap 代码块再逐块解析。
// 新增样例只需放一个 .md 文件，运行 `npx vitest run -u` 生成快照后人工核对。
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { expect, test } from "vitest";
import { parse, type Node, type ParseResult } from "mdmindmap/parse";
import { findSourceBlocks } from "../src/parse/extract";

const dir = join(import.meta.dirname, "fixtures");
const files = readdirSync(dir, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replaceAll("\\", "/"))
  .sort();

// 快照只记录结构；行内解析由单元测试覆盖。
function snapshotNode(node: Node): unknown {
  return {
    line: node.line,
    text: node.text,
    ...(node.id !== undefined && { id: node.id }),
    ...(node.color !== undefined && { color: node.color }),
    ...(node.fold && { fold: true }),
    ...(node.children.length > 0 && {
      children: node.children.map(snapshotNode),
    }),
    ...(node.summaries.length > 0 && {
      summaries: node.summaries.map((s) => ({
        from: s.from,
        to: s.to,
        node: snapshotNode(s.node),
      })),
    }),
  };
}

function snapshotResult(result: ParseResult): object {
  return {
    root: result.root && snapshotNode(result.root),
    relationships: result.relationships,
    diagnostics: result.diagnostics,
  };
}

function snapshot(file: string, source: string): string {
  const name = basename(file);
  let data: unknown;
  if (name.endsWith(".block.md")) {
    data = findSourceBlocks(source).map((block) => ({
      fenceLine: block.fenceLine,
      ...snapshotResult(parse(block.source)),
    }));
  } else if (name.endsWith(".doc.md")) {
    const title = name.slice(0, -".doc.md".length);
    data = snapshotResult(parse(source, { document: { title } }));
  } else {
    data = snapshotResult(parse(source));
  }
  return `${JSON.stringify(data, null, 2)}\n`;
}

test.each(files)("%s", async (file) => {
  const source = readFileSync(join(dir, file), "utf8");
  await expect(snapshot(file, source)).toMatchFileSnapshot(
    join(dir, file.replace(/\.md$/, ".json")),
  );
});
