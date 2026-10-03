# mdmindmap

[中文说明](README.zh-CN.md)

Render read-only mind maps from Markdown headings and lists — with summary braces, cross-branch relationships, preset colors and math — plus a DOM-free parser and a `check` CLI for validating sources (handy when an AI writes them).

Also available as the Obsidian plugin **MD Mindmap** (same repository).

## Install

Not on npm yet. Install the tarball attached to a [GitHub Release](https://github.com/meizigz/mdmindmap/releases):

```sh
npm install https://github.com/meizigz/mdmindmap/releases/download/0.1.1/mdmindmap-0.1.1.tgz
```

To develop against a local checkout, build it (`npm run build -w mdmindmap` at the repository root) and install by path: `npm install ../md-mind-ext/packages/mdmindmap`.

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

| Option                                         | Default                                                       |                                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `math`                                         | — (required)                                                  | Formula renderer. `katexMath()` from `mdmindmap/katex` (KaTeX + mhchem), or your own `{ render(tex): HTMLElement, flush?(), exportCss?() }`. |
| `layout`                                       | `"logic"`                                                     | `"logic"` (grows right) or `"bilateral"` (both sides).                                                                                       |
| `height`                                       | fill the container                                            | A number (px) or `"auto"` (estimated from the visible leaves, 220–600 px). With a height, the bottom edge can be dragged.                    |
| `interaction`                                  | `"click-to-activate"` when `height` is given, else `"direct"` | Click-to-activate leaves wheel and touch scrolling to the page until the map is clicked.                                                     |
| `document`                                     | —                                                             | `{ title }`: whole-document mode — non-node content is skipped; the only `#` heading (or `title`) is the root.                               |
| `onNodeClick(node)`                            | —                                                             | `node.line` is the 1-based source line.                                                                                                      |
| `onLinkClick(target, event)`                   | —                                                             | `[[wikilink]]` clicks. Without it wikilinks are plain text. External links open in a new window.                                             |
| `onNodeMenu(node, { x, y })`                   | —                                                             | Right-click or long-press (550 ms).                                                                                                          |
| `onDiagnostics(list)` / `onDiagnosticClick(d)` | —                                                             | Parse problems; a ⚠ badge in the corner lists them.                                                                                          |

### Instance

```ts
map.ready; // Promise: first draw finished
map.diagnostics; // parse problems
await map.update(source); // incremental: keeps viewport and folds, reuses unchanged nodes
map.fit();
await map.setLayout("bilateral");
await map.collapseAll(1); // keep only root and first-level branches
await map.revealLine(12); // bring the node on line 12 into view and flash it
await map.exportSvg(); // string; nodes embedded via foreignObject
await map.exportPng({ scale: 2, maxSide: 16000 }); // Blob
map.destroy();
```

Exports use the current theme; all `--mdmm-*` variables are resolved, so the file looks right outside the page. With `katexMath()`, KaTeX fonts are inlined — the KaTeX stylesheet must be same-origin (or loaded with `crossorigin`) so its rules can be read.

## React

`render()` builds a self-contained DOM tree inside the container, so React only provides an empty `<div>` and manages the instance through refs:

```tsx
import { useEffect, useRef } from "react";
import { render, type MindMap, type Node } from "mdmindmap";
import { katexMath } from "mdmindmap/katex";
import "mdmindmap/style.css";
import "katex/dist/katex.min.css";

const math = katexMath(); // create once, outside the component

export function MindMapView(props: {
  source: string;
  onNodeClick?: (node: Node) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MindMap | null>(null);
  const sourceRef = useRef(props.source);
  const onNodeClickRef = useRef(props.onNodeClick);

  useEffect(() => {
    onNodeClickRef.current = props.onNodeClick;
  });

  // Create once on mount, destroy on unmount.
  useEffect(() => {
    const map = render(containerRef.current!, sourceRef.current, {
      math,
      // Options are read once; go through a ref so the latest callback runs.
      onNodeClick: (node) => onNodeClickRef.current?.(node),
    });
    mapRef.current = map;
    return () => {
      map.destroy();
      mapRef.current = null;
    };
  }, []);

  // Later source changes: incremental update, keeps viewport and folds.
  useEffect(() => {
    if (sourceRef.current === props.source) return;
    sourceRef.current = props.source;
    void mapRef.current?.update(props.source);
  }, [props.source]);

  return <div ref={containerRef} style={{ height: 500 }} />;
}
```

- **Don't put `source` in the deps of the creating effect.** Re-creating on every change loses the viewport and fold state and re-measures every node; `update()` reuses unchanged ones.
- **StrictMode** mounts, unmounts and mounts again in development. That is fine: `destroy()` removes everything the map added to the container.
- **Next.js:** the component must be a client component (`"use client"`).

## Pitfalls

- **The container needs a height.** The map fills its container; a `<div>` with no height (or a flex child without `min-height: 0`) gives an empty map. Either size the container or pass `height`.
- **Don't render into a hidden container.** Node sizes are measured once, when first drawn. Inside `display: none` (an inactive tab, a collapsed panel) they measure 0 and the map stays broken. Render when the container is visible, or re-create it then.
- **Container resizes don't refit.** The map keeps filling the container, but the view is not re-centered. Call `map.fit()` yourself (for example from a `ResizeObserver`) if you want that.
- **Options are fixed at creation.** Change the layout with `setLayout()`. For `height`, `interaction` or `document`, `destroy()` and `render()` again. Callbacks are those passed to `render()` — see the ref pattern above.
- **`math` is required.** Without formulas, or without KaTeX, pass a renderer that shows the TeX as text; `katex` is an optional dependency and need not be installed:

  ```ts
  const plainMath = {
    render(tex: string) {
      const span = document.createElement("span");
      span.textContent = tex;
      return span;
    },
  };
  ```

- **Theme.** Light/dark follows `prefers-color-scheme`, not your app's own theme switch. Set `data-mdmm-theme` on an ancestor to follow it, and override the `--mdmm-*` variables (see [CSS variables](#css-variables)) to match your colors; class names are internal.

## Parse (no DOM)

```ts
import { parse } from "mdmindmap/parse";

const { root, relationships, diagnostics } = parse(source);
for (const d of diagnostics)
  console.log(d.line, d.severity, d.code, d.message, d.fix);
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

| Group               | Variables                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base colors         | `--mdmm-font`, `--mdmm-bg`, `--mdmm-text`, `--mdmm-text-muted`, `--mdmm-accent`, `--mdmm-link`, `--mdmm-red`, `--mdmm-orange`, `--mdmm-yellow`, `--mdmm-green`, `--mdmm-blue`, `--mdmm-purple`, `--mdmm-gray` |
| Derived (from base) | `--mdmm-branch`, `--mdmm-brace`, `--mdmm-l1-fill`, `--mdmm-summary-fill`, `--mdmm-relation`, `--mdmm-color-fill-amount`                                                                                       |
| Sizes               | `--mdmm-{root,l1,node,summary}-{font-size,padding,radius}`, `--mdmm-node-max-width`, `--mdmm-root-max-width`, `--mdmm-line-height`, `--mdmm-branch-width`                                                     |

Light and dark defaults follow `prefers-color-scheme`. Force one with `data-mdmm-theme="light"` or `"dark"` on any ancestor (for example `<html>`).

## License

MIT
