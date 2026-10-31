# Design language plan

**One design language across map, diagram, card, chip, line, hover and tray, worked out in sessions on 2026-10-29 to 2026-10-31.** The goal state is the docs folder `docs/design` (language.md first). This plan holds what is decided, where the mockups are, what is still open and how to build it. Delete it when the language is built.


## Next session

**Start here.** Everything through 2026-10-31 is committed (1a07542): the map, lines, explorer rows, tray head, overview, components and usages are built; *+n more*, `×n`, anchor bars, row swatches, seats on the tray card, a box's picture, one tray spacing, ports out of every facts strip, and **one picked look from one truth** (*Decided*: `lighting`). Next is **the tray structure mockup**, then its build.

| # | Work | Notes |
|---|---|---|
| 1 | **mockup: the tray structure** | below, *The tray structure mockup*. Agree it before building anything |
| 2 | **build the tray structure** | from the agreed mockup: one tab set, filter rows under the card, contents on the shared layout. Then the card and settings tabs, the context tabs, and retire `packages/tray/docs/tray.md` |
| 3 | **card faces** pass | see *Open*; agree the look on the shop first |
| 4 | **docs** (step 10) | design.md migration; mark docs/design files settled as each step is agreed |

- **check every visual change** at fit and two zooms in, on the map and in an entered diagram, at two window widths (*whole or none*)
- **check lighting by sweep, not by class**: click every surface kind on the models map, the library map, an entered definition and an entered diagram, and read the computed style for the accent: `npm run test:browser` (`test/browser/lighting.test.ts`, Playwright on installed Edge, about 4 minutes, kept out of `npm test`). A class on an element is not proof it shows
- the shop sample has no block below tile depth, and no two lines with the same ends, type and name: add both via `scripts/showcase.mjs` so map nesting and `×n` can be seen


### The tray structure mockup

**What it settles**: one tray, the same on every selection — every tab laid out alike, card on the left with the tab's filters under it, its list on the right. Rules are in *Decided* (`tray structure`, `tray`); the mockup gives them values and settles the questions below.

| Part | Do |
|---|---|
| **file** | `docs/design/mockups/tray-structure.html`, published as a private artifact and added to *Mockups*. Load the `artifact-design` skill first. Plain HTML, opens in a browser |
| **start from** | `tray-lists.html` (v9): its CSS, bands, rows, shared columns and hover lighting are agreed. Take values from the built tray: `tray.css` `.tray-body` (`--pad` 12, `--gap` 16, `--stack` 8, `--lead` `clamp(220px, 26cqi, 320px)`), breakpoints 560 / 960, the explorer's rows (`explorer.css`: mark, name, count right and quiet, colour edge) |
| **elements** | from the shop: a use (*Storefront*, service), a definition with uses (*block*), a record definition (*Customer*), a diagram (*Checkout saga*), a line (*Gateway → Storefront*), an element with nothing to list (a definition with no uses) |
| **tab set** | one bar for all: overview · card · settings · components · usages · contents. Show a matrix of which tab each element enables; a disabled tab is drawn, never hidden. A line's *line* tab is gone into *card* |
| **layout per tab** | the card column (card at its width, nothing captioned over it), then the filter groups under it; the tab's list on the right. **Overview** stays card → chip → answers. **Card and settings** keep their key list under the card: show whether it is the same component as the filter rows |
| **filter rows** | explorer rows local to the tab: a mark, a name, a count right; **single-select**, an *all* row first; the chosen row in the accent wash, as a picked explorer row. Groups by tab: **components** its sections (attributes, ports, behaviours, tags, constraints); **usages** its places, then a *subtypes* group; **contents** a *scope* group (layer, workspace) above a *kinds* group (blocks, interfaces, relations, groups, notes), replacing the table's filter bar. **None** where there is nothing to filter |
| **right column** | the list the filter narrows: components' banded sections, usages' lists by place (records as tables), contents' table kept whole. Show *all* and one row chosen side by side |
| **widths** | the tray at about 1200 px (two columns, contents' table wide), at 760 (two columns, narrow list), at 520 (one column) |

**Questions the mockup answers** (bring options, recommend one):
1. **the disabled tab**: faint and inert, or faint with a tip saying why
2. **filters below 560 px**: the rows over the list, or folded to a row of chips
3. **a filter kept per tab**, or reset as the element changes
4. **hovering a filter row**: lights its members on the canvas and on the card, as list rows do, or nothing
5. **counts** that agree with the tray head's facts strip, and where they would say the same thing twice
6. **the json chip** and the contents tab's *text* band: where they sit in the shared layout

**Then build**, in order: the tab set and the disabled state (tray `Tray.tsx` `TABS`, contexts); a shared filter-rows component in `Lists.tsx` beside `List`; components, usages, contents onto it (`Carried.tsx`, `Usages.tsx`, the contents `Table`); the line's tabs folded. Each checked by eye on the shop at two widths.


## Status

| Area | State |
|---|---|
| vision (design.md *Vision*) | **updated**: models are translated, then shown; display first, basic edits second; the tray informs first |
| language, chip, box, card, line, diagram, hover, row | **drafted and agreed**, in docs/design; chip.md updated 2026-10-31 (depth, headers, names cut short, rows vs texture) |
| overview tab | **agreed**: overview.md, mockup *overview-forms* |
| components and usages tabs | **agreed**: tray.md, mockup *tray-lists* |
| contents tab | its filters move under the card (*Decided* `tray structure`); **mockup next** |
| tray structure | **decided** 2026-10-31 (one tab set, filters under the card, single-select); **mockup next**, then build |
| card and settings tabs | **open**; for now the card tab also carries the attribute editor and *add port*, which left the components tab |
| design.md rules → docs/design | **decided, not done**: design.md keeps the vision; its *Perspectives*, *Cards* and *Interfaces and lines* rules move into docs/design |
| implementation | steps 1–9 built and committed (1a07542); remaining work in *Next session* |


## Mockups

**Kept in `docs/design/mockups`, each also published as a private artifact.** Each opens as a plain HTML file in a browser. They hold the working values (sizes, gaps, colours, thresholds) the docs leave out; take numbers from them, rules from the docs.

| File | Artifact | Shows | Current |
|---|---|---|---|
| map-forms.html | claude.ai/artifact/V51AuxwtrD58Ud9N9vPsr6 | the map under one zoom: levels by on-screen size, hysteresis, fades; leaf chips vs cards; box title counts; explorer rows with colour edges and counts | levels, text band, counts and row edges are current. Leaves as cards was **rejected** (leaves stay chips); the tinted card fills are superseded by the colour rules |
| line-forms.html | claude.ai/artifact/1iAiTDpx91cGzPgeBLioND | the wire swatch per relation type; lines with anchors, names beside the stroke, ends on hover; relation chips on the map; colour roles before and after | swatch, anchors, names beside, hover ends and colour roles are current. Option C's end chips and v1's pills were **rejected**. Tags as rings was **rejected** (solid dots) |
| overview-forms.html | claude.ai/artifact/JutRvRnfzhDoNfGQk42WxR | every overview case today vs proposed, one renderer, nine cases incl. a line; tray head as identity row; width reflow | **current** (v3). Its head shows `Def`; the role is now a badge (tray.md) |
| tray-structure.html | *to make* | one tab set, card column with filter rows, contents on the shared layout (*Next session*) | **next** |
| tray-lists.html | claude.ai/artifact/MMngXyW7f9aeLHK9xs6Qsk | components and usages, read first: card left, sections right, bands, shared columns, hover lighting, class card, records, empty part | **current** (v9). Versions 2 to 6 explored group pickers, samples and add lists; all **rejected** for a read-first tray |

The chip faces mockup that started this (claude.ai/artifact/QPL1BV7VTbCZHRr8Uh8p7A) is built and committed (e7082d0).


## Decided

| Topic | Decision |
|---|---|
| **surfaces** | a treemap (map, registry) draws chips, leaves included; a diagram draws cards; a chip's tiles are small cards; boxes stay boxes |
| **ladder** | mark → head → facts → preview → full, one order everywhere; a level shows whole or not at all |
| **zoom** | layout never moves; the level is picked from on-screen size; rows add below anchored to the top, fade 120 ms, drop only 15% below where they came, hold during a flight; text scales with zoom only between 85% and 115% |
| **whole or none** | 2026-10-31: nothing overlaps and nothing is cut through, at any size. Text sits in whole rows (a row that does not fit is hidden whole); facts wrap whole out of sight; a kind that does not fit beside the name takes its own row; a card's table shows only where its text is not held larger than laid; end words grow away from their card; a note shows whole lines; crumbs sit on the canvas ground |
| **map depth** | 2026-10-31: no depth or zoom cutoff — **never gate content on zoom**, it emptied the map. Every shape shows from its own size on screen, down to its mark at fit. A chip's head and facts are held at most 1.35× and laid at that size (`HELD`), so its tiles show wherever it has room. A tile holding blocks nests them at any depth down to a 4 px floor, each fading in as its mark reads; a tile says its facts, then its rows or description, as it grows |
| **tile text** | held readable, shrinking toward laid size to fit its tile; a name shows cut short (*Canc…*) wherever four letters and a line fit, else the icon alone. A title over members (a nesting tile, a place's box) keeps its laid line |
| **grid chips** | sequence and swimlane chips name their header strips as small cards of the header blocks (participants across the top, lanes upright down the left) on a quiet track, where rows and columns keep room; a named header's column is at least four letters wide; air inside grid cells halved, since their rules part them |
| **class and entity tiles** | rows ruled as the card's table where they fit, else the texture; never both; no facts line over the rows |
| **definition chips** | a definition with uses draws them as tiles by place, always; the profile only for one used nowhere |
| **identity** | name first, kind after it (on its own line under the name where both do not fit), icon top-right, colour as an edge; no corner over the name (`card.label` retires), and no name label at level 0; marks are `Ref`, `Pkg` and data, the `Def` mark retires for the badge |
| **colour** | grounds neutral, colour a thin mark by role: edge = what it is, stroke = relation type, solid dot = tag, accent = picked only, warn = fault; one lightness and chroma for identity hues; a definition's hue comes from its own family (or hue, vary); `style.fill`, `intensity` and `opacity` retire; the model kind gets its own hue; a reference loses its hatch and a note its wash. **The accent stays each theme's primary** (forcing one hue broke the themes); identity hues avoid it per theme when the shell's colours are reworked |
| **role** | a use is filled; a definition is an outline with no ground and a filled *definition* badge in its colour, on its card and in the tray head; never dashed |
| **card classes** | part (default), diagram (holds a layer), document (text, no members); definition is a role; members (attributes, ports, behaviours, tags, constraints) are never cards; a part with behaviours is a class card, behaviours last |
| **faces** | a large face is never shorter than a head and two rows; every face carries the facts strip at level 2 (to revisit, *Open*). **The facts strip never lists ports** (2026-10-31): a card seats them, the components tab lists them |
| **seats** | one square; its chevron points into the card for in, out of it for out; off the card, in leads its name and out follows it; hidden when too small to read |
| **lines** | icon = the relation type's wire swatch; levels stroke → anchors → name beside the stroke → end words; nothing on the stroke; hover thickens and shows ends; several between one pair: a count after the name (`has ×2`), never a thicker stroke |
| **tags** | solid dots, named beside the dot where there is room; the legend says the colours, in a tags section after the blocks |
| **map** | one gap (6 px) between areas and chips (grid cells excepted, above); overflow folds into *+n more*; boxes and explorer rows carry counts; rows wear a colour edge; no hover card on rows |
| **components share data, not concepts** | 2026-10-31: a package consumes another's output as a data contract, never its concepts. The explorer takes a row's colour and count from its host (`rowLook`; the app asks views `row_look`); the law is explorer → core, theme |
| **hover** | one hover card for chips, tiles, box titles, cards and lines; it shows the large face |
| **diagram** | a head band in the kind's colour under the crumbs |
| **tray** | head = identity row + role + facts; every tab reflows by the tray's width, breaking at 560 / 960 px; **one spacing** (`--pad`, `--gap`, `--stack`) and **one card column** (`--lead`) on every tab, the card filling it, nothing captioned over it (2026-10-31); the chip is the overview's alone, filling its column |
| **overview** | sections card → picture → why it matters → how it is used → where it lives → where it sits; picture = its own chip if it gathers anything, else its place, a box's its box's chips; lines listed, never a picture; own answers only; gaps as quiet filled rows, editor only |
| **lists** | every section it has, at once; a section names itself (semibold, an i for what it is), no count; each list opens on a band, label flush left, count right; rows on shared columns with a rule under each; hovering a row lights it on the card; an empty element says so in one sentence |
| **settings tab** | shows the card at each level side by side (to revisit with the card tab) |
| **tray structure** | 2026-10-31: **one tab set for every selection**, a tab that does not apply to the element disabled, never hidden (which tabs, and their order, to expand). **Every tab has one layout**: the card column on the left, the tab's list on the right. **Under the card, the tab's filters**: rows like the explorer's (local to the tab), each with its count, narrowing the list beside them — components its sections, usages its places then subtypes, contents its kinds and layer/workspace. They replace the contents table's filter bar; contents keeps its table on the right. An element with nothing to filter (usages with no uses) shows no rows. **Filters are single-select**, an *all* row first. **Contents' scope** (layer / workspace) is its own small group above the kind rows. **A line's card tab is `card`** (its *line* tab folds in), so tab names stay fixed. The chip stays the overview's alone |
| **lighting** | 2026-10-31: **the canvas lights what the tray is about**: the pick, else a list's lit row (`onLit`), else on a map the area gone to. One truth read by every node, line and tile, never React Flow's `selected`; **one picked look** (accent ring and wash) on every surface; what stands for a block (a place's box) lights and picks as it |
| **tray tabs** | superseded by `tray structure`: one tab set for every element, a line's *line* tab folded into *card*. Still standing: contents' text moves to the overview's answers column, last; the json chip stays for now |


## Open

| Item | Notes |
|---|---|
| **card and settings tabs** | their style and how edits fit (the tray informs; editing is not its purpose); how they say definition apart; whether the settings ladder stays. Built as today until then |
| **card faces** | a pass of their own: the facts strip repeating a table's count (*3 attributes* over three rows); a large face at level 2 drawn empty below its head; the head cramped over the table |
| **context tabs** | workspace, definitions folder, packages, registry and entry tabs have the head only; their tables are not yet banded lists. Fold into the tray structure after its mockup: their filters under the card as well |
| **design.md migration** | move *Perspectives*, *Cards*, *Interfaces and lines* and *Relation ends* rules into docs/design, then cut design.md to the vision; retire the old corner rule and the connections picture there |
| **packages/tray/docs/tray.md** | still describes the editing tray (keys and choices, add rows, tables); fold into docs/design or retire once the card tab settles |
| **drafts** | every docs/design file says *Draft, for agreement*; mark them settled once each built step is agreed on the samples |
| **seen, not fixed** | a line routed along a frame's border with its name on it (the Orders diagram's *placed*); a swimlane's lane chips too short for upright names at 1920 px fit; a lone use (internal's *Shop*) loses its name to its box's heading line; narrow upright chips in services' *relations* at 1920 px read two letters |
| **`×n` unseen** | no sample has two lines with the same ends, type and name, so the count is built but never drawn; add a pair to the shop's class diagram via `scripts/showcase.mjs` to see it |
| **the tray card's facts** | the hover card and tray card leave out the facts strip the canvas face carries (`face_props` sizes for it, draws none); the hover card says facts above the face, the tray head says them too. Decide with the card faces pass |


## Build

**Read before building**: code-homes.md for where each rule lives, and the mockups for values. Steps run in order; each ends with the samples checked by eye (the shop first), at fit and two zooms in, on the map and in a diagram.

| Step | Work | Homes | State |
|---|---|---|---|
| 1 | **tokens**: identity hues at one lightness and chroma, the model's own hue, the 6 px gap, the face minimum, the seat glyph, the definition badge | theme ramp and css, theme `face.tsx` | built |
| 2 | **card classes and role**: one derivation of part, diagram or document, and of definition or use | core `class_of`, `is_definition` | built |
| 3 | **identity row and faces**: kind after the name, the corner gone, class cards, the definition outline and badge, facts strip on every face | views `face.ts`, theme `face.tsx`, stage `nodes.tsx` | built; facts whole or none (2026-10-31) |
| 4 | **levels by zoom**: the ladder from on-screen size, the text band, hysteresis, fades, levels held in flight | views `level.ts`, stage `level.ts` | built; chips laid at their held size (2026-10-31) |
| 5 | **map**: tiles as small cards climbing the ladder, *+n more*, box title counts, one gap | views `map.ts`, `library.ts`, theme `chip.tsx`, stage `flow.css` | built; *+n more* for a definition's uses (2026-10-31). A diagram chip's structure never folds |
| 6 | **lines**: swatch icons, anchors, names beside the stroke, counts, ends on hover, hover card | views, stage `Wire.tsx`, `Hover.tsx` | built (2026-10-31) |
| 7 | **explorer rows**: colour edge, counts | explorer `rowLook`, views `row_look` | built; as host data (2026-10-31) |
| 8 | **tray head and overview** | tray `Tray.tsx`, `Overview.tsx`, `Picture.tsx` | built; a box's picture (2026-10-31) |
| 9 | **components and usages** | tray `Carried.tsx`, `Usages.tsx`, `Table.tsx` | built; seats on the tray card, lit with tiles (2026-10-31) |
| 10 | **docs**: mark built docs settled; migrate design.md; update code-homes.md | docs | code-homes.md current; **migration and settling not done** |
| 11 | **tray structure**: one tab set, filter rows under the card, contents on the shared layout; then card and settings tabs, context tabs | tray `Tray.tsx`, `Lists.tsx`, `Carried.tsx`, `Usages.tsx`, `Table.tsx` | **not started**; mockup next (*Next session*) |
| 12 | **card faces pass** | theme `face.tsx`, views `face.ts` | **not started**; agree the look first |

- **reuse what is there**: views `about.ts` holds facts, previews and hover; `map.ts` picks levels by room. Extend them rather than add parallel paths
- **no tests until each step's look is agreed** on the samples
