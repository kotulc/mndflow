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
| **definition** | a reusable subtype: a name, the fields its usages carry, how they draw, and what they may hold. Held in `graph.defs`, **one id space with blocks and relationships**, filed under a block by `home`, and grouped by what it describes — **block**, **relation**, **view** |
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
| **structure** | parts and references | the default. What there is, and how it is composed |
| **view** | **references only** | a perspective kept: which blocks, through which module, configured how |
| **reference** | nothing | a stand-in for a block living elsewhere. `of` is the whole of it |
| **interface** | anything | a block seated on an edge. Also **port** |
| **resource** | a workspace-relative path or link | a file, a script, a data file, an image |
| **group** | references, local to one layer | a boundary round a set — a swimlane, a region, a package boundary |
| **note** | text | a resource drawn as a card of text |

**Eight, in three roles:** `structure` is **the block** and owns a tree; `folder` does the **filing**; the other six are **accessories** that own no tree of parts. **There is no doing/being split** — an action and a part are both `structure`, and what separates them is the definition each names.

**The rule that keeps this from becoming forms again:** a module supplies **drawing, placement and a configuration surface**. It never answers *what may contain what* — that is a `holds` rule, which is data.

| Term | Means |
|---|---|
| **container** | a block that holds child blocks. Derived from what it holds, so it is how a block *looks*, never what it is |
| **interface** | a block seated on an **edge** — its parent's frame, or any other edge set. Also **port**. **The one anchor for every port-like thing**: a proxy port, a full port, a pin and a constraint parameter are all interfaces. Declared, never derived: it carries `side`, `at` and `flow` instead of `x`/`y`, and `flow` is decorative and constrains nothing |
| **root** | the block that holds every other, under a reserved id. `parent: null` means *in the root layer*. No frame, because a frame is a block seen from inside and the root has no outside |
| **behaviour** | **ordinary description, never a kind of block.** An action or a state is a definition over the one block module, a participant is a reference, and order is a directed relationship or the arrangement |

**The word `port` carries two meanings and they never meet.** In the model a port is an **interface**. In the host contract a **port** is one of the four capabilities an app binds — `storage`, `files`, `net`, `score`. Where either is ambiguous, say *interface* or *host port*.


## What holds what

**A block is a block.** There is no tier walk and no doing/being split. One rule is the engine's, and it is the only place a choice is taken away from the user:

> **A view holds references, never parts.**

| Term | Means |
|---|---|
| **top-level block** | a block whose parent is the workspace or a folder, so it is contained rather than owned. Informally a *project*. Read from position, stored nowhere |
| **coercion** | what dropping into a view does instead of refusing. The gesture still succeeds; what arrives is an appearance rather than a part — a **reference** |

**A reference points at what it stands for, and nothing points back.** Upward is a derived query, asked of the graph, because a stored back-reference would leave an exported subtree pointing at things that did not travel with it.

**Nesting is ordinary.** A view holds views, so a matrix's two axes cost nothing new.


## Layers and looking

| Term | Means |
|---|---|
| **layer** | a block and its direct children — a cross-section of the tree at one block, seen from within. The current **scope** |
| **layer view** | that layer projected through the definitions in scope and rendered by one view module. The layer is what is looked at; the layer view is the looking |
| **view module** | the engine code behind one way of presenting a layer. **Three**: `block`, `table`, `matrix`. `block` is **any planar projection**. Each publishes a distinct icon and a **word** for what it calls its elementary block |
| **view definition** | **a view subtype.** It names one required view module and that module's settings. Reusable — many block definitions may name the same one. The base package ships **three**, one per module; a notation is another definition, never another module |
| **view block** | the looking **written down** — a `view` usage holding one reference per thing it shows. Made by **pinning** a layer view. Its configuration is its *content*, not its presentation |
| **diagram** | what a layer looks like drawn on the canvas. Names no module |
| **depth** | how far a view's reference reaches: `self`, `children` or `all` |
| **selection** | what is picked within the layer. Set by clicking |
| **frame** / **wall** / **band** | the open layer's border seen from within, one of its four sides, and the dimmed margin outside it |
| **card** | a block as drawn on the canvas |
| **mark** | how a box reads, derived every draw from what a block holds or where it sits — `reference`, `missing`, `note`, `group`, `interface`, `container`, `derived`. Never a sort of thing |

**A view holds views.** A matrix's two axes are child views, each holding references. Recursion rather than an axis concept, so a filter, a nesting or a third dimension costs nothing new.

**Which views a definition offers comes from its `view` component**, and the first is the default. **There is no derived kind of layer**, so any layer can be switched to any view it is offered — which is what keeps a model from being trapped in the sort of thing it started as.

| Term | Means |
|---|---|
| **arrangement** | **one setting, six values, and it carries the reading direction**: `free`, `grid`, `right`, `left`, `down`, `up`. **Model data, held on the layer and in the log**, because how a layer reads is part of what the layer says |
| **retained placement** | a block's placement is **kept** by every arrangement, and nothing discards it. A computed arrangement replaces where things *draw*, never what you placed, so returning to `free` returns your layout |
| **rank** | one step along a directional arrangement |
| **seat** | a place on a border a line may meet |
| **anchor** | a seat a relationship actually arrives at, with no block behind it. **One per arriving line, never one per side.** Placed by the engine until somebody drags it, and then drawn **solid** to say the position is theirs |
| **promotion** | turning an anchor into an **interface** where it sits — a separate act from moving one, because an interface is a real element with a name and a type |
| **explicit order** | sequence stated by a directed relationship. Read first, and it wins |
| **implied order** | sequence read from where blocks sit along a **directional arrangement**. The fallback. **`free` and `grid` carry no direction**, so a layer using either has no implied order |


## The workspace

| Term | Means |
|---|---|
| **workspace** | **the root folder, and there is exactly one.** It contains every top-level block, package and folder without owning any of them, and it holds **the log**, the metadata and **all session state**. It is a block, with `parent: null` and a reserved id, and needed no new schema to be one |
| **graph** | the current state — `root`, `blocks`, `edges` and `defs`. **One graph**, folded from one log, never edited in place |
| **project** | **a word, not a type.** Informally, a top-level block under the workspace root. Read from position, stored nowhere, and nothing in the schema answers to it |
| **the log** | **one log, at the workspace.** One document, one history, so **undo is workspace-wide** and nothing routes a write |
| **session state** | how things were last shown — the open layer, the selection, the explorer fold, which view each layer was in, the theme, the toggles. **Held outside the log and never in a file**, so opening somebody's workspace does not rearrange your toggles. The test is *is it in the log?* — a block's name is, so it exports and it undoes; whether interfaces show is not, so it does neither. **`arrangement` is the exception that proves the rule**, and it is model data because how a layer reads is part of what it says |
| **package** | **a top-level block you are using rather than writing.** Locked: writes refuse, and the strip offers unlock or fork. Locked is the workspace's word, not the file's |
| **resolution** | how a usage finds its definition: **climb the ancestors, nearest first, to the workspace**. **There is no import list** — position does the whole job, so there is no order to maintain. Two ancestors defining the same name are two definitions and both are offered; nothing shadows, because every usage names an id |
| **`home`** | the block a definition is filed under. **The only stored part of its scope** — who owns it, who may use it, what an export carries and which of two wins all fall out of position |
| **extends** | the definition another refines, by reference. **Subtyping, never overriding**; fields union, components merge per key, one parent so no diamonds, and a rule naming a definition reaches everything below it |
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
| **derived** | worked out rather than stored — containment, container-ness, a group's members, the `reference` and `tie` relation modules, seats, routes, and the content hash |


## What a definition configures

| Term | Means |
|---|---|
| **module** | engine code. An *open* module publishes components; a closed one does its job |
| **component** | a capability an open module offers, switched on and shaped by a definition. **Per definition, never per usage** |
| **`components`** | the field on a definition holding one entry per component, keyed by name. **The one place the schema grows** — a new capability adds a key, never a field beside one. A component owns its key, reads no other's, and **validates its own key at the door**, so one absent from the build leaves its configuration *unvalidated* rather than wrong |
| **`block`** | which block module, and that module's own keys |
| **`card`** | which card `layout`, its `shape`, where the label sits, and which fields it `shows` |
| **`style`** | which **slot** (one of six hue families) and which **emphasis**, weight and label step. **Never a colour, a pixel count or a font** — the theme owns the palette and a definition picks within it |
| **`view`** | which view definitions this offers, the first being the default, and the abstraction cap |
| **`constraints`** / **`rules`** | what a usage needs in itself, and how usages interact |
| **card layout** | one of the standard ways a card is composed — `name`, `type`, `fields`, `none`. **Open** |
| **`validate` hook** | a module's own check in code, for what the rule kinds cannot say. The escape hatch, and deliberately not a language |

| Kind | Says |
|---|---|
| **`required`** | which of a usage's fields must carry a value. The one **constraint** |
| **`ends`** | which definitions may sit at each end of a relationship definition, and optionally which port direction |
| **`holds`** | which definitions this one may contain — including **`view` holding references only** |
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
| **pin** | saving the current layer view as a **view block**, from the canvas |
| **composition** | **how a view groups, spaces and orders the references it holds** — recomputed every draw, making nothing. Presentation, never model |
| **proximity** | **how far apart two referenced blocks are in the tree**. The one metric composition runs on: it **groups** by nearest common ancestor, **orders** by tree path, and where there is room **spaces** by distance. Derived every draw, stored nowhere, and overridable |
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
| view modules — `block`, `table`, `matrix` | definitions, which are data and cost nothing |
| arrangements — six | |
| mutation ops | the action set and the adjustments, which are small by judgement rather than closed by decree |
| host ports — `storage`, `files`, `net`, `score` | |

**Two of the four relation modules are derived, not picked.** `line` and `directed` are chosen; `reference` and `tie` are assigned from what sits at the ends.

**There is no closed set of element sorts.** That is the point of the rework: a new sort of thing is a definition, and a definition is data.
