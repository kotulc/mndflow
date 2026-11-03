# Design language plan

**One design language across map, diagram, card, chip, line, hover and tray, worked out in sessions on 2026-10-29 to 2026-10-31.** The goal state is the docs folder `docs/design` (language.md first). This plan holds what is decided, where the mockups are, what is still open and how to build it. Delete it when the language is built.


## Next session

**Start here.** Committed through 6ec08d6 (scopes on the shared tray layout, the where-it-lives map as a compact tree). **Uncommitted, 2026-11-01**: the where-it-lives map widened to the whole map with the path given room, and the element left unnamed (*Build 2026-11-01*). **The next session takes up code translation** (translate-plan.md); the design-language work below waits behind it.

When the design language resumes:

| # | Work | Notes |
|---|---|---|
| 1 | **card faces** pass | see *Open*; agree the look on the shop first |
| 2 | **tray follow-ups** | *Open* `tray follow-ups`: the definitions table onto filter rows, a library entry's overview and usages, a package's importers, the workspace's and a package's card |
| 3 | **card and settings tabs** | their editing style (*Open*); then retire `packages/tray/docs/tray.md` |
| 4 | **docs** (step 10) | design.md migration; mark docs/design files settled as each step is agreed |

- **check every visual change** at fit and two zooms in, on the map and in an entered diagram, at two window widths (*whole or none*)
- **check lighting by sweep, not by class**: click every surface kind on the models map, the library map, an entered definition and an entered diagram, and read the computed style for the accent: `npm run test:browser` (`test/browser/lighting.test.ts`, Playwright on installed Edge, about 4 minutes, kept out of `npm test`). A class on an element is not proof it shows
- **samples are YAML**: edit `samples/example/**.yaml`, then `npm run example` to collect (`scripts/showcase.mjs` is gone)
- **drive the tray** with Playwright on the dev server (`npx vite --port 5191` in `apps/web`): click a chip, then each tab; expand the tray (*take the full height*) only for a screenshot, since it covers the canvas


### Build 2026-11-01: where it lives, and scopes as elements

**Built** from mockup *where-map* (rounds 1 to 3 in the same file), in four turns at the user's call: K (a strip over the major block's compact tree), the strip dropped, the whole map (L) with the path given room, the element's name dropped:

| Part | Where |
|---|---|
| the whole map's compact tree, the major block and room swelled, the room opened, the element lit (unnamed: its card is above) | views `map.ts` `where_map`, `drawn_at`; tray `Where.tsx` `Picture`; `tray.css` `.where-*` |
| the map an element, a package or the workspace is drawn from, the nearest-lighting one winning | views `chip_map`; tray `Where.tsx` `Where` |
| the workspace's and a package's card: their map as one compact tree | tray `Where.tsx` `Scope`, `Lists.tsx` `Card` |
| the workspace and a package through the shared overview | tray `Overview.tsx`, `Workspace.tsx` `ScopeAnswers` |
| the workspace's components (packages as filter rows and lists) and settings on the shared card column | tray `Packages.tsx`, `Tray.tsx` |

**Driven** on the shop (busy) and on samples/elements (sparse): a use, a tile in a diagram chip, a step in a flow, a library definition, a top-level part, a package, the workspace, at full and quarter tray height. **Review** (high) fixed: a line whose ends sit in two major blocks lit one; a tag clamped to the wrong box; a room above a passed-through top; the *offered* filter outliving its row; a row's action clipped by its text; a package's overview losing its tags and text; an empty frame where no map draws the element; the workspace's card changing map by tab; a package's picture on the wrong map; repeated scans per resize. A pattern's part now lights its pattern.


### Build 2026-10-31: the tray structure

**Built**, from the agreed mockup (tray-structure v4):

| Part | Where |
|---|---|
| one tab set, faint tabs inert | tray `Tray.tsx` `TABS`, `applies`; theme `shell.tsx` `TrayFrame` `off`, `shell.css` `.off` |
| filter rows under the card | tray `Lists.tsx` `Filters`; components (`Carried.tsx`), usages (`Usages.tsx`: *in models*, *in the library*, *subtypes*), contents (`Contents.tsx`: kinds, and *definitions* on a package or the workspace), a package's components (`Registry.tsx` `Registries`) |
| a filter kept per tab, reset with the element | `Tray.tsx` `chosen` |
| hovering a filter lights its set | `Filters` `onLight`; the card lights a list (theme `face.tsx` `lit`, tray `Faces.tsx`) |
| keys as filter rows | `fields.css` `.yaml` (the card and settings tabs) |
| overview: where it lives, path heading the answers, text last | views `map.ts` `where_map`; tray `Where.tsx` (`Where`, `Trail`), `Overview.tsx` |
| the workspace and a package as elements | `Tray.tsx` contexts; `Workspace.tsx` (`Workspace`, `DisplaySettings`); a library section, a package row and a registry each land on one (web `App.tsx`, tray `state.ts`) |
| usage places in the library | core `uses.ts` `placed`, `use_place` |
| a merged line lights for any it stands for | views `block.ts` `once` (`also`), stage `Wire.tsx` |
| retired | tray `Picture.tsx`, `Lists.tsx` `Chip` and `BoxPicture`, `Table.tsx` `scope_chips`, views `filed_map`, the context tabs (workspace, definitions, packages, entries) |

**Review** (high, the working tree). **Fixed**: a registry opened on the last tab, not components; a package row found its package by name; the flight timer was never cleared (a second flight was cut short); a reference's head said *usage*; the overview laid both maps out on every pick (now once per graph); a leaf's facts scanned every line (self-loops indexed); `where_map` copied the chip's body sum (`body_of`); read-only tables were handed a fresh no-op; a package's overview drew a card. **The sweep** now clicks a place's box on its title (`lighting.test.ts`): with library places the map sampled small boxes whose middle is a use's tile, so a centre click picked the use. **Seen, not fixed**: a read-only tray's definitions and packages tables still show their edit controls (they never read `NOOP`; older than this build).

### Review 2026-10-31

**Scope**: e7082d0 to the working tree, code only. **Fixed**:

| Fix | Where |
|---|---|
| levels froze after an interrupted flight (the hold cleared only when xyflow resolved) | stage `room.ts` `useFocus`: held for the flight's length |
| map chips and cards kept stale tiles, `defines`, `upright`, `diagram` (memo compared the tile count only) | stage `nodes.tsx` `seen` |
| lines with different ends (multiplicity, role) folded into one `×n` | views `block.ts` `once` keys on `ends` |
| the explorer recomputed every row's look on each hover | web `App.tsx` `rowLook` memoised |
| the tray's chip kept measuring a gone element going chip ↔ box | tray `Lists.tsx` `Chip` |
| a self-relation counted no line on a leaf | views `facts.ts` `counted` |
| `look` refused `layout` on a usage, the one setting it keeps; `define_from` moved it off | core `components.ts` `USAGE_KEYS`, read by `sources.ts`, `look`, `define_from` |
| a source card's settings were blamed on the file drawing it | core `sources.ts`: the note names the card |
| `line_name` and `any_fact` written out twice | views `library.ts` `line_name`; `map.ts` uses `any_fact` |

**Answered**: *Decided* `usage places` and `merged lines`; both built with the tray structure.

### The tray structure mockup

**What it settles**: one tray, the same on every selection — every tab laid out alike, card on the left with the tab's filters under it, its list on the right. Rules are in *Decided* (`tray structure`, `tray`); the mockup gives them values and settles the questions below.

| Part | Do |
|---|---|
| **file** | `docs/design/mockups/tray-structure.html`, published as a private artifact and added to *Mockups*. Load the `artifact-design` skill first. Plain HTML, opens in a browser |
| **start from** | `tray-lists.html` (v9): its CSS, bands, rows, shared columns and hover lighting are agreed. Take values from the built tray: `tray.css` `.tray-body` (`--pad` 12, `--gap` 16, `--stack` 8, `--lead` `clamp(220px, 26cqi, 320px)`), breakpoints 560 / 960, the explorer's rows (`explorer.css`: mark, name, count right and quiet, colour edge) |
| **elements** | from the shop: a use (*Storefront*, service), a definition with uses (*block*), a record definition (*Customer*), a diagram (*Checkout saga*), a line (*Gateway → Storefront*), an element with nothing to list (a definition with no uses), and a definition used inside another definition (*Decided* `usage places`: its library place listed beside model places) |
| **tab set** | one bar for all: overview · card · settings · components · usages · contents. Show a matrix of which tab each element enables; a disabled tab is drawn, never hidden. A line's *line* tab is gone into *card* |
| **layout per tab** | the card column (card at its width, nothing captioned over it), then the filter groups under it; the tab's list on the right. **Overview** stays card → chip → answers. **Card and settings** keep their key list under the card: show whether it is the same component as the filter rows |
| **filter rows** | explorer rows local to the tab: a mark, a name, a count right; **single-select**, an *all* row first; the chosen row in the accent wash, as a picked explorer row. Groups by tab: **components** its sections (attributes, ports, behaviours, tags, constraints); **usages** its places, then a *subtypes* group; **contents** a *scope* group (layer, workspace) above a *kinds* group (blocks, interfaces, relations, groups, notes), replacing the table's filter bar. **None** where there is nothing to filter |
| **right column** | the list the filter narrows: components' banded sections, usages' lists by place (records as tables), contents' table kept whole. Show *all* and one row chosen side by side |
| **widths** | the tray at about 1200 px (two columns, contents' table wide), at 760 (two columns, narrow list), at 520 (one column) |

**Questions the mockup answers**: all decided 2026-10-31 (*Decided* `tray filters`, `overview`); question 1 changed after the mockup: faint and inert, no tip:
1. **the disabled tab**: faint and inert, or faint with a tip saying why
2. **filters below 560 px**: the rows over the list, or folded to a row of chips
3. **a filter kept per tab**, or reset as the element changes
4. **hovering a filter row**: lights its members on the canvas and on the card, as list rows do, or nothing
5. **counts** that agree with the tray head's facts strip, and where they would say the same thing twice
6. **the json chip** and the contents tab's *text* band: where they sit in the shared layout

**Built** 2026-10-31: *Build 2026-10-31* above.


## Status

| Area | State |
|---|---|
| vision (design.md *Vision*) | **updated**: models are translated, then shown; display first, basic edits second; the tray informs first |
| language, chip, box, card, line, diagram, hover, row | **drafted and agreed**, in docs/design; chip.md updated 2026-10-31 (depth, headers, names cut short, rows vs texture) |
| overview tab | **agreed**: overview.md, mockup *overview-forms* |
| components and usages tabs | **agreed**: tray.md, mockup *tray-lists* |
| contents tab | **built** 2026-10-31: kinds as filter rows, *definitions* on a package or the workspace |
| tray structure | **built** 2026-10-31, committed 274be17 |
| where it lives, scopes as elements | **built** 2026-11-01: committed 6ec08d6; the whole map with the path given room and the element unnamed uncommitted (*Build 2026-11-01*) |
| card and settings tabs | **open**; for now the card tab also carries the attribute editor and *add port*, which left the components tab |
| design.md rules → docs/design | **decided, not done**: design.md keeps the vision; its *Perspectives*, *Cards* and *Interfaces and lines* rules move into docs/design |
| implementation | steps 1–9, the tray structure and scopes committed (6ec08d6); the where-it-lives map's last turn uncommitted; remaining work in *Next session* |


## Mockups

**Kept in `docs/design/mockups`, each also published as a private artifact.** Each opens as a plain HTML file in a browser. They hold the working values (sizes, gaps, colours, thresholds) the docs leave out; take numbers from them, rules from the docs.

| File | Artifact | Shows | Current |
|---|---|---|---|
| map-forms.html | claude.ai/artifact/V51AuxwtrD58Ud9N9vPsr6 | the map under one zoom: levels by on-screen size, hysteresis, fades; leaf chips vs cards; box title counts; explorer rows with colour edges and counts | levels, text band, counts and row edges are current. Leaves as cards was **rejected** (leaves stay chips); the tinted card fills are superseded by the colour rules |
| line-forms.html | claude.ai/artifact/1iAiTDpx91cGzPgeBLioND | the wire swatch per relation type; lines with anchors, names beside the stroke, ends on hover; relation chips on the map; colour roles before and after | swatch, anchors, names beside, hover ends and colour roles are current. Option C's end chips and v1's pills were **rejected**. Tags as rings was **rejected** (solid dots) |
| overview-forms.html | claude.ai/artifact/JutRvRnfzhDoNfGQk42WxR | every overview case today vs proposed, one renderer, nine cases incl. a line; tray head as identity row; width reflow | **current** (v3). Its head shows `Def`; the role is now a badge (tray.md) |
| where-map.html | claude.ai/artifact/6bJLvaqSnbrDp3qFVQXn3w | the where-it-lives map drawn from the shop's real map for four elements at two tray heights: round 1 (A to F, the element alone), round 2 (G to J, its room's structure), round 3 (K, a strip over a compact tree of the major block; L, the whole map as a compact tree) | **built** 2026-11-01 as L with K's room opened and the path given room |
| tray-structure.html | claude.ai/artifact/AWPk3WLe4tGwkg7oSNjJvV | one tab bar for seven elements (enable matrix, tips on faint tabs), card column with filter rows (chips below 560), contents with scope and kinds, library usage places, keys as the same rows; questions 1–5 drawn both ways; the overview's where-it-lives map; a verdict for each | **v5, built** 2026-10-31; question 1 changed after v4 to faint and inert, no tip |
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
| **tags** | solid dots, named beside the dot where the line has room, decided as zoom changes it; the first tags keep their names, the last fall back to a dot first; a dot is sized by the text (2026-10-31); the legend says the colours, in a tags section after the blocks |
| **usage places** | 2026-10-31: **a definition holding uses is a place** where a definition is used, grouped under its package, beside models' layers: a pattern composed in the library lists its parts' uses in the usages tab, overview and hover card, so counts and lists agree (today `use_place` keeps model places only) |
| **merged lines** | 2026-10-31: picking any line a `×n` stands for lights and picks the one line drawn for it |
| **count boxes** | 2026-10-31: a count in a facts strip sits in a quiet neutral box, never the element's colour, so it never reads as a child chip |
| **map** | two gaps by rank (2026-11-02): 24 between a model's parts and what holds them, else 6 (grid cells excepted, above); a model's parts framed heavier, what they hold quieter; overflow folds into *+n more*; boxes and explorer rows carry counts; rows wear a colour edge; no hover card on rows |
| **components share data, not concepts** | 2026-10-31: a package consumes another's output as a data contract, never its concepts. The explorer takes a row's colour and count from its host (`rowLook`; the app asks views `row_look`); the law is explorer → core, theme |
| **hover** | one hover card for chips, tiles, box titles, cards and lines; it shows the large face |
| **diagram** | a head band in the kind's colour under the crumbs |
| **tray** | head = identity row + role + facts; every tab reflows by the tray's width, breaking at 560 / 960 px; **one spacing** (`--pad`, `--gap`, `--stack`) and **one card column** (`--lead`) on every tab, the card filling it, nothing captioned over it (2026-10-31) |
| **overview** | sections card → picture → path → why it matters → how it is used → where it sits; **picture = where it lives** (2026-11-01): the library or models map at its top two branching levels, drawn as the map draws them, re-laid to fill the column under the card, the element lit inside its major block (overview.md); the path heads the answers column, the *where it lives* answer dropped; lines listed, never a picture; own answers only; gaps as quiet filled rows, editor only |
| **lists** | every section it has, at once; a section names itself (semibold, an i for what it is), no count; each list opens on a band, label flush left, count right; rows on shared columns with a rule under each; hovering a row lights it on the card; an empty element says so in one sentence |
| **settings tab** | shows the card at each level side by side (to revisit with the card tab) |
| **tray structure** | 2026-10-31: **one tab set for every selection**, a tab that does not apply to the element disabled, never hidden (which tabs, and their order, to expand). **Every tab has one layout**: the card column on the left, the tab's list on the right. **Under the card, the tab's filters**: rows like the explorer's (local to the tab), each with its count, narrowing the list beside them — components its sections, usages its places then subtypes, contents its kinds. They replace the contents table's filter bar; contents keeps its table on the right. An element with nothing to filter (usages with no uses) shows no rows. **Filters are single-select**, an *all* row first. **Contents' scope** retired: the workspace's contents are the workspace element's (`scoped elements`). **A line's card tab is `card`** (its *line* tab folds in), so tab names stay fixed. The overview's picture is its where-it-lives map |
| **scoped elements** | 2026-10-31: the workspace and a package are elements like any other, each scoped to what it holds, on the same tab set. **Their card is their map** (2026-11-01): the workspace's the whole map, a package's its own; every tab of theirs on the shared card column. **The library and the models sections both show the workspace**; a package row shows its package; a registry its package on components. The context tabs (workspace, definitions, packages, entries) and contents' *scope* group retire. The workspace's settings are the display |
| **lighting** | 2026-10-31: **the canvas lights what the tray is about**: the pick, else a list's lit row (`onLit`), else on a map the area gone to. One truth read by every node, line and tile, never React Flow's `selected`; **one picked look** (accent ring and wash) on every surface; what stands for a block (a place's box) lights and picks as it |
| **tray filters** | 2026-10-31: a faint tab is inert and carries no tip (changed after the mockup); below 560 px the filter rows sit over the list (no chips form); a filter is kept per tab and resets to *all* when the element changes; hovering a filter lights its members on the card and canvas; bands keep their counts beside the filters; json stays at the tab bar's right end, faint on a use; card and settings keys use the filter rows, a value in place of the count, no *all* row. The tab matrix is in tray.md |
| **tray tabs** | superseded by `tray structure`: one tab set for every element, a line's *line* tab folded into *card*. Still standing: contents' text moves to the overview's answers column, last; the json chip stays for now |


## Open

| Item | Notes |
|---|---|
| **card and settings tabs** | their style and how edits fit (the tray informs; editing is not its purpose); how they say definition apart; whether the settings ladder stays. Built as today until then |
| **card faces** | a pass of their own: the facts strip repeating a table's count (*3 attributes* over three rows); a large face at level 2 drawn empty below its head; the head cramped over the table |
| **where it lives** | built 2026-11-01. In a quarter-height tray the card leaves the picture its 140 px floor, so the tray scrolls; whether the picture goes beside the card there. A narrow room's name hides (*Customer facing* beside Storefront); whether the room always keeps its name, cut short. On a busy map, blocks beside the swelled path thin out (the shop's *Parts* beside *Records*); the 45% and 50% shares are first guesses |
| **tray follow-ups** | from the build: the definitions table keeps its own chip bars (folders, groups), not filter rows; a library entry (interface, tag, type, constraint) enables only *card*, its overview and usages to build; a package's *usages* (who imports it) not built, faint; the workspace's and a package's *card* tab faint (their map is drawn in the card column, the tab has no keys yet); a read-only tray's definitions and packages tables still show edit controls |
| **design.md migration** | move *Perspectives*, *Cards*, *Interfaces and lines* and *Relation ends* rules into docs/design, then cut design.md to the vision; retire the old corner rule and the connections picture there |
| **packages/tray/docs/tray.md** | its context and tab tables follow the built tray; the rest still describes the editing tray (keys and choices, add rows, tables). Fold into docs/design or retire once the card tab settles |
| **drafts** | every docs/design file says *Draft, for agreement*; mark them settled once each built step is agreed on the samples |
| **seen, not fixed** | a line routed along a frame's border with its name on it (the Orders diagram's *placed*); a swimlane's lane chips too short for upright names at 1920 px fit; a lone use (internal's *Shop*) loses its name to its box's heading line; narrow upright chips in services' *relations* at 1920 px read two letters |
| **tags between dots** | where a tag's name cannot fit, its dot keeps the room it was given, so a gap can open between two dots (the tray's chip at some widths). Pushing the dot to the far end touched the corner icon; left as is |
| **a deep-zoomed card's table** | in an entered diagram, zoomed far in, a card's table rows ride up over its facts strip (seen before 2026-10-31's changes too); take with the card faces pass |
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
| 10 | **docs**: mark built docs settled; migrate design.md; update code-homes.md | docs | code-homes.md current (2026-10-31 review); **migration and settling not done** |
| 11 | **tray structure**: one tab set, filter rows under the card, contents on the shared layout; library definitions as usage places and merged lines lighting their kept line (*Decided*); then card and settings tabs, context tabs | tray `Tray.tsx`, `Lists.tsx`, `Carried.tsx`, `Usages.tsx`, `Table.tsx` | **not started**; mockup next (*Next session*) |
| 12 | **card faces pass** | theme `face.tsx`, views `face.ts` | **not started**; agree the look first |

- **reuse what is there**: views `about.ts` holds facts, previews and hover; `map.ts` picks levels by room. Extend them rather than add parallel paths
- **no tests until each step's look is agreed** on the samples
