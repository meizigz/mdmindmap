export type PresetColor =
  "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "gray";

/** 行内解析的结果：固定子集（spec §3），不碰 DOM。 */
export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "del"; children: Inline[] }
  | { type: "mark"; children: Inline[] }
  | { type: "code"; text: string }
  | { type: "math"; tex: string }
  | { type: "wikilink"; target: string; alias?: string }
  | { type: "link"; href: string; children: Inline[] };

export interface Summary {
  /** 括住的第一个兄弟在 children 中的下标。 */
  from: number;
  /** 括住的最后一个兄弟在 children 中的下标。 */
  to: number;
  node: Node;
}

export interface Node {
  /** 去掉行尾标记、行首括号和行内 %% 注释后的文字。行内 markdown 的转义留给行内解析处理。 */
  text: string;
  inline: Inline[];
  /** 在源文中的行号，从 1 开始。 */
  line: number;
  id?: string;
  color?: PresetColor;
  fold: boolean;
  children: Node[];
  summaries: Summary[];
}

export type RelationshipStyle = "solid" | "dashed" | "thick";

export interface Relationship {
  from: string;
  to: string;
  style: RelationshipStyle;
  label?: string;
  line: number;
}

export type Severity = "error" | "warning" | "hint";

export interface Diagnostic {
  line: number;
  severity: Severity;
  /** 稳定的英文类别名，属于公开 API。 */
  code: string;
  message: string;
  fix?: string;
}

export interface ParseOptions {
  /** 传了就进入整篇模式；title 在没有唯一一级标题时用作根节点。 */
  document?: { title: string };
}

export interface ParseResult {
  root: Node | null;
  relationships: Relationship[];
  diagnostics: Diagnostic[];
}
