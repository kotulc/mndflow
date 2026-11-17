# Scale plan

**Make every tree view readable at any size: a project of ten blocks and one of ten thousand both draw a screen a person can read, enter and trace.** Taken up 2026-11-16 after driving this repo's own model (samples/code: 2,804 blocks, 1,761 lines). Agreed with the user the same day; to be built next session. **Delete this plan when the scale check (order 6) passes on every sample and the user accepts the mndflow sample.**


## Why

What the mndflow sample showed (2026-11-16, driven in Edge at 1440 × 900):

| Seen | Measured | Cause |
|---|---|---|
| **`block`'s registry** crawls | 1,429 uses: 1,430 chips, 354 under the floor; laid in 130 ms, but drawing ~1,600 nodes stalls the page (did not open within 90 s in one drive) | uses sit one level under their place box; legible-or-closed only closes boxes below the top two levels, so nothing can close |
| **library folders don't enter** | double-click on *diagrams*, *blocks*, *notation* only moves the crumbs | core `lens_of` opens only definitions in the library; a folder opens on nothing |
| **no lines between chips** | picking `core` on the map, or `session` inside core, traces 0 legs, though most of the repo depends on core | traces follow only relations whose ends are the block itself; nothing lifts a folder's or module's inner relations to the chip drawn |
| **dense entered folders** | entering `core` draws ~150 chips, many with names cut or wells clipped | nothing bounds what one view draws; the raise rounds give up |
| **slow first draw** | ~7 s to the first frame; the models' map alone lays out in ~220 ms | legible-or-closed relays the whole map for every box it closes |

Other heavy definitions in the sample: `line` 1,608 uses, `function` 357, `start`/`end`/`flow` ~185, `dependency` 143, `module` 119.


## Agreed (2026-11-16)

| # | Decision |
|---|---|
| 1 | **a chip budget per view, from the canvas area**, closely reflecting readability: as many chips as the room holds at a readable size, never a fixed count |
| 2 | **opened from the top, wide before deep**: every view starts closed and opens heaviest first while it stays within budget and every chip stays legible; replaces legible-or-closed's close-the-lightest loop |
| 3 | **flat lists are grouped**: where a box holds more than fits, its children are grouped into closed chips with counts — by kind, then by alphabetical range; entering a group goes one level deeper. A view's boxes never say *+n more*; a well does (decision 8) |
| 4 | **a well shows what entering shows**: the same first level, groups included |
| 5 | **anything with a well enters**, in either section: library folders, definitions holding parts, groups |
| 6 | **lines are gathered to the level drawn**: each relation's ends lifted to the chips drawn, one line per pair weighted by how many it carries, none inside one chip; **drawn only when a chip is selected or hovered** |
| 7 | **a scale check, not a test suite**: `mnd measure` reports every tree view of every sample; it guards big and small projects as the rules move |
| 8 | **wells stay simple and never clip**: a well previews what a chip holds and how much; a cell is drawn only whole, its name legible, the rest said as *+N more*; where not even one fits, the chip draws no well, only its counts. A flow's chip has no well (its steps are not drawn) |
| 9 | **a library folder counts definitions**: its chip and its box both say *definitions* |
| 10 | **groups exist on screen, never in the model**: a group's id is made by the view from its root and its key, from its root and its key; nothing is stored |
| 11 | **tree views draw containment only**, as the explorer lists it: a definition's registry (its uses) and a tag or type entry's users are never treemaps — they are the tray's usages table; a component registry (tags, types) still draws its entries, each picked and inspected in the tray; in the library a definition holding parts enters on its drawing. A later table view may handle large data outside the tray |


## Orders

| Order | Work | Where | Done when |
|---|---|---|---|
| 1 | **the budget** (built 2026-11-16): `budget(room)` = the room's area over the area a legible chip needs (header over the least well, at the least name size, with its air); the map stops growing past the canvas (`ROOM`'s `grow` goes) | views `map.ts` (`mapped`, `laid_out`, `FLOOR`, `floor_h`) | every view's chip count ≤ its budget; a small project unchanged |
| 2 | **open from the top** (built 2026-11-16): start with the root's children closed; repeatedly open the next level of boxes together, in preference order — opened by hand (`keep`), the model file's `open:`, models on the world root and primary parts on an overview, then shallowest — accepting it only if the count stays within budget and every chip stays legible; `CLOSES` and the close-the-lightest loop go | views `map.ts` `mapped`; web `App.tsx` `kept` unchanged | the models' map of the mndflow sample lays out in < 50 ms; no chip under the floor |
| 3 | **grouping**: a box whose children cannot all be legible chips within its share is grouped — kind, then A–F style ranges — each group a view-made box with a label and counts | views `tree.ts` (`branches`), `map.ts` (`library_map`) | a wide folder (the mndflow sample's *types*, 173) draws ≤ budget chips; every group says its count; `ROOM` goes |
| 4 | **wells from the same first level**: `well` takes the grouped first level a chip's entered view would draw, capped by the well's own room — **cap built 2026-11-16**: the heaviest cells that each show 4 characters at 8px, the rest one *+N more* cell (whole) that picks the chip | views `map.ts` `well` | no cell drawn cut or unnamed (cap: done); groups in wells wait on order 3 |
| 5 | **entering** (built 2026-11-16): library folders enter as the library's treemap rooted at them; a group enters as its root's view narrowed to it; library folder chips say *definitions* (decision 9); rule: a chip with a well enters, a leaf only picks | core `navigate.ts` (`lens_of`, `read_at`, `leave_at`), `holders.ts` `is_filing`; views `map.ts` `library_map`, `block.ts` `treemapped` | the scale check finds no chip with a well that enters nothing |
| 6 | **the scale check** (built 2026-11-16): `mnd measure <sample> --views` walks every tree view (both maps, every folder, every model overview, every definition registry, every group) and reports nodes, chips, chips under the floor, names cut (by character width), layout ms, and chips with a well that do not enter | cli `measure.ts`; views `scale.ts` | run on example, mndsite, elements and code; all four clean |
| 7 | **gathered lines**: on a pick or a hover, every relation under the chip (its descendants') lifted to the chips drawn, merged per pair with a count, stroke by count (a few steps, log-scaled), the count said on hover; inner relations dropped; boxes and chips alike | views `trace.ts` (`trace_of`, `hop_trace`), stage `Traced.tsx`, `path.ts`, `flow.css` *Hops traced* | picking `core` on the mndflow map traces legs to everything that depends on it |
| 8 | **performance**: profile the ~7 s first draw (opening and checking the file, explorer rows, the map, the tray); React Flow's `onlyRenderVisibleElements` as a safety net only | web `App.tsx`, stage `Flow.tsx`, explorer | the mndflow sample first draws in < 2 s; 60 fps on every view |
| 9 | **drive it**: every sample through every depth, landscape and portrait, picks and hovers with lines, entering and leaving groups | scratchpad drive scripts (Playwright with Edge) | the user's look |


## Rough edges to fold in

| Edge | Notes |
|---|---|
| **narrow chips cut their names** (*set_…*, *I…*) and wells clipped at the bottom | expected to go with the budget (orders 1–2) and decision 8; verify |
| **a folder box's tray picture is an empty frame** | tray `Where.tsx` / views `map.ts` `box_for` inside an entered folder |
| **a library folder chip says *blocks*, its box says *definitions*** | done 2026-11-16: views `facts_of` says a folder only the library lists (or a package read there) files *definitions* — chip, box and tray alike |


## Open questions for the build

| Question | Leaning |
|---|---|
| does *the world root opens each model one level* survive the budget | yes, as the first preference after hand-opened boxes; dropped where it would break the budget |
| the floor's least well | today ~26px of well under the header; keep unless the budget reads too sparse |


## Handoff

**State (2026-11-16)**: committed through `35cc27e` (orders 1, 2, 4's cap, 5, 6; containment only; framed folders; picks stay in view). Uncommitted, built and driven: the camera cut on entering a folder, role icons in well cells, and one mark per element (a relation definition's swatch everywhere). 303 tests pass.

| Built | Where |
|---|---|
| **chip budget, opened a level at a time** — floor is the header (96 × 48), weights floored at `SHARES`, short chips weighed up (`RAISE`, `ROUNDS`); the map still grows by `ROOM` until grouping | views `map.ts` `budget`, `mapped`, `ranked`, `level`, `laid_out` |
| **capped wells** — the heaviest cells that show their icon and 4 characters at 8px, the rest *+N more*; each cell wears its role's icon top right, as a header does | views `map.ts` `well`, `well_laid`, `NAMED`; theme `chip.tsx` `Well`; stage `flow.css` |
| **containment only** — no usage treemaps; tags and types keep their entries; library chips hold a definition's parts | core `navigate.ts` `lens_of`; views `registry.ts`, `map.ts` `library_map` |
| **folders enter, framed, in either section**; leaving goes to the holding folder (crumbs' up), Escape to the map; the camera cuts to the entered view (`entered`) | core `navigate.ts` `lens_of`, `leave_at`; views `map.ts` `framed`, `scene.ts` `entered`; stage `room.ts` `realm_of` |
| **a click only picks**, explorer included, inside an entered treemap | core `navigate.ts` `draws` |
| **what the library files** — one home; counts read the section shown in | core `sections.ts` `filed`, `filed_defs`; views `facts.ts` `facts_of` |
| **one mark per element** — the role icon from core `role_of` (a relation definition: its base, line or tie), or a relation definition's swatch, the same on explorer row, card, chip header and well cell; the models' package wears the model icon, an imported package a lock | core `names.ts` `role_of`; views `look.ts` `swatch_of`; theme `swatch.tsx`, `header.tsx`; explorer `rows.ts` `mark_of` |
| **the scale check** — every tree view, both shapes: chips against budget, under the floor, names cut, cells unnamed, chips stuck, ms | views `scale.ts`; `mnd measure <sample> --views` |

**Measured (mndflow sample)**: every view 1 chip under the floor, 4 names cut, 0 unnamed, 0 stuck; the models map ~150–200 ms (order 8).

**Open**

| Item | Notes |
|---|---|
| **definition view** (ask the user) | design.md says *there is no definition view*, yet a library definition holding parts enters its drawing (core `lens_of`); decide which holds |
| tray contents card for a library folder says *blocks* | tray `Lists.tsx` `Card` → the card face's facts read no section |
| the enter cut fades from blank (200 ms) | try a partial or shorter fade if it reads as a blink |
| nested enters wait for the layout before flying | an entered folder is laid ahead (`internal` through ELK); order 8 |

**Next**: order 3 (grouping wide folders by kind, then name range; then `ROOM` goes), then 7 (gathered lines on pick or hover), 8 (first draw under 2 s), 9 (drive every sample for the user's look).

**Working notes**: drive samples/code.json by routing example.json in Playwright (Edge); a CDP screencast catches a 440 ms flight where screenshots cannot; run vitest from a `C:/` path; no new tests until the design settles — the scale check is the guard.
