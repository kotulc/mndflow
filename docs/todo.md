# Todo

**What is decided but not built, and what is still undesigned.** The goal state lives in design.md, spec.md and each package's `docs/`; this is the worklist against it.

Not a backlog of everything — an item earns a line here by being a decision somebody has to act on.


## Where it stands

**Built since the last pass** (2026-09-14), recorded so the sections below read against it.

| | |
|---|---|
| **one base model for every kind** | the shipped base is locked: eight block kinds plus `line` and `tie`, a relation base naming its module in `relation.module`. Every kind has a **default** — a workspace definition extending its base, laid by the fold until its first edit files it. Plain elements, and elements naming a base, follow their default. Defaults are never renamed, removed or pinned, and may be re-typed within their kind. Everything else is the workspace's and extends its base unless told otherwise |
| **the base line is gone** | `baseline`, `default` (*make default*), `BASE_LINE`, `base_line` and the tray's stand-in are removed; the door reads a default by its marker, so `rel_default` and `def_default` still work |
| **kinds stay kinds** | `retype`, `relate`, `chain` and `relink` keep a run's definition within its module, and store a base or a default as plain |
| **the door repairs once** | a default or definition extending nothing is pointed at its base; block definitions filed before block pinning existed are pinned once, on a stored log only |
| **definitions in the tray** | the fields tab declares a held definition's schema; extends is always shown, read-only for a base; a blank definition is filed when it is named; *save definition* is only for a working look |
| **the workspace is a block** | the same settings panel, styled for wherever an export is used, with the schema beside the card and every block tab plus packages |
| **identity rows** | name, tags as chips, type or extends; *pinned* sits beside the card, and bases and defaults offer none. Relations carry tags too |
| **explorer** | folders are *definitions* (ABC), *default* (lock) and *pinned* (pin); the bar's mark is a stack of files |
| **canvas** | group, grid and note names and labels take their styles; an explicit handle setting wins, an unset one shows only on an unnamed card; a default group dropped on empty ground makes an empty group |
| **samples** | both re-saved with their repairs and pins, and both open clean |


## Next up

**In order.** Each is a phase's worth on its own.

### 0 — Review, 2026-09-14: decided, not built

| | |
|---|---|
| **docstrings are minimal** | every comment short and to the point; oversized files split by purpose |

### 1 — Definitions, what is left of them

| | |
|---|---|
| **an ungrouped `define` picks either** | the tray always says the group; a caller that does not — the terminal — gets whichever definition holds the name, the workspace's own first |
| **dragging a tie's end onto a line does not relink** | `relink` accepts a line end, but the canvas's end grip only lands on blocks |
| **pinning once skips file imports** | a file carries no history, so an imported workspace's block definitions pin on its next load rather than on import |
| **a note about a tie is refused** | a tie ends on a line, never on a tie, so there is no line of its own to note |
| **nothing new is tested** | the base model, the door's repairs, `pin` / `save_def` / `remove_def`, tags and the tray were driven in the browser only, since the shape is still moving |

### 2 — The tray, what is left of it

**What the tray becomes when it fills the stage.** See ST.16.

| | |
|---|---|
| **rules came out** | the panel could state three of the five kinds and only show the other two, because `look` writes one scalar and `ends` and `degree` are nested records. The model side stands — the `rules` component validates all five at the door, `rules_of` resolves them down the chain, `review` reads what survives. See ST.17 |
| **a block is renamed per keystroke** | the settings name box sends `rename` on every change; every other box commits when left |
| **grids filter as blocks** | the contents chips count a grid under *blocks*, not *groups* |
| **the base floor lists as a package** | the packages tab shows `base` beside anything imported, because the floor carries a `from` |
| **adding a field from the bar** | the legacy app had it |

### 3 — The explorer

**One tree, sections all the way down.** The panel holds two things today — the workspace and the definitions folder — and **the only difference that should matter is which one the user writes and which one the app does.**

**A section is a projection the app hands over, never a block.** `vocab_of` already emits the definitions folder beside the tree as a rendering rather than blocks, which is why it needs no reserved block and no migration.

**A definition is drawn as a block.** Same row renderer, same marks, same selection — and the projected `default` and `pinned` folders are openable canvases holding their definition blocks, each drawn **wearing its own style**, so a vocabulary reads as a family at a glance. The canvas compares **`style` only**, since a grid, a reference or an interface drawn as a card cannot show what makes it one.

| What that needs | |
|---|---|
| **`look_of` takes a definition id** | it bails to `PLAIN` for anything not in `graph.blocks`. The line half is done: `wire_of` takes either holder |
| **action checks read `graph.blocks[id]`** | a definition id would be refused with a confusing message rather than a clear one |
| **the row builder stops branching on `of`** | `offer(ctx)` already narrows by each action's scope, so giving a definition id a scope lets the registry narrow the menu |
| **the tree ignores `card.alias`** | a row always shows an unnamed element's handle, whatever its card says |

**Relations stay out of the tree**, and this is settled: a definition has no parent. The relation vocabulary is the tray's, and the shortlist worth a right drag is the rail's.

### 4 — Block content, what is left of it

**Every block holds a body and the panel edits it.** What remains is what a body *is* beyond text. See ST.18.

**A card always writes its name; a note's name is its body.** A note is never named by hand — what it draws as its name is derived from its body. **Not built**: the `note` action writes the body and the canvas draws `shown_name`, so a new note reads *Note*.

| | |
|---|---|
| **drawn or held** | a note draws its body; a requirement holds one and shows it in the panel. A `card` key, cascading like everything else |
| **format is the definition's business** | `Requirement` says markdown, `Script` says code. Not a new value form — `body` is a slot beside `fields` |
| **content addressing, only if it bites** | the graph and the file carry text, never a content id, so blobs can come later without touching a reader |

### 5 — Docs, brought up to the model

**The docs are stale, and they are rewritten to match the code once the shape settles.**

| doc | what trails |
|---|---|
| **spec.md** | the Scene is `nodes`, `edges`, `perches`, with a `knot` node for a tie on a line; `net` is bound and `score` reaches the terminal directly; storage is localStorage; the kit table; the elbow invariant |
| **definitions.md** | base, default and workspace definitions; `relation.module`; relation modules are `line` and `tie`; resolution is global by id; a kind is fixed at creation; `constraints` folded into `rules`; pinning |
| **schema.md** | `name` and `order`; relation tags and ports; `from`, `default`, `label` on a definition; the mutation ops; files are flat with `parent`; a tie's end may name a relation; `card` keys are `label`, `align`, `label_align`, `icon`, `alias` |
| **tray.md, explorer.md** | defaults replace the base line and *make default*; the pinned folder; pinned beside the card; tags; the workspace as a block; drafts filed when named; the types chip gone |
| **core engine, workspace, model** | file layout, the `rel_` prefix, `is_top_block`, relation types |
| **actions.md** | `label`, `lock`, `undefine`, `baseline` and `default` gone; `pin`, `save_def`, `remove_def`, `none`, `rename_def`, `order_field` missing; `tag` takes a relation; three adjustments; `relate`, `relink` and `note` take a line as a tie's end |
| **ports.md, defs.md** | `net` is bound; packages live in `public/packages`; `tie` ships a base |
| **packages README** | view modules, routing in `views/route.ts`, the Scene shape |
| **options.md** | the settings group replaced the element group |
| **stories.md, README** | ST.4, ST.13, ST.15, ST.16 and the tray section; package search fetches at run time |


## Open questions

**Decided enough to build around, not decided enough to build.**

### Relationships and definitions

| | |
|---|---|
| **promoting an end that is already a port** | offered and then refused, because `when` cannot see which end a menu entry means |
| **the `interface` module earns keys of its own** | an interface is the one anchor for a proxy port, a full port, a pin and a constraint parameter, and a definition says nothing about which |
| **`flow` constrains nothing** | `ends.fromFlow` reads it and nothing else does |
| **a translator must say `label`** | a line definition with no label draws no words |
| **a definition may share a shipped name** | every default is named after its kind; `def_named` prefers the workspace's own, so it works. Whether a name a shipped kind holds should be refused is unanswered |

### The grid

**A visual spreadsheet for blocks**, and **the central rapid-prototyping feature**: swimlanes, lifelines, tables and matrices fall out of it. A cell address along the reading direction *is* the order and a header *is* the allocation.

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
| **A named package is unchecked** | the packages tab reads what is in use off `vocabulary()`; reconciling that against the catalogue is the check |
| **The SysML round trip loses ties** | `tie` goes out as `comment` and comes back as `line`; a tie on a line has no SysML form |
| **The SVG export paints by kind** | notes, groups and ties are coloured by class in `svg.ts`, where the canvas reads their definitions |
| **Note detection is spelled three ways** | `module_of`, a literal `type === "note"`, and a `config_of` read in `cells_of` |
| **The door renames old looks on blocks only** | `stale_looks` never reads a relation's `looks` |
| **`FIRST` still orders a retired key** | `file.ts` lists `home` |
| **`locked` rides along** | the extended sample still carries `locked: true`, which nothing reads and the door does not drop |
| **`View` is reserved, not retired** | it will name a data perspective over the model |


## Watch for

**Hazards for the work above**, each one paid for once already.

| | |
|---|---|
| **two names for one lattice** | `UNIT` is the measure and a `CELL` is a block plus its air. Nothing outside a grid is quantised to a cell |
| **a holder is two things to most callers** | ask `is_holder` / `holds`, never a pair of literal comparisons |
| **repairs are mutations, not edits** | a check written after a migration still reads the graph as it came in |
| **two heads tables, on purpose** | `theme/heads.tsx` for React, `svg.ts` for the standalone export |
| **stop inventing words where a convention exists** | `allocation` proved it |
| **a default is read by its marker, never its id** | the sample's are `def_default` and `def_default_*`, a new one `rel_default_line`. Ask `default_for` |
| **naming a base is naming nothing** | `def_of` sends a base type to its kind's default, and `stored_type` writes a base or a default as plain. A new maker that writes `type` directly skips both |
| **a default's display is not its name** | tables show `default/<kind>`; an action keyed on a name must be given the definition's own name, or it files a new one |
| **a name is not an id, and not a group** | ask `def_named` / `def_slot` **with the group** |
| **the graph in hand is from before the act** | hold the id `def_slot` says it will mint rather than looking one up |
| **a control in a row stops the click** | every `Entry`, `Choice` and chip stops propagation, or the row is repicked under it |
| **a row pick keeps its listing** | `browse` holds the listing a row was picked from |
| **the draft is never listed** | tables read the graph without it |
| **the canvas echoes a selection it cannot draw** | App ignores the empty pick a row from another layer comes back as |
| **the scope chip decides depth, nothing else** | only the *workspace* scope reads deep |
| **a door without the floor strips `extends`** | anything checking a log or a file must pass the shipped floor; without it no defaults are laid either |
| **an app keeps its session across hot reload** | reload the page after a core change |
| **table widths are set on cells** | the action column's width rides on its cells, in `rem` |
| **a style attribute has to reach the writing** | a look's attributes are read by descendant selectors, so a name floated outside the dressed element takes none of them — the group name did |
