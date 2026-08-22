# The surface

**Every action the engine offers, every gesture that reaches one, and what is deliberately not on
the surface.** This is the goal state, written in [definitions.md](definitions.md)'s vocabulary.

- **Why it takes this shape** → [design.md](design.md), *The action surface is the input seam*.
- **What each part does** → [spec.md](spec.md). **Behaviour rules** → [behaviors.md](behaviors.md).

**Three properties hold over everything below.**

- **The action set is closed**, and so are the mutation ops and the four adjustments. A new sort of
  thing is a definition, which is data, and it reaches the surface through the actions already here.
- **Every action is sayable.** That is the test for being one at all: something somebody meant and
  could put in words. What cannot be said is an adjustment, and there are four.
- **An action returns mutations; it never applies them.** One seam serves the pointer, the keyboard
  and the terminal, so no input path can do something the others cannot.

**Scope is the question a gesture already asks** — what is under the pointer, or what is selected.
`layer` means the open layer is enough; `block` means one is selected; a word after it narrows to
usages of that base definition.

**Each action carries a sentence saying what it does.** That sentence is what a typed word is scored
against — names are too short — and it is the **Does** column. The descriptor is the source.


## Actions

Twenty-eight.

### Blocks

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `create` | makes a new block in a layer, where you pointed if you did | layer | label, parent?, type?, spot? | `add_block` |
| `delete` | removes a block and everything it owns | block | id | `delete_block` |
| `rename` | changes what a block is called | block | id, label | `update_block{label}` |
| `retype` | sets which definition a block or a relationship names | block, edge | id, type | `update_block{type}` / `update_edge` |
| `describe` | writes the body text of a block | block | id, body | `set_body` |
| `move` | puts a block under a different parent, and places it if told where | block | id, parent, spot? | `move_block` |
| `refer` | places a reference of a block into this layer | layer | target, spot? | `add_block{of}` |

**`move` absorbs nesting, promotion and filing** — they differ only in where the parent comes from:
a sibling, the layer above, a folder, or the workspace. Moving a block to the top level makes it a
project; moving one into a folder leaves it a root. Both are derived, so neither is a separate act.

**`delete` never reaches through a reference.** A view holds references, so deleting one takes the
boundary away and leaves its members exactly where they were — which is why *dissolve* is not a
second action.

**`refer`'s target is `{ project, block }`.** A reference of a project's root refers to that whole
project, which is what the workspace's own children are.

### Navigation

**Writing no mutations is what makes an action navigation.** Nothing is flagged: no step is written,
there is nothing to undo, and **the terminal never offers these**. The explorer and the pointer
navigate; the terminal acts on where they put you.

| | Does | Scope | Arguments | Effect |
|---|---|---|---|---|
| `open` | opens a block as the layer being drawn | block | id | `open` |
| `up` | leaves the open layer for the one containing it | layer | — | `open` |
| `reveal` | opens the layer a block lives in and selects it there | block, reference | id | `open` + `focus` |

**No other action returns `open` or `focus` when a text interface reached it.** Typing three names
makes three siblings, because creating one selected nothing.

### Relationships

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `relate` | draws a relationship from one block to another | layer | from, to, type?, module?, ports?, sides? | `link_blocks` |
| `unlink` | removes a relationship and any interfaces it leaves spare | edge | id | `delete_edge` |
| `flip` | turns a relationship around | edge | id | `flip_edge` |
| `direct` | sets which way a relationship's arrows point | edge | id, dir | `set_dir` |
| `reform` | sets whether a relationship is a `line` or `directed` | edge | id, module | `set_form` |

**`relate` carries the type**, so one gesture does not cost `relate` then `retype` — two steps and
two undos. A path or a known id is used as it stands; a bare name is matched against the definitions
in scope, and only a name nothing declares is minted. **A named type carries its own relation
module**, so `reform` applies to an untyped relationship alone.

**`relate` absorbs tying a note.** A note is a block and a tie is a relationship, so there is nothing
left for a separate action to do — drawing it dashed is presentation.

**Relating to something in another project refers to it first**, then draws an ordinary relationship
to the reference. Both ends stay plain ids, and no relationship ever spans two projects.

### Interfaces

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `interface` | puts an interface on an edge, or pins a relationship's seat as one | block | owner, side?, at?, edge?, end? | `add_block` (+ `set_end`) |
| `mark` | marks an interface in, out, both, or clears the mark | interface | id, flow | `mark_port` |

**`interface` absorbs promotion**: naming a relationship's seat is making an interface and telling
that end about it — the same action with two more arguments. **Which definitions take no interface
is a `degree` rule**, which is data, and never a branch in the action.

### Boundaries and notes

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `group` | draw a boundary round these, or add them to a boundary already there | layer | members, into? | `add_block` + `join_group`… |
| `leave` | take this out of a boundary it belongs to | block | id, group | `leave_group` |
| `note` | put a note here saying what you typed | layer | text, spot?, size? | `add_block` + `set_body` |

**`group` absorbs joining**: with `into` it adds to that boundary, without it makes one. A group is a
view at layer scope, so its members are references and the boundary owns nothing.

### Fields and definitions

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `field` | set a named value on this, or rename one it already carries | block, edge | holder, name, patch? | `set_field` |
| `unfield` | drop a named value from this | block, edge | holder, name | `drop_field` |
| `define` | name a new definition, or rename one the project has | project | id?, name, patch | `set_def` |
| `undefine` | drop a definition, leaving anything that used it alone | project | id | `drop_def` |

**A definition may name another project's**, which is how a package is used. A package's own
definitions are never altered — refining one means subtyping it.

### Views

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `pin` | keeps the layer as it is being looked at, as a view you can come back to | layer | layer, name | `add_block` + `refer`… |

**A pinned layer is an ordinary view block** — a block whose definition names a view module, holding
one reference per thing shown. It is content rather than presentation, so it exports, undoes and is
worked on like anything else. **A view holds views**, so a matrix's two axes cost nothing new.

### Behavior

**One**, and it is the engine's rather than any module's. Nothing else about behaviour needs an
action: an activity is blocks and relationships, and the ordinary actions make those.

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `infer` | turns a selection into one behavior block — activity, or state when the selection is actions | selection | of[], into? | `add_block`… + `link_blocks`… |

**Any cross-section**: blocks, whole branches, entire projects, across as many projects as the
selection reaches. `into` names where the result lands; without one, a new project is made.

**One-way, one-time and deterministic.** Nothing re-syncs afterwards, and re-inferring makes a
**new** block rather than touching an existing one, so hand-adjusted work is never clobbered.
Determinism is over the selection, so nothing may depend on the order things were clicked.

**It composes**: a selection of actions infers a `state` block the way structure infers an
`activity`. **It states only what the structure stated**, and guesses the rest freely.

**Named `infer`, not `project`** — *projection* already means a layer rendered through a view module.

### The layer and the project

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `arrange` | how the layer lays out and which way it reads | layer | layer, shape | `set_arrangement` |
| `vocabulary` | which packages this project draws definitions from | project | packages | `set_vocabulary` |

**One setting, six values** — `free`, `grid`, `right`, `left`, `down`, `up` — of which four carry a
reading direction and two do not. Axis, flow and arrangement were three fields answering overlapping
questions.

**Arrangement is how a graph reads, not how it is shown**, so it sits on the layer with the model
rather than in display state — and it must, because **inference reads it** and an inference is
permanent. If the reading direction were display state, the same model would infer differently
depending on how somebody was looking at it.

**It is a setting, not a one-time act.** `free` is the value where hand placement is what draws;
every other value computes, keeping what was placed so returning to `free` gives it back. There is
no `relax` — *hand it back to automatic* has nothing left to mean once picking a computed
arrangement already does it.

### One log, so nothing routes

**The workspace is one document with one history.** An action naming something in another project
writes to the same log as everything else, so no action can pick the wrong one and no step is ever
half-written across two places. Undo is workspace-wide, and that is the intent rather than a cost.

**The workspace has no actions of its own.** Filing something is `create` and `move`; putting a
project into a view is `refer` at its root.


## Adjustments

Four. Positional, unsayable, gesture-only — never named, ranked or listed. **A view module declares
which of these it accepts**, and may accept none.

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `place` | where something came to rest | block | moved[], membership? | `place_block`… |
| `size` | how big a note was asked to be | note | id, w, h | `size_block` |
| `seat` | where an interface sits on its edge | interface | id, side, at | `set_port` |
| `wall` | which wall a relationship leaves by | edge | id, end, side | `set_side` |

**A hand-laid thing is a hard constraint; a derived one is not.** What an adjustment writes is
honoured until a computed arrangement replaces where things draw, and `free` gives it back.


## Gestures

**A gesture lands on a hit, and a hit comes from the Scene.** A view module's projection emits
`hits` — a region, and what that region answers to — and the renderer binds a pointer or a key to
it. So what a gesture *means* belongs to the view module that drew the thing, and the renderer knows
only how to dispatch. A notation that reads differently declares a different map and changes nothing
below it.

**The left button works what is already there; the right button makes something new.**

**The offered list** is `offer(ctx)`: membership for the current context — scope, plus each action's
own `when` — and no ordering of its own. The same set everywhere, and only presentation differs:
menus draw it in a fixed order, and the terminal ranks it. It lives with the actions, below the
terminal, so it survives the terminal being absent.

Below is the **block view's** map, which is the default and what every other module varies from.

### Left button

| Gesture | On | Reaches |
|---|---|---|
| click | card, boundary, relationship | selection |
| click | reference | selection — of what it stands for, not the stand-in |
| click | frame, empty | clears; empty inside a boundary selects the boundary |
| double-click | card | `open`, or `reveal` if it is a reference |
| double-click | empty, outside the frame | `up` |
| drag | card → another card | `move` |
| drag | card → past the frame | `move`, to whatever contains the layer |
| drag | card, boundary or selection | `place`, joining or leaving whatever it lands in |
| drag | empty | selection box |
| drop | explorer row | `refer` |

### Right button

| Gesture | On | Reaches |
|---|---|---|
| click | empty | `create` — asks for the name first |
| click | card, frame edge, relationship, selection | the offered list for that target |
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

**The shell owns the global keys and the view module owns the rest**, declared beside its gesture
map — so a notation may bind a key the canvas has no use for, without the shell knowing.


## Chrome

**A view module declares which control groups it offers; the shell knows how to build each.** That
is what keeps one set of controls rather than one per module — a matrix offering no `interfaces`
group has no interfaces toggle, rather than a toggle greyed out.

`project` · `views` · `arrange` · `flow` · `interfaces` · `lines` · `columns` · `types` ·
`relations`

Drawn in that order whatever order a module lists them. **`relations` is last on purpose**: it is
the only group that grows with the vocabulary, so it is the one to push off the bottom of a column
that scrolls. **`types` is the module's to fill** — a table filters by definition names and a matrix
by relationship types, and only the module knows which.


## Not on the surface

**Shell actions** — the host's, not a module's.

`new workspace`, `new project`, `open project`, `close project`, `import`, `export`,
`export workspace`, `undo`, `redo`. They reach a **port** rather than the graph: `files` for anything
leaving or entering, `storage` for the session, `net` for pulling a package. **A project comes into
being by being named**, uniquely, and nothing can be put in one before it has a name. **Unlock** and
**fork** belong here too — what to do when a locked package refuses a write.

**Queries** — readable state, not things to do. Off the registry entirely.

**Finding** — filtering the explorer writes nothing and goes nowhere, so it is neither an action nor
navigation. It is a mode the explorer owns and the terminal can drive.

**Display preferences** — held in the workspace's display state, outside the log. Toggling one
changes what you see and nothing about the project: whether interfaces show, curves against right
angles, which relationship types are drawn, which types a table or matrix filters to, the explorer
fold, and the theme.

**The look of a block** — a colour, a pixel count, a font. Those belong to its definition, which is
data, and to the theme, which owns the palette. Nothing carries presentation per usage.


## The count

| | |
|---|---|
| actions | **28** — three of them navigation, writing nothing |
| adjustments | **4** |
| shell actions, off the registry | **9** |
| mutation ops, the action set, the adjustments | **closed** |
