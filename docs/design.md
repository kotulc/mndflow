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
| **agent and data first** | every element, package, workspace and setting is JSON. The CLI does headless what the app does, in formats an agent reads and writes. The apps call no model: agents and translators work through files and the CLI |
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

- **`parent` is the only containment.** Folder, group and grid hold by it alike and differ only in how they draw what they hold: hidden, inline, or in cells
- a folder hides its contents (descend to see them); a group and a grid draw theirs inline
- **a group or grid is layer-local**: it organizes the layer it sits on and is never a place you go. Opening one reveals it where it is seen
- what holds and how it nests are traits: `container` lets a block hold; `inline` draws what it holds in place (a group); `matrix` seats it in cells (a grid). `base` keeps `group` and `grid` as ready-made definitions carrying them
- a definition always draws as a card; its structure is reached by descending
- the layer a block draws on is its nearest ancestor that hides its contents
- deleting a holder deletes its subtree

### The grid

**The one place a position states meaning.** A cell address along the reading direction is an order, and a header is an allocation — both stated rather than guessed.

- anything in a cell draws compact, so any block may sit in one, holders and grids included; a header holds any block
- one block a cell: two sharing one leaves *what is allocated here* without an answer. A grid's member always sits in a cell
- reading order is left to right, then down
- a block dropped past the last line lands free beside the grid; a grid never grows by accident
- removing a line moves what it held to the nearest spare cell on its side; what has nowhere to go leaves the grid
- allocation is derived, never stored: a body block is allocated to what its row and column headers stand for, and to every holder it sits in

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

- **`base` enumerates the functionally distinct kinds and stays minimal**: `block`, `folder`, `group`, `grid`, `reference`, `interface`, `note`, `tag`, `line`, `tie`. Kinds are data; engine modules are three (`block`, `reference`, `interface`)
- **traits say what a kind may do, and absent is a no**: a capability nobody grants is refused at the gesture. The base kinds carry the traits that make them what they are
- trait names are positive, each a capability granted: `container`, `ports`, `inline`, `matrix`, `headed`, `resizable`, `fitted`, `content`, `media`, `tied`
- a trait grants a capability whole. Limiting one to definitions, and asking what values must say, is a constraint (`allows` lists, `degree`, `ends`, `expects`): kept as settings, to be reworked
- which holder a block is: a folder by its base; a group or grid by its `inline` and `matrix` traits
- a capability is added to or removed from a subtype as a trait, easily and visibly. Traits are stored in `traits`, apart from `tags`: a trait carries settings, a tag only organizes
- `note` is a base carrying the tied, resizable and body-content traits
- relations and tags hold no structure. A tag is a definition with no structure, carried in `tags`
- a tag definition draws as a block. Tags read alike, each in its own shade: the `tag` base sets a hue and `vary`, so each definition under it strays a little, keyed by its id
- `tie` is a relation type like any other, chosen and never forced
- a **tie trait** links a block made from, or dropped on, another block to it with a relation of a given type, on the same layer. Made on its own, it links nothing
- definitions are never linked, except by a tie trait (a note tied to a definition)
- one name space per package: a tag, a trait and a block definition never share a name
- a reference points at what it stands for, and nothing points back. A gone target reads missing and is kept

### Definitions and packages

- a package is a root block. `base` ships with the kit, the workspace's is editable, any other is frozen (read only)
- a definition is named; new definitions land where the user is
- removing a used definition is refused. `base` and the workspace are never removed; a used package is not removed
- a new workspace is its root and `main`, nothing else; groupings are the user's
- every package, `base` and `markdown` included, is a `.json` file. Hosts keep only the id constants their code reads
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
- **two canvas views**: the **overview** while nothing is open (`layer: null`), and the **structure** of the tree opened
- the overview draws every package top-down in the explorer's order, each a full-width box of its domain, folders flattened, definitions at their own size, the page scrolled down and never zoomed out. It is 1:1 with the packages and definitions sections
- there is no package view: opening a package, or a holder in a domain, focuses its box in the overview. In a structure, opening a folder descends into it, since it hides what it holds; a group or grid draws inline, so opening one reveals it in place and the canvas pans to it. A note, which may hold nothing, is revealed too
- a layer's **layout** is a setting, `layout: { kind, … }`, said by its definition and overridable by the block, inherited like any setting. The kit ships `free`, `auto`, `outline` and `page`; an unknown kind draws as `auto`
- **a row and its card read alike**: the explorer and the canvas ask core's `role_of` what a block is, and wear the same icon
- **marks describe, and stack**: a stand-in wears one word (`Def`, `Ref`, `Pkg`); anything else wears what is true of it, and those stack — the first is `data`
- **a layer draws its key**: what each kind's colour, mark and word mean. The workspace sets the default; a layer may override it
- **a block's fields draw as a class diagram** on request: one card for the definition, one per usage with its values, drawn in place of the layer and never written


## Navigation

**The explorer browses; the canvas draws what was opened.**

- the explorer is a **section chain**: each section holds one context and the next lists what it holds. mndflow: packages → definitions → structure. mndmap: collection → document, the package fixed and hidden
- **browse**: choosing a row selects it and the tray shows it; the canvas stays
- **every section reads holders alike**: what a group or grid holds lists at its level beneath its row, with no branch of its own, joined to it by a line down their marks' column. Their own children branch as usual
- **open**: Enter, double-click or →. ← and Backspace leave; leaving a tree's top returns to the overview, focused on it
- highlighting and crumbs show the canvas's context, never what is browsed
- selecting in the overview selects and the sections follow; opening a tree there opens its structure
- picking within the opened tree may move the canvas to the pick's layer (reveal); browsing outside it never does
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
- `body` is a description only, never unread text
- a collection is the same overview: its one package, folders flattened


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
| **the agent surface** | whether every CLI verb reads and writes JSON, and whether actions are reachable by name from the CLI as from the terminal |
| **the next translator** | code or hardware, and what its package names |
| ***view*** | "canvas view" names the overview and structure; a data perspective (table, matrix, sequence) still wants a word |
| **nested groups in the explorer** | a group inside a group lists at the same depth, so mndmap's sections read as one flat run rather than an outline. Whether a nested holder indents one step |
