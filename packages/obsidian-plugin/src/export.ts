// 导出 PNG / SVG（spec §10）：存进 Obsidian 的附件文件夹（遵循用户的附件设置），
// 文件名「<笔记名> 导图.png」，重名时由 Obsidian 自动加序号。

import { Menu, Notice, type App } from "obsidian";
import type { MindMap } from "mdmindmap";
import { t } from "./i18n";

export type ExportKind = "png" | "svg";

export async function exportMap(
  app: App,
  map: MindMap,
  kind: ExportKind,
  sourcePath: string,
  baseName: string,
): Promise<void> {
  try {
    const name = `${baseName} ${t("viewTitle")}.${kind}`;
    const path = await app.fileManager.getAvailablePathForAttachment(
      name,
      sourcePath,
    );
    if (kind === "png") {
      const blob = await map.exportPng();
      await app.vault.createBinary(path, await blob.arrayBuffer());
    } else {
      await app.vault.create(path, await map.exportSvg());
    }
    new Notice(`${t("exported")}${path}`);
  } catch (error) {
    new Notice(
      `${t("exportFailed")}${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** 弹出「导出 PNG / 导出 SVG」菜单。 */
export function showExportMenu(
  app: App,
  map: MindMap,
  sourcePath: string,
  baseName: string,
  event: MouseEvent,
): void {
  const menu = new Menu();
  for (const kind of ["png", "svg"] as const) {
    menu.addItem((item) =>
      item
        .setTitle(t(kind === "png" ? "exportPng" : "exportSvg"))
        .setIcon("image-down")
        .onClick(() => void exportMap(app, map, kind, sourcePath, baseName)),
    );
  }
  menu.showAtMouseEvent(event);
}
