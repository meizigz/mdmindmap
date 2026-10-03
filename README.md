# MD Mindmap

[中文说明](README.zh-CN.md)

Render read-only mind maps from Markdown headings and lists, with summary braces, cross-branch relationships, colors and math.

The source is plain Markdown: without the plugin it is still a readable outline. It is designed so that an AI writes the first draft and you fine-tune it by hand.

> Status: v0.x, under active development. Not yet submitted to the community plugin list.

## Writing a mind map

Put the map in a `mdmindmap` code block:

````markdown
```mdmindmap
# Newton's laws

- First law ^law1
  - Inertia
- Second law 🔴 ^law2
  - { $F=ma$
  - $a$ follows the net force
  - } Quantitative relation
- Applications <!-- fold -->
  - [[Connected bodies]]

%%
law1 -.->|special case| law2
%%
```
````

| What              | How                                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Nodes             | `#` headings and `-` lists; indent 2 spaces per level. One root.                                                                          |
| Summary brace     | Put `{ ` before the first bracketed sibling and add a sibling line `- } summary text` after the last one. The summary may have children.  |
| Relationship      | In a `%%` … `%%` block at the very end: `from --> to`, `-.->` dashed, `==>` thick, optional `\|label\|`. Endpoints are node IDs.          |
| Node ID           | `^id` at the end of a node line (letters, digits, `-`).                                                                                   |
| Color             | One of 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ at the end of the line.                                                                                       |
| Folded by default | `<!-- fold -->` at the end of the line.                                                                                                   |
| Inline            | `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `==highlight==`, `$math$` (incl. `\ce{}` chemistry), `[[wikilinks]]`, `[links](url)`. |

The full rules, written for AI assistants, are in [`ai-guide.md`](packages/mdmindmap/ai-guide.md) (Chinese). The command **Copy AI authoring guide** puts it on your clipboard so you can paste it into a chat. The guide is in Chinese, as are all diagnostic messages.

To check a file from the command line (also handy for AI agents): `npx mdmindmap check <file>`, after [installing the library](packages/mdmindmap/README.md#install).

## Using it in Obsidian

- **Code blocks** render in Reading view and Live Preview. Click the map once to activate it; then scroll to zoom, drag to pan, pinch on touch screens. Click outside or press Esc to give scrolling back to the note.
- **Click a node** to jump to its line in the source. **Right-click / long-press** a node to copy its text.
- **Fold** a branch with the small button at the end of its line; the number shows how many nodes are hidden.
- **Whole notes as maps**: run **Open current file as mind map** (or use the file menu). Any `.md` file works; the note's only top-level heading becomes the root, otherwise the file name does. Edit the note in a split pane and the map follows.
- **New mind map**: the command **New mind map** creates a note holding just a root heading in your default location for new notes, opens it in the editor, and shows its map in a split on the right. To add frontmatter to every new mind map, set it in the plugin settings: for example `disabled rules: [all]` stops the Linter plugin from reformatting mind map notes.
- **Toolbar** (top right of an embedded map): open the map in its own tab, or export it as PNG / SVG into your attachment folder.
- Problems in the source show up as a ⚠ badge in the corner; click it to see what to fix.

Colors follow your theme. To restyle, use CSS snippets — see [Styling](#styling).

## Styling

Everything is driven by `--mdmm-*` CSS variables and three stable attributes: `data-depth`, `data-color`, `data-summary`. Some snippet examples:

```css
/* Solid red nodes with white text */
.mdmm-node[data-color="red"] {
  --mdmm-color-fill-amount: 100%;
  color: white;
}

/* Wider nodes before wrapping */
.mdmm {
  --mdmm-node-max-width: 320px;
}

/* Relationship lines in orange */
.mdmm {
  --mdmm-relation: var(--color-orange);
}
```

The full variable list is in the [library README](packages/mdmindmap/README.md#css-variables).

## Known limitations

- Wikilinks inside code blocks are not indexed by Obsidian (no backlinks, not updated on rename). In whole-note maps they are ordinary links.
- iOS / iPadOS has not been tested yet.
- No visual editing: the Markdown source is the only way to change a map.

## Using it on the web

The renderer is also a standalone library for web apps: see [packages/mdmindmap](packages/mdmindmap/README.md).

## Development

Local debugging, the bundled test vault, and testing releases with BRAT are covered in [docs/development.md](docs/development.md) (in Chinese).

## License

MIT
