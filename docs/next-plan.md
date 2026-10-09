# Next plan

**A showcase to iterate against, then focus: the user always knows what they are looking at, and every block opens onto something.** Workshopped 2026-10-08, re-ordered the same day for focus. Each step is driven in the web app against the showcase before the next starts.


## Order

| # | Step | Done when |
|---|---|---|
| 1 | **showcase workspace** | every card kind, face, holder, relation and view has a layer that shows it, each layer with a note saying what it shows |
| 2 | **knowing where you are** | the focused branch is lit subtly in the explorer, the selected row and card strongly; picking in the open structure moves the canvas to it; trees start folded |
| 3 | **the view follows the block** | no block opens onto an empty canvas: each opens on the layer view its content calls for; overview is renamed overhead |
| 4 | **folders that read** | `base` lists first; no code invents a package's folders; the showcase's presets are traits, its definitions in folders that say what they are |
| 5 | **table card** | an entity draws as one ruled table, its title the top row, nothing overlapping, its size exactly what it draws |
| 6 | **line routing** | the showcase's relations layer draws without crowded labels, hugging runs or needless turns |
| 7 | **canvas gestures** | a diagram is built fast from the canvas alone |


## 1 — Showcase

**One file, `samples/workspace.showcase.json`, written by `scripts/showcase.mjs`.** It replaces `workspace.mndflow.json`; `workspace.extended.json` stays for now.

| Layer | Shows |
|---|---|
| **cards** | each block kind small — block, folder, reference, note — and each style family |
| **faces** | the large face: body, attributes, preview, headless; fitted and sized |
| **definitions** | stand-ins for definitions, each trait, settings inherited down a chain |
| **relations** | line and tie, each direction, names, arrows; crossings, detours, parallel runs, tight gaps |
| **interfaces** | ports on each side, flow in, out and both |
| **holders** | nested groups; a grid with headers and merges |
| **references** | to a block, to a definition, to nothing |
| **data** | the `entity-relation` package: its model as stand-ins, its data as usages, links drawn |

| Decided | |
|---|---|
| **written, not built** | the script writes the JSON with fixed ids and the door checks it: diffs read, and a schema change is a re-run |
| **a note per layer** | says what the layer shows and what to look for |
| **assets in `public/showcase/`** | the renderer refuses `data:` urls, so a picture is a file the app serves |

**Built 2026-10-08.** Nine layers, driven in Edge; `workspace.mndflow.json` and `workspace.erd.json` retired. **On any schema change, update the script and re-run it**, then `mnd check` it.


## 2 — Knowing where you are

**Focus is the premise: the explorer and canvas always agree on where you are.**

| Want | Met by |
|---|---|
| **what is in focus** | a subtle highlight on every row of the branch the canvas draws: the open layer and what it holds |
| **what is selected** | a strong highlight on the selected row and its card |
| **the canvas follows** | picking a row inside the open structure reveals it: the canvas moves to its layer and picks it. Browsing definitions never moves the canvas |
| **less to read** | trees start folded; the path to the open layer unfolds |
| **the path** | crumbs naming layers only — never `workspace / blocks` — and the view drawn |
| **what a thing is** | the tray labels a definition, a usage and a stand-in apart |

| Revises | |
|---|---|
| design.md *Navigation* | "picking within the opened tree **may** move the canvas" becomes **does** |

**Built 2026-10-08.** Every branch is shut until opened (`OPENED` folds for all rows, not only packages); the way to the open layer and to each new pick opens once per row, in the canvas's section only. Settled while driving: **opening goes in** whatever view the section was shown in, and each section remembers the view it was last shown in.


## 3 — The view follows the block

**A layer view is chosen by what the block has, worked out on every draw, never stored.** Opening a tag, trait or style today draws an empty internal layer: its meaning is in its chain and its users, not in what it holds.

| Block has | Opens on | Draws |
|---|---|---|
| cells | **grid** | its lattice, as now |
| structure | **internal** | what it holds, as cards, as now |
| attributes, no structure | **entity** | its class card, and the entities its links reach |
| neither | **lineage** | what it extends, its subtypes, and what carries or uses it, each drawn in its look |
| a package | **definitions** | its definitions as a diagram: extends and link lines between them |

| Decided | |
|---|---|
| **system views stay** | **overhead** (renamed from overview) and **profile** draw a whole section |
| **every view is offered** | the default is derived; any layer view that has something to draw can be picked |
| **an empty view says why** | e.g. *Pump has no parts · 3 attributes · used by 2*, never a blank canvas |

| Revises | |
|---|---|
| design.md *Perspectives* | three canvas views become two system views and five layer views; "there is no package view" goes |
| definitions.md | *canvas view*, *overview*; adds *entity*, *lineage*, *definitions* views |
| core `navigate.ts` | `ViewKind`, `EDITOR`'s view lists, `open_at` choosing the view from the block |

**Built 2026-10-08.** core `lenses_of` decides; views `lens.ts` draws the three new views in bands down the page, read only. Settled while driving: a block with room to hold that is editable opens inside, to be built; lineage draws only its chain's spine as lines, plus a **carries** band for the traits in force; an entity of a usage shows what it **is a** too; `used_by` now counts trait carriers.


## 4 — Folders that read

**A package's structure is its data file's, and nothing else's.** Folders are the only grouping, and how a package uses them is its author's. Inheritance is shown by the lineage view, never by `parent`. This step is data and ordering, not new rules.

| Decided | |
|---|---|
| **`base` first** | the top of the explorer's package rows, folded; `packages` in core sorts it there |
| **a new workspace** | its root and one scratch definition, `main`, as `empty_graph` makes it now |
| **no imposed folders** | importing a collection stops inventing `tags` and `types` folders for what it infers; they land at the package root |
| **the showcase reads** | its 18 style presets become traits, and its definitions sit in folders that say what they are |

**Built 2026-10-08.** The workspace holds `main`, then `looks` (a folder per setting), `faces`, `machines`, `holders`. A usage cannot carry a trait, so the cards layer states each look as the card's own setting, and Machine carries *family secondary* to show a trait in use.


## 5 — Table card

**Option A: the face draws attributes from data, not markdown.** Revises cards-plan's *large face* row, where the parts render as one markdown document.

| | Decided |
|---|---|
| **title** | the table's top row, spanning it; the icon sits in it, right |
| **marks** | end the last row, in room the last column keeps for them |
| **size** | exactly the table — title row, rows, border — never rounded to units |
| **border** | the card's border is the table's: no padding round it |
| **columns** | type, name, then key, value and note where any row says one; widths worked out once in views, used to size the card and to draw it, so the two agree |
| **body** | a body the card shows is markdown, under the table |

**Built 2026-10-08, revised 2026-10-09.** `face_table` gives the rows and widths, `carried` hands them to `CardFace` as `table`. Cells cut at 16 characters. The card is its table exactly: the border's width is read from the look (`edge_of`), and a reference previewing a table makes room for its own marks.


## 6 — Line routing

Collected on the showcase's relations layer first, then fixed.

| Seen | |
|---|---|
| **labels crowd card edges** | a name set at a run's middle lands on a short run beside a card |
| **parallel runs share a lane** | *request* and *reply* between one pair draw on top of each other, their names overlapping |
| **a crossing is avoided by sharing lanes** | North→South and East→West run together along a row rather than crossing once |


## 7 — Canvas gestures

**Gestures first.** Text entry is covered by card and definition sources.

| Candidate | |
|---|---|
| **drag from a port to empty canvas** | makes a connected card |
| **tab** | adds a sibling to the selected card |
| **drop a definition** | from the explorer onto the canvas, as a usage |


## Open

| Question | |
|---|---|
| **the root layer is a definition** | `main` shows in both explorer sections; whether the structure section hides that |
| **gesture set** | which of step 7's candidates, and what else, once step 2 lands |
| **double-click a grid** | lands on its name and renames it; Enter opens it |


## Handoff

**State, 2026-10-09: steps 1–5 built and driven in Edge, nothing committed.** Typecheck clean, 293 tests green, CSS lint clean, the showcase checks clean. Code-reviewed; its ten findings fixed and re-driven. Revised 2026-10-09: `erd` renamed `entity-relation`, table cards sized exactly by their table with the marks ending the last row, and the open layer's own row lit with its branch. Next is step 6.

| Not yet | |
|---|---|
| **tests for steps 2–5** | none written: the views and navigation are still moving. Write them once they settle — `lenses_of`, `open_at` / `leave_at` per view, `table` widths, `fit_of` for a table card |
| **driving** | the Edge drives lived in the session's scratchpad, not the repo; the `vitest` skill says how to drive again |

### Running it

| Do | How |
|---|---|
| **re-write the showcase** | `node scripts/showcase.mjs` from the repo root |
| **check a file through the door** | `npm run start -s -w @mnd/cli -- check ../../samples/workspace.showcase.json` — prints `clean` |
| **see what a layer holds** | `npm run start -s -w @mnd/cli -- outline ../../samples/workspace.showcase.json l_rel` — layer ids are `l_cards`, `l_faces`, `l_defs`, `l_rel`, `l_ports`, `l_hold`, `l_refs`, `l_model`, `l_rows` |
| **drive the web app** | `npm run dev`, read the port off the log; import through the header's *import a workspace* button (a file chooser) |
| **open a card** | select it and press Enter; double-click on a name renames it |

### Where steps 2–5 live

| File | Holds |
|---|---|
| core `navigate.ts` | `lenses_of` / `lens_of` (which view a block opens on), `lens_at`, and `open_at` / `leave_at` / `sight` choosing views |
| core `sections.ts` | `ViewKind`, `LAYER_VIEWS`, `is_layer_view` |
| core `session.ts` | `see` switching a block's views; `move` remembering each section's last view |
| views `lens.ts` | the entity, lineage and definitions graphs, drawn in bands |
| views `face.ts` | `face_table` / `table` (rows and column widths), `fit_of` sizing both |
| views `derive.ts` | `trail_of` from the tree; `empty_of`, what an empty layer says |
| explorer `rows.ts` · `Explorer.tsx` | every branch shut until opened; the branch and pick lit |
| web `App.tsx` | a row chosen inside the open structure reveals; the rail's view list |

### Step 6 — where to start

| File | Holds |
|---|---|
| views `route.ts` | runs, lanes and detours |
| views `seat.ts` | where a run meets a card |
| stage `Wire.tsx` | how a run and its name draw |

### Carried over

| From | To do |
|---|---|
| cards-plan | commit; `npm run release:kit` and re-pin mndmap's vendored kit. The kit changed under it: `ViewKind` says `overhead` for `overview` and has the layer views; `table` returns rows and widths, not markdown; `face_text` leaves the attributes out |
| cards-plan | drive *import a collection* and *attach* in the web app |
| cards-plan | notes draw their name, not their body, through `NoteNode` rather than `CardFace` |
| this plan | mndmap, or anything fetching the catalogue by name, asks for `entity-relation`, not `erd` |

### Known rough edges

| | |
|---|---|
| **tray handle vs canvas size** | the tray always shows a card's handle, the canvas only while it is unnamed, so a tray large face can be 8px tighter than sized |
| **the root layer is a definition** | `main` lists in both explorer sections; open above |
| **a lone entity** | a definition with no links draws one card in a full-width band; the bands could shrink to what they hold |
| **a usage cannot carry a trait** | traits are a definition's alone, so the cards layer shows each look as a card's own setting |
| **a page under the crumbs** | the overhead and the definitions view scroll their top under the crumbs; the page could start below them |
| **`dir: "one"`** | an old value the door passed silently in the retired sample; worth the door refusing unknown `dir` |
| **faint marks on table cards** | marks draw at the theme's half opacity, so on a dark card the last row's mark is hard to see |
| **meaning views are read only** | entity, lineage and definitions draw and pick but take no edits; editing goes back inside |
| **a preview's size** | a reference previewing a table is sized from what it previews, its own marks added; its own look's border is not read |

