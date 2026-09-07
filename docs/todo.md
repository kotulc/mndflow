# Todo

**What is decided but not built, and what is still undesigned.** The goal state lives in design.md, spec.md and each package's `docs/`; this is the worklist against it, newest thinking first.

Not a backlog of everything — an item earns a line here by being a decision somebody has to act on.


## Next up

**In order.** Each is a phase's worth on its own; the grid below is what they build on.

### 1 — Pinning

**Point at a block that already reads the way you want, and make that a definition.** A stereotype library built by pointing rather than by writing a definition first and applying it after. Explored here, built next.

**What the gesture is.** `pin` on an element takes the block's own `looks` — its card, its style, whatever it was customised with — and files a definition carrying them in the workspace's own folder. The element then *names* that definition instead of carrying the overrides, and anything else may name it too. Locked, because what is filed there is depended on by whatever names it.

**What has to be decided.**

| | |
|---|---|
| **where it is filed** | a reserved workspace-level folder, so `home` resolution finds it from anywhere. One folder, or one per source package? |
| **what it takes** | only `looks`, or fields and `holds` as well? Taking fields means pinning reads a usage's values as a *schema*, which is a guess |
| **what happens to the element** | it names the new definition and drops its `looks`. Reversible, or a one-way act? |
| **naming** | a definition needs a name and a pinned block may have none. Ask, or mint from the alias? |
| **re-pinning** | pinning a second block that reads the same way — a new definition, or a match against what is filed? Matching is where this becomes a vocabulary rather than a pile |

**What it also has to answer, from what has already gone wrong.**

- **A definition retired in code lives on in every log already written.** The seed is laid down once, when storage is empty, so dropping `behavior`, `action`, `state` and the three reading views from `base` left them in every existing workspace. Starting a new workspace is currently the only cure.
- **`base` is described as shipped, locked, and known to the engine by id** — which would justify reconciling it on load, but nothing does. **The door is where this belongs**, beside the migrations it already runs.
- Which definitions a project draws on is an ordinary field with a hardcoded name, and **nothing checks that a named package exists**.

**Watch for:** pinning is the first thing that writes a definition from a gesture rather than from `define`, so whatever it decides about naming and matching is what every later vocabulary tool inherits.

### 2 — Interfaces, and how one is defined

**Undesigned, and it will move actions.** What an interface *is* has drifted: it is a block seated on a wall, it is the anchor for every port-like thing, and it is the one element whose place is a side and a fraction rather than a point. What it is not yet is something a definition says much about.

Known now:

- **Promotion has no gesture.** `interface` is `on: ["block"]` and takes `edge` and `end` arguments only a gesture on a relationship's end could fill. Either the anchor gesture calls it directly, or `interface` widens its scope — and the second moves the action registry's shape.
- **`flow` is decorative and constrains nothing.** If a definition is to say what may meet an interface, that is `ends` on a relation definition, an interface component, or a rule kind — three different places, and none is chosen.
- **A seat is a snap target, never an address**, and `at` stays a fraction so resizing never invalidates a port. That much is settled and should survive whatever this becomes.

### 3 — The tray

**Context-sensitive, and it expands to fill the stage.** Today it is two fixed tabs, `this` and `contents`. The half of the search move that landed was the explorer's; this is the other half.

### 4 — The explorer

**After the tray.** Search results live here already — lit, never hidden. What it becomes once the tray can expand is the question.


## The grid

**A visual spreadsheet for blocks.** One canvas view, in which a grid carries rows, columns, merged cells and headers. Blocks are plugged into cells and pulled back out. **This is the central rapid-prototyping feature**, and swimlanes, lifelines, tables and matrices are all meant to fall out of it rather than each costing code.

**Why it matters beyond layout.** The inference that was cut read order from *position along a directional arrangement* — a guess, which is why it needed four tiers and a write-home gate to be safe. A cell address along the reading direction **is** the order, and a header **is** the allocation: both stated rather than guessed. That is what gives design.md's *the model defines itself as the user builds* a mechanism again.

### Built

| | |
|---|---|
| **schema** | `group`, `cell {r,c}`, `header`, `rows`, `cols`, `merges: Span[]` on `Block`. A grid owns its `x`/`y`; a boundary still derives its bounds from its members |
| **mutations** | `set_group`, `seat_cell`, `set_header`, `set_grid`, `merge_cells`, `split_cells` |
| **readers** | `grid_of`, `cell_of`, `members_of`, `at_cell`, `merge_at`, `region_of`, `group_depth`, and the two that matter — `allocations_of(block)` and `allocated_to(header)` |
| **the door** | migrates any block carrying an extent to the grid module, drops a cell outside its grid or second into an occupied one, drops overlapping merges. **Every repair frees the block rather than deleting it** |
| **placement** | `CELL`, `cell_box` honouring merges, gridded members placed by address, a holder's box from its extent or from its members' bounds, a gridded container minified |
| **actions** | `group` (a boundary or a grid, by argument), `seat`, `header`, `insert`, `remove`, `merge`, `transpose`, `chain`, `leave` |
| **the canvas** | cells answer a click and carry a `cell` scope in `Context`; right-drag on empty ground draws a grid sized in cells and captures what it covers; a drop resolves to an address; a dragged corner sets an extent |
| **the retirement** | `table`, `matrix`, `view` and `pin`-as-a-view came out as one piece. Search results are the explorer's |

### Revised since this was decided

**The rows below replace what the original decision said.** Each was changed while building, and the reason is worth keeping.

| Was decided | Is now | Why |
|---|---|---|
| arrangement **drops** `grid`, leaving `free` and four directions | arrangement **keeps** `grid` and drops the four directions. **Two values** | The directions ranked by relationships through dagre, which drew a picture of the graph rather than of the model. `grid` names auto-layout onto the lattice, and the lattice is the one a group is a region of — so the two meanings turned out to be the same meaning |
| a group **is** a grid region; a boundary is one with no rows or columns | `group` and `grid` are **two modules**. 8, not 7 | They differ in what a member's place *is* — a boundary reads its bounds off wherever its members ended up, a grid says where each member goes. That is a difference in code, not in configuration |
| **one group per block, no nesting** | one group per block, **nesting allowed**, cycles refused | `can_hold` walks the membership chain, and `group_depth` orders both placement and z-order. A grid inside a swimlane is the obvious want and cost nothing once nesting was cycle-checked |
| **headers are row 0 and column 0**, marked by the grid's `headers` setting | a header is a **promoted block**, and **position says which line it heads**: row 0 heads its column, `{0,0}` heads both, anything else heads its row | Two mechanisms shipped by accident and never met — allocation read the grid setting, the gesture wrote a block field, and allocation was dead as a result. What replaced them was a stored role, which stated the same fact twice and let a drag put the two out of step. **Position is the whole rule now**: promote and demote is the gesture, `transpose` needs no header code, and row 0 / column 0 is still what a header row means — it just is not a setting on the grid |
| `set_grid {id, rows, cols, headers}` | `set_grid {id, rows, cols}` | follows from the row above |
| `chain` skips a **header strip** counted off the top and left | `chain` skips **any header, wherever it sits** | simpler, more general, and it drops two readers |

### Still open

| | |
|---|---|
| **`chain` under `free`** | it reads left-to-right, row by row, like a page — a fixed direction rather than the layer's, because `free` has none to offer. Fine for now; revisit if a layer ever gets a reading direction back |
| **the second allocation axis** | `row × column` works in the readers and nothing consumes it. An allocation matrix is the first thing that would |
| **one header row, one header column** | falls out of position being the rule: only row 0 can head a column, so a second tier of column headings is not sayable. Fine for a swimlane, a lifeline, a table and a matrix. Revisit only if something real wants two tiers |
| **a header's scope is a line** | deliberately. A scope that reached down-and-right instead would turn allocation from *at most two, one per axis* into an unordered pile of overlapping rectangles, and would need a nesting rule to answer *what is allocated to this*. Sectioning an outline is a different construct and does not get the word |
| **what allocation is *for*** | it is derived and correct, and nothing downstream reads it yet. Until something does, *the model defines itself as the user builds* has a mechanism and no product |
| **swimlanes as the proof** | the `gridded` fixture is one: blocks heading rows, flow relations across, `chain` linking them. It cost no new code, which was the test |

### Watch for

| | |
|---|---|
| **two names for one lattice** | `UNIT` is the measure and a `CELL` is a block plus its air. Nothing outside a grid is quantised to a cell — that was the old mistake, and it is worth not making twice |
| **a holder is two things to most callers** | a boundary and a grid answer the same question nearly everywhere: what a run may pass through, what a sweep picks, what a drop clears. Ask `is_holder` / `holds`, never a pair of literal comparisons — a grid on the wrong side of one walled every line inside it |
| **repairs are mutations, not edits** | the door returns repairs for somebody else to apply, so a check written after a migration still reads the graph as it came in. That is how the group→grid migration freed every address it had just rescued |


## Vocabulary

**Stop inventing words where a convention exists.** With one way to draw, several terms have nothing left to distinguish.

| Gone | Why |
|---|---|
| **view module** | there is one way to draw |
| **view definition** | nothing left to configure |
| **layer view** | it is *the diagram* |
| **reading** | cut |
| **promote** as a *noun* | the gesture is **promote** and **demote**; what it makes is a **header**, and so is the cell it fills. One word each, not two for the thing |
| **implied order** | nothing infers order from position on a layer any more. A cell address states it |

| Stays | Is |
|---|---|
| **layer** | the block you are inside |
| **diagram** | what a layer looks like drawn |
| **lattice** | the lines everything lands on, one unit apart. **This is what `grid` used to be asked to mean** |
| **grid** | a block module: a bounded region of the lattice with an extent and cells |
| **group** | a block module: a boundary round a set, sized from what it holds |
| **holder** | either of those two, where a caller means both |
| **projection**, **Scene** | internal. Code words, not user words |

**`grid` still names two things and that is deliberate now.** The `grid` *arrangement* is auto-layout onto the lattice; the `grid` *module* is a region of it. They are the same lattice, which is what lets a block the layer placed line up with a block seated in a cell — so this is one word for one lattice, seen from two sides.

**Reserved, not retired.** *View* will name a data perspective — table, matrix, sequence — over the model. It is cut now because it currently means nothing, and it comes back defined.

**Use the standard word wherever one exists.** `allocation` is the case that proved the rule: what looked like three inventions — swimlane, lane owner, tag — was one construct SysML already names.


## Loose ends

| | |
|---|---|
| **Behaviour has no mechanism** | *The model defines itself as the user builds* is design.md's driving concept. **The grid is now half the answer** — a cell address states order and a header states allocation, both derived from position and stored nowhere. What is still missing is anything that *reads* them: no definition gains a field, no state is inferred, no interface is offered |
| **Definition shape is cut** | `card.layout` no longer offers `shape`. A definition picking a diamond drew as one on the canvas and as a rectangle in every export — a promise one renderer kept and the others could not. It comes back when they all can |
| **A named package is unchecked** | which definitions a project draws on is an ordinary field with a hardcoded name, and nothing checks that a named package exists. Belongs with *Pinning* |
