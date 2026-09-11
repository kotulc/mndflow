# Todo

**What is decided but not built, and what is still undesigned.** The goal state lives in design.md, spec.md and each package's `docs/`; this is the worklist against it, newest thinking first.

Not a backlog of everything — an item earns a line here by being a decision somebody has to act on.


## Next up

**In order.** Each is a phase's worth on its own; the grid below is what they build on. **0 gates the rest** — identity is what the explorer, the definition canvas and pinning all rest on.

### 0 — Identity

**Settled, and it gates everything below.** Five id shapes and four naming systems were in play, with two of them doing each other's job. The split, stated once:

| | Answers | Scope | Changes | Drawn |
|---|---|---|---|---|
| **`id`** | which thing, for the file and the code | workspace | never | never |
| **`alias`** | which thing, **for a person** | workspace, per kind | never once minted | when unnamed, or when asked for |
| **`name`** | what it means | none — not unique | **freely** | **a style option**, like every other writing on the card |
| **`order`** | where it sits among its siblings | per parent | on every move | never |

**`id` is machine identity, `alias` is human identity, `name` is meaning.** Every earlier wrinkle came from one of the three being asked to do another's job.

**Ids are minted, and a readable name is derived from them.**

| | |
|---|---|
| **reserved ids stay bare words** | `ws`, and the shipped base definitions. A published contract — `defs/README` says the engine knows them by id |
| **everything else is minted and opaque** | elements and definitions alike. **`def_<slug>` goes**: it broke the rule `ids.ts` opens with — *a name is never part of an id* — and made a definition unrenameable, which is why the panel had to show its name read-only |
| **`<owner>.<name>` is derived, never stored** | `ws.pump`, `sysml.part` — computed from the owner and the **current** name, so it is always accurate. A frozen slug would have gone stale on the first rename; this cannot |
| **a package mints once, at authoring time** | its ids are its contract and a written-down token is as stable as a slug ever was |

**Renaming always succeeds.** Nothing resolves by name, so a collision costs an ambiguous display name and nothing else — it is a warning, never a refusal. *Not being able to change a name, and not being told why,* was the whole complaint, and minted ids are what answer it.

**Kind is fixed at creation, which is what makes a handle permanent.**

| | |
|---|---|
| **`OPEN_MODULES` goes** | with it the clause in `may_retype` that let a block, a folder and a resource swap. **A block may only name a definition of its own module.** A user makes the kind they meant |
| **`retype` stays** | it is doing two jobs and only one is the holdover. Pointing a block at a definition — plain block to `Pump` — *is* how a vocabulary is applied, and removing it would remove subtyping. Only the cross-module half goes |
| **promotion mints rather than converts** | an anchor is derived and stored nowhere, so promoting one adds a new interface block. Nothing's handle is ever rewritten |

**Aliases.**

| | |
|---|---|
| **every element carries one** | blocks and relationships alike. Three unnamed lines in a layer all read `line` today, with nothing to tell them apart |
| **per kind, with a plain counter** | `B1`, `I1`, `L1`, `G1`. Safe **because kind is now fixed at creation** — the earlier objection, that a promoted or retyped element would have to change its handle, no longer applies |
| **the letter stops being a digit** | `alias_name` encodes one integer today — `(n % 9) + 1` with the letters as `floor(n / 9)` in base 26 — so the letter was positional and never meant anything. Per-kind letters replace that encoding with a counter each, trading `A1…Z9` in two characters for `I247` at scale |
| **a definition needs none** | its derived `<owner>.<name>` already is its handle |
| **a stored counter, not a scan** | `next_alias` is a high-water mark over *live* elements, so it is safe against a gap in the middle but **reuses the serial of the highest one once that is deleted**. A handle that comes back meaning something else is not a handle |
| **`card.alias: "show" \| "hide"`** | whether the handle joins the displayed name. A component key, so it cascades: a definition may say *every Pump shows its handle*, one element may override, and the checkbox writes `look card alias` |

**One identity line, one fallback rule.** A card draws what the thing is called, and where nothing is called anything it draws what it *is* plus its handle. **Never the body** — that was a note-shaped branch in `named()`, and one rule for every block replaces it.

```
name, if set   →  "Feed pump"    (+ alias where card.alias = show → "Feed pump B4")
otherwise      →  label + alias  →  "Note N3"
```

**Most of this already exists**: `named()` falls through `fallback()` to `kind_word()`, which returns the type word for anything unnamed, and `alias_of` already returns nothing once something is named — which is `card.alias: hide` as the default. Two changes only: **append the alias to the fallback**, and **delete the note-body branch**.

**The words, because one of them just changed meaning.** `Block.label` is renamed `Block.name`, so **label** no longer names a field and now means the opposite thing.

| Word | Is | Lives |
|---|---|---|
| **name** | the user's text, optional | `Block.name` — a field |
| **label** | the **type word** — the definition's name, or the module word | **derived, never a field.** `look.kind` already computes it |
| **alias** | the handle, `N3` | `Block.alias` |

**Two keys govern the identity line, and a third the type word.**

| Key | Governs |
|---|---|
| **`card.name`** | whether the identity line is drawn at all. Hidden gives a blank card, or a note showing only its body. **It reverses a recorded decision** — `components.ts` says *the name is not asked this: a card without its name is a box nobody can read*. That premise is what changed: once a block carries a body, a nameless card is not a blank box |
| **`card.alias`** | whether the handle joins a **set** name. The fallback always carries one, which is the whole reason it needs one |
| **`card.label`** | unchanged — where the type word sits as a *second* writing: above, inside, below, none |

**The toggle belongs in the style rail's `name` group, not in the Body section.** Hiding the identity line gives a body-only note, but the same key gives a blank card with no body at all — filing it under Body would make a card-wide control look like a body feature.

**`num` is renamed `order`**, which is all it has ever been. **`Block.label` is renamed `Block.name`** — the field held what the card draws as its *name*, while `card.label` positions the **type word**, so the schema was calling two different things by one word a row apart.

**What the settings panel asks.**

| Row | Means | Writes |
|---|---|---|
| **name** | what this one thing is called. **Not required** — absent, it reads as its type word, which `kind_word` already does | `Block.name` / `Definition.name` |
| **alias** | its handle, read-only, with the show-in-name checkbox beside it | `card.alias` |
| **type** | which definition it resolves through, of its own module only | `Block.type` / `Definition.extends` |
| ~~**label**~~ | **goes.** It was a draft name for pinning rather than a property of anything, one row from the field that writes the block's name. `pin` already has `asks: true` on its name argument, so the menu prompts for it | — |
| **BODY** | full width, **below the two columns**, under its own label | `Block.body` — see 5 |

### 1 — Relationships, interfaces and ports

**One area, not two.** What a relationship *is* and what an interface *is* are the same question asked at the two ends of a line, and neither settles alone. Designed; building next.

**The ends model stays as it is.** `from` and `to` always name a block — the real one where the end is an anchor, the interface block where it has been promoted — and `fromSide` says the wall in the first case. So *is this end a port* is `module_of(graph, e.from) === "interface"`: derived, stored nowhere, and **asked per end**, which is what lets one end be a port and the other not. One end and only one is the ordinary case — a proxy port meeting an internal part — and the engine could not keep *both or neither* anyway, since it refuses an interface on a note and on a boundary.

**A line and its ends are not one element.** An interface is a real element with a name and a type, and the model already said so under *promotion*. Four things it would cost: a port takes many lines and an owned end could not share one; an interface outlives every line, so an unconnected port would be unsayable; deleting a line would delete named content, against *displacement is never destructive*; and `degree` would die, since every minted-per-line interface has degree 1.

**Settled.**

| | |
|---|---|
| **`card` is the block-only component; `style` is shared** | all ten `style` keys — family, hue, intensity, opacity, the three border keys, the three name keys — apply to a block, an interface **and** a line. What a line and an interface lack is a *face*, which is exactly what `card` describes: label placement, align, shows, icon, mark, fill. So **a module declares which components it honours**, and the tray's group rail filters on it. `MODULES` in `components.ts` already gives every module a key list and every one of them is empty |
| **a relationship gets a small `line` component** | the two arrowheads, and what draws at each end. Flat keys — `from_arrow`, `to_arrow`, `from_shows`, `shows`, `to_shows` — matching the `name_*` and `border_*` convention, and flat because `look` writes one scalar |
| **multiplicity and a guard are fields on the relationship** | neither is an interface: one port serves many lines, each with its own. What makes them special is only *where they draw*, which is `line.from_shows` / `shows` / `to_shows` — the direct parallel to `card.shows`. Role name and stereotype are the same mechanism. **`degree` is not multiplicity**: `degree` is a rule on a definition counting how many lines may meet a usage; multiplicity is a value on one end of one relationship |
| **`ends` walks through a port** | `end()` checks the type of whatever block the line touches, so promoting an end silently broke every `ends` rule written against block types. It now checks the end block and, where that is an interface, accepts a match on its owner. **No new keys** — `fromFlow` already checks a property only an interface has, so the two divide the labour: `from` says what kind of thing is at this end, `fromFlow` says it must be a port and which direction |
| **the settings preview is a run between two ends** | a `Wire` in the tray, sibling to `Card` and built the same way: a short run, each end drawn as anchor or port, arrowheads from `dir`, the name in the middle, end fields where `from_shows` names any. Painted from the same `style` attributes the stage paints from, so preview and canvas cannot disagree |
| **the line's menu** | *add direction* (`direct forward`, when undirected), *flip direction* (`flip`, when directed and not both), *remove direction* (`direct none`), and *promote this end* / *promote both* (`interface` with `edge` and `end`, which already does the whole job). **`flip` and `direct back` are never both offered** — they draw the identical picture and only one moves `from` and `to`, which `chain`, allocation and `ends` all read |
| **menu verbs are named by their subject** | *rename block*, *rename relation*, *delete relation*. `Entry` already takes a `label`, so it is a word per entry and no new mechanism. Worth it because the `route`, `name`, `anchor` and `box` menus are all reachable within a few pixels of one line |
| **no double-click on a line** | two clicks already mean *go in* or *edit this name*, and the wire's name takes the second out of the double-click handler. Direction is the menu's |
| **`refer`, `interface` and `group` take a `type`** | only `create` does today, which is why a definition can be dragged out but not applied on the way in |
| **a definition needing something a layer cannot supply is refused** | `create` has no `check` at all, so dragging an **interface** definition out mints a wall-less block that `is_interface` calls false and `module_of` calls an interface. The guard belongs on `create`, not only on the drop path, because the terminal calls `create` with a type directly |

**What a dragged definition does.**

| Module | Empty ground | On a block |
|---|---|---|
| block, folder, resource, note | create in the layer | create in the layer, clear of it — as today |
| **grid** | create — a grid owns its corner, so an empty one is a real thing | beside it, never on it |
| **interface** | refuse: *interfaces may only be added to existing blocks* | becomes an interface of that block |
| **group** | refuse: a rim round nothing has no bounds | a rim round that block |
| **reference** | refuse | **refuse — and it is refused on a block too.** `refer` already turns down a target on the current layer, so there is no drop that would work. A reference is made by dragging the **block**; a reference *definition* is style-only and applies by retyping an existing reference through the tray's picker |

**The drop path has to hit-test**, which it does not: `onDrop` runs `clear_of`, which deliberately *avoids* the cards it would now need to land on. `Flow` already answers this for node drags through `landing_on`.

**Still open.**

| | |
|---|---|
| **whether pinning applies to a relationship** | a customised line could file a relation definition the way a block files a block one. If it does, the vocabulary section holds something undraggable; if it does not, relation vocabulary has no home |
| **what an interface definition says** | an interface is the one anchor for every port-like thing — a proxy port, a full port, a pin and a constraint parameter — and today a definition says nothing about which. It stays an ordinary block definition extending `interface`; the question is whether the `interface` module earns keys of its own |
| **`flow` still constrains nothing** | `ends.fromFlow` reads it, and nothing else does. Whether a definition may *state* a flow, rather than only be checked against one, is unanswered |
| **housekeeping** | `fromAt` and `toAt` are marked *legacy, not read by layout* and should go. `unlink` says *and any interfaces it leaves spare* and its run deletes only the edge — the run is right, the wording is wrong |

### 2 — Definitions, unified

**After 1, because the shape of a relation definition decides how much of this is shared.** The cascade is right — `isa` → `config_of` per property → the element's own `looks` last — and it is unified over definitions and over all eight block modules. It is **not** unified over blocks and relationships, and the panel that edits it still branches on which of the three it is holding.

| | |
|---|---|
| **`Styles.tsx` is 429 lines with ~30 `d ?` branches** | the two columns are two things. The left is *identity* — name, definition, label, pin, default — and is where every branch lives; the right is already uniform over any holder. Split them, and the second takes a block, a relationship or a definition without asking which |
| **`ROWS` is half a table** | 13 controls are declared as data; `hue`, `intensity`, `opacity`, `icon` and `mark` are hand-written JSX with their own group guards. A `form` on `Question` collapses them, and `NUMBERS` and the range consts already carry the metadata |
| **`card.shows` cannot be set** | validated at the door, read by `look_of`, drawn by the stage *and* by the preview, and no surface authors it. Give it a row or drop the key |
| **three tables are copied** | `BASE_IDS` and the `Role → IconName` map each live in two packages, and the definition-path wording in two more. The icon map is icon data and belongs in `theme`; `BASE_IDS` wants a `shipped()` in core — its literal `"line", "directed"` is the two shipped relation *defs*, not the four relation modules, so it breaks quietly if that ever gets an export |
| **`role_of` (9) vs `module_of` (8)** | `container` exists in one and not the other, which is why the tray reads `ROLE[kind as Role] ?? "role_leaf"` — two fallbacks and a cast at one call site |
| **the extends chain is written from three places** | `pin` sets it, `define` re-points it, the picker offers it — and only `define` checks `borrowed`, only the picker checks for cycles. The cycle guard belongs in `define`'s `check` |
| ~~**`Definition.name` is read-only**~~ | **settled in 0.** Scoped ids frozen at creation mean a rename never rewrites the id, so the name becomes an ordinary editable field and `pin`'s *is already taken* becomes a real name check within one owner |

**Three of these do not wait on 1**: the copied tables, the `role_of` / `module_of` mismatch, and the cycle guard. They touch no definition shape and can land any time. The other four all turn on what a relation definition holds, and splitting `Styles.tsx` before that is known risks splitting it in the wrong place.

### 3 — The tray

**Context-sensitive.** Three tabs now — settings, fields, contents — and full height landed as a control of its own. What is left is what the tray becomes when it fills the stage, and whether a layer's settings are the same rows as an element's. See ST.16.

**Rules came out.** The panel could state three of the five kinds and only show the other two, because `look` writes one scalar and `ends` and `degree` are nested records. The model side stands — the `rules` component validates all five at the door, `rules_of` resolves them down the chain, `review` reads what survives. See ST.17, which wants 1 under it first.

### 4 — The explorer

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
| **`look_of` takes a definition id** | today it bails to `PLAIN` for anything not in `graph.blocks`, and must read `config_of(graph, d.id, …)` instead. **The same edit item 1 needs for edges** |
| **`pickedDef` merges into `picked`** | its docstring overstates the cost: `held()`, the `look` action and the settings panel already take either id. What needs auditing is the action `check`s doing `graph.blocks[id]`, which would refuse with a confusing message rather than a clear one |
| **the row builder stops branching on `of`** | and the menu gets genuinely simpler rather than relocated — `offer(ctx)` already narrows by each action's `on` scope, so giving a definition id a scope lets the registry narrow the menu and the explorer stops carrying a list |
| **`alias` is no longer overloaded** | it was carrying a block's `A1` and a definition row's word *default* in one slot. Identity is settled in 0; *default* needs a slot of its own or a mark |
| **`Mark` loses `pin`** | nine marks say what a block is; the tenth was the definitions folder's icon |

**Relations stay out of the tree.** A relationship is made by drawing between two ends, never by dropping, so there is nothing to drag a relation row onto. Pinned relation types are offered on the rail's `relations` group instead — see 1.

**No per-row marks.** Saying on a row that it cannot be dropped on empty ground is another specialization; what refuses a drop is the action, which already says why.

**What a definition canvas cannot show.** A grid definition drawn as a card cannot show cells or extent, a reference cannot show its hatch over a target, an interface is eight pixels. So the canvas compares **`style` only** — which is exactly the split settled in 1, where `style` is shared across blocks, interfaces and lines and `card` is not. It answers *do these look like a family?* and not *what will this be?*

**Wants the tray first**, as before. Search results live here already, lit rather than hidden.


### 5 — Block content

**A block holds text, and that is what makes it more than a structural container.** A requirement is a block with a description; a script is a block with code; a note is a block whose text is what it draws. See ST.18.

**It is already half-built.** `Block.body` is in the schema, `set_body` folds it and `describe` writes it — and **only the note reads it**, with no surface offering it. So this finishes something rather than adding it.

**The note stays a module.** It earns it twice over, and neither reason is about text: it is **the only ordinary card whose size is yours to set** — `NoteNode` is the one card carrying a resizer, every other being sized from what it holds — and **a relationship touching one is derived as a `tie`**, which `derived_module` reads before anything else. Both survive every block gaining a body.

**A note draws its identity line on its own line above its body.** Named, that is the name; unnamed, it is `Note N3` like every other card — **never the body text**, which is already in the space below it. A body-only note is `card.name: hide`, not a special case.

| | |
|---|---|
| **every block, not only `resource`** | a requirement *is* a block with a description, and confining bodies to resources forces a wrapper element around everything worth documenting. `body` is already on `Block`, so this is the default |
| **drawn or held** | a note draws its body; a requirement holds one and shows it in the panel. A `card` key, cascading like everything else |
| **format is the definition's business** | `Requirement` says markdown, `Script` says code. **Not a new value form** — the closed set stays `text`, `number`, `flag`, `choice`, `link`, and `body` is a slot beside `fields` rather than one of them |
| **where it is edited** | the settings panel, full width below the two columns, under a BODY label — see 0 |

**How it is stored: debounce first, content-address only if it bites.**

`set_body` carries the whole string, and the graph is folded by replaying every applied step — so a 50KB document typed live is a log full of near-identical 50KB mutations that every fold replays.

| | |
|---|---|
| **the cheap fix** | one step per editing session rather than one per keystroke. The log already has a cap and writes a checkpoint when it passes one, so growth is already bounded |
| **the thorough fix** | content-address the bodies: the log carries `set_body {id, content}` where content is a hash, and the blobs live beside the log. Dedupes for free, never overwrites, and undo works unchanged because a flipped step simply resolves to the earlier hash. **This is a blob store**, so it brings a GC problem the project does not have today, a new fault kind at the door, and a third input to `fold` |
| **what makes the choice deferrable** | **the graph and the file carry text, never a content id.** `fold` would resolve blobs on the way in, exactly as it already takes the floor as a non-log input. Keep that boundary and content addressing can be added later without touching a single reader, the file format, or the seam |
| **the trigger** | a checkpoint is *the whole graph as one mutation*, so it carries every body in full whatever the log does. Content addressing earns itself when bodies are edited often, not merely when they are large |

**Recommendation: debounce.** It is a few lines against a store, a collector and a fault kind, and the boundary above keeps the door open.

## Landed

### Pinning

**Point at a block that already reads the way you want, and make that a definition.** Built, and every question the decision opened has an answer.

| Was open | Is |
|---|---|
| **where it is filed** | nowhere. `home` was removed — it governed nothing, because `def_of` and `isa` resolve by id globally and always did. `from` says who owns a definition, and absent means this workspace made it |
| **what it takes** | the whole of `looks`, and the field *schema* with no values. What a block happens to hold is that block's answer, not the default for every future one |
| **what happens to the element** | it names the new definition and drops the overrides, reading the same answers one layer further along the chain. Reversible: `unpin` dissolves a definition back into everything that named it and then drops it, losslessly |
| **naming** | asked. A name already taken is refused, said with the name rather than with the id it slugged to |
| **re-pinning** | a new definition. Duplicates are allowed where the names differ — two things reading alike today may diverge tomorrow |
| **a retired definition living on in every log** | fixed, and not by a migration. **The floor is the shipped package and it is not in the log** — it is handed to `fold` rather than laid down as step 0, so a definition the build changes is changed in every workspace already written. A checkpoint replaces it too, or opening a file would hand a workspace the exporter's copy of `base` |

**Still owed:** which definitions a project draws on is an ordinary field with a hardcoded name, and **nothing checks that a named package exists.**

## The grid

**A visual spreadsheet for blocks.** One canvas view, in which a grid carries rows, columns, merged cells and headers. Blocks are plugged into cells and pulled back out. **This is the central rapid-prototyping feature**, and swimlanes, lifelines, tables and matrices are all meant to fall out of it rather than each costing code.

**Why it matters beyond layout.** The inference that was cut read order from *position along a directional arrangement* — a guess, which is why it needed four tiers and a write-home gate to be safe. A cell address along the reading direction **is** the order, and a header **is** the allocation: both stated rather than guessed. That is what gives design.md's *the model defines itself as the user builds* a mechanism again.

### Built

| | |
|---|---|
| **schema** | `group`, `cell {r,c}`, `header`, `rows`, `cols`, `merges: Span[]` on `Block`. A grid owns its `x`/`y`; a boundary still derives its bounds from its members |
| **mutations** | `set_group`, `seat_cell`, `set_header`, `set_grid`, `merge_cells`, `split_cells` |
| **readers** | `grid_of`, `cell_of`, `members_of`, `at_cell`, `merge_at`, `region_of`, `group_depth`, and the two that matter — `allocations_of(block)` and `allocated_to(header)` |
| **the door** | migrates any block carrying an extent to the grid module, drops a cell outside its grid or second into an occupied one, drops overlapping merges. **Every repair frees the block rather than deleting it** |
| **placement** | `CELL`, `cell_box` honouring merges, gridded members placed by address, a holder's box from its extent or from its members' bounds, a gridded container minified |
| **actions** | `group` (a boundary or a grid, by argument), `seat`, `header`, `insert`, `remove`, `merge`, `transpose`, `chain`, `leave` |
| **the canvas** | cells answer a click and carry a `cell` scope in `Context`; right-drag on empty ground draws a grid sized in cells and captures what it covers; a drop resolves to an address; a dragged corner sets an extent |
| **the retirement** | `table`, `matrix`, `view` and `pin`-as-a-view came out as one piece. Search results are the explorer's |

### Revised since this was decided

**The rows below replace what the original decision said.** Each was changed while building, and the reason is worth keeping.

| Was decided | Is now | Why |
|---|---|---|
| arrangement **drops** `grid`, leaving `free` and four directions | arrangement **keeps** `grid` and drops the four directions. **Two values** | The directions ranked by relationships through dagre, which drew a picture of the graph rather than of the model. `grid` names auto-layout onto the lattice, and the lattice is the one a group is a region of — so the two meanings turned out to be the same meaning |
| a group **is** a grid region; a boundary is one with no rows or columns | `group` and `grid` are **two modules**. 8, not 7 | They differ in what a member's place *is* — a boundary reads its bounds off wherever its members ended up, a grid says where each member goes. That is a difference in code, not in configuration |
| **one group per block, no nesting** | one group per block, **nesting allowed**, cycles refused | `can_hold` walks the membership chain, and `group_depth` orders both placement and z-order. A grid inside a swimlane is the obvious want and cost nothing once nesting was cycle-checked |
| **headers are row 0 and column 0**, marked by the grid's `headers` setting | a header is a **promoted block**, and **position says which line it heads**: row 0 heads its column, `{0,0}` heads both, anything else heads its row | Two mechanisms shipped by accident and never met — allocation read the grid setting, the gesture wrote a block field, and allocation was dead as a result. What replaced them was a stored role, which stated the same fact twice and let a drag put the two out of step. **Position is the whole rule now**: promote and demote is the gesture, `transpose` needs no header code, and row 0 / column 0 is still what a header row means — it just is not a setting on the grid |
| `set_grid {id, rows, cols, headers}` | `set_grid {id, rows, cols}` | follows from the row above |
| `chain` skips a **header strip** counted off the top and left | `chain` skips **any header, wherever it sits** | simpler, more general, and it drops two readers |

### Still open

| | |
|---|---|
| **`chain` under `free`** | it reads left-to-right, row by row, like a page — a fixed direction rather than the layer's, because `free` has none to offer. Fine for now; revisit if a layer ever gets a reading direction back |
| **the second allocation axis** | `row × column` works in the readers and nothing consumes it. An allocation matrix is the first thing that would |
| **one header row, one header column** | falls out of position being the rule: only row 0 can head a column, so a second tier of column headings is not sayable. Fine for a swimlane, a lifeline, a table and a matrix. Revisit only if something real wants two tiers |
| **a header's scope is a line** | deliberately. A scope that reached down-and-right instead would turn allocation from *at most two, one per axis* into an unordered pile of overlapping rectangles, and would need a nesting rule to answer *what is allocated to this*. Sectioning an outline is a different construct and does not get the word |
| **what allocation is *for*** | it is derived and correct, and nothing downstream reads it yet. Until something does, *the model defines itself as the user builds* has a mechanism and no product |
| **swimlanes as the proof** | the `gridded` fixture is one: blocks heading rows, flow relations across, `chain` linking them. It cost no new code, which was the test |

### Watch for

| | |
|---|---|
| **two names for one lattice** | `UNIT` is the measure and a `CELL` is a block plus its air. Nothing outside a grid is quantised to a cell — that was the old mistake, and it is worth not making twice |
| **a holder is two things to most callers** | a boundary and a grid answer the same question nearly everywhere: what a run may pass through, what a sweep picks, what a drop clears. Ask `is_holder` / `holds`, never a pair of literal comparisons — a grid on the wrong side of one walled every line inside it |
| **repairs are mutations, not edits** | the door returns repairs for somebody else to apply, so a check written after a migration still reads the graph as it came in. That is how the group→grid migration freed every address it had just rescued |


## Vocabulary

**Stop inventing words where a convention exists.** With one way to draw, several terms have nothing left to distinguish.

| Gone | Why |
|---|---|
| **view module** | there is one way to draw |
| **view definition** | nothing left to configure |
| **layer view** | it is *the diagram* |
| **reading** | cut |
| **promote** as a *noun* | the gesture is **promote** and **demote**; what it makes is a **header**, and so is the cell it fills. One word each, not two for the thing |
| **implied order** | nothing infers order from position on a layer any more. A cell address states it |

| Stays | Is |
|---|---|
| **layer** | the block you are inside |
| **diagram** | what a layer looks like drawn |
| **lattice** | the lines everything lands on, one unit apart. **This is what `grid` used to be asked to mean** |
| **grid** | a block module: a bounded region of the lattice with an extent and cells |
| **group** | a block module: a boundary round a set, sized from what it holds |
| **holder** | either of those two, where a caller means both |
| **projection**, **Scene** | internal. Code words, not user words |

**`grid` still names two things and that is deliberate now.** The `grid` *arrangement* is auto-layout onto the lattice; the `grid` *module* is a region of it. They are the same lattice, which is what lets a block the layer placed line up with a block seated in a cell — so this is one word for one lattice, seen from two sides.

**Reserved, not retired.** *View* will name a data perspective — table, matrix, sequence — over the model. It is cut now because it currently means nothing, and it comes back defined.

**Use the standard word wherever one exists.** `allocation` is the case that proved the rule: what looked like three inventions — swimlane, lane owner, tag — was one construct SysML already names.


## Loose ends

| | |
|---|---|
| **Behaviour has no mechanism** | *The model defines itself as the user builds* is design.md's driving concept. **The grid is now half the answer** — a cell address states order and a header states allocation, both derived from position and stored nowhere. What is still missing is anything that *reads* them: no definition gains a field, no state is inferred, no interface is offered |
| **Definition shape is cut** | `card.layout` no longer offers `shape`. A definition picking a diamond drew as one on the canvas and as a rectangle in every export — a promise one renderer kept and the others could not. It comes back when they all can |
| **A named package is unchecked** | which definitions a project draws on is an ordinary field with a hardcoded name, and nothing checks that a named package exists. **The one thing pinning left owing** |
