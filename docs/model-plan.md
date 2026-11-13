# Model plan

**Make a model mean something: one overview model of a system, decomposed into purposeful models, its presentations played from the overview like a slide deck.** Taken up 2026-11-07; redirected 2026-11-09 after part 1 of the mndsite review: the translator becomes agent-first tools, and model rules are rewritten as the review goes, assuming nothing earlier about a model's structure or purpose. **Delete this plan when the user accepts the shop and both translations (this repo, mndsite) as models.**


## Next session

**State at hand-off (2026-11-12; all uncommitted).** The mndsite review is done: twelve parts agreed, mndsite's model recorded in mndsite-plan.md *Outcome* (review page https://claude.ai/artifact/UN5BuHw2XGH3T5bmcUMMHu). **Presentations** replace walks: specified in presentations.md from the mockup the user accepted ("behaves exactly as I would expect", https://claude.ai/artifact/WFdvLDrRtW6tfWGevF6cx5). 18 tools are documented in docs/tools/. No code changed this session.

| Order | Take up | Where |
|---|---|---|
| 1 | **the diagram kinds pass**, run like the review: one kind at a time, a mockup and a short file each in docs/diagrams/ (purpose, utility, surface: how it is written in files and which tool makes it), agreed with the user. Kinds named so far: context, flow, dataflow, sequence, swimlane, state, internal, class, entity, mapping, tree; base views: layer, grid, types, treemap (design.md *Diagram kinds*, docs/tools/ README) | mndsite-plan.md step 6 |
| 2 | **build presentations**: the file, the player (open, camera, steps, pace), the About band, the tray, the CLI | presentations.md *Building it* |
| 3 | **the tools' build list**: fact tools first (most exist in apps/ts `read.ts`), then diagram tools, CLI before MCP | docs/tools/ |
| 4 | the rest of *Open after the passes*; polish waits in backlog.md *After the mndsite review* | below |

**Carry over**: presentations.md *Open* (where the pace setting is kept; how a shown diagram is left); chip stamp (*Questions* 1) waits on the kinds pass; passes 1–3 (*Build*) were built under the old direction, and what of them stays is decided with the build list. Suggested commit: *mndsite review, presentations spec and tool docs*. **Drive every depth after a navigation change** once code changes again. **The camera has one owner** (committed 4ea7e35; *Camera* below).


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
| 18 | **the overview is the map focused on one model**, and the registry is the same view focused on one definition: one treemap of chips with collapsible boxes, three roots (world, model, definition) |
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
| 28 | **faces say more with less**; **one chip representation at every zoom**; **a narrow chip turns its signature, never its body**; **each diagram kind has its own silhouette** at chip scale |
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
| **the step's words** | the step read says its hop and what crosses it; a model's own narrative per step waits on the walkthrough format (design.md *Open*) |

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

| Finding | Notes |
|---|---|
| **few walks, hard to find** | a walk starts only from its owner, picked (▶). Shop has one (8 steps, its region's two behaviours); elements none; this repo 6 entry modules (4–12 steps); mndsite 7, six of them 1 step |
| **nothing points to a walk** | a model says nothing of the paths it holds; opening it offers none |
| **an entered sequence offers no walk** | its owner is not drawn inside it, so its own steps cannot be walked there |
| **a flow walks nothing** | Payments' *Payment retry*: its steps stand for nothing outside it, so its path is empty |
| **scrolled views never fit a walk** | class, entity and registry views scroll to their focus; no walk reaches one today |
| **a block with behaviours draws as a class card** | Shop in Overview now lists `Checkout saga()` and `Fulfilment()` as methods (views `look.ts` `faced`); kept, as Payments always did |
| **measures** | this repo's top layer 18 crossings landscape, 4 portrait; the shop's Shop layer 8; both as at `279534d` |


## Questions

| # | Question | Options, leaning first |
|---|---|---|
| 1 | **how a diagram chip stands out** (waits on the mndsite review) | a per-kind stamp in the head (the kind's icon in a filled badge of its hue) / the kind's icon large and faint behind the tiles / a header band in the kind's hue / tiles alone, as now |
| 2 | **flows from code** (the mndsite review decides): what a flow tool draws from a selection the agent makes | a call chain from one function, across modules only / an entry's chain / a data flow between parts |


## Carried from code translation

- **the user's direction** (2026-11-02): a deterministic structure found from the graph, not agentic band-aids; no hard rules about what a block is; thresholds are defaults with floors; balance depth against the big picture; diagrams are visual information, never lists of parts; agents refine and narrate on top
- **the walk's refinements** (the user, 2026-11-05): the user likes *walk its path* on sequences and has refinements in mind; take them up under *Questions* 2–3
- **seen, not fixed** (design-plan.md *Open*): a lone use (*Shop*) loses its name to its box's heading line, which an overview diagram would show first
- the translator's rules are design.md *Translation*; its stages and settings apps/ts's README


## Commands

- **regenerate**: `npm run samples`; `npm run code` (this repo → `samples/code.json`); mndsite by hand: `cd apps/ts && npx vite-node src/main.ts ../../../mndsite ../../samples/mndsite`, then `npm run start -s -w @mnd/cli -- collect ../../samples/mndsite ../../samples/mndsite.json --workspace`; `check` each. `npm run base` after a base kind change, `npm run packages` after a `ts` kind change
- **measure**: `npm run start -s -w @mnd/cli -- measure ../../samples/<name>.json [layer]`; entered diagrams only, not the map
- **see it**: a Playwright script (Edge, `channel: "msedge"`) starting Vite from `apps/web/vite.config.ts`, routing `**/mndflow.yaml` to `workspace: /samples/<name>.json` (`tray: open`); pick or enter a node by id (`.react-flow__node[data-id="…"]`), never by text. In Git Bash set `MSYS_NO_PATHCONV=1`

