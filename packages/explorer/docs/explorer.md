# Workspace Explorer

The explorer files the graph as a **section chain**: a host declares its sections, each holds one pick, and the next lists what that pick holds. It sits left of the canvas and is dragged to its width by its right edge, between a narrow margin and a third of the window.

| Host | Sections |
|---|---|
| **mndflow** (editor) | `definitions` and `structure`, listing by kind: the definition side in one, structure in the other. Definitions lists every package; structure lists a package only when it holds structure |
| **mndmap** (reader) | `collection` → `document`: the editor's chain with the package fixed to the workspace and hidden |

**The bar is tools only**: filter, add, add folder, the tree-root button, delete, and a fold that shuts a layer a click. It follows the section in focus: **add makes what that section lists** — in structure a plain block under the picked row where it may hold one, else the workspace, in definitions a definition. The tree-root button keeps its place. It is disabled unless definitions is in focus and the pick is a definition that may hold and is not frozen; then it reads **add structure to** that definition, or **open structure** once it already roots one. The same words sit on the row's menu. Nothing is added to a frozen package. The filter keys off tags and is not built yet.


## The chain

| Rule | |
|---|---|
| **split by kind** | a section may say which side it lists (`Section.lists`): `domain` keeps the definition side — package roots, definitions, folders reached through folders alone — and `structure` keeps the rest, through the definition-side blocks on the way to it. Unsaid, a section lists every role under the pick above, as mndmap's do |
| **host defined** | each `Slice` says its label, mark, first pick (`first`) and which side it lists |
| **apart** | the structure section stands apart from the chain: what definitions holds never changes what it lists, only which row opens |
| **remembered** | a section remembers its pick per pick above — one standing apart, one pick; session state (`useChain`), never logged |
| **headers are labels** | never chosen; clicking one hides or shows its whole section |
| **section folds** | a section's chevron folds its branches and never its top rows: with any open it shuts them all, else it opens every one. A usage's parts stay listed only once it is opened |
| **a layer a click** | the bar's fold, drawn like a section's, shuts the lowest open layer under every branch alike — each open branch with no open branch inside it — until only the top rows show. With nothing left to shut, it opens every section whole |
| **three cues** | the accent's edge on the one row the canvas shows — the open layer, else on a system view what is picked (or the held package) above it; the pick a strong wash; each section's own pick a faint one |

| Section | Lists |
|---|---|
| **definitions** | every package a top row, `base` first, folded; under each its folders and definitions, a definition a leaf. No structure |
| **collection** | every package a top row, folded; under each its domain: its trees, nested under the folders that organize them |
| **structure** | a package a top row only when it holds structure, `base` first among those that do, folded; under each the definition-side blocks on the way to any structure, and the structure itself. A definition or folder with no structure below it does not list. **Nothing chosen in definitions folds or unfolds it**: only the canvas's own layer and the way to a pick inside it open here, once each |
| **document** | the held tree's own row, its structure under it |


## Browse and open

**The explorer browses; the canvas is the target.**

| Gesture | Does |
|---|---|
| choose (click, ↑ ↓) | selects the row; the tray shows it. The canvas stays |
| open (Enter, double-click, →) | the canvas draws the block on the view its kind calls for: a package or folder its package view — drawing what the section it was opened from lists — a definition its definition view — opened from the structure section, or again, its structure — a grid its allocation view, a block that holds from inside. A group, a note or a leaf is revealed where it is, the canvas panning to it |
| leave (←, Backspace) | the canvas draws the layer above, in the same section; a package leaves for the overhead view |
| pick within the open tree | moves the canvas to the layer the block sits on (reveal) |

- **Context highlighting and breadcrumbs show what the canvas has open**, never what is browsed.
- **Dragging a definition from any section onto the canvas** makes a usage of it in the open structure, or retypes what it lands on where the kinds agree. A tag is refused: it is carried.
- **Browsing a frozen package leaves the canvas where it is**, which is what lets `base` feed a workspace structure.


## Usages and their parts

**A usage's row lists its definition's blocks, then its own children.** Listed when unfolded; folded by default.

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
- **A structure root wears its card's structure mark** after its name, in both sections: the workspace, always, and a definition that holds structure. A folder does not, nor a definition with none, nor a block inside a structure. The row says so before it is picked.
- **A section's mark is a word or the structure tree**: `Def` for definitions; the structure section wears the tree-root mark. Package sections wear `Pkg`. Words are never filled.
- **A row is keyed by its section and route**, as a block may list in two sections and a part under two usages.
- **A group or grid heads what it holds, as a table's head does its rows**, in every section alike: its row keeps its branch and its name is underlined, and its members list at its level beneath it with no tick of their own, joined to it by a line down their marks' column. A member's own children branch as usual. A folder nests like any block. Enter, → or a double click on a group's row reveals it on the canvas, which pans to it.


## Selection

**Selection matches the canvas.** A plain click chooses; the toggle key adds or drops one; shift takes the run in the section in focus. A drag off a picked row carries the selection. **A pick inside a shut branch opens the way to it.** ↑ ↓ walk the section in focus; ← → move between sections, landing on what each holds. The way to a row walked to opens; walking never shuts a branch.


## Editing in the tree

- **Right-click opens the offered list** for the selection, in fixed order.
- **The workspace's own rows are renamed in place** from the menu's rename or F2, since a double click opens; a frozen package's never are.
- **Every row but a package root is draggable.** A drop moves it under the row it lands on, where that may hold it.
- **Folding is the user's alone**: opening a layer never rearranges the tree.
