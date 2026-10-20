# Next plan

**What is left to do, in order, and what is needed to do it.** Built work is not kept here: the code and the goal docs (design.md, definitions.md) record it, and git history keeps the old plans.


## Status

| | |
|---|---|
| **committed** | through 395b81a (2026-10-19): base filed by blocks, diagrams and notation; the gallery as one shop; `collect` nesting; one design language by group; a card shows what it has; label and treemap names; the overview glance. Verified then: typecheck, 285/285 tests, lint, gallery `check` and `review` clean; driven in Edge, no console errors |
| **uncommitted** | the plan consolidated; handles only while unnamed; one corner row; names cut to the room they have; the gallery split into `samples/model` (the shop) and `samples/elements` (enumerations, a second workspace). Verified: typecheck, 285/285 tests, CSS lint, `check`/`review` clean on both; driven in Edge. Suggested commit: *Split the gallery into model and elements; tidy card corners* |
| **next session** | step 1, lines |


## Order

| # | Work | Done when |
|---|---|---|
| 1 | **lines** | crossings and line words read cleanly on every model diagram |
| 2 | **block design, the rest** | the rail is the palette; the tray's choices scoped by family; faces' open items closed |
| 3 | **model joins** | from any block, every side it appears on is one click away |
| 4 | **tray keys** | every tray input is a key and its choices |
| 5 | **CLI fixes** | `check` on a broken file exits 1; `export --sysml --round` on the repo map brings back all 490 relations |
| 6 | **diagram views** | their known issues fixed |
| 7 | **canvas gestures** | a diagram is built fast from the canvas alone |
| 8 | **simplification leads** | each lead in one home, recorded in code-homes.md |
| 9 | **CLI surface** | the acceptance run in *CLI surface* passes |

*Decide* is the user's, asked when a step reaches a row. *Rough edges* is a backlog, taken when a step passes near one.


## 1 — Lines

| Issue | | Where |
|---|---|---|
| **crossings** | lines cross where reordering would avoid it (*Shop*'s back office). Candidate: crossing reduction by reordering within reading order, as *arrange* does (*Decide* · arrange) | views `arrange.ts`, `layered.ts` |
| **words in tight spaces** | a line's name lands over another's (*Shop*'s *pay* over *reserve*); two upright names in one 2-unit gap meet | stage `Wire.tsx` `words_at`, views `routes_of` |
| **end words** | a class diagram's role and multiplicity are placed from the run alone, so two ends sharing a card's anchor overlap (*Order*'s composition and association) | stage `Wire.tsx` `words_at` |
| **a sequence's self message** | its loop runs over a reply on the same row (*Checkout saga*'s *log step* and *reserved*) | views `sequence.ts` |
| **seats** | a port's `side` without `at` is dropped, so a room port saying only `side: right` lands wherever its lines lead (*Shop*'s `https` on the top wall); libavoid ignores a second pin on the same spot | views `seat.ts` `stated` |


## 2 — Block design, the rest

**Blocks and diagrams are the major concepts the explorer lists; notation and components live inside the block or diagram that holds them** (design.md *Faces*, *Elements*).

| Task | |
|---|---|
| **the rail is the palette** | a *notation* group offering what the open diagram's family draws with (flow: `start`, `decision`, `end`; state: `start`, `end`; every kind: `note`, `label`, `group`, `region`), drawn by drag or click; the diagram kind set from the rail by its major families, never all eight. The main way to set a kind |
| **type chips by family** | the tray's *type* offers a diagram only its family's kinds, a part only what its parent's kind allows; never a mark for a diagram |
| **faces, open** | a named note shows only its name on the small face; holders (group, region headings) wear no handle yet; a rail toggle for the compact view (`layout.cards: small`) |


## 3 — Model joins

The model is one shop seen from every side (*Sample coverage*).

| Task | |
|---|---|
| **make the joins visible** | a block's overview lists every side it appears on: its own layer, its behaviours, the diagrams referring to it |
| **behaviours on their owner's layer** | the saga, fulfilment and the rest draw as cards among *Shop*'s services, kept apart by a region; whether a behaviour should draw on its owner's layer at all |
| **lines carrying records** | a message typed by the record it carries (Order, Payment): a schema change, out of scope until asked |


## 4 — Tray keys

The card and settings tabs are built (tray.md). Left:

| Task or question | |
|---|---|
| **the workspace tab** | still label-and-answer rows (name, tags, display, file, export): convert to keys and choices |
| **attribute values in files** | a card source writes values as top-level keys, so a value named like a schema key vanishes. Keep them flat, or nest under `values:`. Recommended: nested |
| **usage settings in the schema** | the tray offers a usage no settings, but `Block.settings` still allows one. Drop it, or keep it for files and arrangement |
| **traits** | on the card tab; keep them there or move them to settings |
| **long chip lists** | *type* and *extends* list every definition; a filter box, or folding a place |
| **unset quantities** | a slider's key with nothing said reads `—`; read the fallback instead |
| **entry styling** | hue chips on an entry's keys; serve entries from the definition settings tab, or keep hue only |


## 5 — CLI fixes

| Task | Where |
|---|---|
| exit codes: `check` / `review` exit 1 on faults and on a file that is not JSON | cli `main.ts` |
| `fixture:` prefix on sources, so a fixture name never shadows a file | cli |
| `@mnd/defs` indent | cli `package.json` |
| an unknown id reads as itself in refusals | core `actions/` |
| SysML ends written and resolved by qualified path; read-back stores `label`, not the escaped `name` | cli `sysml.ts` |
| drop `Said.kind`: nothing reads it | core `session.ts` |


## 6 — Diagram views

| Issue | |
|---|---|
| **state line words** | event, guard and action on a transition (deferred) |
| **grid definitions' view** | a `sequence` or `swimlane` definition opens on `internal` once it has parts: navigate `feeds` asks `is_grid`, and a definition is never a holder |
| **swimlane lanes** | the allocation view draws no lane headers; whether it should |
| **empty region, layered** | an empty region on a `layered` layer lands over a card (views `layered.ts`) |
| **treemap room** | *Estate*'s room is wider than its map |


## 7 — Canvas gestures

| Candidate | |
|---|---|
| **drag from a port to empty canvas** | makes a connected card |
| **tab** | adds a sibling to the selected card |
| **drop a definition** | from the explorer onto the canvas, as a usage (check `drop_of`) |

Start in stage `Flow.tsx` · `gestures.ts`, `draw.ts` · `drag.ts` · `moves.ts`, `Stage.tsx`, ending in core `actions/`.


## 8 — Simplification leads

Take each as code-homes.md's *How to take one* says, then record its home there.

| Lead | Suspicion | Likely home |
|---|---|---|
| **mndmap `edits.ts`** | a second action system with its own placement rules | core's actions, or one shared placement check |
| **two kind readers** | views `marks_of` decides what a card reads as on its own | `role_of`, `marks_of` mapping its answer to classes |
| **`?? graph.root`** | the workspace as a fallback for "no layer" | each site says what it means |
| **explorer `listed()`** | the chain re-derives domain and structure membership | core `is_domain` / `in_domain` / `tree_of` |
| **tray listings** | the tray's definition grouping may re-list what the chain lists | the chain's listings |
| **stage menus** | `Stage.tsx` offers per kind by base strings | the registry's scopes and `when` |
| **highlight rules** | `lights`, `holds` and the edge in `Explorer.tsx` each read the chain differently | one function |
| **two kinds of interface id** | `is_interface` answers for a drawn port and for a laid-in seat | one reading |
| **overview counts** | tray `Overview.tsx` names each kind's counts by base id | the kind's own definition |
| **speed** | library lookups rescan every package; `uses_of`, `project`, `users_of`, `collect`'s `on_layer` ask per element | a per-graph index |


## 9 — CLI surface

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


## Decide

**The user's to answer**, when a step reaches a row.

| Question | Today | Options |
|---|---|---|
| **arrange, generally** | *arrange* reorders a layer once, on request | crossing reduction by reordering within reading order (step 1) |
| **the palette's kinds** | the rail is to set a diagram's kind (step 2) | which families it offers as buttons; whether marks are dragged or clicked in |
| **region from the rail** | a region is made from a selection's menu, or empty from the room's | also a tool in the rail |
| **base colour** | base `block` has `family: primary` and no `hue`, so plain definitions all look alike | give `block` a `hue` and `vary`; or leave colour to each package |
| **colour role off the canvas** | the tray, explorer and hosts draw a definition filled | canvas only; or outlined in the tray too |
| **values on folder and group** | *has values* is off both | keep it off (`source` carries origin); or give it back |
| **region stage B** | a diagram dropped into a region would draw open, relations joining its interfaces across bands | how it sizes, whether it is edited in place, how lines route through band edges |
| **type structure** | `many` and `optional` only | maps, unions and generics, as a translator needs them |
| **`resolved` in core?** | it lives in views `through.ts`; `is_named`, `shown_name`, `stamps_of`, `opens` resolve a stand-in on their own | move it to core |
| **the door and unknown fields** | a file storing `dir` on a relation reads in silently and its arrows vanish | refuse or report `of` on a non-reference, `traits` on a usage or line, a relation's `dir` |
| **keep libavoid?** | LGPL-2.1, a beta (`0.5.0-beta.5`), a ~490KB wasm, also in the kit mndmap vendors | keep; or route without it |
| **layered on dagre** | `layered` runs on `@dagrejs/dagre` (synchronous); ELK is async | keep it; or make projection async for ELK |
| **double-click a grid** | lands on its name and renames it; Enter opens it | |
| **`define` and ids** | actions.md gives `define` an `id?`; the code takes none | drop it from actions.md if no caller needs one |
| **editing table and sequence** | projections the canvas never drags or creates on | whether either should be edited from the canvas |
| **the package view** | the code still draws the folder layer view (`ViewKind` `folder`) for packages | scope the package view to the package, as design.md says |
| **tied notes in a file** | `note:` on a block or the file is provisional (core `diagram.ts`) | confirm the syntax, or pick another |
| **source fetch** | `bring` takes a package from a URL; an arbitrary file still needs a translator (ST.5) | |


## Rough edges

| Area | Edge |
|---|---|
| **layout** | `auto` reads in explorer order, so a line between cards far apart in a column runs its length until *arrange*; a tall card makes a tall row in a `rows` run; a card related to a member inside a group lines up with the group, not the member |
| **routing** | a line to an inherited port inside a subtype is not met at the subtype room's copy (`part_id`) |
| **cards** | marks on a dark table card are faint; a reference previewing a table ignores its own look's border; notes still draw through `NoteNode`, not only `CardFace` |
| **tray** | a line's preview never shows `line.dir`; a definition's resolved chain chip is gone; in a read-only tray *view definition* is disabled with everything else |
| **overview** | the glance mounts a second React Flow, so node description ids repeat in the page; on the open layer with nothing picked it draws what the canvas already draws; a tag with no hue paints its share of the bar plain |
| **tests** | `seat.test.ts` › *crosses straight where a group note sits square beside the group* failed on the old *Groups*; on *Deployment* it passes. Nothing was fixed: watch it. `packages/views/test/far.test.ts` is a debug print with no assertions: delete it |
| **camera and page** | picking on the profile re-draws it lower than it first opens; the package view scrolls its top under the crumbs; a short port drag lands short |
| **React** | `flushSync was called from inside a lifecycle method`, opening the profile and the package view from a layer; not traced |
| **packages** | a definition file holds no parts, so a pattern's parts live in its package's `package.json`; base's `decision` and `architecture`'s share a name, so `type: decision` resolves to whichever the lookup finds first |
| **names** | unique siblings are refused only by `create`, `rename` and `move`; `label` and `group` write names unchecked. One home: where a name is written |
| **paths** | a path names every region and group on the way (`Overview::Shop::Back office::Payments`), though layers look through them |
| **diagram files** | a value named like a schema key never shows in a card source (step 4); a card drawn in by `source` keeps only its type, body, tags, settings, name and values; the web app's collect loads no `packages` a file lists |
| **annotations** | a label floats aside, so on a layer cut into regions it can land across a band's heading; a picked region draws a full outline rather than its band; an empty layer's words centre on the canvas rather than the room |
| **ports** | design.md gives a port its definition's settings, values and tags; ports hold name, type, flow, seat and description only |
| **mndmap** | its content rows are not yet regions; it meets the renames below on its re-pin |
| **follow-ups** | lineage and links as a package structure rather than a view; boxes for a definition's usages and the groups they belong to |

### Kit re-pin

The kit is not re-released and `packages/kit/.types` is stale. mndmap's re-pin meets every rename since its pin:

views `overhead` → `package`, `grid` → `allocation`; `card.place` → `card.arrange`, the *is aside* trait gone; card sources say `type`/`def`, not `extends`; `describe` writes `description` and `write` the body; `Block.description` and `set_description`; tray `Identity`, `Settings`, `Looks` gone (`Part` replaces `Looks`); theme and kit shell export `useZone`, and `Stage` takes `keys`. Since 2026-10-14: the library, its entries extending and styled, `interfaces` and `constraints` kinds; ports as data (`Block.ports`, `fromPort`/`toPort`, `set_ports`; `set_port`, `mark_port` gone; `ports_on` returns ports with `holder`; `port_at`, `flow_of`); `constraints` on blocks and lines, `expects` gone; base `attribute`, `constraint`, `tag`, domain `component`; the tray's components tab (`Carried`); `ends`; the diagram kinds in base, `role_<kind>` icons, `diagram_kind`, `kind_fits` (`KIND_FAMILIES`), `is_worked`, `shape_named`, `fixed_layout`, `DIAGRAM_QUESTIONS`, `NOTATION`; the notation in base, the `diagrams` package gone; `card.shape`, `layout.shape` (`SHAPES`); `label_of` a line's own name only; `KINDS` in types, `library_map`; views `tint_attrs`, `card_shape`; the seed block's id `first`; views `class` and `er`; sections `library` and `model`; no definition view; attribute `key` a word; `trail_of`, `Crumbs` taking `head`, Stage's `view` prop gone; `Chain.drawn` gone; `layer_of`, `drawn_in`, `holders_in`, `edges_in`, `inline` without `flat`; `users_of` ids, lines included; the tray's `overview` tab and `thumb` prop, stage `Thumb`; options `Chrome.fixed`. Since 2026-10-19: `is_annotation` → `is_notation` (marks included, usages only), `notation_of`, `NOTATION` holding the annotations too, roles `start`, `end`, `decision` and their icons, `is_note` usages only, base folders `diagrams` and `notation` (no `organization`, `annotations`); `collect` nesting a file's parts in its named directory; `DEFAULTS` `card.label: inside`, `card.alias: show`, `card.align: left`; views `handle_of` the corner (type and handle), `face_of` by what a card has, `name_w`; stage `Thumb` `focus` and refit; the tray's `thumb(id, focus?)`


## Reference

### Standing rules

| Rule | |
|---|---|
| **one task at a time** | do it, verify it, stop; report a failed check with its output |
| **no commits** | suggest a message |
| **no legacy** | on a schema change re-run `npm run base` and `npm run samples`; the door repairs no old shapes |
| **docs are the goal** | code catches up; report where code and a doc disagree. Update docs only when directed |
| **one rule, one home** | fragmentation found is consolidated in the same task and recorded in code-homes.md |
| **no tests until settled** | none for a design still moving; once the user says it is settled, candidates include `collect` (nesting, `on_layer`), `path_to`, `def_ref`, `face_of`, `handle_of`, `kind_fits`, `card_shape`, `label_of`. Tests pin behaviour, never wording or coordinates |
| **the samples are the visual check** | `samples/model`: one shop seen from every side, over its own small library, as rich as the tool allows — the gold standard for how the tool is used. `samples/elements`: a throw-away second workspace enumerating what the shop does not show. A visual feature added or changed shows up in one of them and in the coverage table |
| **files are LF** | write them with the Edit tool, or `newline=""` from Python; a text-mode write on Windows turns every line CRLF |

### Sample coverage

Every block is a diagram file under `samples/model` (on base and the model's own *Parts* and *Records*) or `samples/elements` (on base and one *Record* definition); a directory named as a file holds that file's parts; a number prefix orders siblings and never shows. `npm run model` collects the model into `samples/model.json`, the workspace a fresh browser opens, and `public/packages/model.json`; `npm run elements` collects `samples/elements.json`, opened with *import a workspace*. A diagram says what it is in its `description`, which its overview reads.

| Visual | Where |
|---|---|
| abstract parts and their usages, each its own colour: `actor`, `page`, `service`, `store`, `external` | `Parts/`; used throughout `overview/` |
| a context diagram, layered, an untied note | `overview.yaml` (Overview) |
| regions with headings, room ports on both walls, a label tied to a card | `overview/shop.yaml` (Shop) |
| internal: typed ports, room ports with `side` and `at`, a port note | `overview/shop/customer-facing/storefront.yaml` |
| flow (start dot, decision diamonds, end ring), a service's behaviour | `overview/shop/back-office/payments/payment-retry.yaml` |
| a collection's records on a usage; a document face with a markdown table, a headless document | `overview/shop/back-office/orders.yaml` |
| sequence (reference lifelines, activation bars, a self message, a reply), swimlane (reference lanes), nested groups with tied notes and a grid with headers, treemap of references | `overview/shop/how-it-runs/` |
| state (rounder states, a back transition), a record's behaviour | `Records/order/order-states.yaml` |
| the records: table faces, types with unit, format and hue, stored associations and a composition, a behaviour with ports, a store definition | `Records/` |
| tags with parents and colours; a constraint applied by name (`owned` on `service`); interface definitions and ports typed by them | `Parts/service.yaml`, used by every service |
| class and entity (layered, crow's feet), each listing Order's behaviours | `overview/shop/data/` |
| a sized document, a markdown card from `source` | `overview/shop/back-office/payments.yaml`, `payments/charge-once.md` |
| a picture face | `overview/shop/how-it-runs/5-dashboard.yaml` |
| **elements**: every block and diagram kind on its small face, a reference, a name cut short | `elements/1-blocks.yaml` |
| **elements**: a usage's values as a table and as a class | `elements/2-large.yaml` |
| **elements**: marks, a decision cut short, a hand-sized note, a label, a group, a region | `elements/3-notation.yaml` |
| **elements**: every `line.dir` and every base relation, with ends | `elements/4-lines.yaml` |
| **elements**: families, hues, hatch, faded, dashed, thick | `elements/5-colour.yaml` |

### Commands

| Do | Command |
|---|---|
| check everything | `npm run typecheck`, `npm test`, `npm run lint:css` |
| re-write the samples | `npm run samples` (packages, then the model and elements); one alone `npm run model`, `npm run elements` |
| re-collect packages | edit under `packages/defs/src/packages/<name>/`, then `npm run packages`; `base` under `packages/defs/src/base/`, then `npm run base`. `public/packages/doc.json`, `requirements.json`, `sysml.json` have no source folders: edit them by hand |
| check a file or a source folder | `npm run start -s -w @mnd/cli -- check ../../samples/model.json` → `clean`, and `review` the same → `clean`; a folder the same: `check ../../samples/model` |
| list a layer | `npm run start -s -w @mnd/cli -- outline ../../samples/model.json <layer name or id>`; sample ids are minted from file paths (`yaml.overview.shop`) |
| drive the app | the `vitest` skill (stale in places): `npm run dev`, read the port from the log, Playwright on installed Edge from the scratchpad. A fresh browser opens the model (`mndflow.yaml`); load `samples/elements.json` through *import a workspace* (Playwright: `waitForEvent("filechooser")`). Right-click on empty ground asks a name by `window.prompt` (answer it with `page.on("dialog")`); a folder row unfolds by its `.mark`; find rows by `.explorer li` with the label. Open a card by a double-click on its border (a click on its name renames; a port on its left wall takes a click there) or select + Enter. Scope canvas selectors to `.stage`: the tray's overview draws its own React Flow. The tray's *take the full height* button shows the whole overview. Stop the Vite servers you start |

### Schema facts

| | |
|---|---|
| **graph** | `{ root, blocks, edges }`. Library on a package root: `types`, `tags`, `interfaces`, `constraints` (core `KINDS`), each entry `{ id, name, description?, type?, settings? }` |
| **ports** | `Block.ports`, drawn as `block/port`, met by `fromPort`/`toPort`, written by `set_ports` |
| **the rest** | constraints: ids on blocks and lines. Ends: `Relation.ends`, `def.ends`. Behaviours: kinds with `block.behaviour`. Records: `Block.records`. Regions: `holder.band`. Diagram families: `KIND_FAMILIES`. Shapes: `card.shape`, `layout.shape` (`SHAPES`). Base ids include `start`, `end`, `decision`, `transition`: never reuse them as block ids |
| **registries** | id `<package>/@<kind>` (core `registry_id`); an entry opens by its own id; both open on the `registry` view; the tray holds one as `{ of: "registry", registry }`; a tile's node id is its entry's |
