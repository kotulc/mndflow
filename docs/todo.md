# Todo

**What is decided but not built, and what is still undesigned.** The goal state lives in design.md, spec.md and each package's `docs/`; this is the worklist against it, newest thinking first.

Not a backlog of everything — an item earns a line here by being a decision somebody has to act on.


## The grid

**A visual spreadsheet for blocks.** One canvas view, in which a group may carry a grid: rows, columns, merged cells, optional headers in either dimension. Blocks are plugged into cells and pulled back out. **This is the central rapid-prototyping feature**, and swimlanes, lifelines, tables and matrices are all meant to fall out of it rather than each costing code.

**Why it matters beyond layout.** The inference that was cut read order from *position along a directional arrangement* — a guess, which is why it needed four tiers and a write-home gate to be safe. A cell address along the reading direction **is** the order, stated rather than guessed. That is what gives design.md's *the model defines itself as the user builds* a mechanism again.

### Decided

| | |
|---|---|
| **a cell** | derived, never a block. An empty cell is an address nobody claimed |
| **an address** | rides on the block: `cell: {r, c}` replaces `x`/`y` for a gridded block, exactly as `side`+`at` replace them for an interface |
| **the grid** | **one lattice, and it is the backdrop dots.** `GRID = 24`, everything with a place of its own lands on it, and a group is a named rectangular region of it — not a second grid |
| **a group** | a grid region with rows, columns and optional headers. Draw it empty, fill the cells afterwards |
| **a boundary** | a group with no rows or columns — today's band, unchanged |
| **membership** | `groups: Id[]` → `group: Id`. **One group per block, no nesting** |
| **ports and relations** | a grid takes neither, exactly as a group takes neither. The blocks in its cells take both |
| **a layer** | holds any number of grids and free blocks side by side |
| **view modules** | the grid absorbs `table` and `matrix`. **One way to draw.** Tables and matrices return later as downstream features over graph metadata, out of scope for this cut |
| **`view` and `pin` are cut** | 8 block modules → 7, and the `view` definition group goes with them. **The word is reserved**, not retired: a *view* will mean a table, matrix or sequence perspective over model data, designed when those are built. It means nothing today, so it says nothing today |
| **zero engine containment rules** | the last one — *a view holds references, never parts* — had only the `view` module to attach to. Containment is now entirely the user's, plus whatever a vocabulary states in `holds` |
| **`group` is still a block** | and the docs stop implying every block is a card you can relate and descend into. What a block can *do* varies by module already |
| **arrangement** | drops `grid` — two things called grid is the collision the vocabulary rework was about. Five values: `free` and the four directions |
| **search results** | leave the stage entirely: the explorer lists them, and the contents tray becomes context-sensitive and expands to fill the stage |
| **cells are fixed** | a cell is one block plus its margin. **Never variable, never auto-fit** |
| **blocks never resize** | a block keeps its natural size wherever it sits. In a merged region larger than it, it **centres** |
| **footprint** | how many cells a block needs, derived from its size. A container is 2×1 cells and claims both |
| **merges are stated, and separate** | a merge sets a *cell's extent*; a footprint says *how many cells a block needs*. Two mechanisms that do not collide — a merged 1×4 holding one block is that block centred in a tall cell |
| **overlap** | **hard inside a group** — a cell holds one block, and that is what lets allocation be derived at all: two blocks sharing a cell and *what is allocated to this row* stops having an answer. **Assistive outside** — snap, and nudge clear on drop through `clear_of`, so `free` stays free |
| **allocation** | **the SysML word, and the right one.** A header cell holds a block like any other cell; every block in that row or column is *allocated to* it. Swimlane, lane owner and tag are one fact under one standard name |
| **allocation is derived** | from position, stored nowhere. A block leaving the grid loses it, which is correct — the allocation **was** the position. Durable classification is a field somebody typed, a different thing with a different gesture |
| **allocation has identity** | it is to the header's **block**, not to its label, so two grids headed by the same block mean the same thing and renaming it renames everywhere. A header with a label and no block still tags, by text, and is honestly weaker |
| **row × column** | a pair of allocations, which is what makes an allocation matrix fall out later: rows one domain, columns another, a filled cell allocated to both |
| **notes are always about something** | right-click an element and the note *and* its tie are made in one step. No free-floating notes, because right-drag on empty space now draws a group |
| **containers** | ordinary blocks in the grid, with slots proportional to their size. **A gridded container minifies** — drawn at cell size, no child treemap; its icon is what still tells it apart |
| **headers** | **row 0 and column 0**, ordinary cells marked by the group's `headers` setting. Drawn distinctly — a darker ground — because they carry meaning the cells beside them do not |
| **cells are selectable** | a cell answers a click and a context menu of its own: merge, split, insert, remove. So the action registry gains a **`cell` scope**, and a cell is addressed by group plus row and column rather than by id |
| **a grid never grows by accident** | its extent is what you drew. A block dropped past the last row lands free on the layer beside it |
| **drawing a grid captures** | right-drag over loose blocks and they seat into the cell each overlaps; two landing in one resolve to the nearest free cell. **Sketch first, impose order after** — the fastest path from sketch to structure |
| **displacement is never destructive** | removing a row, or merging over an occupied cell, drops the block's address and leaves it free on the layer. A layout gesture must not destroy model content — a block may be referenced from other layers |

### Schema

| On `Block` | |
|---|---|
| `group?: Id` | replaces `groups?: Id[]` |
| `cell?: {r, c}` | the address inside the holding group |
| `rows?`, `cols?` | only meaningful on a group — its extent, which is what lets an empty grid draw |
| `headers?` | `none` · `row` · `col` · `both` |
| `merges?: Span[]` | spans, on the grid, never on cells |
| `x`, `y` | **a grid owns its corner.** A boundary still derives its bounds from members; a grid cannot, or an empty one would be nothing |

**A slot is a snap target, never an address.** `at` stays a fraction, so resizing a block never invalidates a port — which is the whole reason a container can change size without its relations moving. `seats(len)` already derives slots proportional to edge length and `seat_at` already writes the fraction.

| Unit work | |
|---|---|
| `BLOCK.h` | `GRID * 1.5` → **`GRID * 2`**. Makes blocks integer-unit for the first time, and gives the 3 side slots and 13 top/bottom slots asked for, with no new machinery |
| `CONTAINER.h` | `GRID * 3.5` → **`GRID * 4`**, so a container is exactly two cells |

### Surface

| New mutations | New actions |
|---|---|
| `set_grid {id, rows, cols, headers}` | `group` **gains `rows`/`cols`/`headers`** and stops requiring members — *draw a grid here* and *draw a boundary round these* are one act with different arguments |
| `seat_cell {id, r, c \| null}` | `insert` — a row or column at an index |
| `merge_cells` · `split_cells` | `remove` — its inverse |
| `join_group` + `leave_group` → `set_group {id, group \| null}` | `merge` — with `into` to span, without to split |
| | `chain` — link adjacent occupied cells along the layer's reading direction, in one click |
| | `transpose` — rows↔cols and `(r,c)→(c,r)`. Relations are between blocks, so lines re-route and nothing in the model changes |

**No new adjustment.** Dropping a card into a cell is `place` resolving to an address, through the seam that already turns a drop onto a card into `move`.

**Gestures move.** Right-drag on empty space stops making a note and starts drawing a group, sized in cells, with rows and columns added as the sweep grows. `note` moves from layer scope to block/edge scope.

### Plan

**Each step is drivable before the next begins.** Steps 1 and 2 are verifiable headless — `mnd project` prints a layer as text, so a grid is legible in the CLI before anything is drawn.

#### 1 — the model

| | |
|---|---|
| `types.ts` | `groups?: Id[]` → `group?: Id`; add `cell?: {r, c}`, `rows?`, `cols?`, `headers?`, `merges?: Span[]`. Mutations: `set_group`, `seat_cell`, `set_grid`, `merge_cells`, `split_cells`; drop `join_group` and `leave_group` |
| `fold.ts` | the derived readers: `grid_of`, `cell_of`, `members_of`, `at_cell`, `merge_at`, and the two that matter — `allocations_of(block)` and `allocated_to(header)` |
| `door.ts` | migrate `groups` → `group`; drop a `cell` outside its grid, on a block with no group, or second into an occupied one; drop overlapping merges. **Every repair frees the block rather than deleting it** |
| `file.ts` | the new fields in the canonical layout |

**Verified by**: `mnd run` to build a grid, `mnd fold` to read it back, `mnd check` on a hand-broken one.

#### 2 — placement

| | |
|---|---|
| `size.ts` | `CELL`, and the cell box for an address, honouring merges |
| `block.ts` | gridded members placed by address; a group's box from its **extent** when it has rows and columns, and from its members' bounds when it does not |
| marks | `cell`, `header`, `merged`; a gridded container drawn minified |

**Verified by**: `mnd project` — the ASCII drawing shows the grid.

#### 3 — the canvas

| | |
|---|---|
| hits | cells answer a click; a drag picks a range |
| gestures | right-drag on empty draws a grid and captures what it covers; drop seats into a cell; `note` moves to element scope |
| menu | the `cell` scope and its actions — merge, split, insert, remove |
| actions | `insert`, `remove`, `merge`, `transpose`, `chain` |

**Verified by**: driving the app in a browser. Nothing here is done because a suite is green.

#### 4 — the retirement

`table`, `matrix`, `view` and `pin` come out **as one piece** — cutting `pin` and the `view` module collapses `drawn_by` to always-block, which orphans the `narrowed ? "table"` search path. Takes the options `views` group, the `view` definition group, `ViewModule`/`VIEW_MODULES`, the `view` component and the kit exports with it. **Blocked on step 5.**

#### 5 — search results move

The explorer lists them; the contents tray becomes context-sensitive and expands to fill the stage.

#### 6 — swimlanes, as the proof

A grid with a block in each row header, flow relations across. **Should cost no new code.** If it does, step 2 is wrong.

### Watch for

| | |
|---|---|
| **`insert` through a merge** | inserting a row across a merged span must extend the span, not split it. The fiddliest arithmetic here |
| **the `cell` scope** | `Context` gains cells alongside `picked`. Explicit, rather than encoding an address in an `Id` string — a cell has no id and pretending it does would leak into everything that looks a block up |
| **`chain` under `free`** | no reading direction means no adjacency to follow. Refuse in words rather than guessing row-major |
| **the `groups` migration** | touches fixtures, the boundary code in `block.ts`, and the group handling in `Stage` |


## Pinning

**An explicit definition-management strategy.** Undesigned — to be expanded.

What it has to answer, from what has already gone wrong:

- **A definition retired in code lives on in every log already written.** The seed is laid down once, when storage is empty, so dropping `behavior`, `action`, `state` and the three reading views from `base` left them in every existing workspace. Starting a new workspace is currently the only cure.
- **`base` is described as shipped, locked, and known to the engine by id** — which would justify reconciling it on load, but nothing does.
- Which definitions a project draws on is currently an ordinary field with a hardcoded name, and **nothing checks that a named package exists**.


## Vocabulary

**Stop inventing words where a convention exists.** With one way to draw, several terms have nothing left to distinguish.

| Goes | Why |
|---|---|
| **view module** | there is one |
| **view definition** | nothing left to configure |
| **layer view** | it is *the diagram* |
| **reading** | already cut |

| Stays | Is |
|---|---|
| **layer** | the block you are inside |
| **diagram** | what a layer looks like drawn |
| **grid** | the lattice. One meaning, everywhere |
| **group** | a named region of the grid |
| **projection**, **Scene** | internal. Code words, not user words |

**Reserved, not retired.** *View* will name a data perspective — table, matrix, sequence — over the model. It is cut now because it currently means nothing, and it comes back defined.

**Use the standard word wherever one exists.** `allocation` is the case that proved the rule: what looked like three inventions — swimlane, lane owner, tag — was one construct SysML already names.


## Loose ends

| | |
|---|---|
| **Behaviour has no mechanism** | *The model defines itself as the user builds* is design.md's driving concept and nothing implements it. The grid is the intended answer |
| **Promotion has no gesture** | `interface` takes `edge` and `end`; only a gesture on a relationship's end knows both, and a menu raised there offers edge-scoped actions. Either the anchor gesture calls `interface` directly, or `interface` widens its scope |
| **A named package is unchecked** | see *Pinning* |
| **SVG honours no definition shape** | the headless drawing draws every card as a rectangle. A definition picking `diamond` or `hex` renders correctly on the canvas and not in an export |
