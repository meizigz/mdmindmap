import type { Diagnostic, Severity } from "./types";

// spec §5 的诊断清单。code 是公开 API；message 和 fix 用中文，面向人和 AI。
const SEVERITY = {
  NO_NODES: "error",
  MULTI_ROOT: "error",
  ID_DUP: "error",
  SUM_NO_SIBLINGS: "error",
  SUM_OPEN_UNCLOSED: "error",
  SUM_DOUBLE_OPEN: "error",
  REL_UNKNOWN_ID: "error",
  REL_SELF: "error",
  REL_UNPARSED: "error",
  REGION_UNCLOSED: "error",
  REGION_NOT_LAST: "error",
  NON_NODE_LINE: "warning",
  SUM_EMPTY: "warning",
  REL_OUTSIDE_REGION: "warning",
  ID_INVALID: "warning",
  MATH_ERROR: "warning",
  ID_NOT_LAST: "hint",
} as const satisfies Record<string, Severity>;

export type DiagnosticCode = keyof typeof SEVERITY;

export function diagnostic(
  code: DiagnosticCode,
  line: number,
  message: string,
  fix?: string,
): Diagnostic {
  const d: Diagnostic = { line, severity: SEVERITY[code], code, message };
  if (fix !== undefined) d.fix = fix;
  return d;
}

/** 截短节点文字，用在诊断信息里指认是哪个节点。 */
export function quote(text: string): string {
  const chars = [...text];
  return chars.length > 20 ? `${chars.slice(0, 20).join("")}…` : text;
}
