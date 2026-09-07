# Definitions

**The canonical vocabulary.** One entry per term, so a rule written anywhere else reads without guessing. Where any other document uses a word, this is what it means.


## The one shape

**Everything is a block.** Two element kinds exist — a block and a relationship — and every other noun in the model is a block with a different type. There is no closed set of element sorts. What a block *is* comes from its definition; what the engine does with it comes from what it holds and how its definition says to draw it.

| Term | Means |
|---|---|
| **block** | the one element. Placed, drawn, carries fields, holds other blocks. Held in `graph.blocks` |
| **part** | a child the block **owns**. The tree is `parent` and nothing else; deleting the whole deletes it |
| **reference** | a child that **stands for a block living elsewhere** — another layer, another tree. It appears, it is not owned, and it shows the real block's name. A gone target reads **missing** and is kept rather than tidied away. `of` holds the target |
| **relationship** | a join between **exactly two** blocks. Not a block: placed by its ends, drawn as a line, joins rather than sits. Names a **relation module**. Held in `graph.edges` |
| **field** | a named, typed value on a block or a relationship. Never structural, and it has no identity — a field is addressed by name on its holder |
| **definition** | a reusable subtype: a name, the fields its usages carry, how they draw, and what they may hold. Held in `graph.defs`, **one id space with blocks and relationships**, filed under a block by `home`, and grouped by what it describes — **block**, **relation** |
| **type** | the definition a block or relationship names. Open, and the user's |
| **usage** | anything naming a definition in its `type`. The definition declares; the usage holds the values it gives |

**A reference is drawn; a link is not.** That is the whole difference between a reference block and a `link` field. A reference occupies space, takes relationships and sits in a layer; a link is a value inside a field, pointing without appearing.

**Ownership, not distance, is what separates a part from a reference**: a part is in the tree, a reference names something the tree does not compose.

**And one more thing a block can do with a child: contain it without owning it.** The workspace and a folder both do this — their children are **independent roots**, so deleting the container never deletes what it held. It is derived and nothing is stored: *contained* is *the child is a top-level block*, and *owned* is everything else.


## The block modules

**A block module is engine code behind one sort of block** — its configuration surface, and what the engine does with it. **Open**: a code change ships one more, additively. The shipped, locked `base` package carries **one definition per module**, and everything a user or a package defines **extends** one of them.

**Two layers, and the split is the old one**: a module is **code**, a definition is **data**. A package may subtype any base definition freely and may never add a module — which is what keeps *define every object and relation through data alone* true for vocabulary while leaving genuinely new behaviour to code.

| Module | Holds | Is |
|---|---|---|
| **folder** | folders and top-level blocks — **contained, never owned** | the organizational unit. **The workspace is the root folder** |
| **block** | parts and references | the base kind. What there is, and how it is composed |
| **reference** | nothing | a stand-in for a block living elsewhere. `of` is the whole of it |
| **interface** | anything | a block seated on an edge. Also **port** |
| **resource** | a workspace-relative path or link | a file, a script, a data file, an image |
| **group** | any block on its layer | a boundary round a set — a swimlane, a region, a package boundary. A dashed rim, sized from what it holds |
| **grid** | any block, one to a cell | a region of the lattice with an extent — rows, columns, merges. It owns its corner, because an empty one would otherwise be nothing |
| **note** | text | a resource drawn as a card of text |

**Eight, in two families.** `block`, `folder` and `resource` are **open**: they differ in what they are for, and a block is retyped among them freely. `reference`, `interface`, `group`, `grid` and `note` are **derived** — each carries something a change of type cannot invent, so one is arrived at by making one. **There is no doing/being split** — an action and a part are both `block`, and what separates them is the definition each names.

**A group and a grid are two modules, not one with a setting.** They differ in what a member's place *is* — a boundary reads its bounds off wherever its members ended up, a grid says where each member goes — which is a difference in code and not in configuration. What they share is that both **hold**: a block sits in one by `group`, membership is flat, and either may hold the other.

**There is no untyped block.** A block naming no definition is a `block`; the field being absent is how a file stays small. `view` is reserved rather than shipped — it comes back defined, not as a module.

**The rule that keeps this from becoming forms again:** a module supplies **drawing, placement and a configuration surface**. It never answers *what may contain what* — that is a `holds` rule, which is data.

| Term | Means |
|---|---|
| **container** | a block that holds child blocks. Derived from what it holds, so it is how a block *looks*, never what it is |
| **interface** | a block seated on an **edge** — its parent's frame, or any other edge set. Also **port**. **The one anchor for every port-like thing**: a proxy port, a full port, a pin and a constraint parameter are all interfaces. Declared, never derived: it carries `side`, `at` and `flow` instead of `x`/`y`, and `flow` is decorative and constrains nothing |
| **root** | the block that holds every other, under a reserved id. `parent: null` means *in the root layer*. No frame, because a frame is a block seen from inside and the root has no outside |
| **behaviour** | **ordinary description, never a kind of block.** An action or a state is a definition over the one block module, a participant is a reference, and order is a directed relationship or the arrangement |

**The word `port` carries two meanings and they never meet.** In the model a port is an **interface**. In the host contract a **port** is one of the four capabilities an app binds — `storage`, `files`, `net`, `score`. Where either is ambiguous, say *interface* or *host port*.


## What holds what

**A block is a block.** There is no tier walk and no doing/being split, and **the engine states no containment rule at all** — the last one, *a view holds references and never parts*, had only the `view` module to attach to and went out with it. What may contain what is the user's, plus whatever a vocabulary says in `holds`.

| Term | Means |
|---|---|
| **top-level block** | a block whose parent is the workspace or a folder, so it is contained rather than owned. Informally a *project*. Read from position, stored nowhere |

**A reference points at what it stands for, and nothing points back.** Upward is a derived query, asked of the graph, because a stored back-reference would leave an exported subtree pointing at things that did not travel with it.

**Membership is not parenthood.** A block's `parent` says which layer it is in; its `group` says which holder on that layer it sits in. The two are independent and only the first is the tree — which is why a group is dissolved when its last member leaves rather than deleting what it held.


## Layers and looking

| Term | Means |
|---|---|
| **layer** | a block and its direct children — a cross-section of the tree at one block, seen from within. The current **scope** |
| **diagram** | what a layer looks like drawn on the canvas. **There is one way to draw**, so this names no module and nothing chooses between ways |
| **projection** | reading a layer into a Scene. Internal — a code word, not a user word |
| **selection** | what is picked within the layer. Set by clicking. **Cells are picked beside blocks, never among them** — a cell is an address rather than a thing, so it has no id to stand in a selection with |
| **frame** / **wall** / **band** | the open layer's border seen from within, one of its four sides, and the dimmed margin outside it |
| **card** | a block as drawn on the canvas |
| **holder** | a boundary or a grid, asked as one question. **The pair is named once** — what a run may pass through, what a sweep picks, and what a drop must stay clear of are the same question about both |
| **mark** | how a box reads, derived every draw from what a block holds or where it sits — `reference`, `missing`, `note`, `group`, `grid`, `interface`, `container`, `derived`, and on a grid's own cells `cell`, `header`, `merged`. Never a sort of thing |

***View* is reserved, not retired.** It will name a data perspective — a table, a matrix, a sequence — over model data, and it comes back defined. It means nothing today, so it says nothing today.

| Term | Means |
|---|---|
| **arrangement** | **one setting, two values.** `free` is hand placement, rounded to the lattice; `grid` is auto-layout, which ignores stored positions and works out a box for every loose block from the relationships and the sizes. **Model data, held on the layer and in the log**, because how a layer lays out is part of what the layer says. **The four directional values are gone** — they ranked by relationships and read as a picture of the graph rather than of the model |
| **retained placement** | a block's placement is **kept** by every arrangement, and nothing discards it. A computed arrangement replaces where things *draw*, never what you placed, so returning to `free` returns your layout |
| **seat** | a place on a border a line may meet |
| **anchor** | a seat a relationship actually arrives at, with no block behind it. **One per arriving line, never one per side.** Placed by the engine until somebody drags it, and then drawn **solid** to say the position is theirs |
| **promotion** | turning an anchor into an **interface** where it sits — a separate act from moving one, because an interface is a real element with a name and a type |
| **explicit order** | sequence stated by a directed relationship. Read first, and it wins |
| **implied order** | **cut with the directional arrangements.** Neither value carries a reading direction, so nothing infers sequence from position on a layer. **A cell address is the replacement**: inside a grid, where a block sits along the reading direction *is* the order, stated rather than guessed |


## The grid

**A visual spreadsheet for blocks**, and the one place a position carries stated meaning rather than a guess.

| Term | Means |
|---|---|
| **the lattice** | **one set of lines, and it is the backdrop dots.** `UNIT` is one square of the guides. Everything with a place of its own lands on it — a card, a note, a hand drop, a grid's corner — so a block the layer placed and a block seated in a grid line up |
| **cell** | one block plus a gap of air on every side. **Derived, never a block**, and an empty cell is an address nobody claimed. Fixed: never variable, never auto-fit |
| **address** | `cell: {r, c}`, **which rides on the block** — it replaces `x`/`y` for a seated block exactly as `side` and `at` replace them for an interface. An address with no `group` is nothing |
| **extent** | a grid's `rows` and `cols`. What lets an empty grid draw at all, and what a dragged corner sets |
| **merge** | a **cell's** extent, stated on the grid as a `Span` and never on a cell. A merged region is one cell: every address it covers answers with the span's box, and a block in one larger than itself **centres**, because blocks never resize |
| **footprint** | how many cells a block needs, derived from its size. **Distinct from a merge**, which is how big a cell is — the two do not collide |
| **header** | a **promoted** block: it heads the line it sits in, fills its cell, and is drawn on a darker ground. One flag, `header`, and **which line is read from where it sits** |
| **allocation** | **the SysML word.** Every block along the lines a header covers is *allocated to* it — swimlane, lane owner and tag are one construct under one standard name |
| **row × column** | a pair of allocations. What makes an allocation matrix fall out later: rows one domain, columns another, a filled cell allocated to both |

**Which line a header heads is its position, and the rule is one sentence.**

| Sits at | Heads |
|---|---|
| `{0,0}` | **both** — the first row and the first column |
| `{0,c}` | **its column** |
| anywhere else | **its row** |

**So promotion is one gesture with nothing to choose** — promote and demote, and the grid says which line it meant. Nothing is stored but *whether*, which is what keeps allocation honest: the allocation **is** the position, and there is no second field to fall out of step with it the moment a block is dragged.

**`transpose` costs no header code at all.** A lane owner in column 0 lands in row 0 and becomes a column head, because that is what row 0 means. The grid says the same thing turned on its side.

**A header claims its line from where it sits onward**, in the reading direction. A second header further along a row is a **subheader**: what follows it is allocated to both, and what came before it only to the first. The subheader is itself allocated to the header above it, which is what makes the nesting readable. **Only rows nest this way** while row 0 is the one line that heads columns.

**A header labels a line, never a region** — extended by a merge, so a header spanning rows 1–3 heads all three. That is what keeps allocation composable: a cell sits in exactly one row and one column, so it has **at most two headers, one per axis**, which is the whole reason a matrix falls out of a pair of them. A scope reaching down and right instead would compose into an unordered pile, and *what is allocated to this* would need a nesting rule the model does not have.

**The corner is the grid's subject.** A block at `{0,0}` heads both its lines, which are the other headers — so what it names is what the whole grid is about.

**What this gives up, on purpose:** a header cannot label a column from anywhere but row 0, so a second tier of column headings is not sayable. The four things the grid is for — swimlane, lifeline, table, matrix — each want one header row and one header column, which is exactly what this is.

**Allocation is derived from position and stored nowhere.** A block leaving the grid loses it, which is correct — the allocation *was* the position. Durable classification is a field somebody typed, a different thing with a different gesture.

**Allocation has identity.** It is to the header's **block**, not to its label, so two grids headed by the same block mean the same thing and renaming it renames everywhere.

**Overlap is hard inside a grid and assistive outside.** A cell holds one block, which is what lets allocation be derived at all — two blocks sharing a cell and *what is allocated to this row* stops having an answer. Outside, a drop snaps and nudges clear, so `free` stays free.

**Displacement is never destructive.** A layout gesture must not destroy model content — a block may be referenced from other layers, so nothing it holds is ever deleted.

**Removing a line moves what it held rather than dropping it**, into the nearest spare cell, and drops the address only once the grid is genuinely full. Freed outright, a block landed at the foot of the layer with its relationships still attached, which reads as a line coming adrift. **Shrinking an extent and merging over an occupied cell do drop the address** — there the block is on its way out of the grid, not being shuffled within it.

**A grid never grows by accident.** Its extent is what you drew; a block dropped past the last row lands free on the layer beside it.


## The workspace

| Term | Means |
|---|---|
| **workspace** | **the root folder, and there is exactly one.** It contains every top-level block, package and folder without owning any of them, and it holds **the log**, the metadata and **all session state**. It is a block, with `parent: null` and a reserved id, and needed no new schema to be one |
| **graph** | the current state — `root`, `blocks`, `edges` and `defs`. **One graph**, folded from one log, never edited in place |
| **project** | **a word, not a type.** Informally, a top-level block under the workspace root. Read from position, stored nowhere, and nothing in the schema answers to it |
| **the log** | **one log, at the workspace.** One document, one history, so **undo is workspace-wide** and nothing routes a write |
| **session state** | how things were last shown — the open layer, the selection, the explorer fold, the theme, the toggles. **Held outside the log and never in a file**, so opening somebody's workspace does not rearrange your toggles. The test is *is it in the log?* — a block's name is, so it exports and it undoes; whether interfaces show is not, so it does neither. **`arrangement` is the exception that proves the rule**, and it is model data because how a layer reads is part of what it says |
| **package** | **a top-level block you are using rather than writing.** Locked: writes refuse, and the strip offers unlock or fork. Locked is the workspace's word, not the file's |
| **resolution** | how a usage finds its definition: **climb the ancestors, nearest first, to the workspace**. **There is no import list** — position does the whole job, so there is no order to maintain. Two ancestors defining the same name are two definitions and both are offered; nothing shadows, because every usage names an id |
| **`home`** | the block a definition is filed under. **The only stored part of its scope** — who owns it, who may use it, what an export carries and which of two wins all fall out of position |
| **extends** | the definition another refines, by reference. **Subtyping, never overriding**; fields union, and components **cascade per property** — the chain laid down base first, the nearest link with the last word, and the element itself last of all. One parent, so the order is a list rather than a graph and there is no diamond to resolve. A rule naming a definition reaches everything below it |
| **export** | a subtree written out as a file — the block, everything under it, every relationship with both ends inside, and every definition any of them names walked up the `extends` chain. **The workspace export is simply the root folder's** |
| **import** | grafting a file into a layer. **A checkpoint**, so there is no second format and no second reader |


## History

| Term | Means |
|---|---|
| **step** | one user action and every mutation it made, plus whether it is applied or reverted. **One gesture is one step**, however many things it changed |
| **mutation** | a single change within a step. The smallest thing the fold applies, and the set is **closed** |
| **the log** | the ordered steps. The only thing stored, and the source of truth. **Internal** — no step and no mutation is ever offered outside |
| **fold** | rebuilding the graph from empty by replaying every applied step. Why undo needs no inverses: undo flips a status and refolds |
| **checkpoint** | the whole graph as one mutation. Written when the log passes its cap and the oldest steps are dropped, and when a file is imported. Not something anybody did, so it cannot be undone |
| **the door** | the one way in. Every log is checked before it is folded: what can be repaired is, what cannot is dropped rather than folded into a broken graph |
| **fault** | what the door has to say — repaired, or dropped, and why. The user is told once, and a clean log says nothing |
| **derived** | worked out rather than stored — containment, container-ness, a group's members, **a grid's cells and every allocation in it**, the `reference` and `tie` relation modules, seats, routes, and the content hash |


## What a definition configures

| Term | Means |
|---|---|
| **module** | engine code. An *open* module publishes components; a closed one does its job |
| **component** | a capability an open module offers, switched on and shaped by a definition. **Per definition, never per usage** |
| **`components`** | the field on a definition holding one entry per component, keyed by name. **The one place the schema grows** — a new capability adds a key, never a field beside one. A component owns its key, reads no other's, and **validates its own key at the door**, so one absent from the build leaves its configuration *unvalidated* rather than wrong |
| **`block`** | which block module, and that module's own keys |
| **`card`** | which card `layout`, where the label sits, and which fields it `shows` |
| **`style`** | which **slot** (one of six hue families) and which **emphasis**, weight and label step. **Never a colour, a pixel count or a font** — the theme owns the palette and a definition picks within it |
| **`constraints`** / **`rules`** | what a usage needs in itself, and how usages interact |
| **card layout** | one of the standard ways a card is composed — `name`, `type`, `fields`, `compartments`, `icon`. **Open.** **No `shape`**: a definition picking a diamond drew as one on the canvas and as a rectangle in every export, which is a promise one renderer kept and the others could not |
| **`validate` hook** | a module's own check in code, for what the rule kinds cannot say. The escape hatch, and deliberately not a language |

| Kind | Says |
|---|---|
| **`required`** | which of a usage's fields must carry a value. The one **constraint** |
| **`ends`** | which definitions may sit at each end of a relationship definition, and optionally which port direction |
| **`holds`** | which definitions this one may contain. **The only containment rule there is**, and it is data — the engine states none of its own |
| **`degree`** | how many relationships may meet a usage, counted `in` and `out` |
| **`match`** | field names that must agree across a relationship's two ends |

**They advise while modelling and refuse only at translation.** A model is legitimately unfinished, so a violation is a note in the tray; a translator asks the same checks as it emits.


## The surface

The full enumeration is in actions.md.

| Term | Means |
|---|---|
| **action** | something somebody meant and could say — create, relate, group, describe. Named, ranked, listed. Returns mutations rather than applying them |
| **adjustment** | something positional and unsayable. Five, gesture-only, never ranked. A module declares which it accepts |
| **navigation** | an action writing no mutations — `open`, `reveal`. No step, nothing to undo |
| **pin** | filing an element's definition in the workspace's own locked vocabulary folder. **Not a way to save a layer** — the `view` block it used to make is gone. See stories.md |
| **action surface** | the actions the engine publishes as data. The seam both the page and the terminal work against |
| **host port** | one of the four capabilities an app binds — `storage`, `files`, `net`, `score`. **The entire host contract**, declared in core and implemented nowhere else. An unbound port is a capability the app does without, never a feature reimplemented |


## The seam

**What crosses out of this repo, and the vocabulary anything outside it is written in.**

| Term | Means |
|---|---|
| **Scene** | a layer projected: `boxes`, `routes`, `slots`, `hits`, `bounds`, `frame`, `trail`. **Plain data, importing nothing drawable**, which is what makes a notation a pure function |
| **renderer** | anything turning a Scene into something you can look at. Three ship: React, text and SVG |
| **`kit`** | **the one surface mndflow offers anything outside this repo.** The headless stack as one built package, plus one non-editing React `Viewer`. Packed, never published |
| **file** | the graph in an envelope — `{ schema, id, graph, meta }`. **State, never history**: self-describing, readable without replaying anything, and byte-identical when nothing changed. **The only contract the outside gets** |
| **translator** | **an external project that reads or writes a graph through `kit`.** It holds a file and a package, never an internal. Three shapes, and all three are the same two one-way functions with a different side authoritative: a **publisher** reads a source that stays authoritative and emits drawings back into it; a **round-tripper** reads a source, lets the graph be edited, and emits the source form again; an **exporter** reads an authoritative graph and emits a foreign form |
| **reader** | `source → graph`. One way in. It never writes the source |
| **emitter** | `graph → artifact`. One way out. **It never writes the graph** |
| **map** | a translator's committed record of **which block id stands for which source construct**. The only mutable state a translator keeps, and the one place a judgement the source does not determine is written down. **Ids are minted once and remembered, never derived from source text**, so a source refactor is a map diff rather than a graph rewrite |
| **artifact** | what an emitter makes — source, a drawing, or a standard's file. The action that ran it may record a `resource` block; the translator never writes the graph |
| **`source` field** | the one field name a translator and every renderer agree on: a `link` field called `source` becomes a box's link, so a drawn block can point back at where it came from. **Presentation, not identity** — the map holds identity |

**A standard is a translation layer, never a shape the model bends to.** A part property is a block with a parent, a value property is a typed field, a port is an interface, a requirement is a block with two fields. **A notation that cannot be reached this way is a notation this tool does not do**, which is a better answer than bending the base model until it can.

**A translator ships definitions, never a module.** If a vocabulary cannot be said with definitions and fields, it is not a translation — it is a feature request against the engine.


## Closed and open

| Closed — never add one | Open — extend by a code change, additively |
|---|---|
| the two element kinds: block, relationship | block modules, and the base definitions over them |
| relation modules — `line`, `directed`, `reference`, `tie` | card layouts, style sets, routing strategies |
| value forms — `text`, `number`, `flag`, `choice`, `link` | components, rule kinds |
| arrangements — `free`, `grid` | definitions, which are data and cost nothing |
| mutation ops | the action set and the adjustments, which are small by judgement rather than closed by decree |
| host ports — `storage`, `files`, `net`, `score` | |

**Two of the four relation modules are derived, not picked.** `line` and `directed` are chosen; `reference` and `tie` are assigned from what sits at the ends.

**A header role is derived, not picked, so it is in neither column.** `row`, `col` and `both` are the three answers a position can give; nobody chooses one and nothing stores one.

**There is no closed set of element sorts.** That is the point of the rework: a new sort of thing is a definition, and a definition is data.
