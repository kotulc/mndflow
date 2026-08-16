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

**Most actions act within one project.** Where an argument names something in another, it is a
proxy that brings it into this one — see *Across projects* below. **`infer` may also write home**
into participants' projects (`Effect.home` / `into`) — each write is still one undoable step in
that target's log, never a single step spanning two logs.


## Actions

Thirty. Every one is sayable, which is the test for being here at all. `colour` was a
candidate until an element's own presentation was removed — colour is its definition's. The last,
`infer`, arrived with behaviour and is **built** (A.7a); the menu is what reaches it (G.9b).

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
that end about it, which is the same action with two more arguments. **Which definitions take no
interface is a `degree` constraint the `rules` component carries** (S5.2), not a branch in the
action — the `figure` special case went with the form (SC.5).

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
| `dissolve` | element `group` | id | `delete_element` | **registered; reached by the menu (G.9b/d)** |
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

### Behavior *(A.7a)*

**One**, and it is the engine's rather than any module's: it changes a project wholesale and is not
about drawing. Nothing else about behaviour needs an action — an activity is blocks and
relationships, and the ordinary ones make those.

| | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|
| `infer` | selection | of[], into? | `add_element{block, proxy}`… + `link_elements`… + writes home (`Effect.home`) | **built (A.7a)** |

**`infer` takes any cross-section** — blocks, whole branches, entire projects, across as many
projects as the selection reaches. `into` names the behavior project the result lands in; without
one, a new project is made. The result is **one behavior block**.

**One-way, one-time and deterministic.** Nothing re-syncs afterwards, and **re-inferring makes a new
block** rather than touching an existing one, so hand-adjusted work is never clobbered. Determinism
is over the *selection*, so nothing may depend on the order things were clicked.

**It composes.** A selection of actions infers a `state` block the way structure infers an `action`.

**It writes home** — but only what the structure stated. Everything else it guesses freely. The four
ordering tiers, the labels, the lanes and the cap are in [behaviors.md](behaviors.md). Cap is a tree
slice, not connected-components. **Its trigger is the menu** (G.9b): with the explorer as
context and one or more blocks or projects selected, `infer` is one of the offered options, so the
page's `Chosen[]` reaches it there rather than needing a gesture of its own.

**Named `infer`, not `project`.** *Projection* already means a layer rendered through a view module,
and `projection surface` is a defined term; overloading it would collide.

**`scope` and `promote` are retired before they were built.** `scope` was `infer` with a project for
its argument, `promote` was `infer` with the derived machine for its source, and derived state
machines are gone — so one action says all of it. The old `promote` closure meant *move up a layer*
and is absorbed by `move`.

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

A write into a project that is not the one in context goes through `Effect.into` / `writeInto`
(S4.9) — the same door, an undoable step in the target's log. **Parked**: App may not refresh after
a foreign write. Nothing new on the action table: each is an existing action with a widened
argument.

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

**(planned — G.9)** *A third way in: the **offered-action list**, one set of what the selection can
do in its context. Same list everywhere; only the presentation differs — the menu in a **fixed**
order, the rail ordered by **learned preference**. It lives in `actions/`, below the rail, so it
survives the rail being removed. Reached by right-clicking an existing thing, and by clicking the
rail (type to filter, arrows to move, `Enter` to take).*

***On the canvas the target decides.*** *The rule above narrows to: **the right button makes
something new where there is nothing, and shows what a thing can do where there is something.**
Right-click on empty space still creates. Right-click on a card, a frame, an edge or a selection
opens the list instead, so `interface`, `retype` and `group` become entries rather than immediate
acts. **Right drags are unchanged** — the distance threshold in `gestures.ts` already tells a drag
from a click, so only the click half changes meaning. Rows marked **(planned)** below are the ones
this moves.*

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
| click | empty | `create` — asks for the name first. **Unchanged by G.9** |
| click | card, frame edge | `interface`, at the nearest point of the border. **(planned — G.9d)** becomes the offered list for that card |
| click | edge | `retype` — a relationship's name is edited where it is drawn. **(planned — G.9d)** becomes the offered list for that edge |
| click | a selection of several | `group`. **(planned — G.9d)** becomes the offered list for the selection |
| click | a name, an interface | nothing — **(planned — G.9d)** these gain the offered list |
| drag | card/frame → card/frame | `relate` |
| drag | card/frame → note | `tie`, or untie if it was tied |
| drag | card/frame → empty | `create` + `relate` |
| drag | empty → empty | `note`, the swept rectangle its least size |

### Keyboard

| | Reaches |
|---|---|
| `Escape` | abandons a prompt or a half-drawn relationship; clears the selection, including a React Flow multi-select. **Parked**: does not clear RF-selected edges after a marquee |
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
| actions | 30 — 29 replacing a closure, 1 new with behaviour |
| adjustments | 4 |
| page actions | 5, and 8 after S4 |
| queries, off the surface | 5 |

Twenty-nine rather than the twenty-six estimated in tasks.md: `move` and `group` absorbed more than
expected, but navigation turned out to be three actions rather than none, and `relax`, `dissolve`
and `vocabulary` had no closure to be counted in the first place. **`infer` is the thirtieth and the
only one the behaviour walk added** — it was two, `scope` and `promote`, until inference absorbed
both.

`relax_layer` and `size_element` are wired on the canvas (◌ and note SE). `dissolve` reaches
`delete_element` through the registry but nothing on the canvas or tray offers it yet — that waits
G.9, which is now settled in full and carries no gate.
