# Definitions

**The canonical vocabulary.** One entry per term, so a rule written anywhere else reads without guessing. Where any other document uses a word, this is what it means. The rules themselves are in design.md.


## The one shape

**Blocks carry meaning, and a package is a graph.** Everything with a place on a layer is stored in `graph.blocks`, every join in `graph.edges`; what an element *is* is its kind's category, never a record of its own.

| Term | Means |
|---|---|
| **block** | a visual stand-in for a part, a system, or the template of one: something with parts, data or deeper significance, never decorative. Drawn as a card; opening one gives its layer |
| **relationship** | a meaningful join between **exactly two** blocks, never a block and a relationship: a data flow, a dependency. Drawn as a line, placed by its ends. Held in `graph.edges`. Also **relation** |
| **component** | what a block carries, never drawn alone: attributes and values, types, tags, traits, settings, interfaces. Read and edited in the tray, and inside a card |
| **annotation** | what explains or organizes one layer: a **note**, **label**, **group** or **region**, joined to what it describes by a **tie**. No model meaning, but the tags its name gives its members. Never listed in the explorer |
| **organization** | what arranges blocks for browsing: a package, a **folder**, a **grid**. Listed in the explorer; no model meaning |
| **parent** | the block a block sits under. **The only containment**: definitions, packages, folders, grids, annotations and structure all hold by `parent` |
| **package** | a root block (`parent: null`). `base` ships with the kit, the workspace's is editable, and any other is **frozen** |
| **definition** | **a named tree in a package**: a block carrying `def`. Usable and extendable by `type` whether or not anything does. **Abstract**: never placed or linked as an instance |
| **usage** | a block without `def`. Its `type` names a definition, a base when it names nothing |
| **type** | on a usage, the definition it *is*; on a definition, the one it *extends*. One field, one chain |
| **attribute** | what a definition declares its usages answer: a name, a `type`, and what else it says (`key`, `default`, `unit`, `many`, `optional`, `note`, any other property as written). Held in `def.attributes`, inherited along the chain |
| **value** | a usage's or a relationship's answer to an attribute, by name (`values`). Typed by its attribute, never by itself. Never structural, no identity of its own |
| **entity** | a definition with attributes, as an ERD draws it. Nothing new: a word for a use |
| **reference** | a block that **stands for** another, a definition or a package (`of`). **A reference by its kind**: it stores `type: "reference"` (or a subtype) and carries *is reference*; `of` is read only where it is one. Drawn, never owning. A gone target reads **missing** and is kept |
| **link** | an attribute typed by a block definition: a foreign key. A reference is a block; a link is a value, drawn as a line only where a view allows it |


## Where a block sits

**A block's role is read from its position.** Nothing stores it.

| Term | Means |
|---|---|
| **tree** | a block whose ancestors up to its package are all folders or grids: a definition, or a usage placed in the domain |
| **domain** | a package root, the folders and grids under it, and the trees they organize |
| **structure** | everything under a tree's root: usages, folders, grids and annotations, to any depth |
| **composition** | which block a block is a part of: its nearest ancestor block, looking through folders, grids, groups and regions |
| **part** | a block in a definition's structure, seen through a usage of it |
| **own child** | a block stored under a usage itself, beside what it reads through |
| **route** | how a part is reached: `usage/part`. What tells two usages' views of one part apart |
| **frozen** | under any package root but the workspace's: read only |


## Reading through

| Term | Means |
|---|---|
| **chain** | a definition, what it extends, and so on to a base. One parent, so a list, never a graph |
| **own values only** | a block stores what it says; inherited values are resolved on read, never copied |
| **precedence** | per link of the chain, self first: its own settings, then the settings its traits grant, in order. **Nearest wins** |
| **read-through** | a usage shows its definition's structure, **one step**: its type's own structure, never a chain. Nothing is copied |
| **edits go home** | changing a part through a usage edits the definition that owns it |
| **structure is not inherited** | a subtype inherits settings, tags and traits, never structure. Structure is a definition's own. **Interfaces are inherited**, as attributes are: a subtype and every usage wear its chain's (`ports_of`) |


## Bases

**`base` enumerates the kinds the engine treats differently, and keeps the set minimal.** Everything a user or a package defines extends one. Two roots: `block` and `line`; every other kind extends one of them, `tie` extending `line` and the rest `block`. Filed by category: `blocks`, `relations`, `components`, `organization`, `annotations`.

| Base | Category | Is |
|---|---|---|
| **block** | block | the unit of structure: a thing, a part, a step, a system. Holds blocks, which it opens onto as a layer |
| **reference** | block | a stand-in for a block, a definition or a package elsewhere |
| **interface** | component | a block's boundary, a block under it seated on its wall: where relations and flows enter and leave. *Is interface*. Its definition — one extending `interface` — says what it carries; any block that *has ports* may hold one. Never a card, a layer or a row |
| **line** | relation | the plain relationship. Which way it points is a setting, `line.dir` (`none`, `forward`, `back`, `both`), said by its definition and overridable on the line |
| **folder** | organization | a box on its parent's layer, what it holds drawn inside. Holds anything; never a layer. Selected in the explorer, the canvas zooms to it |
| **grid** | organization | seats blocks and labels **in cells**. A card outside; opened, its **allocation view**: sequence diagrams and swimlanes. Lists as a row |
| **note** | annotation | a remark: a markdown body drawn as a document, resizable, tied to the block it is made from |
| **label** | annotation | one line of text, the `text` face: no border, ground, icon or marks. Free or tied, always floating aside. Tags what it is tied to |
| **group** | annotation | a box drawn round its members, on the layer it sits on. Groups nest. Tags its members; no explorer row |
| **region** | annotation | a band across the layer, between separators, under a heading. Tags its members; regions stack and reorder. May show another block's diagram, dropped in |
| **tie** | relation | a relation with no model meaning: a dashed run with no heads, drawn straight, from a note or label to what it describes. It lists *is tie*, which grants `line.module: tie` |

**Block modules are engine code, kinds are data.** Three modules: `block`, `reference` (*is reference*) and `interface` (*is interface*), which the engine draws on its owner's wall. Every other kind is the `block` module configured.


## Components and capabilities

| Term | Means |
|---|---|
| **setting** | what an element says about how it draws or what it may do, by component (`settings`) |
| **vary** | a style setting: how far, in degrees, each definition under one that sets it strays from **its parent's shade**, keyed by its id, halving at each step down. Kin read alike, each still itself |
| **form** | how a value is edited: `text`, `number`, `flag`, `link`, `choice`. The engine's, closed |
| **type** | a component: a named, reusable data shape stored as data in its package — an **enum** (a `choice` and its options) or an **alias** (one form, named: `uuid`). Never drawn on a layer. An enum with methods or fields is a class: a block definition. An attribute's `type` names a form, a type, or a block definition |
| **interface** | a component: a block's boundary — a block under it, of a kind extending `interface` — drawn on its wall, where relationships and flows enter and leave. A name, a flow, and its interface definition, which says what it carries. Any block that *has ports* may hold its own; a usage also wears its definition's, read through. No layer of its own; never an explorer row. Also **port** |
| **capability** | what a block may do, granted by a trait: hold (*has parts*), hold values of its own (*has values*), hold records (*has records*), have ports (*has ports*), draw what it holds in place (*is group*), seat it in cells (*is grid*), be headed (*has head*), be tied to what it is made from (*has tie*). **Absent is a no**: what nothing grants is refused at the gesture |
| **constraint** | a capability limited to definitions (`allows` lists, `degree`, `ends`), or what values must say (`expects`). Settings, not traits; to be reworked |
| **tag** | a component: a word with a meaning (`description`), stored as data in its package, **for finding things**: search, filters, lookup. Carried in `tags` by a usage, a line or a definition, or given by an annotation's name to its members. The tray groups an element's tags by source |
| **collection** | a block with *has records*: many records of one type (`records.of`), drawn as a table on its card. Records are values, never blocks |
| **behaviour** | a block's method: a block under it whose kind carries *is behaviour* — a flow or state machine (`behaviour`), a swimlane or a sequence. Its layer does it; its interfaces are its signature, in-interfaces its parameters, out-interfaces its return. A class card lists it after its fields |
| **end** | what one end of a relation means: multiplicity, role, ownership (`none`, `shared`, `composite`), navigable. Said by a relation definition (`def.ends`); a line narrows multiplicity and role (`ends`). Data, never drawing |
| **key** | an attribute's `key`: `primary` or `unique`. A foreign key is an attribute typed by a block definition |
| **trait** | **an engine function**, named *has X* (a capability) or *is X* (what sort of thing it is, which engine module runs it). One function a trait, its description saying which. **A fixed engine table, not a definition** (core `types.ts` `TRAITS`): carried by name in `traits`, **a definition's alone**, offered as chips and never drawn. It confers the settings the table grants it |
| **style** | how a card draws: a definition's own `style` and `card` settings, overridable on a usage. Not a tag |
| **is reference** · **is tie** | the traits naming a kind's engine behaviour: a stand-in, reading `of`; a tie, drawn straight. Each grants a setting — `block.module`, `line.module: tie` — that the engine reads. `reference` and `tie` list them |
| **arrangement** | how a block sits in its parent's `auto` layer: `card.arrange`, a setting each kind states and a block may override — `column` (block), `rows` (folder), `aside` (note: beside what it is tied to). A view is how an opened block draws its inside; an arrangement is how it sits in its parent |
| **stated list** | `traits` or `tags` said by an element or definition: **every entry it keeps**, replacing its chain's list whole. Unsaid, it carries the nearest list stated down its chain; an empty list says none |
| **tie trait** | ties a block made from, or dropped on, another to it, on the same layer. Made on its own, it ties nothing |
| **name space** | one per package: a type, a tag and a definition never share a name |
| **membership** | an annotation's hold on a block: a group's or region's by enclosure, a label's by a tie. Removing a tag an annotation gives removes the membership, never the annotation |


## Layers and looking

| Term | Means |
|---|---|
| **layer** | **the inside of a block**: its parts, the relations among them, and its annotations. Layers follow composition, never organization: the blocks drawn on it are those whose nearest ancestor block is that block |
| **hides** | a definition and any block holding blocks hide what they hold, unless a view flattens them; a grid hides its own in cells; a folder, group and region draw theirs inside, on the layer they sit on |
| **card** | a block as drawn. **A definition always draws as a card** — on the canvas an outline, a usage filled; its structure is reached by opening it |
| **face** | how much of a card is drawn: **small** — the workspace card size, its handle, name, icon and marks — or **large** — sized to fit its content, or its definition's `card.size`. Small or large is chosen by the view and `layout.cards`, never by zoom; **which** large face by the definition's `card.face`: **table** (its attributes as a ruled table under its name, its body under that), **document** (its body as markdown), **picture** (what its source points at). Naming none, the name is the whole card |
| **table card** | a large face showing attributes: the name its title row, the card's border the table's, each column the width views measured it at. An entity's schema, keys marked PK, UK, FK |
| **class card** | the `class` face: the name, its fields `name: type`, then under a rule its behaviours' signatures |
| **wire swatch** | how a relation definition draws wherever it is not a run: its name over a short line in its own stroke, a head where its lines point |
| **card source** | a card as markdown: frontmatter for its identity and values, then its body. Rendered from the graph, read back as ordinary changes; **attach** copies a file's onto a block. Its frontmatter is a diagram file: the same schema, `def` included, so a card source may state a definition |
| **source folder** | a package on disk: `package.json` (its graph), a `.json` file per definition, `.yaml` diagram files, and a tree of `.md` card sources, each a usage. Collected one way into a package file |
| **definition file** | one definition as a JSON file, filed under the folder its directory names. `base` is authored as them |
| **diagram file** | one block and its single layer as YAML: the Block and Relation schema with names in place of ids, in a long form and short forms. `packages` lists what it uses, `base` always. A definition where it states `def`, else structure. The file is the truth for what it makes; collected one way |
| **canvas view** | how the canvas draws: a **system view** — **package** or **profile** — of the whole system, both trees, chosen on the rail, or a **layer view** — **internal**, **allocation**, **sequence**, **class** or **er** — of one block, never chosen. Session state, never stored |
| **layer view** | a view of one block, which its card's kind decides (`lens_of`): each kind's definition names one in `layout.view` — a package, the package system view scoped to it; a block, internal; a grid, allocation; a sequence diagram, sequence; a class diagram, class; an entity relationship diagram, er. **A definition opens as its usages do**. A stand-in opens as what it stands for, unless it names its own view |
| **class** | the definitions a layer's references stand for, one class card each. A line with a hollow head joins a member to the nearest member it extends, unnamed as UML draws it — the one derived line. Every other line is stored: between two members, or between the definitions they stand for, drawn with what its ends mean. Nothing is written back |
| **er** | the same members as schema cards — columns, keys — joined by the stored relations, their multiplicities drawn as crow's feet. Nothing extended is drawn |
| **sequence** | the same grid read as time. Each participant is a lifeline: its header and a dashed stem. Body rows run top to bottom. A step is its small card centred on its lifeline. A relation is a message at the target's row, from the source's lifeline to the edge of the target's card facing it, dashed and headed as the relation says; one to its own lifeline loops out of the card's right side within its column. A lifeline, a message number and a table edge are drawn, never stored |
| **internal** | the opened block from inside: what it holds, as cards — blocks, flows and states |
| **allocation** | an opened grid's lattice, its cells, what sits in them and the relations between them as stored. A **swimlane** is a grid read this way: the header row names the participants, a header card at each lane's top; the header column names the phases; a step sits in the lane and phase its cell names |
| **package view** | the system view from above, scoped to the section: with nothing open (`layer: null`) every package top-down in the explorer's order, each a full-width box of its domain, folders as boxes, every card small, a grid one card, no notes, the page scrolled down; a package opened, what it holds, the same way. A definition holding structure is a box of its top-level blocks as cards, nothing deeper |
| **flatten** | drawing each block that holds as a box of its contents, so the whole system reads on one page. The package and profile views draw flattened, every box a solid rim; a group is a box somebody made, dashed |
| **profile** | the system from the side: one row per level along the pick, each a box as wide as the widest — every package, then what each block on the way holds, last what the pick holds. A line points from each block on the way down to the row it holds |
| **projection** | a view of the slice the sections hold, from one layer. Read-through, flatten and layout are applied in it; nothing is stored |
| **layout** | how a layer places what it draws, and which diagram it opens on: a setting (`layout.kind`, `layout.cards`, `layout.view`, `layout.across`), said by a definition and overridable by a block. `kind` is `free`, `auto`, `page` or `layered` (laid out by its relations: flows, states). Unsaid, `auto`: each block arranged by its `card.arrange`, in explorer order, runs stacked top to bottom; rows `across` to a row. `across` unsaid is the host's default for its page shape. `view` is `package` or one of the five layer views; a name this build does not know opens on the view its kind's `base` definition names |
| **frame** / **wall** / **band** | the open layer's border seen from within, one of its four sides, and the dimmed margin outside it |
| **mark** | how a card or row reads, derived every draw: reference, missing, note, folder, interface, container, part (from a definition) |
| **system mark** | what a card stands for, bottom right, at most three stacked: a stand-in's word (`Def`, `Ref`, `Pkg`), **structure** on a structure root — the workspace, always, and a definition that holds structure; never a folder, another package, or a block inside a structure — **data** where it carries attributes or values |
| **seat** / **anchor** | a place on a border a line may meet; a seat a relationship arrives at with no block behind it |


## Sections

| Term | Means |
|---|---|
| **section** | one listing in the explorer: what the section above holds, filtered by role — or, standing apart, a listing of its own |
| **mndflow** | the **library**, then the **model**, both folded until opened. The library — what you build with — lists every package, `base` first: its definitions in their folders, each definition's parts under it, then *types* and *tags* groups. The model — what you are building — lists usages only, under the packages and folders on the way to them. A new workspace holds one plain block, so the workspace lists |
| **mndmap** | source folder → document: mndflow's chain with the package fixed to the workspace and hidden |
| **browse** | choosing a row: selects it and the tray shows it. Inside the structure the canvas draws it reveals the block; anywhere else the canvas stays |
| **open** | Enter, double-click or →: goes in, whatever view the section was shown in. A block opens on its own view: a package on the package view scoped to it, drawing what the section it was opened from lists, a definition as its usages do, a grid on its allocation view; a folder is never opened, selecting it zooms to its box; an annotation has no row; picked on the canvas, it is revealed where it is and the explorer lights the nearest row listing what it sits on. ← and Backspace leave, a tree's top for the package view |
| **context** | what the canvas has open. Highlighting and breadcrumbs show it, never what is browsed |
| **reveal** | a row picked within the structure the canvas draws moves the canvas to the layer it sits on and picks it; browsing outside it never does |
| **branch** | the row of the block the canvas draws from inside and the rows under it, lit subtly in the explorer |
| **crumbs** | the layers from the tree the open layer is in down to it — never the package and folders above the tree — then the view drawn |
| **navigation** | `open_at`, `leave_at`, `reveal_at` and `held_at` in core: where the canvas goes, and what the sections hold for it. The one rule both apps use |
| **accent edge** | the explorer row of what the canvas shows: the open layer in its section; on the package view, what is picked (else the held package) in the sections above |


## The grid

**Pure allocation: a lattice of blocks and labels**, and the one place a position carries stated meaning. No records

| Term | Means |
|---|---|
| **cell** | an address in a grid, `cell: {r, c}` on the block seated there. Replaces `x`/`y`. Holds one block, drawn as a card |
| **extent** | a grid's `rows` and `cols`. Unsaid, two by two |
| **merge** | a cell's extent, stated on the grid as a `Span`. Stays on one side of a header line |
| **header line** | the top row and the left column. Every grid has both, heading the rest; opened, each header is its line's tab. One unit across |
| **header** | the block a header cell holds, drawn compact: a role from position. What it stands for is what its line is allocated to. Typing into an empty one makes a label of that name |
| **allocation** | a body block is allocated to what its row and column headers stand for, and to every folder, grid, group and region it sits in. Derived, never stored |


## The workspace and files

| Term | Means |
|---|---|
| **workspace** | the editable package and everything the user holds: its root, the log, the metadata. A new one is its root, nothing else |
| **definition side** | a package root, a definition, or a folder reached from its package root through folders alone. Every other block is structure. A definition-side folder may hold both |
| **graph** | `root`, `blocks`, `edges`. Every package in use, one graph, folded from one log |
| **file** | the graph in an envelope, `{ schema, id, graph, meta }`, as JSON. **State, never history** |
| **package file** | a package as JSON. **Every package is one**, `base` and `markdown` included; workspaces, settings and every element are definable as JSON. A source folder adds markdown card sources and YAML diagram files beside it |
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
| the five categories, and the two stored kinds (`blocks`, `edges`) | bases, when the engine treats a kind differently |
| forms: `text`, `number`, `flag`, `choice`, `link` | types, which are components; layouts |
| mutation ops; traits, the engine's own (core `types.ts` `TRAITS`) | definitions, types and tags, which are data |
| host ports | the action set |
