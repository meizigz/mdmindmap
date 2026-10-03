// 从一篇 markdown（例如 AI 在对话里的回答）里找出 ```mdmindmap 代码块。命令行工具和测试共用。

export interface SourceBlock {
  /** 代码块里的源文。 */
  source: string;
  /** 开头围栏所在的行（从 1 开始）。源文第 n 行 = 文件第 fenceLine + n 行。 */
  fenceLine: number;
  /** 语言名后面的其余部分，例如 `height=500`。 */
  info: string;
}

const OPEN = /^ {0,3}(`{3,}|~{3,})[ \t]*mdmindmap(?:[ \t]+(.*?))?[ \t]*$/;

export function findSourceBlocks(markdown: string): SourceBlock[] {
  const lines = markdown.split(/\r\n|\r|\n/);
  const blocks: SourceBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = OPEN.exec(lines[i] ?? "");
    if (!open) continue;
    const fence = open[1] ?? "```";
    const close = new RegExp(
      `^ {0,3}${fence[0] === "`" ? "`" : "~"}{${fence.length},}[ \\t]*$`,
    );
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (close.test(lines[j] ?? "")) {
        end = j;
        break;
      }
    }
    blocks.push({
      source: lines.slice(i + 1, end).join("\n"),
      fenceLine: i + 1,
      info: open[2] ?? "",
    });
    i = end;
  }
  return blocks;
}
