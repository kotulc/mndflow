# The surface

**Every action the engine offers, every gesture that reaches one, and what is deliberately not on the surface.** The goal state, in definitions.md's vocabulary; the data contract is schema.md.

| Property | |
|---|---|
| **a new sort of thing is a definition** | data, reaching the surface through the actions already here. Two actions saying one thing are one action |
| **every action is sayable** | something somebody meant and could put in words. What cannot be said is an adjustment |
| **an action returns mutations** | it never applies them. One seam serves the pointer, the keyboard and the CLI |
| **scope is what a gesture asks** | `layer`: the open layer is enough; `block`, `edge`, `cell`, `selection`: one of those is picked |
| **a sentence each** | what an action does, in words |


## Actions

### Blocks

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `create` | makes a block in a layer, where you pointed; made from a block, a tie trait links it | layer, block | name?, parent?, type?, spot?, from? | `add_block` (+ `link_blocks`) |
| `delete` | removes blocks with everything under them, or relationships | block, edge, selection | ids | `delete_block` / `delete_edge` |
| `rename` | changes what a block or a relationship is called | block, edge | id, name | `update_block` / `update_edge` |
| `retype` | sets which definition a block or relationship is, or a definition extends | block, edge | ids, type | `update_block` / `update_edge` |
| `describe` | writes a block's body text | block | id, body | `set_body` |
| `move` | puts blocks under a different parent, in the place you dropped them | block, selection | ids, parent, before?, spot? | `move_block` (+ `seat_cell`) |
| `refer` | places a stand-in for a block, a definition or a package | layer | target, type?, spot?, parent?, at? | `add_block{of}` (+ `seat_cell`) |
| `source` | says where a block's content lives outside the workspace, or gives it back | block | id, uri? | `set_source` |
| `tag` | puts tags on an element; a new word makes a workspace tag | block, edge, selection | ids, tags | `set_tags` (+ `add_block`) |
| `trait` | sets the traits a definition carries, or gives the set back to its chain. Refuses a usage, and a tag carrying no settings | block, selection | ids, traits? | `set_traits` |
| `look` | sets one property of how this draws or what it asks | block, edge, selection | ids, key, name, value? | `set_setting` |
| `none` | gives back everything this says for itself | block, edge, selection | ids | `drop_settings` |
| `note` | writes a note about a block, tied to it | block | about, text, spot?, w?, h? | `add_block` + `set_body` + `link_blocks` |

| Rule | |
|---|---|
| **`move` is nesting, filing, grouping and ordering** | they differ only in where the parent comes from. A selection moves in one step. Into a grid, it seats; out of one, it unseats |
| **`delete` takes the subtree** | holders included. It never reaches through a reference |
| **`delete` refuses** | a definition or a package something uses; `base`; the workspace root |
| **`retype` keeps a kind a kind** | `block`, `folder`, `note`, `group` and `grid` are one family; `reference` and `interface` are made, never retyped into. A run takes only relation definitions |
| **`retype` refuses a cycle** | a definition never extends itself or one that extends it |
| **`retype` into a grid seats what it holds** | each child takes a free cell in reading order, those already in one keep it, and the grid grows rows to fit |
| **placement refuses self-use** | `create`, `move`, `retype` and a grid column refuse putting a usage of `D` anywhere in `D`'s structure |
| **placement refuses nesting** | a definition never goes into a structure |
| **frozen is refused** | nothing under a frozen package is written; subtype it instead |
| **`tag` and `look` are model data** | they travel in the file and undo. `look` writes one property; an absent value gives it back |

### Navigation

**Writing no mutations makes an action navigation.** No step, nothing to undo.

| | Does | Scope | Arguments | Effect |
|---|---|---|---|---|
| `open` | draws a tree's structure, the overview with none, or leaves this one: from a tree's top, for the overview | block | id? | `open` |
| `reveal` | opens the layer a block sits on and picks it there, followed through references | block | id | `open` + `focus` |

- **Where the canvas goes is navigation's** (core `navigate.ts`): opening a tree draws its structure; any other block in a structure that opens onto a drawing or may hold — a folder among them — draws as its own layer; a group or grid, which draw inline, and a note, which may hold nothing, are revealed in place; a package or anything in a domain is revealed on the overview. Leaving a tree's top returns to the overview, the tree picked. Both apps use the same functions.
- **Opening a part opens its definition**, the part picked there.
- **The way out of an interface is the way in**: leaving lands in whichever of its two layers you came from.

### Relationships

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `relate` | draws a relationship from one block, or a part of one, to another | layer | from, to, fromPart?, toPart?, type?, dir?, fromSide?, toSide? | `link_blocks` |
| `relink` | takes one end of a relationship to another block or part | edge | id, end, to, part? | `set_end` + `set_side` |
| `unlink` | removes a relationship, leaving the interfaces it met | edge | id | `delete_edge` |
| `flip` | turns a relationship around | edge | id | `flip_edge` |
| `direct` | sets which way a relationship's arrows point | edge | id, dir | `set_dir` |

- **Both ends are blocks**, on any layers. A relationship never ends on another.
- **`relate` carries the type**; absent, a `line`. `tie` is chosen like any other type.
- **Definitions are never related**, except by a tie trait.

### Interfaces

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `interface` | puts an interface on a block's border, and takes a relationship to it | block, edge | owner?, side?, at?, type?, edge?, end? | `add_block` (+ `set_end`, `set_side`) |
| `mark` | marks an interface in, out, both, or clears it | interface | id, flow? | `mark_port` |

**`interface` absorbs promotion**: naming the seat a relationship meets makes an interface there. An end already an interface is never promoted.

### Holders and cells

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `group` | makes a group round what is selected, or a grid over a region, and moves the selection into it | layer, selection | ids?, rows?, cols?, type?, spot? | `add_block` + `move_block`… (+ `set_grid`, `seat_cell`) |
| `heads` | adds a header row or column to a grid, or takes it away | block, cell | grid?, way, on? | `set_grid` + `seat_cell`… |
| `label` | names the block in a cell, or makes a plain block of that name in an empty one | cell | grid?, at?, text? | `update_block` / `add_block` + `seat_cell` |
| `fill` | puts a new block in every empty body cell | block, cell | grid? | `add_block` + `seat_cell`… |
| `insert` · `remove` | adds or takes away a row or column | block, cell | grid?, way, at? | `set_grid` + `seat_cell`… |
| `merge` | spans the picked cells, or splits a merged one | cell | grid?, at?, into? | `set_grid` |
| `transpose` | turns a grid on its side | block, cell | grid? | `set_grid` + `seat_cell`… |
| `chain` | links every filled cell in reading order | block, cell | grid?, dir?, type? | `link_blocks`… |

- **A holder is made like any block** and filled by `move`. `group` is the shortcut: a holder and a move in one step.
- **Any block may sit in a cell**, a holder or a grid included; it draws compact there. A header cell holds any block.
- **A grid's member always has a cell.** Whatever `remove`, `merge`, `heads` or a smaller extent leaves without one moves to the nearest spare cell on its side, else leaves the grid. **The block always survives.**
- **`heads` adds or removes a line**, never converts one, so nothing seated moves.
- **A cell is an address, not a thing**: `Context` carries `cells` beside `picked`.

### Attributes and definitions

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `field` | answers an attribute on a usage, or declares one on a definition | layer, block | holder, name, value?, type?, key?, default?, unit?, many?, optional?, note?, to? | `set_value` / `set_attributes` |
| `order_field` | moves an answer or an attribute before another | layer, block | holder, name, before? | `order_values` / `set_attributes` |
| `unfield` | drops an answer from a usage, or an attribute from a definition | layer, block | holder, name | `drop_value` / `set_attributes` |
| `define` | makes a definition in a domain | layer | name, type?, parent?, id? | `add_block{def}` |
| `define_from` | makes a definition of how a block or line is set, and makes it a usage of it | block, edge | id, name | `add_block{def}` + `update_block` / `update_edge` + `drop_settings` |

- **One act, and the holder says which**: a value on a usage and an attribute on a definition are the same thing said of two holders.
- **A type is named, never typed out**: `type` names a value type or a block definition by id or name; a name nothing holds makes a value type of the workspace's, extending `text`.
- **`define` lands where the user is**: in the open domain, in the holder picked. Its domain (block or relation) is read off what it extends; absent, `block`. Its id is minted, or passed in by a caller that must know it.
- **A name is unique in its package**, across definitions, tags and traits.

### Card sources

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `markdown` | rewrites a block or a definition from its card source: frontmatter, then its body | layer, block | id, text | what `rename`, `retype`, `tag`, `trait`, `source`, `field`, `unfield` and `describe` write |
| `attach` | copies a markdown file onto a usage, and says where it came from; attached again, it refreshes | block | id, text, source? | as `markdown`, and `set_source` |

- **A card source is the actions a person would have run**, each checked against the graph the ones before it made. Nothing is decided here.
- **Permissive**: a type or tag nothing loaded holds, or more than one package holds, is made in the workspace and said. A trait gives settings, so a trait word naming none is refused.
- **A definition is never written in markdown** whole: its card source is its name, what it extends, its tags and traits, its attributes' defaults and its body. `attach` is a usage's.

### The layer

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `layout` | sets how the layer lays out, and tidies it into that shape | layer | kind, at? | `set_setting{layout}` + `place_block`… |

**Layout is a setting**, said by a definition and overridable by the layer: `free`, `auto`, `outline`, `page`. The tidy is written on the way out of a computed layout, so `free` keeps where it put everything. **Moving anything by hand on a computed layout sets it `free`**, positions written first, in the same step.


## Adjustments

**Positional, unsayable, gesture-only**: never named or listed.

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `place` | where something came to rest | block | moved[] | `place_block`… |
| `size` | how big a card was asked to be | block | id, w, h | `size_block` |
| `seat` | where an interface sits on its edge | interface | id, side, at | `set_port` |

**One gesture, one step.** A drag that comes to several writes (a place and a move, a layout and a place) runs inside `session.batch`. **A drop resolves to an action**: a card on a card or into a holder is `move`; into a cell, `move` seating it; a grid's corner dragged is `set_grid`; a relationship's end on another block is `relink`.


## Gestures

**The left button works what is already there; the right button makes something new.** The offered list is `offer(ctx)`; menus draw it in a fixed order.

### Left button

| Gesture | On | Reaches |
|---|---|---|
| click | card, holder, relationship | selection |
| click | frame, empty | clears |
| click | a cell | picks the cell, beside the selection |
| double-click | a cell | `label` |
| double-click | card, its border, a seat | `open`; on a reference, `reveal`; on a part, its definition |
| double-click | name, note | rename, in place |
| double-click | empty outside the frame | `open` with nothing: leaves |
| drag | card → card or holder | `move` |
| drag | card or selection | `place` |
| drag | card → cell | `move`, seated |
| drag | a relationship's end → a block | `relink` |
| drag | seat in the room's wall | `seat` |
| drag | card corner | `size` |
| drag | a grid's corner | its extent, in whole cells |
| drag | empty | selection box |
| drop | explorer row | a definition makes a usage of it, or retypes what it lands on; anything else is `refer` |
| drop | a tie-trait block on a block | links them |

### Right button

| Gesture | On | Reaches |
|---|---|---|
| click | empty | `create`, asking for the name |
| click | card, frame edge, relationship, end, cell, selection | the offered list |
| drag | card → card | `relate` |
| drag | empty → empty | `group`, sized in cells, taking the cards it swept |

### Keyboard

| | Reaches |
|---|---|
| `Escape` | closes a menu; clears the selection |
| `Enter` | `open` |
| `F2` | rename, in place |
| `Delete` | `delete` |
| `Ctrl`/`Cmd` + `G` | `group` |
| `Ctrl`/`Cmd` + `A` | every card on the layer |
| `Ctrl`/`Cmd` + `Z` / `Y` | undo / redo |

**The shell owns the global keys; a field being typed in answers for itself.**


## Chrome

**The projection declares which control groups it offers (`slots`); the shell builds each.**

| Slot | Is |
|---|---|
| `layer` | the layer's layout kind. A setting, in the log |
| `display` | what the drawing shows: frame, guides, interfaces, flatten. Writes nothing |
| `relations` | what a right drag and a `chain` draw: a plain or directed line, or a tie |


## Not on the surface

| | |
|---|---|
| **shell actions** | new workspace, import, export, export as a package, undo, redo: they reach a host port, not the graph. Export sits in the header and on the workspace tab, export as a package on the workspace tab alone. A package is authored as a workspace and written as one: its root and ids prefixed with its name |
| **queries** | readable state, off the registry |
| **finding** | filtering writes nothing and goes nowhere |
| **display preferences** | outside the log: interfaces shown, guides, frame, folds, theme |


## The registry

**Everything that changes the model is a record on one registry**, read by every input surface.

- Each carries a **name**, a **sentence**, a **scope**, typed **arguments** and a **run** returning mutations.
- **`when` decides whether it is shown; `check` decides whether it runs**, and refuses in words.
- **A position comes only from a gesture.**
- **An action may also ask** for a layer opened, a selection moved, or a line said.
- **What does not apply is not shown.**


## Future stories

| Story | Why it waits |
|---|---|
| **Behaviour** | a cell address is an order, a header an allocation; nothing reads either yet |
| **Allocation** | derived and correct; a matrix or report would consume it |
| **SysML round trip** | a `tie` goes out as `comment` and comes back as a `line` |
| **Redefinition** | a usage or subtype overriding a part it reads through |
