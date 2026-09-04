# The surface

**Every action the engine offers, every gesture that reaches one, and what is deliberately not on the surface.** This is the goal state, written in definitions.md's vocabulary.

- **Why it takes this shape** → design.md, *The action surface is the input seam*.
- **What each part does** → spec.md. **The data contract** → schema.md.

**Three properties hold over everything below.**

- **A new sort of thing is a definition**, which is data, and it reaches the surface through the actions already here. The set is small on purpose rather than closed by decree: an action earns its place by being something somebody would say, and two actions saying one thing are one action.
- **Every action is sayable.** That is the test for being one at all: something somebody meant and could put in words. What cannot be said is an adjustment.
- **An action returns mutations; it never applies them.** One seam serves the pointer, the keyboard and the terminal, so no input path can do something the others cannot.

**Scope is the question a gesture already asks** — what is under the pointer, or what is selected. `layer` means the open layer is enough; `block` means one is selected; a word after it narrows to usages of that base definition.

**Each action carries a sentence saying what it does.** That sentence is what a typed word is scored against — names are too short — and it is the **Does** column. The descriptor is the source.


## Actions

Twenty-five.

### Blocks

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `create` | makes a new block in a layer, where you pointed if you did | layer | label?, parent?, type?, spot? | `add_block` |
| `delete` | removes blocks and everything they own, or relationships | block, edge, selection | ids | `delete_block` / `delete_edge` |
| `rename` | changes what a block or a relationship is called | block, edge | id, label | `update_block{label}` |
| `retype` | sets which definition a block or a relationship names | block, edge | id, type | `update_block{type}` / `update_edge` |
| `describe` | writes the body text of a block | block | id, body | `set_body` |
| `move` | puts blocks under a different parent, in the place you dropped them | block, selection | ids, parent, before?, spot? | `move_block` |
| `refer` | places a reference of a block into this layer | layer | target, spot? | `add_block{of}` |
| `label` | whether the drawing writes a block's name on it | block, selection | ids, shown? | `set_labelled` |
| `lock` | fixes where a block sits, so nothing moves it by hand | block, selection | ids, fixed? | `set_locked` |
| `tag` | puts words on a block to say what it is like | block, selection | ids, tags | `set_tags` |
| `look` | sets how a block draws, over what its definition says | block, selection | ids, key, name, value? | `set_look` |

**`move` absorbs nesting, promotion, filing and ordering** — they differ only in where the parent comes from: a sibling, the layer above, a folder, or the workspace. Moving a block to the top level makes it a project; moving one into a folder leaves it a root. All derived, so none is a separate act. **A selection moves in one step**, so four cards dragged somewhere is one entry in the log and one undo.

**Leaving a layer leaves everything about where you were in it.** A place and a group's membership are both facts about the layer that held the block, so a move out of one drops them; a move that only reorders siblings keeps them, because it is not a move out of anywhere.

**`retype` refuses across families.** A block, a folder and a resource are one kind between them and swap freely; a reference, an interface, a group and a note each carry something a change of type cannot invent, so nothing becomes one of those by being retyped. Within a kind, any subtype of it will do.

**The four element actions are model data, not display preferences.** What a card says about itself is part of what the layer says, so `label`, `lock`, `tag` and `look` travel in the file and undo like anything else. `look` writes one property at a time and an absent value gives it back to the chain — **customising a block is local to that block** until pinning makes a definition of it.

**`delete` never reaches through a reference.** A view holds references, so deleting one takes the boundary away and leaves its members exactly where they were — which is why *dissolve* is not a second action. **One or many is one question**: a gesture names one and a selection names several, and an action that removes things should not care which it was handed.

### Navigation

**Writing no mutations is what makes an action navigation.** Nothing is flagged: no step is written, there is nothing to undo, and **the terminal never offers these**. The explorer and the pointer navigate; the terminal acts on where they put you.

| | Does | Scope | Arguments | Effect |
|---|---|---|---|---|
| `open` | opens a block as the layer being drawn, or leaves this one when told no block | block | id? | `open` |
| `reveal` | opens the layer a block lives in and selects it there | block | id | `open` + `focus` |

**`open` absorbs the way out.** Opening and leaving differ only in where the layer comes from — one is named and one is derived — so a second name for the same act was one too many. **Absent `id` is the way out**, which nothing but a gesture can say, so it is never in the offered list.

**The way out of an interface is the way in.** An interface is drawn in two layers at once — seated on its owner's border, and set into that owner's wall seen from inside — so leaving one lands back in whichever of the two you came from. Everything else leaves for what holds it.

**No other action returns `open` or `focus` when a text interface reached it.** Typing three names makes three siblings, because creating one selected nothing.

### Relationships

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `relate` | draws a relationship from one block to another | layer | from, to, type?, module?, fromSide?, toSide? | `link_blocks` |
| `relink` | takes one end of a relationship to another block | edge | id, end, to | `set_end` + `set_side` |
| `unlink` | removes a relationship and any interfaces it leaves spare | edge | id | `delete_edge` |
| `flip` | turns a relationship around | edge | id | `flip_edge` |
| `direct` | sets which way a relationship's arrows point, or takes them off | edge | id, dir | `set_form` + `set_dir` |

**`direct` absorbs `reform`.** Whether a relationship is a line or directed, and which way its arrows point, were two settings saying one thing — **a plain line is a directed relationship pointing nowhere**, so `dir: none` is the whole of it.

**`relate` carries the type**, so one gesture does not cost `relate` then `retype` — two steps and two undos. A path or a known id is used as it stands; a bare name is matched against the definitions in scope, and only a name nothing declares is minted. **A named type carries its own relation module.**

**What the ends decide is not on offer.** A line to a note is a `tie` and a line to a reference is a `reference` — assigned from what sits at the ends, so `direct` says so in words rather than writing a change the next touch would undo. **`relink` asks again**: an end dragged onto a note ties the line, and an end taken off one leaves an ordinary line.

**`relate` absorbs tying a note.** A note is a block and a tie is a relationship, so there is nothing left for a separate action to do — drawing it dashed is presentation.

**Relating to something in another project refers to it first**, then draws an ordinary relationship to the reference. Both ends stay plain ids, and no relationship ever spans two projects.

### Interfaces

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `interface` | puts an interface on an edge of a block, and takes a relationship to it | block | owner, side?, at?, edge?, end? | `add_block` (+ `set_end`, `set_side`) |
| `mark` | marks an interface in, out, both, or clears the mark | interface | id, flow | `mark_port` |

**`interface` absorbs promotion**: naming the seat a relationship already meets *is* making an interface there and telling that end about it, so `edge` and `end` are the whole of the difference. Only a gesture on the end knows both, which is why nothing else fills them. The wall the end was pinned to goes with the promotion — it is the interface's own wall now.

**Which definitions take no interface is a `degree` rule**, which is data, and never a branch in the action.

### Boundaries and notes

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `group` | draws a boundary round these, or adds them to a boundary already there | selection | members, into? | `add_block` + `join_group`… |
| `leave` | takes this out of a boundary it belongs to | block | id, group | `leave_group` |
| `note` | puts a note here saying what you typed | layer | text, spot?, w?, h? | `add_block` + `set_body` |

**`group` absorbs joining**: with `into` it adds to that boundary, without it makes one. A group is a view at layer scope, so its members are references and the boundary owns nothing.

### Fields and definitions

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `field` | sets a named value on this, or adds a field to a definition so every usage carries one | layer, block, edge | holder, name, value?, form?, unit?, choices? | `set_field` / `set_def` |
| `unfield` | drops a named value from this, or a field from a definition | layer, block, edge | holder, name | `drop_field` / `set_def` |
| `define` | names a new definition, or renames one this layer already has | layer | name, group?, extends? | `set_def` |
| `undefine` | drops a definition, leaving anything that used it alone | layer | id | `drop_def` |

**One act, and the holder says which.** Setting a value on a usage and declaring a field on a definition are the same thing said about two sorts of holder, so `field` absorbed `declare` and `unfield` absorbed `undeclare`. `form`, `unit` and `choices` describe a field and are read only when the holder is a definition.

**Fields union with the subtype's winning by name**, so declaring one that is already there rewrites it rather than doubling it.

**Which packages a project draws from is an ordinary field.** It was an action of its own writing a field with a hardcoded name, which is a convention rather than an act.

**A definition may name another project's**, which is how a package is used. A package's own definitions are never altered — refining one means subtyping it.

### The layer, and views

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `arrange` | sets how the layer lays out and which way it reads | layer | arrangement | `set_arrangement` |
| `pin` | keeps the layer as it is being looked at, as a view you can come back to | layer | name | `add_block` + `refer`… |

**One setting, six values** — `free`, `grid`, `right`, `left`, `down`, `up` — of which four carry a reading direction and two do not. Axis, flow and arrangement were three fields answering overlapping questions.

**Arrangement is model data, not a display preference.** How a layer reads is part of what the layer says, so a diagram reopens the way it was left and travels in a file with the rest of it.

**It is a setting, not a one-time act.** `free` is the value where hand placement is what draws; every other value computes, keeping what was placed so returning to `free` gives it back. There is no `relax` — *hand it back to automatic* has nothing left to mean once picking a computed arrangement already does it.

**A pinned layer is an ordinary view block** — a block whose definition names a view module, holding one reference per thing shown. It is content rather than presentation, so it exports, undoes and is worked on like anything else. **A view holds views**, so a matrix's two axes cost nothing new.

### One log, so nothing routes

**The workspace is one document with one history.** An action naming something in another project writes to the same log as everything else, so no action can pick the wrong one and no step is ever half-written across two places. Undo is workspace-wide, and that is the intent rather than a cost.

**The workspace has no actions of its own.** Filing something is `create` and `move`; putting a project into a view is `refer` at its root.


## Adjustments

Five. Positional, unsayable, gesture-only — never named, ranked or listed. **A view module declares which of these it accepts**, and may accept none.

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `place` | where something came to rest | block | moved[] | `place_block`… |
| `size` | how big a note was asked to be | note | id, w, h | `size_block` |
| `seat` | where an interface sits on its edge | interface | id, side, at | `set_port` |
| `wall` | which wall a relationship leaves by | edge | id, end, side, at? | `set_side` |
| `straighten` | takes the bend out of a relationship so it runs straight between its ends | edge | id, from, to, align? | `set_side` ×2 (+ `place_block`) |

**A hand-laid thing is a hard constraint; a derived one is not.** What an adjustment writes is honoured until a computed arrangement replaces where things draw, and `free` gives it back.

**`straighten` is an adjustment and not an action.** Where two borders can meet without a jog is a fact about two rectangles, which a relationship carries neither of — so the walls, the fractions and the block that has to shift are all handed in by the drawing. Both ends end up pinned, which is the only way to say *there* about a seat that is otherwise worked out; unpinning them is dragging either end again.


## Gestures

**A gesture lands on a hit, and a hit comes from the Scene.** A view module's projection emits `hits` — a region, and what that region answers to — and the renderer binds a pointer or a key to it. So what a gesture *means* belongs to the view module that drew the thing, and the renderer knows only how to dispatch. A notation that reads differently declares a different map and changes nothing below it.

**The left button works what is already there; the right button makes something new.**

**The offered list** is `offer(ctx)`: membership for the current context — scope, plus each action's own `when` — and no ordering of its own. The same set everywhere, and only presentation differs: menus draw it in a fixed order, and the terminal ranks it. It lives with the actions, below the terminal, so it survives the terminal being absent.

Below is the **block view's** map, which is the default and what every other module varies from.

### Left button

| Gesture | On | Reaches |
|---|---|---|
| click | card, boundary, relationship | selection |
| click | reference | selection — of what it stands for, not the stand-in |
| click | frame, empty | clears; empty inside a boundary selects the boundary |
| double-click | card, its border, a seat | `open` |
| double-click | name | rename, in place |
| double-click | note | edits its text — a note is its text, and has no inside |
| double-click | relationship | `straighten` |
| double-click | frame edge, or empty outside the frame | `open`, with nothing to open |
| drag | card → another card | `move` |
| drag | card → past the frame | `move`, to whatever contains the layer |
| drag | card, boundary or selection | `place`, joining or leaving whatever it lands in |
| drag | a relationship's end | `relink`, or `wall` where it stays put |
| drag | seat | `seat` |
| drag | note corner | `size` |
| drag | empty | selection box |
| drop | explorer row | `refer` |

### Right button

| Gesture | On | Reaches |
|---|---|---|
| click | empty | `create` — asks for the name first |
| click | card, frame edge, relationship, a relationship's end, selection | the offered list for that target |
| drag | card → card | `relate` |
| drag | card → empty | `create` + `relate` |
| drag | empty → empty | `note`, the swept rectangle its least size |

### Keyboard

| | Reaches |
|---|---|
| `Escape` | abandons a prompt or a half-drawn relationship; clears the selection |
| `Enter` | `rename`, on the picked block |
| `Delete` / `Backspace` | `delete`, `unlink`, or drops the picked field |
| `Ctrl`/`Cmd` + `G` | `group` |
| `Ctrl`/`Cmd` + `A` | selects every card on the layer |
| `F` | fits the selection, or the layer |

**The shell owns the global keys and the view module owns the rest**, declared beside its gesture map — so a notation may bind a key the canvas has no use for, without the shell knowing.


## Chrome

**A view module declares which control groups it offers; the shell knows how to build each.** That is what keeps one set of controls rather than one per module — a matrix offering no `interfaces` group has no interfaces toggle, rather than a toggle greyed out.

`project` · `views` · `arrange` · `flow` · `interfaces` · `lines` · `columns` · `types` · `relations`

Drawn in that order whatever order a module lists them. **`relations` is last on purpose**: it is the only group that grows with the vocabulary, so it is the one to push off the bottom of a column that scrolls. **`types` is the module's to fill** — a table filters by definition names and a matrix by relationship types, and only the module knows which.


## Not on the surface

**Shell actions** — the host's, not a module's.

`new workspace`, `new project`, `open project`, `close project`, `import`, `export`, `export workspace`, `undo`, `redo`. They reach a **port** rather than the graph: `files` for anything leaving or entering, `storage` for the session, `net` for pulling a package. **A project comes into being by being named**, uniquely, and nothing can be put in one before it has a name. **Unlock** and **fork** belong here too — what to do when a locked package refuses a write.

**Queries** — readable state, not things to do. Off the registry entirely.

**Finding** — filtering the explorer writes nothing and goes nowhere, so it is neither an action nor navigation. It is a mode the explorer owns and the terminal can drive.

**Display preferences** — held in the workspace's display state, outside the log. Toggling one changes what you see and nothing about the project: whether interfaces show, curves against right angles, which relationship types are drawn, which types a table or matrix filters to, the explorer fold, and the theme.

**The look of a block** — a colour, a pixel count, a font. Those belong to its definition, which is data, and to the theme, which owns the palette. Nothing carries presentation per usage.


## The count

| | |
|---|---|
| actions | **25** — two of them navigation, writing nothing |
| adjustments | **5** |
| shell actions, off the registry | **9** |


## The registry

**Everything that changes the model is a record on one registry**, read by every input surface.

- Each carries a **name**, a **sentence** saying what it does, the **scope** it applies to, typed **arguments**, and a **run** returning mutations.
- **The sentence is what gets matched**, so *lay it out* reaches `arrange`. Names are too short.
- **Arguments are typed** — text, block, choice, number, or a position. An input surface offers whatever it can fill, so eligibility is derived rather than declared.
- **A position can only come from a gesture.** An action needing one is reachable only that way; one where it is optional is reachable from anywhere, and the layer places what it was not given.
- **`when` decides whether an action is shown; `check` decides what happens when it runs.** Not the same test, and `check` cannot be answered until the arguments are filled.
- **An action returns mutations and may also ask** for a layer to be opened, a selection moved, or a line to be said. It changes nothing itself.
- **An action refuses in words**, and the refusal goes to the strip like everything else the app says.
- **The offered list is membership only** — everything whose scope matches and whose `when` says yes, with no ordering of its own. Menus draw it in a fixed order; the terminal ranks it.
- **What does not apply is not shown.** Greying out is for a fixed row whose positions are worth learning.
- **A module adds no action for anything it draws.** A module is a vocabulary, renderers, a layout law and a gesture map.

**Adjustments are positional, unsayable and gesture-only** — never named, ranked or listed. They write mutations and they undo like anything else. **A view module declares which it accepts, and may accept none.**

**Every action, adjustment and gesture is enumerated above.**


## Still open

| Issue | Description |
|---|---|
| **Promotion has no gesture** | `interface` takes `edge` and `end`, and only a gesture on a relationship's end knows both — but a menu raised on an end offers edge-scoped actions, and `interface` is block-scoped, so nothing currently fills them. Either the anchor gesture calls `interface` directly with the border it meets, or `interface` widens its scope. Undecided |
| **A named package is no longer checked** | The `vocabulary` action refused a package that was not there. As an ordinary field, a typo is stored silently. Either `field` learns one name, or the check moves to where a vocabulary is read |
| **Behaviour** | Inference, the four order tiers, the write-home gate and the activity/sequence/state readings were cut. *The model defines itself as the user builds* — design.md's driving concept — now has no implementation. What replaces it is undesigned |
