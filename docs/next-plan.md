# Next plan

**What is left to do, in one place.** Merged 2026-10-12 from the next, sample, cards, CLI, structure and simplification plans; revised 2026-10-18 when the redesign plan finished and folded in here. Everything built is gone from here: the code and the goal docs (design.md, definitions.md) record it, and git history keeps the old plans, the redesign's included.


## Where things stand

| | |
|---|---|
| **the redesign** | finished 2026-10-18: categories, components and registries, ports as data, the diagram kinds and their notation, the gallery, diagrams drawn as the mockup, the overview tab, the rail on a fixed layout. Committed through 9898e64; the last pass (diagrams as the mockup, overview, rail, its review fixes) uncommitted |
| **suggested commit** | *Draw diagrams as the mockup, add the overview tab: notation shapes (`card.shape`, `layout.shape`), a line writes only its own name, sequence activations, layered class and entity diagrams, room ports coloured, the overview tab with promotion, no layout choice on a fixed kind* |
| **first, ask** | *Decide*: the redesign's open questions, step 0's open rows, then the older rows |
| **then** | step 0, then step 1 |
| **the kit** | not re-released; mndmap's re-pin meets everything under *Rough edges* · **kit** |
| **verify** | *Commands*: everything green, the gallery `check` and `review` clean and drawn in the app |
| **verified (2026-10-18)** | `npm run typecheck` clean; `npm test` 284/285, the one failure the old seat test (*Rough edges* · **tests**); `npm run lint:css` clean; gallery `check` and `review` clean. Driven in Edge: each of the eight *Diagrams* opened (flow's diamond, dot and ring; state's rounder states and its back transition clear of the first; sequence's heads, bars, phases and messages; class and entity layered, crow's feet readable; *Checkout*'s wall port coloured, its line off the wall straight); the overview on *Checkout*, *Order states*, *Schema*, a reference lifeline (drawn as *Checkout*) and the *Order* definition; an empty block made and promoted to `flow` from its overview; a state made on *Order states* and a drag there refused; the rail without *free* and *auto* on *Order states* and *Estate*, with them on *Checkout* and *Fulfilment*. No console errors. No new tests: the design is still moving |


## Order

| # | Work | Done when |
|---|---|---|
| 0 | **tray keys** | every tray input is a key and its choices: the workspace tab converted, step 0's rows answered |
| 1 | **CLI fixes** | `check` on a broken file exits 1; `export --sysml --round` on the repo map brings back all 490 relations |
| 2 | **diagram views** | their known issues fixed |
| 3 | **canvas gestures** | a diagram is built fast from the canvas alone |
| 4 | **open decisions** | each row of *Decide* answered and recorded in design.md |
| 5 | **simplification leads** | each lead consolidated into one home, recorded in code-homes.md |
| 6 | **CLI surface** | the acceptance run in *CLI* passes |

*Rough edges* is a backlog, taken when a step passes near one.


## 0 — Tray keys

**The card and settings tabs are built** (tray.md *Card, line and settings*): the drawing over every key in the left third, the lit key's choices in the right two thirds. What is left:

| Task or question | |
|---|---|
| **the workspace tab** | still the old label-and-answer rows (name, tags, display, file, export): convert it to keys and choices |
| **attribute values in files** | a card source writes values as top-level keys, so a value named like a schema key vanishes (*Rough edges* · **diagram files**). Keep them flat, or nest them under `values:` — unambiguous, one more level to write, the core reader and writer and the gallery changed. Recommended: nested |
| **usage settings in the schema** | the tray offers a usage no settings, but `Block.settings` still allows a usage's override. Drop it from the schema, or keep it for files and arrangement (`card.arrange` on a usage) |
| **traits** | on the card tab; they sat on the old settings tab. Keep them with what it is, or move them to settings |
| **long chip lists** | a usage's *type* and *extends* list every definition, gathered by package and folder; a filter box, or folding a place, may be wanted |
| **unset quantities** | a slider's key with nothing said reads `—` where its slider shows a fallback; read the fallback instead |
| **entry styling** | hue chips on an entry's keys. Serve entries from the definition settings tab (families, borders, faces), or keep hue only |


## 1 — CLI fixes

| Task | Where |
|---|---|
| exit codes: `check` / `review` exit 1 on faults and on a file that is not JSON | cli `main.ts` |
| `fixture:` prefix on sources, so a fixture name never shadows a file | cli |
| `@mnd/defs` indent | cli `package.json` |
| an unknown id reads as itself in refusals, not `"missing" holds nothing of that sort` | core `actions/` |
| SysML ends written as qualified paths and resolved by path; read-back stores `label`, not the escaped `name` | cli `sysml.ts` |
| drop `Said.kind`: nothing reads it | core `session.ts` and its readers |


## 2 — Diagram views

| Issue | |
|---|---|
| **end words** | on a class diagram a role and multiplicity are placed from the run alone (stage `Wire.tsx` `words_at`), never against what is drawn, so two ends sharing a card's anchor (*Order*'s composition and association) overlap |
| **a sequence's self message** | its loop runs over a reply arriving on the same row (*Checkout saga*'s *log step* and *reserved*) |
| **state line words** | event, guard and action on a transition: deferred 2026-10-18 |
| **grid definitions' view** | a `sequence` or `swimlane` definition opens on `internal` once it has parts, and on nothing before: navigate `feeds` asks `is_grid`, and a definition is never a holder. Deferred 2026-10-18 |
| **swimlane lanes** | the allocation view draws a swimlane's steps and the lines between them, but not the old view's lanes (a header card at each lane's top, the lane unnamed); whether allocation should |
| **empty region, layered** | a region made empty on a `layered` layer lands over a card: `layered` places a band as a node and never spans it (views `layered.ts`) |
| **treemap room** | *Estate*'s room is wider than its map: the room takes the layer's least size and the canvas's page; a box's walls still take a share of a small map |


## 3 — Canvas gestures

| Candidate | |
|---|---|
| **drag from a port to empty canvas** | makes a connected card |
| **tab** | adds a sibling to the selected card |
| **drop a definition** | from the explorer onto the canvas, as a usage (check what `drop_of` already covers) |
| **region from the rail** | a region is made from a selection's menu, or empty from the room's; also a tool in the rail's group? (*Decide*) |

Start in stage `Flow.tsx` · `gestures.ts` (gestures), `draw.ts` · `drag.ts` · `moves.ts` (drawing and drops), `Stage.tsx` (menus per gesture), ending in core `actions/` (`create`, `relate`, `interface`, `note`).


## 4 — Decide

**The user's to answer.** The first block came from the redesign; none blocks the build that is in.

| Question | Today | Options |
|---|---|---|
| **base colour**: should plain definitions differ by default? | base `block` has `family: primary` and no `hue`, so plain definitions all look alike | give `block` a `hue` and `vary`; or leave colour to each package |
| **region stage B** | not built: a diagram dropped into a region would draw open, relations joining its interfaces across bands | how a dropped diagram sizes, whether it is edited in place, how lines route through band edges |
| **type structure** | `many` and `optional` only | maps, unions and generics, added as a translator needs them |
| **values on organization** | *has values* is off `folder` and `group` | keep it off (`source` carries origin); or give it back |
| **colour role off the canvas** | the tray, explorer and hosts draw a definition filled | canvas only; or outlined in the tray too |
| **region from the rail** | from a selection's menu, or empty from the room's | also a tool in the rail's group |
| **the palette** | dropped 2026-10-18 ("forget it for now"): kinds are chosen in the tray, an empty block promoted from its overview | revisit if dragging kinds onto a model is wanted |
| **`resolved` in core?** | it lives in views `through.ts`; `is_named`, `shown_name`, `stamps_of` and `opens` still resolve a stand-in on their own | |
| **the door and unknown fields** | refuse or report `of` on a non-reference, `traits` on a usage or line, a relation's `dir`. Today a file storing `dir` reads in silently and its arrows vanish | |
| **keep libavoid?** | design.md and spec.md describe routing round cards. If kept: LGPL-2.1, a beta (`0.5.0-beta.5`), a ~490KB wasm, also in the kit mndmap vendors | |
| **arrange, generally** | crossing reduction by reordering within reading order is the candidate | |
| **double-click a grid** | lands on its name and renames it; Enter opens it | |
| **`define` and ids** | actions.md gives `define` an `id?`; the code takes none and the CLI says ids are never chosen. If no caller needs one, it leaves actions.md | |
| **editing table and sequence** | design.md keeps them projections the canvas never drags or creates on; whether either should be edited from the canvas after all | |
| **the package view** | design.md says a package opens on the package view scoped to it; the code still draws the folder layer view (core `ViewKind` `folder`), which now serves packages alone | |
| **tied notes in a file** | `note:` on a block or the file is built provisionally (core `diagram.ts`); confirm the syntax, or pick another | |
| **layered on dagre** | `layered` runs on `@dagrejs/dagre` (MIT, synchronous), since `project` is synchronous and ELK is not; class and entity diagrams now use it too | keep it, or make projection async for ELK |
| **source fetch** | `bring` takes a package from a URL; an arbitrary fetched file still needs a translator to become blocks (ST.5) | |


## 5 — Simplification leads

Take each as code-homes.md's *How to take one* says, then record its home there.

| Lead | Suspicion | Likely home |
|---|---|---|
| **mndmap `edits.ts`** | a second action system with its own placement rules (`in_collection`, `filed`) | core's actions on mndmap's held graph, or one shared placement check |
| **two kind readers** | views `marks_of` decides what a card reads as on its own | `role_of`, with `marks_of` mapping its answer to classes |
| **`?? graph.root`** | the workspace as a fallback for "no layer" (explorer, views `derive.ts`, stage `moves.ts`, core) | each site says what it means |
| **explorer `listed()`** | the chain re-derives domain and structure membership | core `is_domain` / `in_domain` / `tree_of` |
| **tray listings** | the tray's definition grouping may re-list what the chain lists | the chain's listings |
| **stage menus** | `Stage.tsx` offers per kind by base strings | the registry's scopes and `when` |
| **highlight rules** | `lights`, `holds` and the edge in `Explorer.tsx` each read the chain and picks differently | one function from the canvas view and the chain |
| **two kinds of interface id** | core `is_interface` answers for a port as drawn (`block/port`, via `port_at`) and for a seat block views lays in for one | one reading, once views seats ports directly |
| **overview counts** | tray `Overview.tsx` names each kind's counts and reads notation by base id (`NOTATION`, `decision`) | the kind's own definition, if counts become data |
| **speed** | every library lookup (`tag_at`, `type_at`, `is_tag`, `library_home`) rescans every package; `uses_of`, `project`, `form_of`, registries' `users_of` and the overview's usages and *same records as* ask per element | a per-graph index, built where nothing mutates (`sources.ts` writes libraries while reading them) |


## 6 — CLI surface

**The CLI is the one terminal: an agent writes meaning as data, sees what the person will see, and hands over that view.** The file is the state, written in place; one JSON result per verb; references are an id or a path `a::b::c` (plus `$key` in a script); the CLI adds no rules.

| Verb | Writes | Does |
|---|---|---|
| `new <file>` | yes | an empty workspace |
| `do <file> <action> [k=v…]` · `do <file> <script.jsonl \| ->` | yes | one action, or a script: all or nothing |
| `show <file> [ref] [--depth n] [--text]` | no | the tree, or one element whole |
| `find <file> <text>` | no | matches by name, then type, then body |
| `check <file \| dir>` | no | faults and notes, each naming its element, of a file or a source folder collected first; exit 1 on faults |
| `collect <dir> [-o out.json]` | no | a source folder (definitions, card sources, diagram files) as one package or workspace file |
| `help [action]` | no | the registry's actions and arguments |
| `draw <file> [ref] [flags] -o x.png` · `--open` | no | the kit `Viewer` screenshotted headless; `--open` hands the same view to a browser |
| `bring <file> <name \| path \| url>` | yes | a package, frozen, through the door |
| `export <file> [--package <name> \| --sysml [--round]]` | no | the file folded clean, a package, or SysML |

Values: `k=v` text, `k:=json`, `k=@path` a file's text. Exit 0 done, 1 refused or faults, 2 usage. Writing verbs take `--dry`.

| Step | Tasks | Done when |
|---|---|---|
| **write** | action args: `ref` and `many` on `Arg`; one name per role (`ids`, `grid`, `type`); `at` split into `cell` / `line`; lists as JSON lists; positional args declared. Path resolution with candidates in core. cli `state.ts`, `args.ts`, `refs.ts`; `new`; `do` inside `session.batch` | `new`, then a script making three blocks, relating two by `$key` and describing one from a `.md`, `check`s clean; a refused last line leaves the file byte-identical |
| **read** | `show`, `find` (cli `read.ts`); `help` from the registry | an agent with no docs lists the actions, finds `Pump`, reads it and relates it |
| **see** | `frame/` page mounting the `Viewer`; `draw` on Playwright with an installed Edge or Chrome; `--open` via the web app loading a handed-off file at mount; `project` and `outline` leave the CLI | the repo map's package and `core` layers come back as PNGs matching the app; `--open` shows the same view with no picker |
| **packages and faults** | `bring`; `export --package`; `Fault.id` set by every door fault; every unknown definition and independent fault reported; `review` folded into `check` | a hand-written package is checked, brought, used as a `type` and exported byte-stable; `check` names an orphan, a dangling edge and two unknown types |
| **speed and docs** | bundle `mnd` with tsup; rewrite the CLI README; close the agent-surface question in design.md (ST.25); refresh the `vitest` skill (it still describes localStorage and the terminal) | a call returns in well under a second |

**Acceptance:** this repo mapped through the CLI alone: `new`, one generated script, `check` clean, `draw` and revise, `draw --open` hands the view over. No ids in hand, no browser editing, no hand-placed geometry.


## Rough edges

| Area | Edge |
|---|---|
| **layout** | `auto` reads in explorer order, so a line between cards far apart in a column runs its length until *arrange*; a tall card makes a tall row in a `rows` run; a card related to a member inside a group lines up with the group, not the member |
| **routing** | two upright names in one 2-unit gap meet; libavoid ignores a second pin on the same spot of a shape (pins are keyed by spot and shared); a line to an inherited port inside a subtype is not met at the subtype room's copy (`part_id`) |
| **cards** | marks on a dark table card are faint (half opacity); a reference previewing a table ignores its own look's border; check that notes draw through `CardFace`, not only `NoteNode` |
| **tray** | a line's preview never shows `line.dir`; a definition's resolved chain chip is gone; in a read-only tray *view definition* is disabled with everything else |
| **overview** | the thumbnail mounts a second React Flow, so node description ids (`react-flow__node-desc-1`) repeat in the page; on the open layer with nothing picked it draws what the canvas already draws; a tag with no hue paints its share of the bar plain |
| **tests** | `packages/views/test/seat.test.ts` › *crosses straight where a group note sits square beside the group* fails on the gallery's `Visuals::Groups`. It failed before the redesign began |
| **camera and page** | picking on the profile re-draws it lower than it first opens; the package view scrolls its top under the crumbs; a short port drag lands short (React Flow's drag threshold) |
| **React** | `flushSync was called from inside a lifecycle method`, seen opening the profile and the package view from a layer; not traced |
| **packages** | `base` collects alphabetically (`annotations` before `blocks`); a definition file holds no parts, so a pattern's parts live in its package's `package.json`; base's `decision` and `architecture`'s share a name, so `type: decision` resolves to whichever the lookup finds first |
| **names** | unique siblings are refused only by `create`, `rename` and `move`; `label` (grid cells) and `group` write names unchecked, so a path can still find none. One home: where a name is written |
| **diagram files** | a value named like a schema key (`side`, `note`, `w`…) never shows in a card source; a card drawn in by `source` keeps only its type, body, tags, settings, name and values; the web app's collect loads no `packages` a file lists |
| **annotations** | a label floats aside, so on a layer cut into regions it lands across a band's heading; a picked region draws a full outline rather than its band; an empty layer's words centre on the canvas rather than the room (stage `stage.css` `.empty`); an aside stays inside the room, so beside a wall's port on a narrow room it floats wherever there is space |
| **ports** | design.md gives a port its definition's settings, values and tags; ports hold name, type, flow, seat and description only |
| **kit** | not re-released; `packages/kit/.types` is stale. mndmap's re-pin meets: views `overhead` → `package`, `grid` → `allocation`; `card.place` → `card.arrange`, the *is aside* trait gone; card sources say `type`/`def`, not `extends`; `describe` writes `description` and `write` the body; `Block.description` and `set_description`; tray `Identity`, `Settings`, `Looks` gone (`Part` replaces `Looks`); theme and kit shell export `useZone`, and `Stage` takes `keys`. Since 2026-10-14: the library, its entries extending and styled, `interfaces` and `constraints` kinds; ports as data (`Block.ports`, `fromPort`/`toPort`, `set_ports`; `set_port`, `mark_port` gone; `ports_on` returns ports with `holder`; `port_at`, `flow_of`); `constraints` on blocks and lines, `expects` gone; base `attribute`, `constraint`, `tag`, domain `component`; the tray's components tab (`Carried`); `ends`; the diagram kinds in base, `role_<kind>` icons, `diagram_kind`, `kind_fits` (`KIND_FAMILIES`), `is_worked`, `shape_named`, `fixed_layout`, `DIAGRAM_QUESTIONS`, `NOTATION`; the notation in base, the `diagrams` package gone; `card.shape`, `layout.shape` (`SHAPES`); `label_of` a line's own name only; `KINDS` in types, `library_map`; views `tint_attrs`, `card_shape`; the seed block's id `first`; views `class` and `er`; sections `library` and `model`; no definition view; attribute `key` a word; `trail_of`, `Crumbs` taking `head`, Stage's `view` prop gone; `Chain.drawn` gone; `layer_of`, `drawn_in`, `holders_in`, `edges_in`, `inline` without `flat`; `users_of` ids, lines included; the tray's `overview` tab and `thumb` prop, stage `Thumb`; options `Chrome.fixed` |
| **mndmap** | its content rows are not yet regions; it meets the renames in *kit* and the new schema on its re-pin |
| **follow-ups** | lineage and links as a package structure rather than a view; boxes for a definition's usages and the groups they belong to |


## Tests, once settled

**None until the user says a design is settled.** Candidates then: `diagram_of` / `diagram_subject` / `lens_of` on a stand-in; `class_graph`, `sequence_scene`; `long_form`, `path_to`, `def_ref`, `wanted`; `runs`, `layered`; `sibling_named`; `boot_of`; `tags_stated` / `traits_stated`; `statements` / `said_of`; `ports_of`; `holds_values` and the `field` refusal; `collect`; `given_of`, `typed_as`; `seat_all` (a second line between a pair), `routes_of`; `dir_of`; `relate` joining a twin; `is_reference` / `resolved`; `is_tie`; `beside`; `kind_fits`, `fixed_layout`; `label_of`; `card_shape`. The CLI's tests pin refs, all-or-nothing scripts and write-in-place, never wording or coordinates.

`packages/views/test/far.test.ts` is a temporary debug print with no assertions: delete it.


## Standing rules

| Rule | |
|---|---|
| **one task at a time** | do it, verify it, stop; report a failed check with its output |
| **no commits** | suggest a message |
| **no legacy** | on a schema change re-run `npm run base` and `npm run samples`; the door repairs no old shapes |
| **docs are the goal** | code catches up; report where code and a doc disagree. Update docs only when directed |
| **one rule, one home** | fragmentation found is consolidated in the same task and recorded in code-homes.md |
| **the gallery is the visual check** | a simple display, on base alone, of each diagram kind, the registries, the faces and the visuals; a visual feature added or changed shows up in the folder it belongs to, and in the coverage table. Non-visual capabilities need not appear |
| **files are LF** | write them with the Edit tool, or `newline=""` from Python; a text-mode write on Windows turns every line CRLF |

### Gallery coverage

Every block is a diagram file under `samples/gallery/src`, on base alone; `npm run gallery` collects them into the workspace and `public/packages/gallery.json`. A diagram says what it is in its `description`, which its overview reads.

| Visual | Where |
|---|---|
| a markdown card from `source` | `about.yaml` (Overview), `about.md` |
| one diagram per kind, in kind order: internal (typed ports, a room port on the left wall with a note), flow (start dot, decision diamonds, end ring), state (rounder states, transitions, a back transition), sequence (heads, activation bars, a reference lifeline, a self message, a reply), swimlane, class and entity (layered, crow's feet), treemap | `Diagrams/1-checkout.yaml` … `Diagrams/8-estate.yaml` |
| the records: table faces, types with unit, format and hue, stored associations and a composition, a behaviour with ports, a collection definition | `Records/` |
| tags with parents and colours; a constraint applied by name; interface definitions and ports typed by them | `Registries/1-tagged.yaml`, `2-owned.yaml`, `3-wired.yaml` |
| every small face and icon, a label above, notation blocks, a reference | `Faces/1-small.yaml` |
| every large face: table, class, document, picture, headless, sized, a collection's records, a hand-sized note, a label | `Faces/2-large.yaml` |
| every `line.dir` and every base relation, with ends | `Visuals/1-lines.yaml` |
| nested groups with tied notes, a grid with headers | `Visuals/2-groups.yaml` |
| regions with headings, a label tied to a card | `Visuals/3-bands.yaml` |
| families, hues, hatch, faded, dashed, thick | `Visuals/4-colour.yaml` |

### Commands

| Do | Command |
|---|---|
| check everything | `npm run typecheck`, `npm test`, `npm run lint:css` |
| re-write the gallery | `npm run samples` (packages, then the gallery collected from `samples/gallery/src`); the gallery alone `npm run gallery` |
| re-collect packages | edit under `packages/defs/src/packages/<name>/`, then `npm run packages`; `base` under `packages/defs/src/base/`, then `npm run base`. `public/packages/doc.json`, `requirements.json`, `sysml.json` have no source folders: edit them by hand |
| check a file or a source folder | `npm run start -s -w @mnd/cli -- check ../../samples/gallery/workspace.json` → `clean`, and `review` the same → `clean`; a folder the same: `check ../../samples/gallery/src` |
| list a layer | `npm run start -s -w @mnd/cli -- outline ../../samples/gallery/workspace.json <layer name or id>`; gallery ids are minted from file paths (`yaml.Diagrams.1-checkout`) |
| drive the app | the `vitest` skill (stale in places): `npm run dev`, read the port from the log, Playwright on installed Edge from the scratchpad. A fresh browser opens the gallery (`mndflow.yaml`). Right-click on empty ground asks a name by `window.prompt` (answer it with `page.on("dialog")`); a folder row unfolds by its `.mark`; find rows by `.explorer li` with the label. Open a card by a double-click on its border (a click on its name renames; a port on its left wall takes a click there) or select + Enter. Scope canvas selectors to `.stage`: the tray's overview draws its own React Flow. The tray's *take the full height* button shows the whole overview. Stop the Vite servers you start |

### Schema facts

| | |
|---|---|
| **graph** | `{ root, blocks, edges }`. Library on a package root: `types`, `tags`, `interfaces`, `constraints` (core `KINDS`), each entry `{ id, name, description?, type?, settings? }` |
| **ports** | `Block.ports`, drawn as `block/port`, met by `fromPort`/`toPort`, written by `set_ports` |
| **the rest** | constraints: ids on blocks and lines. Ends: `Relation.ends`, `def.ends`. Behaviours: kinds with `block.behaviour`. Records: `Block.records`. Regions: `holder.band`. Diagram families: `KIND_FAMILIES`. Shapes: `card.shape`, `layout.shape` (`SHAPES`). Base ids include `start`, `end`, `decision`, `transition`: never reuse them as block ids |
| **registries** | id `<package>/@<kind>` (core `registry_id`); an entry opens by its own id; both open on the `registry` view; the tray holds one as `{ of: "registry", registry }`; a tile's node id is its entry's |
