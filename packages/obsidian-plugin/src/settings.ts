// 插件设置：目前只有「新建导图」写在文件开头的 frontmatter。

import { PluginSettingTab, Setting, type App, type Plugin } from "obsidian";
import { t } from "./i18n";
import { newMindmapSource } from "./new-file";
import exampleSource from "../../../docs/images/example.md";
import exampleSvg from "../../../docs/images/example.svg";

const EXAMPLE_FRONTMATTER = "disabled rules: [all]";

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
          .setPlaceholder(EXAMPLE_FRONTMATTER)
          .setValue(this.settings.newFileFrontmatter)
          .onChange(async (value) => {
            this.settings.newFileFrontmatter = value;
            renderPreview();
            await this.save();
          }),
      );

    // 示例：按当前设置，新建出来的文件长什么样
    const preview = this.containerEl.createDiv({
      cls: "mdmindmap-settings-preview",
    });
    preview.createDiv({ text: t("newFilePreview") });
    const pre = preview.createEl("pre");
    const renderPreview = () => {
      const frontmatter =
        this.settings.newFileFrontmatter.trim() === ""
          ? EXAMPLE_FRONTMATTER
          : this.settings.newFileFrontmatter;
      pre.setText(newMindmapSource(frontmatter, t("untitledMindmap")).text);
    };
    renderPreview();

    // 效果图：一张导图的样子
    const sample = this.containerEl.createDiv({
      cls: "mdmindmap-settings-example",
    });
    sample.createDiv({ text: t("exampleImage") });
    sample.createEl("img", {
      attr: {
        src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(exampleSvg)}`,
        alt: t("exampleImage"),
      },
    });
    sample.createDiv({ text: t("exampleSource") });
    sample.createEl("pre", { text: exampleSource });
  }
}
