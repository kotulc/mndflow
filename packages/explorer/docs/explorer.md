# Workspace Explorer

The explorer files the graph as a **section chain**: a host declares its sections, each holds one pick, and the next lists what that pick holds. It sits left of the canvas and is dragged to its width by its right edge, between a narrow margin and a third of the window.

| Host | Sections |
|---|---|
| **mndflow** (editor) | `library` then `model`, listing by kind: what you build with — every package's definitions, their parts, and its library entries — then what you are building, **rooms only** — the blocks holding blocks; a room's other blocks list in the tray's contents. A package's *types*, *tags*, *interfaces* or *constraints* row is its registry: chosen, it opens on the canvas as a treemap and the tray holds its entries; its mark folds it |
| **mndmap** (reader) | `source folder` → `document`: the editor's chain with the package fixed to the workspace and hidden |

**The bar is tools only**: filter, add, add folder, add a part, delete, and a fold that shuts a layer a click. It follows the section in focus: **add makes what that section lists** — in the model a plain block under the picked row where it may hold one, else the workspace; in the library a definition beside the one in focus, else in the workspace. **Add folder** files a folder in the workspace's package or folder in focus, else beside its definition in focus. Nothing is added to a frozen package. The filter keys off tags and is not built yet.

**In the library, the tree-root button adds a part** to the definition — or the part of one — in focus, its branch unfolded to show the draft.


## The chain

| Rule | |
|---|---|
| **split by kind** | a section may say which side it lists (`Section.lists`): `domain` keeps the library — package roots, definitions, folders reached through folders alone, and **every part of a definition** — and `structure` keeps usages outside every definition, through the definition-side folders on the way to them |
| **host defined** | each `Slice` says its label, mark, first pick (`first`) and which side it lists |
| **apart** | the model stands apart from the chain: what the library holds never changes what it lists |
| **remembered** | a section remembers its pick per pick above — one standing apart, one pick; session state (`useChain`), never logged |
| **headers are labels** | never chosen; clicking one hides or shows its whole section. Each wears its section's mark: the library `Def`, the models a forest — two roots, apart from the tree each model wears |
| **section folds** | a section's chevron folds its branches and never its top rows: with any open it shuts them all, else it opens every one. A usage's parts stay listed only once it is opened |
| **a layer a click** | the bar's fold, drawn like a section's, shuts the lowest open layer under every branch alike — each open branch with no open branch inside it — until only the top rows show. With nothing left to shut, it opens every section whole |
| **three cues** | the accent's edge on the focus's row — the room the canvas is on, or the room holding a focused region; the pick a strong wash; each section's own pick a faint one |

| Section | Lists |
|---|---|
| **library** | every package a top row, `base` first, folded; under each its folders and definitions, **each definition's parts under it**, then a *types*, *tags*, *interfaces* and *constraints* group, each where it has entries, folded, every entry a row of its own that shows in the tray |
| **source folder** | every package a top row, folded; under each its domain: its trees, nested under the folders that organize them |
| **model** | a package a top row only when it holds usages outside its definitions, folded; under each the folders on the way to them, and **the rooms** — usages holding blocks — only. No definition lists here, and no block holding nothing: those list in the tray's contents |
| **document** | the held tree's own row, its structure under it |


## Browse and open

**The explorer browses; the map focuses and enters.** The map is worked out once per edit: choosing moves the camera, never redraws.

| Gesture | Does |
|---|---|
| choose (click, ↑ ↓) | selects the row; the tray shows it. The canvas stays |
| open (Enter, double-click, →) | enters the block from the map: the camera flies into its chip and its own view takes over — a diagram, a folder, a definition alike; a stand-in enters what it stands for. Anything with nothing to draw is picked where the map shows it |
| leave (←, Backspace) | the focus moves to the room holding it, in the same section |
| pick within the open tree | picks it in place where the canvas draws it, else focuses the room it sits in and picks it there (reveal). A package row is picked as any row is, and points the tray at its definitions. A part row stays off the canvas unless its usage is the open layer, and lights under the usage it was chosen through |

- **Context highlighting and breadcrumbs show the focus**, never what is browsed.
- **Dragging a definition from any section onto the canvas** makes a usage of it in the room it is dropped in, or retypes what it lands on where the kinds agree. A tag is refused: it is carried.
- **Browsing a frozen package leaves the canvas where it is**, which is what lets `base` feed a workspace structure.


## Usages and their parts

**A usage's row lists its definition's rooms, then its own**, in the model as in the library; in the library, every definition's part lists as today. Listed when unfolded; folded by default.

```
pump1
  ⤷ Motor        from Pump
  ⤷ Impeller     from Pump
    Sensor
```

- **A part is marked**: dimmed, the link glyph, "from `D`" on hover. Its card on the canvas wears the same mark.
- **A part's row and pick carry its route** (`usage/part`), so two usages of one definition light apart.
- **Opening a part goes to its definition**, the part picked there. Edits to a part go home either way.


## Rows, marks and guides

**One row renderer, one row height.** A mark, a name, and the guide columns behind them.

- **Guide lines are drawn per indent column**; the last row in a branch turns an elbow.
- **A row wears its card's icon**: the role core's `role_of` reads — block, folder, group, grid, interface, reference, note — so a tag reads as the block it is. A row that holds blocks lights its icon.
- **A model wears the tree**, its kind's icon, in both sections; nothing else does.
- **A section's mark is a word or the tree**: `Def` for the library; the models wear the tree. Package sections wear `Pkg`. Words are never filled.
- **What add makes is the section's**: in the library a definition, or a part in the definition in focus — never in a model, whose parts are drawn; in the models a part of the model in focus, else a new model.
- **Opening a row reads it** (core `read_at`), as a double-click on its card does: in the library a used definition enters its registry, anything else is picked; in the models a model enters its drawing. A part seen through a usage is revealed on the usage's layer.
- **A row is keyed by its section and route**, as a block may list in two sections and a part under two usages.
- **A grid heads what it holds, as a table's head does its rows**, in every section alike: its row keeps its branch and its name is underlined, and its members list at its level beneath it with no tick of their own, joined to it by a line down their marks' column. A member's own children branch as usual. A folder nests like any block. Enter, → or a double click on a grid's row reveals it on the canvas, which pans to it. A group holds nothing, so it heads nothing: its members list where they are filed, wearing its tag.


## Selection

**Selection matches the canvas.** A plain click chooses; the toggle key adds or drops one; shift takes the run in the section in focus. A drag off a picked row carries the selection. **A pick inside a shut branch opens the way to it.** ↑ ↓ walk the section in focus; ← → move between sections, landing on what each holds. The way to a row walked to opens; walking never shuts a branch.


## Editing in the tree

- **Right-click opens the offered list** for the selection, in fixed order.
- **The workspace's own rows are renamed in place** from the menu's rename or F2, since a double click opens; a frozen package's never are.
- **Every row but a package root is draggable.** A drop moves it under the row it lands on, where that may hold it.
- **Folding is the user's alone**: opening a layer never rearranges the tree.
