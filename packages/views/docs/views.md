# Views

**One way to draw.** A layer is what is looked at; this package is the looking. It reads the graph and hands back a **Scene** — plain data, importing nothing drawable.

**There is no longer a choice of view module.** `table` and `matrix` were absorbed by the grid, and `view` went with them: what was *which way is this layer shown* is now *how are the blocks in it placed*. ***View* is reserved, not retired** — it will name a data perspective over the model, and it comes back defined.

```
project(graph, layer, config) → Scene
```

## What is in here

**Sizes, placement, routing and the projection, together.** They are one answer: where a block goes depends on how big it is, what it is seated in, and what the lattice is. Splitting them would put a seam through the middle of one calculation.

| | Is |
|---|---|
| `size.ts` | **the one measure.** `UNIT` is a square of the guides; `CELL` is a block plus a gap on every side. Everything else is derived from those |
| `arrange.ts` | where everything in a layer sits — hand placement under `free`, auto-layout under `grid`, cells by address, bands by their members |
| `seat.ts` | where a line meets a border, and which seat each end takes |
| `block.ts` | the projection: graph and layer in, Scene out |
| `look.ts` · `derive.ts` | what a card wears, and the marks it reads by — both derived every draw |
| `svg.ts` · `text.ts` | a Scene drawn without a browser |

## The lattice, and the one measure

**`UNIT` is the only ruler.** Everything with a place of its own lands on it — a card, a note, a hand drop, a grid's corner — so a block the layer placed and a block seated in a grid line up.

**A `CELL` is not a second measure.** It is what a grid seats things at: one block plus a gap of air on every side. Nothing outside a grid is quantised to one, no gap is counted in them, and no arrangement steps by one. That was the old mistake — two rulers on one drawing, the coarser winning — and it is the only part that was wrong.

## Two arrangements

| | Is |
|---|---|
| `free` | hand placement, rounded to the lattice. What a layer says nothing about |
| `grid` | auto-layout: stored positions are ignored and every loose block gets a box worked out from the relationships and the sizes |

**Related blocks share a row or a column and sit one gap apart**; unrelated ones fill the next slots of a square-ish shelf. A holder is one rectangle among its neighbours, sized from what it holds, and spaced like any other box. **The gap is a hard one-unit halo, never a post-pass hope.**

**The picture is written down on the way out of `grid`**, as ordinary placements, so `free` carries on from where `grid` left off.

## Holders

**A boundary and a grid are both holders**, and most callers mean both — what a run may pass through, what a sweep picks, what a drop must stay clear of. `holds(node)` asks that once; asking it as two literal comparisons is how a grid ended up walling in every line between its own cells.

| | Sized from | Members placed by |
|---|---|---|
| **group** | its members' bounds, plus a gap | the same packer the layer uses |
| **grid** | its own extent, in cells | their address |

**Nesting is ordinary and ordered by depth.** `group_depth` decides both what is placed first and what draws on top, so a grid inside a band is placed after the band has a corner of its own.

## The Scene is the seam

**Plain data, importing nothing drawable**, which is what makes the projection a pure function and most of the product provably correct before anything is drawn. `stage` turns a Scene into DOM; the CLI turns one into text; `kit` hands it outside.

| Invariant | |
|---|---|
| no two boxes share an id | a hit could not name one of them |
| every route's ends name a drawn box | a line to nowhere is a bug in the producer |
| every bend is a right angle | the one thing a route may never do |
| a seated box is seated on something drawn | an interface without its card |
| every box is inside the frame | a card outside the layer it belongs to |
| every cell of a grid lands on the lattice | a grid half a unit off its own guides |

**A producer proves what it emits satisfies these; a consumer proves it draws anything that does. Neither imports the other.**

## What is not here

- **No mutation.** Projecting reads; a gesture leaves as an action name somebody else runs.
- **No DOM.** The only thing that needs a browser is what draws a Scene.
- **No placement stored by a consumer.** Projecting is what places, and the Scene already carries the geometry.
