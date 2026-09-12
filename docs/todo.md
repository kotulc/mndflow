# Todo

**What is decided but not built, and what is still undesigned.** The goal state lives in design.md, spec.md and each package's `docs/`; this is the worklist against it.

Not a backlog of everything — an item earns a line here by being a decision somebody has to act on.


## Next up

**In order.** Each is a phase's worth on its own. Identity, relationships, pinning and the grid are built; what they left unanswered is under *Open questions*.

### 1 — Definitions, unified

**Unblocked: a relation definition holds `line` and the shared `style`, and the tray reads both.** The cascade is right — `isa` → `config_of` per property → the element's own `looks` last — and it is unified over definitions and over all eight block modules. It is **not** unified over blocks and relationships, and the panel that edits it still branches on which of the three it is holding.

| | |
|---|---|
| **`Styles.tsx` is 618 lines** | and it grew, because the right column now serves three holders. The two columns are two things: the left is *identity* — name, definition, label, pin, default — and is where every branch still lives; the right is uniform over any holder already. Split them, and the second takes a block, a relationship or a definition without asking which |
| **`ROWS` is most of a table now** | every chip row is data, including the two identity toggles and the `words` rows. What is left hand-written is `colour` (two sliders), `icon` and `mark` (a grid of marks) — named in `HAND` because they have no `ROWS` entry at all. A second `form` on `Question` — `range` and `marks` — collapses the last three, and `NUMBERS` and the range consts already carry the metadata |
| **`values` is a one-row group** | it held `card.shows` and the three `line` shows; the line half went with relation fields, so a whole rail entry now stands for one row. It belongs with `name` or with `label` — decide when the split above happens, not before |

**What a relation definition holds is now known**, which is what this was waiting on: `line` plus the shared `style`, and the rail already filters by what a module honours. So the split is the work, and `ROWS` is where it starts.

### 2 — Relation templates, and the tray's slots

**A relation vocabulary has a home, and it is the tray.** Pinning built the model half and left it unreachable: a definition can be minted from a run and then never renamed, restyled, retired or seen, because `vocabulary()` lists blocks only and `pickedDef` is the only way into the settings panel. This gives it a surface, and the surface is three slots the tray already almost has.

**One kind, two depths — `extends` is the whole decoupling.** A **template** is a relation definition carrying `components`; a **stereotype** is one with a name and an `extends` pointing at a template. Four templates under forty stereotypes costs no schema: `isa` walks the chain, `settings()` resolves it, `define` guards the cycle. **A template is simply a definition nothing names directly**, so what tells the two apart is emergent and no flag says it.

**Not the explorer.** A definition has no parent, so a relation definition in a containment tree is a category error — and reframing one as a block to fit is the special-casing the tree is trying to lose. The explorer stays blocks only, and `relations()` is already the right reader, already exported, already spent by the rail.

**The rail's `settings` is a verb, not a mode.** It opens the tray on the relation context and a later selection wins, so nothing fights what you have hold of — which is the trap a stored context would have set. The `relations` group keeps the three shipped modules, then the pinned templates under a `ruled` divider: the convention the rail already uses for *same subject, two natures*. **A rail click says what a right drag draws and never what the tray describes** — merged, glancing at a template would silently change what you draw next.

**The rail list lives on the workspace**, beside `counters`, and never as a flag on `Definition`: `borrowed()` refuses every write to a definition carrying `from`, so a flag would make an imported template the one thing that cannot be shortlisted. A list also gives rail order, which a boolean cannot.

| The three slots | block | relation |
|---|---|---|
| **what this is** | settings | settings |
| **what it declares** | fields | **templates** — the workspace's, with a usage count |
| **what exists** | contents — this layer, one level | **usages** — the stereotype roster |

**The asymmetry is required, not a gap.** A block has a vocabulary in the explorer and values to carry; a relationship has neither. Block tabs do not move.

**The usages tab is two tables, stacked.** The roster is stereotypes with their direct counts — **templates are left out**, so the *does a count mean direct or through the chain* question cannot arise. Picking a row fills the second with that stereotype's runs across the project, carrying a **layer** column, because a run named elsewhere is unreadable without one.

**Retype happens in the row.** A dropdown in the type cell, no selection and no navigation — which is what keeps the stack literally two tables. The cost is honest: the usages table then does not select on click the way the contents table does, so one component carries two behaviours.

| What it costs | |
|---|---|
| **the workspace list** | an id list on the root block beside `counters`, and the mutation that writes it |
| **two acts, not one** | minting a template and listing it on the rail are separate checkboxes. `pin` and `unpin` keep exactly what they mean — mint and dissolve — and the rail toggle is its own pair against the list |
| **`Definition.default` widens** | to `BlockModule \| RelationModule`, and `may_default` drops its `group === "block"` clause. **This is what a plain run follows**, asked as the same checkbox a block's default is |
| **`retype` takes a selection** | `ids_of` rather than `id_of`, the way `look` and `delete` already do |
| **`wire_of` takes a definition id** | it bails to `BARE` for anything not in `graph.edges`, so a held template cannot be previewed. *The edge half is done* was true of runs, not of definitions — `look_of` needs the same on the block side |
| **two row builders** | the roster and the cross-layer instances, with the layer column joined through `path()` |

**The two checkboxes are *make template* and *pin line*** — minting and listing, in that order, both in the settings tab's identity column. Two words, so `pin` and `unpin` keep meaning mint and dissolve and nothing has to be renamed.

**Wants the `Styles.tsx` split first**, since both checkboxes land in the identity column that phase is pulling apart.

### 2a — What the tray is pointed at

**The rail's top group names the subject, and context is derived from it.** The group is **workspace / layer / relation**, and two controls come out with the `element` group:

| Removed | Why |
|---|---|
| **`define`** | it never reached the action of that name. The app intercepts it and runs `set_tab("settings"); set_tray(true)` — a button whose whole job is opening the tray on the selection, which selecting already does. It also collided with the real `define`, which mints and renames definitions |
| **`export`** | a duplicate of two save buttons the app chrome already carries, one already called *export the workspace* |

**Never a stored mode.** Each entry sets what the tray *holds*, and which tabs exist follows from the subject — so a later selection wins for free, because selection is the same mechanism. A context stored beside the selection would have had to arbitrate between the two, and there is no honest answer to *the context says relations and you just clicked a block*.

**The rule for an empty subject is the one the tray already has:** the tabs are what is answerable, and a tab that says *pick something* is a way of saying nothing.

| | |
|---|---|
| **layer** | holds the layer block. A layer is a block, so this is ordinary element settings and is nearly free |
| **relation** | has no element to hold. Opens on **templates**, and `settings` arrives with a picked template — entering on the **default** template gives all three tabs an answer at once, and gives `Definition.default` somewhere to be read |
| **workspace** | holds the root block, **through the same three block slots**, which is what keeps it from being a fourth surface |

**The workspace is a block, so it is read as one.** The root already is one — `empty_graph` makes it a folder called *workspace* — so this is the block context with three rows filled differently, not a panel of its own:

| slot | workspace |
|---|---|
| **settings** | name, id, metadata. **No definition, label, pin or template** — the root stands for the project, and nothing names it |
| **packages** *(the `fields` slot)* | what this project draws on. Two sources exist already: the catalogue `fetch_list` reads, and `vocabulary()` grouped by `from`. **Reconciling the two is the check the Loose ends say nothing performs** |
| **contents** | the whole project, and this is the one place contents is recursive. `children` and `edges_in` are single-level by design, so this is a second source, not a widened one — and it is what finally gives *every run in the project, filtered to relations* a surface |

**So slot two is *what it declares*** — fields for a block, packages for the workspace, templates for a relation — **and slot three is *what exists***. The word on the tab changes with the subject; the panel does not.

**What is left of the tray otherwise.** What it becomes when it fills the stage, and whether a layer's settings are the same rows as an element's. See ST.16.

**Rules came out.** The panel could state three of the five kinds and only show the other two, because `look` writes one scalar and `ends` and `degree` are nested records. The model side stands — the `rules` component validates all five at the door, `rules_of` resolves them down the chain, `review` reads what survives. See ST.17.

### 3 — The explorer

**One tree, sections all the way down.** The panel holds two things today — the workspace and the definitions folder — and **the only difference that should matter is which one the user writes and which one the app does.**

**A section is a projection the app hands over, never a block.**

```
[ { label: "definitions", rows: projected,      editable: false },
  { label: "usages",      rows: children(root), editable: true  } ]
```

Both are projections over different sources, neither is a block, and a third costs a list entry. **Deliberately not real top-level folders**: `usages` would be a real block and `definitions` cannot be, since a definition has no parent — so one would be real and one projected, which is the special-casing this removes. It would also cost a migration, put a descent in front of every project, and stop `parent: null` meaning *in the root layer*. The shape already exists: `vocab_of` emits `@defs` at depth 0 beside the tree, and its docstring says why that works — *a rendering, not blocks, which is why it needs no reserved block, no seed change and no door migration*.

**So the root layer is a view of top-level sections without the graph saying so.**

**A definition is drawn as a block.** Same row renderer, same marks, same selection — and the projected `default` and `workspace` layers are openable canvases holding their definition blocks, each drawn **wearing its own style**, so a vocabulary can be read as a family at a glance. `free` arrangement, with a new definition placed automatically as a block is today.

| What that needs | |
|---|---|
| **`look_of` takes a definition id** | today it bails to `PLAIN` for anything not in `graph.blocks`. The edge half is done — `settings()` reads the cascade for either holder and `wire_of` spends it — so what is left is the definition case |
| **`pickedDef` merges into `picked`** | its docstring overstates the cost: `held()`, the `look` action and the settings panel already take either id. What needs auditing is the action `check`s doing `graph.blocks[id]`, which would refuse with a confusing message rather than a clear one |
| **the row builder stops branching on `of`** | and the menu gets genuinely simpler rather than relocated — `offer(ctx)` already narrows by each action's `on` scope, so giving a definition id a scope lets the registry narrow the menu and the explorer stops carrying a list |
| **`alias` is no longer overloaded** | it was carrying a block's `A1` and a definition row's word *default* in one slot. Identity is settled; *default* needs a slot of its own or a mark |
| **`Mark` loses `pin`** | nine marks say what a block is; the tenth was the definitions folder's icon |

**Relations stay out of the tree.** A relationship is made by drawing between two ends, never by dropping, so there is nothing to drag a relation row onto — pinned relation types are offered on the rail's `relations` group instead.

**No per-row marks.** Saying on a row that it cannot be dropped on empty ground is another specialization; what refuses a drop is the action, which already says why.

**What a definition canvas cannot show.** A grid definition drawn as a card cannot show cells or extent, a reference cannot show its hatch over a target, an interface is eight pixels. So the canvas compares **`style` only** — `style` is shared across blocks, interfaces and lines and `card` is not. It answers *do these look like a family?* and not *what will this be?*

**Wants the tray first**, as before. Search results live here already, lit rather than hidden.

### 4 — Block content

**A block holds text, and that is what makes it more than a structural container.** A requirement is a block with a description; a script is a block with code; a note is a block whose text is what it draws. See ST.18.

**It is already half-built.** `Block.body` is in the schema, `set_body` folds it and `describe` writes it — and **only the note reads it**, with no surface offering it. So this finishes something rather than adding it.

**The note stays a module.** It earns it twice over, and neither reason is about text: it is **the only ordinary card whose size is yours to set** — `NoteNode` is the one card carrying a resizer, every other being sized from what it holds — and **a relationship touching one is derived as a `tie`**, which `derived_module` reads before anything else. Both survive every block gaining a body.

**A note draws its identity line on its own line above its body.** Named, that is the name; unnamed, it is `Note N3` like every other card — **never the body text**, which is already in the space below it. A body-only note is `card.name: hide`, which the settings panel can now set.

| | |
|---|---|
| **every block, not only `resource`** | a requirement *is* a block with a description, and confining bodies to resources forces a wrapper element around everything worth documenting. `body` is already on `Block`, so this is the default |
| **drawn or held** | a note draws its body; a requirement holds one and shows it in the panel. A `card` key, cascading like everything else |
| **format is the definition's business** | `Requirement` says markdown, `Script` says code. **Not a new value form** — the closed set stays `text`, `number`, `flag`, `choice`, `link`, and `body` is a slot beside `fields` rather than one of them |
| **where it is edited** | the settings panel, full width below the two columns, under a BODY label |

**How it is stored: debounce first, content-address only if it bites.**

`set_body` carries the whole string, and the graph is folded by replaying every applied step — so a 50KB document typed live is a log full of near-identical 50KB mutations that every fold replays.

| | |
|---|---|
| **the cheap fix** | one step per editing session rather than one per keystroke. The log already has a cap and writes a checkpoint when it passes one, so growth is already bounded |
| **the thorough fix** | content-address the bodies: the log carries `set_body {id, content}` where content is a hash, and the blobs live beside the log. Dedupes for free, never overwrites, and undo works unchanged because a flipped step simply resolves to the earlier hash. **This is a blob store**, so it brings a GC problem the project does not have today, a new fault kind at the door, and a third input to `fold` |
| **what makes the choice deferrable** | **the graph and the file carry text, never a content id.** `fold` would resolve blobs on the way in, exactly as it already takes the floor as a non-log input. Keep that boundary and content addressing can be added later without touching a single reader, the file format, or the seam |
| **the trigger** | a checkpoint is *the whole graph as one mutation*, so it carries every body in full whatever the log does. Content addressing earns itself when bodies are edited often, not merely when they are large |

**Recommendation: debounce.** It is a few lines against a store, a collector and a fault kind, and the boundary above keeps the door open.


## Open questions

**Decided enough to build around, not decided enough to build.** Each is a question somebody has to answer, not a phase's worth of work.

### Relationships and definitions

| | |
|---|---|
| **`tie` is both picked and derived** | the rail offers it and `derived_module` also assigns it whenever an end is a note. Two ways for one module to arrive, and nothing says which wins where they disagree. Settle whether a tie is *only* what touches a note |
| **promoting an end that is already a port** | offered and then refused, because `when` cannot see which end a menu entry means. Harmless, and it says why |
| **the `interface` module earns keys of its own** | an interface is the one anchor for a proxy port, a full port, a pin and a constraint parameter, and a definition says nothing about which |
| **`flow` constrains nothing** | `ends.fromFlow` reads it and nothing else does. Whether a definition may *state* a flow, rather than only be checked against one, is unanswered |

### The grid

**A visual spreadsheet for blocks**, and **the central rapid-prototyping feature**: swimlanes, lifelines, tables and matrices are all meant to fall out of it rather than each costing code. What makes it more than layout is that **a cell address along the reading direction *is* the order and a header *is* the allocation** — both stated rather than guessed, which is what gives design.md's *the model defines itself as the user builds* a mechanism again.

| | |
|---|---|
| **`chain` under `free`** | it reads left-to-right, row by row, like a page — a fixed direction rather than the layer's, because `free` has none to offer. Fine for now; revisit if a layer ever gets a reading direction back |
| **the second allocation axis** | `row × column` works in the readers and nothing consumes it. An allocation matrix is the first thing that would |
| **one header row, one header column** | falls out of position being the rule: only row 0 can head a column, so a second tier of column headings is not sayable. Fine for a swimlane, a lifeline, a table and a matrix. Revisit only if something real wants two tiers |
| **a header's scope is a line** | deliberately. A scope that reached down-and-right instead would turn allocation from *at most two, one per axis* into an unordered pile of overlapping rectangles, and would need a nesting rule to answer *what is allocated to this*. Sectioning an outline is a different construct and does not get the word |
| **what allocation is *for*** | it is derived and correct, and nothing downstream reads it yet. Until something does, *the model defines itself as the user builds* has a mechanism and no product |


## Loose ends

| | |
|---|---|
| **Behaviour has no mechanism** | *The model defines itself as the user builds* is design.md's driving concept. **The grid is now half the answer** — a cell address states order and a header states allocation, both derived from position and stored nowhere. What is still missing is anything that *reads* them: no definition gains a field, no state is inferred, no interface is offered |
| **Definition shape is cut** | `card.layout` no longer offers `shape`. A definition picking a diamond drew as one on the canvas and as a rectangle in every export — a promise one renderer kept and the others could not. It comes back when they all can |
| **A named package is unchecked** | which definitions a project draws on is an ordinary field with a hardcoded name, and nothing checks that a named package exists. **The one thing pinning left owing** |
| **`tie` and `reference` are derived *and* stored** | both are *assigned from what sits at the ends* — except `derived_module` lives in `actions.ts`, so only an action ever derives one, while `Relation.module` stores the answer. A file, an import or a translator's graph saying `module: "line"` between a note and a block keeps saying `line`, where the app would have made it a tie. **Pick one**: the door re-derives both on the way in and the field is a cache, or they are picked like anything else and whoever writes a graph must say |
| **The SysML round trip loses both** | `mnd translate --round` on the extended sample reports every tie and reference lost and a plain line gained in its place. `LINK` in `apps/cli/src/sysml.ts` maps a module to a keyword on the way **out** — `comment`, `connect` — and `from_sysml` never reads it back, minting `line` for everything. A straight gap in the translator, and separate from the row above: fixing either alone would close it |
| **`FIRST` still orders retired keys** | `file.ts` lists `label` and `home` among the keys it orders first; neither has named a field since the identity rename and the pinning cleanup |
| **`LINK` still names `directed`** | `apps/cli/src/sysml.ts` maps a module that came out with `dir`. Dead entry, in the same table the row above has to fix anyway |
| **`View` is reserved, not retired** | it will name a data perspective — table, matrix, sequence — over the model. Cut now because it currently means nothing, and it comes back defined |


## Watch for

**Hazards for the work above**, each one paid for once already.

| | |
|---|---|
| **two names for one lattice** | `UNIT` is the measure and a `CELL` is a block plus its air. Nothing outside a grid is quantised to a cell — that was the old mistake, and it is worth not making twice |
| **a holder is two things to most callers** | a boundary and a grid answer the same question nearly everywhere: what a run may pass through, what a sweep picks, what a drop clears. Ask `is_holder` / `holds`, never a pair of literal comparisons — a grid on the wrong side of one walled every line inside it |
| **repairs are mutations, not edits** | the door returns repairs for somebody else to apply, so a check written after a migration still reads the graph as it came in. That is how the group→grid migration freed every address it had just rescued |
| **two heads tables, on purpose** | `theme/heads.tsx` is what the canvas and the tray render; `svg.ts` writes its own in a string, because the SVG export is a standalone document that already carries its own stylesheet and resolves no React. Worth knowing before somebody merges them |
| **stop inventing words where a convention exists** | `allocation` is the case that proved the rule: what looked like three inventions — swimlane, lane owner, tag — was one construct SysML already names |
