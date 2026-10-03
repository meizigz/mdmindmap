import { describe, expect, test } from "vitest";
import { availableName, newMindmapSource } from "../src/new-file";

describe("新建导图的源文", () => {
  test("没有设置 frontmatter：只有根节点标题", () => {
    expect(newMindmapSource("", "未命名导图")).toEqual({
      text: "# 未命名导图\n",
      rootLine: 0,
    });
    expect(newMindmapSource("  \n\n", "a").text).toBe("# a\n");
  });

  test("设置了 frontmatter：放在根节点标题前面", () => {
    expect(newMindmapSource("disabled rules: [all]", "导图")).toEqual({
      text: "---\ndisabled rules: [all]\n---\n# 导图\n",
      rootLine: 3,
    });
  });

  test("用户自己写了 --- 分隔线：不重复加", () => {
    const { text, rootLine } = newMindmapSource(
      "---\ntags: [导图]\n# YAML 注释\ndisabled rules: [all]\n---\n",
      "导图",
    );
    expect(text).toBe(
      "---\ntags: [导图]\n# YAML 注释\ndisabled rules: [all]\n---\n# 导图\n",
    );
    expect(rootLine).toBe(5);
  });

  test("Windows 换行", () => {
    expect(newMindmapSource("a: 1\r\nb: 2\r\n", "x").text).toBe(
      "---\na: 1\nb: 2\n---\n# x\n",
    );
  });
});

describe("不重名的文件名", () => {
  test("没有重名时用原名", () => {
    expect(availableName("未命名导图", () => false)).toBe("未命名导图");
  });

  test("重名时加序号", () => {
    const taken = new Set(["未命名导图", "未命名导图 1"]);
    expect(availableName("未命名导图", (name) => taken.has(name))).toBe(
      "未命名导图 2",
    );
  });
});
