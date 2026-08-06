# Definitions

The words mndflow uses, and exactly what each one means. One entry per term, so that a rule
written anywhere else can be read without guessing.

- **What each part does** → [spec.md](spec.md).
- **Why it is that way** → [design.md](design.md).
- **What is missing** → [tasks.md](tasks.md).


## Structure

| Term | Means |
|---|---|
| **node** | the only structural object. Everything else describes nodes |
| **block** | a node that is not on its parent's frame edge |
| **container** | a block holding child blocks. Not a type — a running tally of what it holds |
| **interface** | a node on its parent's frame edge. Also called a **port** |
| **reference** | a stand-in for a node that lives in another layer |
| **role** | block / container / interface. Derived from what a node holds and where it sits |


## The canvas

| Term | Means |
|---|---|
| **layer** | the node whose inside the canvas is drawing |
| **scope** | the layer being drawn. Set by clicking in the explorer |
| **context** | what is selected within the layer. Set by clicking on the canvas |
| **frame** | the border of the open layer, seen from within |
| **wall** | one of the frame's four sides. **Only the frame has walls** — a card's sides are never named, because a card has no border zone for a gesture to land on |
| **band** | the dimmed margin between the frame and the edge of the panel |
| **card** | a node as drawn on the canvas |
| **chip** | one cell of a container's treemap |


## Where a line meets a card

| Term | Means |
|---|---|
| **seat** | a place a line may meet a border: every 12 units along it, never on a corner |
| **anchor** | a seat a relationship meets that has **no node behind it**. Draws nothing |
| **port** | a seat that **is** a node, because somebody made or promoted one. Same thing as an interface |
| **promotion** | turning an anchor into a port, where it sits. The only way a relationship's end becomes a node |
| **stub** | the short run leaving a seat before the line turns |
| **lane** | the offset given to runs that would otherwise draw on top of each other |


## Relationships

| Term | Means |
|---|---|
| **relationship / edge** | a join between two nodes |
| **kind** | what a relationship's ends *are*: `untyped`, `flow`, or `assoc` |
| **direction** (`dir`) | which way its arrows point. Independent of kind |
| **relation** | the free-text name of a relationship's kind |
| **tie** | what joins a note to what it describes. Drawn as a **leader**, never a relationship |
| **leader** | the dotted line drawn for a tie. Takes no pointer and is never routed |


## Attributes

| Term | Means |
|---|---|
| **attribute** | a descriptive value on a node or relationship. Never structural |
| **shared** | held by more than one object. Sharing is what makes an attribute a grouping |
| **annotation** | an attribute that draws on the canvas |
| **group** | an annotation drawn as a boundary round its holders |
| **boundary** | the line a group draws |
| **note** | an annotation drawn as a card of text |
| **hug** | how far a boundary reaches past its members |


## Layout

| Term | Means |
|---|---|
| **unit** | anything laid out as a whole: a card, a group, or a note |
| **cluster** | units drawn together by relationships, arranged as one region *(backlog)* |
| **arrangement** | how a layer lays out what it holds: `free`, `grid`, `radial`, `across`, `down`. An **action** that writes positions, not a mode. One per layer |
| **free** | the absence of an arrangement. Arranges nothing; every card stays where it is |
| **resting layout** | what a render runs: placed cards stay, unplaced ones fill around them |
| **axis** | the direction an arrangement ranks along. `free`, `grid` and `radial` have none |
| **rank** | one step along the axis. Things pointing at each other sit in successive ranks |
| **hard constraint** | something honoured **by** an arrangement, which survives it. Ports and walls, and nothing else |
| **retained placement** | something an arrangement **replaces** rather than honours, and which is yours again afterwards. Card positions |
| **rigid in shape, not size** | a unit keeps who sits beside whom; the distances are layout's |


## History

| Term | Means |
|---|---|
| **step** | one user action and every mutation it made. One gesture is one step |
| **mutation** | a single change within a step |
| **the log** | the ordered list of steps. The source of truth; the graph is folded from it |
| **fold** | rebuilding the graph by replaying every applied step |
| **derived** | worked out from the layer rather than stored. Seats, routes, boundaries, roles |
