// 导出 PNG / SVG（spec §10）：存进 Obsidian 的附件文件夹（遵循用户的附件设置），
// 文件名「<笔记名> 导图.png」，重名时由 Obsidian 自动加序号。

import { Menu, Notice, Platform, type App } from "obsidian";
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

/** 让用户在系统「另存为」对话框里选位置（桌面端；Electron 对下载默认弹这个对话框）。 */
async function saveAs(
  map: MindMap,
  kind: ExportKind,
  baseName: string,
): Promise<void> {
  try {
    const blob =
      kind === "png"
        ? await map.exportPng()
        : new Blob([await map.exportSvg()], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = createEl("a");
    a.href = url;
    a.download = `${baseName} ${t("viewTitle")}.${kind}`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch (error) {
    new Notice(
      `${t("exportFailed")}${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/** 往菜单里加「导出 PNG / SVG」（存进附件文件夹），桌面端再加「导出到…」（自选位置）。 */
export function addExportItems(
  menu: Menu,
  app: App,
  map: MindMap,
  sourcePath: string,
  baseName: string,
): void {
  for (const kind of ["png", "svg"] as const) {
    const label = t(kind === "png" ? "exportPng" : "exportSvg");
    menu.addItem((item) =>
      item
        .setTitle(label)
        .setIcon("image-down")
        .onClick(() => void exportMap(app, map, kind, sourcePath, baseName)),
    );
    if (Platform.isDesktopApp) {
      menu.addItem((item) =>
        item
          .setTitle(`${label}${t("saveAsSuffix")}`)
          .setIcon("folder-down")
          .onClick(() => void saveAs(map, kind, baseName)),
      );
    }
  }
}

/** 弹出导出菜单。 */
export function showExportMenu(
  app: App,
  map: MindMap,
  sourcePath: string,
  baseName: string,
  event: MouseEvent,
): void {
  const menu = new Menu();
  addExportItems(menu, app, map, sourcePath, baseName);
  menu.showAtMouseEvent(event);
}
