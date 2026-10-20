# Design

**Why mndflow and mndmap are the way they are, and the rules that follow from it.** Authoritative: where another document disagrees, this one wins. Words are defined in definitions.md; what crosses packages is in spec.md; where code should live is in code-homes.md.


## Vision

**Rapid visual modeling tools for understanding complex systems.** A document set, a codebase, a piece of hardware — any existing system — translated into blocks a person explores from several perspectives: the block diagram of each layer, and the section slices the explorer cuts through the same tree.

| Tool | Is |
|---|---|
| **mndflow** | the editor: compose, define and rearrange a model. Also the kit every host is built on |
| **mndmap** | the viewer: a markdown source folder read into blocks and explored. Built on the kit as shipped |

| Principle | Means |
|---|---|
| **understanding is the purpose** | the end user is a person exploring a visual translation of a system that already exists. Building a model is the means, not the end |
| **agent and data first** | every element, package, workspace and setting is JSON; a card's content is markdown. The CLI does headless what the app does, in formats an agent reads and writes. The apps call no model: agents and translators work through files and the CLI |
| **motion communicates** | data and logic flows animate along their relations, and moving between related components animates, so a person sees what moves and never loses their place |
| **no notation to learn** | the parts, what they are made of, what flows between them and what must be true is the whole base model. A standard is a translation layer on top, never a shape the model bends to |
| **rapid** | the cheapest gesture carries meaning: ten blocks in a row already say an order |
| **general** | nothing is forbidden for being unusual. Where a choice could be enforced or left to the user, it is left to the user |
| **patterns compose** | good designs and architectures are encoded once, generally, as definitions and their parts in packages, and plugged into bigger systems. Users and agents grow vast libraries of them; packages exist so they can be shared and composed |


## Driving concepts

Most rules below are one of these applied.

| # | Concept | In short |
|---|---|---|
| 1 | **Blocks carry meaning** | a block is a visual stand-in for a part, a system or the template of one: something with parts, data or deeper significance, never decorative. Everything simpler is a component a block carries, or notation a diagram draws with |
| 2 | **Role from position** | package, definition, usage, tree, domain and structure are read from where a block sits, never stored. `parent` is the only containment |
| 3 | **Define once, read through** | a usage reads its definition's structure one step; settings and traits inherit along one `type` chain, structure never does |
| 4 | **Few hard rules** | only incoherence is refused. Settings and traits say what a kind may do |
| 5 | **Derive, don't annotate** | layers, routes, roles, seats, marks and allocation are worked out on every draw. A user states as little as possible |
| 6 | **Perspectives** | a layer drawn is one perspective; the explorer's sections slice the same tree. A projection returns data, never elements |
| 7 | **Browse, then open** | the explorer browses; the canvas draws what was opened. One navigation for both apps |
| 8 | **Data in, data out** | in a session the log is the truth; a file is state, never history; everything is JSON |
| 9 | **One rule, one home** | dependencies run one way, only core closes a set, apps bind ports and add no behaviour. A rule written in two places has no home |


## The model

### Elements

**Four categories, each with one place in the explorer and on the canvas.** Blocks and diagrams are the major concepts the explorer lists; notation and components live inside the block or diagram that holds them.

| Category | Is | Explorer | Canvas | Model meaning |
|---|---|---|---|---|
| **block** | a part, abstract or concrete, a system, or a definition (its template): `block`, `reference`, a diagram kind, a behaviour; and `folder` and `grid`, blocks that arrange what they hold, by their traits | a row; opening one gives its layer, a grid its allocation, a folder zooms to its box | a card; a folder a box on its parent's layer, what it holds drawn inside | yes; a folder and a grid none |
| **relation** | a join between two blocks: a data flow, a dependency, an association. `line` and its subtypes, and `tie` | under the block carrying it | a line | yes; a tie none |
| **component** | defined once in a package's library and carried by blocks as data, never drawn alone: interfaces, attributes (defined by types), tags, constraints | its registry, one per kind under each package in the library; never a row of its own | inside its card — a table, chips — interfaces on its wall; a registry opens as a treemap | yes |
| **notation** | what a diagram draws with beside its parts: the annotations every kind has — `note`, `label`, `group`, `region`, attached by a tie — and the marks a flow or state machine adds — `start`, `end`, `decision`, joined by lines | none; its definitions list | drawn on one layer | a mark's, yes; an annotation's none, but the tags its name gives its members |

- **a layer is the inside of a block**: its parts, the relations among them, and its notation. Layers follow composition — system, subsystem, part — never organization
- **composition looks through folders and grids**: a block in a folder or grid in system S is a part of S. A folder never makes a layer; a grid opens onto its allocation, a view of what it arranges, not a layer of its own; a group and a region never make one
- a relation is carried by the block whose layer it sits on. **A `tie` is a relation kind with no model meaning**, attaching a note or label to what it describes; every other relation means something
- **storage is not category**: everything with a place on a layer is stored in `blocks` and held by `parent` — a folder, a grid, a note and a group included. What it is, is its kind's category

### Placement

- a definition never sits inside a definition; it may sit in folders and grids however deep and is still a tree of its package
- a usage may sit in a domain, as a tree of its own
- folders, grids, notation and references may sit anywhere
- no block contains itself: the tree terminates

### Organization

- **`parent` is the only containment.** A block's parts compose it; what a folder or a grid holds is arranged by it, and is still a part of the nearest block above
- **a folder is a box on its parent's layer**, what it holds drawn inside, as the package view draws it. It holds anything — definitions, usages, documents — and never makes a layer
- **selecting a folder in the explorer zooms the canvas to its box**
- a grid opens onto its allocation (*The grid*)
- **the explorer lists the `parent` tree**: blocks, folders and grids as rows. Notation never lists, though its definitions do; what a group or region holds lists at its level
- folders organizing what is not structure (definitions, documents) is this app's convention, never a rule
- a definition always draws as a card; its structure is reached by descending
- the layer a block draws on is its nearest ancestor block: folders, grids, groups and regions are looked through
- deleting a folder, grid, group or region deletes what it holds

### Notation

**Notation is what a diagram draws with beside its parts**: the annotations every kind has, and the marks a flow or state machine adds (*Relations*). It is drawn and edited on the canvas only, never lists in the explorer — its definitions do, in base's `notation` folder — and is never a place you go. **Annotations explain or organize one layer**:

| | Content | Draws as | Attached | Tags |
|---|---|---|---|---|
| **note** | a markdown body | a card, the `document` face | free, or tied | never: it is prose |
| **label** | one line, a name | text only, the `text` face: no border, ground, icon or marks; one unit tall and exactly as wide as its words, so a tie meets them | free or tied, **always floating aside**, never on a line or across a region's heading | what it is tied to |
| **group** | a name | a box round its members | encloses them | its members |
| **region** | a heading | a band across the layer, between separators | encloses its members | its members |

- **an annotation's name tags its members**: membership is enclosure — a group's or region's, by `parent` — or ties, a label's. Derived, never stored on the member
- a group and a region hold blocks of the layer they sit on; a block dragged in joins, dragged out leaves for the layer
- **regions stack and reorder by drag**, each a band with its heading
- **a region may show another block's diagram**, dropped into it: a reference drawn open, its layer inside the band. A relation reaches into it **only through that block's interfaces**, and is carried by the outer layer
- **typing into an empty grid cell or header makes a label**
- a note arranges aside, floating beside what it is tied to (*Perspectives*)
- **a tie runs from an annotation to what it describes** and means nothing in the model
- **a region is made from a selection's menu, or empty from the layer's** (its room's right-click menu)

### Components

**A component is defined once in a package's library and carried by blocks as data.** It has no layer and never lists in the explorer as itself: a block is a part, abstract or concrete, and may have layers and children; a component is what a block carries. Read and edited in the tray, and inside a card: its table, its chips, its wall.

| Component | Its definition, in the library | Its use, on a block | Drawn |
|---|---|---|---|
| **interface** | an interface definition: what it carries, its look | a port: name, flow, seat | a seat on the block's wall |
| **attribute** | a **type**: an enum or an alias, its format or unit, its look | a field on a definition, a value on a usage | a row of the card's table |
| **tag** | a tag: a word and what it means | a tag on a usage, a line or a definition | chips |
| **constraint** | a rule: the values a block must answer, and on a line those its ends must agree on | applied to a block or a line, by id | a chip; advice in `review`, never a refusal |

- **not components**: a **behaviour** is a block — it has a flow or a sequence to open (*Behaviours*); **traits** are the engine's table (*Kinds and traits*); **records** are values; **settings** are a definition's
- **a component definition is defined, extended and styled as a block definition is**, and resolves the same way: one chain, nearest first, read by **one resolver** over block definitions and library entries alike — never a second rule. An entry's `type` names another of its kind; extending nothing, it extends its kind's base — `attribute`, `tag`, `interface` or `constraint` — so a tag's colour is its own, else its parent tag's, else base `tag`'s
- **the tray's components tab lists everything a block carries**, a band per kind — attributes, ports, tags, constraints — each port and tag in its definition's colour
- **a port is data on any block** that *has ports*, keyed by id so a line's end can name it; a usage also wears its definition's, read through (*Interfaces and lines*)
- **a registry is the one place a package's components of one kind are gathered**: its **entries** — the component definitions — and their **uses**, where each is carried. Worked out from the library, never stored; one per package per kind, listed under its package in the library as a block is
- **a registry opens as a treemap**: each entry a tile as large as its uses and as warm as them, in the box of its **home folder** — the folder holding most of its uses — under *[multiple]* where none holds half, and *[no uses]* for the rest; a lone box is left out, the frame saying as much. A block laid in a treemap reads on a plain ground, its definition's colour on its edge. **A tile's name is never cut short**: it wraps, a narrow tile writes it smaller before breaking a word, a tall narrow one reads it upright, and a tile too small for its corner drops it. **Opening an entry zooms into it**: the blocks carrying it, each as large as its uses there, in the boxes of their folders; the camera flies from the tile to its room and back. A block there opens as anywhere
- **the tray reads a registry two ways**: a **matrix** — the blocks using any entry down the side beside their folder, the entries across, a square per cell as warm as its count, a readout line saying in full what the pointer is on — and a **list**, one row an entry. Below three entries it opens on the list
- **tags are for finding things**: words a usage, a line or a definition carries in `tags`, for search, filters and lookup. A new tag is filed in the workspace's own tags
- **the tray groups tags by source**: stated on the element, carried from its definition, and one group per annotation giving it (*group: Billing*). **Every tag is removable**: a stated one leaves the list; **one an annotation gives removes the membership**, never the annotation — the block leaves the group or region for the layer, or the label's tie to it is deleted. A label left with no ties stays as free text

### The grid

**Pure allocation: a lattice whose cells hold blocks, and the one place a position states meaning.** A cell address along the reading direction is an order, and a header is an allocation — both stated rather than guessed. A grid carries nothing special: an extent, header lines and merges, and blocks seated in its cells.

- outside, a grid is a card like any other; opened, it draws its **allocation view**: a frame of card-sized cells, with narrower header lines along its edges, and the relations between what sits in them as stored. **A swimlane is a grid read this way**: participants as columns, phases as rows, steps in their cells
- every grid has a header row and a header column; opened, each header is its line's tab: pointing at it lights the line, a click picks it, and the right button offers what may be done to the line
- a cell or header holds one block. Two sharing one leaves *what is allocated here* without an answer. A grid's member always sits in a cell
- **typing into an empty cell or header makes a label** named what was typed. A header is a role from position, never stored
- double-clicking a cell or header opens the block in it as anywhere, or names a new one in an empty cell; right-clicking a cell makes a block in it; dragging a block onto either seats it there
- any block or label may sit in a cell, folders and grids included; it draws as a card, compact in a header
- a block dropped on a grid's card from outside takes the next free cell in reading order, adding a row when none is free
- reading order is left to right, then down
- the frame grows and shrinks by its handles, as a grid on a layer does
- relationships enter and leave a grid through its interfaces, as on any layer
- removing a line moves what it held to the nearest spare cell on its side; what has nowhere to go leaves the grid for its layer
- allocation is derived, never stored: a body block is allocated to what its row and column headers stand for, and to every folder, grid, group and region it sits in
- records — rows of values answering a definition's attributes — are not a grid's: they are a collection's (*has records*), or usages

### Types and read-through

- **`type` is one chain**: on a usage, what it is; on a definition, what it extends. It names one above: never itself, never one that extends it. Refused at the gesture; `isa` guards loaded files
- a chain ends at a root: `block` for blocks, `line` for relations. **Every other base kind extends one** — `reference`, `interface`, `folder`, `grid`, `note`, `label`, `group` and `region` extend `block`, `tie` extends `line` — and lists only the traits it keeps. A definition extending nothing extends `block`, and reads as it does
- own values only: inherited values are resolved on read, never copied
- precedence, per link of the chain, self first: its own settings, then the traits in force where that link states them. Nearest wins
- a trait confers the settings the engine grants it, and nothing else
- **a stated list replaces its chain's**: `traits` and `tags` are two lists, and an element or definition stating one states every entry it keeps; unsaid, it carries the nearest list stated down its chain, whole. An empty list says none. There are no drops
- structure is a definition's own and is never inherited; **interfaces are**, as attributes are: a subtype and every usage wear the interfaces its chain declares, each edited where it is declared
- a usage reads through one step: its type's own structure, never a chain
- edits go home: changing a part through a usage edits the definition that owns it
- **a definition never uses itself**: no usage typed by it, by exact type, at any depth of its own structure (`D` may hold an `S` where `S extends D`). Refused at every gesture that makes or retypes a usage; reported by `review` in loaded data. Checked directly only, for now: `D` holding an `E` that holds a `D` is not checked

### Kinds and traits

- **`base` enumerates the kinds the engine treats differently, and stays minimal**: blocks `block`, `reference`, `folder` and `grid`; the diagram kinds extending `block` (*Diagram kinds*); notation — the annotations `note`, `label`, `group` and `region`, and the marks `decision`, `start` and `end`; relations `line` and `tie`, and those a kind draws with, `association`, `composition`, `aggregation`, `dependency`, `message`, `reply` and `transition`; the components `attribute`, `constraint`, `interface` and `tag`, the roots their definitions extend — each its own hue, never made a block of their own. Kinds are data; engine modules are `block`, `reference` and `interface`, and the engine draws an interface on its block's wall
- **traits say what a kind may do, and absent is a no**: a capability nobody grants is refused at the gesture. The base kinds carry the traits that make them what they are
- **traits are what the engine does**: each names one engine-supported function, *has X* for a capability granted — *has parts*, *has values*, *has records*, *has ports*, *has head*, *has tie* — *is X* for what sort of thing it is — *is group*, *is grid*, *is region*, *is reference*, *is interface*, *is behaviour*, *is tie*. Names follow (`has_parts`). **Traits are an engine table, not definitions** (core `types.ts` `TRAITS`): a definition lists them by name, the tray offers them as chips, and no diagram draws them. Each carries a description and **grants the setting the engine reads** — *has parts* `allows.holds`, *is group* `holder.inline`, *is reference* `block.module`, *is tie* `line.module: tie` — never matched by its id. What only changes how a card draws is a setting, never a trait
- **a kind says what it is in traits and settings, not in engine code**: `reference` lists *has ports* and *is reference*; `tie` lists *is tie*, whose `line.module: tie` the engine reads to draw it straight. **A kind's look is its own settings** — `style` and `card` — written in its definition
- a trait grants a capability whole. **Asking what values must say is a constraint**, a component (*Components*). Limiting a capability to definitions (`allows` lists, `degree`, `ends`) stays settings, to be reworked
- which arranging block or notation a block is: a folder by its base; a group or grid by its *is group* and *is grid* traits; a mark by the nearest `start`, `end` or `decision` in its chain
- a capability is added to or removed from a subtype as a trait, easily and visibly: its definition lists every trait it keeps. **Traits are a definition's**: a usage and a line carry their definition's. Stored by name in `traits`, never a tag
- **a collection is a block with *has records***: it holds many records of one type (`records.of`), drawn as a table on its card. A queue, a table or a store is a package definition carrying it. **Records are values, never blocks**. When flows are simulated, a flow in appends a record and a flow out reads one
- `note` lists *has values* and *has tie*; its settings give it the `document` face, a height of its own and `card.arrange: aside`; anything arranged aside floats the same way
- **styles are settings**: how a card draws is its definition's `style` and `card`, and its own where a usage overrides them. There are no style tags
- relations hold no structure
- `base` is filed in folders: `blocks` (`block`, `reference`, `folder`, `grid`), `diagrams` (the kinds), `notation` (the annotations and marks), `components` and `relations`. **Each definition is a file of its own**, `packages/defs/src/base/`, collected into the package file the kit ships
- **a relation definition says what a line describes, never its name**: which way it points is the setting `line.dir`, inherited down the chain like any block setting and overridable on the line. **A line's name is its own `name`**, as a block's is, and decides nothing; **unnamed, it draws no word**, never its definition's name: its look says what it is. A sequence's message is the one exception, reading the step it reaches, since a step draws as its bar. A name that means something is a relation definition
- **two blocks are joined once per relation type**: drawing a line where one of that type already joins the same ends draws no second line; the line already there takes the new way too, so a line back makes it point both ways
- a **tie trait** ties a block made from, or dropped on, another block to it, on the same layer. Made on its own, it ties nothing
- one name space per package: a type, a tag and a definition never share a name
- a reference points at what it stands for, and nothing points back. **It is a reference by its kind**, never by `of`: it stores `type: "reference"` and its chain carries *is reference*. A gone target reads missing and is kept. What a reference's card draws as is resolved once, in views `through.ts`

### Interfaces and lines

- **an interface is a component of its block, its boundary: a port, data on the block**, keyed by id: a name, a flow (`in`, `out`, `both`; absent is both), and its type — an **interface definition** in the library, defined, extended and styled as any component definition is, with its own settings, values and tags; what it carries is said there. Drawn on its block's wall, it holds nothing, has no layer or frame view of its own, and never lists in the explorer
- **any block may have its own interfaces** where its kind *has ports*, a usage of a base included. A usage also wears its definition's chain's, read through; each is drawn as `block/port`; an edit to one goes home to where it is held
- **auto or placed**: an interface with no `side` and `at` is auto: on every draw it sits on the face most of its lines look out of, at the free seat nearest the middle — the middle itself while no line meets that face. One with both is placed: it keeps its seat, the middle included, and no line lands there
- **a line leaves the middle of the face looking at its other end**: every line on a face shares that anchor; where a placed interface holds the middle, the anchor is the free seat nearest it. Placing an interface is the only way to move an end
- **a run goes round cards**: square, round every card and note it does not end on, with the fewest bends; boxes, rooms and grids are never in its way. Lines sharing an anchor share a trunk and branch where their ways part. Where seats are ours, the path is the router's: an end never leaves its seat or its face
- where the router is not loaded (the CLI, tests), a run is straight or one Z, under cards: lines sharing an anchor run as one trunk to a fan point, halfway across the gap to the nearest card they reach, and split there
- **several lines between one pair overlap** unless an interface is placed to part them: separate seats are always stated, never worked out
- **a line to a box meets it straight across**: a box drawn round others — a room, a group, a folder, a region, a profile's row — is met straight across from where the other end leaves, wherever that lies along its wall; else at its anchor
- **in an internal view a line ends at the frame**: it leaves the card's face nearest a wall and runs straight to it. The layer's auto interfaces sit straight across from the card they link; a placed one keeps its seat, and its line may Z
- **a tie has no anchor and no end mark**: it runs straight. Where a note sits directly beside or below its card, the tie crosses that gap straight, each end at the free slot nearest the middle of where the two edges overlap. Where the note sits off a corner, it keeps that corner — the distinctive tie — and the card meets it at the free slot nearest the note. A tie to an interface meets a corner of that interface. It is never routed. Overlapping cards draw no tie. **A tie draws above every card**
- a line's name sits on its own longest leg, never on a shared trunk; too wide for a level leg, it reads upright across it

### Relation ends

**A relation's ends are data**: what each end means, said by the relation definition and read down its chain (`def.ends`), the line narrowing it (`ends`).

| End property | Values | Drawn on a class or entity diagram |
|---|---|---|
| **multiplicity** | `1`, `0..1`, `*`, `1..*`, `m..n` | words beside the end; a crow's foot on an entity diagram |
| **role** | a name | words beside the end |
| **ownership** | `none`, `shared`, `composite`, said at the owner's end | a hollow diamond, a filled one |
| **navigable** | yes, no, unsaid (read as both ways) | an open head; a cross on the line half a unit in from that end; nothing |

- **a line says multiplicity and role**, as a usage answers a value; ownership and navigability say what the relation is, so only a definition says them. A line wanting others is another relation type, made by an explicit gesture, never minted
- **navigable is not direction**: `line.dir` is a flow's or a dependency's way. A view draws what it is about: the class and entity diagrams draw ends, the internal and sequence views `line.dir`. `line.from_arrow` and `line.to_arrow` override either
- **two definitions may relate** — an association — and two usages may. **A definition and a usage never relate**: a template and an instance; a tie joins anything. A line between definitions states the association; it is never copied onto their usages
- **no line is derived**: a view draws stored relations only. An attribute typed by a definition shows its type and draws no link. The one exception, kept for now: the class diagram draws *extends* from `type`
- **notation lives in base beside the kind it serves**: `association`, `composition`, `aggregation` and `dependency` for class and entity diagrams; `message` and `reply` for sequences; `transition` for state machines, named by the event that fires it; `decision` for flows; one `start` and `end` shared by flows and state machines. A flow's steps join by plain `line`
- **notation draws as its mark**, by `card.shape`: `decision` a diamond, its name inside; `start` a dot and `end` a ringed dot, one unit across, their names said on hover. **A notation definition is a card like any other**: its mark and face are its usages' alone, so it draws outlined faintly, as a relation definition does, wearing its mark as its icon. **A kind may cast its parts' shape** by `layout.shape`, as `layout.cards` casts their face: a state machine's states are `round`, slightly rounder than a card, never a pill. A group on that layer passes it through; a diagram nested deeper casts its own
- **a second line between the same two cards runs round them**, its ends on the faces a quarter turn from the pair's, so a state machine's back transition and its word stay clear of the first

### Diagram kinds

**A diagram kind fixes what a block's layer draws: its view, its layout and its icon, and the one question it answers.** Shipped in base, each extending `block`. **A plain `block` is none of them**: a leaf, free to become any kind.

| Kind | Answers | View | Layout | Behaviour |
|---|---|---|---|---|
| **internal** | what it is made of | internal | auto | |
| **flow** | what moves through it | internal | layered | yes |
| **state** | how one thing changes | internal | layered | yes |
| **sequence** | who talks to whom, in what order | sequence (a grid read as time) | | yes |
| **swimlane** | who does what, in which phase | allocation (a grid read as lanes) | | yes |
| **class** | what its types are: an object's fields and methods | class | | |
| **entity** | how its data is stored | er | | |
| **treemap** | where the weight is | internal | treemap | |

- **each pair is two kinds**, flow and state, sequence and swimlane, class and entity: each its own visual language and function
- **a block's kind is the nearest its chain names**; a plain block holding parts, its own or its definition's, reads as `internal`. Derived, never stored beside its type
- **a diagram holding parts keeps its family**: kinds that hold alike form a family — **layer** (internal, flow, state, treemap: parts and lines), **types** (class, entity: references to definitions) — and a block moves freely among its family's kinds. `sequence` and `swimlane` are each their own: their cells would carry over, but not their meaning. An empty block, or a plain one, may become any kind; a plain block holding parts reads as `internal`, so may become any layer kind. A definition alike, by what it extends
- **a kind's layout is fixed**: a kind naming a layout keeps it — the rail offers no layout to choose — and a drag on a worked-out layout (`layered`, `treemap`) is refused
- `sequence` and `swimlane` extend `block` with *is grid*; `grid` stays a plain arranging block
- a diagram's parts may be plain blocks: placeholders made as it is edited, typed or referred once it is fleshed out

### Behaviours

**A behaviour is a block's method, and its layer is what does it.** A block of a behavioural kind — `flow`, `state`, `sequence`, `swimlane` — is itself a behaviour (*is behaviour*), so the diagram it draws is its kind's view.

- a class card lists its behaviours after its fields, each by its signature, **read from its interfaces**: its in-interfaces are its parameters, its out-interfaces its return, each typed by its interface definition — `name(param: type): type`
- behaviours list in the explorer as the blocks they are, under their owner; a usage's are its definition's, read through

### Attributes and types

**A definition declares attributes; a usage answers them.** An entity is nothing new: a definition with attributes, as an ERD or a class draws one.

- an **attribute** is a definition's own: a name, a `type`, and what it may say beside — `key` (`primary` or `unique`), `default`, `unit`, `many`, `optional`, `note`, and any other property kept as written. Inherited along the chain, nearer replacing farther by name
- a **value** is a usage's or a line's answer to an attribute, by name. Its type is the attribute's, never stored beside it. A usage may answer names nothing declares, as its own
- **forms are the engine's**: `text`, `number`, `flag`, `link`, `choice` — how a value is edited. A closed set, never blocks
- **a type is a component**: a named, reusable data shape, stored as data in its package — an **enum** (`Order status`: the `choice` form and its options) or an **alias** (`uuid`: the `text` form). **An enum with methods or fields is a class**: a block definition
- **an attribute's `type` names a form, a type, or a block definition**. Typed by a block definition, it is a link: a foreign key, drawn as its type only. The relationship is a stored line between the definitions
- **used by** is derived for every type and entity: the attributes and usages typed by it, as allocation is
- what round-tripping needs beyond `many` and `optional` — maps, unions, generics — is added to types only as a translator needs it

### Definitions and packages

- a package is a root block. `base` ships with the kit, the workspace's is editable, any other is frozen (read only)
- a definition is named; new definitions land where the user is
- removing a used definition is refused. `base` and the workspace are never removed; a used package is not removed
- a new workspace is its root and one plain block named `block`, so the workspace lists in structure. Groupings are the user's
- **no special blocks**: the workspace root is a package root like any other; only its id is reserved
- **definition side and structure**: a package root, a definition, or a folder reached from its package root through folders alone is on the definition side; every other block is structure. A definition-side folder may hold both
- **definitions are data; structure may be markdown.** Every package, `base` and `markdown` included, is a `.json` file of definitions and its named components — types and tags — authored as JSON definition files, or YAML in a diagram file or a card source's frontmatter, all in one schema; a package may also hold a tree of markdown files, each a block — a usage, or a definition where it states `def`. Hosts keep only the id constants their code reads
- **every import is a package**, frozen; new definitions are made in the workspace only
- a package is the smallest unit of export; there are no subtree files
- a package is authored as a workspace and exported as a package: its root and ids prefixed with the package's name
- importing a package adds it, frozen, beside the workspace. A package whose ids clash with one loaded is refused
- a package's dependencies are worked out from the types it names, never stored
- a workspace file carries the packages it uses (all but `base`), so it is whole. A file naming a definition it does not carry is refused
- a relationship belongs to the package it is written in. An export keeps one with an end inside and the other in a package it uses
- the file schema is `1.0` and is not incremented until the model settles. The door never migrates: a schema change re-saves the samples
- mndflow reads and writes only package and workspace files; a host's session state is the host's


## Perspectives

**A perspective is one layer, drawn one way.** Nothing a perspective works out is stored.

- a **projection** draws the slice the sections hold, from one layer. Read-through, flatten and layout are applied in it
- **two system views** draw the whole system, both trees at once — every package's definitions, and each definition's top-level structure: **package** from above, each block that holds flattened into a box of its contents, scoped to the section or to a package or folder opened; **profile** from the side, one row per level along the pick. They are the rail's only views: choosing one leaves the open layer for the whole system, and the explorer follows
- **five layer views** draw one block — internal, allocation, sequence, class and entity (`er`) — and **the card's kind says which**; a sixth, **registry**, draws a registry or an entry of one: each kind names its view in `layout.view` on its definition. **A definition opens as its usages do**, on the view its chain names: its layer, drawn as a template. What describes it — what it extends, its tags, interfaces, settings and usages — is read in the tray. Worked out on every draw, never chosen:

| Card | Opens on | Draws |
|---|---|---|
| a package | **package** (the system view, scoped to it) | what it holds, top down, folders as boxes, the page scrolled down |
| a folder | nothing: it is a box on its parent's layer | selecting it zooms to the box |
| a block with something to draw: what it holds, or what its definition holds | **internal** | what it holds, as cards: blocks, flows, states |
| a grid | **allocation** | its lattice, what sits in its cells, and the relations between them |
| a `flow` or a `state` | **internal**, `layered` | its steps or states, ranked by where their lines point |
| a `sequence` | **sequence** | a grid read as time: each participant a head over its lifeline, each step an activation bar on it, each relation a message straight across at its row, the phases as words down the left |
| a `swimlane` | **allocation** | a grid read as lanes: steps in their cells, and the lines between them |
| a `class` | **class** | the definitions its references stand for, one class card each — fields, then behaviours — with what they extend and the relations stored between them, their ends drawn; laid out `layered`, owners above what they own |
| an `entity` | **er** | the same, one schema card each — columns, keys — the relations' multiplicities as crow's feet, drawn larger than an arrow's head, and nothing extended |
| a stand-in | what it stands for | that block's own view, unless the reference states its own `layout.view` and the target can feed it |
| a `treemap` | **internal**, `treemap` | what it holds, each as large as what it holds in turn |
| a registry | **registry** | a treemap: its entries as tiles as large as their uses, in the boxes of their home folders |
| an entry of a registry (a tag, a type) | **registry** | where it is used: the blocks carrying it, as large as their uses, in the boxes of their folders |
| an empty block, a leaf or notation | nothing | picked where it is drawn |

- **there is no definition view**: a definition is opened as its usages are, and described in the tray. A relation definition has no layer and opens nothing; picked, the tray shows it
- **only what has something to draw opens**: opening means inspecting a drawing, never an empty room. An empty block's first part is added from its menu (*add a part*) or the explorer; from then on it opens. A group, a region, a label and a note never open, nor do their definitions
- **a card that opens wears a stacked edge** — a second card's edge behind it — and its icon lights; its menu offers *open*, and no other card's does
- an empty layer says why it is empty, never a blank canvas
- the package view draws every package top-down in the explorer's order, each a box hugging its domain, folders as boxes, **every card on its small face, a grid as one card, and no notes** — a system view draws minimal blocks, whatever a layer's `layout.cards` says — the page scrolled down and never zoomed out. **A definition holding structure is a box of its top-level blocks**, each a card standing for what lies below it — never deeper, so the system view stays readable
- the profile is the system seen from the side: **one row per level**, top to bottom, every row a box as wide as the widest — every package, then what each block on the way to the pick holds, and last what the pick holds — each row named for what holds it. **The only lines run from each block on the way down to the row it holds**, pointing straight down; never one block to another
- opening a package draws its package view, a definition the view its chain names, a grid its allocation. A folder is never opened: selecting it zooms to its box. Notation, picked on the canvas, is revealed in place and the explorer lights the nearest row that lists what it sits on
- a layer's **layout** is a setting, `layout: { kind, cards, view, … }`, said by its definition and overridable by the block, inherited like any setting. The kit ships `free`, `auto`, `page`, `layered` and `treemap`: `page` is how the package and profile views lay out; **`layered` lays a layer out by its relations** — flows and states — worked out every draw and never stored; **`treemap` sizes each block by what it holds** — one for itself and one for each block in its structure, a stand-in what it stands for — nested in the boxes of its folders, groups and regions, notes standing beside it. Uniform cards stay every other layout's; the `treemap` kind asks for a treemap. An unknown kind draws as `auto`. `cards` is `small` or `large`. `view` names `package` or one of the five layer views; a name this build does not know, or a view the block cannot feed, opens on the view its kind's `base` definition names
- **the class, entity, sequence and registry views are projections**. They draw what the block already holds and write nothing back: no lifelines, message numbers or extends lines are stored. The canvas does not drag or create on one, and its room hugs what it draws, as a page's does. The allocation view, the explorer, the tray and the CLI still edit the same blocks
- **one dataset, many diagrams.** A reference that states its own `layout.view` opens that view over its target when the target can feed it. The trail names the reference
- **`auto` is what nobody said, and arranges by kind.** Every kind states its arrangement, `card.arrange`, inherited and overridable like any setting: a block `column` — one column at the left, left edges aligned — a folder `rows` — small cards `layout.across` to a row, unsaid the host's default for its page shape (landscape 4, portrait 2; the CLI and exports 4) — a note `aside`. Blocks are placed in explorer order; consecutive blocks sharing an arrangement form a run, and runs stack top to bottom, left-aligned, a gap apart. **A card arranged aside floats** in the nearest free space wide enough beside what it is tied to — untied, beside the whole arrangement — a card, or an interface where that interface sits, including on the room's wall — and a unit of air stays between it and every surrounding card. A tie to an interface is seated first, so that note keeps the nearest spot. **Notes sit by one rule on a layer and in a group.** **A line never moves a card**; *arrange* reorders a layer once, on request, so related blocks read side by side. Moving a card by hand hands the layer to `free`, keeping every place; **on a worked-out layout (`layered`, `treemap`) the drag is refused**
- **every layout but `free` is a row/column grid**: each unit takes a cell; a card sits in the middle of its cell's width, so middles down a column line up whatever its size. Cell edges sit on the guides, 2 units apart; a group, a room, a page's box and a grid's cell keep 1 unit of air round what they hold
- **auto and pages flow onto standard columns**: units take columns a default card wide in reading order; one wider spans as many as it needs, centred across them — overhanging into at most half a gap before it takes another — and each row is as tall as its tallest, every unit at its top, so the rest keep a regular grid
- **a row and its card read alike**: the explorer and the canvas ask core's `role_of` what a block is, and wear the same icon — **a diagram its kind's**, one per kind, a plain block a plain square
- **system marks say what a card stands for**, never how it opens — the icon says that. At most three, stacked in this order: the word for what a stand-in stands in for (`Def`, `Ref`, `Pkg`), **structure** (the tree mark) on a structure root — the workspace, always, and a definition that holds structure; never a folder, another package, or a block inside a structure — **data** (the database mark) where it carries attributes or values. A stand-in wears its target's structure and data
- **a layer draws its key**: what each kind's colour, mark and word mean. The workspace sets the default; a layer may override it


## Cards

**A card is drawn by one renderer everywhere** — the canvas, the tray, mndmap — and what it shows beyond its identity is its attributes as a table and its content as rendered markdown.

- **one design language, by group**: each group draws alike, stated once on its base definitions

| Group | Name | Corner (top left) | Edge and ground | Icon |
|---|---|---|---|---|
| **parts**: blocks, usages, references | from the left | what it is, then its handle (`service · B6`); a plain block its handle alone | solid, filled | yes |
| **diagrams** | from the left | its kind, then its handle | as a part, with the stacked edge of what opens | its kind's |
| **holders**: folder, grid, group, region | a heading | its handle where it shows one, never a type word | folder solid neutral, group dashed, region a band | yes |
| **marks**: start, end, decision | centred; the diamond's inside, a dot's and ring's on hover | none | the shape | none |
| **annotations**: note, label | a label centred on one line; a note's prose from the left | none | a note the document face, a label none | a note's |
| **definitions** | as their usages | what they extend | outlined, no ground; notation's faintly | as their usages |

- **the corner** is `card.label: inside` with `card.alias: show`, the defaults: small, over the name, opposite the icon. `above` and `below` still hang the type word outside the card. A card wearing a corner keeps its line clear, so a two-line name never meets it
- **a card shows what it has**: unsaid, a card draws its large face where that face has something beyond its name to show — a table, a body, records, a picture — and its small face where it is a name alone. `layout.cards: small` is the compact view, every card a name; `large` asks for the large face throughout
- **two faces.** The **small** face is the workspace's card size: its handle above its name, its icon and its marks, nothing more. The **large** face fits its content, or takes its definition's `card.size`, held under a preset maximum: its name, then what its **face** maps its content onto — `card.face`, one of a closed set of engine renderers: `table` (its attributes, then its body: an entity's schema, keys marked PK, UK, FK), `class` (its fields, then — under a rule — its behaviours' signatures), `document` (its body), `picture` (what its source points at), `text` (its name alone: no border, ground, icon or marks — a label). A card naming no face is its name alone
- **one table look, wherever a card draws a table** (`.mnd-face-table`): its attributes, and any table its markdown says — ruled inside, no box of its own, a quiet header. **Attributes draw as that table**, from data, never markdown: the name is its top row, with the icon at its right; the marks end the last row; the card's border is the table's; columns are type, name, then key, value and note where any row says one. Column widths are worked out once in views and used both to size the card and to draw it. **A table card is sized by its table**, exactly, never rounded to units. A body shown under the table is markdown
- **the face is the view's, never the zoom's**: a canvas draws what each card has unless a layer's `layout.cards` says small or large; the tray draws a block large, then small. A face is laid out at its size from the start, so nothing reflows
- **every block's first tab is its overview**, one layout for all: on the left **always a drawing**, by the canvas's own renderer — its own layer where it opens, with *open*; else the layer it sits on, fitted to it and the cards its lines join, itself picked — **fitted whole to the tray's height and fitted again as the tray resizes**, so it is never cropped; and on the right **why it matters** (its description, else a non-base definition's; its definition, kind, *behaviour* and tags as chips), **how it is used** (the lines in and out on the layer it sits on, by port; its parts by tag as a bar) and **where it lives** (its path; what refers to it, or a definition's usages; for a class or entity diagram, the others referring to the same definitions; its counts in its kind's words). A reference is drawn as what it stands for. **An empty plain block offers the kinds it may become** there, and only there. A host's own tabs still lead
- **the tray asks every element the same questions, in one order**: what it is for, what it is, how it draws, what it carries, what it lists. A card and a line share one tab, named for what is drawn: one face and **every key the element says** on the left, said or carried, one line each and cut short with an ellipsis, the lit key's choices as chips on the right, reading its whole value. **A chip standing for a definition wears that definition's colour**. A definition's settings tab is laid out alike, one key a part of its drawing, the part's settings its choices; **a usage has no settings tab**, since it cannot change them. What a block holds as text heads its contents tab
- `card.name: hide` leaves the large face its parts alone, and a group or box unnamed; the small face always names
- **each category draws as itself**: a block a card; an interface a seat on its block's wall; a note the `document` face; a label the `text` face, as wide as its words; a notation definition a card in a faint outline; a group a dashed neutral box; a folder a solid neutral box; a region a band under its heading; a reference a solid card wearing the reference icon, so only a group reads dashed; **a relation definition a wire swatch** in a faint outline — its name over a short line in its own stroke, a tie's dotted, a head where its lines point
- **a definition's card settings describe its usages**: its `card.arrange`, `card.height` and face size say how its usages sit and size. The definition itself is one plain card in its folder, in the folder's grid
- **colour is the nearest `family` or `hue` in the chain**: any definition may set its own or change its subtypes'. A subtype saying neither strays from **its parent's shade** by up to half of the `vary` in force, halving at each step, so kin read alike
- **role is drawn apart from colour, on the canvas**: a definition — or a stand-in for one — is an **outline**, no ground, its border in its colour, at the card's own corners; a usage is filled. Off the canvas — the tray, the explorer, a host — every card draws filled, in its colour
- **a card's markdown is its source**: frontmatter for its identity and values, then its body. The JSON graph is the truth; the markdown is rendered from it, and read back into ordinary changes

### Card sources

**A card source is a diagram file with a body.** Its frontmatter takes every key and short form a diagram file does, `def` included: a usage, or a definition and its layer.

| Frontmatter key | On a usage |
|---|---|
| `name` | its name |
| `type` | the definition it is, by name |
| `tags` | its tags, by name |
| `source` | where its content lives outside |
| `blocks`, `relations`, `packages` | the layer it holds, as a diagram file states it |
| anything else | a value, answering the attribute of that name |

- **frontmatter and diagram files are one schema**: frontmatter takes every key and short form a diagram file does, and a diagram file is a card source without a body. One reader reads both
- the body after the frontmatter is the block's `body`, kept as written. Tables in it are content, never parsed into values
- **attach** copies a file's markdown onto a block and records `source`; **refresh** is the same gesture asked again. Nothing syncs
- **permissive**: a name in frontmatter that nothing loaded holds, or that more than one package holds, becomes a plain definition where the card lands, and is reported
- **a source folder is a package on disk**: a folder holding `package.json` (the package's graph), a `.json` file per definition, `.yaml` diagram files, and a tree of `.md` files (usages), each folder a folder holder, but one named as a file beside it, which holds that file's parts. **Read one way**: it is collected into one package file, never written back; a definition said twice is refused. Importing one adds it frozen. A definition its usages name and nothing defines is made, its attributes the union of their keys, each type read off the values; a JSON definition wins over anything inferred


### Diagram files

**A diagram file is one block and its single layer, written in the Block and Relation schema with names in place of ids.** It mocks up a diagram quickly, reliably and the same way every time: the file is the truth for what it makes. The long form is the schema; short forms spell the same fields.

| Rule | |
|---|---|
| **one block, one layer** | the file names its block and states what any block may: `type`, `def` (present: a definition; absent: structure), `settings`, `body`, `tags`, `constraints`, `ports`, values. `blocks` and `relations` are its layer. A block may hold blocks of its own — a group's members, a grid's cells — written under it, or named by `parent`; nothing deeper opens in one file: **a block's parts with layers of their own are files of their own** (*collected, one way*) |
| **no places** | ids, `alias`, `order` and places are never written: ids and handles are minted in file order, `order` is list order, and the layer's layout places the rest. A size (`w`, `h`) may be said; a note unsized fits its words |
| **names, not ids** | `traits` name engine traits; `type`, `of`, `tags`, `parent`, `from` and `to` name a block: a name in the file or a path down from one (`Pump::in`), a path from the package's root (`Cards::Kinds::Block`), `pkg.name`, or a bare definition name — the file's packages, then `base`, else anything loaded. `base.folder` is the bare `folder`. Names are unique among siblings, so a name finds one block; **a bare name also finds the one block of that name another file placed on this file's layer**, looked for through its regions and groups. A relation's end may also name a block and a port it wears, its own or its definition's chain's (`Gateway::routes`), or a bare port of the file's block (`requests`): the line joins the block, at that port |
| **packages** | `packages` lists what the file uses: a catalogue name, or `./path` to a package file or source folder relative to the file. `base` is always loaded. A type nothing loaded holds — a package that would not load among them — becomes a plain definition where the collection lands, as a card source's does, and is said |
| **uses, never changes** | a file uses packages' definitions and structure, or states its own. Adding to a package is publishing a new one |
| **ports** | a block's `ports`: names, or maps of `name`, `type` (an interface definition), `flow`, `side`, `at`, `description` and `note` — a note written on a port is tied to it. A seat is `side` with `at`; one without the other is not kept |
| **grids by header** | `cols` and `rows` list a grid's headers; a member's `cell` names its row and column headers, or numbers them; the grid's extent is worked out from its cells |
| **collected, one way** | a file's block lands in the folder its directory makes and records `source`; a top directory holding nothing but definitions files them. **A directory named as a file beside it is that file's block** (`shop.yaml` and `shop/`): the files in it are its parts, so the folders on disk read as the composition. Under it, a directory named as a block the file writes at its top (`customer-facing/` for *Customer facing*) puts its files in that block — a region's or group's members. A markdown card a block names by `source` is read into that block. The file is changed and collected again; nothing made from it is written back |

| Short form | Means |
|---|---|
| a string in `blocks` | a block of that name, typed `block` |
| `type: [names]` in `blocks` | one block per name, of that type |
| any other map in `blocks` | the long form |
| `note: text` on a block | a note beside it, tied to it |
| `note: text` on the file | an untied note, floating beside everything its layer holds |
| an unknown key on a block | a value answering the attribute of that name |
| `A -> B`, `A -> B: name` | a line, named by its value |
| `type: [edges]` in `relations` | one line per edge, of that relation type |
| `->` · `<-` · `<->` · `--` | `line.dir` forward, back, both, none; stored only where it differs from the type's |

## Navigation

**The explorer browses; the canvas draws what was opened.**

- the explorer is a **section chain**: each section holds one context and the next lists what it holds. mndmap: source folder → document, the package fixed and hidden
- **mndflow's two sections, library first**, both folded until opened, each with one purpose:

| Section | Purpose | Lists |
|---|---|---|
| **library** | what you build with | every package, `base` first: its definitions in their folders, **each definition's parts under it**, then its *types* and *tags*, each a group folded until opened |
| **model** | what you are building | usages only: structure outside every definition, under the packages and folders on the way to it; a package holding none does not list |

- **sections never cascade**: choosing a row in one section never folds or unfolds another, and never changes what it lists. Only the canvas's own layer, and a pick inside it, open the way to them, once each, in the section the canvas shows. A definition lists in the library only, so no section decides how it opens
- **add makes what its section lists**: in the model, a plain block under the picked row, or under the package root; in the library, a definition — and, with a definition or a part of one in focus, **a part in it**. Never in a frozen package
- **browse**: choosing a row selects it and the tray shows it. **Inside the structure the canvas draws, the canvas follows**: it goes to the layer the block is drawn on and picks it there. Browsing anywhere else never moves it
- **focus is lit**: a subtle wash on the row of the block the canvas draws and every row under it, the accent's edge on its own row too, and a strong wash on the selected row and its card
- **trees start folded**: every branch is shut until opened, and the way to the open layer and to a new pick opens once. `base` lists first among the packages
- **every section reads the `parent` tree alike**: what holds branches; notation and interfaces do not list, though notation's definitions do, and what a group or region holds lists at its level
- **a row says what its card says**: its icon is the card's, and a structure root wears the card's structure mark, in both sections. That is the workspace, always, and a definition that holds structure. A folder does not
- **open**: Enter, double-click or →. **Opening goes in**, whatever view the section was shown in: a block opens on its own layer view where it has something to draw, a definition as its usages do — anything else is picked where the canvas draws it; a package root holding both kinds draws what the section it was opened from lists; a folder zooms to its box. The canvas starts on the workspace root, as opened from the model. ← and Backspace leave, staying in the section: up to what holds the layer. A package leaves for the package view
- highlighting and crumbs show the canvas's context, never what is browsed. **Crumbs read the explorer's path**: the section, then the package, every folder and block on the way, down to the layer — never notation. A whole section's crumbs are the section alone. The view is the rail's to say, never the crumbs'. The way up leads them. **They never wrap or squeeze**: across the canvas's width, and where they would run over, the steps after the section fold into one `…`, outermost first, so the layer and what holds it stay readable; the `…` names what it folds and goes to the innermost of them
- selecting in the package view selects and the sections follow
- **one navigation**: core's `open_at`, `leave_at`, `reveal_at` and `held_at` decide where the canvas goes and what the sections hold. Both apps call them and decide nothing of their own
- a definition dragged from any package onto the canvas lands in the opened structure
- a usage's row lists its definition's blocks, then its own children, folded by default, in the model as in the library. A part is its definition's, so choosing its row never moves the canvas unless the usage is the layer it draws on. Those parts are marked on row and card (dimmed, a link glyph, "from `D`") and carry their route (`usage/block`), so two usages of one definition light apart
- opening a marked row goes to its definition with the block picked; opening a usage's own row opens the usage


## Motion

**Motion is how a perspective shows what moves and where you went.** Not built yet.

- **flows animate**: data and logic travel along their relations, in their direction
- **navigation animates**: open, leave and reveal carry the eye from one component to the related one rather than cutting to it
- motion is derived from the model, like everything else drawn; nothing is hand-keyed


## Translation

**A system is brought in by a translator, never by bending the model.**

- a **translator** is a project reading or writing a graph through the kit, with a package of its own. It ships definitions, never a module
- ids are minted once and kept in the translator's map, never derived from source text. `source` records where content lives outside; nothing syncs to it
- **round-tripping is the goal**: a system translated in and written back out loses nothing the model can say — a struct or class as a block definition, an enum or alias as a type, a function as a block with interfaces. Writing out never syncs: it writes new files
- a consumer edits the graph as data; only general schema changes land in mndflow, never a consumer's feature

**mndmap is the first translator**: markdown in, through a **markdown package** (`markdown.json`) that says what a heading, table, list or fence *is*. The parser stays general; the package carries the meaning.

- a scan records names and `source` paths only; no text enters the graph
- the host keeps the session's file handles by `source`. Opening a document reads its current text and parses it into structure
- which documents are read is session state, never a field
- `body` holds what was read, never unread text: a block's content. **`description` is a line saying what a block or a definition is for**, shown on hover and in the tray
- a document is a **usage** in the source folder's domain, typed `md.document` or by its frontmatter; its content blocks are its own children
- a document's frontmatter is its card source; a table in it is a content block, never a grid
- the page draws a document's content with the large face, at the sizes the markdown package's definitions say; the kit's layouts place them
- a source folder draws as the same package view: its one package, folders as boxes
- a heading's section is a block holding its heading, content and own sections: a level in the explorer, read whole in the package view, which is how a document opens. The markdown package organizes its own definitions by folders


## Architecture

**Rules live in packages; apps bind ports.** The detail is in spec.md.

- **the one law**: dependencies run one way, and only `core` may name a closed set
- **the loop**: a gesture returns an action name, the app runs it, it returns mutations, the app appends them. If an app turns out to be interesting, a seam is in the wrong place
- **one rule, one home**: if changing one behaviour means editing more than one package, or both apps, the rule has no home
- **design first, test second**: driving both apps against the shipped samples is the acceptance test


## Open

| Question | |
|---|---|
| **what drives a flow** | relation direction, grid reading order, or a behaviour of its own; and whether a flow is a perspective or an overlay |
| **the agent surface** | whether every CLI verb reads and writes JSON, and whether actions are reachable by name from the CLI |
| **the next translator** | code or hardware, and what its package names |
| **the drag round trip** | dragging a definition from another package into the open structure means leaving the structure in the explorer. Whether a definitions palette stays put beside it |
