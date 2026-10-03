// 插件界面文字：跟随 Obsidian 的语言设置，中文或英文（spec §12）。诊断信息和写作说明只有中文。

import { getLanguage } from "obsidian";

const zh = {
  copyNodeText: "复制节点文字",
  jumpToSource: "跳到源码",
  copyBlockRef: "复制块引用",
  copied: "已复制",
  noSection: "找不到这个代码块在文件里的位置，无法跳转",
  openAsMindmap: "以导图打开当前文件",
  backToDocument: "切回文档",
  openInNewTab: "在新标签页打开",
  copyAiGuide: "复制 AI 写作说明",
  aiGuideCopied: "AI 写作说明已复制",
  exportPng: "导出 PNG",
  exportSvg: "导出 SVG",
  exported: "已导出：",
  exportFailed: "导出失败：",
  viewTitle: "导图",
};

type Strings = typeof zh;

const en: Strings = {
  copyNodeText: "Copy node text",
  jumpToSource: "Go to source",
  copyBlockRef: "Copy block reference",
  copied: "Copied",
  noSection:
    "Cannot locate this code block in the file, so it cannot jump to the source",
  openAsMindmap: "Open current file as mind map",
  backToDocument: "Back to document",
  openInNewTab: "Open in new tab",
  copyAiGuide: "Copy AI authoring guide",
  aiGuideCopied: "AI authoring guide copied",
  exportPng: "Export PNG",
  exportSvg: "Export SVG",
  exported: "Exported: ",
  exportFailed: "Export failed: ",
  viewTitle: "Mind map",
};

export function t(key: keyof Strings): string {
  return getLanguage().toLowerCase().startsWith("zh") ? zh[key] : en[key];
}
