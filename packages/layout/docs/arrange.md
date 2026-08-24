# Arrange

**Where everything in a layer sits.** One setting, six values. Four carry a reading direction and two do not.

```
laid(graph, layer) → Placed[]
```

## The six

| | Does |
|---|---|
| `free` | **hand placement is what draws**; anything unplaced fills the room around it |
| `grid` | tiles outward from the middle, cells sized to their contents |
| `right` · `left` · `down` · `up` | ranks by relationships, reading that way |

**`arrangement` is model data, not session state.** Inference reads the reading direction, and an inference is permanent — so where a layer reads *from* has to travel with it.

## Ranking

**Nothing pointing at it comes first**, and each rank sits one step further along. Within a rank, things are ordered by where what they relate to sat in the rank before — so a chain comes out on one row and every line along it is straight.

**A ranking wants a DAG and a model may hold a cycle** — a coolant loop is one on purpose. An edge that would close one is set aside for the ranking and drawn like any other, so a loop still reads left to right with the return leg running back.

**The first relationship drawn wins.** Edges are taken in order and one is kept unless it closes a cycle over what is already kept — so the direction a layer reads follows the order somebody stated it in, and the same input always drops the same edge.

**Ranks resolve through the owner**, so an end seated on an interface ranks the card it sits on and promoting a seat never moves a chain.

## The rules that hold whatever the value

- **Nothing is discarded by arranging.** A block's stored position is always kept, so returning to `free` returns the layout. That is what makes arrangement safe to be a setting rather than an act.
- **Everything lands on the grid.** The backdrop dots are that grid.
- **Positions are relative to the layer's centre**, so a layer stays centred as it grows in any direction.
- **Interfaces are not laid out.** They are seated on their owner, so they never appear here.
- **Stable under reorder.** Feeding the same layer in a different order gives the same placement.

## Bounds and boundaries

**`bounds` is twice the furthest edge from the origin**, plus the room a new thing needs. Twice the furthest *corner* plus that box's own width counts the same box twice and leaves a layer drawn at a third of the size it could be.

**`boundary` is its members' bounds plus half a cell** — a fact about what a group holds, never a stored size. A group is never a parent, so the boundary owns nothing.
