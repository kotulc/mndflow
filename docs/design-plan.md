# Design language plan

**One design language across map, diagram, card, chip, line, hover and tray, worked out in sessions on 2026-10-29 to 2026-10-31.** The goal state is the docs folder `docs/design` (language.md first). This plan holds what is decided, where the mockups are, what is still open and how to build it. Delete it when the language is built.


## Next session

**Start here.** Built work from 2026-10-30 is committed (cb3cabc); the 2026-10-31 work (overlap pass, map depth, grid headers, explorer data contract, library uses) is **uncommitted**, checked by eye at 1024, 1440 and 1920 px, tests green.

| # | Work | Notes |
|---|---|---|
| 1 | **commit** the 2026-10-31 work | suggested: *Fix overlap, nest map tiles, name grid headers, explorer takes row data* |
| 2 | **+n more** (step 5) | tiles that do not fit whole fold into one last tile, *+12 more*, whose hover card lists them. Where use tiles fall under the mark floor (the line definition's 34 uses), fold rather than draw slivers |
| 3 | **`has ×2` and the headless anchor bar** (step 6) | a count after a line's name for several lines between one pair; a short bar where an anchor has no head. Swatches in explorer rows (relation definitions) |
| 4 | **hover lighting** (step 9) | a list row lights its seat on the card and its tile in a chip, not only table rows |
| 5 | **a box's overview picture** | a block the map draws as a box (Shop) pictures its box's chips |
| 6 | **the tray** | card and settings tabs (see *Open*), context tabs' banded lists, then retire `packages/tray/docs/tray.md` |
| 7 | **card faces** pass | see *Open*; agree the look on the shop before building |
| 8 | **docs** (step 10) | design.md migration; mark docs/design files settled as each step is agreed |

- **check every visual change** at fit and two zooms in, on the map and in an entered diagram, at two window widths (*whole or none*)
- the shop sample has no block below tile depth: add one that holds parts (via `scripts/showcase.mjs`) so map nesting can be seen


## Status

| Area | State |
|---|---|
| vision (design.md *Vision*) | **updated**: models are translated, then shown; display first, basic edits second; the tray informs first |
| language, chip, box, card, line, diagram, hover, row | **drafted and agreed**, in docs/design; chip.md updated 2026-10-31 (depth, headers, names cut short, rows vs texture) |
| overview tab | **agreed**: overview.md, mockup *overview-forms* |
| components and usages tabs | **agreed**: tray.md, mockup *tray-lists* |
| contents tab | drafted in tray.md, not mocked in the read-first style |
| card and settings tabs | **open**, next after the build steps; for now the card tab also carries the attribute editor and *add port*, which left the components tab |
| design.md rules → docs/design | **decided, not done**: design.md keeps the vision; its *Perspectives*, *Cards* and *Interfaces and lines* rules move into docs/design |
| implementation | steps 1–9 built (cb3cabc); 2026-10-31 passes uncommitted; remaining work in *Next session* |


## Mockups

**Kept in `docs/design/mockups`, each also published as a private artifact.** Each opens as a plain HTML file in a browser. They hold the working values (sizes, gaps, colours, thresholds) the docs leave out; take numbers from them, rules from the docs.

| File | Artifact | Shows | Current |
|---|---|---|---|
| map-forms.html | claude.ai/artifact/V51AuxwtrD58Ud9N9vPsr6 | the map under one zoom: levels by on-screen size, hysteresis, fades; leaf chips vs cards; box title counts; explorer rows with colour edges and counts | levels, text band, counts and row edges are current. Leaves as cards was **rejected** (leaves stay chips); the tinted card fills are superseded by the colour rules |
| line-forms.html | claude.ai/artifact/1iAiTDpx91cGzPgeBLioND | the wire swatch per relation type; lines with anchors, names beside the stroke, ends on hover; relation chips on the map; colour roles before and after | swatch, anchors, names beside, hover ends and colour roles are current. Option C's end chips and v1's pills were **rejected**. Tags as rings was **rejected** (solid dots) |
| overview-forms.html | claude.ai/artifact/JutRvRnfzhDoNfGQk42WxR | every overview case today vs proposed, one renderer, nine cases incl. a line; tray head as identity row; width reflow | **current** (v3). Its head shows `Def`; the role is now a badge (tray.md) |
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
| **faces** | a large face is never shorter than a head and two rows; every face carries the facts strip at level 2 (to revisit, *Open*) |
| **seats** | one square; its chevron points into the card for in, out of it for out; off the card, in leads its name and out follows it; hidden when too small to read |
| **lines** | icon = the relation type's wire swatch; levels stroke → anchors → name beside the stroke → end words; nothing on the stroke; hover thickens and shows ends; several between one pair: a count after the name (`has ×2`), never a thicker stroke |
| **tags** | solid dots, named beside the dot where there is room; the legend says the colours, in a tags section after the blocks |
| **map** | one gap (6 px) between areas and chips (grid cells excepted, above); overflow folds into *+n more*; boxes and explorer rows carry counts; rows wear a colour edge; no hover card on rows |
| **components share data, not concepts** | 2026-10-31: a package consumes another's output as a data contract, never its concepts. The explorer takes a row's colour and count from its host (`rowLook`; the app asks views `row_look`); the law is explorer → core, theme |
| **hover** | one hover card for chips, tiles, box titles, cards and lines; it shows the large face |
| **diagram** | a head band in the kind's colour under the crumbs |
| **tray** | head = identity row + role + facts; every tab reflows by the tray's width, breaking at 560 / 960 px; the left column (card, and a chip only where it is the list drawn) stays put across tabs |
| **overview** | sections card → picture → why it matters → how it is used → where it lives → where it sits; picture = its own chip if it gathers anything, else its place, a box's its box's chips; lines listed, never a picture; own answers only; gaps as quiet filled rows, editor only |
| **lists** | every section it has, at once; a section names itself (semibold, an i for what it is), no count; each list opens on a band, label flush left, count right; rows on shared columns with a rule under each; hovering a row lights it on the card; an empty element says so in one sentence |
| **settings tab** | shows the card at each level side by side, and the chip (to revisit with the card tab) |
| **tray tabs** | a line has overview · settings · components (its line tab becomes settings); contents stays as is, its text moves to the overview's answers column, last; the json chip stays for now |


## Open

| Item | Notes |
|---|---|
| **card and settings tabs** | their style and how edits fit (the tray informs; editing is not its purpose); how they say definition apart; whether the settings ladder stays. Built as today until then |
| **card faces** | a pass of their own: the facts strip repeating a table's count (*3 attributes* over three rows); a large face at level 2 drawn empty below its head; the head cramped over the table |
| **context tabs** | workspace, definitions folder, packages, registry and entry tabs have the head only; their tables are not yet banded lists. Mock them properly first |
| **design.md migration** | move *Perspectives*, *Cards*, *Interfaces and lines* and *Relation ends* rules into docs/design, then cut design.md to the vision; retire the old corner rule and the connections picture there |
| **packages/tray/docs/tray.md** | still describes the editing tray (keys and choices, add rows, tables); fold into docs/design or retire once the card tab settles |
| **drafts** | every docs/design file says *Draft, for agreement*; mark them settled once each built step is agreed on the samples |
| **seen, not fixed** | a line routed along a frame's border with its name on it (the Orders diagram's *placed*); a swimlane's lane chips too short for upright names at 1920 px fit; a lone use (internal's *Shop*) loses its name to its box's heading line |


## Build

**Read before building**: code-homes.md for where each rule lives, and the mockups for values. Steps run in order; each ends with the samples checked by eye (the shop first), at fit and two zooms in, on the map and in a diagram.

| Step | Work | Homes | State |
|---|---|---|---|
| 1 | **tokens**: identity hues at one lightness and chroma, the model's own hue, the 6 px gap, the face minimum, the seat glyph, the definition badge | theme ramp and css, theme `face.tsx` | built |
| 2 | **card classes and role**: one derivation of part, diagram or document, and of definition or use | core `class_of`, `is_definition` | built |
| 3 | **identity row and faces**: kind after the name, the corner gone, class cards, the definition outline and badge, facts strip on every face | views `face.ts`, theme `face.tsx`, stage `nodes.tsx` | built; facts whole or none (2026-10-31) |
| 4 | **levels by zoom**: the ladder from on-screen size, the text band, hysteresis, fades, levels held in flight | views `level.ts`, stage `level.ts` | built; chips laid at their held size (2026-10-31) |
| 5 | **map**: tiles as small cards climbing the ladder, *+n more*, box title counts, one gap | views `map.ts`, `library.ts`, theme `chip.tsx`, stage `flow.css` | built: tiles at any depth, tile text and rows, grid headers, definition uses by place (2026-10-31); **+n more not built** |
| 6 | **lines**: swatch icons, anchors, names beside the stroke, counts, ends on hover, hover card | views, stage `Wire.tsx`, `Hover.tsx` | built but for **`has ×2`, the headless anchor bar, and swatches in explorer rows**; end words grow away from cards (2026-10-31) |
| 7 | **explorer rows**: colour edge, counts | explorer `rowLook`, views `row_look` | built; as host data (2026-10-31) |
| 8 | **tray head and overview** | tray `Tray.tsx`, `Overview.tsx`, `Picture.tsx` | built; **a box's picture as its box's chips not built** |
| 9 | **components and usages** | tray `Carried.tsx`, `Usages.tsx`, `Table.tsx` | built; **hover lighting of seats and chip tiles not built** |
| 10 | **docs**: mark built docs settled; migrate design.md; update code-homes.md | docs | code-homes.md current; **migration and settling not done** |
| 11 | **tray: card and settings tabs, context tabs** | tray | **not started**; agree a mockup first |
| 12 | **card faces pass** | theme `face.tsx`, views `face.ts` | **not started**; agree the look first |

- **reuse what is there**: views `about.ts` holds facts, previews and hover; `map.ts` picks levels by room. Extend them rather than add parallel paths
- **no tests until each step's look is agreed** on the samples
