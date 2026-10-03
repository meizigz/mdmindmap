import { describe, expect, test } from "vitest";
import {
  extractLeadingBrace,
  extractTrailingMarkers,
  stripInlineComments,
} from "../src/parse/markers";
import { classify } from "../src/parse/lines";

describe("行尾标记", () => {
  test("三种标记顺序任意", () => {
    for (const line of [
      "内容 🔴 <!-- fold --> ^a",
      "内容 ^a <!-- fold --> 🔴",
      "内容 <!-- fold --> ^a 🔴",
    ]) {
      expect(extractTrailingMarkers(line)).toMatchObject({
        text: "内容",
        color: "red",
        fold: true,
        id: "a",
      });
    }
  });

  test("ID 在最后时 idNotLast 为 false，后面还有标记时为 true", () => {
    expect(extractTrailingMarkers("内容 🔴 ^a").idNotLast).toBe(false);
    expect(extractTrailingMarkers("内容 ^a 🔴").idNotLast).toBe(true);
    expect(extractTrailingMarkers("内容 ^a <!-- fold -->").idNotLast).toBe(
      true,
    );
  });

  test("每种标记只认一个，第二个当作内容", () => {
    expect(extractTrailingMarkers("内容 ^x ^y")).toMatchObject({
      text: "内容 ^x",
      id: "y",
    });
    expect(extractTrailingMarkers("内容 🔴🟢")).toMatchObject({
      text: "内容 🔴",
      color: "green",
    });
  });

  test("只有行尾的内容可以是标记", () => {
    expect(extractTrailingMarkers("^a 开头不算")).toEqual({
      text: "^a 开头不算",
      fold: false,
      idNotLast: false,
    });
    expect(extractTrailingMarkers("x^a").id).toBeUndefined();
    expect(extractTrailingMarkers("^only").id).toBe("only");
  });

  test("看起来像ID的非法 token 记为 invalidId，公式里的 ^ 不提示", () => {
    expect(extractTrailingMarkers("期望 ^期望").invalidId).toBe("期望");
    expect(extractTrailingMarkers("$\\ce{H2 ^}$").invalidId).toBeUndefined();
    expect(extractTrailingMarkers("$\\ce{H2 ^}$").text).toBe("$\\ce{H2 ^}$");
  });

  test("反斜杠转义", () => {
    expect(extractTrailingMarkers("内容 \\^abc")).toMatchObject({
      text: "内容 ^abc",
    });
    expect(extractTrailingMarkers("内容 \\🔴")).toEqual({
      text: "内容 🔴",
      fold: false,
      idNotLast: false,
    });
    expect(extractTrailingMarkers("内容 \\🔴 ^a")).toMatchObject({
      text: "内容 🔴",
      id: "a",
    });
  });

  test("⚫ 后面的变体选择符", () => {
    expect(extractTrailingMarkers("内容 ⚫\uFE0F").color).toBe("gray");
  });
});

describe("行首括号", () => {
  test("{ 和 } 后面要有空格或行尾", () => {
    expect(extractLeadingBrace("{ 起点")).toEqual({
      text: "起点",
      brace: "open",
    });
    expect(extractLeadingBrace("} 总结")).toEqual({
      text: "总结",
      brace: "close",
    });
    expect(extractLeadingBrace("}")).toEqual({ text: "", brace: "close" });
    expect(extractLeadingBrace("{1,2} 不是括号")).toEqual({
      text: "{1,2} 不是括号",
    });
  });

  test("反斜杠转义成字面量", () => {
    expect(extractLeadingBrace("\\{ 字面量")).toEqual({ text: "{ 字面量" });
    expect(extractLeadingBrace("\\} 字面量")).toEqual({ text: "} 字面量" });
  });
});

test("去掉行内 %% 注释", () => {
  expect(stripInlineComments("前 %%注释%% 后")).toBe("前 后");
  expect(stripInlineComments("前%%注释%%后")).toBe("前后");
});

describe("行分类", () => {
  test("#标签 不是标题", () => {
    expect(classify("#标签", 1).kind).toBe("other");
    expect(classify("# 标题", 1)).toEqual({
      kind: "heading",
      line: 1,
      level: 1,
      text: "标题",
    });
  });

  test("空的列表项也是列表项", () => {
    expect(classify("- ", 1)).toEqual({
      kind: "item",
      line: 1,
      indent: 0,
      text: "",
    });
  });

  test("分隔线不是列表项", () => {
    expect(classify("- - -", 1).kind).toBe("other");
    expect(classify("***", 1).kind).toBe("other");
  });
});
