# Model plan

**Make a model mean something: an informative overview of a system, told as narrative paths from its entry points through its primary components, with the walk front and centre.** Taken up 2026-11-07, when the simplification and code translation plans closed (2026-11-08); it takes over the translations' acceptance. **Delete this plan when the user accepts the shop and both translations (this repo, mndsite) as models.**


## Next session

**Passes 1 and 2 built 2026-11-08, uncommitted, reviewed; awaiting the user's look** (*Build*). Start by regenerating (*Commands*) and driving the shop, mndsite and this repo against the mockup (https://claude.ai/artifact/RCAGGQPcybLxRYZSkGwjsj). Then take up *Open after the passes*, highest first. Suggested commit: *Tell models as paths: walk in the tray, library-first translation, one chip look at every zoom*.

**Later 2026-11-08**: the user's look found the map's text and camera broken (*Fixed after the user's look*) and mndsite still sparse; translation-plan.md took over how translation changes: decided and built the same day, its *Landed* table what to tune next. **Chip faces against the mockup's *Kinds* board are mostly unbuilt** (*Chip faces gap*).


## Goal

| | |
|---|---|
| **a model is** | an overview of one system: its primary parts, its entry points in reading order, and the paths that run from them |
| **the story** | the model's business: its narrative paths and the order its entries are read in belong to the model, not to a view |
| **the walk** | front and centre: how a person meets a model, never a mark to hunt for |
| **acceptance** | the shop, this repo and mndsite each read as such a model in the app; `mnd measure` as a check |


## Decided

| # | Decision | Since |
|---|---|---|
| 1 | **a model's diagram is its kind's**: a model never says its own `diagram`; the door drops one, the look action refuses it | 2026-11-07 |
| 2 | **a model is a treemap laid in step order** (replaced `layered`, 2026-11-08): entering a model shows its treemap view, its path's blocks as tiles in step order, the path drawn across them | 2026-11-08 |
| 3 | **a box groups, never behaves**: a behaviour in a region or folder belongs to the block whose layer the box is on | 2026-11-07 |
| 4 | **the story and its reading order are the model's**; with one path per model, its order is its steps' | 2026-11-07 |
| 5 | **the walk is front and centre** in how a person interacts with a model | 2026-11-07 |
| 6 | **paths decide what a model holds**: **one path per model**, a focused path through the system; its blocks are the ones that path passes through | 2026-11-08 |
| 7 | **one story per model**: the package (the translated system) holds the shared blocks every model uses, in the library; the system is described by the set of models extracted from it | 2026-11-08 |
| 8 | **the walk leads the tray's overview** (moved from the rail 2026-11-08, the options rail removed): the model's stack, like a stack trace, and simple debugger controls (next, previous, into, out). Each frame is a block, shown as a stack of blocks; choosing one goes to that step | 2026-11-08 |
| 9 | **a walk keeps its depth**: the user follows the main path at one model's depth and may enter a sub model at any step, which pushes a frame | 2026-11-08 |
| 10 | **off-path parts are shared**: what no path passes through goes in a shared box, for now | 2026-11-08 |
| 11 | **faces say more with less**: card faces minimize clutter and use their area to show contents and components, as chips' diagram-like look began; the mini map and attribute, usage and tag chips grow so **each diagram kind reads at a glance zoomed out**, with sub blocks and content inspected on focus | 2026-11-08 |
| 12 | **one mechanism for composing**: a step's block may be a use of another model, and *into* enters it; that is a sub model, and how patterns compose | 2026-11-08 |
| 13 | **a narrow chip turns its signature, never its body**: name, kind and icon (component chips where room allows) read upright; its body reads horizontally | 2026-11-08 |
| 14 | **each diagram kind has its own silhouette at chip scale** beside its hue (sequence lifelines, class rows, flow a line through cards, treemap tiles), consistent at every zoom, clutter kept minimal | 2026-11-08 |
| 15 | **one chip representation at every zoom**: the same content near and far; detail fades, dims and compresses far and comes forward near, continuously, with no transition point; replaces chip levels (design.md); every choice (signature turned, tiles placed, name or icon) is made from the laid shape, never the size on screen | 2026-11-08 |
| 16 | **the step readout lives in the tray**: the step, its text, what it carries, a sub model here, what comes next | 2026-11-08 |
| 17 | **the tray sits by the canvas's shape**: right of a landscape canvas, below a portrait one, so the canvas keeps a steadier aspect | 2026-11-08 |
| 18 | **a walk step is one hop**, lit on the canvas, its readout in the tray | 2026-11-08 |
| 19 | **a 1-step path is not a model**: it folds into what calls it | 2026-11-08 |
| 20 | **no cap on a model's size**: a path may have any number of steps; the translator aims under `steps`, a flexible threshold defaulting to 12, and is adjusted where a path grows too long. Measured on the code samples | 2026-11-08 |
| 21 | **flow models come later**: how data flows is a model kind of its own, expanded in a later step | 2026-11-08 |
| 22 | **the package sets its models' reading order** by one general metric: a sub model right after the model entering it, then by the summed salience of the blocks each path passes through, most central first, ties to the entry nearer what nothing uses | 2026-11-08 |
| 23 | **what is primary reads first** (option B): shared parts quieter, keeping their colour; the path's most central blocks larger and framed heavier; inside a block its primary part leads and minor parts compress; wider gaps between blocks than within one | 2026-11-08 |
| 24 | **the library is the system**: every block a translation reads is a definition in its package's library, in folders; models hold uses of them and define nothing; a definition's registry says which models use it. Models are no longer listed in the library, only in the models | 2026-11-08 |
| 25 | **a model's steps are its lines in list order**, each line one hop; no new key | 2026-11-08 |


## Build

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

### Open after the passes

| Open | Notes |
|---|---|
| **step order reads by columns** | d3's squarify keeps list order but lays a landscape model in columns; the mockup's serpentine rows are not built |
| **an unanswered attribute shows its type** | a use with no value and no default reads `owner text`; a definition's own `values` are collected as attribute defaults without their type (core `sources.ts`), so `lines` reads as text |
| **a read-through tile picks the definition's part** | on the map, a tile a usage reads through is its definition's part, picked as itself, not through the usage (`route`) |
| **the silhouettes are partial** | the model chip's step order and path, a class's compartments and an entity's key head are what the mockup showed beyond today's; tune against the mockup |
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
| **entering flew in, then cut back out** | entering cuts, the view fading in fitted; **to confirm** this was the *zoom in then out* the user saw, then update design.md *Motion* and definitions.md *enter* |
| **seen, not fixed** | at the fitted zoom the library's *components* box now folds three chips (*+3 more*): rows laid smaller changed the treemap's weights |

### Chip faces gap (2026-11-08)

Pass 2 step 3 built two CSS rules (a state's tiles rounded, an internal diagram's dashed outline) and counted what structure already drew as the rest. Against the mockup's *Kinds* board:

| Mockup | Built |
|---|---|
| model: tiles in step order, the path drawn in the gaps | tiles only; no path |
| internal: parts in a frame, **ports on its edge** | dashed outline; no ports |
| sequence: lifelines, **activation bars, messages across** | lifelines only |
| class: **compartment rows**; entity: **key head**, joined | rows where a tile has room; no key head, no joins |
| flow: cards on one line, **a diamond branch** | line and marks; decision a small glyph |
| state: rounded states, **start dot and end ring** | rounded tiles |
| swimlane: lanes as columns, steps in cells | built |
| **component chips** as typed pills (`total: Money`, `in Cart`, `pci`, `attempts ≤ 3`, `Order ×6`) | facts as counts (`2 attributes`), rows as `name value` |
| **wide chip**: name, facts line, attribute pills, a behaviour's signature row | name, facts, rows; no pills or signature row |
| **focus**: sub blocks, typed chips, a sub model banner (*Payment retry · 3 steps · Into*) | none |

### Seen in pass 1

| Seen | Notes |
|---|---|
| **the shop's stories use the catalogue's definitions** | Checkout and Charge a card hold uses of `services`' and Records' definitions, as the Shop does; the Shop's own parts were left as uses, since a definition extending a pattern loses the pattern's parts (structure never inherits) |
| **mndsite tells one model** | six of its seven entry paths are one step (each config calls `link`), so fold |
| **a step lists the block it reaches** | a path revisiting a block lists it again in the stack (mndsite's *page*, *mobile*) |
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


## Carried from code translation

- **the user's direction** (2026-11-02): a deterministic structure found from the graph, not agentic band-aids; no hard rules about what a block is; thresholds are defaults with floors; balance depth against the big picture; diagrams are visual information, never lists of parts; agents refine and narrate on top
- **the walk's refinements** (the user, 2026-11-05): the user likes *walk its path* on sequences and has refinements in mind; take them up under *Questions* 2–3
- **seen, not fixed** (design-plan.md *Open*): a lone use (*Shop*) loses its name to its box's heading line, which an overview diagram would show first
- the translator's rules are design.md *Translation*; its stages and settings apps/ts's README


## Commands

- **regenerate**: `npm run samples`; `npm run code` (this repo → `samples/code.json`); mndsite by hand: `cd apps/ts && npx vite-node src/main.ts ../../../mndsite ../../samples/mndsite`, then `npm run start -s -w @mnd/cli -- collect ../../samples/mndsite ../../samples/mndsite.json --workspace`; `check` each. `npm run base` after a base kind change, `npm run packages` after a `ts` kind change
- **measure**: `npm run start -s -w @mnd/cli -- measure ../../samples/<name>.json [layer]`; entered diagrams only, not the map
- **see it**: a Playwright script (Edge, `channel: "msedge"`) starting Vite from `apps/web/vite.config.ts`, routing `**/mndflow.yaml` to `workspace: /samples/<name>.json` (`tray: open`); pick or enter a node by id (`.react-flow__node[data-id="…"]`), never by text. In Git Bash set `MSYS_NO_PATHCONV=1`

