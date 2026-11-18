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
| 3 | **flat lists are grouped**: where a box holds more than the view's budget, its children are grouped into closed chips with counts — by kind, then by name range (guide words, *A–Ca*); entering a group narrows the view to it, one level deeper. A view's boxes never say *+n more*; a well does (decision 8) |
| 4 | **a well shows what entering shows**: the same first level, groups included |
| 5 | **anything with a well enters**, in either section: packages (root folders) and folders, definitions holding parts, groups |
| 6 | **lines are gathered to the level drawn**: each relation's ends lifted to the chips drawn, one line per pair weighted by how many it carries, none inside one chip; **drawn only when a chip is selected or hovered** |
| 7 | **a scale check, not a test suite**: `mnd measure` reports every tree view of every sample; it guards big and small projects as the rules move |
| 8 | **wells stay simple and never clip**: a well previews what a chip holds and how much; a cell is drawn only whole, its name legible, the rest said as *+N more*; where not even one fits, the chip draws no well, only its counts. A flow's chip has no well (its steps are not drawn) |
| 9 | **a library folder counts definitions**: its chip and its box both say *definitions* |
| 10 | **groups exist on screen, never in the model**: a group's id is made by the view from its root and its key; nothing is stored |
| 11 | **tree views draw containment only**, as the explorer lists it: a definition's registry (its uses) and a tag or type entry's users are never treemaps — they are the tray's usages table; a component registry (tags, types) still draws its entries, each picked and inspected in the tray; in the library a definition holding parts enters on its drawing. A later table view may handle large data outside the tray |


## Orders

| Order | Work | Where | Done when |
|---|---|---|---|
| 1 | **the budget** (built 2026-11-16): `budget(room)` = the room's area over the area a legible chip needs (header over the least well, at the least name size, with its air); the map stops growing past the canvas (`ROOM`'s `grow` goes) | views `map.ts` (`mapped`, `laid_out`, `FLOOR`, `floor_h`) | every view's chip count ≤ its budget; a small project unchanged |
| 2 | **open from the top** (built 2026-11-16): start with the root's children closed; repeatedly open the next level of boxes together, in preference order — opened by hand (`keep`), the model file's `open:`, models on the world root and primary parts on an overview, then shallowest — accepting it only if the count stays within budget and every chip stays legible; `CLOSES` and the close-the-lightest loop go | views `map.ts` `mapped`; web `App.tsx` `kept` unchanged | the models' map of the mndflow sample lays out in < 50 ms; no chip under the floor |
| 3 | **grouping** (built 2026-11-16): a box holding more than the view's budget is grouped — by kind where two or more kinds each fit, else by name range, about as many groups as each holds, grouped again inside while too many — each group a view-made box with a label and its count; its closed chip's well shows the same groups; `ROOM` is gone, no view grows past its canvas | views `map.ts` `grouped`, `split`, `ranges`, `group`, `held_of`, `narrowed`; web `App.tsx` `group`, `narrow` | no sample holds a box wider than the default budget (95) since the translator files by folder, so the check runs a third, small canvas (520 × 400) where groups form; driven on samples/elements *Lines* |
| 4 | **wells from the same first level**: `well` takes the grouped first level a chip's entered view would draw, capped by the well's own room — **cap built 2026-11-16**: the heaviest cells that each show 4 characters at 8px, the rest one *+N more* cell (whole) that picks the chip | views `map.ts` `well` | no cell drawn cut or unnamed (cap: done); groups in wells wait on order 3 |
| 5 | **entering** (built 2026-11-16): library folders enter as the library's treemap rooted at them; a group enters as its root's view narrowed to it; library folder chips say *definitions* (decision 9); rule: a chip with a well enters, a leaf only picks | core `navigate.ts` (`lens_of`, `read_at`, `leave_at`), `holders.ts` `is_filing`; views `map.ts` `library_map`, `block.ts` `treemapped` | the scale check finds no chip with a well that enters nothing |
| 6 | **the scale check** (built 2026-11-16): `mnd measure <sample> --views` walks every tree view (both maps, every package and folder, every model overview, every group) and reports nodes, chips, chips under the floor, names cut (by character width), layout ms, and chips with a well that do not enter | cli `measure.ts`; views `scale.ts` | run on example, mndsite, elements and code; all four clean |
| 7 | **gathered lines** (built 2026-11-16, the view's part): a leg counts the relations it gathers (core `Hop.n`, views `Leg.n`), is heavier a step each time they double (four steps) and says the count on hover; lifting to the chips drawn, one leg a pair and nothing inside one chip were already `hop_trace`'s. **The done-when cannot be met by the views**: samples/code stores no relation crossing a component or a package (all 1,761 lines sit inside one; 0 cross), so picking `core` has nothing to trace — a translator gap (backlog *entry paths*: calls recorded within a package only). Was: on a pick or a hover, every relation under the chip (its descendants') lifted to the chips drawn, merged per pair with a count, stroke by count (a few steps, log-scaled), the count said on hover; inner relations dropped; boxes and chips alike | views `trace.ts` (`trace_of`, `hop_trace`), stage `Traced.tsx`, `path.ts`, `flow.css` *Hops traced* | picking `core` on the mndflow map traces legs to everything that depends on it |
| 8 | **performance** (measured 2026-11-16): the mndflow sample first draws in ~1.4–1.5 s on the dev server (the shop ~1.1 s), the budget having cut the map to 13 chips; frame rate not measured. Was: profile the ~7 s first draw (opening and checking the file, explorer rows, the map, the tray); React Flow's `onlyRenderVisibleElements` as a safety net only | web `App.tsx`, stage `Flow.tsx`, explorer | the mndflow sample first draws in < 2 s; 60 fps on every view |
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

**State (2026-11-16, close-out pass)**: committed through `b02abb1`. Uncommitted, built and driven: **packages enter** (a package is a root folder), **grouping** (order 3), **gathered lines' counts** (order 7), the scale check's small canvas, and the docs aligned to the tree rework (design.md, box.md, chip.md, definitions.md, tree.md). 303 tests pass; four navigation tests rewritten to the package rule.

| Built | Where |
|---|---|
| **chip budget, opened a level at a time** — floor is the header (96 × 48), weights floored at `SHARES`, short chips weighed up (`RAISE`, `ROUNDS`); the map still grows by `ROOM` until grouping | views `map.ts` `budget`, `mapped`, `ranked`, `level`, `laid_out` |
| **capped wells** — the heaviest cells that show their icon and 4 characters at 8px, the rest *+N more*; each cell wears its role's icon top right, as a header does | views `map.ts` `well`, `well_laid`, `NAMED`; theme `chip.tsx` `Well`; stage `flow.css` |
| **containment only** — no usage treemaps; tags and types keep their entries; library chips hold a definition's parts | core `navigate.ts` `lens_of`; views `registry.ts`, `map.ts` `library_map` |
| **folders enter, framed, in either section**; leaving goes to the holding folder (crumbs' up), Escape to the map; the camera cuts to the entered view (`entered`) | core `navigate.ts` `lens_of`, `leave_at`; views `map.ts` `framed`, `scene.ts` `entered`; stage `room.ts` `realm_of` |
| **a click only picks**, explorer included, inside an entered treemap | core `navigate.ts` `draws` |
| **what the library files** — one home; counts read the section shown in | core `sections.ts` `filed`, `filed_defs`; views `facts.ts` `facts_of` |
| **one mark per element** — the role icon from core `role_of` (a relation definition: its base, line or tie), or a relation definition's swatch, the same on explorer row, card, chip header and well cell; the models' package wears the model icon, an imported package a lock | core `names.ts` `role_of`; views `look.ts` `swatch_of`; theme `swatch.tsx`, `header.tsx`; explorer `rows.ts` `mark_of` |
| **the scale check** — every tree view at three canvases (landscape, portrait, small): chips against budget, under the floor, names cut, cells unnamed, chips stuck (never a region or a group), ms | views `scale.ts`; `mnd measure <sample> --views` |
| **packages enter** (decided 2026-11-16: a package is a root folder, and folders enter) — in either section, framed by its own box; left for the map; what it files leaves to it, so a model goes up to its package, then the map; brought into sight it is picked on its map, never entered; a leaf under one only picks | core `holders.ts` `is_filing`, `navigate.ts` `lens_of`, `sight`, `read_at`, `leave_at`; views `map.ts` `layer_map` |
| **grouping** — see order 3; a group is entered by a double-click (the box it groups entered first where the canvas is not in it), widened by going up or its crumbs, let go by Escape, never picked | views `map.ts`; web `App.tsx` |
| **gathered lines' counts** — see order 7 | core `tree.ts` `hops_of`; views `trace.ts`; stage `Traced.tsx`, `flow.css` |

**Measured (2026-11-16, landscape and portrait)**: the mndflow sample 1 chip under the floor, 4 names cut, 0 unnamed, 0 stuck over 1,110 chips; the shop 0 and 1; mndsite 0 and 18; elements 0 and 9; totals unchanged by this pass. At the small canvas chips fall under the floor where a level is forced open (mndflow 10, mndsite 2).

**Open**

| Item | Notes |
|---|---|
| **a definition's entered view** (the user needs an example) | decided 2026-11-16: a definition holding parts is entered, its parts a treemap in its chip's well. Entering draws them as its kind's diagram (ELK), not as a treemap, so the well and the entered view differ in form. The user is unsure which should hold: **show one definition both ways** (a library pattern from the shop, such as *Saga orchestrator*: its diagram as built beside its parts as a treemap) and ask |
| **relations across components** | the translator writes none, so the mndflow map traces nothing (order 7); a translator item, not a view's |
| **a box's counts change with what is open** | the shop's package says *6 diagrams* on the map and *5* entered: views `map.ts` `box_facts` counts the chips drawn |
| **a box holding a panel is never grouped** | a group's panel places its members; a wide box with one stays whole |
| **an overview's groups are rooted at the map's root** | ids `@map#~…`, since the overview's middle has no box of its own; harmless while a group is the view's own state |
| **small canvases** | chips under the floor where a level is forced open (the path to what was opened by hand); the check's small rows show them |
| tray contents card for a library folder says *blocks* | tray `Lists.tsx` `Card` → the card face's facts read no section |
| the enter cut fades from blank (200 ms) | try a partial or shorter fade if it reads as a blink |
| nested enters wait for the layout before flying | an entered folder is laid ahead (`internal` through ELK); order 8 |

**Confirmed by the user (2026-11-16)**: grouping is by kind, then by name range — no path level; **a model is always part of its package**, so leaving a model goes up to its package, then the map.

**Next**, in order:

| # | Work |
|---|---|
| 1 | **the definition example** above: one definition entered both ways, for the user's choice |
| 2 | **the user's look** at entered packages, groups (a small window on samples/elements › *Lines*) and weighted lines (the shop's *Shop* picked) |
| 3 | **order 9**: drive every sample through every depth, landscape and portrait |
| 4 | **frame rate** (order 8's second half), then the *Open* rows worth taking |
| 5 | delete this plan once the user accepts the mndflow sample; then model-plan.md orders 6–9 |

**Working notes**: drive samples/code.json by routing example.json in Playwright (Edge); a CDP screencast catches a 440 ms flight where screenshots cannot; run vitest from a `C:/` path; no new tests until the design settles — the scale check is the guard.
