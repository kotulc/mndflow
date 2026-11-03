# Entry paths plan

**An entry point's paths through the system, drawn three ways: as its own diagram, lit on its package's diagram when it is hovered or picked, and traced across the map, step by step through its sequence.** Taken up 2026-11-02 from translate-plan.md (*Directions* rows 11–12). The user: "take your time getting it right; if we need to enhance routing to make it work so be it."

## Next session

**Start here: the user reads the traced paths on the map** (stage 7, built 2026-11-02, *Built* third table). The user leads by visual inspection; no tests while the design moves.

- **open, for the user**: paths stay inside one package, as the translator records calls only within a package (translate-plan `calls_of`); crossing packages is the next step for a system-wide story · whether several paths show at once · a step-through (next and previous) on top of the numbers · the class diagram of a package's own types sits loose below its bands · a note's tie still runs straight across the shop diagram
- **map leftovers**: an entry-points band of few, light chips is still a narrow column (tray, views); registries and the where-picture keep their own treemaps (`tiled`, `compact`), not yet the map's layout
- **uncommitted** (2026-11-02): stage 7 and the map's one layout (translate-plan *Next session*). Suggested message: `Trace entry paths on the map; one map layout for treemap diagrams`. `samples/code*` and `samples/mndsite*` are generated and gitignored
- **regenerate**: `npm run code` (this repo → `samples/code.json`); mndsite by hand: `cd apps/ts && npx vite-node src/main.ts ../../../mndsite ../../samples/mndsite`, then `npm run start -s -w @mnd/cli -- collect ../../samples/mndsite ../../samples/mndsite.json --workspace`; `check` each. `npm run packages` after any `ts` kind change
- **measure**: `npm run start -s -w @mnd/cli -- measure ../../samples/<name>.json [layer]`; a layer named prints what each count found. It measures entered diagrams only; the map has no lines yet
- **see it**: a Playwright script (Edge, `channel: "msedge"`) starting Vite from `apps/web/vite.config.ts`, routing `**/mndflow.yaml` to `workspace: /samples/<name>.json` (`tray: open`); enter a layer by double-clicking its node by id (`.react-flow__node[data-id="…"]`) near its title, never by text, which matches chips inside; hover or pick by id too. Run from the repo root; in Git Bash set `MSYS_NO_PATHCONV=1`. A working copy was in the session scratchpad (`see.mjs`); rewrite it if gone

## Goal

| # | Want | Why |
|---|---|---|
| 1 | **each entry point shows its flow**: how data moves from it through the primary parts | the major paths are the first thing a person should read |
| 2 | **hover or pick lights that entry's paths**, traced across the map and lit on the package diagram, unique per entry | one diagram serves every entry without drawing every path at once |
| 3 | **lines never hide cards or their words** | a lit path is useless if it runs over the cards it explains (*No overlap*: check fit and two zooms, map and diagram) |
| 4 | **space between major parts** | the gaps carry the lines; more between major parts than inside one |

## Decided

| # | Question | Decision |
|---|---|---|
| 1 | **diagram, hover or both** | both (2026-11-02): an entry's own diagram for detail; its paths lit for the overview |
| 2 | **routing may change** | yes, whatever it takes for *Goal* rows 3–4 |
| 3 | **an entry's diagram** | a `sequence` (2026-11-02): order matters for a path |
| 4 | **hover and pick** | the rest of the diagram dims; the path's lines and the components it includes light, the entry itself too |
| 5 | **order** | spacing and emphasis first (built), then the measure, the paths, then routing |
| 6 | **major parts** | a model's parts, looked through folders and bands, are major; never chosen per project. Gaps are fixed values by rank, never scaled per chip |
| 7 | **where a path is traced** | **on the map** (2026-11-02, the user): "we trace the path from each entry point through its sequence on the map". The entered diagram's lighting (stage 4) stays; the map is where a person first reads the paths |
| 8 | **how a traced path reads** | numbered legs (2026-11-02, the user): hover shows, a pick holds; each block on it numbered where the path first reaches it; calls on hover of a leg; one path at a time |

## Stages

**An entry's flow is a behaviour it owns** (design.md *A behaviour is a block's method*): a `sequence` whose lifelines are references to the components it reaches, its messages the calls between them in order. Nothing new in the model.

### 1. Overlap measure

**What a person sees as broken, counted.** A pure function over a routed scene, printed per layer.

| Count | Meaning |
|---|---|
| **crossings** | a line's leg passing through a card it does not end on |
| **covered names** | a line's name box over a card, a card's head, or another name |
| **shared runs** | two lines' legs overlapping along the same run, not a shared trunk from one anchor |
| **tight gaps** | a gap between two cards narrower than the lines it carries need (seat spacing `SEAT` each) |

- **where**: views, a new `measure.ts` beside `scene.ts`; input a `Scene` and its runs from `routes_of` (views `avoid.ts`), names placed as the stage places them (find the name placement in stage `Wire.tsx` and `routes.css`; move its geometry into views if it lives only in stage, one home)
- **the scene**: the app lays out with views `layer_scene` (`layer.ts`, async, ELK, then libavoid via `load_avoid(wasm)`); the CLI's `outline`/`project` uses the sync `project` (`block.ts`), which does not route. The measure must use the app's path: `layer_scene`, ELK on the thread (`flow.ts` falls back to it), libavoid loaded from its wasm in `node_modules/libavoid-js`
- **CLI**: a verb or flag (`mnd measure <file> [layer]`, or `outline --measure`), at two canvas shapes (landscape and portrait, `SHAPE` in views `size.ts`); prints one row per layer, worst first
- **baseline**: run over `samples/example.json`, `samples/code.json`, `samples/mndsite.json`; record the numbers in *Built*. Core's package diagram and its `session` component are the known bad cases

### 2. Call graph

**From each entry module, the calls that reach other components, in source order.** apps/ts.

- `read.ts`: per module, its **calls**: each `CallExpression` and `NewExpression` (and JSX elements, `JsxOpeningElement`/`JsxSelfClosingElement`, for React) whose callee resolves (`getSymbol`, through `getAliasedSymbol` as `declared_in` does) to a declaration in another scoped module. Record `{ from: enclosing function name or "(top)", to: module path, name, at: position }`. Add `calls: Call[]` to `Mod`
- `structure.ts`: `paths_of(shape)`: for each entry module, walk calls depth-first in source order: entry → the module called → its own calls, never revisiting a module, stopping at a **shared** (foundation) module, which is a step but never walked. Fold each module to its component (`Comp.modules`); merge consecutive steps in one component; drop a step to the component already current
- **bounds, defaults with floors** (*No hard rules*): at most 12 steps a path (`SETTINGS.steps`), at least the first call out of the entry; depth 4 (`SETTINGS.reach`); an entry calling nothing outside its component has no path
- the report (`report.ts`) prints each entry's path as `entry → comp (names) → comp …`, so it is judged before anything is written

### 3. The entry's sequence

**Written as a `sequence` owned by its entry block.** apps/ts `write.ts`. The form is the example shop's `samples/example/overview/shop/how-it-runs/1-checkout-saga.yaml`:

```yaml
name: checkout path            # "<entry> path"
type: sequence
cols:                          # lifelines: references to the components on the package layer
  - { name: index, type: reference, of: "code.packages.core.entry points.index" }
  - { name: session, type: reference, of: "code.packages.core.components.session" }
rows: [ { name: "1" }, { name: "2" } ]
blocks:
  - { name: open, cell: [ "1", index ] }
  - { name: load, cell: [ "2", session ] }
relations:
  - message:
      - { "open -> load": "load_workspace" }   # named by what is called; map form inside a list
```

- **where it lives**: a behaviour is a child of its owner and is its own diagram (design.md *Behaviour*). The entry module is written inline in the package file's `entry points` band today, so give it a file of its own: `<pkg>/entry-points/<entry>.yaml` holding its `sequence` as `<pkg>/entry-points/<entry>/<entry>-path.yaml`, or a `parent:` key if `collect` supports one for a top-level diagram file (`diagram.ts` reads `parent`). Verify with `mnd check`
- **references**: `of` names the component by its path on the package layer, regions included (`Overview.Shop.Customer facing.Gateway` in the shop); folders are part of the path (`code.packages.core…`). For a one-package project the model is the package (`code.components.filters`). Confirm the exact path rule with `check` before generating many
- names never hold `.`: a translator writes `-` (`vite-config`); a step's message is named by the top call names, as lines are (`SAID`)

### 4. Hover and pick light the path

**One general rule: a block owning a behaviour, hovered or picked, lights what its behaviour travels on the block's own layer; the rest dims.** Not a translator feature: any model's block with a `sequence` or `flow` gets it.

- **core**: `travels(graph, block, layer)` → `{ blocks: Id[], lines: Id[] }`: the block's behaviours (children of a behavioural kind, *is behaviour*); for a sequence, its lifelines' referents (`object_of`, as `lit` in `tree.ts` resolves them) mapped to the blocks drawn on `layer` (a referent inside a drawn block counts as that block); each message between two lifelines lights the layer's relation between their blocks, in either direction (`edges_in(graph, layer)`). Home: `tree.ts` beside `lit`; record in docs/code-homes.md
- **stage**: hovering a card (`nodes.tsx`, where `set_lit` already lights a line on hover) or picking it computes `travels` once; the flow root gets a `pathing` class; lit cards and lines get `on-path`; CSS dims the rest (`opacity` on cards, lines and names; keep the colour, as the map's minor chips keep theirs). Picking holds it; hover shows it while the pointer is on
- the hover card (stage `Hover.tsx`) still shows; check they do not fight
- seen in the app on core's package diagram: hover `index`, then each entry; the path must read and not be covered (stage 1 counts)

### 5. Room for lines

**Gaps sized by the lines they carry; lines never on cards or names.**

- **today**: views `flow.ts` places with ELK (`layered()` options: `elk.edgeRouting: ORTHOGONAL`, `nodeNodeBetweenLayers` 2 units, `spacing.nodeNode` 1 unit, `UNIT` 24 px in `size.ts`); **ELK's own routes are thrown away**: `place` returns only spots. Then views `avoid.ts` routes with libavoid (`shapeBufferDistance` and `idealNudgingDistance` `SEAT`, `MOST` 64 lines a layer; above that, views `route.ts`'s straight or one Z under cards). Bands: views `bands.ts` (`APART = BLOCK.h`); regions laid as one layered run (`flow.ts` partitioning)
- **options**, to test against stage 1 on core's package diagram:

| Option | For | Against |
|---|---|---|
| **keep ELK's routes**: read each edge's `sections` from the layout, `elk.hierarchyHandling: INCLUDE_CHILDREN` so lines between bands and groups route in one pass; `elk.spacing.edgeEdge`, `edgeNode`, `layered.spacing.edgeNodeBetweenLayers` set from `SEAT` | ELK widens the space between ranks for the lines in it; no 64-line ceiling; one engine | regions and groups are laid inside out today; design.md *Lines* says libavoid routes (change the rule if this wins) |
| **libavoid in widened gaps**: count the lines each gap will carry (ranks from ELK), set spacing from it, lay again | keeps today's router and its rules | two layouts; the ceiling stays |
| **both**: ELK for gaps and order, libavoid for the final runs | room made where lines are | two passes to keep in step |

- leaning: keep ELK's routes. Line names then sit on a leg's longest straight run, beside the stroke, never on a card (design.md *a line's name sits on its own longest leg*)
- **diagram spacing by rank**: an entered diagram gets the map's rule: its major cards (components, entry points) a wide gap, its bands further apart than cards within one. Values are constants in `size.ts`, never per card

### 6. Primary parts read first, in a diagram

**The map's ranks carried into the entered view.** A card that is a part of the layer and holds parts (a component) is framed 2 px in its colour; a module card (no parts) quieter; the `shared` band's cards quieter still. Theme and stage, as the map's (`flow.css` `.major`/`.minor`); the mark from views `layer.ts` where the scene's cards are made. Salience (translate-plan stage 6) later decides which modules are cards at all.

### 7. Trace an entry's path on the map

**Built 2026-11-02** (*Built*, third table). **Hover or pick an entry's chip on the map: its path is drawn across the map, from the entry through each step of its sequence in order; the rest of the map dims.** Any block owning a behaviour gets it, as stage 4.

- **what is drawn**: one leg a message, in the sequence's order — the entry's own chip to the first component it calls (the line no diagram draws: entry lines are left out of package diagrams), then each step on from where its caller was last. Each leg from chip to chip; the chips on the path light, others dim, colours kept (*Keep colour*)
- **order**: from the sequence itself — its rows, its messages' ends and their lifelines' referents — never re-derived from the code; a core function beside `travels` (`tree.ts`), say `steps_of(graph, id)` → ordered `{ from, to, name }` of the blocks referred to. `travels` gives the set; this gives the order
- **where the chips are**: the map's scene has `areas` and chip nodes, no edges (`map.ts` `mapped` returns `edges: []`). A referent lifts to the nearest block the map draws as a chip or box (map.ts `drawn_at` already finds the element or the nearest block drawn above it, for *where it lives*)
- **how it is drawn**: an overlay in the flow's viewport (stage `Flow.tsx` already uses `ViewportPortal`), square legs in the gaps between chips — the map's gaps are 24 between major parts for this (*Built* ranks) — never through a chip or over its name (*No overlap*); arrows by direction; a step's call names on hover of its leg, not always shown. Routing: libavoid over the chips as obstacles, as `routes_of` does for a diagram, is the first thing to try
- **stage**: `path.ts` returns null on a map today (`scene.areas`); extend it so a map hover or pick over a chip with behaviours yields the ordered steps; the map's hover card still shows
- **judge**: on mndsite (every page now has a path; `theme-config` the longest), then this repo (`Tray`, `blocks`, `block`); paths must read at fit and at two zooms; extend `mnd measure` to a map's overlay once it exists
- **open**: whether several entries' paths can show at once (a pick of several); whether the steps are numbered on the map

## Built 2026-11-02

**Ranks on the map** (*Decided* row 6): a model's parts, looked through folders and bands, are **major**: a 2 px rim at half their colour and a 4 px colour accent on the left, a wide gap (24) between them and between what holds them; what they hold is **minor**: rims at half, box titles faint, previews at half until the pointer is on them, the colour accent kept whole. Rule in docs/design `chip.md`. Approved by the user ("much better, I like the highlighting effect"). Three fixes the same day: mndsite's entry points and single-module components read loud, being leaf parts of the model, so a major part must hold parts and the rest is minor, a minor chip's words faded too; the first cut gave major chips a neutral rim (colours lost); then a full-colour rim hid the left accent, so the rim is mixed to half and the accent widened.

| Change | Where |
|---|---|
| `in_model` (`is_model(layer_of(id))`, through folders and bands); `is_major` (in a model, holding parts, never a folder or holder); `minor`: inside a major part, or in a model and holding no major part; gaps `AIR.major` 24 between siblings where the parent holds a major part, else `AIR.inner` 6; `outer` stays 6 | views `map.ts` (`AIR`, `is_major`, `mapped`) |
| `major` and `minor` marks | views `scene.ts` `CardClass`; set in `map.ts` where nodes are pushed |
| the marks drawn | theme `chip.tsx` (`BoxFace` `rank`, `ChipData.marks`); stage `nodes.tsx` (`MapBox`), `flow.css` (*A model's parts read first*) |

**Seen in the app**: this repo, mndsite and the example shop; packages read as framed units, their contents recede, colours and left accents kept. Views tests pass. Not yet done for an entered diagram (stage 6).

## Built 2026-11-02, stages 1–6

**Each stage seen in the app**: core's, tray's and views' package diagrams, a `… path` sequence, the map, mndsite and the shop. Typecheck and the 304 tests pass.

| Stage | Change | Where |
|---|---|---|
| 1 measure | crossings, covered names, shared runs, tight gaps over a routed scene; guides (lifelines) left out; the name geometry moved out of stage into views `name_box`, one home | views `measure.ts`, `route.ts` `name_box`; cli `measure.ts`, `mnd measure` |
| 2 call graph | each call, `new` and JSX element into another module of the package; each entry's path walked depth first, a pair called again folding its names in, at most 12 steps, 4 calls deep | apps/ts `read.ts` `calls_of`, `structure.ts` `paths_of`, `report.ts` |
| 3 sequence | an entry with a path is a file of its own holding `<entry> path`, a `sequence`: lifelines referencing the blocks on the package layer, a `start` then a row a step, each step a block `call()` on the lifeline called | apps/ts `write.ts` `entry_files` |
| 4 lit path | `travels`; the card hovered, else the one picked, lights its path, the rest dims | core `tree.ts`; stage `path.ts`, `Stage.tsx`, `flow.css` |
| 5 room for lines | names on the longest leg clear of cards, either side; ELK edge spacings a seat and cards in a rank two units apart; libavoid nudges shared paths from one end apart. ELK's own routes were not needed | views `route.ts`, `flow.ts`, `avoid.ts`; stage `Wire.tsx`, `Flow.tsx` |
| 6 ranks in a diagram | in an entered diagram of a model, cards holding parts `major`, the rest `minor`; a part is never only behaviours, interfaces, groups or notes, so an entry holding its path stays minor on the map too | views `map.ts` `holds_parts`, `layer.ts` `ranked`; stage `flow.css` |

**The measure, before and after** (crossings · covered names · shared runs · tight gaps, both canvases summed):

| Workspace | Lines | Before | After |
|---|---|---|---|
| code (same data) | 506 | 73 · 134 · 32 · 24 | 22 · 55 · 12 · 22 |
| mndsite | 62–68 | 19 · 16 · 5 · 3 | 0 · 6 · 2 · 2 |
| example | 236–246 | 64 · 11 · 1 · 0 | 29 · 5 · 0 · 0 |

What moved the numbers: cards in a rank two units apart (crossings 58 → 6 on code alone), names clear of cards (covered 138 → 98), shared paths nudged (46 → 21). Each tried alone against the measure; ELK's edge spacing kept for its crossings though it adds a few shared runs.

## Built 2026-11-02, stage 7 and the map

**Seen in the app** on mndsite (`theme-config`: page → TagList → contents → meta → mobile → link) and this repo (`Tray`, `block`); typecheck and the 304 tests pass.

| Change | Where |
|---|---|
| a behaviour's messages as an ordered path of referents, never what heads its own rows | core `tree.ts` `path_of`, `stands` (shared with `travels`) |
| the trace: ends lifted to what the map draws, or the *+n more* they folded into; one leg a pair, numbered by first reach; a lit box lights what it holds | views `trace.ts` `trace_of` |
| each leg square, out of the middle of its source's top or bottom edge, then elbows into the target, over the dimmed chips (the user, 2026-11-02: routing round chips was obtrusive, slanted lines clash with the square style); thin, quiet; numbers at each block's lower right corner | views `trace.ts` `squared`; stage `Traced.tsx`, `flow.css` |
| drawn over the map, the rest dimmed | stage `Traced.tsx`, `path.ts` (a map now traces), `Stage.tsx`, `flow.css` *A path traced* |
| one layout for every map: a box holding only a box merged (*mndflow › code*); gaps by rank, 12 between boxes in every section; square-root weights; the map grown by chip count; slivers weighed up to 8×, then folded into *+n more* | views `map.ts` `merged`, `laid_out`, `folded` |
| a `treemap` diagram drawn as the map is, a reference as what it stands for; read only | views `map.ts` `layer_map`, `entries`; `block.ts`; web `App.tsx`; `treemap.ts` `treemapped` and the `tiled` card mark removed |

