# Views

**One way to draw.** A layer is what is looked at; this package is the looking. It reads the graph and hands back a **Scene** — plain data, importing nothing drawable.

**There is one way to draw: the world.** Every room of a package is projected by its own kind — internal, allocation, sequence, class, entity, registry — and composed inside its parent at the size of what it holds (`world_of`, rooms-plan.md phase 1). The canvas draws the world and moves a camera through it; there are no system views. A projection stores nothing it draws. `layered` lays a room out by its relations.

```
world_of(graph, root, config) → World     // the canvas: every room composed
project(graph, layer, config) → Scene     // one room alone: the tray's previews, and each room before composing
```

## What is in here

**Sizes, placement, routing and the projection, together.** They are one answer: where a block goes depends on how big it is, what it is seated in, and what the lattice is. Splitting them would put a seam through the middle of one calculation.

| | Is |
|---|---|
| `size.ts` | **the one measure.** `UNIT` is a square of the guides; `CELL` is a block plus a gap on every side. Everything else is derived from those |
| `arrange.ts` | where everything in a layer sits — hand placement under `free`, auto-layout under `auto`, a treemap under `treemap` (`treemap.ts`) |
| `registry.ts` | a registry as a list, a matrix, and a treemap Scene built directly: entries as tiles by home folder, or an entry's uses |
| `bands.ts` | members packed inside a band, and seated blocks placed by their cell |
| `pack.ts` · `float.ts` · `grid.ts` | auto-layout: runs of one arrangement in explorer order — a column, or rows filling toward the canvas's shape (`filled`, `room_wide`) — and aside cards floating beside what they are tied to |
| `seat.ts` · `ends.ts` | where a line meets a border, which seat each end takes, and which way it sets off; a second line between the same two cards takes the faces a quarter turn round |
| `route.ts` | where a run goes between two borders, round the cards it passes |
| `block.ts` | the projection: graph and layer in, Scene out |
| `world.ts` | the world: `world_of` composes every room, `focused` hands the canvas one room as the frame with the context marked, and `room_under`, `home_of`, `local_scene` read an edit in the room it happens in |
| `classes.ts` · `sequence.ts` | the diagram views: a graph drawn as internal — class and entity diagrams (`class_graph`), stored lines carrying their ends — or a Scene built directly where time is the geometry (sequence, its runs given as `points`) |
| `look.ts` · `derive.ts` | what a card wears — its hue strayed by `vary` from its parent's shade, so kin read alike — and the marks it reads by, `definition` (outlined on the canvas) and `relation` (a wire swatch) among them; its `card.shape`, else its layer's `layout.shape`; both derived every draw |
| `legend.ts` | the key to one layer: the kinds it draws and the system marks they wear, folded and counted off the Scene alone |
| `svg.ts` · `text.ts` | a Scene drawn without a browser |

## The lattice, and the one measure

**`UNIT` is the only ruler.** Everything with a place of its own lands on it — a card, a note, a hand drop, a grid's corner — so a block the layer placed and a block seated in a grid line up.

**A `CELL` is not a second measure.** It is what a grid seats things at: one block plus a gap of air on every side. Nothing outside a grid is quantised to one, no gap is counted in them, and no layout steps by one. That was the old mistake — two rulers on one drawing, the coarser winning — and it is the only part that was wrong.

## Layouts

**A layer's layout is a setting** (`layout.kind`), said by its definition and overridable by the layer. The kit ships a small fixed set; an unknown kind draws as `auto`.

| | Is |
|---|---|
| `free` | hand placement, rounded to the lattice |
| `auto` | auto-layout: stored positions are ignored; blocks fill toward the canvas's shape in reading order and notes float beside what they are tied to. What a layer says nothing about |
| `page` | holders as full-width boxes down the page: each box's cards in rows wrapping at its width (`layout.across` cards), its own holders below them. What the package view and a folder nobody arranged draw |

**Each kind arranges its own way, in explorer order** (`runs`, `float.ts`): consecutive cards sharing a `card.arrange` form a run; `rows`, unsaid, fills them toward the canvas's shape (`size.ts` `SHAPE`, set by the host): each in reading order takes the highest free spot, so small cards fill in beside a tall room; the width is the room's area at that aspect (`room_wide`), or `layout.across` cards where said, and every region band in a room shares it. A `column`, where said, stacks its cards, left edges aligned. Runs stack top to bottom, a gap apart. `layered` ranks both ways and keeps the one nearer the canvas's shape. **A card arranged aside** (a note) floats in the nearest free space beside what it is tied to; untied, beside the whole arrangement. **One rule places cards on a layer and in a group** (`noted`, `float.ts`). A tie is never routed: it runs straight and draws above the cards it crosses. Inside a group the fill is the canvas's shape too. A holder is one rectangle among its neighbours, sized from what it holds, and spaced like any other box. **The gap is a hard one-unit halo, never a post-pass hope.**

**The picture is written down on the way out of `auto`**, as ordinary placements, so `free` carries on from where `auto` left off.

## Holders

**A folder, a group and a grid all hold by `parent`**; they differ in how they draw what they hold.

| | Draws its contents |
|---|---|
| **folder** | hidden behind its card; you descend. Drawn as a group when the layer is flattened |
| **group** | inline, inside its rim |
| **grid** | in cells, each compact |

**The blocks a layer draws are those whose nearest hiding ancestor is it**: a definition, a folder or any block holding blocks hides; a group or a grid shows through. **A group and a grid are both inline holders**, and most callers mean both — what a run may pass through, what a sweep picks, what a drop must stay clear of. `holds(node)` asks that once; asking it as two literal comparisons is how a grid ended up walling in every line between its own cells.

| | Sized from | Members placed by |
|---|---|---|
| **group** | its members' bounds, plus a gap | the same packer the layer uses |
| **grid** | its own extent, in cells — a header line one unit across | their address |

**Nesting is ordinary and ordered by depth**, and depth decides both what is placed first and what draws on top, so a band inside a band is placed after the outer one has a corner of its own.

**A header line is one unit across.** The top row is one unit tall and the left column one unit wide, and a header cell's card fills it — the left column's turned upright.

## Projection

**A projection is a view of the slice the sections hold, from one layer.** Nothing it adds is stored.

| Transform | Does |
|---|---|
| **read-through** | an opened usage draws its definition's structure beside its own children, one step; every card on the layer, and the room, wears its ports — its own and its definition's chain's — laid in as seats under `block/port`. Parts wear the link mark |
| **world** | every room under a package root, each projected alone then composed into its parent's coordinates: its card replaced by its room node, which keeps the block's id, its runs routed inside its walls, its seats placed once from inside and stated for the parent. A line between two rooms is routed across the whole, through the walls between. An id a room would draw twice is kept apart under the room's (`room::id`). Cards keep their real ids, so a pick is the block itself |
| **folder** | a room laid out in rows, as any room hugging what it holds |
| **no derived line** | a view draws stored relations only; the class diagram's *extends*, from `type`, is the one exception |
| **layout** | the layer's layout kind places what is drawn |

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
