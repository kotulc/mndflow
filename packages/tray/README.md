# @mnd/tray

**The context tray.** A table of everything the open layer holds — blocks, interfaces, relationships, boundaries and notes together. The only place a relationship or an interface is found without hunting for it on the drawing.

| | |
|---|---|
| **Entry** | `src/index.ts` |
| **Depends on** | `core`, `theme` |
| **Proven by** | its own dev server over a fixture — driven, emitting selections and mutating nothing |

```
npm run dev -w @mnd/tray
```

## What is in here

| | Is |
|---|---|
| `Tray.tsx` | the bar and the table. Two sizes, shut and open |
| `rows.ts` | `rows_of` — what the layer holds, read straight from the graph. Headless, so the CLI could print it |
| `tray.css` | the look: a quarter of the stage when open, columns given widths and long text cut |

## The rules it lives by

- **The head is kind / name / what / type**, because every row answers all four. Beyond that a column is a field in scope — the table's state, never a definition's.
- **A quarter of the stage, whatever it holds.** A tray that grew to its contents moved every time the row count changed.
- **Nothing closes it but its own control**, because a click on the canvas is how a row gets selected.
- **Everything is derived.** It reads the graph and stores nothing, so it cannot fall out of step with the drawing.

## The detail

`docs/tray.md`.
