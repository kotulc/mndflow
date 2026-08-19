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
| **relationship** | a join between **exactly two** blocks. Not a block: placed by its ends, drawn as a line, joins rather than sits |
| **field** | a named, typed value on a block or a relationship. Never structural |
| **definition** | a reusable subtype: a name, the fields its usages carry, how they draw, and what they may hold. Held in `graph.defs`. **One record for block and relationship types alike** |
| **type** | the definition a block or relationship names. Open, and the user's |
| **usage** | anything naming a definition in its `type`. The definition declares; the usage holds the values it gives |

**A reference is drawn; a link is not.** That is the whole difference between a reference block and
a `link` field. A reference occupies space, takes relationships and sits in a layer; a link is a
value inside a field, pointing without appearing.

**Two child links and no third.** Ownership, not distance, is what separates them: a part is in the
tree, a reference names something the tree does not compose. Every notation draws that line and no
notation draws another.


## The base package

**A shipped, locked package of definitions the engine knows by id.** This is where the sorts of
thing live now that forms are gone. It is **open** — a code change may ship one more, additively.

**The rule that keeps it from becoming forms again:** the engine may key off a base definition
**only for how a block draws and where it sits**. Never for what it is, and never for what may
contain what — containment is a `holds` rule, which is data.

| Definition | Holds | Is |
|---|---|---|
| **structure** | parts, and references | the default. What there is, and how it is composed |
| **view** | **references only, engine-enforced** | a perspective: which blocks, through which module, configured how |
| **resource** | content, no children | something attached rather than modelled — a file, a script, a data file, an image, a note |
| **folder** | parts, of any definition | organization. A structure block, marked as one because filing is what it is for |
| **group** | references, local to one layer | a boundary round a set — a swimlane, a region, a package boundary, a trace assertion. A `view` at layer scope, which is why it is never a parent |
| **note** | text | a `resource` drawn as a card of text |

Everything else **extends** one of these, and a package ships the extensions.

| Term | Means |
|---|---|
| **container** | a block that holds children. Derived from what it holds, so it is how a block *looks*, never what it is |
| **interface** | a block sitting on its parent's frame edge. Also **port**. Derived from having a `side`. **The one anchor for every port-like thing**: a proxy port, a full port, an activity pin and a constraint parameter are all interfaces |
| **root** | the block that holds every other in a project. Carries the project's metadata and definitions, `parent: null`, no frame |
| **behavior** | **ordinary description, never a classifier.** A behavior model is `packages/behavior/` plus three view modules: actions and states are definitions extending `structure`, participants are references, order is a directed relationship or the axis. The engine has no behavior branch and needs none |


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
| **arrangement** | a one-time action that lays a layer out and writes down where everything landed: `grid`, `radial`, `across`, `down`. Never a mode |
| **axis** | which way a layer reads: `none`, `across`, `down`. A setting, per layer. Biases rank, placement and routing, and is the fallback the **implied order** is read along |
| **rank** | one step along the axis |
| **seat** / **anchor** / **promotion** | a place on a border a line may meet; a seat with no block behind it; turning an anchor into an interface where it sits |
| **explicit order** | sequence stated by a directed relationship. Read first, and it wins |
| **implied order** | sequence read from where blocks sit along the axis. The fallback |
| **lane** | a participant's column or band in a behavior view. **Derived from the reference** an action holds |


## The project and the workspace

| Term | Means |
|---|---|
| **project** | its graph, its metadata, and the history that built them. **Only the history is stored**; the rest is folded from it |
| **graph** | the current state — blocks and the relationships between them. Derived, never edited in place |
| **workspace** | the projects currently loaded, and their order. **It is a project**: its children are references to project roots, so filing is undoable and works like everything else |
| **package** | **a project you are using rather than writing.** Locked: writes refuse, and the strip offers unlock or fork. Locked is the workspace's word, not the file's — the same project is a package or a working model depending on which you are doing |
| **vocabulary** | the list of packages a project draws **definitions** from, in import order. A package of *patterns* is referenced or copied instead, and does not go in this list |
| **extends** | the definition another refines, by reference. **Subtyping, never overriding**; fields union, components merge per key, and a rule naming a definition reaches everything below it |
| **snapshot** / **bundle** | a project written out; one carrying the external projects it references, so it stands alone |
| **translator** / **artifact** | code that reads a project and emits source, a drawing or a standard's file; and what it emits. **One way** — the action that ran it may record a `resource` block, the translator never writes the graph |

**A change is recorded where its element lives.** Admitting a project writes the workspace's log
because the reference is the workspace's; renaming a block writes that project's log. Nobody
decides case by case, and no action knows it is a cross-project one.


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
| **action surface** | the actions the engine publishes as data. The seam both the page and the terminal work against |


## Closed and open

| Closed — never add one | Open — extend by a code change, additively |
|---|---|
| relationship forms (`line`, `directed`) | base definitions |
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
