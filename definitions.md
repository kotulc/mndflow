# Definitions

The words mndflow uses, and exactly what each one means. One entry per term, so that a rule
written anywhere else can be read without guessing.

- **What each part does** → [spec.md](spec.md).
- **Why it is that way** → [design.md](design.md).
- **What is missing** → [tasks.md](tasks.md).


## The workspace *(planned)*

Nothing here is built — see [design.md](design.md) under *Where this is going*.

| Term | Means |
|---|---|
| **workspace** | the projects currently loaded, and their order. Held apart from all of them: neither project data, nor a display preference, nor what the terminal has learned |
| **diagram module** | a tree and a canvas for one kind of diagram — block, activity, flow. A project belongs to exactly one, and carries its own log, export and action surface |
| **page** | branding, navigation and the workspace. The shell a diagram module sits in |
| **external proxy** | a **proxy** whose target lives in another project rather than another layer. How one project references a block in another: live and by id, so renaming or moving the block flows through untouched |
| **breaking change** | the deletion of a block some proxy stands for — **the only** change reported to the user. A rename or a move is not one |
| **bundle** | to carry the external blocks an export depends on inside it, so it stands alone. Done at export; inside a workspace every project is live and nothing is bundled |
| **action surface** | the actions a diagram module publishes as data — name, arguments, when each applies. The seam both the page and the terminal work against |
| **figure** | a placed, drawn element the engine only positions — what it *is* comes from its `type`, and its module draws it. An activity's fork, decision or initial node. Never in the explorer |

**The first word is the domain, the second is the thing:** block tree, block diagram, activity
diagram. **`block` names the element in every domain** — an activity diagram is built from blocks
too — so the qualifier carries the meaning, and a project's explorer row shows its domain as
`<project> [block]`.


## The project

| Term | Means |
|---|---|
| **project** | its graph, its metadata, and the history that built them. Only the **history** is stored; the other two are folded from it. The test for whether something belongs to a project is whether it is in the log — which is why display preferences are not |
| **graph** | the current state: the tree of blocks and the relationships between them. **Derived** — rebuilt by folding the log, never edited in place |
| **metadata** | what a project says about **itself** rather than about its contents: its name, its domain, its relation vocabulary. Carried by root, which is the project as a block |
| **history** | the log: the ordered steps that were taken, and which of them are currently applied. The one thing that is stored |


## The graph

Two things and no more: **elements**, which are placed and drawn, and **relationships**, which
join them. Everything else describes one of the two.

| Term | Means |
|---|---|
| **element** | anything the graph holds as an object: a block, a note, a group, a proxy. Placed, drawn, carries attributes. Held in `graph.elements` |
| **node** | the graph-theory word for an element. The same thing; `element` is the word the code uses |
| **relationship / edge** | a join between two elements. Not an element — it is placed by its ends, drawn as a line, and joins rather than sits |
| **element type** | which of the four an element is: `block`, `note`, `group`, `proxy`. Closed, engine-level, and decides what draws it |
| **type** (stereotype) | a subtype of one element or relationship — open-ended, and **empty until somebody sets one**. A type subtypes **within** an element type, never across one. Not to be confused with the domain's *word* for a block, which is one per project |
| **domain word** | what a project calls its blocks, groups and relations — `Module`, `Character`, `Feature`. One set per domain, shown as a placeholder, never written onto an element |
| **domain** | **contested — see tasks.md.** Currently `graph.domain`: the project's subject matter (`software`, `writing`), supplying its words and starting relations. Intended to mean the **diagram type** instead |
| **unit** | what a diagram calls its elementary block — `block`, and one day `activity`. A property of the **diagram type**, not of the subject matter: a block diagram is built from blocks whether it describes software or a story. Derived, never stored |
| **template** | a saved type, ready to be made again *(planned)* |


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
| **proxy** | a virtual block standing in for one that lives in another layer, so a relationship can cross a structural boundary. Shows the real block's name. What it stands for is an **attribute of the proxy** — one thing appearing twice, not two things joined. One per layer per block, and never for a block already in that layer |
| **root** | the block that holds every other. Carries the project's metadata, has `parent: null`, and has no frame — a frame is a block seen from inside, and root has no outside |
| **name** | unique among an element's siblings; position in the tree is what makes it unique in the project. An unnamed element is numbered among its own element type — `block 1`, `note 2` |


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
| **port** | a seat that **is** an element, because somebody made or promoted one. Same thing as an interface |
| **promotion** | turning an anchor into a port, where it sits. The only way a relationship's end becomes an element |
| **stub** | the short run leaving a seat before the line turns |
| **lane** | the offset given to runs that would otherwise draw on top of each other |


## Relationships

| Term | Means |
|---|---|
| **kind** | what a relationship's ends *are*: `untyped`, `flow`, `assoc`, or `tie`. Closed, engine-level |
| **reference** | a relationship with a **proxy at one end**, so it reaches something in another layer. **Derived, never a kind** — drawing a line to a proxy makes one, and it keeps whatever kind it was given. Drawn violet and dashed |
| **tie** | the relationship joining a note to what it describes |
| **direction** (`dir`) | which way its arrows point. Independent of kind |
| **type** | the free-text name of what a relationship means — its stereotype |
| **leader** | how a tie draws: a dotted line taking no pointer, never routed. A rule about drawing, not about what a tie is |

**Anything joining two elements is a relationship.** A kind may draw as something other than a
routed line, but that never makes it a second way to join things — one mechanism, one cascade
when an end is deleted, one list to read them from. The test is simple: **drawn as a line between
two things → a relationship; not a line → an attribute.** A tie is a line, so it is a
relationship. Membership is not — a group draws a boundary round its members, never a spoke to
each — so it stays an attribute of the member.


## Attributes

Descriptive values. An attribute has no identity of its own — it is a named value carried by an
element or a relationship, and never changes what contains what.

| Term | Means |
|---|---|
| **attribute** | a named value on an element or a relationship. Never structural — it never changes what contains what |
| **membership** | the attribute naming the groups a block belongs to. Held on the block; a group's member list is derived from it, so the two can never disagree |
| **annotation** | an element that describes or organizes without structuring: a note or a group. Drawn on the canvas, never listed in the explorer |
| **group** | an **organizational element, local to one layer**: a boundary drawn round blocks in that layer to mark them as belonging together. It organizes without structuring — never a parent, and no part of the tree. A member that moves to another layer leaves the group |
| **boundary** | the line a group draws. Its members' bounds plus a margin, so it is a fact about what it holds |
| **note** | an element drawn as a card of text |
| **hug** | how far a boundary reaches past its members |


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
