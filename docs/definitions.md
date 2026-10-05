# Definitions

**The canonical vocabulary.** One entry per term, so a rule written anywhere else reads without guessing. Where any other document uses a word, this is what it means. The rules themselves are in design.md.


## The one shape

**Everything is a block, and a package is a graph.** Two element kinds exist, a block and a relationship. A package, a definition, a folder and a note are all blocks; what separates them is a marker, a position or a type, never a record of their own.

| Term | Means |
|---|---|
| **block** | the one element. Placed, drawn, carries values, holds other blocks. Held in `graph.blocks` |
| **relationship** | a join between **exactly two** blocks, never a block and a relationship. Drawn as a line, placed by its ends. Held in `graph.edges` |
| **parent** | the block a block sits under. **The only containment**: holders, definitions, packages and structure all hold by `parent` |
| **package** | a root block (`parent: null`). `base` ships with the kit, the workspace's is editable, and any other is **frozen** |
| **definition** | **a named tree in a package**: a block carrying `def`. Usable and extendable by `type` whether or not anything does. **Abstract**: never placed or linked as an instance |
| **usage** | a block without `def`. Its `type` names a definition, a base when it names nothing |
| **type** | on a usage, the definition it *is*; on a definition, the one it *extends*. One field, one chain |
| **value** | a named, typed value on a usage (`values`). Never structural, no identity of its own. **A relationship holds none** |
| **reference** | a block that **stands for** another, a definition or a package (`of`). Drawn, never owning. A gone target reads **missing** and is kept |
| **link** | a value pointing at a block without drawing it. **A reference is drawn; a link is not** |


## Where a block sits

**A block's role is read from its position.** Nothing stores it.

| Term | Means |
|---|---|
| **holder** | a block holding by `parent` and organizing what it holds: **folder**, **group**, **grid**. Which it is, and so how it draws what it holds, is its base. Not a definition; it organizes a domain or a structure alike |
| **tree** | a non-holder block whose ancestors up to its package are all holders: a definition, or a usage placed in the domain |
| **domain** | a package root, the holders under it, and the trees they organize |
| **structure** | everything under a tree's root: usages and holders, to any depth |
| **part** | a block in a definition's structure, seen through a usage of it |
| **own child** | a block stored under a usage itself, beside what it reads through |
| **route** | how a part is reached: `usage/part`. What tells two usages' views of one part apart |
| **frozen** | under any package root but the workspace's: read only |


## Reading through

| Term | Means |
|---|---|
| **chain** | a definition, what it extends, and so on to a base. One parent, so a list, never a graph |
| **own values only** | a block stores what it says; inherited values are resolved on read, never copied |
| **precedence** | per link of the chain, self first: its own settings, then its traits in order. **Nearest wins** |
| **read-through** | a usage shows its definition's structure, **one step**: its type's own structure, never a chain. Nothing is copied |
| **edits go home** | changing a part through a usage edits the definition that owns it |
| **structure is not inherited** | a subtype inherits settings and traits, never structure. Structure is a definition's own |


## Bases

**`base` enumerates the functionally distinct kinds, and keeps the set minimal.** Everything a user or a package defines extends one.

| Base | Is |
|---|---|
| **block** | the unit of structure: a thing, a part, a step. Holds blocks, which it opens onto as a layer |
| **folder** | a holder that **hides** what it holds: you descend to see it |
| **group** | a holder that draws what it holds **inline**, inside its rim. Groups nest |
| **grid** | a holder that seats what it holds **in cells**. Anything in a cell draws compact, so any block may sit in one |
| **reference** | a stand-in for a block, a definition or a package elsewhere |
| **interface** | a block seated on a wall: where relationships enter and leave. Also **port** |
| **note** | a remark: resizable, carries body text, ties to the block it is made from |
| **tag** | a word carried by other elements. Holds nothing |
| **line** | the plain relationship. `dir` says which way it points |
| **tie** | a dashed relationship with no heads. **A type like any other**, chosen, never forced |

**Block modules are engine code, kinds are data.** Three modules, each read from a stored field: `block`, `reference` (`of` is set), `interface` (`side` is set). Every other kind is the `block` module configured.


## Tags, traits and capabilities

| Term | Means |
|---|---|
| **setting** | what an element says about how it draws or what it may do, by component (`settings`) |
| **vary** | a style setting: how far, in degrees, each definition under one that sets it strays from its inherited hue, keyed by its id. Kin read alike, each still itself |
| **capability** | a setting saying what a block may do: `allows` (refused at the gesture) and `expects` (advice) |
| **tag** | a definition on the `tag` base, carried in `tags`. A word with a meaning (`body`), no settings, no structure |
| **trait** | **a tag carrying settings**: a capability tag. Carried in `traits`, listed apart from tags. Adding or removing a capability on a subtype is adding or removing a trait. It confers its own settings and its traits', never its base's |
| **trait inheritance** | a definition's traits are its chain's until it states its own set; then its set is the only one. Reset gives it back to the chain |
| **tie trait** | links a block made from, or dropped on, another to it with a relationship of a given type, on the same layer. Made on its own, it links nothing |
| **name space** | one per package: a tag, a trait and a block definition never share a name |


## Layers and looking

| Term | Means |
|---|---|
| **layer** | what one block holds, drawn: the blocks drawn on it are those whose nearest **hiding** ancestor is that block |
| **hides** | a folder, a definition and any block holding blocks hide what they hold; a group and a grid draw theirs inline |
| **card** | a block as drawn. **A definition always draws as a card**; its structure is reached by descending |
| **canvas view** | what the canvas draws: the **overview** or the **structure** of the tree opened. There are no others |
| **overview** | what the canvas draws while nothing is open (`layer: null`): every package top-down in the explorer's order, each a full-width box of its domain, folders flattened, definitions at their own size, the page scrolled down. 1:1 with the packages and definitions sections |
| **flatten** | drawing folders as groups, so a whole domain reads on one page. The overview draws flattened |
| **projection** | a view of the slice the sections hold, from one layer. Read-through, flatten and layout are applied in it; nothing is stored |
| **layout** | how a layer places what it draws: a setting (`layout.kind`), `free`, `auto`, `outline` or `page`, said by a definition and overridable by a block |
| **frame** / **wall** / **band** | the open layer's border seen from within, one of its four sides, and the dimmed margin outside it |
| **mark** | how a card or row reads, derived every draw: reference, missing, note, holder, interface, container, part (from a definition) |
| **seat** / **anchor** | a place on a border a line may meet; a seat a relationship arrives at with no block behind it |


## Sections

| Term | Means |
|---|---|
| **section** | one listing in the explorer: what the section above holds, filtered by role |
| **mndflow** | packages → definitions → structure |
| **mndmap** | collection → document: mndflow's chain with the package fixed to the workspace and hidden |
| **browse** | choosing a row: selects it, the tray shows it, the canvas stays |
| **open** | Enter, double-click or →: a tree opens its structure on the canvas; a package, folder or group is focused in the overview. ← and Backspace leave, a tree's top for the overview |
| **context** | what the canvas has open. Highlighting and breadcrumbs show it, never what is browsed |
| **reveal** | a pick within the open tree may move the canvas to the layer it sits on; browsing outside it never does |
| **navigation** | `open_at`, `leave_at`, `reveal_at` and `held_at` in core: where the canvas goes, and what the sections hold for it. The one rule both apps use |
| **accent edge** | the explorer row of what the canvas shows: a structure's open layer in the structure section; on the overview, what is picked (else the held package) in the sections above |


## The grid

**A visual spreadsheet for blocks**, and the one place a position carries stated meaning.

| Term | Means |
|---|---|
| **cell** | an address in a grid, `cell: {r, c}` on the block seated there. Replaces `x`/`y` |
| **extent** | a grid's `rows` and `cols`. Unsaid, two by two |
| **merge** | a cell's extent, stated on the grid as a `Span`. Stays on one side of a header line |
| **header line** | the top row or the left column, made to head the rest (`head.top`, `head.left`). One unit across |
| **header** | what a header cell holds: any block, drawn compact. What it stands for is what its line is allocated to |
| **label** | a plain value in a cell, held on the grid in `values` |
| **allocation** | a body block is allocated to what its row and column headers stand for, and to every holder it sits in. Derived, never stored |


## The workspace and files

| Term | Means |
|---|---|
| **workspace** | the editable package and everything the user holds: its root, the log, the metadata. A new one is its root and `main`, nothing else |
| **graph** | `root`, `blocks`, `edges`. Every package in use, one graph, folded from one log |
| **file** | the graph in an envelope, `{ schema, id, graph, meta }`, as JSON. **State, never history** |
| **package file** | a package as JSON. **Every package is one**, `base` and `markdown` included; workspaces, settings and every element are definable as JSON |
| **session state** | the open layer, the selection, the folds, the theme, the toggles; a host may keep more of its own. Outside the log, never in a file. **mndflow reads and writes only package and workspace files** |


## History

| Term | Means |
|---|---|
| **step** | one user action and every mutation it made. **One gesture is one step** |
| **mutation** | a single change within a step. The set is closed |
| **fold** | rebuilding the graph by replaying every applied step. Undo flips a status and refolds |
| **checkpoint** | the whole graph as one mutation: when the log passes its cap, and on import |
| **the door** | the one way in. Checks integrity and components, repairs what it can, drops what it cannot. **It never migrates**: a schema change re-saves the samples |
| **derived** | worked out rather than stored: roles, layers, read-through, allocation, seats, routes |


## The surface

| Term | Means |
|---|---|
| **action** | something somebody meant and could say: create, relate, define. Returns mutations rather than applying them |
| **adjustment** | something positional: `place`, `size`, `seat`. Gesture-only. Several writes from one gesture land in one batch |
| **refusal** | an action's `check` answer: why a gesture is not offered |
| **host port** | one of the capabilities an app binds: `storage`, `files`, `net`, `score`. The entire host contract |

**The word `port` carries two meanings and they never meet.** In the model a port is an **interface**; in the host contract a port is a host port.


## The seam

| Term | Means |
|---|---|
| **Scene** | a layer projected: plain data, importing nothing drawable |
| **renderer** | anything turning a Scene into something to look at: React, text, SVG |
| **`kit`** | the one surface mndflow offers outside this repo: the headless stack as one package, plus a non-editing `Viewer` |
| **translator** | an external project reading or writing a graph through `kit`, with a package of its own. Never an internal |
| **map** | a translator's record of which block id stands for which source construct. Ids are minted once, never derived from source text |
| **`source`** | provenance: where a block's content lives outside the workspace, one uri. Nothing syncs to it |

**A standard is a translation layer, never a shape the model bends to.** A translator ships definitions, never a module.


## Closed and open

| Closed: never add one | Open: extend additively |
|---|---|
| the two element kinds | bases, when a kind is functionally distinct |
| value forms: `text`, `number`, `flag`, `choice`, `link` | components, capabilities, layouts |
| mutation ops | definitions, tags and traits, which are data |
| host ports | the action set |
