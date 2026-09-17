# Model
Core object graph model definitions and types. **Two element kinds and no third**: `Blocks` (nodes) and `Relations` (edges). **Definitions group two ways** by what they describe — `block` and `relation` — which is how a file reads and how import dispatches, not a second id space. Each group publishes a distinct icon.


## Block
A block is the fundamental unit of the workspace graph. Every object is a type of block, may be defined (`def`) and subtyped in package data, and is a member node of the graph.

### Block Module
The engine code that interprets each base block type.

### Block Kinds
**Eight, in two families.** The family a kind belongs to is the whole of what a gesture may change: a block may be retyped to any definition of its own kind, and among the open three to any of theirs.

**Open** — they differ in what they are *for*, and one becomes another by saying so:

- **Block** - the base kind, and what an ordinary block is
- **Folder** - an organizational unit: the workspace, a project, a folder
- **Resource** - a file, script, data file, image or external artifact

**Derived** — each carries something a change of type cannot invent, so one is arrived at by *making* one and never by retyping into it:

- **Reference** - a second appearance of a block that lives elsewhere. `of` is the whole of it
- **Interface** - a block seated on a wall. `side` and `at` replace its place
- **Group** - a dashed rim round a set of blocks in one layer, sized from what it holds
- **Grid** - a region of the lattice with an extent: rows, columns, merges, and cells things are seated in. It owns its corner
- **Note** - a card of text. Its body is its name

**Subtyping a derived kind is not the same act.** Make one, customise it, pin that — which produces a definition of that kind and changes nobody's.

### There is no untyped block
`block` is the base kind, and a block naming no definition **is** one: the field being absent is how a file stays small, never a second sort of thing. Every reader asks `def_of`, which answers with the kind's own definition where the field is empty — so what is absent and what is spelled out resolve identically.

### Alias
A serial minted at creation and never rewritten, drawn as a short mark (`A1`, `B7`) beside the type a block reads as while nobody has named it. **Not a tag**: it is the one mark the app hands out so that a thing with no name has something to be called, and there is exactly one.

### Tags
Words put on a block or a relationship to say what it is like. **The block's own, never its definition's** — two things of one type are tagged differently all the time. A tag carries nothing: no fields, no style, no chain. That is what separates it from a definition and what lets there be any number.

### What one element says about itself
Model data on the element, so it travels in the file and undoes like anything else: how it draws over what its definition said (`looks`) — including the `card` keys `label`, `align`, `label_align`, `icon` and `alias`.


## Relationships
A join between exactly two **blocks**. Its ends are blocks, never another relationship.

### Relation Modules
**Two, and neither is picked.** A relationship's module is read from its ends (`edge_module`) and never stored.

- **line** - any relationship with no note at an end. `dir` is `none`/`forward`/`back`/`both`; direction is a setting, never a module. **A layer has no reading direction of its own** — order is stated by a directed line, or by a cell address along the way a grid reads
- **tie** - a relationship with a note at an end. Takes no direction

A relation definition names its module in `relation.module` and stays within it: a line never follows a tie definition.


## The diagram
**One way to draw.** A layer is a block and its direct children, projected onto one lattice. `table` and `matrix` were view modules and the grid absorbed them; `view` went with them, and ***View* is reserved rather than retired** — it will name a data perspective over the model, and it comes back defined.

**A notation is a set of definitions, never a module.** Definitions name block and relation modules and configure them, so what a package adds costs data rather than code. There is no notation the engine knows by name — activity, sequence and state were configurations the engine carried, and carrying them was the engine doing a package's job.

**How a layer lays out is model data.** `arrangement` is `free` or `grid`, held on the layer and in the log, because how a layer lays out is part of what it says.