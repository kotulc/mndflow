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
| `write` | writes what a block holds as text, its body | block | id, body | `set_body` |
| `describe` | says in a line what a block or a definition is for | block | id, description | `set_description` |
| `move` | puts blocks under a different parent, in the place you dropped them | block, selection | ids, parent, before?, spot? | `move_block` (+ `seat_cell`) |
| `refer` | places a stand-in for a block, a definition or a package | layer | target, type?, spot?, parent?, at? | `add_block{of}` (+ `seat_cell`) |
| `source` | says where a block's content lives outside the workspace, or gives it back | block | id, uri? | `set_source` |
| `tag` | sets an element's tags, the whole list; a new word makes a tag in the workspace's library; none gives the list back to its definition. Refuses a trait | block, edge, selection | ids, tags? | `set_tags` (+ `set_library`) |
| `constrain` | sets the constraints an element is held to, the whole list, each a library constraint by name or id; none gives the list back to its definition | block, edge, selection | ids, constraints? | `set_constraints` |
| `define_tag` · `define_type` · `define_interface` · `define_constraint` | make or change a library entry in the workspace's library: a tag, a type (an enum or an alias), an interface definition, a constraint. Each may extend another of its kind | layer | name, id?, description?, extends?; form?, choices?, unit?, format?; required?, match? | `set_library` |
| `unmember` | takes away a tag an annotation gives: out of the group or region, or the label's tie deleted | block | id, from | `move_block` or `delete_edge` |
| `trait` | sets the traits a definition carries, the whole list, or gives it back to its chain. Refuses a usage, and a word naming no trait | block, selection | ids, traits? | `set_traits` |
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
| `open` | focuses a room in world view — a definition as its usages are, a registry or an entry of one as its treemap — or leaves for the room holding the focus. `at`, the section it was opened from | block | id?, at? | `open` |
| `read` | focuses a room in reading view: 100%, scrolling inside its walls | block | id | `open` |
| `reveal` | picks a block, focusing the room it sits in. A stand-in is one object with its block: revealing it lights every appearance | block | id | `open` + `focus` |

- **Where the canvas goes is navigation's** (core `navigate.ts`): **opening focuses a room** — any block holding blocks — and the camera flies to it; **the card's kind says how that room draws** (`lens_of`); a stand-in focuses what it stands for; **a definition opens as its usages do**. A block holding nothing is picked where it is drawn, its room focused; a region may be focused from the canvas; a group, a label or a note never is. Leaving focuses the room holding the focus. Both apps use the same functions.
- **Opening a part opens its definition**, the part picked there.
- **An interface opens nothing**: it is a component of its block, drawn on its wall, with no layer of its own.

### Relationships

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `relate` | draws a relationship from one block, or a port on one — its own or its definition's (`block/port`) — to another. A definition and a usage never relate, but by a tie | layer | from, to, type?, dir?, module? | `link_blocks` |
| `relink` | takes one end of a relationship to another block or port | edge | id, end, to | `set_end` |
| `unlink` | removes a relationship, leaving the interfaces it met | edge | id | `delete_edge` |
| `flip` | turns a relationship around | edge | id | `flip_edge` |
| `direct` | sets which way a relationship's arrows point | edge | id, dir | `set_setting` (`line.dir`) |

- **Both ends are blocks**, on any layers. A relationship never ends on another.
- **`relate` carries the type**; absent, a `line`. `tie` is chosen like any other type.
- **Definitions are never related**, except by a tie trait.

### Interfaces

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `interface` | puts a port on any block that *has ports* — its type an interface definition in a library — and takes a relationship's end to one | block, edge | owner?, side?, at?, name?, type?, flow?, edge?, end? | `set_ports` (+ `set_end`) |
| `port` | changes a port where it is held — its definition's, for one a usage reads through: its name, interface definition, flow or seat; `free` lets it place itself. `rename` and `delete` take a port too; a port deleted takes its lines | interface | id, name?, type?, flow?, side?, at?, free? | `set_ports` |
| `end` | says what one end of a relationship means: multiplicity and role on a line; also ownership and navigable on a relation definition. An empty word takes one back | edge, block | id, end, multiplicity?, role?, ownership?, navigable? | `set_ends` |

**`interface` absorbs promotion**: naming the end of a relationship makes a port on that end's block and takes the end to it. An end already at a port is never promoted.

### Holders and cells

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `group` | makes a group round what is selected, or a grid over a region, and moves the selection into it; a region may start empty (`members: []`) | layer, selection | ids?, rows?, cols?, type?, spot? | `add_block` + `move_block`… (+ `set_grid`, `seat_cell`) |
| `room` | turns a group or a region into a room — retyped a plain block, its members already holding by `parent` — or wraps the selection in a new room where it is drawn, keeping its relations | block, selection | group?, members?, name? | `update_block`, or `add_block` + `move_block`… |
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
- **A type is named, never typed out**: `type` names a form, a type or a block definition by id or name; a name nothing holds makes a type of the workspace's, an alias of `text`.
- **`define` lands where the user is**: in the open domain, in the holder picked. Its domain (block or relation) is read off what it extends; absent, `block`. Its id is minted, or passed in by a caller that must know it.
- **A name is unique in its package**, across definitions and library entries.
- **A name is unique among its siblings**: an act giving two siblings one name is refused, so a name ref finds one block.

### Card sources

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `markdown` | rewrites a block or a definition from its card source: frontmatter, then its body | layer, block | id, text | what `rename`, `retype`, `tag`, `trait`, `source`, `field`, `unfield`, `describe` and `write` write |
| `attach` | copies a markdown file onto a usage, and says where it came from; attached again, it refreshes | block | id, text, source? | as `markdown`, and `set_source` |

- **A card source is the actions a person would have run**, each checked against the graph the ones before it made. Nothing is decided here.
- **Permissive**: a type or tag nothing loaded holds, or more than one package holds, is made in the workspace and said. A trait gives settings, so a trait word naming none is refused.
- **A card source states a block whole**, a definition included: its frontmatter is a diagram file's (`name`, `type`, `def`, `description`, `tags`, `constraints`, `traits`, `settings`, `ports`, values, `blocks`, `relations`) and its body is `body`.

### The layer

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `layout` | sets how the layer lays out, and tidies it into that shape | layer | kind, at? | `set_setting{layout}` + `place_block`… |

**Layout is a setting**, said by a definition and overridable by the layer: `free`, `auto` or `page`, and `auto` where nothing says. The tidy is written on the way out of a computed layout, so `free` keeps where it put everything. **Moving anything by hand on a computed layout sets it `free`**, positions written first, in the same step.


## Adjustments

**Positional, unsayable, gesture-only**: never named or listed.

| | Does | Scope | Arguments | Writes |
|---|---|---|---|---|
| `place` | where something came to rest | block | moved[] | `place_block`… |
| `size` | how big a card was asked to be | block | id, w, h | `size_block` |
| `seat` | where a port sits on its edge, written where it is held | interface | id, side, at | `set_ports` |

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
| double-click | card, its border, a seat | `open`; on a reference, `reveal` of what it stands for, followed to the end; on a part, its definition |
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
| `palette` | the notation the focus's family draws with |
| `workspace` | the workspace's and open package's name and description |
| `make` | *new usage* and *new definition* in the focus |
| `relations` | which relation types a right drag and a `chain` draw |

Display — frame, guides, ports, the key, the context mode — is the workspace tab's, one workspace-wide setting; a room's layout is the tray's card tab.


## Not on the surface

| | |
|---|---|
| **shell actions** | new workspace, import, export, export as a package, undo, redo: they reach a host port, not the graph. Export sits in the header and on the workspace tab, export as a package on the workspace tab alone. A package is authored as a workspace and written as one: its root and ids prefixed with its name |
| **queries** | readable state, off the registry |
| **finding** | filtering writes nothing and goes nowhere |
| **display preferences** | outside the log, workspace-wide: card size, frame, guides, ports, the key, the context mode (dim or rings), folds, theme |


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
