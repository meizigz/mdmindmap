# mdmindmap

[中文说明](README.zh-CN.md)

Render read-only mind maps from Markdown headings and lists — with summary braces, cross-branch relationships, preset colors and math — plus a DOM-free parser and a `check` CLI for validating sources (handy when an AI writes them).

Also available as the Obsidian plugin **MD Mindmap** (same repository).

## Install

```sh
npm install mdmindmap
```

ESM only, Node ≥ 20.19 for the parser and CLI. The renderer runs in the browser.

## Render

```ts
import "mdmindmap/style.css";
import "katex/dist/katex.min.css";
import { render } from "mdmindmap";
import { katexMath } from "mdmindmap/katex";

const source = `# Newton's laws
- First law ^law1
  - Inertia
- Second law 🔴 ^law2
  - { $F=ma$
  - $a$ follows the net force
  - } Quantitative relation

%%
law1 -.->|special case| law2
%%`;

const map = render(document.getElementById("map")!, source, {
  math: katexMath(),
});
await map.ready;
```

The container needs a height (the map fills it), or pass `height`.

### Options

| Option | Default | |
|---|---|---|
| `math` | — (required) | Formula renderer. `katexMath()` from `mdmindmap/katex` (KaTeX + mhchem), or your own `{ render(tex): HTMLElement, flush?(), exportCss?() }`. |
| `layout` | `"logic"` | `"logic"` (grows right) or `"bilateral"` (both sides). |
| `height` | fill the container | A number (px) or `"auto"` (estimated from the visible leaves, 220–600 px). With a height, the bottom edge can be dragged. |
| `interaction` | `"click-to-activate"` when `height` is given, else `"direct"` | Click-to-activate leaves wheel and touch scrolling to the page until the map is clicked. |
| `document` | — | `{ title }`: whole-document mode — non-node content is skipped; the only `#` heading (or `title`) is the root. |
| `onNodeClick(node)` | — | `node.line` is the 1-based source line. |
| `onLinkClick(target, event)` | — | `[[wikilink]]` clicks. Without it wikilinks are plain text. External links open in a new window. |
| `onNodeMenu(node, { x, y })` | — | Right-click or long-press (550 ms). |
| `onDiagnostics(list)` / `onDiagnosticClick(d)` | — | Parse problems; a ⚠ badge in the corner lists them. |

### Instance

```ts
map.ready                    // Promise: first draw finished
map.diagnostics              // parse problems
await map.update(source)     // incremental: keeps viewport and folds, reuses unchanged nodes
map.fit()
await map.setLayout("bilateral")
await map.collapseAll(1)     // keep only root and first-level branches
await map.revealLine(12)     // bring the node on line 12 into view and flash it
await map.exportSvg()        // string; nodes embedded via foreignObject
await map.exportPng({ scale: 2, maxSide: 16000 })  // Blob
map.destroy()
```

Exports use the current theme; all `--mdmm-*` variables are resolved, so the file looks right outside the page. With `katexMath()`, KaTeX fonts are inlined — the KaTeX stylesheet must be same-origin (or loaded with `crossorigin`) so its rules can be read.

## Parse (no DOM)

```ts
import { parse } from "mdmindmap/parse";

const { root, relationships, diagnostics } = parse(source);
for (const d of diagnostics) console.log(d.line, d.severity, d.code, d.message, d.fix);
```

`code` is a stable English identifier; `message` and `fix` are written in Chinese.

## CLI

```sh
npx mdmindmap check notes/*.md        # whole .md files, or files containing mdmindmap code blocks
npx mdmindmap check answer.md --json  # [{ file, diagnostics }] with file line numbers
npx mdmindmap guide                    # print the authoring guide for AI assistants (Chinese)
```

`check` exits with 1 when there are errors. It also test-renders every formula with KaTeX + mhchem (`MATH_ERROR` warnings).

## CSS variables

The public styling API is these variables plus the `data-depth`, `data-color` and `data-summary` attributes on nodes. Class names are internal.

| Group | Variables |
|---|---|
| Base colors | `--mdmm-font`, `--mdmm-bg`, `--mdmm-text`, `--mdmm-text-muted`, `--mdmm-accent`, `--mdmm-link`, `--mdmm-red`, `--mdmm-orange`, `--mdmm-yellow`, `--mdmm-green`, `--mdmm-blue`, `--mdmm-purple`, `--mdmm-gray` |
| Derived (from base) | `--mdmm-branch`, `--mdmm-brace`, `--mdmm-l1-fill`, `--mdmm-summary-fill`, `--mdmm-relation`, `--mdmm-color-fill-amount` |
| Sizes | `--mdmm-{root,l1,node,summary}-{font-size,padding,radius}`, `--mdmm-node-max-width`, `--mdmm-root-max-width`, `--mdmm-line-height`, `--mdmm-branch-width` |

Light and dark defaults follow `prefers-color-scheme`. Force one with `data-mdmm-theme="light"` or `"dark"` on any ancestor (for example `<html>`).

## License

MIT
