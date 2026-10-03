import { describe, expect, test } from "vitest";
import { parseInline } from "mdmindmap/parse";

const t = (text: string) => ({ type: "text", text });

describe("强调", () => {
  test("粗体、斜体、删除线、高亮", () => {
    expect(parseInline("**粗** *斜* ~~删~~ ==亮==")).toEqual([
      { type: "strong", children: [t("粗")] },
      t(" "),
      { type: "em", children: [t("斜")] },
      t(" "),
      { type: "del", children: [t("删")] },
      t(" "),
      { type: "mark", children: [t("亮")] },
    ]);
  });

  test("中文标点紧挨着也能配对", () => {
    expect(parseInline("**“引号”**后")).toEqual([
      { type: "strong", children: [t("“引号”")] },
      t("后"),
    ]);
  });

  test("嵌套：粗体里有公式和斜体", () => {
    expect(parseInline("**合力 $F=ma$ 与 *加速度***")).toEqual([
      {
        type: "strong",
        children: [
          t("合力 "),
          { type: "math", tex: "F=ma" },
          t(" 与 "),
          { type: "em", children: [t("加速度")] },
        ],
      },
    ]);
  });

  test("*** 是粗斜体", () => {
    expect(parseInline("***重点***")).toEqual([
      { type: "em", children: [{ type: "strong", children: [t("重点")] }] },
    ]);
  });

  test("未闭合的标记原样显示", () => {
    expect(parseInline("**没闭合")).toEqual([t("**没闭合")]);
    expect(parseInline("a * b * c")).toEqual([t("a * b * c")]);
    expect(parseInline("~单个波浪线~")).toEqual([t("~单个波浪线~")]);
    expect(parseInline("a == b")).toEqual([t("a == b")]);
  });

  test("下划线不是强调", () => {
    expect(parseInline("F_合 与 __x__")).toEqual([t("F_合 与 __x__")]);
  });
});

describe("代码与公式", () => {
  test("代码里的内容当原文", () => {
    expect(parseInline("`**不加粗** $x$`")).toEqual([
      { type: "code", text: "**不加粗** $x$" },
    ]);
    expect(parseInline("`` a`b ``")).toEqual([{ type: "code", text: "a`b" }]);
  });

  test("公式里的内容当原文，含 mhchem", () => {
    expect(parseInline("$\\ce{2H2 + O2 -> 2H2O}$")).toEqual([
      { type: "math", tex: "\\ce{2H2 + O2 -> 2H2O}" },
    ]);
    expect(parseInline("$a*b*c$")).toEqual([{ type: "math", tex: "a*b*c" }]);
  });

  test("$ 的判定与 Obsidian 一致", () => {
    expect(parseInline("$5 and $6")).toEqual([t("$5 and $6")]);
    expect(parseInline("$ x$")).toEqual([t("$ x$")]);
    expect(parseInline("$x $")).toEqual([t("$x $")]);
    expect(parseInline("$a $b$")).toEqual([{ type: "math", tex: "a $b" }]);
    expect(parseInline("$\\$5$")).toEqual([{ type: "math", tex: "\\$5" }]);
  });

  test("$$ 也当作公式", () => {
    expect(parseInline("$$E=mc^2$$")).toEqual([
      { type: "math", tex: "E=mc^2" },
    ]);
  });
});

describe("链接", () => {
  test("双链与显示文字", () => {
    expect(parseInline("见 [[连接体问题]]")).toEqual([
      t("见 "),
      { type: "wikilink", target: "连接体问题" },
    ]);
    expect(parseInline("[[笔记#^law2|第二定律]]")).toEqual([
      { type: "wikilink", target: "笔记#^law2", alias: "第二定律" },
    ]);
  });

  test("外部链接，链接文字可以带格式", () => {
    expect(parseInline("[**官网**](https://example.com)")).toEqual([
      {
        type: "link",
        href: "https://example.com",
        children: [{ type: "strong", children: [t("官网")] }],
      },
    ]);
  });

  test("图片、嵌入和脚注原样显示", () => {
    expect(parseInline("![图](a.png)")).toEqual([t("![图](a.png)")]);
    expect(parseInline("![[图.png]]")).toEqual([t("![[图.png]]")]);
    expect(parseInline("注[^1]")).toEqual([t("注[^1]")]);
  });

  test("HTML 标签原样显示", () => {
    expect(parseInline("<b>粗</b>")).toEqual([t("<b>粗</b>")]);
  });
});

test("反斜杠转义 markdown 标点", () => {
  expect(parseInline("\\*不是斜体\\*")).toEqual([t("*不是斜体*")]);
  expect(parseInline("\\[[不是双链]]")).toEqual([t("[[不是双链]]")]);
  expect(parseInline("\\$5")).toEqual([t("$5")]);
  expect(parseInline("a\\b")).toEqual([t("a\\b")]);
});
