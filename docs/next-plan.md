# Next plan

**A showcase to iterate against, then the cards, navigation, routing and gestures it shows up.** Workshopped 2026-10-08. Each step is driven in the web app against the showcase before the next starts.


## Order

| # | Step | Done when |
|---|---|---|
| 1 | **showcase workspace** | every card kind, face, holder, relation and view has a layer that shows it, each layer with a note saying what it shows |
| 2 | **table card** | an entity draws as one ruled table, its title the top row, nothing overlapping, its size exactly what it draws |
| 3 | **knowing where you are** | the open layer is lit, subtly, in the explorer; the selected block strongly; the crumbs name layers only |
| 4 | **line routing** | the showcase's relations layer draws without crowded labels, hugging runs or needless turns |
| 5 | **canvas gestures** | a diagram is built fast from the canvas alone |


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
| **data** | the `erd` package: its model as stand-ins, its data as usages, links drawn |

| Decided | |
|---|---|
| **written, not built** | the script writes the JSON with fixed ids and the door checks it: diffs read, and a schema change is a re-run |
| **a note per layer** | says what the layer shows and what to look for |
| **assets in `public/showcase/`** | the renderer refuses `data:` urls, so a picture is a file the app serves |

**Built 2026-10-08.** Nine layers, driven in Edge; `workspace.mndflow.json` and `workspace.erd.json` retired. **On any schema change, update the script and re-run it**, then `mnd check` it.


## 2 — Table card

**Option A: the face draws attributes from data, not markdown.** Revises cards-plan's *large face* row, where the parts render as one markdown document.

| | Decided |
|---|---|
| **title** | the table's top row, spanning it; the icon and marks sit in it, right |
| **border** | the card's border is the table's: no padding round it |
| **columns** | type, name, then key, value and note where any row says one; widths worked out once in views, used to size the card and to draw it, so the two agree |
| **body** | a body the card shows is markdown, under the table |


## 3 — Knowing where you are

| Want | Met by |
|---|---|
| **which layer the canvas is on** | a subtle highlight on its row in the structure tree |
| **what is selected** | a strong highlight on the selected block's row and card |
| **the path** | crumbs naming layers only — never `workspace / blocks` |
| **what a thing is** | the tray labels a definition, a usage and a stand-in apart |


## 4 — Line routing

Collected on the showcase's relations layer first, then fixed.

| Seen | |
|---|---|
| **labels crowd card edges** | a name set at a run's middle lands on a short run beside a card |
| **parallel runs share a lane** | *request* and *reply* between one pair draw on top of each other, their names overlapping |
| **a crossing is avoided by sharing lanes** | North→South and East→West run together along a row rather than crossing once |


## 5 — Canvas gestures

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
| **gesture set** | which of step 5's candidates, and what else, once step 3 lands |
| **double-click a grid** | lands on its name and renames it; Enter opens it |


## Handoff

**State, 2026-10-08: step 1 built, nothing committed.** Typecheck clean, 293 tests green, CSS lint clean. The cards-plan work (its steps 1–8) is in the same uncommitted tree.

### Running it

| Do | How |
|---|---|
| **re-write the showcase** | `node scripts/showcase.mjs` from the repo root |
| **check a file through the door** | `npm run start -s -w @mnd/cli -- check ../../samples/workspace.showcase.json` — prints `clean` |
| **see what a layer holds** | `npm run start -s -w @mnd/cli -- outline ../../samples/workspace.showcase.json l_rel` — layer ids are `l_cards`, `l_faces`, `l_defs`, `l_rel`, `l_ports`, `l_hold`, `l_refs`, `l_model`, `l_rows` |
| **drive the web app** | `npm run dev`, read the port off the log; import through the header's *import a workspace* button (a file chooser) |
| **open a card** | select it and press Enter; double-click on a name renames it |

### Step 2 — where to start

| File | Holds |
|---|---|
| views `face.ts` | `listed` (the rows), `table` (rows as markdown), `fit_of` (the size estimate), `face_text` |
| views `size.ts` | `size_of`, `large_of`, `fitted`, `LARGE` |
| views `derive.ts` | `carried`: the one place a card's data is worked out, `text` among it |
| theme `face.tsx` · `face.css` | `CardFace`, and the table's grid rules, empty-header hiding, corner gutter |
| tray `Faces.tsx` | the tray's two faces, and the bare preview with sample content |

| Plan | |
|---|---|
| **carry rows, not markdown** | `carried` gives the large face `rows` from `listed` beside `text` for the body; `table` and its empty-header CSS go |
| **one width calculation** | column widths from `listed`, in views, used by `fit_of` and handed to `CardFace` as fixed widths, so drawn equals sized |
| **title row** | name, then icon and marks, inside the table's top row; the card loses its padding where it is a table |
| **docs** | cards-plan's *large face* and *the attributes table* rows, design.md's *two faces*, definitions.md's *face* |

### Carried over

| From | To do |
|---|---|
| cards-plan | commit; `npm run release:kit` and re-pin mndmap's vendored kit |
| cards-plan | drive *import a collection* and *attach* in the web app |
| cards-plan | notes draw their name, not their body, through `NoteNode` rather than `CardFace` |

### Known rough edges

| | |
|---|---|
| **table cells cut at 12 characters** | notes read *where receip…*; step 2's widths decide this |
| **tray handle vs canvas size** | the tray always shows a card's handle, the canvas only while it is unnamed, so a tray large face can be 8px tighter than sized |
| **a stand-in reads *usage*** | in the tray's head; step 3 labels definition, usage and stand-in apart |
| **the root layer is a definition** | `main` lists in both explorer sections; open above |
| **`dir: "one"`** | an old value the door passed silently in the retired sample; worth the door refusing unknown `dir` |

