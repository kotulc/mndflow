# Tasks

**What is decided but not built, and what is still undesigned.** The goal state lives in design.md, spec.md and each package's `docs/`; this is the worklist against it. An item earns a line by being a decision somebody has to act on.


## Where it stands

**The app, as of 2026-09-18** — branch `revise-workspace-layout`, carrying the block refactor recorded in plan.md.

| | |
|---|---|
| **checks** | `npm run typecheck` clean, `npx vitest run` 363 in 13 files, `npm run lint:css` clean, the web app builds, and the CLI's `check` reads both samples clean |
| **the model** | **three element kinds** — blocks, relations and holders. **Three block modules** (`block`, `reference`, `interface`), each read from a stored field; a **kind** is a definition, and the `base` package ships seven. **There is no `resource`** — every block carries a `source`, so a kind for external content named a slot rather than a sort of thing |
| **capabilities** | `rules` split into `allows` — ports, holds, members, degree, ends, refused at the gesture — and `expects` — required, match, advice only |
| **holders** | boundaries and grids left `Block` for `graph.holders`. Membership stays on the block (`group`, `cell`, `header`); `set_holder` and `drop_holder` replaced the six grid ops |
| **relations** | `line` and `tie`, both **definitions rather than modules**, derived from the ends and re-derived at the door. Both ends are blocks |
| **packages** | a `Package` record with a unique name, `from` naming its id, `package`/`remove_package` actions, and a tray tab that lists what the workspace draws on and fetches one more from the catalogue. **`base` lists with the rest, wearing a lock** |
| **nothing from outside is written** | there is no `default` collection. Editing a package's definition — the floor's included — mints the workspace's word about it, filed with the workspace's definitions, and **that word stands in front of it in every chain that reaches it**, so a subtype reads it too. Identity stays the package's: no rename, no drop, no restate |
| **content** | a first-class `source` slot — uri, anchor, revision — written by the `source` action. Provenance, never a link the app follows |
| **marks** | the card icon keeps the top corner and fills when a card holds parts; the bottom corner writes `Ref`, `Def`, `Pkg` or `Ext`. The treemap is gone and every card is one height |
| **the door checks, it does not migrate** | integrity, component validation, one default per base, a definition extending nothing pointed at its base, holders whose layer is gone, and duplicate package names. A schema change re-saves the samples |
| **the explorer** | packages — `base` included — then definitions with `pinned`, `blocks` and `relations` directly under it, then the workspace tree. Its bar leads with the **filter**, which is a disabled placeholder for ST.21. **Folding reads at two scales, down one column at the right edge**: the bar's fold takes every collection, and each collection also folds itself from the far end of its own root row |
| **storage** | the log in IndexedDB, each body kept once by SHA-256 hash, loaded before the app mounts. One gesture is one step, through `session.batch` |
| **the definitions tab** | **lists every definition there is**, a package's and the floor's beside the workspace's own. Hiding the floor had made *all* a smaller word for *workspace* and left the kinds every block descends from unreadable |
| **the page** | the explorer's bar, the tray's and the options rail's are one height, and the tray drops its top rule at full height, so the three read as one line across. Under the tray's tabs a gutter each side holds its content off both rails; the tab strip spans the tray. Opening or shutting the tray frames the drawing again — taking the full height does not, since no room is left to fit into |
| **what is proven** | the suites cover the engine, the door, the grid, geometry, the seam and the two card corners. **The refactor's own defects were found by reading, not by the suite** — holder identity, `graft` carrying holders, and the mark rule had no test and each was broken at some point |


## Next up

**In order.** Each is a phase's worth on its own.

### 1 — One tab pattern, applied

**The `fields` tab is the pattern every editing tab should read as**: banded bodies of labelled lines, and a final `add` line that takes what is being added and commits it. The `packages` tab follows it already. **Bring the rest into line**, and pull the shared pieces — `Commit`, the add line — out of `Fields.tsx` so the pattern is one thing rather than a resemblance.

### 2 — Tests for what has settled

| | |
|---|---|
| **holders** | identity and handles, `graft` carrying them, a boundary going with its last member, and the grid ops through `set_holder` |
| **marks** | the precedence rule, the two corners, and what fills |
| **the base and default model** | a default per base, laid by the fold and filed on first edit; a plain element following it; `retype` keeping a kind |
| **definitions** | `save_def`, `remove_def` dissolving into usages, `pin` offering, and a rename reaching every usage |
| **the session** | `batch` as one step and one undo, `graft` keeping the workspace's defaults, and an export carrying only what was touched |
| **bodies** | a body stored once by hash, read back on load, and a log that never carries the text |

### 3 — The tray, what is left of it

**What the tray becomes when it fills the stage.** See ST.16 in stories.md.

| | |
|---|---|
| **rules are stated nowhere** | the panel could state three of the five kinds and show the other two, because `look` writes one scalar while `ends` and `degree` are nested records. The model side stands: the `rules` component validates all five at the door, `rules_of` resolves them, and `review` reads what survives. See ST.17 |
| **a block is renamed per keystroke** | the element tab's name box sends `rename` on every change; every other box commits when it is left |
| **grids filter as blocks** | the contents chips count a grid under *blocks*, not *groups* |
| **adding a field from the bar** | the legacy app had it |

### 4 — The explorer

**One tree, sections all the way down.** The panel holds three collections drawn with one row — packages, definitions, and the workspace itself — and the only difference that should matter is which one the user writes and which one the app does. A section is a projection the app hands over, never a block — `packs_of` and `vocab_of` already emit two beside the tree.

**A definition is drawn as a block.** Same row renderer, same marks, same selection, and the projected folders are openable canvases holding their definitions, each wearing its own style, so a vocabulary reads as a family. The canvas compares `style` only, since a grid, a reference or an interface drawn as a card cannot show what makes it one.

| What that needs | |
|---|---|
| **`look_of` takes a definition id** | it bails to `PLAIN` for anything not in `graph.blocks`. The line half is done — `wire_of` takes either holder |
| **action checks read `graph.blocks[id]`** | a definition id is refused with a confusing message rather than a clear one |
| **the row builder stops branching on `of`** | `offer(ctx)` already narrows by each action's scope, so giving a definition id a scope lets the registry narrow the menu |
| **the tree ignores `card.alias`** | a row always shows an unnamed element's handle, whatever its card says |

**Relations stay out of the tree**, and this is settled: a definition has no parent. The relation vocabulary is the tray's, and the shortlist worth a right drag is the rail's.

### 5 — Block content, what is left of it

**Every block holds a body and the panel edits it.** What remains is what a body *is* beyond text. See ST.18.

**A card always writes its name; a note's name is its body.** Not built: the `note` action writes the body and the canvas draws `shown_name`, so a new note reads *Note*.

| | |
|---|---|
| **drawn or held** | a note draws its body; a requirement holds one and shows it in the panel. A `card` key, cascading like everything else |
| **format is the definition's business** | `Requirement` says markdown, `Script` says code. Not a new value form — `body` is a slot beside `fields` |
| **content addressing, only if it bites** | the graph and the file carry text rather than a content id, so blobs can come later without touching a reader |

### 6 — Docs, brought up to the model

**Rewritten to match the code once the shape settles.** The last commit refreshed most of the root and core docs; what is listed here is what still trails.

| doc | what trails |
|---|---|
| **spec.md** | a `knot` node for a tie on a line, which is gone |
| **options.md** | the rail offers no *tie* |
| **stories.md, README** | ST.4, ST.13 and ST.15; package search fetches at run time |
| **defs.md** | packages live in `public/packages`; `tie` ships a base |


## Open questions

**Decided enough to build around, not decided enough to build.**

| | |
|---|---|
| **promoting an end that is already a port** | offered and then refused, because `when` cannot see which end a menu entry means |
| **the `interface` module earns keys of its own** | an interface is the one anchor for a proxy port, a full port, a pin and a constraint parameter, and a definition says nothing about which |
| **`flow` constrains nothing** | `ends.fromFlow` reads it and nothing else does |
| **a translator must say `label`** | a line definition with no label draws no words |
| **a definition may share a shipped name** | every default is named after its kind, and `def_named` prefers the workspace's own. Whether a name a shipped kind holds should be refused is unanswered |

### The grid

**A visual spreadsheet for blocks**, and the central rapid-prototyping feature: swimlanes, lifelines, tables and matrices fall out of it. A cell address along the reading direction *is* the order and a header *is* the allocation.

| | |
|---|---|
| **`chain` under `free`** | it reads left-to-right, row by row, because `free` has no direction to offer |
| **the second allocation axis** | `row × column` works in the readers and nothing consumes it |
| **one header row, one header column** | only row 0 can head a column, so a second tier is not sayable. Revisit only if something real wants two |
| **a header's scope is a line** | deliberately; a region scope would make allocation an unordered pile |
| **what allocation is *for*** | it is derived and correct, and nothing downstream reads it yet |


## Loose ends

| | |
|---|---|
| **Behaviour has no mechanism** | *the model defines itself as the user builds* has half an answer in the grid; nothing yet reads an order or an allocation |
| **Definition shape is cut** | it comes back when every renderer can draw one |
| **A named package is unchecked** | the definitions tab reads what is in use off `packages()`; reconciling that against the catalogue is the check |
| **The SysML round trip loses ties** | `tie` goes out as `comment` and comes back as `line` |
| **The SVG export paints by kind** | notes, groups and ties are coloured by class in `svg.ts`, where the canvas reads their definitions |
| **Note detection is spelled three ways** | `module_of`, a literal `type === "note"` in `arrange.ts`, and a `config_of` read in `look.ts` |
| **`locked` rides along** | the extended sample still carries `locked: true` three times, which nothing reads and the door does not drop |
| **The kit release is stale** | `release/kit.json` names `0.3.0`, packed from a commit well behind this branch |
| **`View` is reserved, not retired** | it will name a data perspective over the model |


## Watch for

**Hazards for the work above**, each one paid for once already.

| | |
|---|---|
| **two names for one lattice** | `UNIT` is the measure and a `CELL` is a block plus its air. Nothing outside a grid is quantised to a cell |
| **a holder is two things to most callers** | ask `is_holder` / `holds`, never a pair of literal comparisons |
| **two heads tables, on purpose** | `theme/heads.tsx` for React, `svg.ts` for the standalone export |
| **stop inventing words where a convention exists** | `allocation` proved it |
| **a default is read by its marker, never its id** | ask `default_for`; the sample's are `def_default` and `def_default_*`, and a new one is `rel_default_line` |
| **naming a base is naming nothing** | `def_of` sends a base type to its kind's default, and `stored_type` writes a base or a default as plain. A maker that writes `type` directly skips both |
| **a default's display is not its name** | tables show `default/<kind>`; an action keyed on a name must be given the definition's own name, or it files a new one |
| **a name is not an id, and not a group** | ask `def_named` with the group; ids are minted and never derived from a name |
| **the graph in hand is from before the act** | mint the id and pass it to the action rather than looking one up afterwards |
| **a batch folds between calls** | inside `session.batch` each action sees the one before it, and all of them undo as one |
| **no door migrations** | a schema change re-saves the samples; it never adds a repair |
| **a group goes with its last member** | anything moving a member out may delete the group, and any relation on it |
| **a control in a row stops the click** | every `Entry`, `Choice` and chip stops propagation, or the row is repicked under it |
| **a row pick keeps its listing** | `browse` holds the listing a row was picked from |
| **the draft is never listed** | tables read the graph without it |
| **the canvas echoes a selection it cannot draw** | App ignores the empty pick a row from another layer comes back as |
| **the scope chip decides depth, nothing else** | only the *workspace* scope reads deep |
| **a door without the floor strips `extends`** | anything checking a log or a file must pass the shipped floor; without it no defaults are laid either |
| **an app keeps its session across hot reload** | reload the page after a core change |
| **table widths are set on cells** | the action column's width rides on its cells, in `rem` |
| **a style attribute has to reach the writing** | a look's attributes are read by descendant selectors, so a name floated outside the dressed element takes none of them |
