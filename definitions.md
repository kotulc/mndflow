# Definitions

The words mndflow uses, and exactly what each one means. One entry per term, so that a rule
written anywhere else can be read without guessing.

- **What each part does** → [spec.md](spec.md).
- **Why it is that way** → [design.md](design.md).
- **What is missing** → [tasks.md](tasks.md).


## The graph

Two things and no more: **elements**, which are placed and drawn, and **relationships**, which
join them. Everything else describes one of the two.

| Term | Means |
|---|---|
| **element** | anything the graph holds as an object: a block, a note, a group, a proxy. Placed, drawn, carries attributes. Held in `graph.elements` |
| **node** | the graph-theory word for an element. The same thing; `element` is the word the code uses |
| **relationship / edge** | a join between two elements. Not an element — it is placed by its ends, drawn as a line, and joins rather than sits |
| **element type** | which of the four an element is: `block`, `note`, `group`, `proxy`. Closed, engine-level, and decides what draws it |
| **type** (stereotype) | a user-defined subtype of an element or a relationship — colour, icon, defaults. Open-ended. A type subtypes **within** an element type, never across one |
| **domain** | the project's vocabulary and starting relations, one per project. Formerly called its template |
| **template** | a saved type, ready to be made again *(planned)* |


## Structure

| Term | Means |
|---|---|
| **tree** | the project's structural hierarchy: blocks nested inside blocks. The organizational core the whole project hangs from |
| **parent** | what an element sits inside. The tree is `parent` and nothing else |
| **containment** | being inside something. **Implied by `parent`, never stored as a relationship** |
| **block** | the base element, and the default: one discrete structural thing |
| **container** | a block that holds other blocks. Derived from what it holds, so it is a way a block *looks*, not a thing it *is* — it is still called a block |
| **interface** | a block sitting on its parent's frame edge. Also called a **port**. Derived from having a side, the same way containment is derived |
| **proxy** | a virtual block standing in for one that lives in another layer, so a relationship can cross a structural boundary. Shows the real block's name |
| **root** | the block that holds every other. Carries the project's metadata, has `parent: null`, and has no frame — a frame is a block seen from inside, and root has no outside |
| **name** | unique among an element's siblings; position in the tree is what makes it unique in the project. An unnamed element is numbered among its own element type — `block 1`, `note 2` |


## The canvas

| Term | Means |
|---|---|
| **layer** | the block whose inside the canvas is drawing |
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
| **kind** | what a relationship's ends *are*: `untyped`, `flow`, `assoc`, `reference`, or `tie`. Closed, engine-level |
| **reference** | the relationship binding a proxy to the block it stands for. The one kind that crosses layers. One proxy per layer per block, and never for a block already in that layer |
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
| **attribute** | a named value on an element or a relationship. Never structural |
| **membership** | the attribute naming the groups a block belongs to. Held on the block; a group's member list is derived from it, so the two can never disagree |
| **annotation** | an element that describes rather than structures: a note or a group. Drawn on the canvas, never listed in the explorer |
| **group** | an element drawn as a boundary round its members |
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
| **step** | one user action and every mutation it made. One gesture is one step |
| **mutation** | a single change within a step |
| **the log** | the ordered list of steps. The source of truth; the graph is folded from it |
| **fold** | rebuilding the graph by replaying every applied step |
| **derived** | worked out rather than stored. Seats, routes, boundaries, containment, a group's member list, and what a proxy stands for |
