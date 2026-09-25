# Stories

**A story is a goal somebody has,** It says what has to be *true for a person* before any of it counts. One story spans a lot of building.

**A story is finished only when it has been driven.** Work landing makes a story *closer*, never
done. **A green suite never closes one** — every real defect this project has had came from driving
the built app, not from the suite. Twice, every piece of a story was built and the story still did
not work.

---

## Reaching outward

### ST.5 — The workspace reaches outside itself

Pull a package or a file from a **public GitHub repo** and have it land as blocks you can use —
**not as a file you then have to import by hand**.

### ST.6 — A model becomes something else

Translate a project out — **the site first**, then simulator, parametrics and code in an order
nobody has set. **One way out, and it never writes back.**

### ST.7 — The terminal earns its place

One collapsible strip that says **where you are, what you just did, and what you could do next** —
with **four commands**, flexible verbs, and **the whole action surface behind `?`**.

**Not a command palette and not a chat.**

---

### ST.12 — The plan stops being prose that agents parse

Stories, work, what a thing owns and what it waits on are a **schema**, not a document. Drafted as
translator.md, and **probably its own project** rather than anything to build here.


### ST.18 — A block holds content, so it is worth opening

Write a requirement's text, a part's description, a script's code **into the block itself** — and have it travel, export, undo and be searched like everything else the block carries. A block stops being a box with a name on it and becomes somewhere work actually lives.

**The want is utility, not annotation.** A note already says something *about* a diagram. This is different: the block **is** the requirement, and its text is the requirement's body. Anything less means the real content lives in another tool and the model points at it.

| | |
|---|---|
| **already half-built** | `Block.body` is in the schema, `set_body` folds it, `describe` writes it — and only the note reads it, with no surface offering it |
| **every block** | a requirement is a block with a description; confining bodies to one kind forces a wrapper element around everything worth documenting |
| **a note stays a module** | and for reasons that are not about text: it is the only ordinary card that resizes, and a relationship touching one is derived as a `tie`. What changes is only that it stops being the *sole* holder of a body |
| **format is the definition's** | `Requirement` says markdown, `Script` says code. Not a new value form — the closed set stays as it is, and `body` is a slot beside `fields` |

**What it opens, and is not in scope yet:** search over content, a body rendered on the card rather than in the panel, and code with a language. Each is its own thing once the text is there at all.

**Watch for:** bodies are the first thing this project stores that is large and edited often. The browser log stores each body once by hash, beside the log, while **the graph and the file carry text rather than a content id** — so the storage choice stays reversible.


### ST.20 — A block is the content it represents

Open any block and **find the thing it stands for in its body**: a definition's data, a requirement's text, a script's code. A definition reads as a block too — listed in the explorer with the same rows and marks, dragged out to make an instance or onto an element to retype it — so vocabulary and model stop being two forked worlds with two sets of gestures.

**This is the start, not the whole.** It sharpens ST.18: the body is not an annotation slot but *the* content, and what that content is depends on what the block is.

| block | its body holds |
|---|---|
| **a definition** | its data — the stored definition, exactly as filed. Read only for now |
| **an ordinary block** | text: a description, a requirement, the reason it exists |
| **a script or an external file** | code, or what the block's `source` points at |

| | |
|---|---|
| **definitions are blocks to the user, not to the graph** | they draw as block rows and take block gestures, but are not in `graph.blocks` until dragged onto the drawing as an instance |
| **one gesture to apply** | dropping a definition on an element retypes it where the kinds agree, and refuses in words where they do not; on the empty drawing it makes one, and a relation says lines must connect existing blocks |
| **filed like the tree** | the workspace's own definitions sit in folders the user makes and reorders; *pinned* and *default* are the system's, and a package is frozen |

| What that still needs | |
|---|---|
| **`look_of` takes a definition id** | it answers `PLAIN` for anything outside `graph.blocks` and `graph.holders`. The line half is done — `wire_of` takes either holder |
| **action checks read `graph.blocks[id]`** | a definition id is refused with a confusing message rather than a clear one |
| **the row builder stops branching on `of`** | the explorer branches on `row.of` in twenty places. `offer(ctx)` already narrows by each action's scope, so giving a definition id a scope lets the registry narrow the menu |
| **the tree ignores `card.alias`** | a row always shows an unnamed element's handle, whatever its card says |

**Relations stay out of the tree, and this is settled:** a definition has no parent. The relation vocabulary is the tray's, and the shortlist worth a right drag is the rail's.

**Open:** whether a definition's data becomes editable in place, and what a body's format is — markdown, code with a language, JSON — and who says so, the definition or the block.

### ST.21 — Finding a thing beats knowing where it is

Type a few words into the explorer and **have what you are looking for come back ranked**, whatever it is and wherever it sits — a block three layers down, a definition a package brought, a note whose text you half remember. The tree is how a workspace is *arranged*; this is how it is *searched*, and a workspace outgrows the first long before the second.

**A filter, not a second tree.** It takes over the explorer's body while a term is in it and gives the tree straight back when it is cleared. Nothing is folded, revealed or selected by searching — finding is not going.

| | |
|---|---|
| **where it lives** | first control in the explorer bar, under the hamburger the options rail used to wear. It may end up a layer over the panel rather than part of it |
| **what it reads** | name, type and label, then body content. **Relevance is one order**, not four lists — a name match outranks a body match, and how far is part of the design |
| **what a result is** | a card: the element's icon and its name in bold, and under it the properties that matched, so a hit says *why* it is a hit |
| **what it spans** | blocks, definitions, relations and holders. Whether packages and their definitions are in by default is open |

**Open:** whether relevance is scored or merely ordered; whether a result is picked, revealed or opened in the tray; what happens to a term when the graph changes under it; and whether this is the same machinery as the terminal's `search`, which already exists and fetches packages.

## Future stories

**Named so nothing is built against them by accident.**

| | What waits |
|---|---|
| **Allocation** | a grid's headers already derive what is allocated to each line. A story that *reads* allocation — a matrix, a trace, a report — is what gives it a consumer |
| **Behaviour** | *the model defines itself as the user builds*. A cell address is an order and a header is an allocation; nothing reads either as behaviour yet |
| **SysML round trip** | a `tie` goes out as `comment` and comes back as a `line`. Part of ST.6 |
| **A named package is checked** | the definitions tab reads what each package brought and what is in use; reconciling that against the catalogue |

## Loose ends

**Small, real, and with no story of their own.**

| | |
|---|---|
| **one tab pattern, half applied** | the `fields` tab is the pattern every editing tab should read as: banded bodies of labelled lines, then an `add` line that takes what is being added and commits it. `Entry` was pulled out and is shared; **`Commit` is still private to `Fields.tsx`, and the add line is copied between `Fields.tsx` and `Packages.tsx`** |
| **the SVG export paints by kind** | `svg.ts` styles `.card.note` and `.route.tie` from a sheet it carries, where the canvas reads their definitions. The two disagree the moment a definition restyles a note |
| **a read-only listing still looks live** | without `onAct`, the definitions, packages and usages tabs act with nothing: their add and filter inputs draw as usual and do nothing. The element, fields and workspace tabs disable theirs; these three do not yet |
| **the class card sits under its usages** | a diagram's class card is a stand-in, and the layout seats stand-ins after the blocks beside them. Putting the schema on top wants the layout to rank it first |
| **a long layer fits too small to read** | the camera fits the whole layer, so one tall column of cards — a document read top to bottom — shrinks past reading. Fitting to width, or a floor on the zoom, would keep a card legible |
| **a diagram draws no instance lines** | each usage in a fields diagram stands apart from its class card; nothing draws the *instance of* between them |
| **two rows lit for one diagram pick** | picking the class card holds its definition while the block the diagram was drawn for stays picked, so the explorer lights both |

## Recent Decisions

### Marks describe, and stack

**A card's bottom corner says what it stands in for, or what describes it — never both.** A stand-in wears one written word: `Def`, `Ref` or `Pkg`. Anything else wears what is true of it, drawn, and those stack. **The first is `data`, a database**: the block carries field values, or its definition declares a schema. **`Ext` is gone** — every block may carry a `source`, so having one describes nothing.

### The shell's defaults are kept once

**The tray starts open, nothing picked on the root layer is the root picked, and the root opens on its workspace tab** — where the card size, the key and the lattice are set. These are `useTray` and `useDisplay` in the tray package, and the app runs on them as the kit's hosts do. **The app binds ports; the rules live in the packages**, so a host outside this repo inherits them rather than restating them.

### A block's fields draw as a class diagram

**The fields tab offers `view diagram` wherever a block answers a workspace schema.** The canvas draws one card standing for the definition, listing `name: form`, and one per usage listing its values — a graph of its own, drawn in place of the layer and never written. A table's schema is its rows'; a package's own fields are its vocabulary, not the workspace's data, so they draw nothing.

### A layer draws the key to itself

**The legend lists what the open layer draws and what it means** — each kind's colour, mark and word, and under a rule the system marks they wear. Each half is dropped where the layer has none. The rail toggles this layer; the workspace tab says what a layer does when it has said nothing. **A default, never a lock:** a layer overrides the workspace either way, and one toggled back into agreement drops its answer and follows again. What it lists is always the open layer, whichever right-hand corner it sits in.

### The defect it found, and the rule that comes out of it

**Driving is not enough — it has to be driven against the shipped sample.** A seed written by whoever is looking tests the path they already had in mind.

| | |
|---|---|
| **what happened** | `look_of` asked `"type" in b` to tell a block from a holder. **A block naming no definition carries no `type` key at all**, so it failed the test and was read as a holder — called `grid` where it carried a layer `arrangement`, `group` otherwise |
| **how long it hid** | since the field became optional. `look.kind` is written on a card only where a definition asks for the label, and no sample asked; nothing else read it |
| **what surfaced it** | the legend, which puts every kind word in one list. Two rows read *group* and *grid* against a reference's mark and a block's, and the real *block* and *reference* rows were missing — swallowed into them |
| **the rule** | **key presence is not a type discriminator.** Where two shapes share a lookup, ask the graph which one it is — `graph.blocks[id]` against `graph.holders[id]` — never whether the object happens to carry a field. An optional field makes the test wrong for the commonest case, so it reads as correct right up until something looks |

**A green suite said nothing**: 372 tests and a clean typecheck, across two rounds of driving. The synthetic seed written to exercise the legend gave every block a type, so it never took the path. The extended sample did, on the first draw.

## Watch for

**Hazards, each paid for once already.** Not goals — the things that bite while the work above is done.

| | |
|---|---|
| **two names for one lattice** | `UNIT` is the measure and a `CELL` is a block plus its air. Nothing outside a grid is quantised to a cell |
| **a holder is two things to most callers** | ask `is_holder` / `holder_of`, never a pair of literal comparisons |
| **key presence is not a type discriminator** | ask the graph which shape it is — `graph.blocks[id]` against `graph.holders[id]` — never whether the object carries a field. An optional field makes the test wrong for the commonest case |
| **two heads tables, on purpose** | `theme/heads.tsx` for React, `svg.ts` for the standalone export |
| **stop inventing words where a convention exists** | `allocation` proved it |
| **a word about a package's definition is read by its marker, never its id** | ask `default_for`, which finds the workspace definition whose `default` names that one. The extended sample's is `def_default`, speaking for `line` |
| **naming a base is naming nothing** | `def_of` sends a base type to the workspace's word about it, and `stored_type` writes a base or such a word as plain. A maker that writes `type` directly skips both |
| **a word about a definition wears that definition's name** | two rows read `block`, told apart by their source column. An action keyed on a name is given the group too, and `def_named` answers the workspace's own first |
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
| **a table's widths ride on its cells** | the contents table is `table-layout: fixed`, so a column is as wide as its head cell says, not the column element |
| **a style attribute has to reach the writing** | a look's attributes are read by descendant selectors, so a name floated outside the dressed element takes none of them |

## Out of scope, recorded so nothing is built on it

- **Search results as a thing you look at.** Narrowing the workspace to a word and putting what matched on the stage — as a table, as a listing, anywhere. **Driven, and it was not useful**: the results were a second way of looking at blocks you can already see, and everything that supported them — the `filter` command, `matches`, the narrowing chip, the table view they presented through — cost more than they paid. Recorded rather than deleted because *finding a block by name* is a real want; what is out of scope is answering it with a view of its own. It comes back, if it does, as something the explorer does.
- **Embedded content in a block** — a script, an image or a video carried *inside* the
  project rather than pointed at. A block holds content; whether that content is inline or
  a path is the open half, and **inline means the log carries bytes**, which is a durability and
  file-size decision nobody has taken.
- **Local variation, for multi-user work.** Somewhere for a view to hold a change that never reaches
  the project it read, with an explicit promotion later. **It cannot hang off a reference** — a
  reference carries nothing but where it sits, so it would need a mechanism of its own. For one user
  it is an extra step on the commonest path, so writes go straight home instead.
- **A live store for real multi-user work.** *(A cloud drive as an export destination is not this:
  it is a place one file is sent, with no sync and no server holding the project.)* Files plus git
  give one-owner-at-a-time, which is honest but is not collaboration. Genuine concurrent editing
  wants a shared store and presence, not a merge algorithm over exported JSON. **Recorded so the
  file format is never bent toward pretending to solve it.** Team management belongs with it.
- **Two SysML losses**, accepted rather than solved: trace assertions keep their claim as a typed
  group and lose the bracket notation, and lifeline left-to-right order is presentation living in
  the view.
- **Enhanced packages as a value-add, served from a private repo or a server.** That is a hosted
component.


