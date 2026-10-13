# Next plan

**What is left to do, in one place.** Merged 2026-10-12 from the next, sample, cards, CLI, structure and simplification plans. Everything built is gone from here: the code and the goal docs (design.md, definitions.md) record it, and git history keeps the old plans.


## Order

| # | Work | Done when |
|---|---|---|
| 1 | **commit and release** | this branch's work committed; kit released from that commit; mndmap's own work committed and re-pinned to the new kit |
| 2 | **CLI fixes** | `check` on a broken file exits 1; `export --sysml --round` on the repo map brings back all 490 relations |
| 3 | **diagram views** | their known issues fixed; diagrams editable from the canvas (read only today) |
| 4 | **canvas gestures** | a diagram is built fast from the canvas alone |
| 5 | **open decisions** | each row of *Decide* answered and recorded in design.md |
| 6 | **simplification leads** | each lead consolidated into one home, recorded in code-homes.md |
| 7 | **CLI surface** | the acceptance run in *CLI* passes |

*Rough edges* is a backlog, taken when a step passes near one.


## 1 — Commit and release

| Step | |
|---|---|
| **commit mndflow** | this branch: the two samples, the catalogue packages from folders, the diagram views, the structure root mark and *add structure* (no commits by an agent: suggest the message) |
| **release the kit** | `npm run release:kit`, so its version stamps that commit |
| **commit mndmap** | it still holds the cards work uncommitted (`Preview` → `Document`, `forms.ts` gone, `scan`, `read`, `edits`) |
| **re-pin mndmap** | copy the tarball into mndmap's `vendor/` and point its `package.json` at it. It vendors 0.11.0 (2026-10-04) |
| **drive in the web app** | *import a collection* and *attach*: both are wired up, but nobody has clicked either |

**What mndmap must absorb since 0.11.0**

| Area | Changed |
|---|---|
| **views and navigation** | `ViewKind`: `internal`, `grid`, `folder`, `definition`, `overhead`, `profile`, `class`, `swimlane`, `sequence`; `DIAGRAM_VIEWS`; `diagram_subject`; `Section.lists` (unset leaves mndmap's sections as they are); `MAIN` gone, a new workspace is its root alone |
| **cards and faces** | `card.shows` → `card.face` (`table`, `document`, `picture`; `LARGE_FACES`, `FACE_PARTS`); `layout.face` → `layout.cards`; `CardTab` into `Element`; `table` returns rows and widths; `face_text` leaves attributes out; the Viewer's `fields` / `onFields` and views `fields_graph` / `class_def` gone; `Mark` says `structure` (`roots_structure`) |
| **definitions** | `Block.traits` on definitions only; `set_tags` / `set_traits` replace, null gives back; `tags_stated`, `traits_stated`, `has_trait`, `is_tie`, `tag_home`; base trait ids `has_*` / `is_*` (`is_aside` new); `Relation.name` back, labels gone; a reference stores `type: "reference"`, `is_reference(graph, id)`, views `resolved` |
| **lines and seats** | `line.dir` setting (`dir_of`, `DIRS`) replaces `Relation.dir` and `set_dir`; `relate` joins a line already there; `is_interface` by type chain; `fromSide` / `toSide` / `set_side` gone, `set_port` carries `seat`; `seat_all`, `nearest_seat`, `taken_on`; `LineData.fan`, `LineData.points` |
| **layout** | a layer saying nothing is `auto`; `GAP` 2 units, `PAD` 1; `pack_units(sized, across)`, `across_of`; `tidy(graph, scene)`; `free` and `arrange` acts; `layout.even`; `look.tops`; `profile_graph(graph, target, across)`; `beside` (views) |
| **routing** | views depend on `libavoid-js`: a host loads the wasm once (`load_avoid`) and routes with `routes_of` / `avoided_run`, else `route` as before |
| **packages** | the catalogue's `erd` is `entity-relation`, now one generic `entity`; `message` / `reply` live in `diagrams`; `collect` takes `{ bare }` and returns `clashes` |
| **session** | core `boot_of` and `Boot` (`stray`); `Seed.opening` / `start` |


## 2 — CLI fixes

| Task | Where |
|---|---|
| exit codes: `check` / `review` exit 1 on faults and on a file that is not JSON | cli `main.ts` |
| `fixture:` prefix on sources, so a fixture name never shadows a file | cli |
| `@mnd/defs` indent | cli `package.json` |
| an unknown id reads as itself in refusals, not `"missing" holds nothing of that sort` | core `actions/` |
| SysML ends written as qualified paths and resolved by path; read-back stores `label`, not the escaped `name` | cli `sysml.ts` |
| drop `Said.kind`: nothing reads it | core `session.ts` and its readers |


## 3 — Diagram views

| Issue | |
|---|---|
| **a self message's name** | stands upright on the loop's short leg: the column keeps too little air beside the card |
| **two lines between one pair** | on the class view, *extends* and an attribute link share an anchor and run together |
| **a document opens empty** | a document card has room to hold, so it opens onto an empty internal layer |
| **canvas editing** | class, swimlane and sequence views are read only: picks select, drags are refused |


## 4 — Canvas gestures

| Candidate | |
|---|---|
| **drag from a port to empty canvas** | makes a connected card |
| **tab** | adds a sibling to the selected card |
| **drop a definition** | from the explorer onto the canvas, as a usage (check what `drop_of` already covers) |

Start in stage `Flow.tsx` · `gestures.ts` (gestures), `draw.ts` · `drag.ts` · `moves.ts` (drawing and drops), `Stage.tsx` (menus per gesture), ending in core `actions/` (`create`, `relate`, `interface`, `note`).


## 5 — Decide

| Question | |
|---|---|
| **`resolved` in core?** | it lives in views `through.ts`; `is_named`, `shown_name`, `stamps_of` and `opens` still resolve a stand-in on their own |
| **the door and unknown fields** | refuse or report `of` on a non-reference, `traits` on a usage or line, a relation's `dir`. Today a file storing `dir` reads in silently and its arrows vanish |
| **keep libavoid?** | design.md and spec.md describe routing round cards. If kept: LGPL-2.1, a beta (`0.5.0-beta.5`), a ~490KB wasm, also in the kit mndmap vendors |
| **arrange, generally** | crossing reduction by reordering within reading order is the candidate |
| **double-click a grid** | lands on its name and renames it; Enter opens it |
| **a line carrying a tag** | where a tag's line usages show: the usages box lists blocks only |
| **`define` and ids** | actions.md gives `define` an `id?`; the code takes none and the CLI says ids are never chosen. If no caller needs one, it leaves actions.md |
| **sibling names** | the docs say unique among siblings; actions allow duplicates |
| **source fetch** | `bring` takes a package from a URL; an arbitrary fetched file still needs a translator to become blocks (ST.5) |


## 6 — Simplification leads

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


## 7 — CLI surface

**The CLI is the one terminal: an agent writes meaning as data, sees what the person will see, and hands over that view.** The file is the state, written in place; one JSON result per verb; references are an id or a path `a::b::c` (plus `$key` in a script); the CLI adds no rules.

| Verb | Writes | Does |
|---|---|---|
| `new <file>` | yes | an empty workspace |
| `do <file> <action> [k=v…]` · `do <file> <script.jsonl \| ->` | yes | one action, or a script: all or nothing |
| `show <file> [ref] [--depth n] [--text]` | no | the tree, or one element whole |
| `find <file> <text>` | no | matches by name, then type, then body |
| `check <file>` | no | faults and notes, each naming its element; exit 1 on faults |
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
| **layout** | `auto` reads in order, so a line from a row's end to the next row's start runs round the row until *arrange*; a tall card makes a tall row; a card narrower than its column sits half a unit off the guides; a card related to a member inside a group lines up with the group, not the member |
| **routing** | two upright names in one 2-unit gap meet; libavoid ignores a second pin on the same spot of a shape (pins are keyed by spot and shared); a line to an inherited port inside a subtype is not met at the subtype room's copy (`part_id`) |
| **definition view** | the middle card's menu offers *delete block* and the note's *delete note*, which do nothing; React Flow logs *Couldn't create edge for handle* (#008) as boxes mount; a port draws as a plain card reading *block*; inherited attributes are listed but not dimmed; inherited ends are dimmed only where the relation states no `allows.ends` itself |
| **cards** | marks on a dark table card are faint (half opacity); a reference previewing a table ignores its own look's border; tags inherit `block`'s `family: primary`; block and relation definitions have no hue of their own; check that notes draw through `CardFace`, not only `NoteNode` |
| **tray** | a line's preview never shows `line.dir`; a definition's resolved chain chip is gone; the traits panel on a usage's or line's card tab draws full width under identity |
| **camera and page** | picking on the profile re-draws it lower than it first opens; the overhead view scrolls its top under the crumbs; a short port drag lands short (React Flow's drag threshold) |
| **React** | `flushSync was called from inside a lifecycle method`, seen opening the profile and the overhead view from a layer; not traced |
| **packages** | `base` collects alphabetically (`choice` before `value`); a definition file holds no parts, so a pattern's parts live in its package's `package.json` |
| **follow-ups** | lineage and links as a package structure rather than a view; boxes for a definition's usages and the groups they belong to |


## Tests, once settled

**None until the user says a design is settled.** Candidates then: `diagram_of` / `diagram_subject` / `lens_of` on a stand-in; `class_graph`, `swimlane_graph`, `sequence_scene`; `boot_of`; `tags_stated` / `traits_stated`; `statements` / `said_of`; `ports_of`; `holds_values` and the `field` refusal; `aspect_acts`; `collect`; `tag_home`; `seat_all`, `routes_of`; `flow` / `on_grid`; `definition_graph`; `dir_of`; `relate` joining a twin; `is_reference` / `resolved`; `is_tie`; `beside`. The CLI's tests pin refs, all-or-nothing scripts and write-in-place, never wording or coordinates.

`packages/views/test/far.test.ts` is a temporary debug print with no assertions: delete it.


## Standing rules

| Rule | |
|---|---|
| **one task at a time** | do it, verify it, stop; report a failed check with its output |
| **no commits** | suggest a message |
| **no legacy** | on a schema change re-run every generator and `npm run packages`; the door repairs no old shapes |
| **docs are the goal** | code catches up; report where code and a doc disagree |
| **one rule, one home** | fragmentation found is consolidated in the same task and recorded in code-homes.md |
| **the showcase is living docs** | a capability added or changed updates its showcase layer, notes and the coverage table in the same task; one removed takes its layer and row |

### Showcase coverage

| Capability | Layer |
|---|---|
| block kinds: block, folder, reference, note | `l_kinds` |
| group, grid, header lines, merges | `l_groups`, `l_grids` |
| interfaces: placed, auto, flow, room ports | `l_ports` |
| large faces: document, table, picture; `card.name`, `card.size` | `l_faces` |
| styles and card settings | `l_styles` |
| markdown cards (`source`, frontmatter, tags) | `l_markdown` |
| definition chains, inheritance, stand-ins, definition view, tags | `l_chain` |
| relation definitions, allowed ends, values on lines | `l_line_defs` |
| line direction, names, arrows, ties | `l_lines` |
| routing: detours, shared trunks, crossings | `l_routing` |
| references to blocks, definitions, nothing | `l_refs` |
| attributes, value types, links | `l_model`, `l_values` |
| class, swimlane, sequence views | `l_class`, `l_swimlane`, `l_sequence` |
| a stand-in stating its own view | `l_two_views` |
| catalogue packages; overhead, profile, folder view; explorer sections, the structure mark, add by section | `about` note |
| notes column and aside notes in `auto` | every layer |

### Commands

| Do | Command |
|---|---|
| check everything | `npm run typecheck`, `npm test`, `npm run lint:css` |
| re-write both samples | `npm run samples` (packages, then both generators); one at a time `npm run showcase` / `npm run architecture` |
| re-collect packages | edit under `packages/defs/src/packages/<name>/`, then `npm run packages`; `base` under `packages/defs/src/base/`, then `npm run base` |
| check a file | `npm run start -s -w @mnd/cli -- check ../../samples/<name>/workspace.json` → `clean` |
| list a layer | `npm run start -s -w @mnd/cli -- outline ../../samples/<name>/workspace.json <layer-id>` |
| drive the app | `npm run dev`; a fresh browser opens the showcase (`mndflow.yaml`); another file through the header's *import a workspace*. Open a card with select + Enter (double-click renames); the `vitest` skill says how to drive it |
