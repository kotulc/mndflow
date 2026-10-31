# Design language plan

**One design language across map, diagram, card, chip, line, hover and tray, worked out in sessions on 2026-10-29 and 2026-10-30.** The goal state is the docs folder `docs/design` (language.md first). This plan holds what is decided, where the mockups are, what is still open and how to build it. Delete it when the language is built.


## Status

| Area | State |
|---|---|
| vision (design.md *Vision*) | **updated**: models are translated, then shown; display first, basic edits second; the tray informs first |
| language, chip, box, card, line, diagram, hover, row | **drafted and agreed**, in docs/design |
| overview tab | **agreed**: overview.md, mockup *overview-forms* |
| components and usages tabs | **agreed**: tray.md, mockup *tray-lists* |
| contents tab | drafted in tray.md, not mocked in the read-first style |
| card and settings tabs | **open**, a future session; for now the card tab also carries the attribute editor and *add port*, which left the components tab |
| design.md rules → docs/design | **decided, not done**: design.md keeps the vision; its *Perspectives*, *Cards* and *Interfaces and lines* rules move into docs/design |
| implementation | **built 2026-10-30, uncommitted, awaiting your look on the samples**: steps 1–9 and the code-homes part of 10; see *Build* for what each left out |


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
| **surfaces** | a treemap (map, registry) draws chips, leaves included; a diagram draws cards; a chip's tiles are small cards |
| **ladder** | mark → head → facts → preview → full, one order everywhere; a level shows whole or not at all |
| **zoom** | layout never moves; the level is picked from on-screen size; rows add below anchored to the top, fade 120 ms, drop only 15% below where they came, hold during a flight; text scales with zoom only between 85% and 115% |
| **identity** | name first, kind after it (on its own line under the name where both do not fit), icon top-right, colour as an edge; no corner over the name (`card.label` retires), and no name label at level 0; marks are `Ref`, `Pkg` and data, the `Def` mark retires for the badge |
| **colour** | grounds neutral, colour a thin mark by role: edge = what it is, stroke = relation type, solid dot = tag, accent = picked only, warn = fault; one lightness and chroma for identity hues; a definition's hue comes from its own family (or hue, vary); `style.fill`, `intensity` and `opacity` retire; the model kind gets its own hue; the shell's colours (accent, tint, lit) stay each theme's own and are out of scope; step 1 spaced the identity hues off error and warn (flow was on error, constraint on warn); a reference loses its hatch and a note its wash |
| **role** | a use is filled; a definition is an outline with no ground and a filled *definition* badge in its colour, on its card and in the tray head; never dashed |
| **card classes** | part (default), diagram (holds a layer), document (text, no members); definition is a role; members (attributes, ports, behaviours, tags, constraints) are never cards; a part with behaviours is a class card, behaviours last |
| **faces** | a large face is never shorter than a head and two rows; every face carries the facts strip at level 2 |
| **seats** | one square; its chevron points into the card for in, out of it for out; off the card, in leads its name and out follows it; hidden when too small to read |
| **lines** | icon = the relation type's wire swatch; levels stroke → anchors → name beside the stroke → end words; nothing on the stroke; hover thickens and shows ends; several between one pair: a count after the name (`has ×2`), never a thicker stroke |
| **tags** | solid dots, named beside the dot where there is room; the legend says the colours, in a tags section after the blocks |
| **map** | one gap (6 px) everywhere, inside chips too; tiles climb the ladder and never drop below their name; overflow folds into *+n more*; boxes and explorer rows carry counts; rows wear a colour edge; no hover card on rows |
| **hover** | one hover card for chips, tiles, box titles, cards and lines; it shows the large face |
| **diagram** | a head band in the kind's colour under the crumbs |
| **tray** | head = identity row + role + facts; every tab reflows by the tray's width, breaking at 560 / 960 px; the left column (card, and a chip only where it is the list drawn) stays put across tabs |
| **overview** | sections card → picture → why it matters → how it is used → where it lives → where it sits; picture = its own chip if it gathers anything, else its place; lines listed, never a picture; own answers only; gaps as quiet filled rows, editor only |
| **lists** | every section it has, at once; a section names itself (semibold, an i for what it is), no count; each list opens on a band, label flush left, count right; rows on shared columns with a rule under each; hovering a row lights it on the card; an empty element says so in one sentence |
| **settings tab** | shows the card at each level side by side, and the chip (to revisit with the card tab) |
| **tray tabs** | a line has overview · settings · components (its line tab becomes settings); contents stays as is, its text moves to the overview's answers column, last; the json chip stays for now |


## Open

| Item | Notes |
|---|---|
| **card and settings tabs** | a future session: their style and how edits fit (the tray informs; editing is not its purpose); how they say definition apart; whether the settings ladder stays. Built as today until then |
| **context tabs** | workspace, definitions folder, packages, registry and entry tabs get the head and banded lists only in this pass; mock them properly later |
| **design.md migration** | move *Perspectives*, *Cards*, *Interfaces and lines* and *Relation ends* rules into docs/design, then cut design.md to the vision; retire the old corner rule and the connections picture there |
| **packages/tray/docs/tray.md** | still describes the editing tray (keys and choices, add rows, tables); fold into docs/design or retire once the card tab settles |
| **drafts** | every docs/design file says *Draft, for agreement*; mark them settled once you have agreed each built step on the samples |
| **law: explorer reads views** | `test/law.test.ts` now lets explorer import views, for its rows' colour edge (`colour_of`) and count; confirm, or move identity colour and counting into core |
| **accent vs identity hues** | the accent is each theme's primary (green in retro, blue in modern and light), so it can share a hue with a kind (modern's accent near entity). Left as is; the shell's colour system is its own piece of work |
| **facts repeat a table** | every face carries the facts strip, so a table card says *3 attributes* over its three rows. Keep, or drop counts a face already shows |
| **map previews need zoom** | a chip's tiles are level 3, so at the whole map's fit zoom most chips show their head and facts only. Agree, or let tiles show from level 2 |
| **chip text cap** | the text band holds a chip's head and facts at most 1.35× its laid size (`--chip-k`), since they sit in rows laid above its tiles; past that the level drops instead |
| **a box has no chip** | a block the map draws as a box (Shop) has no chip of its own, so its overview says *the map draws no chip for it*. Draw its box's chips, or its place |
| **context tabs' lists** | the definitions, packages, registry and entry tabs got the head only; their tables are not yet banded lists |


## Build

**Read before building**: code-homes.md for where each rule lives, and the mockups for values. Steps run in order; each ends with the samples checked by eye (the shop first).

| Step | Work | Homes | State |
|---|---|---|---|
| 1 | **tokens**: identity hues at one lightness and chroma, the model's own hue, the 6 px gap, the face minimum, the seat glyph, the definition badge | theme ramp and css, theme `face.tsx` | built; face minimum, seat glyph and badge landed with step 3 |
| 2 | **card classes and role**: one derivation of part, diagram or document, and of definition or use, in one home; the explorer, canvas, chips and tray ask it | core (beside `role_of`), views | built: core `class_of`, `is_definition`; class decides a part with behaviours draws as a class card |
| 3 | **identity row and faces**: kind after the name (wrapping under it), the corner gone, class cards with behaviours last, the definition outline and badge, facts strip on every face | views `face.ts`, theme `face.tsx`, stage `nodes.tsx` | built; the `Def` mark, `card.label` and the corner retired; `style.fill`, `intensity`, `opacity` retired |
| 4 | **levels by zoom**: the ladder picked from on-screen size, the text band, hysteresis, fades, levels held in flight | views (level rule), stage | built; a chip's text capped at 1.35× (see *Open*) |
| 5 | **map**: tiles as small cards climbing the ladder, *+n more*, box title counts, one gap | views `map.ts`, stage | one gap and box title counts built; **tiles folding into *+n more* not built** |
| 6 | **lines**: swatch icons, anchors, names beside the stroke, counts, ends on hover, hover card | views, stage `Wire.tsx`, `Hover.tsx` | names beside the stroke, levels, anchors by level, hover thickens and says ends, hover card on diagrams built; **a count for several lines between one pair (`has ×2`) and a short bar for a headless anchor not built**; swatches in tray lists only, not yet in explorer rows |
| 7 | **explorer rows**: colour edge, counts | explorer | built |
| 8 | **tray head and overview**: identity row with role and facts, titled sections, chip pictures (the room's chip replaces the connections and structure pictures), own answers, gaps, width reflow | tray `Tray.tsx`, `Overview.tsx`, `Picture.tsx` | built; line overview, legend tags section built |
| 9 | **components and usages**: card left, sections of banded rows right, hover lighting, records as a table | tray `Carried.tsx`, `Usages.tsx`, `Table.tsx` | built; hover lighting on table cards only (not seats or chip tiles) |
| 10 | **docs**: mark built docs settled; migrate design.md; update code-homes.md | docs | code-homes.md updated; **design.md migration and marking docs settled not done** |

- **reuse what is there**: views `about.ts` already holds facts, previews and hover; `map.ts` already picks levels by room. Extend them rather than add parallel paths
- **no tests until each step's look is agreed** on the samples
