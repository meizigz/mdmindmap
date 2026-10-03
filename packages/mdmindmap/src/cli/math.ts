// 用 KaTeX + mhchem 试渲染公式。KaTeX 是可选依赖：没装时返回 null，check 跳过公式检查。

import type { MathCheck } from "./check";

export async function loadMathCheck(): Promise<MathCheck | null> {
  try {
    const { default: katex } = await import("katex");
    await import("katex/contrib/mhchem");
    return (tex) => {
      try {
        katex.renderToString(tex, { throwOnError: true, strict: "ignore" });
        return null;
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    };
  } catch {
    return null;
  }
}
