# Todo

**What is decided but not built, and what is still undesigned.** The goal state lives in design.md, spec.md and each package's `docs/`; this is the worklist against it.

Not a backlog of everything — an item earns a line here by being a decision somebody has to act on.


## Where it stands

**Built since the last pass** (2026-09-14), recorded so the sections below read against it rather than against what came before.

| | |
|---|---|
| **a tie can end on a line** | only a tie, only with a note at the other end, and never on another tie. It meets the line at the midpoint of its run through a `knot` node, is drawn only where the line is drawn, and goes when the line goes. *note* on a line and a right drag from a note onto a line both make one. The router moved into `views` so the canvas and the SVG export draw one run |
| **pin offers, it never makes or removes** | `pin` puts a relation definition on the rail or a block definition in the explorer's workspace folder. Making one from an element is `save_def`; dissolving one is `remove_def`. A new block definition is pinned as it is saved |
| **block definitions follow lines** | blocks and block definitions show settings · fields · contents · definitions · usages; fields and contents are an instance's. Styling a block or a line that names a workspace definition edits that definition; one naming none keeps a working look saved with *save definition*. The type row is a dropdown of definitions of the block's own kind. *Used* counts one definition's usages, never its subtypes' |
| **the tray names its context** | the head reads *block Tank*, *block definition Pump*, *new block definition*. A row picked in contents or usages is the context and drops any hold, while the table keeps its tab and listing. With something picked on the canvas, a definitions row only lights and offers *apply to …* |
| **hover and pick show different things** | hovering a row outlines a card or strokes a run in the accent; a pick also raises a card's fill and shows a run's grips |
| **tables share one layout** | data columns split the width evenly; chips and remove sit right in an action column reserved at a fixed width, so nothing reflows on a pick. Contents and usages share one *layer / workspace* scope chip, the layer by default |
| **style groups are trimmed** | `card.mark`, `card.shows` and `card.name` are gone and the door strips them. *colour* carries *pattern*; *label* has its own `label_align`; cards always write their name and only a run may hide its own. The bottom-right corner is reserved — ST.19 |
| **fixtures fold over the floor** | the retired seed step is gone, every suite and harness passes the floor, and every log fixture checks clean |
| **bugs closed** | reset style ran a renamed action; `relate` named a definition it never made; undoing an import emptied the workspace; import read without the floor; the browser storage port checked without the floor and blanked every `extends` naming a base kind on reload |

**The extended sample is the tester's workspace.** It still carries the two-kind shape — `def_none`, templates and types — so it opens with repairs, and its block definitions are unpinned, so they are missing from the workspace folder until re-pinned.


## Next up

**In order.** Each is a phase's worth on its own.

### 1 — Definitions, what is left of them

| | |
|---|---|
| **a held definition has no fields** | fields and contents are an instance's, so a definition's field schema is declared nowhere in the panel — only `field` from the terminal. Decide whether the fields tab shows a definition's schema |
| **the sample is not rewritten** | it is repaired on every open, and nothing in it is pinned. Rewrite it once the shape settles so it opens clean again |
| **existing block definitions are unpinned** | the workspace folder lists pinned definitions only, and nothing pinned them before `pin` meant this. Decide whether the door pins every workspace block definition once |
| **a tie has no base** | the base is `default: "line"`, so a tie follows nothing and draws no label. Either ties get a base of their own or the tables say *tie* rather than nothing |
| **an ungrouped `define` picks either** | the tray always says the group; a caller that does not — the terminal — gets whichever definition holds the name, the workspace's own first |
| **the base line costs two undos** | the first edit to the base files it and then makes the edit, as two steps |
| **`baseline` is on the registry** | so the terminal offers it like any other action |
| **a note about a tie is refused** | a tie ends on a line, never on a tie, so there is no line of its own to note |
| **dragging a tie's end onto a line does not relink** | `relink` accepts a line end, but the canvas's end grip only lands on blocks |
| **nothing new is tested** | ties on lines, `pin` / `save_def` / `remove_def`, definition-wide styling and the tray context were driven in the browser only, since the shape is still moving |

### 2 — The tray, what is left of it

**What the tray becomes when it fills the stage.** See ST.16. The layer button is gone: a layer is whatever block the canvas shows, so its settings are a block's.

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
| **`look_of` takes a definition id** | it bails to `PLAIN` for anything not in `graph.blocks`. **The line half is done**: `settings()` resolves a definition through `config_of` with no element layer over it, and `wire_of` takes either holder, so a held template previews. This is the same two lines on the block side |
| **`pickedDef` is a hold now** | the shell keeps one `Hold`, and the explorer's `pickedDef` is read off it. What still needs auditing is the action `check`s doing `graph.blocks[id]`, which would refuse a definition id with a confusing message rather than a clear one |
| **the row builder stops branching on `of`** | and the menu gets genuinely simpler rather than relocated — `offer(ctx)` already narrows by each action's `on` scope, so giving a definition id a scope lets the registry narrow the menu and the explorer stops carrying a list |
| **`alias` is no longer overloaded** | it was carrying a block's `A1` and a definition row's word *default* in one slot. Identity is settled; *default* needs a slot of its own or a mark |
| **`Mark` loses `pin`** | nine marks say what a block is; the tenth was the definitions folder's icon |

**Relations stay out of the tree**, and this is settled rather than deferred: a definition has no parent, so one in a containment tree is a category error. The relation vocabulary is the tray's, and the shortlist worth a right drag is the rail's.

**No per-row marks.** Saying on a row that it cannot be dropped on empty ground is another specialization; what refuses a drop is the action, which already says why.

**What a definition canvas cannot show.** A grid definition drawn as a card cannot show cells or extent, a reference cannot show its hatch over a target, an interface is eight pixels. So the canvas compares **`style` only** — `style` is shared across blocks, interfaces and lines and `card` is not. It answers *do these look like a family?* and not *what will this be?*

### 4 — Block content, what is left of it

**Every block holds a body and the panel edits it.** What remains is what a body *is* beyond text. See ST.18.

**The note stays a module.** It is **the only ordinary card whose size is yours to set**, and **a relationship touching one is derived as a `tie`**. Both survive every block gaining a body. A note draws its identity line above its body — never the body text as its name. **A card always writes its name**, so a body-only note is not sayable; whether a note may drop its name is open.

| | |
|---|---|
| **drawn or held** | a note draws its body; a requirement holds one and shows it in the panel. A `card` key, cascading like everything else |
| **format is the definition's business** | `Requirement` says markdown, `Script` says code. **Not a new value form** — the closed set stays `text`, `number`, `flag`, `choice`, `link`, and `body` is a slot beside `fields` rather than one of them |
| **content addressing, only if it bites** | the graph and the file carry text, never a content id, so blobs can come later without touching a reader. A checkpoint carries every body in full, so it earns itself when bodies are edited often, not merely when they are large |

### 5 — Docs, brought up to the model

**The docs are stale, and they are rewritten to match the code.** The 2026-09-13 review found drift across most of them; this is the pass that closes it.

| doc | what trails |
|---|---|
| **spec.md** | the Scene is `nodes`, `edges`, `perches` rather than boxes, routes and hits, and a `knot` node stands in for a line a tie meets; `net` is bound and `score` reaches the terminal directly; storage is localStorage; the kit table; *every log folds clean*; the elbow invariant |
| **definitions.md** | relation modules are `line` and `tie`; resolution is global by id, not by `home`; a kind is fixed at creation; `constraints` folded into `rules`; card layouts and the old style keys; pinning |
| **schema.md** | `name` and `order`; relation fields and ports; `from`, `default`, `label` and no `home` on a definition; the mutation ops; files are flat with `parent`; no name uniqueness; a tie's end may name a relation; `card` keys are `label`, `align`, `label_align`, `icon`, `alias` |
| **core engine, workspace, model** | file layout, the `rel_` prefix, `is_top_block`, relation types |
| **actions.md** | forty-one actions, not twenty-five; `label`, `lock` and `undefine` gone; `pin`, `save_def`, `remove_def`, `none`, `baseline`, `default`, `rename_def`, `order_field` missing; three adjustments; promotion has a gesture; `relate`, `relink` and `note` take a line as a tie's end |
| **ports.md, defs.md** | `net` is bound; packages live in `public/packages`; `tie` ships no definition |
| **packages README** | view modules, dagre, routing — now `views/route.ts` — and the Scene shape |
| **options.md** | the settings group replaced the element group |
| **stories.md, README** | ST.4, ST.13, ST.15, ST.16 and the tray section; package search fetches at run time |


## Open questions

**Decided enough to build around, not decided enough to build.** Each is a question somebody has to answer, not a phase's worth of work.

### Relationships and definitions

| | |
|---|---|
| **`tie` is both picked and derived** | the rail offers it and `derived_module` also assigns it whenever an end is a note. Settle whether a tie is *only* what touches a note — it is the one derived module left |
| **promoting an end that is already a port** | offered and then refused, because `when` cannot see which end a menu entry means. Harmless, and it says why |
| **the `interface` module earns keys of its own** | an interface is the one anchor for a proxy port, a full port, a pin and a constraint parameter, and a definition says nothing about which |
| **`flow` constrains nothing** | `ends.fromFlow` reads it and nothing else does. Whether a definition may *state* a flow, rather than only be checked against one, is unanswered |
| **a translator must say `label`** | a line definition with no label draws no words, so what a translator hands over is silent until it sets one. The seam's fixture does not |
| **the base floor lists as a package** | the packages tab shows `base` beside anything imported, because `from` is what makes a definition somebody else's and the floor carries one. The definitions table already leaves the floor out |
| **a definition may share a shipped name** | the sample's definition `line` does. `def_named` prefers the workspace's own, so it works; whether a name a shipped kind holds should be refused is unanswered |

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
| **A named package is unchecked** | which definitions a project draws on is an ordinary field with a hardcoded name, and nothing checks that a named package exists. **The packages tab is where this gets closed** — it already reads what is *in use* off `vocabulary()`, so reconciling that against the catalogue `fetch_list` reads is the check |
| **`tie` is derived *and* stored** | *assigned from what sits at the ends* — except `derived_module` lives in `actions.ts`, so only an action ever derives one, while `Relation.module` stores the answer. A file saying `module: "line"` between a note and a block keeps saying `line`. **Pick one**: the door re-derives it and the field is a cache, or it is picked like anything else |
| **The SysML round trip loses ties, and more** | `LINK` in `apps/cli/src/sysml.ts` maps `tie` to `comment` on the way out and `from_sysml` never reads it back, minting `line`; a tie on a line has no SysML form at all. The extended sample comes back 24 lines lost and 9 gained |
| **`FIRST` still orders a retired key** | `file.ts` lists `home` among the keys it orders first; it has named nothing since the pinning cleanup. `label` is a definition's again |
| **`locked` rides along** | blocks in the sample still carry `locked: true`, which nothing reads and the door does not drop |
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
| **the base line is read, never assumed** | `base_line` reads the workspace's default. The sample's base is `def_default` and a new one is `rel_default`; hard-coding either is how a draft minted `def_def_default` once |
| **a name is not an id, and not a group** | `rename_def` keeps the id, so a slug stops finding a renamed definition, and a block and a line may share a name. Ask `def_named` / `def_slot` **with the group**; a check without it calls a line's name taken by a block |
| **the graph in hand is from before the act** | an action's result lands on the next render, so reading the graph straight after dispatching finds nothing. Saving a draft held a lookup of its own name and dropped the tray to the workspace; hold the id `def_slot` says it will mint |
| **a control in a row stops the click** | a row pick is the context, so every `Entry`, `Choice` and chip stops propagation — one that does not repicks the row under the box being typed in |
| **a row pick keeps its listing** | picking a container's row would otherwise list that container's children and swap the table under the pointer; `browse` holds the listing a row was picked from while that row is the pick |
| **the draft is never listed** | it stands in the panel's graph so the registry can edit it, and nowhere else. Tables read the graph without it — reading the panel's graph is how a new definition renamed the draft instead of being added |
| **the canvas echoes a selection it cannot draw** | a row picked from another layer comes back from the canvas as an empty pick. App ignores that echo; a surface taking the canvas's report as a gesture will drop the tray's hold |
| **the scope chip decides depth, nothing else** | `children` and `edges_in` answer *in this layer*; only the *workspace* scope reads deep, in contents and usages alike. A table going recursive on its own is the drift to catch |
| **a door without the floor strips `extends`** | anything checking a log or a file must pass the shipped floor — the storage port and `session.load` both checked without it, and every definition extending a base kind lost its parent |
| **an app keeps its session across hot reload** | App holds the session in a ref, so a core change under a running dev server keeps the old action registry until the page reloads |
| **table widths are set on cells** | the head and the body are laid out as two tables so the body scrolls, so neither reads a `<col>`; the action column's width rides on its cells, in `rem` |
