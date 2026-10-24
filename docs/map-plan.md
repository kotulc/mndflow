# Map plan

**The model and the library read as one map; a block is entered from it.** The map is a treemap of the side the explorer lists: what holds things as boxes, what is entered as chips, each chip as large as what it holds, wearing its kind's icon, its counts and what it holds, **divided by the structure of its diagram**. Entering a chip flies into it and hands over to its own view, alone. **An entered view is laid out automatically, adapting to a portrait or a landscape canvas; a layer with regions is banded.** Built 2026-10-23, uncommitted. next-plan.md row 0 points here; design.md (*Perspectives*) and definitions.md state the goal.


## How we got here

| Date | Tried | Verdict |
|---|---|---|
| 2026-10-21 | open by scale: rooms scaled into slots, opened as the camera neared | zoom fought the camera; rooms looked different at every zoom |
| 2026-10-22 | one nested drawing: every room inside its parent at 100%, regions docked, isolate on one camera | worked once fixed (packing, docks, rows even, side-dock spans) but left blank space between fixed-size rooms; the whole package unreadable when fitted |
| 2026-10-22 | the model as a treemap of rooms, each tile drawing its room small | barely changed the look: tiles sized by drawn area, pictures letterboxed in their tiles |
| 2026-10-22 | slot aims: each room laid again toward its treemap slot | no gain: ELK packs the reshaped rooms where it likes |
| **2026-10-23** | **the map of chips**: rooms dropped; a treemap of chips sized by what they hold; one view entered at a time | built — the user's call: "move away from the room idea" |
| 2026-10-23 | a diagram chip's "stamp": its drawing laid out by dagre and fitted into the chip, a diagram's own chip a band across its box | rejected: a free layout letterboxes in a weight-sized cell, the band reshaped the map — "a ton of wasted space" |
| 2026-10-23 | the inner treemap kept, tiles spaced, lines centre to centre | rejected: lines at slants, tiles not reading as blocks, diagrams not standing apart |
| **2026-10-23** | **structured chips**: the inner treemap divided by the diagram's own structure — groups nest, grids split into rows and columns sized by contents — tiles as cards | built; the user's direction: chips illustrate the blocks a diagram holds and their spatial relations, never reproduce the diagram |
| 2026-10-23 | a grid chip's weight counted its header blocks | fixed: headers never draw on the map, so they never weigh |
| 2026-10-23 | a grid chip shaped wide by a search over squarify ratios | no change: squarify's strips follow the box's shape; replaced by choosing each split's direction (`tiled`) |
| **2026-10-23** | **a grid read from a placement**: a diagram chip's tiles ranked by dagre, read as rows and columns (`gridding.ts`) | built; the user then asked to rethink flow structure first, and to drop lines from the map |
| 2026-10-23 | regions mocked four ways (lanes, stages, docks, tiles) | the user's call: lanes or stages, picked by the canvas's shape; docks dropped |
| **2026-10-23** | **banded regions**: one ELK layered run per layer, each region a partition in order | built; columns on a landscape canvas, rows on a portrait one |
| 2026-10-23 | chip laydowns mocked (the *Chip Laydowns* artifact): a free layout read as a grid, layer slots, a spine and its branches, wrapped rows; every kind drawn as its view and its chip | the user's picks: layer slots, the chip turned to fit its cell, gutter rhythm, band tints, port notches, subtle marks; no dotted ground |
| **2026-10-23** | **layer slots**: a diagram chip's blocks in the layers dagre ranks them into, read on the flow's axis only, each layer split across in order; grids filled by row under plain header strips | built |
| 2026-10-24 | boxes split toward the shape their grid chips want (`tiled`) | removed, the user's call: cells came out very wide; every box squarified as before |
| 2026-10-24 | diagram chips as raised cards on the canvas's ground, holders with a stacked edge, tinted frames | replaced, the user's call: the library's look reads better; diagram chips drawn as library chips, edged in their colour, their kind shown by what is drawn inside |


## Decided

| Topic | Decision |
|---|---|
| **one map, two sides** | the model and the library are drawn by one builder (views `map.ts` `mapped`); only the tree and the weights differ. The map follows the explorer's tree, so a pick in one is the same block in the other |
| **the model stops at diagrams** | a package, folders and regions are boxes; a diagram is a chip; a diagram holding diagrams is a box of **one cell for each block it holds** — a sub-diagram its chip, a plain block its own chip, never pooled. **A reference never makes a box**: it is a tile in its diagram's chip. A group's or a region's chip is laid by its structure, as a diagram's. A block with nothing below it that draws is a chip too |
| **the library is as shallow** | packages and folders as boxes; each definition a chip as large as its uses, edged in its own colour, its parts its inner treemap. Its registry is entered and read in the tray, not drawn on the map |
| **a chip's size** | the model: its blocks, the lines among them and their interfaces, never a grid's headers (`counted`); the library: its uses |
| **a box's tiling** | squarified a little wide, every box alike: no box is split toward the shape a chip would rather have |
| **the map fills** | nothing is fitted into a cell: a chip's inside is the treemap's own tiles, divided only by structure that partitions the cell |
| **a chip's face** | its kind's icon and name and what it counts in words over its inner tiles |
| **a diagram chip** | **drawn as a library chip is**: the chip's own ground, its blocks flat tiles with their kind's icon, no stacked edge, a group a tinted panel round its members, no rim; what kind it is shows in its edge's colour and how its inside is drawn. **No lines on the map.** Its tiles are **layer slots**: dagre ranks its blocks, read on the flow's axis only, each layer split across in order, every tile as large as it counts — no empty cells. The flow runs whichever way sets its tiles nearest a card's shape, **turned to fit the cell** (`layered`). Blocks no line joins wrap in order |
| **regions in a chip** | a region holding diagrams is a map box; a region of plain blocks is a tinted band in its diagram's chip, every other one lighter, in the entered view's order: those lines meet, then those none do, the loose blocks first (`laid`) |
| **marks and interfaces** | a flow's start, end and decision keep a card's shape: a faint tint and a small glyph, a dot, a ring, a diamond by its name; a start or an end weighs half a block. A diagram's interfaces are notches on its chip's edge, in where its flow enters, out where it leaves (`notches`) |
| **a flow's line** (trial) | any chip its lines rank into layers runs between a **start strip and an end strip**, one quiet bar across each end of its flow, as a grid's headers are, its blocks a gap within them; a faint line down its middle, behind its blocks, from the start strip to an arrow whose tip meets the end strip (`inner`; laid again within the strips the same way, `way`); kept or dropped once seen on the map |
| **class and entity cards** | the name over a clear rule, then the body in thirds by two subtle rules: across for a class, down for an entity |
| **a diagram stands apart** | a box holding a diagram's chip has the same clear space round its chips, between them and below its title: 6% of the box's smaller side, from 6 to 16 (`air`); its blocks a little more air inside (`PAD`); no tints. Only a plain block's chip and a library definition wear their colour on their edge. A sequence's lifelines are highlighted in the accent, as marks are; a swimlane's rules and every header strip are quiet. **Every space in a diagram chip is one gap** (`GAP`): between layers, between what sits in a layer, between a grid's rows and columns; halved round what a group, a band or a cell holds. **One fixed gap for the whole map** (16), so every chip and every arrow alike, wide enough to read zoomed out; a grid's header strips sit closer to their blocks (`HUG`) |
| **a grid chip** | **filled by row**: rows and columns sized by what sits in them, an empty one thin; in each row a block widens to the column line halfway to its neighbour. **Header strips**, never labelled: one quiet strip over each column, and beside each row where it has no lifelines, close by its blocks (`HUG`). A sequence has a faint lifeline down each column behind its blocks; a swimlane a quiet rule between rows; both the one gap between rows (`gridded`) |
| **structure, kind by kind** | a chip illustrates its kind with a minimal, unlabelled hint of its own — lifelines, header strips, compartments — never its drawing |
| **left off the map** | notes, labels and relations: they count in a chip's size. |
| **navigation** | a click on a chip or a box selects it and the camera flies to it; the explorer and the arrow keys do the same. Enter, the explorer's open or the tray's *read* enters. **A double-click enters the nearest diagram**: a block that opens on a view is entered; anything else — a region, a plain block, a tile in a chip — enters the diagram holding it, picked there (`entry_of`). Escape returns. The wheel only zooms |
| **what lights** | on a map, only what is picked: a chip, a box, or a tile in a chip. A click on a tile picks its block, read in the tray, without moving the camera; two enter its chip. No focus mark, no other appearances, nothing a selection touches; React Flow's own selection is off on a map (`elementsSelectable`) |
| **framing** | a package, or no focus, frames the whole map; anything deeper is flown to (`stop_area`) |
| **entering** | the camera flies into the entered chip (`area_of`) and holds there until the entered layer is laid out, then cuts to it and fades in (200ms). Leaving cuts back to the chip and flies out |
| **what stays entered** | the entered block and anything inside it; opening anything above it (a crumb, the explorer, up) returns to the map (App `entry`) |
| **every layer change cuts** | a change of layer, or of map and layer, cuts and fades; nothing slides across it. An edit within one layer slides what moves |
| **while ELK works** | the last drawing stays, read only, until the next layer answers — no blank frame |
| **the entered view** | one layer alone, placed by ELK and projected by its kind (views `layer.ts`), editable as any layer. A diagram it holds is a card, entered in turn by a double-click |
| **nothing by hand** | every layout is automatic and adapts to a portrait or a landscape canvas; nothing a user places by hand |
| **regions are bands** | a layer with regions is one layered run, each region an ordered band: columns where the flow runs across, rows where it runs down, whichever fits the canvas. Regions never nest. A region no line meets goes after those lines meet unless an `order` is stated. Drawn as its name over a rule, a unit apart; picked, the whole band. Docks are gone |
| **groups are tags** | a group holds nothing: a block joins one by carrying its name as a tag, once per group it is in, so groups nest by membership. Layout keeps a group's members together. Ordinary tags stay labels |
| **order is editable** | an explicit `order` wins over file order; the tray's earlier and later write it, as will dragging a region before or after another along its axis, and a sequence's steps |
| **sequence is a grid** | a sequence opens on the grid element as a swimlane does (`layout.view: allocation`), with `holder.lifelines`: its steps cards in their cells, a dashed lifeline straight down each column behind them, its messages straight across at the row they reach with their names level (views `lifelines.ts`). The separate sequence projection is gone |
| **lines are lines** | anything drawn as a line — a lifeline included — is a scene edge or a rule sized by `--zoom`, never a plain 1px CSS border, so it draws at every zoom |
| **a map is read only** | nothing is made, moved or related on a map; editing is in an entered view |


## Placement in an entered view

What `flow.ts` does for one layer.

| Step | |
|---|---|
| **containers** | each group and folder laid out on its own, inside out: `layered` where lines join what it holds (both directions tried), packed toward the canvas's shape where none do |
| **bands** | a layer with regions (`banded`): its loose blocks and each region's members in one ELK layered run, each region a partition in order, lines running the way they point. Across (regions as columns) and down (as rows) both tried; the one nearer the canvas's shape kept |
| **lineless regions** | a region no line meets goes after those lines meet and is packed whole as one unit: toward a column's height, or a row's width, then packed again toward the room the first run made |
| **loose blocks** | a block in no region sits in the band of what its lines reach, else before the first band |
| **the bands** | each band spans the layer across the flow, a unit from the next; across, the names take a row above them all; down, each band's name sits above its run |
| **lines** | inside a container by ELK; across the layer routed live by libavoid (`Flow.tsx` `routes_of`); a line with points of its own (a sequence message, a lifeline) is drawn as given |


## Next

| # | Work | Done when |
|---|---|---|
| 1 | **groups are tags**: a group holds nothing; a block tagged with its name is a member; layout keeps members together; the panel drawn round them (*Steps* 1a–1h) | Deployment and Shop drawn with tag groups, both canvas shapes, agreed with the user |
| 2 | **an explicit `order`** (*Steps* 2a–2c) | the tray reorders a region and the band moves, surviving a reload |
| 3 | **drag to reorder** a region along its axis, and a sequence's steps (*Steps* 3a–3b) | dragged in the app |
| 4 | **lines across trailing bands**: lines to the layer's wall cross a band that comes after them | decide with the user once regions settle |
| 5 | **hierarchical flow**: ELK `hierarchyHandling: INCLUDE_CHILDREN`, so lines into a group shape the whole layout, as Mermaid's nested flowcharts do | a design agreed with the user first |
| 7 | **slivers**: a chip that holds little comes out a thin sliver; a chip's head takes height its weight never counted. With the one fixed gap, a short grid chip's rows go to slivers too (Fulfilment): weigh a grid chip by its rows as well as its blocks | every chip shows at least its icon; every grid row its label |
| 8 | **a box of one**: a box holding a single chip repeats its name (Data › Model › Model) | decide with the user: fold it into the chip, or keep the tree exact |
| 9 | **text at zoom**: chips' names grow with the zoom when a selection flies close | decide: chip heads a fixed size on screen, or selection flying less close |
| 10 | **the library's entry**: a leaf definition (*service*) or a relation (*line*) enters nothing; its registry is read in the tray | decide with the user: should such a chip enter its registry view instead |
| 11 | **the sequence header**: participants are the grid's header strips now, not the taller standalone cards the old view drew | the user says which |
| 12 | **leftover scale**: `data.scale` and stage `scaled` serve only registry tiles; `Frame.scale` is gone | each kept only where a registry needs it |
| 13 | **dead code**: `holds_any`, `said_of`, `package_named`, `default_id`, `constraints_of`, `has_library`, `end_id`, `awaits_seat`, `on_grid`, `in_rows`, `seat_at`, `type_chips` are called nowhere; core and views `index.ts` re-export with `export *` | each removed or named in its index |
| 14 | **the kit and the CLI**: the kit's viewer and the CLI still place by the synchronous fallback | they draw a layer with `layer_scene`, or the map, as the app does |
| 15 | **the flow line**: a trial — start and end strips, a line between them, one arrow | the user keeps it or drops it |
| 16 | **a colour per diagram kind**: every diagram kind's colour is the theme's one accent, so a flow and a sequence look alike; families elsewhere have their own | decide with the user: a palette for the base diagram definitions |
| 17 | **ports both ways**: an interface carrying both ways, or saying nothing, gets no notch; grid chips get none | decide with the user where they sit |
| 18 | **bands in a chip**: a region of plain blocks is a tinted band in its diagram's chip, never yet seen — no sample has one (Shop's regions hold diagrams, so they are boxes) | a region of plain blocks in the elements sample, looked at |
| 19 | **the line through groups**: a group's panel is translucent, so the flow line shows through it (*eu-west cluster*) | decide: stop the line at panels, or make panels solid |
| 20 | **lines read from dagre**: a chip's layers come from dagre, synchronously; its entered view is ELK's, so they may differ | decide whether the map should wait for ELK |


## Steps

How *Next* 1–3 break down. Each step ends verified: typecheck, tests, both samples `check` clean, Shop and Deployment driven landscape and portrait.

### 1 · Groups are tags

| # | Step | Where |
|---|---|---|
| 1a | **membership**: a block's members are those on its layer whose tags name it (`members_of`, `group_of`); a group holds nothing. One home for the question, asked everywhere `parent` was | core `holders.ts`, `library.ts` (`tags_of`) |
| 1b | **the door**: a YAML `tags:` entry naming a group on the layer resolves to it; a group's `blocks:` list is gone — restated as tags on its members. No old-format repair (re-run `scripts/showcase.mjs`, re-save samples) | core `diagram.ts`, `sources.ts`, `check` |
| 1c | **actions**: `group` adds the group and tags the selection; `unmember` drops the tag; `room` moves a group's members in and drops its tag | core `actions/groups.ts`, `helpers.ts`; actions.md already says so |
| 1d | **the holder kinds**: `inline` leaves `holder`; `is_box`, `inline`, `drawn_in` stop treating a group as holding; the base `group` definition loses *is group*'s holding | core `components.ts`, `holders.ts`, defs base |
| 1e | **placement**: members kept together — each group an ELK compound of its members inside its band (nested groups nested compounds, by membership), the rest placed round them | views `flow.ts` (`spec_of`, `banded`) |
| 1f | **drawing**: the group's panel round its members' bounds plus a gap, its name on it; no rim | views `layer.ts`/`scene.ts`, stage `groups.css` |
| 1g | **explorer, tray, map**: no group heads its members in the explorer; the tray shows a block's groups among its tags; `map.ts` `listed` reads membership by tag | explorer `rows.ts`, tray `Overview.tsx`, views `map.ts` |
| 1h | **samples**: Deployment's cluster and namespaces as tags (each pod tagged with its namespace and the cluster); Back office's *fulfilment* group over Inventory and Shipping; the elements sample's groups | `samples/model`, `samples/elements`, `scripts/showcase.mjs` |

### 2 · An explicit order

| # | Step | Where |
|---|---|---|
| 2a | **the key**: a block's `order:` read into the graph as stated (kept apart from file position) and written back only when stated | core `types.ts`, `diagram.ts`, `card.ts` (`BLOCK_KEYS`), the writer |
| 2b | **the tray**: *earlier* and *later* state `order` on the moved block and its siblings, rather than moving it in the file | tray `Overview.tsx` `Place`, core action |
| 2c | **bands**: sorted by stated `order`, then the lineless-last default, then file order | views `flow.ts` `banded` |

### 3 · Drag to reorder

| # | Step | Where |
|---|---|---|
| 3a | **a region dragged by its name** before or after another along its band's axis (left/right as columns, up/down as rows) states the new order; a drop line shows where it lands | stage `drag.ts`, `moves.ts`, `groups.css` |
| 3b | **a sequence's steps** dragged the same way along their column | stage `arrays.ts` |


## Pitfalls

| Pitfall | What to do |
|---|---|
| fitting a layout into a cell | it letterboxes and wastes the map's space — rejected four times. Divide the cell by structure, or leave the layout to the entered view |
| scaling space per chip | a gap or margin as a share of each chip's size makes chips differ from each other (short chips tight, tall ones loose, arrows of every size) — rejected 2026-10-24. One fixed gap for the whole map |
| shrinking a chip in its cell | a margin per chip doubles between neighbours and halves at a box's edge; pad the box instead (`air`), the same round and between |
| React Flow picks on a map | its own click selection picks the whole chip node and syncs back over a tile's pick: `elementsSelectable` is off on a map, whose clicks pick for themselves |
| laying a chip twice | a second pass inside the start and end strips may turn the flow; pass the first's way (`way`) |
| tiles and lines | a 1px rule at a fractional place falls between pixels when zoomed out: size it `calc(1px / var(--zoom))` (`--hair`) |
| a heredoc with quotes | Python with quotes inside a bash heredoc trips the shell: write the script to the scratchpad with the Write tool and run it |
| a line drawn in CSS | a 1px border falls under a pixel when the canvas zooms out and vanishes: draw lines as scene edges, or size the rule by `--zoom` (a region's rule) |
| a border under 1px on a map | walls and edges are inset shadows sized by `--zoom` |
| ELK is asynchronous | an entered layer is a promise: the app keeps the last drawing until the next resolves, read only (`waiting` in App) |
| ELK writes into its input | tries run side by side: each its own copy of children and edges (`flow.ts`) |
| ELK's `MODEL_ORDER` cycle breaking | it turns back every line pointing against file order, not only loops; bands use `GREEDY` so lines run the way they point |
| the camera's key | `useFocus` flies only when its key changes: the stop's scale is in it, so selecting and entering the same chip both fly; `realm_of` includes the layer, so every layer change cuts |
| a centred face | `data-align="center"` centres a group's title with a transform; a region's title undoes it |
| a new setting | the door drops a setting key no component declares ("which nothing reads"): add it to its component in core `components.ts` |
| a changed base definition | edit the file under `packages/defs/src/base/`, then `npm run base` rebuilds `base.json` |
| your own server | the user keeps dev servers on 5173 and 5174; start another and read its port. Deleting a module while a server runs can leave its page stale until a reload |
| driving the app | toolbar buttons sit near the canvas controls — a stray click makes a block (only in the driver's fresh browser). Zoom with the wheel; enter a box-diagram by clicking its title and pressing Enter; a portrait viewport tries the other orientation |
| editing files from scripts | Python on Windows reads cp1252 unless told: open with `encoding='utf-8'` and keep the file's own line ends; several sources are CRLF. Long replacements go in a script file: a heredoc can trip the shell |
| a closed set outside core | `test/law.test.ts` refuses an exported array of string literals outside core: keep such a list private and export a question about it (`laid_ahead`) |
| Git Bash and paths | prefix env vars holding paths with `MSYS_NO_PATHCONV=1` |
| vitest | run from `C:\…`: a lowercase `c:\…` shell breaks the happy-dom globs; in PowerShell call `npx.cmd` |


## Hand-off

| | |
|---|---|
| **state** | all uncommitted on `expand-diagram-types`, on everything since 3dfb1b5: the map of chips, banded regions, docks removed, and (2026-10-24) **chip laydowns**: layer slots read from dagre on one axis, turned to fit the cell; row-filled grids under quiet header strips, lifelines, rules; marks, notches, class and entity rules; the library's look; one fixed gap; one cell per block, references as tiles; tile picks and double-click to the nearest diagram; only the pick lights; the flow line between start and end strips (trial). The mockups are the *Chip Laydowns* artifact. Typecheck clean, 276/276 tests, CSS lint, `check` clean on both samples; the model map driven in Edge, landscape and portrait, picks and double-clicks driven |
| **commit** | suggested: *Map chips: layer slots fit to the cell, row-filled grids, marks and notches; one gap; one cell per block, references as tiles; tile picks, double-click to the nearest diagram, only the pick lights; flow line trial* |
| **start** | the user's open calls first — *Next* 15 (keep the flow line?), 7 (grid rows as slivers), 16 (a colour per diagram kind); then *Steps* 1a — groups as tags, agreed 2026-10-23; show Deployment and Shop after 1e–1h before 2 |
| **homes** | views `map.ts` (the map: `model_map`, `mapped`, `air`; a chip's inside: `inner`, `laid`, `layered`, `tile`, `gridded`, `notches`, `ranks`; the numbers `AIR`, `PAD`, `GAP`, `HUG`, `STRIP`; navigation `map_focus`, `area_of`, `stop_area`, `entry_of`), `lifelines.ts`, `layer.ts` (an entered view), `flow.ts` (placement, `banded`); core `holders.ts` (`has_lifelines`), `components.ts` (`holder` keys); stage `nodes.tsx` (`MapBox`, `ChipNode` and its `data-tile`), `Stage.tsx` (a map's clicks, `tile_rules`), `Flow.tsx` (`elementsSelectable`, `cut`, `fresh`), `flow.css` (the map's look: chips, tiles, strips, lines, arrow), `groups.css` (a region's band), `room.ts` (camera, `realm_of`); tray `Overview.tsx` `Place` (order); web `App.tsx` (`map`, `entry`, `waiting`, `enter`, `leave`) |
| **drive** | the `vitest` skill: `npm run dev`, read the port from the log, Playwright on installed Edge from the scratchpad; screenshot a chip or a box by its name (`.mnd-chip-name`, `.mnd-box-name`) at a device scale of 3 to see its inside; the elements sample opens by routing `/mndflow.yaml` to one naming `/samples/elements.json`; the library by clicking *library* in the explorer. For a transition, a CDP screencast or a per-frame read of `.react-flow__viewport`; screenshots are too slow |
| **verify** | `npm run typecheck`, `npx vitest run` (from `C:\`), `npm run lint:css`, `npm run start -s -w @mnd/cli -- check ../../samples/model.json` and the same for `elements.json` |
| **rules** | the user's: never commit (suggest a message); docs are the goal and are updated as work lands; no new tests until settled; one rule one home; search for a package before writing one; ask before changing a design rule; as few user choices as possible; nothing by hand; look at what is drawn, at more than one zoom and both canvas shapes, before calling it done |
