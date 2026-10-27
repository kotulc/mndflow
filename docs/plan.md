# Plan

**What is left to do, in order.** Built work is not kept here. The map's look and the model's rules are design.md; where a rule's code lives is code-homes.md. An item plan in `docs/plans/` opens with what is changing and why, then the steps.

Nothing here is waiting on a choice. *Deferred* is out of this plan. *Edges* is taken when a step passes near one.


## Order

**The library and the models are built** (2026-10-26): two maps under one navigation, a model a definition of kind `model`. What is left of it leads, then the placement plans, then the rest. A drag does not place a card. Routing is left as it is.

| # | Work | Done when |
|---|---|---|
| 0 | **library and models, the rest** | each step in plans/unification.md done |
| 1 | **order** | plans/order.md *Done when* |
| 2 | **groups are tags** | plans/groups.md *Done when* |
| 3 | **drag to reorder** | plans/drag.md *Done when* |
| 4 | **placement, the rest** | *Placement*: each item closed or done |
| 5 | **block design, the rest** | the tray's type list scoped by family; a named note shows only its name; a holder wears a handle |
| 6 | **model joins** | from any block, every side it appears on is one click away |
| 7 | **tray keys** | every tray input is a key and its choices |
| 8 | **CLI fixes** | `check` on a broken file exits 1; `export --sysml --round` on the repo map brings back all 490 relations |
| 9 | **diagram views** | their known issues fixed |
| 10 | **simplification leads** | each lead in one home, recorded in code-homes.md |
| 11 | **CLI surface** | the acceptance run in *CLI surface* passes |


## Placement

The maps and how a block is entered are built (design.md *Perspectives*). Left here is placement in an entered view: order, groups, drag, and the items after them.

An entered layer is placed by ELK, one layer at a time. A folder is laid out on its own, inside out: `layered` where lines join what it holds (both directions tried), packed toward the canvas's shape where none do. A group is a panel, plans/groups.md. A layer with regions is banded in list order, plans/order.md: each region a band, and a run of blocks in no region a band between them. Across (regions as columns) and down (as rows) are both tried; the one nearer the canvas's shape is kept. A region no line meets is packed as one unit, in its list place. Each band spans the layer across the flow, a unit from the next. Lines inside a container are ELK's; lines across the layer are routed live by libavoid. A line with points of its own (a sequence message, a lifeline) is drawn as given.

ELK is asynchronous: the last drawing stays, read only, until the next layer answers. It writes into its input, so tries that run side by side each keep their own copy of children and edges. Bands use `GREEDY` cycle breaking: `MODEL_ORDER` turns back every line pointing against file order, not only loops.

Each of order, groups and drag is done when typecheck, tests and both samples `check` clean, and Shop and Deployment have been driven landscape and portrait.

### Groups are tags

plans/groups.md. A group holds nothing; membership is its own tag, synced with the canvas block, and distinct from a finding-tag of the same name. Nested groups and partial overlap are allowed. A group may cross regions; the panel is drawn around its members either way.

### Order

plans/order.md. The list in the file or the package is the only order. Bands follow it. There is no `order` key.

### Drag to reorder

plans/drag.md. Dragging a region's name inserts it before or after another region, along the band. Dragging a sequence step inserts it in its column, and the steps below move down.

### After those

| # | Work | Done when |
|---|---|---|
| 1 | **the sequence header** | participants are cards; the header strips stay behind them |
| 2 | **leftover scale**: `data.scale` and stage `scaled` serve only registry tiles | each kept only where a registry needs it |
| 3 | **dead code**: `holds_any`, `said_of`, `package_named`, `default_id`, `constraints_of`, `has_library`, `end_id`, `awaits_seat`, `on_grid`, `in_rows`, `seat_at`, `type_chips` are called nowhere; core and views `index.ts` re-export with `export *` | each removed or named in its index |
| 4 | **the kit and the CLI**: the kit's viewer and the CLI still place by the synchronous fallback | they draw a layer with `layer_scene`, or a section's map, as the app does |
| 5 | **bands in a chip**: a region of plain blocks is a tinted band in its diagram's chip. Shop's regions hold diagrams, so they are boxes; no sample has shown a band of plain blocks | a region of plain blocks in the elements sample, looked at |


## Block design, the rest

**Blocks and diagrams are the major concepts the explorer lists; notation and components live inside the block or diagram that holds them** (design.md *Faces*, *Elements*).

| Task | |
|---|---|
| **type chips by family** | the tray's *type* offers a diagram only its family's kinds, a part only what its parent's kind allows; never a mark for a diagram |
| **faces** | a named note shows only its name on the small face; a holder (a group, a region heading) wears a handle. The rail is deferred |


## Model joins

The model is one shop seen from every side.

| Task | |
|---|---|
| **make the joins visible** | a block's overview lists every side it appears on: its own layer, its behaviours, the diagrams referring to it, each reached through core's `read_at`. A definition's sides are its registry |
| **behaviours on their owner's layer** | closed: a behaviour stays its own diagram. Its card is not drawn on the owner's layer |
| **lines carrying records** | deferred: a message typed by the record it carries |


## Tray keys

The card and settings tabs are built (tray.md). Left:

| Task or question | |
|---|---|
| **attribute values in files** | nest them under `values:` |
| **usage settings** | a usage has no `def` and no settings tab. Drop `settings` on a usage; a definition keeps them |
| **traits** | stay on the card tab |
| **long chip lists** | closed: the full list stays |
| **unset quantities** | a slider's key with nothing said reads `—`; read the fallback instead |
| **entry styling** | a definition is a block with `def`. An entry is not a block: it is one record in the package library (`tags`, `types`, `interfaces`, `constraints`). It extends a base definition (`tag`, `attribute`, `interface`, `constraint`), and its colour is edited in its settings, read down that chain the same way |


## CLI fixes

| Task | Where |
|---|---|
| exit codes: `check` / `review` exit 1 on faults and on a file that is not JSON | cli `main.ts` |
| `fixture:` prefix on sources, so a fixture name never shadows a file | cli |
| `@mnd/defs` indent | cli `package.json` |
| an unknown id reads as itself in refusals | core `actions/` |
| SysML ends written and resolved by qualified path; read-back stores `label`, not the escaped `name` | cli `sysml.ts` |
| drop `Said.kind`: nothing reads it | core `session.ts` |
| `define` takes no `id`. Drop `id?` from actions.md. The explorer does not pass one | core docs `actions.md` |


## Diagram views

| Issue | |
|---|---|
| **state line words** | closed: a transition does not show its event, guard, or action |
| **swimlane lanes** | closed: the header row and header column are the lane headers |
| **empty region, layered** | an empty region on a `layered` layer lands over a card (views `layered.ts`); recheck now that ELK places |
| **treemap room** | *Estate*'s room is wider than its map |


## Simplification leads

Take each as code-homes.md *How to take one* says, then record its home there. **Highlight rules** is plans/unification.md step 1. **Tray listings** is half taken: the tray's definitions table counts by `definition_uses`.

| Lead | Suspicion | Likely home |
|---|---|---|
| **mndmap `edits.ts`** | a second action system with its own placement rules | core's actions, or one shared placement check |
| **two kind readers** | views `marks_of` decides what a card reads as on its own | `role_of`, `marks_of` mapping its answer to classes |
| **`?? graph.root`** | the workspace as a fallback for "no layer" | each site says what it means |
| **explorer `listed()`** | the chain re-derives domain and structure membership | core `is_domain` / `in_domain` / `tree_of` |
| **tray listings** | the tray's definition grouping may re-list what the chain lists | the chain's listings |
| **stage menus** | `Stage.tsx` offers per kind by base strings | the registry's scopes and `when` |
| **two kinds of interface id** | `is_interface` answers for a drawn port and for a laid-in seat | one reading |
| **overview counts** | tray `Overview.tsx` names each kind's counts by base id | the kind's own definition |
| **speed** | library lookups rescan every package; `uses_of`, `project`, `users_of`, `collect`'s `on_layer` ask per element | a per-graph index |


## CLI surface

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
| **speed and docs** | bundle `mnd` with tsup; rewrite the CLI README; design.md's agent-surface question closes on this section; refresh the `vitest` skill | a call returns in well under a second |

**Acceptance:** this repo mapped through the CLI alone: `new`, one generated script, `check` clean, `draw` and revise, `draw --open` hands the view over. No ids in hand, no browser editing, no hand-placed geometry.


## Settled

| Rule | |
|---|---|
| **colour** | a package sets it. Off the canvas a definition is outlined. *Has values* stays off a folder and a group |
| **a region** | made from a menu. A diagram dropped into one does not draw open. The rail is deferred |
| **routing** | libavoid stays. A line may cross a later band. A line into a group does not reshape the group |
| **a reference** | `resolved` moves to core: the block it stands for, or that the name points at nothing |
| **a note** | its own block. A tie joins it to any number of blocks. `note:` in a file is shorthand for that |
| **a sequence** | a diagram. A table is a card face. Participants are cards, header strips behind them |
| **the map** | a treemap per section; the models' a forest of every loaded package's models. A package is a box of what it holds, never a page. A plain block keeps its icon. A chip keeps dagre; the entered view keeps ELK |
| **a definition** | in the library, with uses, enters its registry, a model or a relation definition included; unused, it enters nothing. A model is drawn in the models; other definitions' structure only through their usages and the tray |
| **lines** | crossings, line words and the sequence self-message stay as they are |
| **canvas gestures** | a drag does not place a card; it reorders along a band or a column |


## Deferred

| Item | |
|---|---|
| **the rail** | future work, tasked separately |
| **type structure** | `many` and `optional` only, until a translator needs maps, unions, or generics |
| **a message's record** | a message typed by the record it carries |
| **unknown keys** | a key the schema does not use is dropped |
| **source fetch** | `bring` takes a package from a URL. An arbitrary file waits on the next translator |


## Edges

| Area | Edge |
|---|---|
| **cards** | marks on a dark table card are faint; a reference previewing a table ignores its own look's border; notes still draw through `NoteNode`, not only `CardFace` |
| **tray** | a line's preview never shows `line.dir`; a definition's resolved chain chip is gone; in a read-only tray *view definition* is disabled with everything else |
| **overview** | the glance mounts a second React Flow, so node description ids repeat in the page; on the open layer with nothing picked it draws what the canvas already draws; a tag with no hue paints its share of the bar plain |
| **tests** | `seat.test.ts` › *crosses straight where a group note sits square beside the group* failed on *Groups* and passes on *Deployment*. Nothing was fixed: watch it. |
| **camera** | a short port drag lands short |
| **React** | `flushSync was called from inside a lifecycle method`, once seen opening the profile and the package view from a layer; the package view is gone, recheck the profile |
| **packages** | a definition file holds no parts, so a pattern's parts live in its package's `package.json`; base's `decision` and `architecture`'s share a name, so `type: decision` resolves to whichever the lookup finds first |
| **names** | unique siblings are refused only by `create`, `rename` and `move`; `label` and `group` write names unchecked. One home: where a name is written |
| **paths** | a path names every region on the way (`Overview::Shop::Back office::Payments`), though layers look through them. Groups leave paths with plans/groups.md |
| **diagram files** | a value named like a schema key never shows in a card source (*Tray keys*); a card drawn in by `source` keeps only its type, body, tags, settings, name and values; the web app's collect loads no `packages` a file lists |
| **annotations** | a label floats aside, so on a layer cut into regions it can land across a band's heading; a picked region draws a full outline rather than its band; an empty layer's words centre on the canvas rather than the room |
| **ports** | design.md gives a port its definition's settings, values and tags; ports hold name, type, flow, seat and description only |
| **map** | a count on a tight chip fragments (*service 6.*); the room sits under a one-line head |
| **double-click a grid** | lands on its name and renames it; Enter opens it |
| **mndmap** | its content rows are not yet regions; the kit is not re-released and `packages/kit/.types` is stale, so its pin is behind. The kit's next release drops `survey_graph` (plans/unification.md step 3): mndmap moves to the map then |
| **follow-ups** | lineage and links as a package structure rather than a view; boxes for a definition's usages and the groups they belong to |
