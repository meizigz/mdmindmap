// 代码块围栏行上的参数：```mdmindmap height=500（附录 A「源文形态」）。

export interface FenceOptions {
  /** 写了 height= 时的高度（px）；没写时导图按叶子数自动估算。 */
  height?: number;
}

const FENCE = /^\s*(`{3,}|~{3,})\s*mdmindmap\b(.*)$/;

export function parseFence(line: string): FenceOptions {
  const match = FENCE.exec(line);
  if (!match) return {};
  const height = /(?:^|\s)height\s*=\s*(\d+)(?:px)?(?=\s|$)/.exec(
    match[2] ?? "",
  );
  const value = height ? Number(height[1]) : NaN;
  return Number.isFinite(value) && value > 0 ? { height: value } : {};
}

/** 这个代码块是文件里的第几个 mdmindmap 代码块（从 0 开始）；分屏接手旧实例时用来认出「同一个代码块」。 */
export function blockOrdinal(text: string, fenceLine: number): number {
  const lines = text.split("\n").slice(0, fenceLine);
  return lines.filter((line) => FENCE.test(line)).length;
}
