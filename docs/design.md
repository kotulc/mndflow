# Design

**Why mndflow and mndmap are the way they are, and the rules that follow from it.** Authoritative: where another document disagrees, this one wins. Words are defined in definitions.md; what crosses packages is in spec.md; where code should live is in simplification-plan.md.


## Vision

**Rapid visual modeling tools for understanding complex systems.** A document set, a codebase, a piece of hardware — any existing system — translated into blocks a person explores from several perspectives: the block diagram of each layer, and the section slices the explorer cuts through the same tree.

| Tool | Is |
|---|---|
| **mndflow** | the editor: compose, define and rearrange a model. Also the kit every host is built on |
| **mndmap** | the viewer: a markdown collection read into blocks and explored. Built on the kit as shipped |

| Principle | Means |
|---|---|
| **understanding is the purpose** | the end user is a person exploring a visual translation of a system that already exists. Building a model is the means, not the end |
| **agent and data first** | every element, package, workspace and setting is JSON; a card's content is markdown. The CLI does headless what the app does, in formats an agent reads and writes. The apps call no model: agents and translators work through files and the CLI |
| **motion communicates** | data and logic flows animate along their relations, and moving between related components animates, so a person sees what moves and never loses their place |
| **no notation to learn** | the parts, what they are made of, what flows between them and what must be true is the whole base model. A standard is a translation layer on top, never a shape the model bends to |
| **rapid** | the cheapest gesture carries meaning: ten blocks in a row already say an order |
| **general** | nothing is forbidden for being unusual. Where a choice could be enforced or left to the user, it is left to the user |


## Driving concepts

Most rules below are one of these applied.

| # | Concept | In short |
|---|---|---|
| 1 | **Everything is a block** | two element kinds, block and relationship. A package, a definition, a folder and a note are all blocks; `parent` is the only containment |
| 2 | **Role from position** | package, definition, usage, holder, tree, domain and structure are read from where a block sits, never stored |
| 3 | **Define once, read through** | a usage reads its definition's structure one step; settings and traits inherit along one `type` chain, structure never does |
| 4 | **Few hard rules** | only incoherence is refused. Settings and traits say what a kind may do |
| 5 | **Derive, don't annotate** | layers, routes, roles, seats, marks and allocation are worked out on every draw. A user states as little as possible |
| 6 | **Perspectives** | a layer drawn is one perspective; the explorer's sections slice the same tree. A projection returns data, never elements |
| 7 | **Browse, then open** | the explorer browses; the canvas draws what was opened. One navigation for both apps |
| 8 | **Data in, data out** | in a session the log is the truth; a file is state, never history; everything is JSON |
| 9 | **One rule, one home** | dependencies run one way, only core closes a set, apps bind ports and add no behaviour. A rule written in two places has no home |


## The model

### Placement

- a definition never sits inside a definition; it may sit in holders however deep and is still a tree of its package
- a usage may sit in a domain, as a tree of its own
- holders, notes and references may sit anywhere
- no block contains itself: the tree terminates

### Holders

- **`parent` is the only containment.** Folder, grid and group hold by it alike and differ only in how they draw what they hold: hidden, in cells on a canvas of its own, or inline
- a folder and a grid hide their contents (descend to see them) unless a view flattens them; a group draws its inline
- **the explorer lists the `parent` tree**: whatever holds lists as a row and branches. A group is the one exception: it has no row, and what it holds lists at its level
- folders organizing what is not structure (definitions, documents) is this app's convention, never a rule
- **a group is layer-local**: it organizes the layer it sits on, is drawn and edited on the canvas only, and is never a place you go
- what holds and how it nests are traits: `container` lets a block hold; `inline` draws what it holds in place (a group); `matrix` seats it in cells and opens as a grid view (a grid). `base` keeps `group` and `grid` as ready-made definitions carrying them
- a definition always draws as a card; its structure is reached by descending
- the layer a block draws on is its nearest ancestor that hides its contents
- deleting a holder deletes its subtree

### The grid

**Pure allocation: a lattice whose cells hold blocks, and the one place a position states meaning.** A cell address along the reading direction is an order, and a header is an allocation — both stated rather than guessed. A grid carries nothing special: an extent, header lines and merges, and blocks seated in its cells.

- outside, a grid is a card like any other; opened, it draws its **grid view**: a frame of card-sized cells, with narrower header lines along its edges
- every grid has a header row and a header column; opened, each header is its line's tab: pointing at it lights the line, a click picks it, and the right button offers what may be done to the line
- a cell or header holds one block. Two sharing one leaves *what is allocated here* without an answer. A grid's member always sits in a cell
- **there are no text labels**: typing into an empty cell or header makes a plain block named what was typed, which reads as a label because its small face is its name. A header is a role from position, never stored
- double-clicking a cell or header opens the block in it as anywhere, or names a new one in an empty cell; right-clicking a cell makes a block in it; dragging a block onto either seats it there
- any block may sit in a cell, holders and grids included; it draws as a card, compact in a header
- a block dropped on a grid's card from outside takes the next free cell in reading order, adding a row when none is free
- reading order is left to right, then down
- the frame grows and shrinks by its handles, as a grid on a layer does
- relationships enter and leave a grid through its interfaces, as on any layer
- removing a line moves what it held to the nearest spare cell on its side; what has nowhere to go leaves the grid for its layer
- allocation is derived, never stored: a body block is allocated to what its row and column headers stand for, and to every holder it sits in
- records — rows of values answering a definition's attributes — are not a grid's: they are usages, or a table in a card's body

### Types and read-through

- **`type` is one chain**: on a usage, what it is; on a definition, what it extends. It names one above: never itself, never one that extends it. Refused at the gesture; `isa` guards loaded files
- a chain ends at a base: a definition extending nothing extends `block`, and reads as it does
- own values only: inherited values are resolved on read, never copied
- precedence, per link of the chain, self first: its own settings, then its traits in order. Nearest wins
- a trait confers its own settings and those of the traits it extends, never its base's: how a tag draws is not what it gives
- traits are inherited until a subtype states its own set; then its set is the only one. Reset gives it back to the chain
- structure is a definition's own and is never inherited
- a usage reads through one step: its type's own structure, never a chain
- edits go home: changing a part through a usage edits the definition that owns it
- **a definition never uses itself**: no usage typed by it, by exact type, at any depth of its own structure (`D` may hold an `S` where `S extends D`). Refused at every gesture that makes or retypes a usage; reported by `review` in loaded data. Checked directly only, for now: `D` holding an `E` that holds a `D` is not checked

### Kinds, capabilities and relations

- **`base` enumerates the functionally distinct kinds and stays minimal**: `block`, `folder`, `group`, `grid`, `reference`, `interface`, `note`, `tag`, `value`, `line`, `tie`. Kinds are data; engine modules are three (`block`, `reference`, `interface`)
- **traits say what a kind may do, and absent is a no**: a capability nobody grants is refused at the gesture. The base kinds carry the traits that make them what they are
- trait names are positive, each a capability granted: `container`, `ports`, `inline`, `matrix`, `headed`, `resizable`, `content`, `media`, `tied`
- a trait grants a capability whole. Limiting one to definitions, and asking what values must say, is a constraint (`allows` lists, `degree`, `ends`, `expects`): kept as settings, to be reworked
- which holder a block is: a folder by its base; a group or grid by its `inline` and `matrix` traits
- a capability is added to or removed from a subtype as a trait, easily and visibly. Traits are stored in `traits`, apart from `tags`: a trait carries settings, a tag only organizes
- `note` is a base carrying the tied, resizable and body-content traits
- **a trait gives settings: a capability, a style, or both.** A style preset is a trait carrying only `style`, dropped on a definition like any other; there is no second list
- relations and tags hold no structure. A tag is a definition with no structure, carried in `tags`
- a tag definition draws as a block. Tags read alike, each in its own shade: the `tag` base sets a hue and `vary`, so each definition under it strays a little, keyed by its id
- `tie` is a relation type like any other, chosen and never forced
- a **tie trait** links a block made from, or dropped on, another block to it with a relation of a given type, on the same layer. Made on its own, it links nothing
- definitions are never linked, except by a tie trait (a note tied to a definition)
- one name space per package: a tag, a trait and a block definition never share a name
- a reference points at what it stands for, and nothing points back. A gone target reads missing and is kept

### Interfaces and lines

- **an interface is a light block, a part of its owner**: a name, a type, a flow (`in`, `out`, `both`; absent is both), tags and settings. It holds nothing, has no interfaces, no cell and no size, and lists in the explorer only as a definition. It is an interface by its type chain, not by a field
- **auto or placed**: an interface with no `side` and `at` is auto: on every draw it sits on the face most of its lines look out of, at the free seat nearest the middle — the middle itself while no line meets that face. One with both is placed: it keeps its seat, the middle included, and no line lands there
- **a line leaves the middle of the face looking at its other end**: every line on a face shares that anchor; where a placed interface holds the middle, the anchor is the free seat nearest it. Placing an interface is the only way to move an end
- **a run is straight, or a Z**: lines sharing an anchor run as one trunk to a fan point — halfway across the gap to the nearest card they reach — and split there. A Z's cross leg sits at the busier end's fan point
- **lines draw under cards**: a run never detours round a card it does not end on
- **several lines between one pair overlap** unless an interface is placed to part them
- **in an internal view a line ends at the frame**: it leaves the card's face nearest a wall and runs straight to it. The layer's auto interfaces sit straight across from the card they link; a placed one keeps its seat, and its line may Z
- **a tie runs straight**: where two cards face each other squarely, across the gap at the middle of where their faces overlap, unless a line or interface already meets the face there; otherwise from nearest corner to nearest corner. It shares no anchor and never fans; overlapping cards draw no tie
- a line's name sits on its own leg, past the fan point, never on a shared trunk

### Attributes and types

**A definition declares attributes; a usage answers them.** An entity is nothing new: a definition with attributes, as an ERD draws one.

- an **attribute** is a definition's own: a name, a `type`, and what it may say beside — `key`, `default`, `unit`, `many`, `optional`, `note`, and any other property kept as written. Inherited along the chain, nearer replacing farther by name
- a **value** is a usage's answer to an attribute, by name. Its type is the attribute's, never stored beside it. A usage may answer names nothing declares, as its own
- **a type is a definition.** `base` ships the value types under the `value` kind — `text`, `number`, `flag`, `link`, `choice` — and a workspace or package adds its own (`uuid extends text`, `Region extends choice`). How a value is edited is its type's `value.form`, engine code as a module is; a choice's options are its `value.choices`
- **an attribute typed by a block definition is a link**: a foreign key. Its line is drawn only where a view allows it — the internal view, both ends on the layer — and never added on its own anywhere else
- **used by** is derived for every type and entity: the attributes and usages typed by it, as allocation is
- a value type is never placed: it is what an attribute holds

### Definitions and packages

- a package is a root block. `base` ships with the kit, the workspace's is editable, any other is frozen (read only)
- a definition is named; new definitions land where the user is
- removing a used definition is refused. `base` and the workspace are never removed; a used package is not removed
- a new workspace is its root and `main`, nothing else; groupings are the user's
- **definitions are JSON; structure may be markdown.** Every package, `base` and `markdown` included, is a `.json` file of definitions; a package may also hold a tree of markdown files, each a usage pointing at a definition. Hosts keep only the id constants their code reads
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
- **two system views** draw the whole system, both trees at once — every package's definitions, and each definition's top-level structure: **package** from above, each block that holds flattened into a box of its contents; **profile** from the side, one row per level along the pick. They are the rail's only views: choosing one leaves the open layer for the whole system, and the explorer follows
- **layer views** draw one block, and **the card's kind says which**, worked out on every draw and never stored. They are never chosen:

| Card | Opens on | Draws |
|---|---|---|
| a definition | **definition** | the definition at full size in the middle, what describes it in boxes round it |
| a grid | **grid** | its lattice |
| a package or a folder | **folder** | what it holds, the page fitted to its content's width and scrolled down |
| a block with structure, or room to hold | **internal** | what it holds, as cards; empty, to be built |
| a stand-in | what it stands for | that block's own view |
| a leaf or a note | nothing | revealed where it is |

- the **definition view** draws its definition large in the middle. Above it, what it extends, joined by an extends line; to its left and right, its input and output ports in a box each; directly below it, ports flowing both ways; below those, its tags and its traits in a box each. Only boxes with something in them draw, each joined to the middle card by a plain line. A note at the top right says what the definition is for: its body
- **editing the definition view edits the definition**: a definition dropped there is attached — a trait to its traits, a tag to its tags — and one deleted from its box is detached; ports are added on the middle card and deleted from their boxes; the note writes its body. What it extends is set in the tray
- an empty layer says why it is empty, never a blank canvas
- the package view draws every package top-down in the explorer's order, each a box hugging its domain, folders flattened, definitions at their own size, the page scrolled down and never zoomed out. **A definition holding structure is a box of its top-level blocks**, each a card standing for what lies below it — never deeper, so the system view stays readable
- the profile is the system seen from the side: **one row per level**, top to bottom — every package, then what each block on the way to the pick holds, and last what the pick holds — each row named for what holds it. **The only lines run from each block on the way down to the row it holds**, pointing down; never one block to another
- opening a package or folder draws its folder view, a definition its definition view. In a structure, opening a folder or grid descends into it, since it hides what it holds. A group, picked on the canvas, is revealed in place and the explorer lights the nearest row that lists it. A note, which may hold nothing, is revealed too
- a layer's **layout** is a setting, `layout: { kind, … }`, said by its definition and overridable by the block, inherited like any setting. The kit ships `free`, `auto` and `page`, which is how the package view and the profile lay out; an unknown kind draws as `auto`
- **`auto` is what nobody said.** Everything follows in reading order, as wide as the page layout's — the canvas's width in cards — and reads down the page like a folder. **A line never moves a card**: a note made tied to a block is ordered right after it, once, when it is made; *arrange* reorders a layer once, on request, so related blocks — and notes by their blocks — read side by side. Moving a card by hand hands the layer to `free`, keeping every place
- **every layout but `free` is a row/column grid**: each unit takes a cell; a card sits in the middle of its cell's width, so middles down a column line up whatever its size. Cell edges sit on the guides, 3 units apart; a group, a room, a page's box and a grid's cell keep 1 unit of air round what they hold
- **auto and pages flow onto standard columns**: units take columns a default card wide in reading order; one wider spans as many as it needs, centred across them, and each row is as tall as its tallest, every unit at its top, so the rest keep a regular grid
- **a row and its card read alike**: the explorer and the canvas ask core's `role_of` what a block is, and wear the same icon
- **system marks say what a card stands for**, never how it opens — the icon says that. At most three, stacked in this order: the word for what a stand-in stands in for (`Def`, `Ref`, `Pkg`), **structure** (the tree mark) on a definition holding structure — never a block inside one, a package or a folder, so a definition with structure reads apart from one without — **data** (the database mark) where it carries attributes or values. A stand-in wears its target's structure and data
- **a layer draws its key**: what each kind's colour, mark and word mean. The workspace sets the default; a layer may override it


## Cards

**A card is drawn by one renderer everywhere** — the canvas, the tray, mndmap — and what it shows beyond its identity is its attributes as a table and its content as rendered markdown.

- **two faces.** The **small** face is the workspace's card size: its handle above its name, its icon and its marks, nothing more. The **large** face fits its content, or takes its definition's `card.size`, held under a preset maximum: its name, then the parts its definition lists in `card.shows` — `attributes`, `body`, `preview`
- **attributes draw as one ruled table**, from data, never markdown: the name is its top row, with the icon at its right; the marks end the last row; the card's border is the table's; columns are type, name, then key, value and note where any row says one. Column widths are worked out once in views and used both to size the card and to draw it. **A table card is sized by its table**, exactly, never rounded to units. A body shown under the table is markdown
- **the face is the view's, never the zoom's**: a canvas draws small unless a layer's `layout.face` asks for large; the tray draws a block large, then small. A face is laid out at its size from the start, so nothing reflows
- **the tray asks every element the same questions, in one order**: what it is, how it draws, what it carries, what it lists. A card and a line share one first tab, named for what is drawn, laid out as the settings tab is — the drawing left, identity right, the source under both, the definition read only under all. **Every tab draws the element in hand**: a usage's settings tab draws the usage wearing its definition's settings, never the definition
- `card.name: hide` leaves the large face its parts alone; the small face always names
- **a card's markdown is its source**: frontmatter for its identity and values, then its body. The JSON graph is the truth; the markdown is rendered from it, and read back into ordinary changes

### Card sources

**Markdown is content: structure and usages.** A definition is never written in markdown.

| Frontmatter key | On a usage |
|---|---|
| `name` | its name |
| `type` | the definition it is, by name |
| `tags` | its tags, by name |
| `source` | where its content lives outside |
| anything else | a value, answering the attribute of that name |

- the body after the frontmatter is the block's `body`, kept as written. Tables in it are content, never parsed into values
- **attach** copies a file's markdown onto a block and records `source`; **refresh** is the same gesture asked again. Nothing syncs
- **permissive**: a name in frontmatter that nothing loaded holds, or that more than one package holds, becomes a plain definition where the card lands, and is reported
- **a collection is a package on disk**: a folder holding `package.json` (definitions) and a tree of `.md` files (usages), each folder a folder holder. Importing one adds it frozen. A definition its usages name and nothing defines is made, its attributes the union of their keys, each type read off the values; a JSON definition wins over anything inferred


## Navigation

**The explorer browses; the canvas draws what was opened.**

- the explorer is a **section chain**: each section holds one context and the next lists what it holds. mndmap: collection → document, the package fixed and hidden
- **mndflow's two sections stand apart**: definitions lists every package, a top row each, folded until opened; **structure always lists every definition holding structure**, in every loaded package, whatever definitions holds. Choosing a definition opens its tree in structure, never changes what structure lists. A definition opened to be built lists there while the canvas is inside it
- **browse**: choosing a row selects it and the tray shows it. **Inside the structure the canvas draws, the canvas follows**: it goes to the layer the block is drawn on and picks it there. Browsing anywhere else never moves it
- **focus is lit**: a subtle wash on the row of the block the canvas draws and every row under it, the accent's edge on its own row too, and a strong wash on the selected row and its card
- **trees start folded**: every branch is shut until opened, and the way to the open layer and to a new pick opens once. `base` lists first among the packages
- **every section reads the `parent` tree alike**: what holds branches; a group does not list, and what it holds lists at its level
- **a row says what its card says**: its icon is the card's, and a definition's row holding structure wears the card's structure mark
- **open**: Enter, double-click or →. **Opening goes in**, whatever view the section was shown in: a block opens on its own layer view; a definition opened again, or from the structure section, opens on its structure. ← and Backspace leave; a definition's structure leaves for its definition view, a package for the package view
- highlighting and crumbs show the canvas's context, never what is browsed. **Crumbs name layers only**, from the tree the layer is in — never the package and folders above it — then the view drawn
- selecting in the package view selects and the sections follow
- **one navigation**: core's `open_at`, `leave_at`, `reveal_at` and `held_at` decide where the canvas goes and what the sections hold. Both apps call them and decide nothing of their own
- a definition dragged from any package onto the canvas lands in the opened structure
- a usage's row lists its definition's blocks, then its own children, folded by default. Those parts are marked on row and card (dimmed, a link glyph, "from `D`") and carry their route (`usage/block`), so two usages of one definition light apart
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
- translating out is one way and never writes back
- a consumer edits the graph as data; only general schema changes land in mndflow, never a consumer's feature

**mndmap is the first translator**: markdown in, through a **markdown package** (`markdown.json`) that says what a heading, table, list or fence *is*. The parser stays general; the package carries the meaning.

- a scan records names and `source` paths only; no text enters the graph
- the host keeps the session's file handles by `source`. Opening a document reads its current text and parses it into structure
- which documents are read is session state, never a field
- `body` holds what was read, never unread text: a block's body is its content, a definition's describes it
- a document is a **usage** in the collection's domain, typed `md.document` or by its frontmatter; its content blocks are its own children
- a document's frontmatter is its card source; a table in it is a content block, never a grid
- the page draws a document's content with the large face, at the sizes the markdown package's definitions say; the kit's layouts place them
- a collection is the same package view: its one package, folders flattened
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
| ***view*** | "canvas view" names the system views and the layer views; a data perspective (table, matrix, sequence) still wants a word |
| **the drag round trip** | dragging a definition from another package into the open structure means leaving the structure in the explorer. Whether a definitions palette stays put beside it |
