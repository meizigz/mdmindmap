import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, test } from "vitest";
import { parse } from "mdmindmap/parse";
import { checkText } from "../src/cli/check";
import { loadMathCheck } from "../src/cli/math";
import { findSourceBlocks } from "../src/parse/extract";

const dir = join(import.meta.dirname, "fixtures");
const files = readdirSync(dir, { recursive: true, encoding: "utf8" })
  .map((f) => f.replaceAll("\\", "/"))
  .filter((f) => f.endsWith(".doc.md") || f.endsWith(".block.md"))
  .sort();

describe("check 与 parse() 的结果一致", () => {
  test.each(files)("%s", (file) => {
    const text = readFileSync(join(dir, file), "utf8");
    const name = basename(file);
    const expected = name.endsWith(".block.md")
      ? findSourceBlocks(text).flatMap((block) =>
          parse(block.source).diagnostics.map((d) => ({
            ...d,
            line: d.line + block.fenceLine,
          })),
        )
      : parse(text, { document: { title: name.slice(0, -".md".length) } })
          .diagnostics;
    expect(checkText(name, text)).toEqual(
      [...expected].sort((a, b) => a.line - b.line),
    );
  });
});

test("自动识别：含代码块的文件逐块解析，行号换算成文件行号", () => {
  const text = "说明文字\n\n```mdmindmap\n# 根\n- 子 ^a\n- 子 ^a\n```\n";
  expect(checkText("回答.md", text)).toMatchObject([
    { line: 6, code: "ID_DUP" },
  ]);
});

test("自动识别：没有代码块的文件按整篇模式解析，标题取文件名", () => {
  const diagnostics = checkText("笔记/电磁感应.md", "- 甲 ^a 🔴\n");
  expect(diagnostics).toMatchObject([{ line: 1, code: "ID_NOT_LAST" }]);
});

describe("公式检查", async () => {
  const checkMath = await loadMathCheck();

  test("KaTeX 可用", () => {
    expect(checkMath).not.toBeNull();
  });

  test("正确的公式和 mhchem 化学式不报", () => {
    const text =
      "# 根\n- $\\frac{1}{2}mv^2$\n- $\\ce{2H2 + O2 -> 2H2O}$\n- $F_合$\n";
    expect(checkText("a.md", text, checkMath ?? undefined)).toEqual([]);
  });

  test("渲染失败的公式报 MATH_ERROR，带上 KaTeX 的出错信息", () => {
    const text = "# 根\n- 子节点\n  - **强调 $\\frac{1}{$**\n";
    expect(checkText("a.md", text, checkMath ?? undefined)).toMatchObject([
      {
        line: 3,
        severity: "warning",
        code: "MATH_ERROR",
        message: expect.stringContaining("KaTeX") as unknown,
      },
    ]);
  });
});
