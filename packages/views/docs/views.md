# Views

**One way to draw.** A layer is what is looked at; this package is the looking. It reads the graph and hands back a **Scene** — plain data, importing nothing drawable.

**There is one way to draw.** A grid is how a layer states order and allocation; there is no choice of view module. The canvas draws the whole system in a system view — **package** (`survey.ts`) or **profile** (`profile.ts`), both trees, a definition's structure to its top level only — or one block in the layer view its kind calls for: **internal**, **grid**, **folder** or **definition**. A data perspective over the model (a table, a matrix) still wants a word.

```
project(graph, layer, config) → Scene
```

## What is in here

**Sizes, placement, routing and the projection, together.** They are one answer: where a block goes depends on how big it is, what it is seated in, and what the lattice is. Splitting them would put a seam through the middle of one calculation.

| | Is |
|---|---|
| `size.ts` | **the one measure.** `UNIT` is a square of the guides; `CELL` is a block plus a gap on every side. Everything else is derived from those |
| `arrange.ts` | where everything in a layer sits — hand placement under `free`, auto-layout under `auto` |
| `bands.ts` | members packed inside a band, and seated blocks placed by their cell |
| `pack.ts` | auto-layout: related clusters around their mates, notes and references beside what they name, the clusters shelved in reading order |
| `seat.ts` · `ends.ts` | where a line meets a border, which seat each end takes, and which way it sets off |
| `route.ts` | where a run goes between two borders, round the cards it passes |
| `block.ts` | the projection: graph and layer in, Scene out |
| `look.ts` · `derive.ts` | what a card wears — its hue strayed by `vary` per definition, so kin read alike — and the marks it reads by; both derived every draw |
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
| `auto` | auto-layout: stored positions are ignored and every loose block gets a box worked out from the relationships and the sizes. What a layer says nothing about |
| `page` | holders as full-width boxes down the page: each box's cards in rows wrapping at its width (`layout.across` cards), its own holders below them. What the package view and a folder nobody arranged draw |

**Related blocks share a row or a column and sit one gap apart**; the clusters follow in reading order on a shelf as wide as the page layout's (`page_wide`: `layout.across` cards, which the projection sets to the canvas's width), so a layer laid out `auto` reads down the page as a folder does. Inside a group the shelf is square-ish. A holder is one rectangle among its neighbours, sized from what it holds, and spaced like any other box. **The gap is a hard one-unit halo, never a post-pass hope.**

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
| **read-through** | an opened usage draws its definition's structure beside its own children, one step; a usage on the layer wears its definition's interfaces as `usage/part`. Parts wear the link mark |
| **flatten** | folders draw as groups, so a whole domain reads on one page |
| **package view** | a whole section (`look.kind: "package"`, and nothing open, `open: null`): every package a full-width box of its domain, flattened, laid out as a `page` and scrolled rather than zoomed. Which packages, and how many cards across, are the host's to say. Cards keep their real ids, so a pick is the block itself |
| **folder** | a package or folder's own layer, editable; laid as a `page` where nobody placed what it holds, else as placed. Its room hugs what it holds, and the page is read down the view |
| **definition** | `definition.ts`: the definition large on its own layer, placed boxes round it — what it extends above, in and out ports left and right, both-way ports then tags and traits below, its body as a tied note top right. Placed, so nothing is dragged |
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
