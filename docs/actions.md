# The surface

Reference for [S1, S2 and S4](tasks.md). Every **action** the engine offers, every **gesture** that
reaches one, and what is deliberately **not** on the surface.

The shape each record takes is in [spec.md](spec.md) under *Action surface*; why it takes that
shape is in [design.md](design.md) under *The action surface is the input seam*. The words used
here — project, view, package, module — are defined in design.md under *The words*.

*The registry these go into is built — `actions/index.ts`, S1.1. **S1.2–S1.5 registered the
actions**; **S1.6** side-effect-imports them, generates the `act.*` wrappers, moves the queries
off the surface, and keeps aliases for the old names. Gestures and the page reach actions through
the registry. The third column still names which closure each row replaced.*

**Every action acts within one project.** Where an argument names something in another, it is a
proxy that brings it into this one — see *Across projects* below. No action ever writes to two
logs.


## Actions

Thirty-one. Every one is sayable, which is the test for being here at all. `colour` was a
candidate until an element's own presentation was removed — colour is its definition's. The last
two, `scope` and `promote`, arrived with behaviour and are **not built**.

**Scope is the same question a gesture asks** — what is under the pointer, selected in the tray, or
selected when somebody types. `layer` means the open layer is enough; `element` means one is
selected; a form after it means only that form will do.

**Each also carries a sentence saying what it does**, which is what a typed word is matched
against. Names and labels are too short to score. Not tabled here — it belongs beside the code.

### Elements

| | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|
| `create` | layer | label, parent?, spot?, groups? | `add_element` + `join_group`… | `create`, `createAt` |
| `delete` | element | id | `delete_element` + partings | `remove` |
| `rename` | element | id, label | `update_element{label}` | `rename`, `renameProject` |
| `retype` | element, edge | id, type | `update_element{type}` / `update_edge` | `retype`, `relation` |
| `describe` | element | id, body | `set_body` | `write` |
| `move` | element | id, parent, spot? | `move_element` + shed (+ `place_element`) | `move`, `nest`, `promote`, `lift` |
| `refer` | layer | target, spot? | `add_element{proxy}` | `refer` |

**`refer`'s target is `{ project, element }`** (a same-project target may still be a bare path).
A proxy of another project's **root** refers to that whole project, which is what the workspace's
own elements are.

**`move` absorbs four** because they differ only in where the parent comes from: a sibling, the
layer above, the open layer, or a named one.

### Navigation

**Writing no mutations is what makes an action navigation** — nothing is flagged. One property,
three consequences: no step is written, there is nothing to undo, and **the terminal never offers
these**. The explorer and the pointer navigate.

| | Scope | Arguments | Effect | Replaces |
|---|---|---|---|---|
| `open` | element | id | `open` | `open` |
| `up` | layer | — | `open` | `up` |
| `reveal` | element, proxy | id | `open` + `focus` | `reveal` |

**No other action returns `open` or `focus` when a text interface reached it.** Typing three names
makes three siblings, because creating one selected nothing.

### Interfaces

| | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|
| `interface` | element | owner, side?, at?, edge?, end? | `add_element` (+ `set_end`) | `addPort`, `promotePort` |
| `mark` | interface | id, flow | `mark_port` | `markPort` |

**`interface` absorbs promotion**: naming a relationship's seat is making an interface and telling
that end about it, which is the same action with two more arguments. **`interface` refuses on a
`figure`**, with the reason — the first rule the engine enforces rather than advises (S5.5,
`actions/edges.ts`).

### Relationships

| | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|
| `relate` | layer | from, to, form?, ports?, sides? | `link_elements` | `link`, `wire` |
| `unlink` | edge | id | `delete_edge` + spare interfaces | `unlink` |
| `flip` | edge | id | `flip_edge` | `flip` |
| `direct` | edge | id, dir | `set_dir` | `setDir` |
| `reform` | edge | id, form | `set_form` | `setForm` |

### Groups and notes

| | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|
| `group` | layer | members, into? | `add_element{group}` + `join_group`… | `group`, `joinGroup` |
| `leave` | element | id, group | `leave_group`, or `delete_element` if it empties | `leaveGroup` |
| `dissolve` | element `group` | id | `delete_element` | **registered; no UI yet (G.9)** |
| `note` | layer | text, spot?, size? | `add_element{note}` | `note` |
| `tie` | element `note` | note, holder | `link_elements` / `delete_edge` — tie-ness is derived | `tie` |

**`group` absorbs joining**: with `into`, it adds to that group; without, it makes one. The panel
`+ group` select is the UI path into an existing group.

### Fields and definitions

| | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|
| `field` | element, edge | holder, name, patch? | `set_field` (+ `drop_field` on rename) | `addField`, `updateField` |
| `unfield` | element, edge | holder, name | `drop_field` | `dropField` |
| `define` | project | id?, name, form?, patch | `set_def` | `addRelation`, `renameRelation` |
| `undefine` | project | id | `drop_def` | `dropRelation` |

### Behavior *(not built — A.7)*

Two, and they are the engine's rather than any module's: both change a project wholesale, and
neither is about drawing. Nothing else about behaviour needs an action — an activity is blocks and
relationships, and the ordinary ones make those.

| | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|
| `scope` | project | structures[], seed? | `add_element{proxy}`… + `link_elements`… | **not built** |
| `promote` | element `proxy` | id | `add_element{block}`… + `set_field` per transition | **not built** |

**`scope` seeds unless told not to**: one behavior block per container in the structures named,
each holding refs to that container's children and the interactions implied between them. One step,
and it happens once — nothing re-syncs afterwards.

**`promote` replaces the derived machine**, so the value naming a resulting state becomes a ref to
the state block it made. Activity and machine then point at one object.

**`promote` means one thing wherever it appears**: turning something derived into something
declared. A seat becomes an interface, a read machine becomes state blocks — same act, so the same
word. The old `promote` closure meant *move up a layer* and is absorbed by `move`, which frees the
name for what it should always have said.

### The layer and the project

| | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|
| `axis` | layer | layer, axis | `set_axis` | `setAxis` |
| `arrange` | layer | layer, shape | `place_element`… | `arrange` |
| `relax` | layer | layer | `relax_layer` | ◌ on the canvas (G.2) |
| `vocabulary` | project | name | `set_vocabulary` | the entry turn |

**`vocabulary` changes shape with D**, from a subject-matter string to which package or packages a
project draws its definitions from. The action stays one; its argument becomes a list of ids.


### Across projects

*(not built — remaining S4 / A rows.)* Nothing new here: each is an existing action with a widened argument.

| | Scope | Does |
|---|---|---|
| `refer` | layer | brings a proxy of an element in another project into this layer |
| `relate` | layer | relating to something elsewhere refers to it first, then draws an ordinary edge to the proxy — so the edge's ends stay plain ids and one log takes both mutations |
| `define` | project | a definition ref may name another project's, which is how a package is used |

**The workspace is a project**, so working in it uses these same actions: filing something is
`create` (a folder is a block) and `move`; adding a project to the workspace is `refer` at its
root. It has no actions of its own.


## Adjustments

Four. Positional, unsayable, gesture-only — never named, ranked or listed. **A diagram declares which
of these it accepts**, and may accept none.

| | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|
| `place` | element | moved[], membership? | `place_element`… + `join_group`/`leave_group` | `place`, `placeMany`, `placeNote` |
| `size` | note | id, w, h | `size_element` | note SE handle (G.3) |
| `seat` | interface | id, side, at | `set_port` | `setPort` |
| `wall` | edge | id, end, side | `set_side` | `setSide` |


## Gestures

What reaches an action today, read out of `canvas/gestures.ts` and the diagram's declared gesture
map (S2.7). **The left button works what already exists; the right button makes something new.**

### Left button

| Gesture | On | Reaches |
|---|---|---|
| click | card, group boundary, edge | selection |
| click | proxy | selection — of what it stands for, not the stand-in |
| click | frame, empty | clears; empty inside a boundary selects the boundary |
| double-click | card | `open`, or `reveal` if it is a proxy |
| double-click | empty, outside the frame | `up` |
| drag | card → another card | `move` |
| drag | card → past the frame | `move`, to whatever contains the layer |
| drag | card, or a selection | `place`, joining or leaving whatever boundary it lands in |
| drag | group boundary | `place`, carrying its members |
| drag | note | `place`, alone |
| drag | empty | selection box |
| drop | explorer row | `refer` |
| drop | treemap chip | `move` into this layer |

### Right button

| Gesture | On | Reaches |
|---|---|---|
| click | empty | `create` — asks for the name first |
| click | card, frame edge | `interface`, at the nearest point of the border |
| click | edge | `retype` — a relationship's name is edited where it is drawn |
| click | a selection of several | `group` |
| click | a name, an interface | nothing — these wait for the menu |
| drag | card/frame → card/frame | `relate` |
| drag | card/frame → note | `tie`, or untie if it was tied |
| drag | card/frame → empty | `create` + `relate` |
| drag | empty → empty | `note`, the swept rectangle its least size |

### Keyboard

| | Reaches |
|---|---|
| `Escape` | abandons a prompt or a half-drawn relationship; clears the selection, including a React Flow multi-select |
| `Enter` | `rename`, on the picked node |
| `Ctrl`/`Cmd` + `G` | `group` |
| `F` | fit the selection, or the layer |
| `Delete` / `Backspace` | `delete`, `unlink`, or drops the picked field |
| `Ctrl`/`Cmd` + `A` | select every card on the layer |


## Not on the surface

**Page actions** — the shell's, not a module's, per design.md's three parts.

`export`, `import`, `new`, `undo`, `redo`, and with S4 `open project`, `close project` and
`export workspace`. **`undo` applies to the project in context**, since that is where the step
was written. **Unlock** and **fork** are workspace operations offered from the strip when a
locked package refuses a write — not registry actions (S4.8).

**Queries** — readable state, not things to do. Off the registry entirely.

`nameTaken`, `stepCount`, `state`, `saving`, `trouble`.

**Finding** — filtering the explorer writes nothing and goes nowhere, so it is neither an action
nor navigation. It is a mode the terminal can drive and the explorer owns.

**Display preferences** — held outside the log, and outside both tiers. Toggling one changes what
you see and nothing about the project.

Whether interfaces are shown, curves against right angles, which form the next right drag
draws, and which relationship types are shown on the canvas. The breadcrumb and the arrange
buttons are not among them: those reach `open` and `arrange`.


## What the count came to

| | |
|---|---|
| entries in `act` today | 52 |
| actions | 31 — 29 replacing a closure, 2 new with behaviour |
| adjustments | 4 |
| page actions | 5, and 8 after S4 |
| queries, off the surface | 5 |

Twenty-nine rather than the twenty-six estimated in tasks.md: `move` and `group` absorbed more than
expected, but navigation turned out to be three actions rather than none, and `relax`, `dissolve`
and `vocabulary` had no closure to be counted in the first place. `scope` and `promote` are the
thirtieth and thirty-first, and the only two the behaviour walk added to the surface.

`relax_layer` and `size_element` are wired on the canvas (◌ and note SE). `dissolve` reaches
`delete_element` through the registry but nothing on the canvas or tray offers it yet — that waits
G.9 (`◆`).
