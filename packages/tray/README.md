# @mnd/tray

**The context tray.** A table of everything the open layer holds — blocks, interfaces, relationships, boundaries and notes together. The only place a relationship or an interface is found without hunting for it on the drawing.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `views`, `theme` |
| **Proven by** | its own dev server over a fixture — driven, emitting selections and mutating nothing |

## Where it sits

```
web · kit
└─ tray   ◀
   └─ core · views · theme
```

## Running it

```sh
npm run dev -w @mnd/tray             # its harness, over a fixture
npm run typecheck -w @mnd/tray
```

**No suite of its own yet.** The harness is the verification: drive it and read the selections it logs.

## What is in here

| | Is |
|---|---|
| `Tray.tsx` | the context and its tabs, in the theme's `TrayFrame`. Two sizes, shut and open. **Read only without `onAct`**: only the tabs that read are offered. A host's own block tabs come after through `extras` |
| `state.ts` | `useTray` — open from the start, the tab, the hold, and the explorer section it lights. `useDisplay` — the card, the key, its corner and the lattice, and the workspace tab's answers to them. **Every shell's state, kept once**: the app and the kit's hosts run on the same two |
| `Workspace.tsx` | the root's tab: identity, display, file — and export, whole or as a package, which it emits as `@export` and `@export_package` for the host to run. Its display answers `onDisplay`, so it still works where the workspace itself is read only |
| `rows.ts` | `rows_of` — what the layer holds, read straight from the graph. Headless, so the CLI could print it |
| `CardTab.tsx` · `Faces.tsx` · `Attributes.tsx` | the card tab — its faces, drawn by theme's `CardFace` from views' `carried`, and its markdown source; and the one attributes table, for a definition and a usage alike |
| `tray.css` · `fields.css` · `preview.css` | the look: the tables and the card tab; the label-and-answer rows; the faces, the run preview and chips. Loaded in that order. The frame round them — bar, tabs, open and shut — is dressed in `@mnd/theme/shell.css` |

## The rules it lives by

- **The head is kind / name / what / type**, because every row answers all four. Beyond that a column is a field in scope — the table's state, never a definition's.
- **A quarter of the stage, whatever it holds.** A tray that grew to its contents moved every time the row count changed.
- **Nothing closes it but its own control**, because a click on the canvas is how a row gets selected.
- **Everything is derived.** It reads the graph and stores nothing, so it cannot fall out of step with the drawing.
- **Nothing picked on the root layer is the root.** The tray opens on the workspace tab, which is where the drawing's defaults are set.
- **Every card is drawn as the canvas draws it.** The tray reads views for what a card carries and theme for its face; it draws no card of its own.

## The detail

`docs/tray.md`.
