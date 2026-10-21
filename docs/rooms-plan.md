# Rooms plan

**One continuous world, read at two levels of detail.** The model is drawn once, as nested rooms, each laid out its own way; navigating moves a camera through it instead of swapping drawings. Agreed 2026-10-20 from the *Rooms in Context* mockup (claude.ai artifact `4c4FvxwrkZ7ryvDzxcYVay`). This is the refactor's own plan; next-plan.md row 0 points here. design.md states the goal; this plan says how to get there.


## Decided

| Topic | Decision |
|---|---|
| **room** | any block that holds blocks: a package, a folder, a diagram, a part such as *Payments*. One concept to navigate, list and edit |
| **one world** | the whole package is one drawing; every room draws inside its parent with its own layout (flow, sequence, layered, auto), so the room you open is the drawing you saw from outside |
| **two levels of detail** | **world view** (fit to the focus): how the bigger parts fit together, the canvas moving room to room. **Reading view** (100%): following a flow block by block, scrolling inside one room |
| **context** | what lies outside the focus stays in place, dimmed, or as rings round the focus's ancestors; no minimap |
| **room size** | a room hugs what it holds; rooms never grow to fill the canvas |
| **a room grows** | its neighbours make room: in an arranged parent they re-flow; in a free parent they are pushed right and down, never overlapped |
| **explorer** | rooms only; a room's blocks list in the tray's contents tab |
| **tray** | the overview previews the selected room's own drawing and offers *read*, narrowing the canvas to it |
| **groups and regions** | stay notation, drawn inside a room and never listed; either can be upgraded to a room. **A region is a camera stop**: the canvas may focus it, the crumbs end on it, the explorer never lists it |
| **editing** | works in every view; dragging a card into another room moves the real block there, never makes a reference |
| **re-use: one object** | a block shown in several rooms is **one object**: its home card and every stand-in for it light together, pick together and edit together. A stand-in wears a link mark and no name of its own; renaming, describing or retyping it changes the block. Moving or deleting a stand-in moves or deletes only that appearance. Class, entity and sequence rooms are made of stand-ins, so they edit through |
| **the library** | keeps its own tree and gets the same world: each package a room, definition folders rooms laid out as lists, registries (types, tags) treemap rooms, a definition holding parts a room of its structure; the same focus, zoom and flights |
| **the rail** | no view options. It is the palette — notation for the focus's family — and the quick way to edit the workspace and package information, create definition and usage blocks, and choose which relation types are drawn |
| **display** | frame, guides, ports, the key and the context mode (dim or rings) are **one workspace-wide setting**, on the tray's workspace tab, applying to every room and view alike; no per-layer key |
| **workspace tab** | laid out as every overview is: a drawing on the left (the world fitted), why, how and where on the right, then the display settings |


## Terms

| Term | Meaning |
|---|---|
| **room** | a block that holds blocks, drawn as a box with its title and walls; inside, its own layout |
| **world** | every room of a package composed into one drawing, laid out once per graph change |
| **focus** | the room (or region) the camera is on: the explorer's selection when it is a room, and the crumbs' end |
| **world view** | the camera fitted to the focus inside the margins, never above 100% |
| **reading view** | the camera at 100% on the focus, scrolling inside its walls; chips at the edges say how much is left |
| **context** | everything outside the focus: dimmed, or ancestors' outlines only (rings) |
| **stand-in** | a card standing for a block that lives in another room (a `reference`); with its home card, one object |
| **appearance** | any card of one object: its home card or a stand-in |


## What changes, by home

| Area | Today | Becomes | Home |
|---|---|---|---|
| layout | each layer laid out alone; a holding block is a card in its parent | a room is sized by its own laid-out drawing and placed in its parent at that size; composed bottom-up | views `block.ts` `project`, new `world.ts`; `arrange.ts`, `size.ts` |
| package view | `survey_graph` flattens every box into a page grid of small cards | the world itself; `survey_graph` and the package use of `page` retire | views `survey.ts`, `page.ts` |
| views as modes | `ViewKind` picks a whole drawing per layer | `lens_of` says how one room draws inside the world; the canvas has two camera modes | core `sections.ts`, `navigate.ts`; app `App.tsx` |
| view state | `View = { at, kind, layer, pick }` | `View = { at, focus, mode, pick }`, mode `world` or `read` | core `navigate.ts` |
| routing | stage routes each scene with libavoid (`routes_of` in `Flow.tsx`) | views route each room once, inside its walls, and compose the runs; the stage draws runs as given | views `avoid.ts`, `world.ts`; stage `Flow.tsx` |
| the room's frame | one `FRAME` node for the open layer | one room node per room, id `room:<block>`, carrying its title, walls and wall seats | views `scene.ts`; stage `nodes.tsx` |
| camera | per layer: scroll pages vs fitted rooms grown to the canvas (`panelled`) | one camera over the world: fit (world) or 100% clamped (read), flights between foci | stage `room.ts`, `arrays.ts` |
| context | none: the canvas draws the open layer only | dim or rings outside the focus; lines bright to the wall; wall seats naming the far end | stage `Flow.tsx`, `flow.css` |
| explorer | the `parent` tree, every block a row | rooms only | explorer `rows.ts` `tree_of` |
| tray | overview thumbnail via the app's `glance`; contents is the block's markdown over its bands | overview offers *read*; contents lists the room's blocks by region in reading order; workspace tab is an overview with the display settings | tray `Overview.tsx`, `Content.tsx`, `Workspace.tsx`, `state.ts` |
| rail | view, layer, display and relation groups | palette, workspace, make, relations | options `groups.ts`, `Options.tsx`; app `App.tsx` |
| re-use | a reference is its own card, picked and edited alone | one object: appearances light, pick and edit together | core `tree.ts` (`stands_for`, `of_ref`), `actions/blocks.ts`; app `App.tsx` (`lit`, pick); tray `Overview.tsx` |
| editing | creates in the open layer | creates in the room under the pointer; a drag across a wall is `move` | stage `Stage.tsx`, `drag.ts`; core `move` |
| groups and regions | notation only | notation, plus *turn into room* and *make room* | core `actions/groups.ts`; explorer `Menu.tsx` |


## Phases

| # | Work | Done when |
|---|---|---|
| 1 | **nested layout** | `world_of` composes any package: child rooms drawn inside their parents by their own layouts, sized by what they hold, routed inside their walls; the package view draws it in place of `survey_graph`; both samples compose without overlaps |
| 2 | **one canvas, one camera** | opening a room moves focus and camera, never re-lays out; crumbs and *up* follow the focus; flights everywhere |
| 3 | **two levels of detail** | world view fits the focus; *read* gives 100% scrolling inside the walls; context dims or rings; a region can be the focus |
| 4 | **explorer, tray, rail, display** | the explorer lists rooms only; the tray's contents lists the focus's blocks; *read* is on the overview; the workspace tab is an overview with the workspace-wide display settings; the rail is palette, workspace, make and relations |
| 5 | **one object** | every appearance of a block lights, picks and edits as one; a stand-in wears a link mark and its target's name |
| 6 | **editing in the world** | create lands in the room under the pointer; dragging across a wall moves the block; neighbours make room; *make room* and *turn into room* work |
| 7 | **the library** | the library's packages, folders and registries draw as one world with the same focus, zoom and flights |
| 8 | **scale** | rooms cached by subtree; only what is in view draws; far out, cards are chips and titles grow; the model sample stays smooth |
| 9 | **retire** | `survey_graph`, `panelled`, the scroll/room camera split, `routes_of` in the stage, the rail's view group, the `folder` and `package` view kinds and per-layer keys are gone; code-homes.md says the new homes |

Each phase lands working, is driven in Edge on both samples (model and elements) and is shown to the user before the next. No tests until the user calls the design settled (next-plan *Rules*).


## Implementation notes

### The world scene

The world is a `Scene` with every node in world coordinates, plus its rooms. Add to `scene.ts`:

```ts
/** A block that holds blocks, drawn as a box: its title, walls and the seats set into them. */
type Room = { id: Id; parent: Id | null; x: number; y: number; w: number; h: number;
              label: string; kind: ViewKind; depth: number; ports: readonly Port[];
              bands: readonly { id: Id; y: number; h: number; label: string }[] };
type World = Scene & { rooms: readonly Room[]; root: Id };
```

- a room's node id is `room:<block id>`; its cards keep their block ids, so a block has one card in its home room. A read-through part keeps its `part_id`, as today
- every `LineEdge` carries its run in `data.points` (already in `LineData`), routed per room, so the stage never routes
- `Scene.layer` and `Scene.frame` stay for the tray's previews (`glance`), which still project one room alone

### 1 — Nested layout

- **new `world.ts` in views**: `world_of(graph, root, config): World`. Bottom-up over the rooms under `root` (`children` that hold blocks, looked through folders, grids, groups and regions as composition already is)
- **one room**: project it alone with today's `project(graph, room, { room: true, ... })` minus its child rooms' insides: a child room is a card sized by its own composed extent. Keep that through a size override: `size_of` asks a `sized: Map<Id, Size>` handed in config before its own rules (`size.ts`)
- **extent**: the child's room frame after walls are opened and seats placed (`frame_of`, `open_wall` in `block.ts`), so ports sit on the wall the parent sees
- **layouts take any size**: `layered` (dagre) does; `auto`, bands and `page` flow standard cells and span as many as a unit needs (*auto and pages flow onto standard columns*, design.md) — check `bands.ts` and `pack.ts` with a room ten cells wide
- **compose**: translate each child's nodes, edges' points, perches and bands by the child card's position in its parent, then drop the child card in favour of the child room node
- **seats are shared**: a child's ports are seated once, from inside (its frame's walls). The parent pins them: hand the child's wall seats to the parent's `seat_all` as stated seats (`seat.ts` `stated`), so a line arriving from outside meets the same seat the inside line leaves from. The known *seats* issue (next-plan 1, a `side` without `at` dropped) must be fixed first
- **routing per room**: move `routes_of` (`avoid.ts`) from the stage into `world_of`, one call per room scene before composing; libavoid must be loaded before the first world (`load_avoid` already runs at app start)
- **diagram rooms**: `class_graph`, `sequence_scene` and `sheet_graph` already return a scene for one room; compose them like any room. Their cards are stand-ins (*one object*, phase 5)
- **faces**: a room draws as its room node; a block holding nothing keeps its small or large face (`face_of`). A room's own `layout.cards` still applies inside it
- **swap in**: the package branch of `unfitted` (`block.ts`) returns `world_of` instead of `survey_graph`; the folder branch already routes there. This makes phase 1 visible in the app with today's camera
- **check**: both samples, every room: no overlaps, every port on its wall, lines meeting seats from both sides; Overview, Shop, Payments, Checkout saga (wide) and Payment retry (tall) inside one drawing

### 2 — One canvas, one camera

- **view state**: `View` becomes `{ at, focus, mode, pick }` (`navigate.ts`); `open_at` sets `focus` to the opened room, or to the room a block sits in with the block picked; `leave_at` goes to the focus's parent room; `held_at` and the crumbs read the focus's room path. `lens_of` no longer picks a drawing; `world_of` asks it how each room draws
- **app**: `App.tsx` projects `world_of(graph, package root)` once per graph change (`useMemo` on `graph` and display), not per view; the scene no longer depends on the layer
- **stage**: a `RoomNode` in `nodes.tsx` draws a room (title tab, walls, wall seats, region bands), replacing the frame node; `Flow.tsx` draws edges from `data.points` and stops calling `routes_of`
- **camera**: `room.ts` keeps one owner of the viewport. On focus change: fly (zoom in log space, centre linearly, as the mockup's `fly`) to the world view of the focus. Retire `panelled` and the scroll/room split; React Flow's own fit stays off (`Flow.tsx`)
- **crumbs**: `Crumbs.tsx` reads the room path; *up* is `leave_at`
- **check**: open and leave across every room of the model sample; no re-layout, no jump, crumbs and explorer follow

### 3 — Two levels of detail

- **world view**: zoom `min((vw − 2·BAND)/w, (vh − 2·BAND)/h, 1)`, centred on the focus
- **reading view**: zoom 1; a focus wider or taller than the view starts at its top left plus the margin; wheel and drag pan, clamped to the focus's walls plus the margin (the mockup's `clampCam`). Edge chips (stage) say how much is left on each side
- **entering**: *read* on the tray's overview (phase 4) and Enter on a picked room set `mode: "read"`; Escape returns to `world`; opening another room keeps the mode
- **context**: a class on every node outside the focus (`out`) and on the focus's ancestors (`anc`), worked out in the stage from the world's room tree. `dim`: outside at about 20%, edges drawn twice — dimmed, and bright clipped to the focus's box (an SVG clip in the edge layer). `rings`: outside hidden but ancestors' outlines. Wall seats where a line leaves the focus carry the far end's name (`→ Card processor · charges`)
- **regions as camera stops**: a region's band (`Room.bands`) can be the focus: world view fits the band, reading view clamps to it, crumbs end on it, the explorer lights its room
- **far out**: below 60% zoom cards hide their words and room titles grow by `0.8 / zoom` (the mockup's `far` class)
- **check**: Payment retry and Checkout saga read at 100% with scrolling; world view of Shop fits; dim and rings both read

### 4 — Explorer, tray, rail, display

- **explorer**: `tree_of` (`rows.ts`) keeps a row only for a package, a folder, a grid and a block holding blocks; everything else lists in the tray. Selecting a room focuses it (world view); selecting is browsing, so the canvas follows only inside the open package, as today
- **tray contents**: `Content.tsx` lists the room's blocks in reading order (`laid`), grouped under their regions' headings, each row picking its card; the markdown body stays at the head
- **tray overview**: a *read* button beside *open*, acting `read` with the room's id
- **workspace tab**: `Workspace.tsx` laid out as `Overview.tsx` is: the world fitted on the left; why (name, description, tags), how (counts, packages), where (file, export) on the right; then a **display** band: frame, guides, ports, key, context (dim, rings). `useDisplay` (`state.ts`) holds them, workspace-wide; `App.tsx` drops the per-layer `keyed` legends
- **rail**: `Options` groups become `palette` (notation of the focus's family — flow: start, decision, end; state: start, end; every kind: note, label, group, region; dragged or clicked in), `workspace` (name, the open package's name and description), `make` (*new usage*, *new definition*, each a `create`, typed where a definition is picked), `relations` (the relation types drawn). The `view` and `display` groups go; `Scene.slots` names the new groups (spec.md)
- **check**: explorer shows only rooms on both samples; every former leaf row is reachable from the tray's contents

### 5 — One object

- **core**: `stands_for` (`tree.ts`) is the one way from an appearance to its block. `rename`, `describe`, `retype`, `write` and the tray's edits resolve a stand-in to its block before acting; `move` and `delete` act on the appearance itself
- **stand-ins wear no name**: a reference's own `name` is dropped on read (`shown_name` already shows the target's where unnamed); the corner shows the link mark. No legacy migration: re-save the samples (*No legacy migrations*)
- **lit together**: `App.tsx` `lit` and the stage's pick light every appearance of the picked block: the block itself and every reference whose `of_ref` is it (a core helper, `appearances_of`, in `tree.ts` beside `stands_for`); the tray's overview *where it lives* lists every appearance, each a jump
- **check**: rename a lifeline in Checkout saga and see Gateway renamed in Shop; pick Payments and see its lifeline lit

### 6 — Editing in the world

- **create** (`Stage.tsx`, right-click on ground): the parent is the innermost room under the pointer (`world.rooms`), never the open layer; in a free room at the pointer, in an arranged one at the end of reading order
- **move**: a card dropped inside another room's walls acts `move` with that room as `parent` and the drop as `spot` (`drag.ts`, `App.tsx` `onDrop`); a stand-in moves only itself. Never `refer`
- **neighbours make room**: an arranged parent re-flows on recomposition, which happens anyway. A free parent: after recomposing, push any sibling overlapping a grown room right and down by the overlap, snapped to units, as part of `world_of` (drawn, never stored) until the user moves it
- **make room**: new core action `room` (`actions/groups.ts`): a block in the selection's room, the selection moved into it with their relations; the canvas menu and Ctrl+Shift+G offer it
- **turn into room**: a group's or region's menu acts `retype` to `block`; its members already hold by `parent`, so nothing else moves. `retype`'s check must allow notation → block
- **check**: drag Inventory into Payments and back; make a room from Gateway and Storefront; turn the *Back office* region into a room

### 7 — The library

- `world_of` over a package's definitions tree: folders as rooms laid out `rows`, definitions as cards, a definition holding parts a room of its structure, *types* and *tags* registries as treemap rooms (`registry_scene`)
- the library section's explorer lists rooms as the model's does; opening a definition focuses its room
- **check**: base and the model package read and navigate like the model

### 8 — Scale

- cache each room's composed scene by its block id and a version: the graph's step count is enough at first; then the subtree's latest step, so an edit recomposes only the path to it
- draw only nodes whose boxes meet the viewport plus a margin (React Flow `onlyRenderVisibleElements`), plus every room box on the focus path
- **check**: a synthetic package of 2 000 blocks pans and flies without stutter

### 9 — Retire

- delete `survey.ts`'s package use, `panelled`, the `folder` and `package` view kinds, the stage's `routes_of` call and the rail's view group; update code-homes.md, views.md, block.md and options.md to say only what is left


## Pitfalls

| Pitfall | What to do |
|---|---|
| a seat placed twice, once from each side | seat inside first; pin it for the parent (phase 1) |
| node ids colliding across rooms | rooms are `room:<id>`; cards keep block ids; read-through parts keep `part_id` |
| two `FRAME`s | the open layer's frame is gone from the world; previews keep `FRAME` |
| React Flow fitting on its own | `fitView` stays off; the camera owns the viewport |
| a room's `layout` saying `page` | allowed: a folder's room flows rows; only the package-level `page` use retires |
| libavoid not loaded | `routes_of` already falls back to `route`; compose with those runs and re-route when it loads |


## Hand-off

| | |
|---|---|
| **state** | uncommitted on `expand-diagram-types` (see next-plan *Status*); this plan and the goal docs (design.md, definitions.md, tray.md, explorer.md, options.md, views.md, block.md, actions.md, schema.md, spec.md) updated 2026-10-20 |
| **start** | read design.md *Perspectives* and *Navigation*, then this plan; open the mockup to see the target; begin phase 1 with the *seats* fix from next-plan step 1 |
| **samples** | `samples/model` (the shop: Overview › Shop › Payments › Payment retry is the deep path; Checkout saga the wide room) and `samples/elements` (every kind, notation, a long name). `npm run samples` re-collects both |
| **drive** | the `vitest` skill: `npm run dev`, Playwright on installed Edge from the scratchpad; the explorer's rows are `.explorer .tree li .label`, crumbs `.crumbs button`, the viewport `.stage .react-flow__viewport` |
| **verify** | `npm run typecheck`, `npx vitest run` (285 today), `npm run lint:css`, and `check` and `review` clean on `samples/model.json` and `samples/elements.json` |
| **rules** | user's: never commit (suggest a message), docs are the goal and are updated as work lands, no tests until settled, one rule one home, search for a package before writing one |
