# @mnd/theme

**The ramp, as CSS custom properties, and the icons and chrome that read it.** No build step.

| | |
|---|---|
| **Entry** | `ramp.css` and `base.css`; `shell.css` on its own for a host that wants the chrome; `src/index.ts` for the icons, the names and the chrome components |
| **Depends on** | nothing |
| **Proven by** | nothing to prove — it declares values. What reads them is proven in `stage` |

## Where it sits

```
web · kit
└─ explorer · stage · options · tray
   └─ theme   ◀ stylesheets, and nothing below
```

## Running it

```sh
npm run dev -w @mnd/explorer         # any harness shows the ramp; there is nothing else to run
```

```ts
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
```

**Nothing to build and nothing to test** — it declares values, and what reads them is proven in `stage`.

## What is in here

| | Is |
|---|---|
| `ramp.css` | the slots and their steps, per theme |
| `shell.css` | the chrome — the reset, the header, the `.app` grid, the one bar height, the crumbs, the strip and the tray's frame. What `@mnd/kit/shell.css` is |
| `base.css` | the page ground: `shell.css` first, then what the app alone reads |
| `src/shell.tsx` | `WorkspaceHeader` and `TrayFrame` — the chrome as components, naming no graph |
| `src/markdown.tsx` | `Markdown` and `Inline` — **the one renderer**: `react-markdown` with GitHub's tables and task lists, never an HTML string. A link answers ctrl+click |
| `src/face.tsx` · `face.css` | `CardFace` — **the one drawing of a card**, wherever one is drawn: small, the handle over the name, the icon and the marks; large, the name and its markdown. It names no graph: what it says and how it is painted are handed to it |
| `src/icons.tsx` | the icon set: roles (the root among them), the explorer's section words, and the system marks — **a stand-in's written as a word** (`Def`, `Ref`, `Pkg`), **what describes a card drawn** (`data`, a database) |

## How the ramp works

**Slots × steps.** A **step** is a job — fill, line, edge, ink, dim, stroke — and means the same job in every slot. A **slot** is a family: some a definition may pick from, and four reserved to the app.

**The four reserved slots keep their hue across every theme**, because what they mean does not change with the palette:

| | Means |
|---|---|
| `away` | elsewhere — a reference, another tree |
| `note` | description rather than structure |
| `error` | something is wrong |
| `warn` | something needs attention |

- **A definition picks a slot and an emphasis, or a hue the theme takes at its own chroma — never a hex.** Two things looking alike is two things being alike.
- **Steps are computed from a few numbers rather than written out**, so a new theme is about twenty values and not a table of hexes.
- **The shell reads the same ramp as the canvas**, so the header cannot drift from the drawing.
- **Selection is the app speaking about your model**, so it takes the accent and no definition may claim it.
