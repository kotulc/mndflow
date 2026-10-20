# Next plan

**What is left to do, in one place.** Merged 2026-10-12 from the next, sample, cards, CLI, structure and simplification plans; revised 2026-10-18 when the redesign plan finished and folded in here. Everything built is gone from here: the code and the goal docs (design.md, definitions.md) record it, and git history keeps the old plans, the redesign's included.


## Where things stand

| | |
|---|---|
| **the redesign** | finished 2026-10-18, committed through c151145 |
| **block design** | begun 2026-10-19 (step 0): base re-filed, notation one category, uncommitted |
| **gallery** | rebuilt 2026-10-19 as one shop (step 1), uncommitted |
| **suggested commit** | *Re-file base by blocks, diagrams and notation: annotations and marks are one notation category that never lists, organization folds into blocks, notation definitions draw as faint cards with their marks' icons, labels centred* |
| **first, ask** | step 0's open rows, then *Decide* |
| **then** | step 0, then step 1 |
| **the kit** | not re-released; mndmap's re-pin meets everything under *Rough edges* · **kit** |
| **verify** | *Commands*: everything green, the gallery `check` and `review` clean and drawn in the app |
| **verified (2026-10-19)** | `npm run typecheck` clean; `npm test` 285/285; `npm run lint:css` clean; gallery `check` and `review` clean, the source folder `check` clean. Driven in Edge: base's package view (five folders, notation as faint cards with mark icons) and its explorer (notation definitions listed); the gallery from *Overview* (context, layered) to *Shop* (regions in rows, a tied label), *Storefront* (room ports on both walls), *Payments* › *Payment retry*, *Checkout saga* and *Fulfilment* (reference lifelines and lanes), *Deployment*, *Estate*, *Records* › *Order* › *Order states*, *Data* › *Model* (Order lists *Order states()*), *Faces*. No console errors. A code review's findings fixed: sibling order after placed files, definitions never notation, a notation stand-in drawn plain, paths through a placed block, definition files never placed in a block |


## Order

| # | Work | Done when |
|---|---|---|
| 0 | **block design** | blocks, diagrams and notation read as one design: base re-filed, the rail is the palette, the tray's choices scoped by family |
| 1 | **gallery as one system** | the gallery's diagrams describe one system from several sides, over a small library of abstract blocks; the joins visible from any block |
| 2 | **tray keys** | every tray input is a key and its choices: the workspace tab converted, step 2's rows answered |
| 3 | **CLI fixes** | `check` on a broken file exits 1; `export --sysml --round` on the repo map brings back all 490 relations |
| 4 | **diagram views** | their known issues fixed; **next session: lines** — crossings, and names on lines in tight spaces (*Shop*'s *pay* over *reserve*, end words, upright names in narrow gaps) |
| 5 | **canvas gestures** | a diagram is built fast from the canvas alone |
| 6 | **open decisions** | each row of *Decide* answered and recorded in design.md |
| 7 | **simplification leads** | each lead consolidated into one home, recorded in code-homes.md |
| 8 | **CLI surface** | the acceptance run in *CLI* passes |

*Rough edges* is a backlog, taken when a step passes near one.


## 0 — Block design

**Blocks and diagrams are the major concepts the explorer lists; notation and components live inside the block or diagram that holds them.** Every definition draws as an outlined card, notation's faintly.

| Task | |
|---|---|
| **re-file base** | built 2026-10-19: folders `blocks` (with `folder`, `grid`), `diagrams`, `notation` (annotations and marks), `components`, `relations`; notation usages never list; notation definitions a faint card wearing their mark's icon; `label` centred |
| **the rail is the palette** | a *notation* group offering what the open diagram's family draws with (flow: `start`, `decision`, `end`; state: `start`, `end`; every kind: `note`, `label`, `group`, `region`), drawn by drag or click. The diagram kind is set from the rail too: the major families as a few buttons, never all eight. The main way to set a kind |
| **type chips by family** | the tray's *type* offers a diagram only diagram kinds of its family, a part only what its parent's kind allows; never a mark for a diagram |
| **faces** | built 2026-10-19: one design language by group (design.md *Faces*): parts and diagrams read left under a corner (`service · B6`), notation centres with no corner; a card shows what it has (large where it has content, small where a name alone; `layout.cards` forces either); a label one unit tall and as wide as its words; treemap tile names never cut; the overview's glance always a drawing, a leaf's or folder's its neighbourhood, fitted whole and refitted on resize. Open: a named note shows only its name on the small face; the alias on holders (group, region headings) not yet drawn; a compact toggle in the rail for `layout.cards: small` |
| **open** | base folders collect alphabetically (`components` before `diagrams`); whether the package view should leave `notation` out as the explorer leaves its usages |

## 1 — Gallery as one system

**The gallery is the gold standard for how the tool is used.** Today each diagram stands alone and its parts are one-off blocks extending base.

| Task | |
|---|---|
| **abstraction vs usage** | a small gallery library of abstract blocks (a `page`, a `service`, a `store`…); diagrams use them, e.g. *Checkout*'s *Cart*, *Pricing*, *Payment* are `page` usages |
| **one system, many sides** | built 2026-10-19: *Overview* is the shop's context; *Shop* holds its services in regions and its sides (saga, fulfilment, deployment, estate); a service's own diagram and behaviours open from it; *Order states* is the Order record's behaviour; lifelines, lanes and tiles are references to the shop's parts. `collect` reads a directory named as a file as that file's block |
| **make the joins visible** | a block's overview lists every side it appears on: its layer, its behaviours, the diagrams referring to it |
| **lines carrying records** | a message or line typed by the record it carries (Order, Payment): a schema change, deferred (*Decide*) |
| **behaviours on their owner's layer** | the saga, fulfilment and the rest draw as cards among Shop's services, kept apart by a region; whether a behaviour should draw on its owner's layer at all |

## 2 — Tray keys

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


## 3 — CLI fixes

| Task | Where |
|---|---|
| exit codes: `check` / `review` exit 1 on faults and on a file that is not JSON | cli `main.ts` |
| `fixture:` prefix on sources, so a fixture name never shadows a file | cli |
| `@mnd/defs` indent | cli `package.json` |
| an unknown id reads as itself in refusals, not `"missing" holds nothing of that sort` | core `actions/` |
| SysML ends written as qualified paths and resolved by path; read-back stores `label`, not the escaped `name` | cli `sysml.ts` |
| drop `Said.kind`: nothing reads it | core `session.ts` and its readers |


## 4 — Diagram views

| Issue | |
|---|---|
| **end words** | on a class diagram a role and multiplicity are placed from the run alone (stage `Wire.tsx` `words_at`), never against what is drawn, so two ends sharing a card's anchor (*Order*'s composition and association) overlap |
| **a sequence's self message** | its loop runs over a reply arriving on the same row (*Checkout saga*'s *log step* and *reserved*) |
| **state line words** | event, guard and action on a transition: deferred 2026-10-18 |
| **grid definitions' view** | a `sequence` or `swimlane` definition opens on `internal` once it has parts, and on nothing before: navigate `feeds` asks `is_grid`, and a definition is never a holder. Deferred 2026-10-18 |
| **swimlane lanes** | the allocation view draws a swimlane's steps and the lines between them, but not the old view's lanes (a header card at each lane's top, the lane unnamed); whether allocation should |
| **empty region, layered** | a region made empty on a `layered` layer lands over a card: `layered` places a band as a node and never spans it (views `layered.ts`) |
| **treemap room** | *Estate*'s room is wider than its map: the room takes the layer's least size and the canvas's page; a box's walls still take a share of a small map |


## 5 — Canvas gestures

| Candidate | |
|---|---|
| **drag from a port to empty canvas** | makes a connected card |
| **tab** | adds a sibling to the selected card |
| **drop a definition** | from the explorer onto the canvas, as a usage (check what `drop_of` already covers) |
| **region from the rail** | a region is made from a selection's menu, or empty from the room's; also a tool in the rail's group? (*Decide*) |

Start in stage `Flow.tsx` · `gestures.ts` (gestures), `draw.ts` · `drag.ts` · `moves.ts` (drawing and drops), `Stage.tsx` (menus per gesture), ending in core `actions/` (`create`, `relate`, `interface`, `note`).


## 6 — Decide

**The user's to answer.** The first block came from the redesign; none blocks the build that is in.

| Question | Today | Options |
|---|---|---|
| **base colour**: should plain definitions differ by default? | base `block` has `family: primary` and no `hue`, so plain definitions all look alike | give `block` a `hue` and `vary`; or leave colour to each package |
| **region stage B** | not built: a diagram dropped into a region would draw open, relations joining its interfaces across bands | how a dropped diagram sizes, whether it is edited in place, how lines route through band edges |
| **type structure** | `many` and `optional` only | maps, unions and generics, added as a translator needs them |
| **values on organization** | *has values* is off `folder` and `group` | keep it off (`source` carries origin); or give it back |
| **colour role off the canvas** | the tray, explorer and hosts draw a definition filled | canvas only; or outlined in the tray too |
| **region from the rail** | from a selection's menu, or empty from the room's | also a tool in the rail's group |
| **the palette** | revived 2026-10-19 as the rail (step 0) | which families the rail offers as kinds; whether marks are dragged or clicked in |
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


## 7 — Simplification leads

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


## 8 — CLI surface

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
| **tests** | `packages/views/test/seat.test.ts` › *crosses straight where a group note sits square beside the group* failed on the old `Visuals::Groups`; on *Deployment* (the same groups, laid out among more) it passes. Nothing was fixed: watch it |
| **camera and page** | picking on the profile re-draws it lower than it first opens; the package view scrolls its top under the crumbs; a short port drag lands short (React Flow's drag threshold) |
| **React** | `flushSync was called from inside a lifecycle method`, seen opening the profile and the package view from a layer; not traced |
| **packages** | `base` collects alphabetically (`components` before `diagrams`); a definition file holds no parts, so a pattern's parts live in its package's `package.json`; base's `decision` and `architecture`'s share a name, so `type: decision` resolves to whichever the lookup finds first |
| **names** | unique siblings are refused only by `create`, `rename` and `move`; `label` (grid cells) and `group` write names unchecked, so a path can still find none. One home: where a name is written |
| **diagram files** | a value named like a schema key (`side`, `note`, `w`…) never shows in a card source; a card drawn in by `source` keeps only its type, body, tags, settings, name and values; the web app's collect loads no `packages` a file lists |
| **ports** · **seats** | a port's `side` without `at` is dropped (views `seat.ts` `stated`): a room port saying only `side: right` lands wherever its lines lead. Keep a side said alone, placed along it |
| **paths** | a path names every region and group on the way (`Overview::Shop::Back office::Payments`), though layers look through them |
| **annotations** | a label floats aside, so on a layer cut into regions it lands across a band's heading; a picked region draws a full outline rather than its band; an empty layer's words centre on the canvas rather than the room (stage `stage.css` `.empty`); an aside stays inside the room, so beside a wall's port on a narrow room it floats wherever there is space |
| **ports** | design.md gives a port its definition's settings, values and tags; ports hold name, type, flow, seat and description only |
| **kit** | not re-released; `packages/kit/.types` is stale. mndmap's re-pin meets: views `overhead` → `package`, `grid` → `allocation`; `card.place` → `card.arrange`, the *is aside* trait gone; card sources say `type`/`def`, not `extends`; `describe` writes `description` and `write` the body; `Block.description` and `set_description`; tray `Identity`, `Settings`, `Looks` gone (`Part` replaces `Looks`); theme and kit shell export `useZone`, and `Stage` takes `keys`. Since 2026-10-14: the library, its entries extending and styled, `interfaces` and `constraints` kinds; ports as data (`Block.ports`, `fromPort`/`toPort`, `set_ports`; `set_port`, `mark_port` gone; `ports_on` returns ports with `holder`; `port_at`, `flow_of`); `constraints` on blocks and lines, `expects` gone; base `attribute`, `constraint`, `tag`, domain `component`; the tray's components tab (`Carried`); `ends`; the diagram kinds in base, `role_<kind>` icons, `diagram_kind`, `kind_fits` (`KIND_FAMILIES`), `is_worked`, `shape_named`, `fixed_layout`, `DIAGRAM_QUESTIONS`, `NOTATION`; the notation in base, the `diagrams` package gone; `card.shape`, `layout.shape` (`SHAPES`); `label_of` a line's own name only; `KINDS` in types, `library_map`; views `tint_attrs`, `card_shape`; the seed block's id `first`; views `class` and `er`; sections `library` and `model`; no definition view; attribute `key` a word; `trail_of`, `Crumbs` taking `head`, Stage's `view` prop gone; `Chain.drawn` gone; `layer_of`, `drawn_in`, `holders_in`, `edges_in`, `inline` without `flat`; `users_of` ids, lines included; the tray's `overview` tab and `thumb` prop, stage `Thumb`; options `Chrome.fixed`. Since 2026-10-19: `is_annotation` → `is_notation` (marks and definitions included), `notation_of`, `NOTATION` holding the annotations too, roles `start`, `end`, `decision` and their icons, `is_note` usages only, base folders `diagrams` and `notation` (no `organization`, `annotations`) |
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
| **the gallery is the visual check** | one shop seen from every side, over its own small library (*Parts*, *Records*), plus the faces and visuals the shop does not show; the gold standard for how the tool is used; a visual feature added or changed shows up in the folder it belongs to, and in the coverage table. Non-visual capabilities need not appear |
| **files are LF** | write them with the Edit tool, or `newline=""` from Python; a text-mode write on Windows turns every line CRLF |

### Gallery coverage

Every block is a diagram file under `samples/gallery/src`, on base and the gallery's own *Parts* and *Records*; a directory named as a file holds that file's parts; `npm run gallery` collects them into the workspace and `public/packages/gallery.json`. A diagram says what it is in its `description`, which its overview reads.

| Visual | Where |
|---|---|
| abstract parts and their usages, each its own colour: `actor`, `page`, `service`, `store`, `external` | `Parts/`; used throughout `0-overview/` |
| a context diagram, layered, an untied note | `0-overview.yaml` (Overview) |
| regions with headings, room ports on both walls, a label tied to a card | `0-overview/shop.yaml` (Shop) |
| internal: typed ports, room ports with `side` and `at`, a port note | `0-overview/shop/customer-facing/storefront.yaml` |
| flow (start dot, decision diamonds, end ring), a service's behaviour | `0-overview/shop/back-office/payments/payment-retry.yaml` |
| a collection's records on a usage | `0-overview/shop/back-office/orders.yaml` |
| sequence (reference lifelines, activation bars, a self message, a reply), swimlane (reference lanes), nested groups with tied notes and a grid with headers, treemap of references | `0-overview/shop/how-it-runs/` |
| state (rounder states, a back transition), a record's behaviour | `Records/order/order-states.yaml` |
| the records: table faces, types with unit, format and hue, stored associations and a composition, a behaviour with ports, a store definition | `Records/` |
| tags with parents and colours; a constraint applied by name (`owned` on `service`); interface definitions and ports typed by them | `Parts/service.yaml`, used by every service |
| class and entity (layered, crow's feet), each listing Order's behaviours | `Data/1-model.yaml`, `2-schema.yaml` |
| every small face and icon, a label above, notation blocks, a reference | `Faces/1-small.yaml` |
| every large face: table, class, document, picture, headless, sized, a collection's records, a hand-sized note, a label; a markdown card from `source` | `Faces/2-large.yaml`, `charge-once.md` |
| every `line.dir` and every base relation, with ends | `Visuals/1-lines.yaml` |
| families, hues, hatch, faded, dashed, thick | `Visuals/2-colour.yaml` |

### Commands

| Do | Command |
|---|---|
| check everything | `npm run typecheck`, `npm test`, `npm run lint:css` |
| re-write the gallery | `npm run samples` (packages, then the gallery collected from `samples/gallery/src`); the gallery alone `npm run gallery` |
| re-collect packages | edit under `packages/defs/src/packages/<name>/`, then `npm run packages`; `base` under `packages/defs/src/base/`, then `npm run base`. `public/packages/doc.json`, `requirements.json`, `sysml.json` have no source folders: edit them by hand |
| check a file or a source folder | `npm run start -s -w @mnd/cli -- check ../../samples/gallery/workspace.json` → `clean`, and `review` the same → `clean`; a folder the same: `check ../../samples/gallery/src` |
| list a layer | `npm run start -s -w @mnd/cli -- outline ../../samples/gallery/workspace.json <layer name or id>`; gallery ids are minted from file paths (`yaml.0-overview.shop`) |
| drive the app | the `vitest` skill (stale in places): `npm run dev`, read the port from the log, Playwright on installed Edge from the scratchpad. A fresh browser opens the gallery (`mndflow.yaml`). Right-click on empty ground asks a name by `window.prompt` (answer it with `page.on("dialog")`); a folder row unfolds by its `.mark`; find rows by `.explorer li` with the label. Open a card by a double-click on its border (a click on its name renames; a port on its left wall takes a click there) or select + Enter. Scope canvas selectors to `.stage`: the tray's overview draws its own React Flow. The tray's *take the full height* button shows the whole overview. Stop the Vite servers you start |

### Schema facts

| | |
|---|---|
| **graph** | `{ root, blocks, edges }`. Library on a package root: `types`, `tags`, `interfaces`, `constraints` (core `KINDS`), each entry `{ id, name, description?, type?, settings? }` |
| **ports** | `Block.ports`, drawn as `block/port`, met by `fromPort`/`toPort`, written by `set_ports` |
| **the rest** | constraints: ids on blocks and lines. Ends: `Relation.ends`, `def.ends`. Behaviours: kinds with `block.behaviour`. Records: `Block.records`. Regions: `holder.band`. Diagram families: `KIND_FAMILIES`. Shapes: `card.shape`, `layout.shape` (`SHAPES`). Base ids include `start`, `end`, `decision`, `transition`: never reuse them as block ids |
| **registries** | id `<package>/@<kind>` (core `registry_id`); an entry opens by its own id; both open on the `registry` view; the tray holds one as `{ of: "registry", registry }`; a tile's node id is its entry's |
