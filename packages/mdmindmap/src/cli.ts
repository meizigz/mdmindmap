#!/usr/bin/env node
// 命令行工具（spec §11）：check 校验源文，guide 打印给 AI 的写作说明。

import { readFile } from "node:fs/promises";
import { checkText } from "./cli/check";
import { loadMathCheck } from "./cli/math";
import type { Diagnostic } from "./parse";

const USAGE = `用法：
  mdmindmap check <文件…> [--json]   校验源文（整篇 .md，或含 mdmindmap 代码块的文件）
  mdmindmap guide                    打印给 AI 的写作说明`;

const LABEL = { error: "错误", warning: "警告", hint: "提示" } as const;

async function check(args: string[]): Promise<number> {
  const json = args.includes("--json");
  const files = args.filter((a) => a !== "--json");
  if (files.length === 0) {
    console.error(USAGE);
    return 2;
  }

  const checkMath = await loadMathCheck();
  const results: { file: string; diagnostics: Diagnostic[] }[] = [];
  for (const file of files) {
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      console.error(`读不到文件：${file}`);
      return 2;
    }
    results.push({
      file,
      diagnostics: checkText(file, text, checkMath ?? undefined),
    });
  }

  const all = results.flatMap((r) => r.diagnostics);
  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    for (const { file, diagnostics } of results) {
      for (const d of diagnostics) {
        console.log(
          `${file}:${d.line}  ${LABEL[d.severity]}  ${d.code}  ${d.message}`,
        );
        if (d.fix) console.log(`    改法：${d.fix}`);
      }
    }
    const count = (s: Diagnostic["severity"]) =>
      all.filter((d) => d.severity === s).length;
    console.log(
      all.length === 0
        ? "没有发现问题。"
        : `共 ${count("error")} 个错误，${count("warning")} 个警告，${count("hint")} 个提示。`,
    );
    if (!checkMath) console.log("（没有安装 katex，跳过了公式检查。）");
  }
  return all.some((d) => d.severity === "error") ? 1 : 0;
}

async function guide(): Promise<number> {
  const text = await readFile(
    new URL("../ai-guide.md", import.meta.url),
    "utf8",
  );
  process.stdout.write(text);
  return 0;
}

const [command, ...rest] = process.argv.slice(2);
const code =
  command === "check"
    ? await check(rest)
    : command === "guide"
      ? await guide()
      : (console.log(USAGE), 0);
process.exitCode = code;
