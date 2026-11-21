# Model plan

**Make a model mean something: one overview model of a system, decomposed into purposeful models, its presentations played from the overview like a slide deck.** Taken up 2026-11-07; redirected 2026-11-09 after part 1 of the mndsite review: the translator becomes agent-first tools, and model rules are rewritten as the review goes, assuming nothing earlier about a model's structure or purpose. **Delete this plan when the user accepts the shop and both translations (this repo, mndsite) as models.**


## Next session

**Paused 2026-11-19 behind iteration-plan.md**, the primary plan; orders 6–9 are taken when a round finds them.

**Handoff (2026-11-19).** scale-plan.md orders 1–8 are built and committed through `f8ca193` (map links); its *Handoff* says what is left (groups seen, crumbs on the map, order 9, frame rate). Orders 6–9 below follow it. Decided since 2026-11-16: **a package is a root folder, and folders enter**; **a model is always part of its package** (leaving one goes up to its package); **a definition holding parts enters as its diagram**, its well a preview (2026-11-17); **crumbs always follow the canvas, never a pick** (2026-11-19); **map links**: links said in words on chips at rest, lines only when lit (2026-11-18). Since, in iteration-plan.md: **the library holds structure** (2026-11-20, replacing *structure lives in models*); **order is explicit**, **a model entered is framed**, **packages shown by default and toggled**, **chips never rounded** (2026-11-21).

**The tree and chip rebuild** (orders 1–4 below) is specified in docs/design/chip.md and the header section of docs/design/card.md; mockup at claude.ai/artifact/Wgi6FEJTDjSKQVSSsKLexp (boards: anatomy, one header, map landscape and portrait, overviews landscape and portrait, the shop, focus by expanding, mark options); the generator that laid the mockup is kept for reference in docs/design/mockups/tree-chips/.

**Built this session (`54e0ff6`)**

| Change | Where |
|---|---|
| **one look at every zoom** for cards and lines: card name, facts, table and body always shown, text never held larger than laid; a line's anchors, name and ends' words by its laid length; detail fades by `--detail`; levels removed | views `line.ts` `line_shows`; stage `flow.css`; views and stage `level.ts` deleted |
| **a wall end faces its line's side**: a frame seat or port met from outside faces out (`LineData.outer`, set for what is across), so no run enters the room to turn back | views `ends.ts` `end_of`, `block.ts`; stage `Wire.tsx` |
| **libavoid retries walled-in seats** with a 3px buffer (two 12px buffers closing an 18px gap made it give up); a seat's pin sits on its owner card | views `avoid.ts` |
| **the fallback `route` never goes back through an end's card**: square runs leaving and entering along their faces, fewest cards crossed, then bends, then length | views `route.ts` |
| **`mnd measure` counts wrong-way runs** (back through an end's card, or across the frame's wall more than the ends need): mndsite 0, shop 0, this repo 0 | views `measure.ts`; cli `measure.ts` |

**Agreed this session: the tree and chips** (the full rules are chip.md's)

| # | Decision |
|---|---|
| 1 | **the treemap fills its space**, sized by weight; **landscape-biased squarify** (laid at half width, stretched 2×) so names read across, landscape and portrait alike |
| 2 | ~~**legible or closed**~~ **superseded 2026-11-16** by scale-plan.md's chip budget, opened from the top, with grouping: it could not close a flat list |
| 3 | **text never turns**; **a chip's name grows with its cell** (~11–20px, continuous) |
| 4 | **one header for cards and chips**: name; a meta line (kind · ▶ presentations · counts · attributes · seats in/out · tags, items dropping whole); the kind's square app icon at the right, as tall as both lines; **always two lines** (2026-11-16), no one-line form |
| 5 | **a chip is that header over a well**: its children as a quiet treemap, one level, every child named at the size that fits it; a chip that holds is laid tall enough for its well (2026-11-16) |
| 6 | **three kinds of cell by fill and border**: holds parts (plain recess well), diagram (well framed in its hue, a right-aligned *diagram* tab), leaf (no well, left accent); actors round, externals a thin semi-transparent border (not dashed), both without the kind word |
| 7 | **the world root opens each model one level**; what was opened by hand **resets** on each visit |
| 8 | ~~focus by expanding~~ **dropped 2026-11-16** after building it: a selection never moves a cell; only opening and closing boxes changes the layout, and a box opened by hand stays open |
| 9 | **boxes wear the shared header** too: box, chip and card one header (2026-11-16) |
| 10 | **weight is holdings only**: √(what it holds), never joins; the chip budget stops slivers (2026-11-16) |
| 11 | **the meta line never repeats the face**: a card leaves out attributes its table lists and seats on its walls; a chip keeps them (2026-11-16) |

| Order | Take up next session | Notes |
|---|---|---|
| 1 | **built**: **the unified header** in theme (`header.tsx`): one header for `CardFace` and `ChipFace` (name, meta line, square `role_*` icon), the facts strip folded into the meta line | theme `face.tsx`, `chip.tsx`, `face.css`; check the canvas: a card head grows from ~20px to ~34px, always two lines (decided 2026-11-16) |
| 2 | **built**: **the tree layout**: landscape-biased squarify, legible-or-closed, world root opens models one level, name size by cell; remove the turned, narrow, silhouette and listed-parts code | views `map.ts`, `tree.ts`, theme `chip.tsx`, stage `flow.css` |
| 3 | **built**: **wells**: children as a treemap, named where they fit; the three kinds of cell; the diagram frame and tab | views `map.ts` (tiles), theme `chip.tsx`, stage `flow.css` |
| 4 | **built, then dropped**: focus by expanding (see decision 8); kept: toggles reset per visit, a box opened by hand never closed by legibility (views `map.ts` `keep`) | stage `room.ts` / `Flow.tsx`, views `map.ts`; the mockup's Focus board |
| 5 | **built**: **drive it**: the shop and mndsite driven 2026-11-16 (map and overview, landscape and portrait, whole and 3× zoom, the library map; every model and diagram under example entered, toggles, a presentation); the map laid at the canvas's size and seen whole, well cells graded; 2026-11-16 second pass: a click only picks inside an entered treemap, a package's folder enters as its treemap, every well child named, the library drops folders filing no definition; next: scale-plan.md, then the user's look at the entered views and presentations | feedback: verify the user's path |
| 6 | **ties far from their target**: Overview › Shop's *hot path* note ties across 8 cards; place a note beside what it ties | `mnd measure` counts them as crossings |
| 7 | **pills overflowing small cards** (*Rate limit*, *Router*: "2 attributes" past the bottom edge, before this session too); likely gone with the header, verify | |
| 8 | ~~**`check` misses unresolved references**~~ fixed 2026-11-19 (iteration-plan.md): `check` of a folder fails on what collecting notes | |
| 9 | **the MCP surface** (docs/tools/README.md *Spot check*) and **this repo's model** composed with the tools | the acceptance below |

**Open items**

| Item | Notes |
|---|---|
| **a `class` face draws no rows outside a class diagram** | mndsite's data definitions use the `table` face to show in a dataflow's datum band |
| **the layer engine's leftovers** | an actors band past one row folding into *+n more*; an external read and written through two ports as one card; long sequences cut into sub sequences; class: owners first along the long side, named fields as links, worked-out foreign keys |
| **mndsite's composed parts are below the floor** | each part holds one or two uses of library units (`draw` warns); revisit with the tree rework |
| **a folded card's name is cut short** | one card per port and the outer ring write their rows into the card's name; the unified header's meta line may hold them |
| **entering a use from the map opens its library definition**, not its view in the model, so no outside cards show | seen 2026-11-15; check it is intended |

**Carry over**: **drive every depth after a navigation change**; **the camera has one owner** (web `camera.ts` `shot_of`); **mockups use the app's own faces**; **every model draws as its kind** (a plain `model` is its tree).


### Build notes from the kinds pass

What the agreed kinds ask of the code, by home. Each is general; the kind's file says why.

| Home | Change | Kind |
|---|---|---|
| base kinds | **built 2026-11-15**: `context` replaces `internal` (view `internal` kept); the `treemap` kind retired; new `actor`, `external`, `dataflow`, `mapping` (*has records*, view `records`) | context, tree, dataflow, mapping |
| core | **built 2026-11-15**: a port's `type` may name a data definition (`sources.ts` `interface_of`); a model's `open:`, `about:`, `presentations:`; a mapping's records, a dataflow's `datum` | dataflow, mapping, tree |
| theme | **built 2026-11-15**: a typed seat filled with its type's colour, semi-transparent, and outlined; a base seat hollow (`flow.css`) | dataflow |
| views and stage: layer | **built 2026-11-15**: the datum band (views `block.ts` `banded`, the large face, its rows from the closest zoom); **what is across a frame** in its zones, a port naming its wall keeping it, **one card per port** with its ends as name rows, **the outer ring** folded into its card as a row (`content folder ← mndmap`) (views `across.ts`); **behaviours along an axis**: flow, state and dataflow one way by the canvas, never wrapped; flow and state in **lanes**, the main way on the axis, each other answer a lane below then above (views `flow.ts` `laned`); **a dataflow ranked by role**, its readers last (ELK longest path). Placed beside the ELK run, not as its compound node. Open: an actors band past one row folding into *+n more*; an external read and written through two ports as one card | context, flow, dataflow, state |
| views and stage: grid | **built 2026-11-15**: the owner's frame over the head, origin dots, **fragments** (`fragments:`, repeats and alternatives over rows; core `diagram.ts` `fragments_of`, views `lifelines.ts` `fragments`); **participant order** written by `mnd draw sequence` (cli `tools.ts` `participants_in_order`); a swimlane turned by the canvas, a move in it landing as stored (views `sheet.ts`, `block.ts`). Open: long sequences cut into sub sequences | sequence, swimlane |
| views: records table | **built 2026-11-15**: one generic records table, any block with records (view `records`): row accent by the definition named, groups by source under plain headings, links (views `records.ts`, stage `nodes.tsx` `RecordsNode`). Open: groups folding past 12 rows | mapping |
| views and stage: types | **built 2026-11-15**: a line leaves the owner's card from its field's row; on an entity diagram it meets the other's primary key row, crow's feet as before (views `classes.ts` `field_rows`, `seat.ts` `seat_all` rows, `face.ts` `row_mid`). Open: owners first along the long side, named fields as links, worked-out foreign keys | class, entity |
| views: tree | **built 2026-11-15**: one tree view, the model root (the world is the map; the definition root retired 2026-11-16, containment only); a chip a closed box. The component registries (tags, types) keep their own tiles (views `treemap.ts` `tiled`), as does a definition chip's preview on the library map | tree |
| tools | **built 2026-11-15**: diagram tools warn below the floor (3 steps, messages, states, rows, parts); `tree` renamed `overview` | all |
| surface (syntax pass) | **built 2026-11-15** (design.md *Diagram files*): sequence `participants` and messages by the kind; swimlane `lanes`/`phases`; dataflow `datum`; mapping `records` as relations; a model's `open:`, `about:`, `presentations:`; a named relation quoted reads as bare | sequence, swimlane, dataflow, mapping, tree |
| samples | **done 2026-11-15**: samples/elements gains a dataflow and a mapping (`6-data`) and typed ports; Fulfilment writes `lanes`/`phases`; the shop's models carry presentations, About and `open:` | tree, swimlane |


## Goal

| | |
|---|---|
| **a model is** | a view of one system with one clear purpose; models combine into larger ones |
| **the overview** | one per system, decomposed into smaller models as the system's complexity needs; what is too small for a model of its own stays in it |
| **perspectives** | actors and entries, data flows, deployment and release, and more: each may be its own model |
| **presentations** | a model's ordered, narrated overviews: stops through its parts, presented like a slide deck, the overview as their opening stop |
| **the agent** | focuses the user on the primary components and illustrates the most important parts, using the tools |
| **acceptance** | each model states its purpose, passes `mnd measure`, and the user accepts it in the app: the shop, this repo and mndsite |


## Decided

**2026-11-09, the new direction.**

| # | Decision |
|---|---|
| 1 | **the translator is agent-first tools**: fact tools and diagram tools targeted at cases the review finds, CLI first, MCP a thin wrapper over the same commands; an agent composes models with them. apps/ts's reading (`read.ts`, `structure.ts`) is reused as fact tools; `write.ts`'s model rules are what this replaces |
| 2 | **composed models are saved as editable files**, each block and flow anchored to its source (file, symbol), so `check` can flag drift |
| 3 | **a model shows parts and behaviours by containment** (the tree); steps belong in flows inside it, never in the model's own layout |
| 4 | **an entry is a way into a model**, not a model of its own: nine entries running slices of one path are one model's entries |
| 5 | **data is never a block in a model**: it may be a definition (a port's schema) and flows between parts and across the edge through ports; model and definitions stay separate |
| 6 | **the outside is external blocks joined by data flows**: inputs and outputs drawn as external blocks (part 1's context diagram), their relation to the system a data flow through ports with schemas |
| 7 | **CI, Docker and the like** are part of the overview unless big enough for a model of their own |
| 8 | **every diagram kind is documented** in docs/diagrams/, one file each: purpose, utility, surface |
| 9 | **the overview offers its presentations both ways** (revised 2026-11-12): listed in the About band below the system, and picking one plays it on the overview |
| 10 | **boxes open and close**: primary components, sub models and subtrees open; everything else shows its name. Opening and closing is the only change of layout. **What we know about a model sits apart**: an About band below the system, past a dashed divider, plain text notes never drawn like the system, never lit or dimmed; its groups are set by the model file's `about:` (default presentations, entries, library), each holding any blocks, definitions, presentations or entries (2026-11-12) |
| 11 | **tools stay separate**, one question each, and each is documented in docs/tools/, one file each: purpose, use case, surface; added to as the review finds cases. **They are plain CLI tools for a person as much as an agent**, as simple as possible; nothing in a model or diagram records who made it. **The design pass's final test is that the user understands how to use them** (2026-11-11) |
| 12 | **a presentation is ordered stops with narrative**: each stop's text presented to the user; the order must be a logical path through the system, never an enumeration of unordered relations. A datum's data flow may seed a presentation offered from the part that makes it |
| 13 | **diagram tools are flavours over a few base views**: a tool makes one kind, the same base view with its own semantics and annotations (sequence and swimlane over the grid; context, flow and dataflow over the layer). Documented in docs/tools/ README, and per kind in docs/diagrams/ |
| 14 | **a part's frame is the context for its flows** (2026-11-11): every flow is drawn inside the frame of the part that owns it (its boundary, its ports, what is across them), ending at its ports, so context and flow are one picture at every level. Opening a part shows its frame with its presentations, mapping and data boxes beside it. A part's diagrams fall in four classes: frame, flows (flow, sequence, dataflow), data (class), mapping (a grid: reads, writes, rule) |
| 15 | **a presentation ties parts of the system together in a directed order** (2026-11-12; was *walk*; *tour* rejected, *path* kept as the informal "presentation path"): as general as a relation, not limited to show-and-tell. A presentation is a sequence of **stops**; each stop has **one distinct point** |
| 16 | **a stop is a state of the overview** (fields settled 2026-11-12, spec in presentations.md): `title`, `at` (ringed, the camera's centre), `open`, `fit` (optional), `show` (optional: a diagram the stop opens), `summary`, `into` (optional), `pace` (optional), and ordered `steps`, each a `relation` the model has (or the shown diagram draws) or a `mark`ed block, with one sentence. One drawing and a camera: no overlay, nothing morphs. The reader may dive into any part at a stop and resume |
| 17 | **presentations play like a slide deck**: visuals first, the words in the tray. A stop opens its boxes, the camera moves, then its steps build one at a time, each step's sentence appearing in the tray as it is drawn. Steps advance on a timer (`pace`, default 1.7 s, `0` for on click) and a click shows the next one at once. A presentation opens on its **overview** stop (not "agenda") |
| 18 | **the overview is the map focused on one model**, and the registry is the same view focused on one definition: one treemap of chips with collapsible boxes, two roots (world, model) since 2026-11-16; a package, a folder and a group enter as the same view framed (scale-plan.md) |
| 19 | **flows and presentations stay distinct**: a flow or sequence diagram pictures relations inside one block; a presentation can cross diagrams. A flow may seed a presentation, one stop per step, its narration added |
| 20 | **presentations live in the model file** as a `presentations:` list; stops name blocks as lines do |
| 21 | **a stop may lead into a sub model's presentation** and return, by the same *into* as everywhere |
| 22 | **presentations are made through the CLI** by a person or an agent; a `presentation` tool may draft one from a flow or sequence, to be edited |

**Kept from 2026-11-07/08** (not about a model's structure or purpose).

| # | Decision |
|---|---|
| 23 | **a model's diagram is its kind's**: a model never says its own `diagram` |
| 24 | **a box groups, never behaves**: a behaviour in a region or folder belongs to the block whose layer the box is on |
| 25 | **presentations are front and centre** in how a person meets a model; it leads the tray's overview, with simple debugger controls (next, previous, into, out) |
| 26 | **one mechanism for composing**: a block may be a use of another model, and *into* enters it |
| 27 | **the library is the system**: models hold uses of its definitions and define nothing |
| 28 | **faces say more with less**; **one representation at every zoom**. *Superseded 2026-11-16 by chip.md*: no turned signatures, no silhouettes |
| 29 | **the tray sits by the canvas's shape**: right of a landscape canvas, below a portrait one |
| 30 | **what is primary reads first**: shared parts quieter, keeping their colour; the most central blocks larger and framed heavier |

**Dropped 2026-11-09**: one path per model; a model as a treemap in step order; a model's steps as its lines; a 1-step path is no model; `steps` as a model's size; reading order by salience; off-path parts in a *Shared* box; flow models later.


## Build

Built under the 2026-11-08 direction; kept as the record of what is in the code.

**Pass 1**: the model as a path, and the walk. **Built 2026-11-08.**

| # | Step | Where |
|---|---|---|
| 1 | **a model's path**: its lines in list order, each a hop; a step's block using a model is a sub model | core `tree.ts` |
| 2 | **the model kind places a treemap in step order**: tiles in list order; blocks no line touches in a *Shared* box, quieter; on-path blocks major | base `model.json`, views `map.ts` `layer_map` |
| 3 | **the translator writes the library and one model per path**: units (components, entry and shared modules) as definitions by package, a component's modules its parts; one model per entry path of 2 steps or more, its blocks in first-visit order, its shared modules after them; `steps` 12 a default; models ordered by summed salience | apps/ts `write.ts`, `structure.ts`, README |
| 4 | **the shop as stories**: Checkout over shared definitions, Payment retry its sub model | samples/example |
| 5 | **the walk in the tray's overview**: the stack of models entered, the steps as blocks, previous, next, into, out, and the step read; the options rail removed | tray `Walk.tsx`; web `App.tsx` |
| 6 | **the tray sits by the canvas's shape**: right of a landscape canvas, below a portrait one | theme `shell.css` |
| 7 | **the library lists no models** | core `sections.ts` `on_side` |
| 8 | **a chip reads through**: a usage's chip holds its definition's parts; a usage shows its definition's defaults | views `tree.ts` `parts_of`, `face.ts` `listed` |

**Pass 2**: chip faces, and a richer translation. **Built 2026-11-08.**

| # | Step | Where |
|---|---|---|
| 1 | **one chip look at every zoom**: no levels; facts, tile names and rows, a profile fade with the zoom (`--detail`, whole at 75%, a fifth at 25%); whatever is decided — signature turned, tiles placed, name or icon — from the laid shape | theme `chip.tsx`, stage `nodes.tsx`, `flow.css` |
| 2 | **a narrow chip turns its signature, never its body**: a strip down its left side; the body upright beside it | views `map.ts` `mapped` (`head.w`), theme `chip.tsx` `signed` |
| 3 | **kind silhouettes**: a diagram chip carries `data-kind`; a state machine's states rounded, an internal diagram's parts in a dashed frame, beside what structure already drew (lifelines, strips, the flow line, rows) | theme `chip.tsx`, stage `flow.css` |
| 4 | **a module's exported functions and values are its parts**, each by its `signature`; a unit says the shared types it reads (`reads`) | apps/ts `write.ts`; ts `module.json`, `component.json` |
| 5 | **the walk under *why it matters***, its parts set apart (`Section` `parts`); list rows pick, by pointer and keys | tray `Overview.tsx`, `Walk.tsx`, `Lists.tsx` |

**Pass 3**: chips that say something, and parts entered through their use. **Built 2026-11-08.**

| # | Step | Where |
|---|---|---|
| 1 | **a use never repeats its name as its kind**: `ingest module`, not `ingest ingest` | views `about.ts` `kind_of` |
| 2 | **a chip of parts shows its answers** in its facts strip, in place of counts (`runs node · entered script ingest`); a list by its first item and how many more | views `facts.ts` `answers_of`, `map.ts` `mapped`; theme `facts.tsx` |
| 3 | **parts too small to name are listed**: name rows in columns over the rest, a *+n more* row last | views `map.ts` `listed`, `placed_in` |
| 4 | **a part seen through a use is entered through it**: the view's `via`, the trail and leaving following the way | core `navigate.ts` `way_of`, `read_at`, `open_at`, `leave_at`, `held_at`; views `derive.ts` `trail_of`; web `App.tsx`; stage `Stage.tsx` |
| 5 | the tray's *why it matters* reads a use's definition's purpose through | tray `Overview.tsx` `Why` |
| 6 | **translation**: models named by entry (`Docker → cli`, `npm run ingest`); a component described by its members' headers; the package by its README's lead; `lines` last | apps/ts `write.ts`, `read.ts`; ts `module.json`, `component.json` |
| — | **tried and reverted**: a purpose line under every chip's name; a cut-short description said less than the counts it replaced | design.md |

### Open after the passes

| Open | Notes |
|---|---|
| **a read-through part is entered through its use** | fixed 2026-11-08: a definition's part seen through a use jumped to the library; it is now entered in the models through that use (core `View.via`, `way_of`; design.md), the trail and leaving following the way |
| **the step's words** | settled by presentations: each step's sentence is written in the model file (presentations.md) |

### Fixed after the user's look (2026-11-08)

| Fixed | How |
|---|---|
| **tiles with room showed no name** | the container query measured `3em` against the root's 16px; now 20px of text room, after the icon (`flow.css`) |
| **text never grew zooming in** | a map's text scales with the drawing, never held on screen (`flow.css`; views `map.ts` `ROW` lost `HELD`); design.md updated |
| **narrow chips turned with room across** | a chip's signature turns only where its name does not fit across (`map.ts` `NAME`) |
| **tall tiles said nothing** | a tall tile too narrow for its name turns it (theme `chip.tsx` `upright`) |
| **picking a package after a folder kept the zoom** | the reveal of the picked block was judged against the camera still at the folder's zoom and overrode the fit; it is now judged against where the camera is going (stage `room.ts` `going`) |
| **letting go kept the zoom** | Escape or empty ground fits the section's map again (web `App.tsx`); design.md updated |
| **entering flew in, then cut back out** | superseded by *Camera* below: the flight ends where the entered view will stand, so nothing zooms back out |
| **seen, not fixed** | at the fitted zoom the library's *components* box now folds three chips (*+3 more*): rows laid smaller changed the treemap's weights |

### Camera (built 2026-11-08)

**One owner**: web `camera.ts` `shot_of` works out one shot from where the app is; stage `room.ts` `useCamera` lands it. Gone: `useFocus`, `usePage`, `stop`, `through` and its 30 ms timer, `last_stop`, `aim`'s `flushSync`; a flight's target (`going`) is now the hook's own. Driven on all four samples (map, model, part inside a model, page, grid; crumbs, Escape, letting go, walk steps, resize, reduced motion), console clean.

| Built | How |
|---|---|
| **fly into the chip, then cut** (the user's choice) | the map stays drawn while the entered view is laid; the camera flies into the chip only as far as that view will stand, then cuts, so the zoom never turns back. Also from a chip on an entered treemap (a model's part) |
| **fly out of the chip** | leaving, or going up by a crumb, the drawing gone to starts with the chip where the view stood, then flies out |
| **no flash at a cut** | the fade starts before the cut is painted (a layout effect); before, the old layer showed for about 4 frames under the new camera |
| **a layer treemap is its own drawing** | `realm_of` told a model's treemap from the models map by title alone, so entering a model never faded |

| Open | Notes |
|---|---|
| **first motion waits on the layout** | 100–190 ms from the double-click to the first move on ELK-laid views, since the flight must know where the view will stand |
| **revealing the same block twice** | pans only once until something else is picked or revealed (the `flushSync` trick is gone) |
| **a registry drawn as a treemap** | fitted whole, its wheel zooming, where before both a page and a fit fought over it |

### Chip faces gap (2026-11-08)

Against the mockup's *Kinds* board (https://claude.ai/artifact/RCAGGQPcybLxRYZSkGwjsj). **Two redesigns were tried and reverted the same day; diagram chips are their treemap tiles as pass 2 left them** (structure-laid tiles; a state's tiles rounded, an internal diagram's body in a dashed frame).

| Tried | Why it was rejected |
|---|---|
| **a per-kind sketch** (a second layout of each kind: lifelines and messages, lanes, nodes and arrows, tables, labels) | not compact, and it reflected no entered view: it laid the diagram again by its own rules |
| **a thumbnail of the entered view** (its laid scene scaled into the chip, no words; ELK views laid in the background) | faithful, but still not compact enough: a scaled drawing reads as clutter at chip size |

| Open | Notes |
|---|---|
| **a diagram chip that stands out** | the user's direction: keep the tiles, add a unique diagram stamp or another way to stand out. Candidates: the kind's icon large as a watermark, a kind-shaped corner mark, a ruled header band in the kind's hue |
| **a model's path in the gaps** | a model is the map's own box; its path needs map-level lines |
| **component chips as typed pills**, a behaviour's signature row, a sub model banner on focus | from the *Kinds* board |

### Seen in pass 1

| Seen | Notes |
|---|---|
| **the shop's stories use the catalogue's definitions** | Checkout and Charge a card hold uses of `services`' and Records' definitions, as the Shop does; the Shop's own parts were left as uses, since a definition extending a pattern loses the pattern's parts (structure never inherits) |
| **mndsite tells one model** | six of its seven entry paths are one step (each config calls `link`), so fold |
| **a traced hop may cross a chip** | as on the map (backlog *map*) |


## Found 2026-11-07

About walks, answered by presentations (presentations.md): offered from the overview's About band, crossing diagrams by `show` and `into`.

| Finding | Notes |
|---|---|
| **few walks, hard to find** | a walk starts only from its owner, picked (▶). Shop has one (8 steps, its region's two behaviours); elements none; this repo 6 entry modules (4–12 steps); mndsite 7, six of them 1 step |
| **nothing points to a walk** | a model says nothing of the paths it holds; opening it offers none |
| **an entered sequence offers no walk** | its owner is not drawn inside it, so its own steps cannot be walked there |
| **a flow walks nothing** | Payments' *Payment retry*: its steps stand for nothing outside it, so its path is empty |
| **scrolled views never fit a walk** | class, entity and registry views scroll to their focus; no walk reaches one today |
| **a block with behaviours draws as a class card** | Shop in Overview now lists `Checkout saga()` and `Fulfilment()` as methods (views `look.ts` `faced`); kept, as Payments always did |
| **measures** | this repo's top layer 18 crossings landscape, 4 portrait; the shop's Shop layer 8; both as at `279534d` |


## Questions answered

- **how a diagram chip stands out** (2026-11-15): a per-kind stamp in the head, the kind's icon in a filled badge of its hue; built with the tree view
- **flows from code** (answered by the review): a flow is a chain from `calls` or `workflows` cut into sub flows (docs/tools/flow.md); following one datum is a dataflow; ordered messages a sequence


## Carried from code translation

- **the user's direction** (2026-11-02, revised 2026-11-09 by *Decided* 1): facts are found deterministically from the graph; which make a model is chosen by whoever uses the tools; no hard rules about what a block is; thresholds are defaults with floors; balance depth against the big picture; diagrams are visual information, never lists of parts
- **the walk's refinements** (the user, 2026-11-05): the user liked *walk its path* on sequences; carried into presentations (a flow or sequence may seed one, decisions 19 and 22)
- **seen, not fixed** (design-plan.md *Open*): a lone use (*Shop*) loses its name to its box's heading line, which an overview diagram would show first
- the translator's rules are design.md *Translation*; its stages and settings apps/ts's README


## Commands

- **regenerate**: `npm run samples` (base kinds: `npm run base` first); `npm run code` (this repo → `samples/code.json`); mndsite by hand: `cd apps/ts && npx vite-node src/main.ts ../../../mndsite ../../samples/mndsite`, then `npm run start -s -w @mnd/cli -- collect ../../samples/mndsite ../../samples/mndsite.json --workspace`; `check` each. `npm run base` after a base kind change, `npm run packages` after a `ts` kind change
- **measure**: `npm run start -s -w @mnd/cli -- measure ../../samples/<name>.json [layer]`; entered diagrams only, not the map
- **tools**: `npm run start -s -w @mnd/cli -- fact <name> <project>`, `-- draw <kind> <selection.json> [out]`, `-- presentation <list|draft|check> <model.yaml>`; MCP `npm run mcp -w @mnd/cli`
- **see it**: a Playwright script (Edge, `channel: "msedge"`) starting Vite from `apps/web/vite.config.ts`, routing `**/mndflow.yaml` to `workspace: /samples/<name>.json` (`tray: open`); pick or enter a node by id (`.react-flow__node[data-id="…"]`), never by text. In Git Bash set `MSYS_NO_PATHCONV=1`

