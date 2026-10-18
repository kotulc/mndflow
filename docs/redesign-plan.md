# Redesign plan

**What the model's elements are, and the steps that built them: agreed 2026-10-15, built in two passes on 2026-10-16, then a review pass the same day; the component model and registries agreed and the first of it built 2026-10-17.** Blocks carry meaning; everything simpler is a component a block carries, an annotation on a layer, or organization. design.md and definitions.md now state the result; this plan holds what is left, what is open, the decisions behind it, and how to pick up. **Once it is finished, next-plan.md is revised from it.**


## Where things stand

| | |
|---|---|
| **committed** | the first pass, the second and the review pass (47ac49a … f6cfde4); the tray keys, chip colour and the registry's tray tab (4c16213, *Draft registry tab*). See *Built*, *Review pass* and *Components and registries* |
| **built, uncommitted (2026-10-17)** | registries on the canvas — the `registry` view, a treemap by home folder, zooming into an entry's uses; the `treemap` layout for container blocks (new `views/src/treemap.ts`); the showcase tagged, with *System › Estate* as a treemap layer (new `System/5-estate.yaml`); the docs. See *Components and registries* |
| **suggested commit** | *Open registries on the canvas as treemaps that zoom into an entry's uses; add a treemap layout for container blocks; tag the showcase* |
| **verified (2026-10-17)** | `npm run typecheck` clean; `npm test` 286/287, the one failure pre-existing (*Known issues*); `npm run lint:css` clean; showcase `check` clean. Driven in Edge on the showcase: the card tab at tray widths 1198, 758 and 398 with a long description and a definition's coloured chips; the tags registry in the tray, matrix and list, with fourteen tags seeded, the readout and crosshair; the tags and types registries opened from the library on the canvas, a tile picked (the tray shows the tag), double-clicked into its uses (the camera flies from the tile), a card there picked, back up the crumbs; *Estate* as a treemap with its groups and its note beside; no console errors. No new tests: the design is still moving |
| **reviewed** | 10-16 passes as below; the review pass and this session's work not yet code-reviewed |
| **next** | a code review of the review pass and of *Components and registries*; then the component model's remaining steps (*Remaining work* 12–16); the user answers *Open questions*; then next-plan.md is revised |


## Remaining work

| # | Work | Done when |
|---|---|---|
| 8 | **mndmap rows on regions** | mndmap's content rows are regions, on its next re-pin of the kit (see *Known issues*, kit) |
| 11 | **regions, stage B** | a diagram dropped into a region draws open; relations join its interfaces across bands (needs open question 4) |
| 12 | **ports as data** | interfaces leave `blocks`: `Block.ports`, keyed by id, on any block that *has ports*; interface definitions are library entries; lines name a port by id; `ports_of`, `ports_on`, `through.ts`, the tray's interface keys and the CLI follow; base, catalogue and showcase regenerated. Gives the interfaces registry |
| 13 | **one resolver** | `setting_of` (core `defs.ts`) reads a link by id from block definitions and library entries alike, whole chain, nearest first; library entries gain `type` (what they extend) and `settings`; a component definition styled as a block definition is |
| 14 | **types as attribute definitions** | a type carries its format, unit and look, read by the one resolver; the attribute table and the class and entity faces read them |
| 15 | **the components tab** | the tray lists everything a block carries — ports, attributes, tags — in one tab (decided after 12–14) |
| 16 | **purpose first** | a block's first tab says, visually, why it matters and how it is used — its content or its diagram — rather than its keys |
| 17 | **constraints** | `expects` becomes a component: a rule in the library, applied to blocks, with its own registry |


## Open questions

**The user's to answer; none blocks the build that is in.**

| # | Question | Today | Options |
|---|---|---|---|
| 1 | **base colour**: should plain definitions differ by default? | base `block` says `family: primary`, no `hue`, so definitions extending it with no colour of their own all read alike; the parent-relative shade shows only under a definition that sets `hue` and `vary` | give `block` a `hue` and `vary` (every subtype its own shade, the default look changes everywhere); or leave colour to each package |
| 2 | **grid definitions' view** | a definition extending `grid` (`swimlane`, `sequence diagram`) opens on `internal` once it has parts, and on nothing before: navigate `feeds` asks `is_grid`, and a definition is never a holder | let a grid definition open on its allocation or sequence view, a lattice of its own; or keep it internal |
| 3 | **where the notation relations live** | `association`, `composition`, `aggregation`, `dependency`, `flow` and `behaviour` ship in the `diagrams` package; the plan had said `base`. Base holds only what the engine treats differently, and these are data | keep in `diagrams`; or move to `base` so every workspace has them |
| 4 | **region stage B** | not built | how a dropped diagram sizes, whether it is edited in place, how lines route through band edges |
| 5 | **type structure** | `many`, `optional` only | maps, unions, generics, added as a translator needs them |
| 6 | **values on organization** | *has values* is off `folder` and `group`, so a translator's folder cannot carry a value | keep off (origin is `source`); or give it back |
| 7 | **colour role off the canvas** | the tray, explorer and hosts draw a definition filled | keep canvas only; or outline in the tray too |
| 8 | **region from the rail** | from a selection's menu, or empty from the room's | also a tool in the rail's group |
| 9 | **base as a palette** | base is the floor every kind extends, listed whole in the library. Traits with no base kind: *has records* (architecture's `database`, `queue`), *is behaviour* (`diagrams`), *has head* | keep base the floor and add a curated palette apart from the library; or add `collection` and `behaviour` to base; or hide base's annotation and organization kinds, which gestures make. Leaning: keep base the floor, a palette apart. Answer with 3 |
| 10 | **treemap from the rail** | `treemap` is a definition's layout, set in its settings; the rail offers only `free` and `auto` | also offer it on the rail; or keep it a definition's, as `page` is |
| 11 | **dragging in a treemap** | moving a card by hand hands the layer to `free`, as any layout does, which drops the treemap | keep the rule; or refuse a drag on a treemap layer, as on a page |


## Known issues

| Area | Issue |
|---|---|
| **tests** | views `seat.test.ts` › *crosses straight where a group note sits square beside the group* fails on the showcase's `System::Deployment`; it failed before the redesign began |
| **end words** | on a class diagram a role and multiplicity can sit on the line's name or another end's words: placed from the run alone (stage `Wire.tsx` `words_at`), never against what is drawn |
| **empty region, layered** | a region made empty on a `layered` layer lands over a card: `layered` places a band as a node and never spans it (views `layered.ts`) |
| **picked region** | draws a full outline rather than its band |
| **empty-layer words** | centred on the canvas rather than the room, so on a small room they run past its frame (stage `stage.css` `.empty`) |
| **narrow tiles** | a treemap with few, uneven weights gives a lone light tile a thin slice (an entry's single use in a second folder), its name cut short; the title says it whole |
| **treemap room** | *Estate*'s room is wider than its map: the room takes the layer's least size and the canvas's page |
| **registry scale** | registries are worked out on every draw and rescan every block per entry (`users_of`); a per-graph index (see *speed*) would serve them |
| **speed** | every library lookup (`tag_at`, `type_at`, `is_tag`, `library_home`) rescans every package; `uses_of`, `project` and `form_of` ask per element, so large workspaces go quadratic. A per-graph index fits, built where nothing mutates (`sources.ts` writes libraries while reading them) |
| **kit** | not re-released; `packages/kit/.types` is stale. mndmap's re-pin meets: the library; interfaces as blocks (`fromPart`/`toPart`); `ends`; views `class` and `er` (was `table`); sections `library` and `model` (was `definitions`, `structure`); no definition view; attribute `key` a word; the trail from the package down (`trail_of`), and `Crumbs` taking `head`, Stage's `view` prop gone; `Chain.drawn` gone; `layer_of`, `drawn_in`, `holders_in`, `edges_in` and `inline` without `flat`; `users_of` ids, lines included — besides the renames in next-plan.md *Rough edges* |


## Decisions

**Taken with the user, 2026-10-15 and 2026-10-16.** Each is stated in design.md; this is the record of why.

| Area | Decision |
|---|---|
| **categories** | five: block, relation, component, annotation, organization. Storage is not category |
| **types and tags** | data on the package root's `library`, by id; never blocks |
| **interfaces** | blocks of an interface kind (base `interface`, *is interface*), on any block that *has ports*; definable, extendable and customizable as blocks are. A usage wears its definition's, read through. Chosen over a port list on the definition (the first pass), which only a definition could hold |
| **tie** | a relation kind with no model meaning, filed with `line` |
| **faces** | one per category: `table` (an entity's schema), `class`, `document`, `picture`, `text` (a label); a relation definition a wire swatch; groups, folders and regions keep their box and band |
| **colour** | the nearest `family` or `hue`; any definition sets its own or its subtypes'; a subtype strays from its parent's shade. On the canvas a definition is outlined, a usage filled; corners stay the card's own |
| **explorer** | *library* first — definitions with their parts, then types and tags per package — and *model*, usages only |
| **definition view** | retired: a definition opens as its usages do; the tray describes it |
| **class and entity** | two faces and two views, as Mermaid's class and ER diagrams; `key` is `primary` or `unique`; enums show as an attribute's type, never a card |
| **relation ends** | data: multiplicity, role, ownership, navigable, on the definition; a line narrows multiplicity and role only; a new relation type only by an explicit gesture. Navigable is not direction (`line.dir` stays). The not-navigable cross sits half a unit in from its end |
| **lines** | a line's name decides nothing. Two definitions may relate, two usages may; a definition and a usage never, but by a tie. **No derived lines**; the class view's *extends* the one exception, for now |
| **behaviours** | a method is a block with *is behaviour* — a flow or state machine (`internal`), a swimlane or a sequence; its interfaces are its signature; it lists in the explorer. A state machine is an internal flow: no `state` view |
| **annotations** | a label always floats aside, never on a line or a region's heading; a block never becomes an annotation, or back; taking a block out of an outer box stays refused |
| **opening** | only what has something to draw opens: an empty block, a group, a region, a label, a note and their definitions open on nothing, and are picked where drawn. The first part comes from the card's *add a part* or the explorer. What opens wears a stacked edge, and only it offers *open* (2026-10-16) |
| **crumbs** | the explorer's path: section, package, folders, blocks, never an annotation. The view word left them for the rail; the way up leads; they fold to `…` from the outside in, never wrap or squeeze (2026-10-16) |
| **definition cards** | a definition's card settings describe its usages; the definition is one plain card in its folder (2026-10-16) |
| **looks** | a reference is solid, so only a group reads dashed; a relation swatch sits in a faint outline; a tie is dotted, swatch and run alike (2026-10-16) |
| **components** | a component is defined once in a package's library and carried by blocks as data: interfaces (ports), attributes (types their definitions), tags; constraints later. A block is a part, abstract or concrete, and may have layers and children. A behaviour stays a block; traits stay the engine's; records stay values (2026-10-17) |
| **ports** | data on any block that *has ports*, keyed by id; reverses *interfaces as blocks* (2026-10-17) |
| **resolver** | one resolver over block definitions and library entries, whole chain — never a second rule for components (2026-10-17) |
| **registries** | one per package per component kind, worked out, never stored, listed in the library as a block is; its *entries* and their *uses*. Opened, a treemap by home folder (*across folders*, *no uses*), an entry zoomed into its uses; the tray reads it as a matrix and a list. Tried and dropped: a matrix in the canvas's place (out of place), folder header rows in the matrix (list-like), upright and slanted column names (2026-10-17) |
| **treemaps** | a layout kind, `treemap`, a definition asks for: each block as large as what it holds; registries use it. Uniform cards stay every other layout's (2026-10-17) |
| **tray keys** | one line each, cut short; the whole value in the choices; a definition's chip in its colour (2026-10-17) |


## Built

**Where each part lives.** code-homes.md has a row per home, dated 2026-10-16.

| Part | Built | Home |
|---|---|---|
| library | `library: { types, tags }` on a package root; ops `set_library`, `set_records`; `collection.ts` renamed `sources.ts`; one id remap for export and collecting | core `library.ts`, `sources.ts`, `file.ts` `renamed` |
| tags and types | tag blocks, the tags folder, form blocks and `value` gone; actions `tag`, `define_tag`, `define_type`; `form_of` reads a form, type or definition; library types minted as `datatype.` ids | core actions `named.ts`, `library.ts` |
| folders | always a box on the parent's layer, never opened; selecting one zooms to it | core `holders.ts` `is_box`; stage `room.ts` |
| annotations | `label`; groups, regions and labels tag their members (`given_of`, `unmember`); none lists in the explorer; labels float clear of region headings | core `library.ts`, `defs.ts` `is_annotation`; views `float.ts` |
| regions | `region` (*is region*, `holder.band`), a band spanning the room, reordered by drag; made from a selection's menu, or empty from the room's | views `arrange.ts`, `bands.ts`; stage `moves.ts`, `Stage.tsx` |
| collections | *has records*, `records.of`, `Block.records`, drawn as a table on the card | views `face.ts` `records_text` |
| interfaces | blocks of an interface kind; `ports_of`, `ports_on`; read through as `usage/port`; `part_end`, `stored_of` take an edit home; actions `interface`, `port`; ops `set_port`, `mark_port` | core `tree.ts`, actions `relations.ts`; views `through.ts`; tray `components.ts` |
| faces and colour | `card.face` adds `class`, `text`; marks `definition`, `relation`, `directed`; definitions outlined on the canvas; relation swatch; parent-relative shade | views `look.ts`, `derive.ts`; theme `face.css`; stage `flow.css` |
| sections | core `EDITOR`: `library`, `model`; `on_side`; per-package types and tags rows; the library's bar adds a part | core `sections.ts`, `navigate.ts`; explorer `rows.ts`, `chain.ts`, `Explorer.tsx` |
| no definition view | a definition opens on its chain's view; `views/definition.ts`, core `aspects.ts` gone | core `navigate.ts` `lens_of` |
| class and entity | views `class`, `er`; stored lines with their ends; class face fields then signatures; `key` PK, UK, FK; attribute links (`links.ts`) gone | views `classes.ts`, `face.ts` `class_table` |
| relation ends | `Relation.ends`, `def.ends`; `ends_of`; action `end`, op `set_ends`; `mixed` refusal; heads, cross, end words; tray *from end* and *to end* | core `ends.ts`, actions `relations.ts`; views `scene.ts`; stage `Wire.tsx`; tray `pairs.ts` `ended` |
| behaviours | *is behaviour* (`block.behaviour`); `behaviours_of`, `signature_of` | core `ends.ts`; `diagrams` package |
| base and data | base filed `blocks`, `relations`, `components`, `organization`, `annotations`; `diagrams` adds `behaviour`, `er_diagram` and the five notation relations; the showcase gains stored associations, a composition, Order's `place` behaviour, `Data/4-schema.yaml`; patterns' interfaces are entries again | `packages/defs/src`, `samples/showcase/src`, `public/packages` |


## Components and registries

**Built 2026-10-17, uncommitted.** code-homes.md has the homes.

| Part | Built | Home |
|---|---|---|
| tray keys | one line a key, cut short; the whole value in the choices, a description typed there; the card tab by the tray's width | tray `Source.tsx`, `Choices.tsx`, `Entry.tsx` (`wrap`), `tray.css` |
| chip colour | a chip standing for a definition wears its family or hue | tray `Choices.tsx` `paint`, `preview.css` |
| registries | `Registry`, ids, entries and uses | core `library.ts`; views `registry.ts` |
| registry tab | the tray's *entries*: matrix (folder column, swatches, flat names at one pitch, readout, crosshair) and list; opens on the list below three entries | tray `Registry.tsx`, `Tray.tsx`, `tray.css` |
| registry view | a `registry` view kind; opened from the library's *types* and *tags* rows; entries by home folder; an entry's uses; leaving and holding | core `navigate.ts`, `sections.ts`, `components.ts`, actions `blocks.ts`; views `registry.ts`, `block.ts`; stage `nodes.tsx` `Tile`, `flow.css`; options `groups.ts`; web `App.tsx` |
| treemap layout | `layout.kind: treemap`, on d3-hierarchy | views `treemap.ts`, `arrange.ts`; core `types.ts` `LAYOUTS` |
| showcase | eleven tags across Containers, Context, Store and the flows; *System › Estate*, the showcase's diagrams as a treemap | `samples/showcase/src` |


## Review pass

**Fixed after the user drove the build, 2026-10-16.** code-homes.md has the homes.

| Area | Fixed | Home |
|---|---|---|
| reveal | picks in place wherever the canvas draws the block; never follows a reference, which the canvas's double-click does itself | core `navigate.ts` `reveal_at`; stage `Stage.tsx` |
| choosing a row | a package row picks as any row; a row inside an opened package picks in place; a part row stays off the canvas and lights under its usage | web `App.tsx` `choose`; explorer `Explorer.tsx` |
| parts in the model | a usage's read-through parts list again | core `sections.ts` `branch_of` |
| the library's reveal | asks core `on_side`, so a part opened unfolds the library to it | explorer `Explorer.tsx` |
| crumbs | the section, then the explorer's path, folded to fit | views `derive.ts` `trail_of`; stage `Crumbs.tsx`; theme `shell.css` |
| opening | on contents only; the stacked edge; *open* and *add a part* on the card menu; opening nothing picks in place | core `names.ts` `opens`, `navigate.ts`; views `derive.ts`; stage `flow.css`, `Stage.tsx` |
| definition cards | `arrange` and `card.height` not read for a definition itself, so base's annotations sit evenly | core `defs.ts` `arrange_of`; views `size.ts` `free_height` |
| camera | a pick taller than a scrolled page's view is brought in by its top, so a package or folder reads from its heading | stage `room.ts` `settle` |
| tray | usages list the workspace on a whole section, and never a definition | tray `Usages.tsx`, `Table.tsx`, `rows.ts` |
| explorer bar | *add folder* files in the workspace's package or folder in focus | explorer `Explorer.tsx` |
| looks | reference solid; swatch outline; tie dotted | `packages/defs/src/base`; theme `face.css` |
| debt | dead `flat` parameter and `Chain.drawn` gone; `users_of` counts lines; a `flushSync` warning on package-view picks | core `holders.ts`, `tree.ts`, `library.ts`; web `App.tsx` |


## Handoff

| Need | Where |
|---|---|
| **the goal** | design.md and definitions.md, updated with this work 2026-10-16 |
| **what follows this plan** | next-plan.md, to be revised once this plan is finished |
| **where each rule lives** | code-homes.md |
| **standing rules** | never commit, suggest a message; update docs only when directed (this plan directs its own, design.md's, definitions.md's and the package docs'); no tests for unsettled design, but fix the ones a change breaks; no legacy migrations — on a schema change run `npm run base` and `npm run samples`; consolidate duplicated rules and record them in code-homes.md; files are LF — write them with the Edit tool, or `newline=""` from Python, never a text-mode write on Windows, which turns every line CRLF |
| **verify** | `npm run typecheck`; `npm test`; `npm run lint:css`; `npm run start -s -w @mnd/cli -- check ../../samples/showcase/workspace.json` → `clean` |
| **regenerate data** | `npm run base` (base package), `npm run samples` (catalogue packages and the showcase) |
| **drive** | the `vitest` skill: `npm run dev`, read the port from the log, Playwright on installed Edge from the scratchpad. A fresh browser opens the showcase (`mndflow.yaml`). A folder row unfolds by its mark; a section header draws its section from above; the room's menu is a right-click on its wall; the tray's keys lie below the fold until it is enlarged. A double-click on a card's name renames it, so open by its border or its OPEN button; an empty block does not open, so give it a part first (its menu's *add a part*). Rows are positional: find them by `.explorer li` with the label, and unfold by the mark. Stop the Vite servers you start |
| **schema facts** | Graph is `{ root, blocks, edges }`. Library on a package root. Interfaces: blocks under their owner with `side`, `at`, `flow`; read through as `usage/port`, met by `fromPart`/`toPart`. Ends: `Relation.ends`, `def.ends`. Behaviours: kinds with `block.behaviour`. Records: `Block.records`, `records.of`. Regions: `holder.band`. Attribute `key`: `primary`, `unique` |
| **registries** | a registry's id is `<package>/@tags` or `<package>/@types` (core `registry_id`); an entry opens by its own id. Both open on the `registry` view. The tray holds one as `{ of: "registry", registry }`. A tile's node id is its entry's, which is what makes the camera fly into it |
| **samples** | showcase: `Records/*` (entities, associations, Order's behaviour), `Data/1-model.yaml` (class), `Data/4-schema.yaml` (entity), `System/2-containers.yaml` (interfaces), `System/4-bands.yaml` (regions, a label), `System/5-estate.yaml` (a treemap layer); tags with descriptions in `Specs/public-api-spec.yaml`, used across `System/1-context.yaml`, `System/2-containers.yaml`, `Data/3-store.yaml` and the flows. Catalogue: `packages/defs/src/packages/` (`architecture` patterns with interfaces, `diagrams`) |
