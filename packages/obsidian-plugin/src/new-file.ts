// 命令「新建导图」：新文件的内容和文件名。不依赖 Obsidian，方便测试。

const DELIMITER = /^---[ \t]*$/;

/**
 * 新导图文件的源文：设置里的 frontmatter（可选）加一个根节点标题。
 * frontmatter 写不写 --- 分隔线都行。rootLine 是根节点标题所在的行（从 0 起）。
 */
export function newMindmapSource(
  frontmatter: string,
  root: string,
): { text: string; rootLine: number } {
  const lines = frontmatter.replace(/\r\n?/g, "\n").trim().split("\n");
  if (DELIMITER.test(lines[0] ?? "")) lines.shift();
  if (DELIMITER.test(lines.at(-1) ?? "")) lines.pop();
  const yaml = lines.join("\n").trim();
  const head = yaml === "" ? [] : ["---", ...yaml.split("\n"), "---"];
  return {
    text: [...head, `# ${root}`, ""].join("\n"),
    rootLine: head.length,
  };
}

/** base 被占用时依次试「base 1」「base 2」……，和 Obsidian 新建笔记的规则一样。 */
export function availableName(
  base: string,
  taken: (name: string) => boolean,
): string {
  if (!taken(base)) return base;
  for (let i = 1; ; i++) {
    const name = `${base} ${i}`;
    if (!taken(name)) return name;
  }
}
