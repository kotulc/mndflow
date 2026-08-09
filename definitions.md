# Definitions

The words mndflow uses, and exactly what each one means. One entry per term, so that a rule
written anywhere else can be read without guessing.

- **What each part does** → [spec.md](spec.md).
- **Why it is that way** → [design.md](design.md).
- **What is missing** → [tasks.md](tasks.md).


## The project

| Term | Means |
|---|---|
| **project** | its graph, its metadata, and the history that built them. Only the **history** is stored; the other two are folded from it. The test for whether something belongs to a project is whether it is in the log — which is why display preferences are not |
| **graph** | the current state: the tree of blocks and the relationships between them. **Derived** — rebuilt by folding the log, never edited in place |
| **metadata** | what a project says about **itself** rather than about its contents: its name and its definitions. Carried by root, which is the project as a block |
| **history** | the log: the ordered steps that were taken, and which of them are currently applied. The one thing that is stored |


## The graph

Two things and no more: **elements**, which are placed and drawn, and **relationships**, which
join them. Everything else describes one of the two.

| Term | Means |
|---|---|
| **element** | anything the graph holds as an object: a block, a note, a group, a proxy, a figure. Placed, drawn, carries fields. Held in `graph.elements` |
| **node** | the graph-theory word for an element. The same thing; `element` is the word the code uses |
| **relationship / edge** | a join between **exactly two** elements. Not an element — it is placed by its ends, drawn as a line, and joins rather than sits. Anything about a *set* is a group |
| **form** | **closed and the engine's.** Which of five an element is — `block`, `note`, `group`, `proxy`, `figure` — or which of four a relationship is: `untyped`, `flow`, `assoc`, `tie`. It decides what draws a thing and which rules reach it |
| **type** | **open and the user's.** The definition a thing names. It subtypes **within** a form, never across one, which is what keeps engine rules off user data. Empty until somebody sets one |
| **unit** | what a module calls its elementary block — `block`, and one day `activity`. A property of the **module**, not of the subject matter: a block diagram is built from blocks whether it describes software or a story. Derived, never stored |
| **vocabulary** | what is left of the old `domain`: the words and starting relations a subject matter supplies. Consumed only by the terminal — see tasks.md |


## Structure

| Term | Means |
|---|---|
| **tree** | the project's core hierarchy: blocks nested inside blocks. The spine the whole project hangs from |
| **structural** | belonging to the tree, and nothing looser. **Only blocks are structural**, and only through `parent` — a note, a group and a proxy all sit in a layer without composing it, and a relationship joins without composing. Reserved for the tree so that it stays a useful word |
| **parent** | what an element sits inside. The tree is `parent` and nothing else |
| **containment** | being inside something. **Implied by `parent`, never stored as a relationship** |
| **block** | the base element, and the default: one discrete thing the tree is built from. The only structural element |
| **container** | a block that holds other blocks. Derived from what it holds, so it is a way a block *looks*, not a thing it *is* — it is still called a block |
| **interface** | a block sitting on its parent's frame edge. Also called a **port**. Derived from having a side, the same way containment is derived |
| **proxy** | a virtual block standing in for one that lives in another layer, so a relationship can cross a structural boundary. Shows the real block's name. What it stands for is a property of the **appearance** — one thing appearing twice, not two things joined. One per layer per block, and never for a block already in that layer |
| **root** | the block that holds every other. Carries the project's metadata and its definitions, has `parent: null`, and has no frame — a frame is a block seen from inside, and root has no outside |
| **name** | unique among an element's siblings; position in the tree is what makes it unique in the project. An unnamed element is numbered among its own form — `block 1`, `note 2` |


## Relationships

| Term | Means |
|---|---|
| **reference** | a relationship with a **proxy at one end**, so it reaches something in another layer. **Derived, never a form** — drawing a line to a proxy makes one, and it keeps whatever form it was given. Drawn violet and dashed |
| **tie** | the relationship joining a note to what it describes |
| **direction** (`dir`) | which way its arrows point. Independent of form |
| **leader** | how a tie draws: a dotted line taking no pointer, never routed. A rule about drawing, not about what a tie is |

**Anything joining two elements is a relationship.** A form may draw as something other than a
routed line, but that never makes it a second way to join things — one mechanism, one cascade
when an end is deleted, one list to read them from. The test is simple: **drawn as a line between
two things → a relationship; not a line → a field.** A tie is a line, so it is a relationship.
Membership is not — a group draws a boundary round its members, never a spoke to each.


## Fields and definitions

Descriptive values, and the types that declare them. A field has no identity of its own — it is a
named value carried by an element or a relationship, and never changes what contains what.

| Term | Means |
|---|---|
| **field** | a named, typed value on an element or a relationship. Never structural |
| **value form** | what a field holds: `text`, `number`, `flag`, `choice` or `ref`. Closed and permanent, since a field's form is written into logs |
| **definition** | a reusable subtype, held on root. Carries an `id`, a name, the **form** it subtypes, the fields its usages have, and how they draw. **One record for element and relationship types alike** — a project's relation vocabulary is the definitions of relationship form |
| **usage** | anything naming a definition in its `type`. The definition declares; the usage holds only the values it gives. `part def` against `part` |
| **data structure** | a definition whose fields *are* the structure. Not an element form: a block typed by it is drawn only where somebody places one |
| **membership** | the groups a block belongs to. Held on the block; a group's member list is derived from it, so the two can never disagree. Neither a field nor a relationship |
| **annotation** | an element that describes or organizes without structuring: a note or a group. Drawn on the canvas, never listed in the explorer |
| **group** | the **generic organizational element, local to one layer**: a boundary round a set, meaning whatever its definition says — a swimlane, a region, a package boundary, a trace assertion. It organizes without structuring — never a parent, and no part of the tree. A member that moves to another layer leaves the group |
| **boundary** | the line a group draws. Its members' bounds plus a margin, so it is a fact about what it holds |
| **note** | an element drawn as a card of text |
| **hug** | how far a boundary reaches past its members |


## The canvas

| Term | Means |
|---|---|
| **layer** | a **cross-section of the tree at one block**: that block's immediate contents, seen from within. Not its whole subtree — descending a level is a different cross-section of the same branch |
| **scope** | the layer being drawn. Set by clicking in the explorer |
| **context** | what is selected within the layer. Set by clicking on the canvas |
| **frame** | the border of the open layer, seen from within |
| **wall** | one of the frame's four sides. **Only the frame has walls** — a card's sides are never named, because a card has no border zone for a gesture to land on |
| **band** | the dimmed margin between the frame and the edge of the panel |
| **card** | a block as drawn on the canvas |
| **chip** | one cell of a container's treemap |


## Where a line meets a card

| Term | Means |
|---|---|
| **seat** | a place a line may meet a border: every 12 units along it, never on a corner |
| **anchor** | a seat a relationship meets that has **no element behind it**. Draws nothing |
| **port** | a seat that **is** an element, because somebody made or promoted one. Same thing as an interface. **The one anchor for every port-like thing**: a proxy port, a full port, an activity pin and a constraint parameter are all interfaces |
| **promotion** | turning an anchor into a port, where it sits. The only way a relationship's end becomes an element |
| **stub** | the short run leaving a seat before the line turns |
| **lane** | the offset given to runs that would otherwise draw on top of each other |


## Layout

| Term | Means |
|---|---|
| **unit** | anything laid out as a whole: a card, a group, or a note |
| **cluster** | units drawn together by relationships, arranged as one region *(backlog)* |
| **arrangement** | a one-time **action** that lays the layer out and writes down where everything landed: `grid`, `radial`, `across`, `down`. Never a mode, so never "current" |
| **axis** | which way a layer **reads**: `none`, `across` or `down`. A setting, held per layer. Decides the sides a flow relationship takes; says nothing about where cards go |
| **resting layout** | what a render runs: placed elements stay, unplaced ones fill around them |
| **rank** | one step along the axis. Things pointing at each other sit in successive ranks |
| **hard constraint** | something honoured **by** an arrangement, which survives it. Ports and walls, and nothing else |
| **retained placement** | something an arrangement **replaces** rather than honours, and which is yours again afterwards. Element positions |
| **rigid in shape, not size** | a unit keeps who sits beside whom; the distances are layout's |


## History

| Term | Means |
|---|---|
| **step** | one user action and every mutation it made, plus whether it is `applied` or `reverted`. One gesture is one step, and one edit of a field is one step — not one per keystroke |
| **mutation** | a single change within a step. The smallest thing the fold knows how to apply |
| **the log** | the ordered list of steps. The only thing stored, and the source of truth |
| **fold** | **rebuilding the graph from empty by replaying every applied step, in order.** Runs after every change, so the graph can never drift from the record that produced it. This is why undo needs no inverses: it flips a step to `reverted` and folds again |
| **undo** | flipping the last applied step and folding again. Redo re-applies it |
| **derived** | worked out rather than stored. Seats, routes, boundaries, containment, a group's member list, and whether a relationship is a reference |


## The workspace *(planned)*

Nothing here is built — see [design.md](design.md) under *Where this is going*.

| Term | Means |
|---|---|
| **workspace** | the projects currently loaded, and their order. Held apart from all of them: neither project data, nor a display preference, nor what the terminal has learned |
| **module** | one graph and the views over it. A project belongs to exactly one, and carries its own log, export and action surface |
| **structure** | one of the two fundamental graphs: what things there are, and how they are composed and connected |
| **behavior** | the other: what happens, in what order, under what conditions |
| **view** | a type vocabulary, a renderer and a layout law over one graph — and nothing else. Holds no state of its own. Activity and state machine are views on behavior; parametrics and requirements are views on structure |
| **projection** | a view that derives its whole arrangement from the graph. A sequence diagram is one: lifeline from partition, message from a crossing flow, order from the flow graph. Still editable, through the action surface |
| **page** | branding, navigation and the workspace. The shell a module sits in |
| **envelope** | what a file travels inside: `{ format, module, graph }`. The format says which schema wrote it; the module says which fold to run. Neither can live in the graph, because the graph is what the fold produces. It carries nothing else |
| **checkpoint** | the graph cached at one step, so a fold need not replay from zero. Internal — nobody asks for one. Also what an imported file becomes |
| **snapshot** | a project as of a step, written out. An export, and a file |
| **bundle** | a snapshot carrying the external projects it references, so it stands alone. Done at export; inside a workspace everything is live and nothing is bundled |
| **merge** | combining two divergent logs. **Out of scope** — git's line merge, or nothing. `check.ts` reports the wreckage of a bad one rather than preventing it |
| **external proxy** | a **proxy** whose target lives in another project rather than another layer. Target is `{ project, element }` — the project **by name**, the element by id, so renaming or moving the block flows through untouched. Always live; to fix a version, bundle |
| **breaking change** | the deletion of a block some proxy stands for — **the only** change reported to the user. A rename or a move is not one |
| **action surface** | the actions a diagram module publishes as data — name, arguments, when each applies. The seam both the page and the terminal work against |
| **figure** | a placed, drawn element the engine only positions — what it *is* comes from its `type`, and its module draws it. An activity's fork, decision or initial node. Never in the explorer |

**The first word is the module, the second is the thing:** block tree, block diagram, activity
diagram. **`block` names the element in every module** — an activity diagram is built from blocks
too — so the qualifier carries the meaning, and a project's explorer row shows its module as
`<project> [block]`.


## The SysML map *(planned)*

SysML is a **translation layer** over the general model, never a shape the model bends to. This
table is what makes that claim checkable: every SysML concept mndflow targets, and what it is
already made of. Nothing in the right column is a special case.

| SysML | mndflow | |
|---|---|---|
| block | **block** | the base element |
| part property | **block** with a `parent` | the tree is composition |
| reference property | **`ref` field** | points without drawing a line |
| value property | **field**, form `number`/`text`/`flag` | `unit` where it has one |
| value type / data type | **definition** | fields *are* the structure |
| enumeration | **definition** + `choice` field | `choices` on the field |
| block definition (`part def`) | **definition**, form `block` | declares fields and how they draw |
| stereotype / profile | **definition** | a module ships a notation by shipping definitions |
| proxy port | **interface** | typed by an interface definition |
| full port | **interface** holding children | derived, the way container-ness is |
| pin | **interface** on an action | `flow` in/out, typed by a data definition |
| constraint parameter | **interface** on a constraint block | so a binding is an ordinary relationship |
| binding connector | **relationship**, form `assoc` | both ends are interfaces |
| connector | **relationship**, form `assoc` | |
| item flow | **field on a `flow` relationship** | a `ref` to the definition that travels |
| association / composition | **relationship** + definition | direction and ends from the definition |
| requirement | **block** + `id` and `text` fields | no new anything |
| satisfy / verify / derive | **relationship** + definition | dashed, hollow head, from the definition |
| action | **block** in a behavior project | |
| control node (fork, join, decision, merge, initial, final) | **figure** | the engine places, the module draws |
| object node | **interface** or **block**, by where it sits | |
| control flow / object flow | **relationship**, form `flow` | |
| state | **block** in a behavior project | doing against being is the vocabulary, not the shape |
| transition | **relationship**, form `flow` | trigger, guard and effect are its fields |
| region / composite state | **container**, or a **group** | nesting where structural, boundary where not |
| swimlane / partition | **group** | band shape is the module's rendering |
| lifeline | **group** (partition), projected | |
| message | **flow** crossing a partition, projected | |
| combined fragment (`alt`, `par`, `loop`) | decision, fork, cycle | already in the flow graph |
| trace assertion (`neg`, `assert`) | **group** with a definition | a claim about a set, so not a relationship |
| package | **container**, or a **group** | |
| actor | **figure** | |

**What does not translate**, and is accepted: inline combined-fragment notation for trace
assertions — the claim survives as a typed group, the enclosing bracket does not — and lifeline
left-to-right order, which is presentation and belongs to the view.


## What the module walk settled

Every notation above run against the model, to find out whether the closed sets could be frozen.
**They held**: five element forms, four relationship forms, five value forms, no additions.

| | |
|---|---|
| **Two graphs, many views** | `structure` and `behavior` are the only graphs. Everything else is a view — a type vocabulary, a renderer and a layout law |
| **Views are editable** | A view publishes gestures and the action surface maps them to mutations. Nothing is generated-only: people sketch in a notation before the model behind it exists |
| **Every port is an interface** | Proxy port, full port, pin, parameter. Told apart by `type` and by whether they hold children |
| **Parametrics is not a hard case** | A parameter is an interface, so a binding is an ordinary relationship and `from`/`to` already reach it |
| **Requirements need nothing new** | Elements with fields, related by typed relationships |
| **Sequence is a projection** | Lifeline from partition, message from a crossing flow, order from the flow graph — and still editable |
| **A data structure is a definition** | Not a form. It never clutters the tree, and it is drawn only where somebody places one |
| **A group is the generic set** | Which is why a relationship never needs more than two ends |
| **One definition record** | Element types and relationship types are the same thing, differing in the form they subtype |
| **Definitions have ids** | Typed-by and points-at are one operation, and a rename orphans nothing |

**Two graphs, not two dozen modules** is the result that matters: a notation costs a vocabulary
and a renderer, not an engine.
