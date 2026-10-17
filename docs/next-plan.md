# Next plan

**What is left to do, in one place.** Merged 2026-10-12 from the next, sample, cards, CLI, structure and simplification plans. Everything built is gone from here: the code and the goal docs (design.md, definitions.md) record it, and git history keeps the old plans.


## Where things stand

| | |
|---|---|
| **last committed** | arrangement by kind (`card.arrange`), diagram files (one block and its layer as YAML, frontmatter the same schema), names unique among siblings, the views renamed (package, allocation, table; swimlane merged), `layered`, the showcase as YAML. `db776f9` (2026-10-13) |
| **built, uncommitted** | (2026-10-14) the tray's card and settings tabs as keys and choices (tray `pairs.ts`, `Source`, `Choices`); `description` on every block (`describe`), the body written by `write` and read at the top of the contents tab; definitions' old body text moved to `description` in every source; keys follow the focused region (theme `useZone`). Suggested message: *Tray tabs as keys and choices; add description; text moves to contents; keys follow focus* |
| **built, uncommitted** | (2026-10-16) redesign-plan.md steps 2–9: types and tags as a package root's `library` (core `library.ts`); interfaces as `def.ports`, drawn as `block/port` by views `read_through`, met by `fromPort`/`toPort`; `base` refiled by category with `label` and `region`, the forms, `tag`, `value` and `interface` gone; folders boxes on their parent's layer; annotation tags by source in the tray (`given_of`, `unmember`); regions as bands; collections (`has_records`, `records.of`); `collection.ts` renamed `sources.ts`; the explorer's library section. Suggested message: *Redesign: components as data, interfaces on definitions, folders as boxes, labels, regions, collections* |
| **first, ask** | step 0's open rows, then the three older rows of *Decide*: the folder view and the package view, `note:` in a file, dagre for `layered` |
| **then** | step 0, then step 1 |
| **the kit** | not re-released since; mndmap's re-pin meets the renames listed under *Rough edges* · **kit** |
| **verify** | *Commands*: everything green, the showcase `check` clean and drawn in the app |


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
| **attribute values in files** | a card source writes values as top-level keys, so a value named like a schema key vanishes (*Rough edges* · **diagram files**). Keep them flat, or nest them under `values:` — unambiguous, one more level to write, the core reader and writer and the showcase changed. Recommended: nested |
| **usage settings in the schema** | the tray offers a usage no settings, but `Block.settings` still allows a usage's override. Drop it from the schema, or keep it for files and arrangement (`card.arrange` on a usage) |
| **the attributes tab** | a usage's values are now answered on its card tab, so its attributes tab repeats them; a definition still declares attributes there. Drop the tab for usages, or keep it |
| **traits** | on the card tab; they sat on the old settings tab. Keep them with what it is, or move them to settings |
| **long chip lists** | a usage's *type* and *extends* list every definition, gathered by package and folder; a filter box, or folding a place, may be wanted |
| **unset quantities** | a slider's key with nothing said reads `—` where its slider shows a fallback; read the fallback instead |


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
| **a self message's name** | stands upright on the loop's short leg: the column keeps too little air beside the card |
| **two lines between one pair** | on the table view, *extends* and an attribute link share an anchor and run together |
| **a document opens empty** | a document card has room to hold, so it opens onto an empty internal layer |
| **swimlane lanes** | the allocation view draws a swimlane's steps and the lines between them, but not the old view's lanes (a header card at each lane's top, the lane unnamed); whether allocation should |


## 3 — Canvas gestures

| Candidate | |
|---|---|
| **drag from a port to empty canvas** | makes a connected card |
| **tab** | adds a sibling to the selected card |
| **drop a definition** | from the explorer onto the canvas, as a usage (check what `drop_of` already covers) |

Start in stage `Flow.tsx` · `gestures.ts` (gestures), `draw.ts` · `drag.ts` · `moves.ts` (drawing and drops), `Stage.tsx` (menus per gesture), ending in core `actions/` (`create`, `relate`, `interface`, `note`).


## 4 — Decide

| Question | |
|---|---|
| **`resolved` in core?** | it lives in views `through.ts`; `is_named`, `shown_name`, `stamps_of` and `opens` still resolve a stand-in on their own |
| **the door and unknown fields** | refuse or report `of` on a non-reference, `traits` on a usage or line, a relation's `dir`. Today a file storing `dir` reads in silently and its arrows vanish |
| **keep libavoid?** | design.md and spec.md describe routing round cards. If kept: LGPL-2.1, a beta (`0.5.0-beta.5`), a ~490KB wasm, also in the kit mndmap vendors |
| **arrange, generally** | crossing reduction by reordering within reading order is the candidate |
| **double-click a grid** | lands on its name and renames it; Enter opens it |
| **`define` and ids** | actions.md gives `define` an `id?`; the code takes none and the CLI says ids are never chosen. If no caller needs one, it leaves actions.md |
| **editing table and sequence** | design.md keeps them projections the canvas never drags or creates on; whether either should be edited from the canvas after all |
| **the package view** | design.md says a package opens on the package view scoped to it; the code still draws the folder layer view (core `ViewKind` `folder`). A folder no longer opens (redesign step 6), so the view now serves packages alone |
| **tied notes in a file** | `note:` on a block or the file is built provisionally (core `diagram.ts`); confirm the syntax, or pick another |
| **layered on dagre** | the plan named elkjs; its layout is async and `project` is not, so `layered` runs on `@dagrejs/dagre` (MIT, synchronous). Keep it, or make projection async for ELK |
| **source fetch** | `bring` takes a package from a URL; an arbitrary fetched file still needs a translator to become blocks (ST.5) |


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
| **definition view** | the middle card's menu offers *delete block* and the note's *delete note*, which do nothing; React Flow logs *Couldn't create edge for handle* (#008) as boxes mount; tags and ports draw as plain cards until step 10 of redesign-plan.md redesigns it; inherited attributes are listed but not dimmed; inherited ends are dimmed only where the relation states no `allows.ends` itself |
| **cards** | marks on a dark table card are faint (half opacity); a reference previewing a table ignores its own look's border; block and relation definitions have no hue of their own; check that notes draw through `CardFace`, not only `NoteNode` |
| **tray** | a line's preview never shows `line.dir`; a definition's resolved chain chip is gone; in a read-only tray *view definition* is disabled with everything else |
| **tests** | `packages/views/test/seat.test.ts` › *crosses straight where a group note sits square beside the group* fails on the showcase's `System::Deployment`. It was mid-edit before 2026-10-14, and still fails with `description` moved back to `body`, so it is not the description change |
| **camera and page** | picking on the profile re-draws it lower than it first opens; the package view scrolls its top under the crumbs; a short port drag lands short (React Flow's drag threshold) |
| **React** | `flushSync was called from inside a lifecycle method`, seen opening the profile and the package view from a layer; not traced |
| **packages** | `base` collects alphabetically (`annotations` before `blocks`); a definition file holds no parts, so a pattern's parts live in its package's `package.json` |
| **names** | unique siblings are refused only by `create`, `rename` and `move`; `label` (grid cells) and `group` write names unchecked, so a path can still find none. One home: where a name is written |
| **diagram files** | a value named like a schema key (`side`, `note`, `w`…) never shows in a card source; a card drawn in by `source` keeps only its type, body, tags, settings, name and values; the web app's collect loads no `packages` a file lists |
| **kit** | mndmap's re-pin meets: views `overhead` → `package`, `grid` → `allocation`, `class` → `table`, `swimlane` gone; `class_graph` → `table_graph`, `swimlane_graph` gone; `card.place` → `card.arrange`, the *is aside* trait gone; card sources say `type`/`def`, not `extends`; `describe` now writes `description` and `write` the body; `Block.description` and the `set_description` op are new; tray exports `Identity`, `Settings`, `Looks` are gone (`Part` replaces `Looks`); theme and kit shell export `useZone`, and `Stage` takes `keys` |
| **follow-ups** | lineage and links as a package structure rather than a view; boxes for a definition's usages and the groups they belong to |
| **annotations** | a label floats aside, so on a layer cut into regions it lands across a band's heading; a free label and one seated on a line are open (redesign *Decide*); a picked region draws a full outline; a region is made only from a selection's menu |
| **interfaces** | a plain block takes none: *interface* refuses until it is defined, where the old block-interfaces let any block have one; the showcase lost the room port on `Containers`; ports carry no settings or tags yet, though design.md gives them both |
| **mndmap** | its content rows are not yet regions (redesign step 8); it meets the renames in *kit* and the new schema on its re-pin |
| **base looks** | the base blocks draw alike but for their icons (and notes): give each more visual distinction through its faces and traits |


## Tests, once settled

**None until the user says a design is settled.** Candidates then: `diagram_of` / `diagram_subject` / `lens_of` on a stand-in; `table_graph`, `sequence_scene`; `long_form`, `path_to`, `def_ref`, `wanted`; `runs`, `layered`; `sibling_named`; `boot_of`; `tags_stated` / `traits_stated`; `statements` / `said_of`; `ports_of`; `holds_values` and the `field` refusal; `aspect_acts`; `collect`; `given_of`, `ported`, `typed_as`; `seat_all`, `routes_of`; `flow` / `on_grid`; `definition_graph`; `dir_of`; `relate` joining a twin; `is_reference` / `resolved`; `is_tie`; `beside`. The CLI's tests pin refs, all-or-nothing scripts and write-in-place, never wording or coordinates.

`packages/views/test/far.test.ts` is a temporary debug print with no assertions: delete it.


## Standing rules

| Rule | |
|---|---|
| **one task at a time** | do it, verify it, stop; report a failed check with its output |
| **no commits** | suggest a message |
| **no legacy** | on a schema change re-run `npm run base` and `npm run samples`; the door repairs no old shapes |
| **docs are the goal** | code catches up; report where code and a doc disagree |
| **one rule, one home** | fragmentation found is consolidated in the same task and recorded in code-homes.md |
| **the showcase is the visual check** | one online shop built from the `architecture` catalogue's patterns; a visual feature added or changed shows up somewhere natural in it, and in the coverage table. Non-visual capabilities need not appear |

### Showcase coverage

Every layer is a diagram file under `samples/showcase/src`; `npm run showcase` collects them into the workspace and `public/packages/showcase.json`. The services are usages of the `architecture` catalogue's patterns.

| Visual | Where |
|---|---|
| markdown card from `source`, references to layers | `about.yaml` (Overview), `about.md` |
| persons, externals, every `line.dir`, names, a label above | `System/1-context.yaml` |
| pattern usages read through, ports placed / self-placing / flowless, fan-out, hatch / faded / dashed / thick / hue | `System/2-containers.yaml` |
| regions with headings, a label tied to a card | `System/4-bands.yaml` |
| room ports on a definition's walls | the `architecture` patterns, opened from structure |
| nested groups, a matrix with headers and a merge, a missing reference, a line definition with a value | `System/3-deployment.yaml` |
| table view (class diagram) and attribute links | `Data/1-model.yaml` |
| table faces answering attributes, value links, a diamond-ended line | `Data/2-orders.yaml` |
| a collection's records as a table on its card | `Data/3-store.yaml` |
| the library: a type and a tag declared in files | `Records/order.yaml`, `Specs/public-api-spec.yaml` |
| `layered`: a state machine and a flowchart | `Flows/1-order-states.yaml`, `Flows/4-payment-retry.yaml` |
| sequence: reference lifelines, a missing header, a self message, a reply; the same grid as lanes | `Flows/2-place-order.yaml` |
| swimlane (allocation) | `Flows/3-fulfil-order.yaml` |
| a definition chain on large faces, usages answering it | `Catalogue/1-specs.yaml`, `Specs/` |
| document, picture, headless and sized faces; markdown and decision cards; a tie; a hand-sized note; rows arrangement | `Catalogue/2-docs.yaml`, `Kinds/` |

### Commands

| Do | Command |
|---|---|
| check everything | `npm run typecheck`, `npm test`, `npm run lint:css` |
| re-write the showcase | `npm run samples` (packages, then the showcase collected from `samples/showcase/src`); the showcase alone `npm run showcase` |
| re-collect packages | edit under `packages/defs/src/packages/<name>/`, then `npm run packages`; `base` under `packages/defs/src/base/`, then `npm run base` |
| check a file or a source folder | `npm run start -s -w @mnd/cli -- check ../../samples/showcase/workspace.json` → `clean`; a folder the same: `check ../../samples/showcase/src` |
| list a layer | `npm run start -s -w @mnd/cli -- outline ../../samples/showcase/workspace.json <layer name or id>`; showcase ids are minted from file paths (`yaml.System.2-containers`) |
| drive the app | `npm run dev`; a fresh browser opens the showcase (`mndflow.yaml`); another file through the header's *import a workspace*. Open a card with select + Enter (double-click renames); in the explorer, select a row and → unfolds it. The `vitest` skill says how to drive it, though it is stale (step 6) |
