# Definitions

**The canonical vocabulary.** One entry per term, so a rule written anywhere else reads without
guessing. Where any other document uses a word, this is what it means.

> **This is the settled model, and most of it is not built yet.** It was agreed on 2026-08-18 and
> replaces a 149-term glossary kept at [definitions-legacy.md](definitions-legacy.md). **spec.md
> says what the code currently does** and still speaks the old words in places — where the two
> disagree, this file is the target and spec.md is the present. The migration is story `ST.4` in
> [plan.md](plan.md).

- **What each part does now** → [spec.md](spec.md). **Why** → [design.md](design.md).
- **What is missing** → [tasks.md](tasks.md). **The queue** → [plan.md](plan.md).


## The one shape

**Everything is a block.** There is no closed set of element sorts and no second thing a block
could be instead. What a block *is* comes from its definition; what the engine does with it comes
from what it holds and how its definition says to draw it.

| Term | Means |
|---|---|
| **block** | the one element. Placed, drawn, carries fields, holds other blocks. Held in `graph.elements` |
| **part** | a child the block **owns**. The tree is `parent` and nothing else; deleting the whole deletes it |
| **reference** | a child that **stands for a block living elsewhere** — another layer, another project. It appears, it is not owned, and it shows the real block's name. `of` holds the path |
| **relationship** | a join between **exactly two** blocks. Not a block: placed by its ends, drawn as a line, joins rather than sits. Names a **relation module** — `line` or `directed` |
| **derived** *(of a relationship)* | **a flag, never a module**: nobody drew this, the engine computed it. Not in the log, recomputed on every fold, and not deletable. The workspace's project-to-project dependencies are the built example |
| **field** | a named, typed value on a block or a relationship. Never structural |
| **definition** | a reusable subtype: a name, the fields its usages carry, how they draw, and what they may hold. Held in `graph.defs`, **one id space**, and grouped in a file by what it describes — **blocks**, **relations**, **views** |
| **view definition** | **a view subtype.** It configures one required **view module** exactly the way a block definition configures a block module, and what the options are is the module's to declare. Reusable — many block definitions may name the same one. *Not the same as a **view block**, which is a saved cross-section and names one of these* |
| **type** | the definition a block or relationship names. Open, and the user's |
| **usage** | anything naming a definition in its `type`. The definition declares; the usage holds the values it gives |

**A reference is drawn; a link is not.** That is the whole difference between a reference block and
a `link` field. A reference occupies space, takes relationships and sits in a layer; a link is a
value inside a field, pointing without appearing.

**Ownership, not distance, is what separates them**: a part is in the tree, a reference names
something the tree does not compose. Every notation draws that line.

**And one more thing a block can do with a child: contain it without owning it.** The workspace and
a folder both do this — their children are **independent roots**, so deleting the container never
deletes what it held.

**It is derived, and nothing new is stored** (settled 2026-08-19). **Filing a block makes it a
root**, and a root owns its own graph — so *contained* is simply *the child is a graph root*, and
*owned* is everything else. This is the built rule that *a block at the top level is a project*,
applied one level down: dragging a loose block into a folder promotes it, and dragging it into a
project files it.


## The base package and the block modules

**A block module is engine code behind one sort of block** — its configuration surface, and what
the engine does with it. **Open**: a code change ships one more, additively. **A shipped, locked
`base` package** carries one definition per module, and everything a user or a package defines
**extends** one of them.

**Two layers, and the split is the old one**: a module is **code**, a definition is **data**. A
package may subtype any base definition freely and may never add a module — which is what keeps
*define every object and relation through data alone* true for vocabulary while leaving genuinely
new behaviour to code.

| Base definition | Module | Holds | Is |
|---|---|---|---|
| **workspace** | its own | projects, packages, folders — **contained, never owned** | the top-level root. Holds **the log**, the metadata, and **all display state** — explorer fold, canvas toggles, and which view each layer was last shown in. Renders with the block view. **Its graph stops at project roots** |
| **project** | its own | **owns** a graph of blocks | a model, and nothing about how it is shown. Contained by the workspace or a folder |
| **folder** | its own | anything, **contained, never owned** — its children are independent roots | the organizational tool, and the only place *mixed* means anything. Renders with the block view |
| **package** | project's | a project you are using rather than writing | locked; unlock or fork to change it |
| **structure** | base | parts, and references | the default. What there is, and how it is composed |
| **view** | view's | **references only**, and **the module regulates it entirely** | a perspective: which blocks, through which module, configured how |
| **resource** | its own | a **workspace-relative path or link** | a file, a script, a data file, an image, a note. *Embedded content is a later story* |
| **group** | view's | references, local to one layer | a boundary round a set — a swimlane, a region, a package boundary, a trace assertion. A view at layer scope, which is why it is never a parent |
| **note** | resource's | text | a resource drawn as a card of text |

**Every block names a block module and may name a view definition**, which defaults to the block
view. The block module says what the block *is* to the engine; the view definition says how a
**layer of it** is drawn. **A definition naming no module gets the base block defaults**, so a
half-written package is usable rather than broken.

**A block definition names an ordered list of view definitions, and the first is the default.** One
field, not two — which view a layer opens in is a presentation detail and does not deserve a field
of its own. Default: block, table, matrix. The base package ships a trivial view definition per
module, so *unconfigured* still has a name and every entry in the list is the same kind of thing.

**What a view definition may configure is the module's to say.** Block view: arrangement, whether
interfaces show. Table view: filters, sort, and the child scope or depth. Matrix: its two axis views
and which relation kinds count. Each is its own discussion, held with that module.

**The rule that keeps this from becoming forms again:** a module supplies **drawing, placement and
a configuration surface**. It never answers *what may contain what* — that is a `holds` rule, which
is data.

| Term | Means |
|---|---|
| **container** | a block that holds children. Derived from what it holds, so it is how a block *looks*, never what it is |
| **interface** | a block seated on an **edge** — its parent's frame, or a lifeline, or any other edge set. Also **port**. **The one anchor for every port-like thing**: a proxy port, a full port, an activity pin and a constraint parameter are all interfaces. A block module of its own, so it carries a configuration surface: the **anchor slot** it takes (`line`, `circle`, `diamond`, …) and its own shape and fill |
| **root** | the block that holds every other in a project. Carries the project's metadata and definitions, `parent: null`, no frame |
| **behavior** | **ordinary description, never a classifier.** A behavior model is `packages/behavior/` plus three view modules: actions and states are definitions extending `structure`, participants are references, order is a directed relationship or the arrangement. The engine has no behavior branch and needs none |


## Layers and looking

| Term | Means |
|---|---|
| **layer** | a block and its direct children — a cross-section of the tree at one block, seen from within. The current **scope** |
| **layer view** | that layer projected through the rules and packages in scope and rendered by one view module. The layer is what is looked at; the layer view is the looking |
| **view module** | the engine code behind one way of presenting a layer. **Six, and closed**: `block`, `table`, `matrix`, `activity`, `sequence`, `state`. Each publishes a distinct icon |
| **view block** | the looking **written down** — a `view` usage holding references to what it shows, a module, and that module's settings. Made by **pinning** a layer view. Its configuration is its *content*, not its presentation |
| **diagram** | what a layer looks like drawn on the canvas. Names no module |
| **projection surface** | what a module must provide to show a layer at all — the surround, the viewport, the chrome, and where a gesture asks a question. **Per module, never per definition** |
| **depth** | how far a view's reference reaches: `self`, `children` or `all`. Drag a project root into a view with `children` and its blocks are the rows |
| **selection** | what is picked within the layer. Set by clicking |
| **frame** / **wall** / **band** | the open layer's border seen from within, one of its four sides, and the dimmed margin outside it |
| **card** | a block as drawn on the canvas |

**A view holds views.** A matrix's two axes are child views, each holding references. Recursion
rather than an axis concept, so a filter, a nesting or a third dimension costs nothing new.

**Which modules a layer may show comes from its definition's `view` component** — never from a
derived kind. That is what keeps a model from being trapped in the sort of thing it started as.

| Term | Means |
|---|---|
| **arrangement** | **one setting, seven values, and it carries the reading direction**: `free`, `right`, `left`, `down`, `up`, `radial`, `relax`. **Model data, held on the layer and in the log** — because the four directional values are what **implied order** is read along, and inference must not depend on how somebody happened to be looking. **This absorbed both `axis` and `flow`**: `column` and `row` were `down` and `right` with the direction left unsaid |
| **retained placement** | a block's `at` is **always kept**, whatever the arrangement. A computed arrangement replaces where things *draw*, never what you placed — so returning to `free` returns your layout |
| **rank** | one step along a directional arrangement |
| **seat** / **anchor** / **promotion** | a place on a border a line may meet; a seat with no block behind it; turning an anchor into an interface where it sits |
| **explicit order** | sequence stated by a directed relationship. Read first, and it wins |
| **implied order** | sequence read from where blocks sit along a **directional arrangement**. The fallback. **`radial` and `relax` carry no direction**, so a layer using either has no implied order and inference falls through to connectivity |
| **lane** | a participant's column or band in a behavior view. **Derived from the reference** an action holds |


## The project and the workspace

| Term | Means |
|---|---|
| **project** | a graph it **owns**. Contained by the workspace or a folder, never owned by either. **It says nothing about how it is shown** — no log, no view state, no toggles |
| **graph** | the current state — blocks and the relationships between them. Derived, never edited in place |
| **workspace** | **the top-level root, and there is exactly one.** It contains every project, package and folder without owning any of them; it holds **the log**, the metadata and **every display preference**. Its own graph is its filing tree and **stops at project roots** |
| **the log** | **one log, at the workspace** (settled 2026-08-19). One history for everything, so **undo is workspace-wide** — the workspace is one document, and that is the intent. Nothing routes a write any more, which is what dissolves `Effect.into`, `writeInto`, the `home` batches and the whole class of bug they existed to prevent |
| **display state** | how things were last shown — explorer fold, canvas toggles, which view module each layer was in. **Workspace metadata, never a project's and never the log**, so reopening a workspace finds every project as it was left, and an exported project carries no opinion about how to draw it |
| **package** | **a project you are using rather than writing.** Locked: writes refuse, and the strip offers unlock or fork. Locked is the workspace's word, not the file's. A **pattern package** ships template blocks to copy and customise rather than definitions to draw on — a later story |
| **vocabulary** | the list of packages a project draws **definitions** from, in import order. A package of *patterns* is referenced or copied instead, and does not go in this list |
| **extends** | the definition another refines, by reference. **Subtyping, never overriding**; fields union, components merge per key, and a rule naming a definition reaches everything below it |
| **snapshot** / **bundle** | a project written out; one carrying the external projects it references, so it stands alone |
| **translator** / **artifact** | code that reads a project and emits source, a drawing or a standard's file; and what it emits. **One way** — the action that ran it may record a `resource` block, the translator never writes the graph |

~~**A change is recorded where its element lives.**~~ **Retired by the single log** (2026-08-19).
There is one log, so nothing routes and no action can pick the wrong one. The rule was the best
available answer while every project held its own history; it is not needed once none does.


## History

| Term | Means |
|---|---|
| **step** | one user action and every mutation it made, plus whether it is applied or reverted |
| **mutation** | a single change within a step. The smallest thing the fold applies |
| **the log** | the ordered steps. The only thing stored, and the source of truth |
| **fold** | rebuilding the graph from empty by replaying every applied step. Why undo needs no inverses |
| **derived** | worked out rather than stored — seats, routes, boundaries, containment, container-ness, a group's members |


## What a definition configures

| Term | Means |
|---|---|
| **module** | engine code. An *open* module publishes components; a closed one does its job |
| **component** | a capability an open module offers, switched on and shaped by a definition. **Per definition, never per usage** |
| **`components`** | the field on a definition holding one entry per component, keyed by name. **The one place the schema grows** — a new capability adds a key, never a field beside one |
| **`card`** | which card layout, its shape, where its label sits, and which fields it `shows` |
| **`style`** | which **slot** (one of six hue families) and which **emphasis**, weight and label step. **Never a colour, a pixel count or a font** — the theme owns the palette and a definition picks within it |
| **`view`** | which view modules this definition offers, the default, the arrangement, the module's word, and the abstraction cap |
| **`rules`** / **`constraints`** | how usages interact, and what a usage needs in itself |
| **card layout** | one of the standard ways a card is composed — `name`, `type`, `fields`, `compartments`, `icon`, `shape`, `rule`. **Open** |
| **`validate` hook** | a module's own check in code, for what the rule kinds cannot say. The escape hatch, and deliberately not a language |

| Kind | Says |
|---|---|
| **`required`** | which of a usage's fields must carry a value. The one **constraint** |
| **`ends`** | which definitions may sit at each end of a relationship definition, and optionally which port direction |
| **`holds`** | which definitions this one may contain — including **`view` holding references only** |
| **`degree`** | how many relationships may meet a usage, counted `in` and `out` |
| **`match`** | field names that must agree across a relationship's two ends |

**They advise while modelling and refuse only at translation.** A model is legitimately unfinished,
so a violation is a note in the tray; a translator asks the same checks as it emits.


## The surface

The full enumeration is in [actions.md](actions.md).

| Term | Means |
|---|---|
| **action** | something somebody meant and could say — create, relate, group, describe. Named, ranked, listed. Returns mutations rather than applying them |
| **adjustment** | something positional and unsayable. Four, gesture-only, never ranked. A module declares which it accepts |
| **navigation** | an action writing no mutations — `open`, `up`, `reveal`. No step, nothing to undo |
| **pin** | saving the current layer view as a **view block**, from the canvas |
| **infer map** | what a block becomes in a given view — **declared by each view module**, its dials set by the view definition. `ViewModule.word` / `.creates` and `ViewConfig.N` are the built half (A.7c); the behaviour chain in [behaviors.md](behaviors.md) is one module's map, written out long |
| **action surface** | the actions the engine publishes as data. The seam both the page and the terminal work against |


## Closed and open

| Closed — never add one | Open — extend by a code change, additively |
|---|---|
| relation modules (`line`, `directed`) | base definitions, block modules |
| value forms (`text`, `number`, `flag`, `choice`, `link`) | card layouts, style sets, arrangements |
| the six view modules | components, rule kinds, routing strategies |
| mutation ops, the action set, the four adjustments | |

**There is no closed set of element sorts.** That is the point of the rework: a new sort of thing
is a definition, and a definition is data.


## What was retired

Kept while the migration runs, so an old document still reads.

| Retired | Because | Now |
|---|---|---|
| **element form** (`block`/`note`/`group`/`proxy`) | nothing earned one — every case was expressible as a definition plus a `holds` rule | base definitions |
| **proxy** | did five unrelated jobs, and a sixth in the SysML map | **reference** |
| **external proxy** | not a different thing | a reference whose target is in another project |
| **`reference`, the relationship form** | derived from a proxy at an end | an ordinary relationship with a reference at one end; dashed is presentation |
| **`ref`, the value form** | collided with the reference block | **`link`** |
| **set** | mixedness was never the signal, and *set* collides with *style set* and *closed set* | **folder**, which is a definition |
| **kind** (`structure` / `behavior` as classifiers) | the engine branched on something the glossary declared absent | the definition's `view` component says which modules apply |
| **node**, **annotation**, **tie**, **membership**, **hug**, **figure** | each restated something with a second word | block; a resource or a group; a relationship; references; layout's business; gone |
