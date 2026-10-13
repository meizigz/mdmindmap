# MD Mindmap for VS Code

Render [mdmindmap](https://github.com/meizigz/mdmindmap) mind maps (Markdown headings + lists) inside VS Code. 在 VS Code 里渲染 mdmindmap 思维导图。

- **Markdown preview**: a fenced ` ```mdmindmap ` code block is drawn as a mind map in the built-in preview (`Ctrl+Shift+V`). Add `height=500` to the fence line to fix the height.
- **Whole file**: run **MD Mindmap: Open Mind Map to the Side** (or the button in the editor title bar) to draw the whole `.md` file as a mind map. It updates as you type; click a node to jump to its source line.
- Follows the VS Code color theme. Setting `mdmindmap.layout`: `logic` or `bilateral`.

## Develop

From the repository root: `npm run build -w mdmindmap-vscode`, then press `F5` with this folder (`packages/vscode-extension`) open in VS Code, or `npm run package -w mdmindmap-vscode` to produce a `.vsix`.
