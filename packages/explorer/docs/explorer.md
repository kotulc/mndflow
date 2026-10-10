# Workspace Explorer

The explorer files the graph as a **section chain**: a host declares its sections, each holds one pick, and the next lists what that pick holds. It sits left of the canvas and is dragged to its width by its right edge, between a narrow margin and a third of the window.

| Host | Sections |
|---|---|
| **mndflow** (editor) | `definitions` and `structure`, standing apart: structure lists every tree whatever definitions holds |
| **mndmap** (reader) | `collection` → `document`: the editor's chain with the package fixed to the workspace and hidden |

**The bar is tools only**: filter, add, add folder, delete, and a fold that shuts a layer a click. It follows the section in focus. The filter keys off tags and is not built yet.


## The chain

| Rule | |
|---|---|
| **split by role** | each section lists one role's subtree under the pick above: package roots, a domain, a tree's structure |
| **host defined** | each `Slice` says its label, mark, first pick (`first`), and whether it lists every tree (`trees`) |
| **apart** | a section listing every tree stands apart from the chain: what the section above holds never changes what it lists or holds. Its root is the tree of its own pick, or the canvas's tree |
| **remembered** | a section remembers its pick per pick above — one standing apart, one pick; session state (`useChain`), never logged |
| **headers are labels** | never chosen; clicking one hides or shows its whole section |
| **section folds** | a section's chevron folds its branches and never its top rows: with any open it shuts them all, else it opens every one. A usage's parts stay listed only once it is opened |
| **a layer a click** | the bar's fold, drawn like a section's, shuts the lowest open layer under every branch alike — each open branch with no open branch inside it — until only the top rows show. With nothing left to shut, it opens every section whole |
| **three cues** | the accent's edge on the one row the canvas shows — the open layer, else on a system view what is picked (or the held package) above it; the pick a strong wash; each section's own pick a faint one |

| Section | Lists |
|---|---|
| **definitions** / **collection** | every package a top row, `base` first, folded; under each its domain: its trees, nested under the folders, groups and grids that organize them |
| **structure** | **every tree holding structure a top row, always**, in every loaded package — whatever definitions holds — and the tree the canvas draws from inside, however little it holds. **The definition chosen above opens here**, once, as do the canvas's tree and the tree of a pick inside one, so choosing a definition shows its structure. A definition with none adds nothing |
| **document** | the held tree's own row, its structure under it |


## Browse and open

**The explorer browses; the canvas is the target.**

| Gesture | Does |
|---|---|
| choose (click, ↑ ↓) | selects the row; the tray shows it. The canvas stays |
| open (Enter, double-click, →) | the canvas draws the block on the view its kind calls for: a package or folder its folder view, a definition its definition view — opened from the structure section, or again, its structure — a grid its grid view, a block that holds from inside. A group, a note or a leaf is revealed where it is, the canvas panning to it |
| leave (←, Backspace) | the canvas draws the layer above; a definition's structure leaves for its definition view; a package for the package view |
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
- **A definition's row holding structure wears its card's structure mark** after its name in the definitions section, so a definition says it has structure before it is picked. The structure section wears that mark on its header instead, so its rows do not repeat it. Nothing else does — not a block inside a structure, a package or a folder. The workspace's row wears a folder.
- **A section's mark is a word or the structure tree**: `Def` for definitions; the structure section wears the same tree-root mark definitions stamp when they hold structure. Package sections wear `Pkg`. Words are never filled.
- **A row is keyed by its section and route**, as a block may list in two sections and a part under two usages.
- **A group or grid heads what it holds, as a table's head does its rows**, in every section alike: its row keeps its branch and its name is underlined, and its members list at its level beneath it with no tick of their own, joined to it by a line down their marks' column. A member's own children branch as usual. A folder nests like any block. Enter, → or a double click on a group's row reveals it on the canvas, which pans to it.


## Selection

**Selection matches the canvas.** A plain click chooses; the toggle key adds or drops one; shift takes the run in the section in focus. A drag off a picked row carries the selection. **A pick inside a shut branch opens the way to it.** ↑ ↓ walk the section in focus; ← → move between sections, landing on what each holds. The way to a row walked to opens; walking never shuts a branch.


## Editing in the tree

- **Right-click opens the offered list** for the selection, in fixed order.
- **The workspace's own rows are renamed in place** from the menu's rename or F2, since a double click opens; a frozen package's never are.
- **Every row but a package root is draggable.** A drop moves it under the row it lands on, where that may hold it.
- **Folding is the user's alone**: opening a layer never rearranges the tree.
