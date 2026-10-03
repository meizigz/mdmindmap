// 节点菜单（右键或长按）：复制节点文字、跳到源码、复制块引用（spec §12）。
// 画布禁止选中文字，复制节点文字靠这个菜单。

import { Menu, Notice } from "obsidian";
import type { Node } from "mdmindmap";
import { t } from "./i18n";

export interface NodeMenuOptions {
  node: Node;
  position: { x: number; y: number };
  doc: Document;
  /** 没有时不显示「跳到源码」（例如拿不到代码块位置）。 */
  jump?: () => void;
  /** 整篇模式下文件的链接文字（用来拼块引用）；代码块里的 ^id 不是 Obsidian 块ID，不提供。 */
  linkpath?: string;
}

export function showNodeMenu({
  node,
  position,
  doc,
  jump,
  linkpath,
}: NodeMenuOptions): void {
  const menu = new Menu();
  menu.addItem((item) =>
    item
      .setTitle(t("copyNodeText"))
      .setIcon("copy")
      .onClick(() => copy(node.text)),
  );
  if (jump) {
    menu.addItem((item) =>
      item.setTitle(t("jumpToSource")).setIcon("file-search").onClick(jump),
    );
  }
  if (linkpath !== undefined && node.id) {
    const ref = `[[${linkpath}#^${node.id}]]`;
    menu.addItem((item) =>
      item
        .setTitle(t("copyBlockRef"))
        .setIcon("link")
        .onClick(() => copy(ref)),
    );
  }
  menu.showAtPosition(position, doc);
}

function copy(text: string): void {
  void navigator.clipboard.writeText(text).then(() => new Notice(t("copied")));
}
