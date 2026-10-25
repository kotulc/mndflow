# Definitions

**The canonical vocabulary.** One entry per term, so a rule written anywhere else reads without guessing. Where any other document uses a word, this is what it means. The rules themselves are in design.md.


## The one shape

**Blocks carry meaning, and a package is a graph.** Everything with a place on a layer is stored in `graph.blocks`, every join in `graph.edges`; what an element *is* is its kind's category, never a record of its own.

| Term | Means |
|---|---|
| **block** | a visual stand-in for a part, a system, or the template of one: something with parts, data or deeper significance, never decorative. Drawn as a card; opening one gives its layer |
| **relationship** | a meaningful join between **exactly two** blocks, never a block and a relationship: a data flow, a dependency. Drawn as a line, placed by its ends. Held in `graph.edges`. Also **relation** |
| **component** | what a block carries, never drawn alone: attributes and values, types, tags, constraints, interfaces. Read and edited in the tray's components tab, and inside a card |
| **notation** | what a diagram draws with beside its parts: the **annotations** every kind has, and the **marks** a flow or state machine adds. Never listed in the explorer, though its definitions are |
| **annotation** | notation that explains or organizes one layer: a **note**, **label**, **group** or **region**, joined to what it describes by a **tie**. No model meaning, but the tags its name gives its members |
| **mark** | notation a flow or state machine draws with: a **start**, **end** or **decision**, joined by lines. Means something in the model |
| **parent** | the block a block sits under. **The only containment**: definitions, packages, folders, grids, notation and structure all hold by `parent` |
| **package** | a root block (`parent: null`). `base` ships with the kit, the workspace's is editable, and any other is **frozen** |
| **definition** | **a named tree in a package**: a block carrying `def`. Usable and extendable by `type` whether or not anything does. **Abstract**: never placed or linked as an instance |
| **usage** | a block without `def`. Its `type` names a definition, a base when it names nothing |
| **type** | on a usage, the definition it *is*; on a definition, the one it *extends*. One field, one chain |
| **attribute** | what a definition declares its usages answer: a name, a `type`, and what else it says (`key`, `default`, `unit`, `many`, `optional`, `note`, any other property as written). Held in `def.attributes`, inherited along the chain |
| **value** | a usage's or a relationship's answer to an attribute, by name (`values`). Typed by its attribute, never by itself. Never structural, no identity of its own |
| **entity** | a definition with attributes, as an ERD draws it. Nothing new: a word for a use |
| **reference** | a block that **stands for** another, a definition or a package (`of`). **A reference by its kind**: it stores `type: "reference"` (or a subtype) and carries *is reference*; `of` is read only where it is one. Drawn, never owning. A gone target reads **missing** and is kept. **With its target, one object**: every appearance lights, picks and edits together (*appearance*) |
| **link** | an attribute typed by a block definition: a foreign key. A reference is a block; a link is a value, drawn as a line only where a view allows it |


## Where a block sits

**A block's role is read from its position.** Nothing stores it.

| Term | Means |
|---|---|
| **tree** | a block whose ancestors up to its package are all folders or grids: a definition, or a usage placed in the domain |
| **domain** | a package root, the folders and grids under it, and the trees they organize |
| **structure** | everything under a tree's root: usages, folders, grids and notation, to any depth |
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

**`base` enumerates the kinds the engine treats differently, and keeps the set minimal.** Everything a user or a package defines extends one. Two roots: `block` and `line`; every other kind extends one of them, `tie` extending `line` and the rest `block`. Filed in folders: `blocks`, `diagrams`, `notation`, `components`, `relations`.

| Base | Category | Is |
|---|---|---|
| **block** | block | the unit of structure: a thing, a part, a step, a system. Plain, a leaf free to become any diagram kind; holding blocks, it reads as `internal` and opens onto them as a layer |
| **reference** | block | a stand-in for a block, a definition or a package elsewhere |
| **internal**, **flow**, **state**, **sequence**, **swimlane**, **class**, **entity**, **treemap** | block | the **diagram kinds**: each extends `block` and fixes its view, layout and icon. A block of one holding parts is retyped only within its family — internal, flow, state and treemap; class and entity; sequence and swimlane each alone; `sequence` and `swimlane` are grids by *is grid*; `flow`, `state`, `sequence` and `swimlane` are behaviours. **Each its own hue**, worn by its chips on the map |
| **decision**, **start**, **end** | notation | marks: a flow's question, its lines named by their answers, drawn as a diamond; where a flow or a state machine begins and finishes, drawn as a dot and a ringed dot. Each extends `block`; what it is, is the nearest of them in its chain |
| **interface** | component | the base a port's interface definition extends: a block's boundary, seated on its wall, where relations and flows enter and leave. *Is interface*: the engine draws a port by it. Never a card, a layer or a row |
| **attribute**, **tag**, **constraint** | component | the bases their library entries extend: a type, a tag, a constraint. The components share **one warm band of hues**, interface included, each its own within it; never made a block |
| **line** | relation | the plain relationship. Which way it points is a setting, `line.dir` (`none`, `forward`, `back`, `both`), said by its definition and overridable on the line |
| **association**, **composition**, **aggregation**, **dependency**, **message**, **reply**, **transition** | relation | notation, each extending `line`: the class and entity relations, saying their ends; a sequence's messages and their replies; a state machine's moves |
| **folder** | block | a box on its parent's layer, what it holds drawn inside. Holds anything; never a layer. Selected in the explorer, the canvas zooms to it |
| **grid** | block | seats blocks and labels **in cells**. A card outside; opened, its **allocation view**. Lists as a row. The `sequence` and `swimlane` kinds are grids too, by *is grid* |
| **note** | notation | a remark: a markdown body drawn as a document, resizable, tied to the block it is made from |
| **label** | notation | one line of text, the `text` face: no border, ground, icon or marks; one unit tall, as wide as its words. Free or tied, always floating aside. Tags what it is tied to |
| **group** | notation | a named panel on the layer it sits on, round the blocks that carry its name as a tag; it holds nothing. A block in several groups carries each one's tag, so groups nest: a group whose members all carry another's tag sits inside it. No explorer row |
| **region** | notation | a band across the layer, between separators, under a heading. Tags its members; regions stack and reorder. May show another block's diagram, dropped in |
| **tie** | relation | a relation with no model meaning: a dotted run with no heads, drawn straight, from a note or label to what it describes. It lists *is tie*, which grants `line.module: tie` |

**Block modules are engine code, kinds are data.** Three modules: `block`, `reference` (*is reference*) and `interface` (*is interface*), which the engine draws on its owner's wall. Every other kind is the `block` module configured.


## Components and capabilities

| Term | Means |
|---|---|
| **setting** | what an element says about how it draws or what it may do, by component (`settings`) |
| **vary** | a style setting: how far, in degrees, each definition under one that sets it strays from **its parent's shade**, keyed by its id, halving at each step down. Kin read alike, each still itself |
| **form** | how a value is edited: `text`, `number`, `flag`, `link`, `choice`. The engine's, closed |
| **component** | what a block carries as data: defined once in a package's library, used by blocks, no layer, never an explorer row of its own. Interfaces, attributes (defined by types), tags, constraints. Each entry extends another of its kind, else its kind's base, and is styled as a definition is. Not a behaviour (a block), a trait (the engine's), a record (a value) |
| **type** | the definition of an attribute: a named, reusable data shape stored as data in its package — an **enum** (a `choice` and its options) or an **alias** (one form, named: `uuid`) — with its format, unit and look. Never drawn on a layer. An enum with methods or fields is a class: a block definition. An attribute's `type` names a form, a type, or a block definition |
| **interface** | a component: a block's boundary, a **port** — data on the block, keyed by id — drawn on its wall, where relationships and flows enter and leave. A name, a flow, and its interface definition in the library, which says what it carries. Any block that *has ports* may hold its own; a usage also wears its definition's, read through. No layer of its own; never an explorer row |
| **registry** | one package's components of one kind — its entries and their uses — gathered in one place: worked out from the library, never stored, listed under its package as a block is. Opened, a treemap; in the tray, a matrix and a list |
| **entry** | one component definition in a registry: a tag, a type, an interface definition, a constraint |
| **use** | one block or line carrying an entry: a tag it carries, an attribute typed by it, a port of it, a constraint it is held to |
| **home folder** | the folder holding most of an entry's uses, where its tile sits in its registry's treemap; *[multiple]* where none holds half |
| **capability** | what a block may do, granted by a trait: hold (*has parts*), hold values of its own (*has values*), hold records (*has records*), have ports (*has ports*), draw what it holds in place (*is group*), seat it in cells (*is grid*), be headed (*has head*), be tied to what it is made from (*has tie*). **Absent is a no**: what nothing grants is refused at the gesture |
| **constraint** | a component: a rule in a library — the values a block must answer (`required`), and on a line those its ends must agree on (`match`) — applied by id (`constraints`), inherited down the chain as tags are. Advice in `review`, never a refusal. A capability limited to definitions (`allows` lists, `degree`, `ends`) stays settings |
| **tag** | a component: a word with a meaning (`description`), stored as data in its package, **for finding things**: search, filters, lookup. Carried in `tags` by a usage, a line or a definition, or given by an annotation's name to its members. The tray groups an element's tags by source |
| **collection** | a block with *has records*: many records of one type (`records.of`), drawn as a table on its card. Records are values, never blocks |
| **behaviour** | a block's method: a block of a behavioural kind — `flow`, `state`, `sequence` or `swimlane` — which carries *is behaviour*. Its layer does it; its interfaces are its signature, in-interfaces its parameters, out-interfaces its return. A class card lists it after its fields |
| **end** | what one end of a relation means: multiplicity, role, ownership (`none`, `shared`, `composite`), navigable. Said by a relation definition (`def.ends`); a line narrows multiplicity and role (`ends`). Data, never drawing |
| **key** | an attribute's `key`: `primary` or `unique`. A foreign key is an attribute typed by a block definition |
| **trait** | **an engine function**, named *has X* (a capability) or *is X* (what sort of thing it is, which engine module runs it). One function a trait, its description saying which. **A fixed engine table, not a definition** (core `types.ts` `TRAITS`): carried by name in `traits`, **a definition's alone**, offered as chips and never drawn. It confers the settings the table grants it |
| **style** | how a card draws: a definition's own `style` and `card` settings, overridable on a usage. Not a tag |
| **is reference** · **is tie** | the traits naming a kind's engine behaviour: a stand-in, reading `of`; a tie, drawn straight. Each grants a setting — `block.module`, `line.module: tie` — that the engine reads. `reference` and `tie` list them |
| **placement** | where a block sits in its parent's layout: always worked out, never stated or dragged. **Layered** where lines join a container's blocks, **packed** where none do, both toward the canvas's shape and in reading order. A view is how an opened block draws its inside; placement is where it sits in its parent |
| **reading order** | the order of a layer's blocks: their `order`, as the file lists them. Placement keeps it |
| **stated list** | `traits` or `tags` said by an element or definition: **every entry it keeps**, replacing its chain's list whole. Unsaid, it carries the nearest list stated down its chain; an empty list says none |
| **tie trait** | ties a block made from, or dropped on, another to it, on the same layer. Made on its own, it ties nothing |
| **name space** | one per package: a type, a tag and a definition never share a name |
| **membership** | an annotation's hold on a block: a group's or region's by enclosure, a label's by a tie. Removing a tag an annotation gives removes the membership, never the annotation |


## Layers and looking

| Term | Means |
|---|---|
| **layer** | **the inside of a block**: its parts, the relations among them, and its notation. Layers follow composition, never organization: the blocks drawn on it are those whose nearest ancestor block is that block |
| **room** | a block that holds blocks — a package, a folder, a grid, a diagram, a part. Closed, a card listing what it holds; **entered**, its own view, alone. The explorer lists rooms |
| **focus** | the room the canvas is on; the crumbs' end |
| **map** | the model's or the library's treemap, following the explorer's tree: **boxes** for what holds things — packages, folders, groups, regions, a diagram holding diagrams — and **chips** for what is entered. The model's stops at diagrams; the library's at definitions. Read only |
| **chip** | an area of the map that is entered: a diagram, a block or a definition, as large as what it holds — its blocks, lines and interfaces, or a definition's uses — faced as a card: one line of name, kind and counts, its kind's icon in the top-right corner, edged in its colour, over a small treemap of what it holds, its blocks small cards |
| **enter** | a double-click on a chip or a box, Enter, the explorer's open or *read* in the tray: the camera flies into the chip until it fills the view, and its own view fades in there, alone, fitted and centred, never above 100%. Escape returns to the map |
| **band** | how a region draws: a segment of its layer, in order — columns where the flow runs across, rows where it runs down, whichever fits the canvas's shape. Its name over a rule; picked, the whole band. Regions never nest. A region no line meets goes after those lines meet, unless an `order` is stated |
| **context** | what the map shows round the focus: drawn as it is, never dimmed |
| **appearance** | any card of one block: its home card, or a stand-in for it in another room. All appearances of a block are one object |
| **touched** | what a selection reaches elsewhere — its lines' far ends, its stand-ins — lit in the relation colour wherever drawn |
| **card** | a block as drawn. **A definition always draws as a card** — on the canvas an outline, a usage filled; its structure is reached by opening it |
| **shape** | what a card is drawn as: `card.shape` — `box` (the plain card), `round` (a state), `diamond` (a decision), `dot` (a start), `ring` (an end). A kind casts its parts' shape by `layout.shape` |
| **overview** | every block's first tab: a picture of what helps most — what it connects to (lines in on the left, out on the right), a definition's registry, a folder's treemap, a note's words — beside why it matters, how it is used and where it lives |
| **face** | how much of a card is drawn: **small** — the workspace card size, its corner, name, icon and marks — or **large** — sized to fit its content, or its definition's `card.size`. A card shows what it has: large where it has a table, body, records or picture, small where it is a name alone; `layout.cards` forces either, never zoom; **which** large face by the definition's `card.face`: **table** (its attributes as a ruled table under its name, its body under that), **class** (its fields, then its behaviours' signatures), **document** (its body as markdown), **picture** (what its source points at), **text** (its name alone: a label). Naming none, the name is the whole card |
| **table card** | a large face showing attributes: the name its title row, the card's border the table's, each column the width views measured it at. An entity's schema, keys marked PK, UK, FK |
| **class card** | the `class` face: the name, its fields `name: type`, then under a rule its behaviours' signatures |
| **wire swatch** | how a relation definition draws wherever it is not a run: its name over a short line in its own stroke, a head where its lines point |
| **card source** | a card as markdown: frontmatter for its identity and values, then its body. Rendered from the graph, read back as ordinary changes; **attach** copies a file's onto a block. Its frontmatter is a diagram file: the same schema, `def` included, so a card source may state a definition |
| **source folder** | a package on disk: `package.json` (its graph), a `.json` file per definition, `.yaml` diagram files, and a tree of `.md` card sources, each a usage. A directory named as a file beside it holds that file's parts. Collected one way into a package file |
| **definition file** | one definition as a JSON file, filed under the folder its directory names. `base` is authored as them |
| **diagram file** | one block and its single layer as YAML: the Block and Relation schema with names in place of ids, in a long form and short forms. `packages` lists what it uses, `base` always. A definition where it states `def`, else structure. The file is the truth for what it makes; collected one way |
| **canvas mode** | the map, or one view entered from it. Session state, never stored. There are no system views and no views to choose |
| **registry view** | a registry as a treemap: each entry a **tile** as large as its uses, warmer the more, in the box of its home folder. An entry opened zooms in: the blocks using it, as large as their uses there, in the boxes of their folders |
| **room kind** | how one room draws, which its card's kind decides (`lens_of`): each kind's definition names one in `layout.view` — a block, internal; a grid, allocation; a sequence diagram, sequence; a class diagram, class; an entity relationship diagram, er; a registry, registry. **A definition draws as its usages do**. A stand-in draws as what it stands for, unless it names its own |
| **class** | the definitions a layer's references stand for, one class card each. A line with a hollow head joins a member to the nearest member it extends, unnamed as UML draws it — the one derived line. Every other line is stored: between two members, or between the definitions they stand for, drawn with what its ends mean. Nothing is written back |
| **er** | the same members as schema cards — columns, keys — joined by the stored relations, their multiplicities drawn as crow's feet. Nothing extended is drawn |
| **sequence** | the same grid read as time. Each participant is a lifeline: its header and a dashed stem. Body rows run top to bottom, their phases as words down the left. A step is its **activation**: a narrow bar on its lifeline at its row, still the block when picked, its name said on hover. A relation is a message straight across at the target's row, from the source's lifeline to the edge of the target's bar, dashed and headed as the relation says, named by its own name else the step it reaches; one to its own lifeline loops out of the bar's right side within its column. A lifeline, a message number and a table edge are drawn, never stored |
| **internal** | the opened block from inside: what it holds, as cards — blocks, flows and states |
| **allocation** | an opened grid's lattice, its cells, what sits in them and the relations between them as stored. A **swimlane** is a grid read this way: the header row names the participants, a header card at each lane's top; the header column names the phases; a step sits in the lane and phase its cell names |
| **projection** | a room drawn from what its block holds — class, entity, sequence, registry — writing nothing back. Read-through and layout are applied in it; nothing is stored |
| **layout** | how a layer places what it draws, and which diagram it opens on: a setting (`layout.kind`, `layout.cards`, `layout.shape`, `layout.view`), said by a definition and overridable by a block. `kind` is `layered` (ranked by its relations: flows, states) or `treemap` (each block as large as what it holds, nested in its boxes); unsaid, **packed**: placed by its lines where they join its blocks, packed toward the canvas's shape where none do, in reading order. `view` is one of the room kinds; a name this build does not know draws as its kind's `base` definition names |
| **frame** / **wall** / **band** | a room's border, one of its four sides, and the margin the camera keeps round the focus |
| **mark** | how a card or row reads, derived every draw: reference, missing, note, folder, interface, container, part (from a definition) |
| **system mark** | what a card stands for, bottom right, at most three stacked: a stand-in's word (`Def`, `Ref`, `Pkg`), **structure** on a structure root — the workspace, always, and a definition that holds structure; never a folder, another package, or a block inside a structure — **data** where it carries attributes or values |
| **seat** / **anchor** | a place on a border a line may meet; a seat a relationship arrives at with no block behind it |


## Sections

| Term | Means |
|---|---|
| **section** | one listing in the explorer: what the section above holds, filtered by role — or, standing apart, a listing of its own |
| **mndflow** | the **library**, then the **model**, both folded until opened. The library — what you build with — lists every package, `base` first: its definitions in their folders, each definition's parts under it, then *types* and *tags* groups. The model — what you are building — lists **rooms only**, under the packages and folders on the way to them; a room's other blocks list in the tray's contents. A new workspace holds one plain block, so the workspace lists |
| **mndmap** | source folder → document: mndflow's chain with the package fixed to the workspace and hidden |
| **browse** | choosing a row: selects it and the tray shows it. On the map it focuses that block's area; anywhere else the canvas stays |
| **open** | Enter, double-click or →: on the map, enters the chip; in an entered view, a double-click on a card that opens enters it in turn. A click on the map focuses a chip or a box, the camera flying to it. Zoom never focuses or enters. Notation has no row; picked on the canvas, it is revealed where it is. ← and Backspace leave for the room holding the focus |
| **canvas context** | what the canvas has in focus. Highlighting and breadcrumbs show it, never what is browsed |
| **reveal** | a row picked within the structure the canvas draws picks it in place where the canvas already draws it, else moves the canvas to the layer it sits on and picks it there; browsing outside it never does. A reference is revealed as itself; following it to what it stands for is a gesture of its own |
| **stacked edge** | the second card's edge behind a card that opens: what has a drawing of its own reads at a glance |
| **branch** | the row of the focus and the rows under it, lit subtly in the explorer |
| **crumbs** | the explorer's path to the focus: the section, the package, every room on the way — a region last where it is the focus, never other notation — folded to `…` from the outside in where it would overrun the canvas |
| **navigation** | `open_at`, `leave_at`, `reveal_at` and `held_at` in core: where the canvas goes, and what the sections hold for it. The one rule both apps use |
| **accent edge** | the explorer row of the focus in its section |


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
