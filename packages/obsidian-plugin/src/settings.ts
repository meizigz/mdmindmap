// 插件设置：目前只有「新建导图」写在文件开头的 frontmatter。

import { PluginSettingTab, Setting, type App, type Plugin } from "obsidian";
import { t } from "./i18n";

export interface Settings {
  /** 命令「新建导图」写在文件开头的 frontmatter，不含 --- 分隔线；空字符串表示不写。 */
  newFileFrontmatter: string;
}

export const DEFAULT_SETTINGS: Settings = { newFileFrontmatter: "" };

export class SettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private readonly settings: Settings,
    private readonly save: () => Promise<void>,
  ) {
    super(app, plugin);
  }

  override display(): void {
    this.containerEl.empty();
    new Setting(this.containerEl)
      .setName(t("newFileFrontmatter"))
      .setDesc(t("newFileFrontmatterDesc"))
      .addTextArea((text) =>
        text
          .setValue(this.settings.newFileFrontmatter)
          .onChange(async (value) => {
            this.settings.newFileFrontmatter = value;
            await this.save();
          }),
      );
  }
}
