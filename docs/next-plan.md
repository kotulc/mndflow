# Next plan

**What is left to do, in one place.** Merged 2026-10-12 from the next, sample, cards, CLI, structure and simplification plans. Everything built is gone from here: the code and the goal docs (design.md, definitions.md) record it, and git history keeps the old plans.


## Order

| # | Work | Done when |
|---|---|---|
| 2 | **arrangement by kind** | `auto` lays a layer out by each block's preferred arrangement; the acceptance run in *Arrangement by kind* passes |
| 3 | **CLI fixes** | `check` on a broken file exits 1; `export --sysml --round` on the repo map brings back all 490 relations |
| 4 | **diagram views** | their known issues fixed; diagrams editable from the canvas (read only today) |
| 5 | **canvas gestures** | a diagram is built fast from the canvas alone |
| 6 | **open decisions** | each row of *Decide* answered and recorded in design.md |
| 7 | **simplification leads** | each lead consolidated into one home, recorded in code-homes.md |
| 8 | **CLI surface** | the acceptance run in *CLI* passes |

*Rough edges* is a backlog, taken when a step passes near one.


## 2 — Arrangement by kind

**A view is how an opened block draws its inside; an arrangement is how a block sits in its parent's layer.** Every kind states its preferred arrangement; `auto` lays a layer's blocks out in explorer order, each run of one preference its own way, and notes float in the nearest free space beside what they are tied to. Views (folder, internal, grid, definition, diagrams, and the `page` layout they use) are unchanged here: aligning them is a later plan. Decisions confirmed 2026-10-12.

### The rule

| Kind | `card.arrange` | Sits in an `auto` layer |
|---|---|---|
| block | `column` | one column at the left, left edges aligned |
| folder | `rows` | small cards in rows, `layout.across` to a row, as the package view lays cards |
| grid, group, reference | `column` (inherited from block) | as a block: a grid is a small card, a group its box |
| note | `aside` | the nearest free space beside what it is tied to, a unit clear of every card (today's `beside`) |

| Rule | |
|---|---|
| **one setting** | `card.arrange` (`column`, `rows`, `aside`) on the definition, inherited and overridable like any setting. Replaces `card.place` (`flow`, `aside`) and the *is aside* trait |
| **explorer order** | `auto` places non-aside blocks in `children` order, the explorer's. Consecutive blocks sharing a preference form a run; runs stack top to bottom, left-aligned, a gap apart. No other ordering |
| **asides** | tied: beside the target, as today, a tie to an interface after it is seated. Untied: beside everything the layer arranged. The notes column is gone |
| **relations** | only ties place anything; a line never moves a card (unchanged). *arrange* still reorders `order` on request |
| **inside a group** | members arranged by the same rule inside its box; a note tied to the group floats beside its contents (as today) |
| **free** | `layout.kind: free` still overrides: stored places draw, an unplaced aside floats beside its target (as today) |
| **views untouched** | `page` (folder, overhead, profile views, with their note column), the grid view, diagrams and the definition view lay out as today |

### Tasks

Do in order; after each, `npm run typecheck` and `npm test` pass. Existing assertions naming `card.place`, `is_aside` (the trait) or today's auto geometry are updated to the new answer; no new tests.

| # | Task | Files | Do | Done when |
|---|---|---|---|---|
| 0 | **goal docs** (on the user's word) | design.md (`auto` bullets in *Perspectives*), definitions.md (*is aside*, *layout*, capability list), core `schema.md` (`card` row), views `views.md` (*Layouts*, `pack.ts` row), defs `defs.md` | write *The rule* in | no doc names `card.place`, the *is aside* trait or an `auto` notes column |
| 1 | **the setting** | core `components.ts`, `defs.ts` | `PLACES` → `ARRANGES = ["column", "rows", "aside"]`; the `card` check reads `arrange` (one_of) and lists it in its keys in place of `place`. Add `arrange_of(graph, id)`: `setting_of(graph, id, "card")["arrange"]` if in `ARRANGES`, else `"column"`. `is_aside(graph, id)` becomes `arrange_of(...) === "aside"` (keep the name: views call it) | typecheck clean |
| 2 | **base data** | defs `src/base/blocks/block.json`, `folder.json`, `note.json`; delete `src/base/tags/traits/is_aside.json` | block `settings.card.arrange: "column"`; folder `"rows"`; note `"aside"`, and `is_aside` out of its traits. `npm run base`, `npm run packages` | `base.json` carries the three, no `is_aside` |
| 3 | **runs** | views `float.ts` | new `runs(graph, units, across)` → `Placed[]`: units sorted (`order`, id); split into consecutive runs by `arrange_of`; lay each from `y` at `x 0`: `column` → each unit at `x 0`, next `y` = `y + whole(h) + GAP`; `rows` → `flow(run, across)` shifted down to `y`. The next run starts `GAP` below the last one's bottom | blocks, two folders, a block: a column, a row, a column |
| 4 | **notes float** | views `float.ts` | `noted`: every aside goes to `floated`, everything else to `runs`, then `centred`. In `floated`, an untied aside targets `extent(placed)`, as a note tied to the holder does. Delete `column()` | a note sits beside its block; an untied note beside the arrangement |
| 5 | **groups** | views `bands.ts` | the `auto` branch already calls `noted` with `band_id`: nothing to change but check it; the non-auto `packed` branch is unchanged | a group of blocks draws as a column in its box |
| 6 | **layer floating** | views `block.ts` | check only: the layer-level `floating` set (aside, tied, not a page) re-seats tied asides after interfaces, as today | a note tied to an interface still sits beside its seat |
| 7 | **dead code** | views `pack.ts`, `index.ts`; kit `index.ts` | delete `pack_units` if grep finds no caller; add removed exports and `card.place` → `card.arrange` to step 1's mndmap table | no export of a deleted function |
| 8 | **samples** | `scripts/samples/showcase.ts`, the architecture generator | rename any `card.place`; add layer `l_arrange`: blocks with tied and untied notes, two folders between them in `order`, a group of blocks, a grid. Coverage row *notes column and aside notes in auto* → *arrangement by kind* · `l_arrange`. `npm run samples` | `check` clean on both samples |
| 9 | **homes** | `docs/code-homes.md`; this plan | record: arrangement preference = core `arrange_of`; auto runs and floating = views `float.ts`. Update the *layout* rough edge to what still holds, and remove this step | grep finds no `card.place` or `is_aside` trait |

### Acceptance

Drive the app (`vitest` skill) on the showcase, then `outline` the same layers:

| Open | Sees |
|---|---|
| `l_arrange` | blocks in a left column and folders in a row, in explorer order; each tied note beside its block, clear of every card |
| a group in it | its blocks a column inside its box |
| a note tied to an interface | beside its seat, as before |
| drag a card, then *auto* | the layer turns `free` keeping places; *auto* arranges by preference again |
| a folder, the overhead, a diagram | as before this step |


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
| **a self message's name** | stands upright on the loop's short leg: the column keeps too little air beside the card |
| **two lines between one pair** | on the class view, *extends* and an attribute link share an anchor and run together |
| **a document opens empty** | a document card has room to hold, so it opens onto an empty internal layer |
| **canvas editing** | class, swimlane and sequence views are read only: picks select, drags are refused |


## 5 — Canvas gestures

| Candidate | |
|---|---|
| **drag from a port to empty canvas** | makes a connected card |
| **tab** | adds a sibling to the selected card |
| **drop a definition** | from the explorer onto the canvas, as a usage (check what `drop_of` already covers) |

Start in stage `Flow.tsx` · `gestures.ts` (gestures), `draw.ts` · `drag.ts` · `moves.ts` (drawing and drops), `Stage.tsx` (menus per gesture), ending in core `actions/` (`create`, `relate`, `interface`, `note`).


## 6 — Decide

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


## 8 — CLI surface

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
