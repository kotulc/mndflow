# Model
Core object graph model definitions and types. **Three element kinds**: `Blocks` (nodes), `Relations` (edges) and `Holders` (the boundaries and grids drawn over a layer). **Definitions group two ways** by what they describe — `block` and `relation` — which is how a file reads and how import dispatches, not a second id space. Each group publishes a distinct icon.


## Block
A block is the fundamental unit of the workspace graph. **A block is content**: body text, or a stand-in for something outside the workspace. It may be defined (`def`) and subtyped in package data, and is a member node of the graph.

### Block Module
The engine code that interprets a block. **Three, and each is read from a stored field rather than from configuration** — that is the whole of what separates a module from a kind.

- **block** — the base. Nothing in its own shape says otherwise
- **reference** — `of` is set
- **interface** — `side` is set

### Block Kinds
**A kind is a definition, not a module.** The `base` package ships seven, and everything a user or package defines extends one. What separates most of them is what they *allow*, which is data.

**Open** — the plain block with different configuration, so one becomes another by saying so:

- **Block** - the base kind, and what an ordinary block is
- **Folder** - an organizational unit: the workspace, a project, a folder
- **Note** - a card of text, its own height, holding nothing

**There is no `resource` kind.** A file, a script or an image is a block whose `source` says where it came from — which every block may carry, so a kind for it named a slot rather than a sort of thing. What marks one out is the `Ext` stamp, not its chain.

**Derived** — each carries a stored field a change of type cannot invent, so one is arrived at by *making* one and never by retyping into it:

- **Reference** - a second appearance of something that lives elsewhere. `of` is the whole of it
- **Interface** - a block seated on a wall. `side` and `at` replace its place

**Group and Grid ship a look and nothing else.** They name holder shapes, and a holder is not a block — see *Holders*.

**Subtyping a derived kind is not the same act.** Make one, customise it, pin that — which produces a definition of that kind and changes nobody's.

### There is no untyped block
`block` is the base kind, and a block naming no definition **is** one: the field being absent is how a file stays small, never a second sort of thing. Every reader asks `def_of`, which answers with the kind's own definition where the field is empty — so what is absent and what is spelled out resolve identically.

### Changing what a package's definition means
**Nothing from outside the workspace is written.** Selecting a definition a package brought — the floor's kinds included — and editing it mints **the workspace's own word about it**: a definition extending it, carrying only what was changed. **That word stands in front of it in every chain that reaches it**, so a subtype three links down reads it too. Nothing is minted until somebody says something.

**Its identity stays theirs.** A package's definition is never renamed, dropped, or made to extend something else. What it *says* — how it draws, what it declares, what it allows — is yours.

### What a block may do
**`allows` is refused at the gesture; `expects` is only ever advice.** Structure is refused when you try to make it, values are noted when they are missing — see *Capabilities* in schema.md.

### Where its content came from
**`source` is provenance, not a link.** The graph is the truth and nothing syncs to what a block came from, so a locator may go stale, the file may move, and nothing breaks. Translators convert external representations into blocks; nothing converts back on its own.

### Alias
A serial minted at creation and never rewritten, drawn as a short mark (`A1`, `B7`) beside the type a block reads as while nobody has named it. **Not a tag**: it is the one mark the app hands out so that a thing with no name has something to be called, and there is exactly one.

### Tags
Words put on a block or a relationship to say what it is like. **The block's own, never its definition's** — two things of one type are tagged differently all the time. A tag carries nothing: no fields, no style, no chain. That is what separates it from a definition and what lets there be any number.

### What one element says about itself
Model data on the element, so it travels in the file and undoes like anything else: how it draws over what its definition said (`looks`) — including the `card` keys `label`, `align`, `label_align`, `icon`, `alias` and `height`.


## Holders
**A boundary or a grid, drawn in one layer and holding blocks there without owning them.** Not a block: nothing points at one, no tree lists one, relations refuse them as ends, and deleting one loses an arrangement rather than any content.

**One kind, two shapes**, told apart by `arrangement`:

- **free** — a dashed rim round a set, sized from what it holds
- **grid** — a region of the lattice with an extent: rows, columns and merges. It owns its corner

**Membership is stored on the block** (`group`, `cell`, `header`), so a holder's members are derived and the two can never disagree. **A holder is never a parent** — `parent` says which layer you are in, `group` says what holds you within it.

**Nesting is one rule, not a second axis.** A cell seats exactly one card and a holder is not a card, so grids do not nest; free holders have no cells to fit into, so they do.

**A holder carries no definition**, only a look — the one its shape ships. It may point at a block with `of`, meaning *this region stands for that block*.


## Relationships
A join between exactly two **blocks**. Its ends are blocks, never another relationship.

### Relation bases
**Two, and neither is picked.** What a relationship descends from is read from its ends (`edge_base`) and never stored. **Both are definitions rather than modules** — there is no relation module left to choose.

- **line** - any relationship with no note at an end. `dir` is `none`/`forward`/`back`/`both`; direction is a setting, never a module. **A layer has no reading direction of its own** — order is stated by a directed line, or by a cell address along the way a grid reads
- **tie** - a relationship with a note at an end. A dashed run with no heads, taking no direction


## Marks
**Two corners, and they answer different questions.**

- **The card icon**, top right: what sort of thing this is, or whatever a person set over it with `card.icon`. **A card that holds parts fills it** — that, and not a second stamp, is what containing looks like
- **The system mark**, bottom right: what this card stands in for, written as a word — `Ref`, `Def`, `Pkg`, `Ext`. Derived, one at most, and never set by hand. The precedence is `of` → `source` → nothing


## Packages
**A named set of definitions the workspace draws on**, addressed by id so a block may stand in for one. Names are unique within a workspace. **The shipped floor is one of them**: every workspace stands on `base`, and it lists beside the rest.


## The diagram
**One way to draw.** A layer is a block and its direct children, projected onto one lattice. `table` and `matrix` were view modules and the grid absorbed them; `view` went with them, and ***View* is reserved rather than retired** — it will name a data perspective over the model, and it comes back defined.

**A notation is a set of definitions, never a module.** Definitions name block modules and configure them, so what a package adds costs data rather than code. There is no notation the engine knows by name — activity, sequence and state were configurations the engine carried, and carrying them was the engine doing a package's job.

**Every card is one height.** A container says so by filling its icon, never by drawing a picture of what it holds; only a definition asking for `card.height: free` keeps whatever size it was given.

**How a layer lays out is model data.** `arrangement` is `free` or `grid`, held on the layer and in the log, because how a layer lays out is part of what it says.
