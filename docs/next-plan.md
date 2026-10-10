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
| 6b | **grid layout** | every auto layer is a row/column grid: middles line up, names fit between cards, nothing needs moving by hand |
| 7 | **canvas gestures** | a diagram is built fast from the canvas alone |
| 8 | **views by card** | the rail offers only the system views; each card opens on the one layer view its kind calls for, and a definition opens onto itself with what describes it round it |
| 9 | **two trees, one system** | structure always lists every tree whatever definitions holds; the system views draw both trees; every layer lays itself out `auto`, as wide as the page |


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

**Superseded by step 8**, 2026-10-09: layer views are no longer chosen, and entity, lineage and definitions are gone. **Built 2026-10-08.** core `lenses_of` decides; views `lens.ts` draws the three new views in bands down the page, read only. Settled while driving: a block with room to hold that is editable opens inside, to be built; lineage draws only its chain's spine as lines, plus a **carries** band for the traits in force; an entity of a usage shows what it **is a** too; `used_by` now counts trait carriers.


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
| **a tie lands mid-side** | a tie should meet the card at its nearest corner |
| **a crossing is avoided by sharing lanes** | North→South and East→West run together along a row rather than crossing once |

**Workshopped 2026-10-09: anchors shared, runs straight or Z, lines under cards, ties corner to corner.** The rules are design.md's *Interfaces and lines*.

| Decided | |
|---|---|
| **one anchor per face** | the middle of the face looking at the other end; every line on it shares it |
| **trunk, then fan** | shared lines run together to the fan point, halfway to the nearest card reached, and split there |
| **straight or Z** | no detours: lines draw under cards; the Z's cross leg at the busier end's fan point |
| **parallel lines overlap** | parted only by placing interfaces |
| **frame ends** | straight from the card's face nearest a wall to that wall; the layer's auto interfaces straight across, a placed one fixed |
| **ties apart** | straight: across the gap where two cards face squarely and the faces are free there, else nearest corner to nearest corner; no anchor, no fan |
| **names** | on a line's own leg past the fan point |
| **interface, a light block** | an interface by its type chain; `side` + `at` together mean placed, absent means auto; holds nothing, no cell, no size |
| **one way to move an end** | `fromSide`, `toSide` and `set_side` go; placing an interface replaces them |

| Changes | |
|---|---|
| views `route.ts` | the lane search goes: straight, Z, or a trunk and its branches |
| views `seat.ts` | `fan_out` lanes go: one anchor per face, placed interfaces read from `at` |
| core `tree.ts` · `defs.ts` | `is_interface` by type chain, not `side` |
| core `door.ts` · `fold.ts` · `actions/relations.ts` | `fromSide`/`toSide`/`set_side` gone; an interface refusing what it may not carry |
| stage `Wire.tsx` · `draw.ts` · `gestures.ts` | ties drawn straight; names on their own leg; side gestures gone |


## 6b — Grid layout

**Every auto layout is one row/column grid; `auto` is the default and good enough for every system and layer view.** Workshopped 2026-10-09, after step 6 left names crowded and table cards bending lines.

| Rule | |
|---|---|
| **cells** | each unit — a card, a group, a grid — takes one cell; a row is as tall as its tallest |
| **centred** | a card sits in the middle of its cell, so middles along a row or column always line up, whatever a card's size; a card's own edges may fall between guides |
| **whole-unit cells** | cell edges stay on the guides |
| **spacing** | `GAP`, 3 units, between cells; `PAD`, 1 unit, round what a group, a room or a grid's cell holds — two neighbouring groups keep a unit of air between them |
| **reading order** | auto and pages flow in reading order onto columns a default card wide, wrapping at the page's width; a wider unit spans the columns it needs |
| **lines never move cards** | relations and ties draw lines and nothing else; a note made tied to a block is ordered right after it when made; *arrange*, on the rail, reorders a layer once so related blocks, and notes by their blocks, read side by side |
| **fitted grids** | the definition view and the class diagram place by cell, each column as wide as its widest card |
| **boxes hug** | a page's boxes, as the package and profile views draw them, are as wide as what they hold and their air |
| **one grid** | auto layers, groups, pages, the package and profile views and the definition view (a 3×3 grid round its middle card) all lay out through it |
| **`free` stays** | hand placement draws exactly where it was put |

| Changes | |
|---|---|
| views `grid.ts` | new: cells to places — columns and rows sized, cards centred |
| views `pack.ts` | clusters placed by cell, not by pixel |
| views `bands.ts` · `page.ts` · `definition.ts` | groups, pages and the definition view through the grid |
| views `size.ts` | `GAP` 3 units, `PAD` 1 unit |

## 7 — Canvas gestures

**Gestures first.** Text entry is covered by card and definition sources.

| Candidate | |
|---|---|
| **drag from a port to empty canvas** | makes a connected card |
| **tab** | adds a sibling to the selected card |
| **drop a definition** | from the explorer onto the canvas, as a usage |


## 8 — Views by card

**System views are the rail's; layer views are the card's.** Workshopped 2026-10-09. The rail offered every layer view a block could draw, so what the canvas showed and why was unclear.

| Card | Opens on |
|---|---|
| definition | **definition** |
| grid | **grid** |
| package, folder | **folder**: what it holds, fitted to its content's width, scrolled down, no derived lines |
| structure, or room to hold | **internal** |
| stand-in | what it stands for |
| leaf, note | nothing: revealed in place |

| Definition view | |
|---|---|
| **middle** | the definition, large |
| **above** | what it extends, the immediate one only, joined by an extends line |
| **left · right** | its in ports, its out ports, a box each |
| **below** | its both-way ports directly under it, then its tags and its traits, a box each |
| **top right** | a note tied to it: its body, the definition's description |
| **lines** | each box to the middle card only, plain |
| **only what is there** | a box draws only with something in it |
| **edits** | a definition dropped on the view attaches — a trait to traits, a tag to tags; deleting one from its box detaches it; ports are added on the middle card, deleted from their box; the note writes the body. What it extends is set in the tray |
| **structure** | reached from the middle card (Enter) and from the structure section |

| Also | |
|---|---|
| **package view** | the system view called overhead is renamed **package** |
| **explorer** | a definition's row holding structure wears the card's structure mark after its name; the structure section lists every definition holding structure, the held one opened as it is held |
| **folder rooms** | a package opened on its folder view gets the folder's room; every folder's room hugs what it holds |
| **tray, one shape** | every element: first tab · settings · attributes · contents or usages, a line having no attributes. The first tab is named for what is drawn, *card* or *line*: identity over the drawing, the source open beside them, the definition read only under all. *Attach* on the tab strip; traits across the settings tab |

| System marks | |
|---|---|
| **one meaning** | what a card stands for, never how it opens — the icon says that |
| **at most three** | a stand-in's word (`Def`, `Ref`, `Pkg`), **structure** (the tree mark, taken from the workspace's row, which becomes a folder), **data** (the database) |
| **a stand-in** | wears its target's structure and data too |

| Revises | |
|---|---|
| step 3 | entity, lineage and definitions views go; no layer view is chosen |
| design.md *Perspectives*, definitions.md, model.md *Marks* | revised 2026-10-09 |

**Built 2026-10-09**, driven in Edge. core `lens_of` decides the view; `open_at` opens a definition on itself, inside when opened again or from the structure section; core `aspects.ts` says what an edit on the definition view does; views `definition.ts` draws it. A folder nobody arranged is laid as a page; one somebody arranged keeps its layout; either way its room hugs what it holds. The showcase's Pump carries a description, a tag and a port of each flow.

| Follow up | |
|---|---|
| **lineage and links as a package** | the chain, subtypes and links diagram, as a general structure rather than a view |
| **usages and their groups** | boxes for a definition's usages and the groups they belong to, once those are blocks |


## 9 — Two trees, one system

**Definitions and structure are two trees; the system views draw both.** Workshopped and built 2026-10-09. Chaining structure to the definition held made a definition with no structure show an empty tree.

| Decided | |
|---|---|
| **structure stands apart** | it always lists every definition holding structure, in every loaded package; choosing a definition opens its tree there and never changes what it lists. A definition opened to be built lists while the canvas is inside it |
| **system views draw the system** | the package view: the definitions tree, each definition holding structure a box of its top-level blocks as cards, never deeper. The profile: one page-wide row per level along the pick, a line pointing from each block on the way to the row it holds |
| **structure mark** | only on a definition holding structure, and a stand-in for one — never a block inside a structure, a package or a folder; a row and its card ask core alike (`stamps_of`, from `holds_structure`) |
| **every tab draws the element in hand** | the settings tab draws a usage wearing its definition's settings, as the card tab does. One renderer was always the case: the two tabs drew different blocks |
| **card tab** | the settings tab's layout: the drawing left, identity right, the source under both, the definition under all |
| **`auto` is the default** | a layer saying nothing is `auto`: clusters in reading order, shelved as wide as the page layout (`across` the canvas), read down the page. Moving a card hands the layer to `free` |
| **the showcase lays itself out** | no positions written; its layers are blocks, not folders, so each opens inside on `auto`. A folder still opens on its folder view, a page |

| Seen on `auto`, for step 6 and the layout | |
|---|---|
| **Relations** | a tie runs through a card between the note and what it ties; *request* and *reply* names squeeze between Asks and Answers |
| **Definitions** | the stand-ins seat beside the usages that answer them, off the shelf's rows |
| **Data model** | the layer's note lands among the entities, links running across it |
| **Interfaces** | the feed run loops round Pump; *water* squeezes between Pump and Tank |
| **profile lines** | each drops, runs across, then drops into the row's middle; straight down from the card would read better |


## Open

| Question | |
|---|---|
| **the root layer is a definition** | `main` shows in both explorer sections; whether the structure section hides that |
| **gesture set** | which of step 7's candidates, and what else, once step 2 lands |
| **double-click a grid** | lands on its name and renames it; Enter opens it |


## Handoff

**State, 2026-10-09: steps 1–5, 8 and 9 built and driven in Edge, nothing committed.** Typecheck clean, 293 tests green, CSS lint clean, the showcase checks clean. Step 8 was code-reviewed; step 9 was not. Next is step 6, line routing — judged now on what `auto` lays out, since the showcase places nothing by hand: step 9's *Seen on `auto`* table is the starting list.

| Not yet | |
|---|---|
| **tests** | none written for steps 2–5, 8 or 9: the views, navigation and tray are still moving. Once settled — `lens_of`, `open_at` / `leave_at` per view, `aspect_acts` / `attach_of`, `definition_graph`'s boxes, `stamps_of` / `holds_structure`, `table` widths, `fit_of` for a table card, `survey_graph` with `tops`, `profile_graph`'s rows and lines, `useChain` with a `trees` section, `pack_units` shelving at `page_wide`. One test changed: core `fold.test.ts` now expects `auto` for a layer saying nothing |
| **driving** | the Edge drives lived in the session's scratchpad, not the repo; the `vitest` skill says how to drive again |
| **commit** | suggested: *Views by card and two trees: system views on the rail drawing both trees, definition and folder views, structure apart from definitions, auto layout by default, one-shape tray* |

### Running it

| Do | How |
|---|---|
| **re-write the showcase** | `node scripts/showcase.mjs` from the repo root |
| **check a file through the door** | `npm run start -s -w @mnd/cli -- check ../../samples/workspace.showcase.json` — prints `clean` |
| **see what a layer holds** | `npm run start -s -w @mnd/cli -- outline ../../samples/workspace.showcase.json l_rel` — layer ids are `l_cards`, `l_faces`, `l_defs`, `l_rel`, `l_ports`, `l_hold`, `l_refs`, `l_model`, `l_rows` |
| **drive the web app** | `npm run dev`, read the port off the log; import through the header's *import a workspace* button (a file chooser) |
| **open a card** | select it and press Enter; double-click on a name renames it. A definition opens on its definition view; Enter on its middle card opens its structure. The showcase's layers are blocks: each opens inside, on `auto`; dragging a card there hands the layer to `free` |
| **see the system views** | *package* and *profile* on the rail. The profile follows what is picked on it |
| **see every definition view box** | the showcase's *Pump*: what it extends, ports in, out and both, a tag, its traits, its description |

### Where it lives

| File | Holds |
|---|---|
| core `navigate.ts` | `lens_of` (which view a block opens on), and `open_at` / `leave_at` / `sight` choosing views |
| core `sections.ts` | `ViewKind`, `LAYER_VIEWS`, `is_layer_view`, `is_inside` |
| core `aspects.ts` | what the definition view draws round a definition, and what an edit there does |
| core `names.ts` | `stamps_of`, the system marks: a stand-in's word, structure, data; `holds_structure` |
| core `tree.ts` | `layout_of`: `auto` where nothing says |
| core `session.ts` | `see`: a system view chosen, or back to the layer; `move` remembering each section's last view |
| views `definition.ts` | the definition view's graph |
| views `block.ts` | the projection per view; the folder view paged where nobody arranged it, its room hugging what it holds; `across` handed to an `auto` layer |
| views `survey.ts` · `profile.ts` | the package view, `tops` boxing a tree's top level; the profile's rows per level and the lines into them |
| views `pack.ts` · `arrange.ts` · `page.ts` | `auto`'s clusters in reading order, shelved at `page_wide` |
| views `face.ts` | `face_table` / `table` (rows and column widths), `fit_of` sizing both |
| views `derive.ts` | `carried`, with `opens`; `trail_of`; `empty_of` |
| stage `room.ts` | a scrolled drawing's room hugs it; the camera reads it as a page |
| explorer `rows.ts` · `chain.ts` · `Explorer.tsx` | every branch shut until opened; the structure section standing apart (`trees`, `drawn`), the definition held above opening its tree; the structure stamp |
| tray `Element.tsx` · `Settings.tsx` · `Tray.tsx` | the one first tab, card or line, in the settings tab's layout; the settings tab drawing the element in hand (`shown`); the tab sets |
| web `App.tsx` | the rail's views, drawn with `tops`; an `auto` layer read as a page; definition view edits routed through `aspect_acts` and `attach_of` |

### Step 6 — where to start

| File | Holds |
|---|---|
| views `route.ts` | runs, lanes and detours |
| views `seat.ts` | where a run meets a card — and where a tie should meet a corner |
| stage `Wire.tsx` | how a run and its name draw |

### Carried over

| From | To do |
|---|---|
| cards-plan | commit; `npm run release:kit` and re-pin mndmap's vendored kit. The kit changed under it: `ViewKind` is `internal`, `grid`, `folder`, `definition`, `package`, `profile`; `Mark` says `structure` for `parts`; `CardTab` is gone into `Element`; `table` returns rows and widths, not markdown; `face_text` leaves the attributes out. Step 9: `profile_graph(graph, target, across)`, no tiers; `look.tiers` gone, `look.tops` added; a layer saying nothing is `auto`, not `free`; `draws` counts a tree's top level on a system view; `Chain` carries `drawn` |
| cards-plan | drive *import a collection* and *attach* in the web app |
| cards-plan | notes draw their name, not their body, through `NoteNode` rather than `CardFace` |
| this plan | mndmap, or anything fetching the catalogue by name, asks for `entity-relation`, not `erd` |
| step 8 | lineage and links as a package structure; boxes for a definition's usages and their groups |

### Known rough edges

| | |
|---|---|
| **the root layer is a definition** | `main` lists in both explorer sections; open above |
| **the package view's name** | it draws both trees — every package and each tree's top level — so *package* undersells it |
| **the rail's system views** | both sections offer *package* and *profile*, which now draw the same thing; they could be listed once |
| **camera on a profile** | picking on the profile re-draws it lower on the page than it first opens |
| **a React warning** | `flushSync was called from inside a lifecycle method` showed once while driving the profile; not traced, and not checked against the last commit |
| **a usage cannot carry a trait** | traits are a definition's alone, so the cards layer shows each look as a card's own setting |
| **a page under the crumbs** | the package view scrolls its top under the crumbs; the page could start below them |
| **`dir: "one"`** | an old value the door passed silently in the retired sample; worth the door refusing unknown `dir` |
| **faint marks on table cards** | marks draw at the theme's half opacity, so on a dark card the last row's mark is hard to see |
| **definition view lines** | lines from boxes below the card share one run into its foot; step 6's routing |
| **definition view menu** | the middle card's menu still offers *delete block*, and the note's *delete note*; on this view both do nothing |
| **inherited ports** | the definition view draws a definition's own ports, not those it inherits |
| **a preview's size** | a reference previewing a table is sized from what it previews, its own marks added; its own look's border is not read |
| **the definition record's chip is gone** | the tray shows a definition's own word only; what it reads resolved down its chain is no longer shown anywhere |
