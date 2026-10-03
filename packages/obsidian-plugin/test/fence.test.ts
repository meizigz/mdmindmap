import { describe, expect, test } from "vitest";
import { blockOrdinal, parseFence } from "../src/fence";

describe("围栏参数", () => {
  test("height=", () => {
    expect(parseFence("```mdmindmap height=500")).toEqual({ height: 500 });
    expect(parseFence("~~~ mdmindmap  height = 320px")).toEqual({
      height: 320,
    });
    expect(parseFence("```mdmindmap")).toEqual({});
    expect(parseFence("```mdmindmap height=abc")).toEqual({});
    expect(parseFence("```mdmindmap height=0")).toEqual({});
    expect(parseFence("```mermaid height=500")).toEqual({});
  });

  test("第几个代码块", () => {
    const text = [
      "# 笔记",
      "```mdmindmap",
      "# a",
      "```",
      "```js",
      "x",
      "```",
      "```mdmindmap",
      "# b",
      "```",
    ].join("\n");
    expect(blockOrdinal(text, 1)).toBe(0);
    expect(blockOrdinal(text, 7)).toBe(1);
  });
});
