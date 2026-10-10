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
| **attribute** | what a definition declares its usages answer: a name, a `type`, and what else it says (`key`, `default`, `unit`, `many`, `optional`, `note`, any other property as written). Held in `def.attributes`, inherited along the chain |
| **value** | a usage's or a relationship's answer to an attribute, by name (`values`). Typed by its attribute, never by itself. Never structural, no identity of its own |
| **entity** | a definition with attributes, as an ERD draws it. Nothing new: a word for a use |
| **reference** | a block that **stands for** another, a definition or a package (`of`). Drawn, never owning. A gone target reads **missing** and is kept |
| **link** | an attribute typed by a block definition: a foreign key. A reference is a block; a link is a value, drawn as a line only where a view allows it |


## Where a block sits

**A block's role is read from its position.** Nothing stores it.

| Term | Means |
|---|---|
| **holder** | a block holding by `parent` and organizing what it holds: **folder**, **group**, **grid**. A folder is one by its base; a group or grid by its `inline` and `matrix` traits. Not a definition; it organizes a domain or a structure alike |
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
| **group** | a holder that draws what it holds **inline**, inside its rim. Groups nest. Layer-local: the explorer gives it no row |
| **grid** | a holder that seats text and blocks **in cells**. A card outside; opened, its **grid view**. Lists as a row, like a folder |
| **reference** | a stand-in for a block, a definition or a package elsewhere |
| **interface** | a block seated on a wall: where relationships enter and leave. Also **port** |
| **note** | a remark: resizable, carries body text, ties to the block it is made from |
| **tag** | a word carried by other elements. Holds nothing. **trait** and **label** are tags too, by their chain |
| **value** | a value type: what an attribute holds. `text`, `number`, `flag`, `link` and `choice` ship under it; never placed |
| **line** | the plain relationship. Which way it points is a setting, `line.dir` (`none`, `forward`, `back`, `both`), said by its definition and overridable on the line |
| **tie** | a dashed relationship with no heads. **A type like any other**, chosen, never forced |

**Block modules are engine code, kinds are data.** Three modules, each read from a stored field: `block`, `reference` (`of` is set), `interface` (`side` is set). Every other kind is the `block` module configured.


## Tags, traits and capabilities

| Term | Means |
|---|---|
| **setting** | what an element says about how it draws or what it may do, by component (`settings`) |
| **vary** | a style setting: how far, in degrees, each definition under one that sets it strays from its inherited hue, keyed by its id. Kin read alike, each still itself |
| **type** (of a value) | a definition under the `value` base. Its `value.form` says how a value is edited (closed, like a module); a choice lists its options in `value.choices` |
| **capability** | what a block may do, granted by a trait: hold (`container`), seat interfaces (`ports`), draw what it holds in place (`inline`), seat it in cells (`matrix`), be headed (`headed`). **Absent is a no**: what nothing grants is refused at the gesture |
| **constraint** | a capability limited to definitions (`allows` lists, `degree`, `ends`), or what values must say (`expects`). Settings, not traits; to be reworked |
| **tag** | a definition on the `tag` base. A word with a meaning (`body`), no structure |
| **trait** | **a tag giving settings**, by its chain (`extends trait`): a capability, a style preset, or both, named positively. Listed apart from tags. It confers its own settings and those of the traits it extends, never its kind's |
| **label** | a tag naming lines, by its chain (`extends label`) |
| **carried** | what an element carries: tags, traits and labels, one list (`tags`), on a usage, a line or a definition alike. **Added up down the chain**: each link adds its own; `-id` drops one a farther link carries. A usage carries everything its definition does, and may add or drop its own |
| **tie trait** | links a block made from, or dropped on, another to it with a relationship of a given type, on the same layer. Made on its own, it links nothing |
| **name space** | one per package: a tag, a trait and a block definition never share a name |


## Layers and looking

| Term | Means |
|---|---|
| **layer** | what one block holds, drawn: the blocks drawn on it are those whose nearest **hiding** ancestor is that block |
| **hides** | a folder, a definition and any block holding blocks hide what they hold, unless a view flattens them; a grid hides its in cells; a group draws its inline |
| **card** | a block as drawn. **A definition always draws as a card**; its structure is reached by descending |
| **face** | how much of a card is drawn: **small** — the workspace card size, its handle, name, icon and marks — or **large** — sized to fit its content, or its definition's `card.size`, its name and the parts `card.shows` lists: its attributes as a ruled table under its name, its body and preview as markdown. Chosen by the view and `layout.face`, never by zoom |
| **table card** | a large face showing attributes: the name its title row, the card's border the table's, each column the width views measured it at |
| **card source** | a card as markdown: frontmatter for its identity and values, then its body. Rendered from the graph, read back as ordinary changes; **attach** copies a file's onto a block |
| **collection** | a package on disk: `package.json` of definitions and a tree of `.md` card sources, each a usage |
| **canvas view** | how the canvas draws: a **system view** — **overhead** or **profile** — of the whole system, both trees, chosen on the rail, or a **layer view** — **internal**, **grid**, **folder** or **definition** — of one block, never chosen. Session state, never stored |
| **layer view** | a view of one block, which its card's kind decides (`lens_of`): a definition, definition; a grid, grid; a package or folder, folder; a block with structure or room to hold, internal; a stand-in, its target's |
| **internal** | the opened block from inside: what it holds, as cards |
| **grid** | an opened grid's lattice, its cells and what sits in them |
| **folder** | what a package or folder holds, the page fitted to its content's width and scrolled down |
| **definition** | a definition large in the middle: above, what it extends; left and right, its in and out ports; below, its both-way ports, then its tags and traits, each a box joined to it by a plain line; a note at the top right with its body. Edits there edit the definition |
| **overhead view** | what the canvas draws while nothing is open (`layer: null`): every package top-down in the explorer's order, each a full-width box of its domain, folders flattened, definitions at their own size, the page scrolled down. A definition holding structure is a box of its top-level blocks as cards, nothing deeper |
| **flatten** | drawing each block that holds as a box of its contents, so the whole system reads on one page. The overhead and profile views draw flattened, every box a solid rim; a group is a box somebody made, dashed |
| **profile** | the system from the side: one row per level along the pick, each a box as wide as the widest — every package, then what each block on the way holds, last what the pick holds. A line points from each block on the way down to the row it holds |
| **projection** | a view of the slice the sections hold, from one layer. Read-through, flatten and layout are applied in it; nothing is stored |
| **layout** | how a layer places what it draws: a setting (`layout.kind`), `free`, `auto` or `page`, said by a definition and overridable by a block. Unsaid, `auto`: clusters in reading order, shelved as wide as the page layout |
| **frame** / **wall** / **band** | the open layer's border seen from within, one of its four sides, and the dimmed margin outside it |
| **mark** | how a card or row reads, derived every draw: reference, missing, note, holder, interface, container, part (from a definition) |
| **system mark** | what a card stands for, bottom right, at most three stacked: a stand-in's word (`Def`, `Ref`, `Pkg`), **structure** on a definition holding structure — never a block inside one, a package or a folder — **data** where it carries attributes or values |
| **seat** / **anchor** | a place on a border a line may meet; a seat a relationship arrives at with no block behind it |


## Sections

| Term | Means |
|---|---|
| **section** | one listing in the explorer: what the section above holds, filtered by role — or, standing apart, a listing of its own |
| **mndflow** | definitions and structure, standing apart: definitions lists every package a top row, `base` first, folded until opened; structure always lists every definition holding structure, in every package, and the definition chosen above opens there |
| **mndmap** | collection → document: mndflow's chain with the package fixed to the workspace and hidden |
| **browse** | choosing a row: selects it and the tray shows it. Inside the structure the canvas draws it reveals the block; anywhere else the canvas stays |
| **open** | Enter, double-click or →: goes in, whatever view the section was shown in. A block opens on its own layer view: a package or folder on its folder view, a definition on its definition view, a grid on its grid view; a group has no row; picked on the canvas, it is revealed where it is and the explorer lights the nearest row listing it. ← and Backspace leave, a tree's top for the overhead view |
| **context** | what the canvas has open. Highlighting and breadcrumbs show it, never what is browsed |
| **reveal** | a row picked within the structure the canvas draws moves the canvas to the layer it sits on and picks it; browsing outside it never does |
| **branch** | the row of the block the canvas draws from inside and the rows under it, lit subtly in the explorer |
| **crumbs** | the layers from the tree the open layer is in down to it — never the package and folders above the tree — then the view drawn |
| **navigation** | `open_at`, `leave_at`, `reveal_at` and `held_at` in core: where the canvas goes, and what the sections hold for it. The one rule both apps use |
| **accent edge** | the explorer row of what the canvas shows: a structure's open layer in the structure section; on the overhead view, what is picked (else the held package) in the sections above |


## The grid

**Pure allocation: a lattice of blocks**, and the one place a position carries stated meaning. No text labels and no records

| Term | Means |
|---|---|
| **cell** | an address in a grid, `cell: {r, c}` on the block seated there. Replaces `x`/`y`. Holds one block, drawn as a card |
| **extent** | a grid's `rows` and `cols`. Unsaid, two by two |
| **merge** | a cell's extent, stated on the grid as a `Span`. Stays on one side of a header line |
| **header line** | the top row and the left column. Every grid has both, heading the rest; opened, each header is its line's tab. One unit across |
| **header** | the block a header cell holds, drawn compact: a role from position. What it stands for is what its line is allocated to. Typing into an empty one makes a plain block of that name |
| **allocation** | a body block is allocated to what its row and column headers stand for, and to every holder it sits in. Derived, never stored |


## The workspace and files

| Term | Means |
|---|---|
| **workspace** | the editable package and everything the user holds: its root, the log, the metadata. A new one is its root and `main`, nothing else |
| **graph** | `root`, `blocks`, `edges`. Every package in use, one graph, folded from one log |
| **file** | the graph in an envelope, `{ schema, id, graph, meta }`, as JSON. **State, never history** |
| **package file** | a package as JSON. **Every package is one**, `base` and `markdown` included; workspaces, settings and every element are definable as JSON. A collection adds markdown card sources beside it |
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
| **host port** | one of the capabilities an app binds: `storage`, `files`, `net`. The entire host contract |

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
| value forms (`value.form`): `text`, `number`, `flag`, `choice`, `link` | value types, which are definitions; components, capabilities, layouts |
| mutation ops | definitions, tags and traits, which are data |
| host ports | the action set |
