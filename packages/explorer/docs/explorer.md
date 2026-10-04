# Workspace Explorer

The explorer files the graph as a **section chain**: a host declares its sections, each holds one pick, and the next lists what that pick holds. It sits left of the canvas and is dragged to its width by its right edge, between a narrow margin and a third of the window.

| Host | Sections |
|---|---|
| **mndflow** (editor) | `packages` → `definitions` → `structure` |
| **mndmap** (reader) | `collection` → `document`: the editor's chain with the package fixed to the workspace and hidden |

**The bar is tools only**: filter, add, add folder, delete, fold. It follows the section in focus. The filter keys off tags and is not built yet.


## The chain

| Rule | |
|---|---|
| **split by role** | each section lists one role's subtree under the pick above: package roots, a domain, a tree's structure |
| **host defined** | each `Slice` says its label, mark, listing (`list`) and first pick (`first`) |
| **remembered** | a section remembers its pick per pick above; session state (`useChain`), never logged |
| **headers are labels** | never chosen; clicking one folds its section |
| **two cues** | the focus lit strongly; each section's pick by the accent's edge |

| Section | Lists |
|---|---|
| **packages** | every package root, flat |
| **definitions** / **collection** | the held package's domain: its trees, nested under the folders, groups and grids that organize them |
| **structure** / **document** | the held tree's own row, its structure under it |


## Browse and open

**The explorer browses; the canvas is the target.**

| Gesture | Does |
|---|---|
| choose (click, ↑ ↓) | selects the row; the tray shows it. The canvas stays |
| open (Enter, double-click, →) | a tree: the canvas draws its structure. A package, folder or group: the overview, focused on its box |
| leave (←, Backspace) | the canvas draws the layer above; from a tree's top, the overview focused on the tree |
| pick within the open tree | may move the canvas to the layer the block sits on (reveal) |

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
- **Every role carries a mark**: leaf, folder, group, grid, interface, reference, note, tag. A row that holds parts lights its icon.
- **A section's mark is a word**: `Pkg`, `Def`, `Use`. A word is never filled.
- **A row is keyed by its section and route**, as a block may list in two sections and a part under two usages.
- **Holders are rows like any other**, their contents nested under them. A group's head sits level with its group.


## Selection

**Selection matches the canvas.** A plain click chooses; the toggle key adds or drops one; shift takes the run in the section in focus. A drag off a picked row carries the selection. **A pick inside a shut branch opens the way to it.** ↑ ↓ walk the section in focus; ← → move between sections, landing on what each holds.


## Editing in the tree

- **Right-click opens the offered list** for the selection, in fixed order.
- **The workspace's own rows are renamed in place** from the menu's rename or F2, since a double click opens; a frozen package's never are.
- **Every row but a package root is draggable.** A drop moves it under the row it lands on, where that may hold it.
- **Folding is the user's alone**: opening a layer never rearranges the tree.
