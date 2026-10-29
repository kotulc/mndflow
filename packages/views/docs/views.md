# Views

**One way to draw.** A layer is what is looked at; this package is the looking. It reads the graph and hands back a **Scene** — plain data, importing nothing drawable.

**Two ways to draw: the map, and a layer entered from it.** The map is one treemap of the models or the library (`map.ts`): what holds things as boxes, what is entered as chips, each as large as what it holds with a small treemap of it inside. A layer entered is placed by ELK (`flow.ts`) and projected by its own kind — internal, allocation, sequence, class, entity, registry (`layer.ts`). There is no package view: the map is the overhead. A projection stores nothing it draws.

```
model_map(graph) → Scene                         // the models: every package holding a model, stopping at diagrams
library_map(graph) → Scene                       // the library: packages, folders, each definition a chip by use
section_map(graph, lists) → Scene                // the one a section lists; project(graph, null) draws the models'
layer_scene(graph, layer, kind, config) → Promise<Scene>   // one layer entered, placed by ELK
project(graph, layer, config) → Scene            // one layer placed alone: other views, the kit's viewer, the CLI
```

## What is in here

**Sizes, placement, routing and the projection, together.** They are one answer: where a block goes depends on how big it is, what it is seated in, and what the lattice is. Splitting them would put a seam through the middle of one calculation.

| | Is |
|---|---|
| `size.ts` | **the one measure.** `UNIT` is a square of the guides; `CELL` is a block plus a gap on every side. Everything else is derived from those |
| `flow.ts` | **placement**: a layer's blocks by ELK, each container on its own, inside out — `layered` where lines join its children, packed where none do — the result nearest the canvas's shape kept; bands in list order, their axis returned (`across`); a group whose membership is a tree a compound of its members (`tree_groups`, `compounded`, shared with the treemap) |
| `arrange.ts` | where everything in a layer sits — placed ahead by `flow.ts` where ELK gave places (`placed_as`), else the synchronous fallback (`auto`, `layered`, `page`), a treemap under `treemap` (`treemap.ts`) |
| `map.ts` | the map, the models' and the library's: one treemap builder (`mapped`), the models a forest stopping at diagrams (`model_map`), the library at definitions (`library_map`), a section's (`section_map`); a chip's level — its name's line, its facts where it has room (`ROW`) — and its body, beside an upright head where the chip is narrow and tall (`UPRIGHT`) — a diagram's laid by its structure: its lines' layers, a grid's rows, its bands in list order and marks, one gap between any two tiles, a group a panel over its members' tiles (`paneled`) — in a box, over their cells, where its membership is a tree; a definition's its uses by place as its registry lays them, else its profile — what it declares, its places, a bar of its uses (`previewed`); anything else its preview (`profiled`); each block tile its own colour (`tint`); a least weight (`LEAST`), an empty model's beside its heaviest sibling (`EMPTY`), a chip showing rows the room they need (`ROWS`, `CARD_W`), a sliver widened and laid again (`SLIVER`); the focus, the area under a point, the nearest area one way (`map_focus`, `area_of`, `area_under`, `towards`). Where a double-click goes is core's `read_at` |
| `layer.ts` | a layer entered: placed by ELK, projected by its kind, only the side drawn (`layer_scene`, `laid_ahead`) |
| `about.ts` | what a block says off its layer: its facts strip (`facts_of`), a chip's preview (`preview_of`), its hover card (`hover_of`), its colour on a map (`colour_of`), its card's face off the layer (`face_props`, `known_face`); what some blocks hold between them (`counted`) |
| `library.ts` | a definition's uses grouped by the place each is drawn (`usage_groups`), laid out by **one rule** (`usage_layout`): at card scale for the registry, filling the room it is given for the library's chip and the tray's small map (`registry_map`); a grid's header among them drops its header marks (`registry.ts` `loose`); what a package or folder files (`filed`, `filed_map`) |
| `registry.ts` | a registry as a list, a matrix, and a treemap Scene built directly: entries as tiles by home folder, an entry's uses, or a definition's uses in boxes of their places |
| `bands.ts` | members packed inside a band, and seated blocks placed by their cell |
| `pack.ts` · `float.ts` · `grid.ts` · `layered.ts` | the synchronous fallback, for the kit's viewer and the CLI until they place by ELK: runs in explorer order filling toward the canvas's shape, asides beside what they are tied to, `layered` on dagre |
| `seat.ts` · `ends.ts` | where a line meets a border, which seat each end takes, and which way it sets off; a second line between the same two cards takes the faces a quarter turn round |
| `route.ts` | where a run goes between two borders, round the cards it passes |
| `block.ts` | the projection: graph and layer in, Scene out |
| `classes.ts` · `sequence.ts` | the diagram views: a graph drawn as internal — class and entity diagrams (`class_graph`), stored lines carrying their ends — or a Scene built directly where time is the geometry (sequence, its runs given as `points`) |
| `look.ts` · `derive.ts` | what a card wears — its hue strayed by `vary` from its parent's shade, so kin read alike — and the marks it reads by, `definition` (outlined on the canvas) and `relation` (a wire swatch) among them; its `card.shape`, else its layer's `layout.shape`; both derived every draw |
| `legend.ts` | the key to one layer: the kinds it draws and the system marks they wear, folded and counted off the Scene alone |
| `svg.ts` · `text.ts` | a Scene drawn without a browser |

## The lattice, and the one measure

**`UNIT` is the only ruler.** Everything with a place of its own lands on it — a card, a note, a hand drop, a grid's corner — so a block the layer placed and a block seated in a grid line up.

**A `CELL` is not a second measure.** It is what a grid seats things at: one block plus a gap of air on every side. Nothing outside a grid is quantised to one, no gap is counted in them, and no layout steps by one. That was the old mistake — two rulers on one drawing, the coarser winning — and it is the only part that was wrong.

## Layouts

**Every card is placed automatically; nothing is placed by hand.** A layer's layout is a setting (`layout.kind`), said by its definition and overridable by the layer; an unknown kind draws packed.

| | Is |
|---|---|
| unsaid | **packed**: where lines join a container's children it is ranked (`layered`), where none do its blocks are packed toward the canvas's shape. Reading order is file order |
| `layered` | a flow, a state machine: ranked by its relations, down the page or across it, whichever is nearer the canvas's shape |
| `treemap` | each block as large as what it holds, in the boxes of its folders, groups and regions |

**Each container is laid out on its own, inside out** (`flow.ts`): the room, then each region, group and folder in it, a parent seeing a child container at its laid-out size. Several tries run — both directions for `layered`, two goals at four aims for packing — and the one nearest the canvas's shape (`size.ts` `SHAPE`, set by the host) is kept. A note is placed by ELK beside what its tie meets; a tie is never routed and draws above the cards it crosses. Results are kept by what they were worked out from, so an edit lays out again only the rooms it touched.

**A layer with regions is banded** (`flow.ts` `banded`): its loose blocks and every region's members are one ELK layered run, **each band a partition in list order** — a region, or a run of loose blocks between regions, unnamed — so lines run from band to band the way they point. Across (bands as columns) and down (as rows) are both tried, and the one nearer the canvas's shape kept. A region no line meets is packed whole toward its band, in its list place. Each band spans the layer across the flow, a unit from the next. The world is laid out once per graph and canvas shape; focusing, reading and zooming never lay out again.

**The synchronous fallback** — what `project` places alone, for the kit's viewer and the CLI — keeps the older rules: `auto` fills toward the canvas's shape in reading order (`runs`, `float.ts`), a region stacks in a column, an aside (a note, a label) floats beside what it is tied to, `layered` ranks on dagre, and `page` lays holders down the page for the package view.


## Holders

**A folder, a group and a grid all hold by `parent`**; they differ in how they draw what they hold.

| | Draws its contents |
|---|---|
| **folder** | hidden behind its card; you descend. Drawn as a group when the layer is flattened |
| **group** | nothing: it holds nothing. Its members, the blocks tagged with its name, are drawn where they sit, and its panel round them |
| **grid** | in cells, each compact |

**The blocks a layer draws are those whose nearest hiding ancestor is it**: a definition, a folder or any block holding blocks hides; a grid shows through. **A grid is the one inline holder** — what a run may pass through, what a sweep picks, what a drop must stay clear of; `holds(node)` asks it. A group gathers by tag, never by holding, so it hides nothing.

| | Sized from | Members placed by |
|---|---|---|
| **group** | its members' bounds, plus a gap | kept together by the layout: its members, by tag |
| **grid** | its own extent, in cells — a header line one unit across | their address |

**Nesting is ordinary and ordered by depth**, and depth decides both what is placed first and what draws on top, so a band inside a band is placed after the outer one has a corner of its own.

**A header line is one unit across.** The top row is one unit tall and the left column one unit wide, and a header cell's card fills it — the left column's turned upright.

## Projection

**A projection is a view of the slice the sections hold, from one layer.** Nothing it adds is stored.

| Transform | Does |
|---|---|
| **read-through** | an opened usage draws its definition's structure beside its own children, one step; every card on the layer, and the room, wears its ports — its own and its definition's chain's — laid in as seats under `block/port`. Parts wear the link mark |
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
