import { describe, expect, it } from "vitest";
import MarkdownIt from "markdown-it";
import { extendMarkdownIt, parseInfo } from "../src/markdown-it";

const md = extendMarkdownIt(new MarkdownIt());

describe("parseInfo", () => {
  it("只认 mdmindmap 围栏", () => {
    expect(parseInfo("mdmindmap")).toEqual({});
    expect(parseInfo("js")).toBeNull();
  });
  it("读取 height 参数", () => {
    expect(parseInfo("mdmindmap height=500")).toEqual({ height: 500 });
    expect(parseInfo("mdmindmap height=500px")).toEqual({ height: 500 });
    expect(parseInfo("mdmindmap height=0")).toEqual({});
  });
});

describe("fence rule", () => {
  it("把 mdmindmap 代码块换成带转义源文的占位 div", () => {
    const html = md.render('```mdmindmap height=300\n# 根\n- "a" <b>\n```');
    expect(html).toBe(
      '<div class="mdmindmap-block" data-height="300" data-source="# 根\n- &quot;a&quot; &lt;b&gt;\n"></div>\n',
    );
  });
  it("其他代码块照常渲染", () => {
    expect(md.render("```js\nx\n```")).toContain("<pre><code");
  });
});
