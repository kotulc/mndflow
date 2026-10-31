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
| card and settings tabs | **open**: how basic edits fit, and how they say a definition apart |
| design.md rules → docs/design | **decided, not done**: design.md keeps the vision; its *Perspectives*, *Cards* and *Interfaces and lines* rules move into docs/design |
| implementation | not started |


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
| **identity** | name first, kind after it (on its own line under the name where both do not fit), icon top-right, colour as an edge; no corner over the name (`card.label` retires) |
| **colour** | grounds neutral, colour a thin mark by role: edge = what it is, stroke = relation type, solid dot = tag, accent = picked only, warn = fault; one lightness and chroma for identity hues; the model kind gets its own hue |
| **role** | a use is filled; a definition is an outline with no ground and a filled *definition* badge in its colour, on its card and in the tray head; never dashed |
| **card classes** | part (default), diagram (holds a layer), document (text, no members); definition is a role; members (attributes, ports, behaviours, tags, constraints) are never cards; a part with behaviours is a class card, behaviours last |
| **faces** | a large face is never shorter than a head and two rows; every face carries the facts strip at level 2 |
| **seats** | one square; its chevron points into the card for in, out of it for out; off the card, in leads its name and out follows it; hidden when too small to read |
| **lines** | icon = the relation type's wire swatch; levels stroke → anchors → name beside the stroke → end words; nothing on the stroke; hover thickens and shows ends; several between one pair: a count after the name (`has ×2`), never a thicker stroke |
| **tags** | solid dots, named beside the dot where there is room; a workspace key says the colours |
| **map** | one gap (6 px) everywhere, inside chips too; tiles climb the ladder and never drop below their name; overflow folds into *+n more*; boxes and explorer rows carry counts; rows wear a colour edge; no hover card on rows |
| **hover** | one hover card for chips, tiles, box titles, cards and lines; it shows the large face |
| **diagram** | a head band in the kind's colour under the crumbs |
| **tray** | head = identity row + role + facts; every tab reflows by the tray's width; the left column (card, and a chip only where it is the list drawn) stays put across tabs |
| **overview** | sections card → picture → why it matters → how it is used → where it lives → where it sits; picture = its own chip if it gathers anything, else its place; lines listed, never a picture; own answers only; gaps as quiet filled rows, editor only |
| **lists** | every section it has, at once; a section names itself (semibold, an i for what it is), no count; each list opens on a band, label flush left, count right; rows on shared columns with a rule under each; hovering a row lights it on the card; an empty element says so in one sentence |
| **settings tab** | shows the card at each level side by side, and the chip (to revisit with the card tab) |


## Open

| Item | Notes |
|---|---|
| **card and settings tabs** | the basic edits (name, description, style, settings) in the read-first look; how they say definition apart; whether the settings ladder stays |
| **contents tab** | mock it in the tray-lists style: card and chip left; text, blocks by region, lines by type, notation right |
| **tray widths** | overview.md breaks at 560 / 960 px, tray.md at 600 / 1040 px: pick one pair |
| **design.md migration** | move *Perspectives*, *Cards*, *Interfaces and lines* and *Relation ends* rules into docs/design, then cut design.md to the vision; retire the old corner rule and the connections picture there |
| **packages/tray/docs/tray.md** | still describes the editing tray (keys and choices, add rows, tables); fold into docs/design or retire once the card tab settles |
| **drafts** | every docs/design file says *Draft, for agreement*; mark them settled as each is built |


## Build

**Read before building**: code-homes.md for where each rule lives, and the mockups for values. Steps run in order; each ends with the samples checked by eye (the shop first).

| Step | Work | Homes |
|---|---|---|
| 1 | **tokens**: identity hues at one lightness and chroma, the model's own hue, the 6 px gap, the face minimum, the seat glyph, the definition badge | theme ramp and css, theme `face.tsx` |
| 2 | **card classes and role**: one derivation of part, diagram or document, and of definition or use, in one home; the explorer, canvas, chips and tray ask it | core (beside `role_of`), views |
| 3 | **identity row and faces**: kind after the name (wrapping under it), the corner gone, class cards with behaviours last, the definition outline and badge, facts strip on every face | views `face.ts`, theme `face.tsx`, stage `nodes.tsx` |
| 4 | **levels by zoom**: the ladder picked from on-screen size, the text band, hysteresis, fades, levels held in flight | views (level rule), stage |
| 5 | **map**: tiles as small cards climbing the ladder, *+n more*, box title counts, one gap | views `map.ts`, stage |
| 6 | **lines**: swatch icons, anchors, names beside the stroke, counts, ends on hover, hover card | views, stage `Wire.tsx`, `Hover.tsx` |
| 7 | **explorer rows**: colour edge, counts | explorer |
| 8 | **tray head and overview**: identity row with role and facts, titled sections, chip pictures (the room's chip replaces the connections and structure pictures), own answers, gaps, width reflow | tray `Tray.tsx`, `Overview.tsx`, `Picture.tsx` |
| 9 | **components and usages**: card left, sections of banded rows right, hover lighting, records as a table | tray `Carried.tsx`, `Usages.tsx`, `Table.tsx` |
| 10 | **docs**: mark built docs settled; migrate design.md; update code-homes.md | docs |

- **reuse what is there**: views `about.ts` already holds facts, previews and hover; `map.ts` already picks levels by room. Extend them rather than add parallel paths
- **no tests until each step's look is agreed** on the samples
