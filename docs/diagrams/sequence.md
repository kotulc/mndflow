# sequence

**Grid kind. Who talks to whom, in what order.** Agreed 2026-11-14.

## Purpose

| | |
|---|---|
| **answers** | who talks to whom, in what order, and what passes between them |
| **draws** | a grid read as time: participants across the head, each over its lifeline; each message a row, straight across from sender to receiver, an activation bar where it lands (design.md *Perspectives*, the sequence view) |
| **examples** | mndsite: edit and preview, browse by facet; the shop: Checkout saga |

## Utility

| | |
|---|---|
| **draw it** | several participants take turns, and who acts next is the point: a dev loop, a request through services, a reader's clicks through components |
| **skip it** | one participant doing steps in order: that is a flow |
| **vs flow** | a flow is one behaviour's steps with data on its edges; a sequence is turns between participants over time |
| **vs swimlane** | a swimlane is who does which step, in which phase, with steps as cards; a sequence is the messages between them, each its own row |
| **vs presentation** | a sequence seeds one, a stop per message, its numbers the order (model-plan.md 19) |

## Surface

| | |
|---|---|
| **base** | `sequence`, extending `block`, *is grid*, *is behaviour*: view `sequence` |
| **file** | its own file, a behaviour of its owner: `participants` are references, by the kind (written once, as context.md agreed 2; found outward); relations are messages by the kind, in list order, each a row |
| **tool** | `mnd draw sequence <selection.json> <out>` (docs/tools/sequence.md) |

```yaml
# cli-and-setup/edit-and-preview.yaml
type: sequence
participants: [Author, watch, ingest, {name: next dev, of: Next.js}, file system, browser]
relations:
  - Author -> next dev: npm run dev
  - Author -> watch: npm run watch
  - Author -> file system: saves docs/page.md
  - file system -> watch: fs.watch page.md
  - watch -> ingest: node ingest.js docs/
  - ingest -> file system: writes pages · site-meta
  - file system -> next dev: pages changed
  - next dev -> browser: hot reload
  - browser -> Author: sees the page
```

## Layout

| Case | How it is drawn |
|---|---|
| **participant order** | actors first, then the owner's parts under its frame, then the outside; within each, by first message, so most messages run rightward and short |
| **a participant's card** (the user, 2026-11-21) | the standard card width, as every grid cell's card: a long name wraps inside it and is cut past two lines, read whole on hover or pick; the column never widens |
| **the frame** | the owner's frame drawn over the head, spanning its parts: context's frame in a sequence (model-plan.md 14) |
| **a message** | a row, numbered, a dot at its origin and an arrow where it lands; named by what is said; the data it carries named by its definition (`pages · site-meta`), opening its card |
| **a repeat** | a fragment across its rows, named by its condition (`↻ each .md change`); never a line back up the time axis |
| **alternatives** | a fragment split by a dashed rule, each part headed by its guard in brackets (`[cache hit]`) |
| **long sequences** | past a default (12 messages), whoever draws cuts a sub sequence, a row marked ↳ entered by *into*, only where both sides keep the floor (README *Sub diagrams*) |
| **portrait** | the same: time runs down; participants past the canvas's width fold the outside into one column |

## Agreed 2026-11-14

| # | Decision |
|---|---|
| 1 | participant order: actors, then the owner's parts under its frame, then the outside; each by first message |
| 2 | the owner's frame drawn over the head, spanning its parts |
| 3 | a message may join two participants directly, its row its list place; a step block only where a step has its own name or note (general: a surface change) |
| 4 | repeats and alternatives are fragments across rows, named by condition or guard; guards in flow's brackets |
| 5 | long sequences cut into sub sequences past a default, under the sub diagram floor |
| 6 | a message has a dot at its origin and an arrow where it lands |
| 7 | **fragments are written as groups of rows** (2026-11-15): a `fragments:` list on the sequence, `{ repeat: each .md change, rows: [2, 4] }` or `{ alt: ["[cache hit]", "[miss]"], rows: [[2, 3], [4, 5]] }`, the rows the grid's own |
| 8 | **participant order is written by the tool** (2026-11-15): `participants:` keeps file order; `mnd draw sequence` sorts them by decision 1 when it writes; the view never reorders |
