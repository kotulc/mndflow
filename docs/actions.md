# The surface

Reference for [S1, S2 and S4](tasks.md). Every **action** the engine offers, every **gesture** that
reaches one, and what is deliberately **not** on the surface.

The shape each record takes is in [spec.md](spec.md) under *Action surface*; why it takes that
shape is in [design.md](design.md) under *The action surface is the input seam*. The words are
defined in [definitions.md](definitions.md).

> **Like spec.md, this file is the present.** The simplified block model (2026-08-18) renames
> **reference → reference** and removes element forms, so `add_element{proxy}` below is what the
> mutation currently writes, not what it should say. **The action set itself does not change** —
> `refer` still places one thing standing for another, which is the whole point of a closed action
> set surviving a model change. Stream `B` in [plan.md](plan.md) is the migration.

*The registry these go into is built — `actions/index.ts`, S1.1. **S1.2–S1.5 registered the
actions**; **S1.6** side-effect-imports them, generates the `act.*` wrappers, moves the queries
off the surface, and keeps aliases for the old names. Gestures and the page reach actions through
the registry. The third column still names which closure each row replaced.*

**Most actions act within one project.** Where an argument names something in another, it is a
reference that brings it into this one — see *Across projects* below. **`infer` may also write home**
into participants' projects (`Effect.home` / `into`) — each write is still one undoable step in
that target's log, never a single step spanning two logs.


## Actions

Thirty. Every one is sayable, which is the test for being here at all. `colour` was a
candidate until an element's own presentation was removed — colour is its definition's. The last,
`infer`, arrived with behaviour and is **built** (A.7a); the explorer menu reaches it (G.9b,
proven).

**Scope is the same question a gesture asks** — what is under the pointer, selected in the tray, or
selected when somebody types. `layer` means the open layer is enough; `element` means one is
selected; a form after it means only that form will do.

**Each also carries a sentence saying what it does**, which is what a typed word is matched
against — names and labels are too short to score. That sentence is the `about` on the descriptor,
and it is the **Does** column below, copied. **The descriptor stays the source**: change it there,
and bring the column with it.

### Elements

| | Does | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|---|
| `create` | makes a new block in a layer, where you pointed if you did | layer | label, parent?, spot?, groups? | `add_element` + `join_group`… | `create`, `createAt` |
| `delete` | removes an element and everything it holds | element | id | `delete_element` + partings | `remove` |
| `rename` | changes what an element is called | element | id, label | `update_element{label}` | `rename`, `renameProject` |
| `retype` | sets what kind of thing an element or a relationship is | element, edge | id, type | `update_element{type}` / `update_edge` | `retype`, `relation` |
| `describe` | writes the body text of an element | element | id, body | `set_body` | `write` |
| `move` | puts an element under a different parent, and places it if told where | element | id, parent, spot? | `move_element` + shed (+ `place_element`) | `move`, `nest`, `promote`, `lift` |
| `refer` | places a reference of an element into this layer | layer | target, spot? | `add_element{proxy}` | `refer` |

**`refer`'s target is `{ project, element }`** (a same-project target may still be a bare path).
A reference of another project's **root** refers to that whole project, which is what the workspace's
own elements are.

**`move` absorbs four** because they differ only in where the parent comes from: a sibling, the
layer above, the open layer, or a named one.

### Navigation

**Writing no mutations is what makes an action navigation** — nothing is flagged. One property,
three consequences: no step is written, there is nothing to undo, and **the terminal never offers
these**. The explorer and the pointer navigate.

| | Does | Scope | Arguments | Effect | Replaces |
|---|---|---|---|---|---|
| `open` | opens an element as the layer being drawn | element | id | `open` | `open` |
| `up` | leaves the open layer for the one containing it | layer | — | `open` | `up` |
| `reveal` | opens the layer an element lives in and selects it there | element, reference | id | `open` + `focus` | `reveal` |

**No other action returns `open` or `focus` when a text interface reached it.** Typing three names
makes three siblings, because creating one selected nothing.

### Interfaces

| | Does | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|---|
| `interface` | puts an interface on a frame edge, or pins a relationship's seat as one | element | owner, side?, at?, edge?, end? | `add_element` (+ `set_end`) | `addPort`, `promotePort` |
| `mark` | marks an interface as in, out, both, or clears the mark | interface | id, flow | `mark_port` | `markPort` |

**`interface` absorbs promotion**: naming a relationship's seat is making an interface and telling
that end about it, which is the same action with two more arguments. **Which definitions take no
interface is a `degree` constraint the `rules` component carries** (S5.2), not a branch in the
action — the `figure` special case went with the form (SC.5).

### Relationships

| | Does | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|---|
| `relate` | draws a relationship from one element to another | layer | from, to, form?, type?, ports?, sides? | `link_elements` (+ `set_def` for a name nothing declares) | `link`, `wire` |
| `unlink` | removes a relationship and any spare interfaces it left behind | edge | id | `delete_edge` + spare interfaces | `unlink` |
| `flip` | turns a relationship around | edge | id | `flip_edge` | `flip` |
| `direct` | sets which way a relationship's arrows point | edge | id, dir | `set_dir` | `setDir` |
| `reform` | sets whether a relationship is a plain line or a directed one | edge | id, form | `set_form` | `setForm` |

**`relate`'s `type` says what kind it is** (V.17b), so one gesture does not cost `relate` then
`retype` — two log steps and two undos. **A path (`pkg_x/def_y`) or a known id is used as it
stands**; a bare name is matched against the definitions in scope first, and only a name nothing
declares is minted (`defineNamed`'s bridge). Minting for an imported type would put a local stub
under a derived id in front of the package's own. **A named kind carries its own form**, so the
toolbar's plain/directed setting only applies to an untyped drag.

### Groups and notes

| | Does | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|---|
| `group` | draw a boundary round these, or add them to a group that is already there | layer | members, into? | `add_element{group}` + `join_group`… | `group`, `joinGroup` |
| `leave` | take this out of a group it belongs to | element | id, group | `leave_group`, or `delete_element` if it empties | `leaveGroup` |
| `dissolve` | take the boundary away and leave its members where they are | element `group` | id | `delete_element` | canvas offer (G.9d ◐); not in explorer |
| `note` | put a note here saying what you typed | layer | text, spot?, size? | `add_element{note}` | `note` |
| `tie` | tie this note to what it describes, or untie it if it already is | element `note` | note, holder | `link_elements` / `delete_edge` — tie-ness is derived | `tie` |

**`group` absorbs joining**: with `into`, it adds to that group; without, it makes one. The panel
`+ group` select is the UI path into an existing group.

### Fields and definitions

| | Does | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|---|
| `field` | set a named value on this, or rename one it already carries | element, edge | holder, name, patch? | `set_field` (+ `drop_field` on rename) | `addField`, `updateField` |
| `unfield` | drop a named value from this | element, edge | holder, name | `drop_field` | `dropField` |
| `define` | name a new type, or rename one the project already has | project | id?, name, form?, patch | `set_def` | `addRelation`, `renameRelation` |
| `undefine` | drop a type from the project, leaving anything that used it alone | project | id | `drop_def` | `dropRelation` |

### Behavior *(A.7a)*

**One**, and it is the engine's rather than any module's: it changes a project wholesale and is not
about drawing. Nothing else about behaviour needs an action — an activity is blocks and
relationships, and the ordinary ones make those.

| | Does | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|---|
| `infer` | turns a selection into one behavior block — activity, or state when the selection is actions | selection | of[], into? | `add_element{block, proxy}`… + `link_elements`… + writes home (`Effect.home`) | **built (A.7a)** |

**`infer` takes any cross-section** — blocks, whole branches, entire projects, across as many
projects as the selection reaches. `into` names the behavior project the result lands in; without
one, a new project is made. The result is **one behavior block**.

**One-way, one-time and deterministic.** Nothing re-syncs afterwards, and **re-inferring makes a new
block** rather than touching an existing one, so hand-adjusted work is never clobbered. Determinism
is over the *selection*, so nothing may depend on the order things were clicked.

**It composes.** A selection of actions infers a `state` block the way structure infers an `action`.

**It writes home** — but only what the structure stated. Everything else it guesses freely. The four
ordering tiers, the labels, the lanes and the cap are in [behaviors.md](behaviors.md). Cap is a tree
slice, not connected-components. **Its trigger is the explorer menu** (G.9b, proven): with the
explorer as context and one or more blocks or projects selected, `infer` is one of the offered
options, so the page's `Chosen[]` reaches it there rather than needing a gesture of its own.
**Parked**: a new behavior project from Infer is not admitted into `held.projects`, so it does not
appear in the explorer.

**Named `infer`, not `project`.** *Projection* already means a layer rendered through a view module,
and `projection surface` is a defined term; overloading it would collide.

**`scope` and `promote` are retired before they were built.** `scope` was `infer` with a project for
its argument, `promote` was `infer` with the derived machine for its source, and derived state
machines are gone — so one action says all of it. The old `promote` closure meant *move up a layer*
and is absorbed by `move`.

### The layer and the project

| | Does | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|---|
| `axis` | which way the layer reads | layer | layer, axis | `set_axis` | `setAxis` |
| | *renamed **`flow`** by stream `B`, gaining `left` / `right` / `top` / `bottom` / none. The action does not change — only what it is called and how many values it takes* | | | | |
| `arrange` | lay the layer out again | layer | layer, shape | `place_element`… | `arrange` |
| `relax` | hand the layer back to automatic placement | layer | layer | `relax_layer` | ∿ on the canvas (G.2 / U.2) |
| `vocabulary` | which packages this project draws definitions from | project | packages | `set_vocabulary` | the entry turn |

**`vocabulary` is the package import list** (D.2): argument is the package ids, in order; op writes
`set_vocabulary`. A legacy subject-matter stem still heals into that list.


### Across projects

A write into a project that is not the one in context goes through `Effect.into` / `writeInto`
(S4.9) — the same door, an undoable step in the target's log. **Parked**: App may not refresh after
a foreign write. Nothing new on the action table: each is an existing action with a widened
argument.

| | Scope | Does |
|---|---|---|
| `refer` | layer | brings a reference of an element in another project into this layer |
| `relate` | layer | relating to something elsewhere refers to it first, then draws an ordinary edge to the reference — so the edge's ends stay plain ids and one log takes both mutations |
| `define` | project | a definition ref may name another project's, which is how a package is used |

**The workspace is a project**, so working in it uses these same actions: filing something is
`create` (a folder is a block) and `move`; adding a project to the workspace is `refer` at its
root. It has no actions of its own.


## Adjustments

Four. Positional, unsayable, gesture-only — never named, ranked or listed. **A diagram declares which
of these it accepts**, and may accept none.

| | Does | Scope | Arguments | Writes | Replaces |
|---|---|---|---|---|---|
| `place` | where something came to rest | element | moved[], membership? | `place_element`… + `join_group`/`leave_group` | `place`, `placeMany`, `placeNote` |
| `size` | how big a note was asked to be | note | id, w, h | `size_element` | note SE handle (G.3) |
| `seat` | where an interface sits on its edge | interface | id, side, at | `set_port` | `setPort` |
| `wall` | which wall a relationship leaves by | edge | id, end, side | `set_side` | `setSide` |


## Gestures

What reaches an action today, read out of `canvas/gestures.ts` and the diagram's declared gesture
map (S2.7). **The left button works what already exists; the right button makes something new.**

**The offered-action list** is built (G.9a) — `offer(ctx)` in `actions/offer.ts`: membership for the
current context (scope + `when`), no ordering of its own. Same set everywhere; only presentation
differs — explorer and canvas menus in a **fixed** order (G.9b / G.9d ◐, proven); the rail ranks
by embedding when typed (Z.1), by learned preference when idle (Z.3).
It lives in `actions/`, below the rail, so it survives the rail being removed.

**Explorer (G.9b, proven).** Right-click an existing explorer row opens that list in fixed order and
enacts via `project.go` (`App` `onAct={project.go}`). Empty-tree / clear-space create is unchanged.
Rename stays double-click / ✎ — right-click no longer renames. **Bar `＋`** (U.14 ◐): follows the
selection — project or nothing → name a project into being; block → create under it; tooltip names
which.

**Rail (G.9c, proven; rank Z.1; feedback Z.2; preference Z.3; guidance Z.4; gloss Z.6; label Z.7; doc hit Z.8; layout U.5; caret U.6).**
Clicking the rail chrome focuses the caret. Chips are `offer(ctx)`: idle orders by shape-weighted
preference from `feedback.read()` (actions-only); typed text ranks by embedding similarity when the
model is warm, substring when cold, with shape as tie-break and an exact prior entry pinned first,
then appends at most one `docs.json` keyword hit always last (ghost — Enter/click surfaces gloss,
no action); Chat warms embeddings. Arrows move the highlight; `Enter` takes via `onAct` (`App`
`Chat` `onAct={project.go}`), except a doc ghost which only shows gloss. Overruling the highlighted
default (arrow+`Enter` or click) records to `mndflow.rail.feedback.v1` with `shape_of(ctx)`;
confirming the default writes nothing. Learning is local sticky only. Defaults **collapsed**
(one-line entry, inline chips); **expanded** is a two-column guidance shell (Z.4: next question +
hint + nudges from `guidance.ts`; root tip uses `blocksOf(null)`; choice chips / typed Enter answer;
no-choice shows ranked actions; Z.6: context gloss from `samples/docs.json` via `doc_for(ctx)` /
`shape_of` — collapsed unchanged); ▾/▴ toggles with titles Expand / Collapse Page Intelligence
(Z.7 — `rail` stays the identifier). Empty line: block cursor at the insertion point (native caret
hidden); with text, the native caret.

**Canvas (G.9d ◐, proven).** *The target decides*: the right button makes something new where there
is nothing, and shows what a thing can do where there is something. Right-click on empty space still
creates. Right-click on a card, a frame, an edge or a selection opens the list in fixed order via
`App` `onAct={project.go}` into Canvas, so `interface` and `group` become entries rather than
immediate acts. Name and perch are not immediate. **Right drags are unchanged** — the distance
threshold in `gestures.ts` already tells a drag from a click. `Scope.on` takes a list, so edge→`retype` is
offered (G.9e).

### Left button

| Gesture | On | Reaches |
|---|---|---|
| click | card, group boundary, edge | selection |
| click | reference | selection — of what it stands for, not the stand-in |
| click | frame, empty | clears; empty inside a boundary selects the boundary |
| double-click | card | `open`, or `reveal` if it is a reference |
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
| click | card, frame edge | offered list for that target, fixed order (G.9d ◐); `interface` is an entry |
| click | edge | offered list for that edge, fixed order (G.9d ◐); `retype` is an entry (G.9e) |
| click | a selection of several | offered list for the selection, fixed order (G.9d ◐); `group` is an entry |
| click | a name, an interface | offered list — not immediate rename / perch (G.9d ◐) |
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

`export`, `import`, `new workspace`, `new` (project), `undo`, `redo`, and with S4 `open project`,
`close project` and `export workspace`. **`new workspace` clears the session** — drops every keyed
project log, the workspace list, the session pointer and the live file handle, then leaves a blank
`Held` (`store.clearSession` / `clearWorkspace`). Reached as a **word** in the header, behind a
confirm (U.13, proven). **`new` names a project into being** — a name is required and unique among
open projects (`workspace.mayName`), the naming *is* the project's first step (`workspace.started` /
`workspace.begin`), and nothing can be added before it. Storage no longer mints a project on load.
Reached from the explorer's `＋` when the selection says project (U.14 ◐). **`App.newProject` still
does not call `begin`** — gap, App not owned. **`undo` / `redo` apply to the project in context**,
since that is where the step was written — **reached as words at the explorer foot**, with one line
naming the last executed action; the header's `↤` / `↦` pair is gone; keyboard shortcuts are
unchanged (U.12, proven). **Unlock** and **fork** are workspace operations offered from the strip
when a locked package refuses a write — not registry actions (S4.8).

**Queries** — readable state, not things to do. Off the registry entirely.

`nameTaken`, `stepCount`, `state`, `saving`, `trouble`.

**Finding** — filtering the explorer writes nothing and goes nowhere, so it is neither an action
nor navigation. It is a mode the terminal can drive and the explorer owns.

**Display preferences** — held outside the log, and outside both tiers. Toggling one changes what
you see and nothing about the project.

Whether interfaces are shown, curves against right angles, which form the next right drag
draws, which relationship types are shown on the canvas, the table/matrix types cycle
(definition names on table; relationship marks on matrix — U.7), and the page **theme**
(`current` / `modern` / `light`, sticky in `mndflow.theme.v1` — U.4). **Diagram chrome
presents them in one language** (U.15, proven): vertical *interface* / *relation* / *flow*
groups; every control word+glyph; form / draw / types / axis as radio rows. The breadcrumb and
the arrange buttons are not among them: those reach `open` and `arrange` (arrangements still
on `.shape` with words (U.16 dropped); table/matrix crumbs climb when wired; trail/climb also
derive from the graph when the page omits `path`/`onUp`).


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

`relax_layer` and `size_element` are wired on the canvas (∿ and note SE). `dissolve` reaches
`delete_element` through the registry and the canvas menu offers it when a group is in scope
(G.9d ◐); groups are not listed in the explorer. Explorer (G.9b), rail (G.9c) and canvas
(G.9d ◐) all present the offered list.
