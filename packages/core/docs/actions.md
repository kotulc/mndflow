# The surface

**Every action the engine offers, every gesture that reaches one, and what is deliberately not on the surface.** This is the goal state, written in definitions.md's vocabulary.

- **Why it takes this shape** → design.md, *The action surface is the input seam*.
- **What each part does** → spec.md. **The data contract** → schema.md.

**Three properties hold over everything below.**

- **A new sort of thing is a definition**, which is data, and it reaches the surface through the actions already here. The set is small on purpose rather than closed by decree: an action earns its place by being something somebody would say, and two actions saying one thing are one action.
- **Every action is sayable.** That is the test for being one at all: something somebody meant and could put in words. What cannot be said is an adjustment.
- **An action returns mutations; it never applies them.** One seam serves the pointer, the keyboard and the terminal, so no input path can do something the others cannot.

**Scope is the question a gesture already asks** — what is under the pointer, or what is selected. `layer` means the open layer is enough; `block`, `edge`, `cell` and `selection` mean one of those is picked.

**Each action carries a sentence saying what it does.** That sentence is what a typed word is scored against — names are too short — and it is the **Does** column. The descriptor is the source.


## Actions

Thirty-nine, two of them navigation.

### Blocks

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `create` | makes a new block in a layer, where you pointed if you did | layer | name?, parent?, type?, spot? | `add_block` / `set_holder` |
| `delete` | removes blocks and everything they own, or relationships | block, edge, selection | ids | `delete_block` / `delete_edge` |
| `rename` | changes what a block or a relationship is called | block, edge | id, name | `update_block` / `set_def` |
| `retype` | sets which definition a block or a relationship names | block, edge | ids, type | `update_block` / `update_edge` |
| `describe` | writes the body text of a block | block | id, body | `set_body` |
| `move` | puts blocks under a different parent, in the place you dropped them | block, selection | ids, parent, before?, spot? | `move_block` |
| `refer` | places a stand-in for a block, a definition or a package into this layer | layer | target, type?, spot? | `add_block{of}` |
| `source` | says what a block stands in for outside the workspace, or gives it back | block | id, uri? | `set_source` |
| `tag` | puts words on a block or a relationship to say what it is like | block, edge, selection | ids, tags | `set_tags` |
| `look` | sets how this draws, or what it asks — on a block, a line or a definition | block, edge, selection | ids, key, name, value? | `set_look` / `set_def` |
| `none` | gives back every look this says for itself, to whatever it inherits | block, edge, selection | ids | `drop_looks` / `set_def` |

**`move` absorbs nesting, filing and ordering** — they differ only in where the parent comes from: a sibling, the layer above, a folder, or the workspace. **A selection moves in one step.**

**Leaving a layer leaves everything about where you were in it.** A place and a holder's membership are both facts about the layer that held the block, so a move out of one drops them — and **a boundary whose last member leaves goes with it**.

**`create` makes a holder where the type names one.** `group` and `grid` are holder shapes, so `create` writes a `set_holder` rather than an `add_block`; everything else is a block.

**`retype` keeps a kind a kind, and `block`, `folder` and `note` are one kind.** Those three are the open family and a block moves among them freely; every other kind carries something a change of type cannot invent, so it is fixed when the block is made. A run is retyped only to relation definitions of its own base, and a block never names a relation definition. A base or a default is stored as plain.

**`rename` on a line files a new definition over the one it follows**, and moves the line onto it — the same gesture a block's *definition* row makes, since a line is named by its definition and never for itself. The new one extends what the line followed and keeps a label of its own, while a label that only repeated the old name follows the new one. **A definition is renamed in place** with `rename_def`, where every usage reads the new name. A name already taken in the group is refused.

**`tag` and `look` are model data, not display preferences.** What an element says about itself travels in the file and undoes like anything else. `look` writes one property at a time and an absent value gives it back to the chain — **customising an element is local to it** until `save_def` makes a definition of it.

**`delete` never reaches through a reference.** Deleting a holder frees its members — which is why *dissolve* is not a second action.

### Navigation

**Writing no mutations is what makes an action navigation.** No step is written, there is nothing to undo, and **the terminal never offers these**.

| | Does | Scope | Arguments | Effect |
|---|---|---|---|---|
| `open` | opens a block as the layer being drawn, or leaves this one when told no block | block | id? | `open` |
| `reveal` | opens the layer a block lives in and selects it there | block | id | `open` + `focus` |

**`open` absorbs the way out.** **Absent `id` is the way out**, which nothing but a gesture can say, so it is never in the offered list.

**The way out of an interface is the way in.** An interface is drawn in two layers at once — seated on its owner's border, and set into that owner's wall seen from inside — so leaving one lands back in whichever of the two you came from.

### Relationships

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `relate` | draws a relationship from one block to another | layer | from, to, type?, dir?, fromSide?, toSide? | `link_blocks` |
| `relink` | takes one end of a relationship to another block | edge | id, end, to | `set_end` + `set_side` (+ `update_edge`) |
| `unlink` | removes a relationship, leaving the interfaces it met | edge | id | `delete_edge` |
| `flip` | turns a relationship around | edge | id | `flip_edge` |
| `direct` | sets which way a relationship's arrows point, or takes them off | edge | id, dir | `set_dir` |

**Both ends are blocks.** A relationship never ends on another relationship, so there is nothing to tie to a line.

**The ends decide what a run descends from, and nothing takes one.** A relationship with a note at an end is a `tie`; anything else is a `line`. **Both are definitions, not modules.** `relate` and `chain` take no `module`; `relink` re-reads it, and a type of the old base does not follow a run into the new one. `direct` refuses a tie in words.

**`relate` carries the type**, so one gesture does not cost `relate` then `retype`. A type names a relation definition already there, and only one of the run's own module is kept.

### Interfaces

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `interface` | puts an interface on the border of a block, and takes a relationship to it | block, edge | owner?, side?, at?, type?, edge?, end? | `add_block` (+ `set_end`, `set_side`) |
| `mark` | marks an interface in, out, both, or clears the mark | interface | id, flow? | `mark_port` |

**`interface` absorbs promotion**: naming the seat a relationship already meets *is* making an interface there, so `edge` and `end` (`from`, `to` or `both`) are the whole of the difference. The wall the end was pinned to goes with it.

**An end that is already an interface is never promoted.** `interface` refuses it, and no menu offers it: a run's menu offers *promote both ends* or *promote end* for whichever ends are bare, and a grip's menu knows which end it is.

### Holders, cells and notes

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `group` | draws a boundary round what is selected, or a grid over a region | layer, selection | members?, into?, rows?, cols?, seats?, spot? | `set_holder` + `set_group`… |
| `leave` | takes a block out of the group it is in | block, selection | ids | `set_group` |
| `seat` | puts a block in a cell of a grid, or takes it out of one | block | id, group?, at? | `set_group` + `seat_cell` |
| `header` | promotes a seated block to head the line it sits in | block | id?, clear? | `set_header` |
| `fill` | puts a new block in every empty cell of a grid | block, cell | group? | `add_block` + `set_group` + `seat_cell`… |
| `insert` · `remove` | adds or takes away a row or a column at an index | block, cell | group?, way, at? | `set_holder` + `seat_cell`… |
| `merge` | spans the cells you picked, or splits the merged one you point at | cell | group?, at?, into? | `set_holder` |
| `transpose` | turns a grid on its side — rows become columns | block, cell | group? | `set_holder` + `seat_cell`… |
| `chain` | links every filled cell of a grid, in the order it reads | block, cell | group?, dir?, type? | `link_blocks`… |
| `note` | writes a note about a block, tied to it | block | about, text, spot?, w?, h? | `add_block` + `set_body` + `link_blocks` |

**`group` is one act with different arguments.** With `into` it adds to a holder already there; without it, an extent makes a **grid** and no extent makes a **boundary**. **A group goes with its last member**, and is empty only when it was made empty.

**`chain` reads in the standard reading direction** — left to right, then down — and runs forward unless told.

**A note is always about a block.** The note and its tie are made in one step. A note is never about a relationship.

**A cell is an address, not a thing**, so the actions above take a `cell` scope: `Context` carries `cells` beside `picked`.

**Nothing a layout gesture does destroys model content.** Removing a line moves what it held into the nearest spare cell; shrinking an extent and merging over an occupied cell drop the address. **The block always survives.**

### Fields and definitions

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `field` | sets a named value on a block, or adds a field to a definition | layer, block | holder, name, value?, form?, unit?, choices?, to? | `set_field` / `set_def` |
| `order_field` | moves a value or a declared field to before another | layer, block | holder, name, before? | `order_fields` / `set_def` |
| `unfield` | drops a named value from a block, or a field from a definition | layer, block | holder, name | `drop_field` / `set_def` |
| `define` | names a new definition, or restates one of that name | layer | name, group, extends?, label?, into?, id? | `set_def` (+ `set_shelf`) |
| `rename_def` | changes what a definition is called, and so what every usage naming it reads | layer | id, name | `set_def` |
| `save_def` | saves how this looks as a definition anything else can name | block, edge | id, name | `set_def` + `update_block` / `update_edge` + `set_look`… |
| `pin` | offers a definition on the rail or in the pinned folder, or takes it off | layer | id, on? | `set_pinned` |
| `remove_def` | dissolves a definition back into everything that named it, and drops it | layer | id | `set_look`… + `set_def`… + `drop_def` |
| `add_shelf` | adds a folder to file definitions in | layer | name, group, into?, id? | `set_shelf` |
| `rename_shelf` | renames a definition folder | layer | id, name | `set_shelf` |
| `drop_shelf` | removes a folder, keeping what it held where it was | layer | id | `set_shelf` |
| `shelve` | files definitions or folders into a folder, or reorders them | layer | ids, into?, before? | `set_shelf` |
| `package` | makes a named package, and files definitions into it | layer | name, defs? | `set_package` (+ `set_def`…) |
| `remove_package` | drops a package and everything it brought | layer | id | `drop_package` |

**One act, and the holder says which.** Setting a value on a usage and declaring a field on a definition are the same thing said about two sorts of holder. A relationship holds no values.

**Editing anything from outside writes the workspace's word about it, never theirs.** `field`, `order_field`, `unfield` and `look` all land on that word, and mint it where there is not one yet — for a package's definition and the floor's alike. **Identity is refused**: nothing from outside is renamed, dropped or restated.

**`define` requires a group**, from every caller, and `extends` must name a definition of that group. **Its id is minted**; a caller that must know it before the step lands mints it and passes `id`. **`into` files a new one in a folder**, which must be a folder of its own group.

**Filing is the workspace's own definitions only.** `shelve` refuses a base, a default and a package's, refuses to mix the groups, and refuses a folder into itself. **Removing a folder keeps what it held**, in the folder the folder was in.

**Saving never pins.** `define` and `save_def` pin nothing; `pin` is the explicit act, per definition, and bases and defaults are never pinned.

**`remove_def` is lossless.** Every usage takes back the looks and fields it inherited, its own word winning, and a subtype takes over what it inherited from here. **A default stays** — reset its style with `none` instead.

**A package's definitions are never altered**, and neither is a base. Refining one means saving a look over it.

### The layer

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `arrange` | sets how the layer lays out, and tidies it into that shape | layer | arrangement, at? | `set_arrangement` + `place_block`… |

**One setting, two values** — `free` and `grid`. Hand placement, or auto-layout onto the lattice.

**Arrangement is model data, not a display preference.** **The tidy comes in rather than being worked out here** — it is written on the way *out* of `grid`, so `free` keeps where the grid put everything. **Moving anything by hand on a `grid` layer sets it `free`**, the grid's positions written first, in the same step.

### One log, so nothing routes

**The workspace is one document with one history.** Undo is workspace-wide, and that is the intent rather than a cost.


## Adjustments

**Three.** Positional, unsayable, gesture-only — never named, ranked or listed.

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `place` | where something came to rest | block | moved[] | `place_block`… |
| `size` | how big a card was asked to be | block | id, w, h | `size_block` |
| `seat` | where an interface sits on its edge | interface | id, side, at | `set_port` |

**One gesture, one step.** A drag or a drop can come to several writes — a place and a `group`, a `leave` and a place, an `arrange` and a place. The stage works out the list and the app runs it inside `session.batch`, so all of it undoes as one.

**A drop resolves rather than adding an adjustment of its own.** A card dropped on a card is `move`; dropped in a cell it is `seat`; dropped in or out of a boundary it is `group` or `leave`; a grid's corner dragged is `group` with a new extent; a relationship's end let go on another block is `relink`.


## Gestures

**The left button works what is already there; the right button makes something new.**

**The offered list** is `offer(ctx)`: membership for the current context — scope, plus each action's own `when` — and no ordering of its own. Menus draw it in a fixed order, and the terminal ranks it.

### Left button

| Gesture | On | Reaches |
|---|---|---|
| click | card, boundary, relationship | selection |
| click | frame, empty | clears |
| click | a grid's cell | picks the cell — an address, held beside the selection rather than in it |
| double-click | card, its border, a seat | `open`; on a reference, `reveal` |
| double-click | name, note | rename, in place |
| double-click | empty outside the frame | `open`, with nothing to open |
| drag | card → another card | `move` |
| drag | card, boundary or selection | `place`, joining or leaving whatever it lands in |
| drag | card → a grid's cell | `seat` |
| drag | a relationship's end → a block | `relink` |
| drag | seat in the room's wall | `seat` |
| drag | card corner | `size` |
| drag | a grid's corner | `group`, its extent read off in whole cells |
| drag | empty | selection box |
| drop | explorer row | `refer`; a definition makes a block of it |

### Right button

| Gesture | On | Reaches |
|---|---|---|
| click | empty | `create` — asks for the name first |
| click | card, frame edge, relationship, a relationship's end, cell, selection | the offered list for that target |
| drag | card → card | `relate` |
| drag | empty → empty | `group`, sized in cells, seating whatever loose cards it swept over |

### Keyboard

| | Reaches |
|---|---|
| `Escape` | closes a menu; clears the selection |
| `Enter` | `open`, on the one picked card |
| `F2` | rename, in place |
| `Delete` / `Backspace` | `delete`, on everything picked |
| `Ctrl`/`Cmd` + `G` | `group` |
| `Ctrl`/`Cmd` + `A` | selects every card on the layer |
| `Ctrl`/`Cmd` + `Z` / `Y` | undo / redo |

**The shell owns the global keys; a field being typed in answers for itself.**


## Chrome

**The projection declares which control groups it offers, as `slots`; the shell knows how to build each.**

`layer` · `display` · `relations`

- **`layer`** is how the layer places what it holds — `free` or `grid`. A setting, and it writes to the log.
- **`display`** is what the drawing shows rather than what it holds: the frame, the guides, whether interfaces draw. Nothing here writes a mutation.
- **`relations`** is what a right drag and a `chain` draw: *straight*, *directed*, or a pinned line definition. **No *tie*** — a tie is what the ends make.


## Not on the surface

**Shell actions** — the host's, not a module's: new workspace, import, export, undo, redo. They reach a **port** rather than the graph.

**Queries** — readable state, not things to do. Off the registry entirely.

**Finding** — filtering the explorer or a tray table writes nothing and goes nowhere.

**Display preferences** — held outside the log: whether interfaces show, the guides, the frame, the explorer fold, the theme.


## The registry

**Everything that changes the model is a record on one registry**, read by every input surface.

- Each carries a **name**, a **sentence** saying what it does, the **scope** it applies to, typed **arguments**, and a **run** returning mutations.
- **The sentence is what gets matched**, so *lay it out* reaches `arrange`.
- **Arguments are typed** — text, block, choice, number, or a position. An input surface offers whatever it can fill.
- **A position can only come from a gesture.**
- **`when` decides whether an action is shown; `check` decides what happens when it runs.**
- **An action returns mutations and may also ask** for a layer to be opened, a selection moved, or a line to be said.
- **An action refuses in words**, and the refusal goes to the strip.
- **What does not apply is not shown.**


## Future stories

| Story | Why it waits |
|---|---|
| **Behaviour** | *The model defines itself as the user builds* has half an answer in the grid — a cell address is an order, a header is an allocation — and nothing reads either yet |
| **Allocation** | derived and correct; a matrix or a report over it is what would consume it |
| **SysML round trip** | a `tie` goes out as `comment` and comes back as a `line` |
| **A named package is unchecked** | the definitions tab reads what is in use; reconciling that against the catalogue is the check |
