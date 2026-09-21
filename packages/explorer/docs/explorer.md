# Workspace Explorer
The workspace explorer files the project: three collections drawn with one row, one under the other, each ruled off from the one above. It sits on the left of the page beside the canvas and is dragged to its width by its right edge.

| collection | mark | holds |
|---|---|---|
| **packages** | `Pkg` | what the workspace draws on, one row per package, each holding its *blocks* and its *relations*. **`base` is among them**, wearing a lock: the one package nothing may be written into |
| **definitions** | `Def` | the workspace's own definitions: *pinned*, then *blocks* and *relations* in the folders somebody made for them |
| **the workspace** | `Wks` | the block tree. **The workspace is the one root** and carries the project's name; every top-level block is a branch under it |

**The bar is tools only** — filter, add, add folder, delete, then fold — since the workspace names itself in the tree and is renamed there like any other row. **The filter leads it and is not built yet**: it is where ST.21 opens, and it stands disabled saying so rather than pretending to work. **Folding reads at two scales, down one column at the panel's right edge**: the bar's fold takes every collection at once, and each collection also folds itself from the far end of its own root row. Delete is never offered for the workspace. **The bar follows what is picked**: a block in the tree, and what it adds is a block; a library row, and what it adds is a definition or a folder for definitions, filed where the library is pointed.

**The panel is dragged to its width** by the edge on its right, between a narrow margin and a third of the window, and the cap is restated in CSS so a window resized narrower gives the drawing its two thirds back without anybody dragging anything.

## Rows, marks and guides

**One row renderer, one row height.** A block, a definition and a folder of definitions are all the same row: a mark, a name, and the guide columns behind them. Nothing is spaced by what it is.

- **Guide lines are drawn per indent column**, each hung under the mark of the row it belongs to, and a branch draws its own half-row down from below its mark so the line it hangs from is joined rather than floating. A row's columns are its holder's plus one for itself, handed down rather than re-derived.
- **The last row in a branch turns an elbow** — the column stops on that row's centre line and the tick crosses at its foot.
- **Every role carries a mark** — leaf, folder, interface, reference, note — and **a row that holds parts fills its own mark**, because the fill is what says it holds something. There is no separate container mark: a filled folder is a folder that holds.
- **A section's mark is a word**, not a drawing: `Pkg`, `Def`, `Wks`. **A word is never filled** — a fill closes its counters and leaves a blot.
- **A root reads a shade stronger** and is ruled off from the collection above it.

## Selection

**Selection matches the canvas.** A plain click reveals and picks; the toggle key adds or drops one; shift takes the run between the anchor and here. Only a plain click reveals — building a selection is not asking to be taken somewhere else. A drag off a picked row carries the whole selection.

**A library row points the tray; it does not fold.** Clicking a section, a folder or a definition sets what the tray is about; **the mark is what folds**, exactly as it is on a block.

| clicked | the tray is about |
|---|---|
| **packages**, or one package | what the workspace draws on, on the tray's *packages* tab |
| **definitions** | every definition |
| **pinned** | the pinned definitions |
| **blocks** or **relations** | that group's |
| a folder somebody made | its group's, in the workspace |
| one definition | that definition, on whichever tab definitions were last read on |

## The block tree

A minimal file tree with each block name after its mark. The open layer is highlighted, and the selection reads first.

- **The tree is blocks.** Boundaries, notes, fields and references are never listed — a reference is a second appearance of something already there. **Interfaces are behind a toggle.**
- **The open layer and the selection are two states with two looks.** *Open* is where the stage is pointed; *selected* is what an action would act on. They stack, and selected reads first.
- **The bar's `＋` follows the selection**, and its tooltip names which, so the meaning is never hidden. **Where the selection holds nothing — a note, a reference — the layer takes it**, since a stand-in and a remark hold no blocks. **Add folder is a shortcut, not a second concept** — the same `create`, arriving with its type filled. The filing structure is what somebody reaches for most often in an explorer, and making them create a block and then retype it would be purity charged to the user.
- **Right-click opens the offered list** for the selection, in fixed order.
- **Every row is draggable but the workspace**, and a drag crossing a tier lands as that tier's elementary unit rather than refusing. A drop on the workspace row, or **in the clear space below**, makes the block top-level.
- **A move drops what does not travel** — group memberships, note ties, and relationships to anything staying behind; **a group whose last member leaves goes with it**. A move is never confirmed first; undo is the answer.
- **Folding is the user's alone**: walking into a layer never rearranges the tree. Folding the workspace shuts the whole tree.

## Definitions

**Drawn with the same rows and marks — a rendering, never blocks.** A definition is a block row wearing its kind's mark, a relation definition wearing the line or the tie, and it becomes a block in the graph only when it is dragged onto the drawing. **Everything is listed**: pinning is a shortlist, not what makes a definition visible.

| folder | mark | lists |
|---|---|---|
| **pinned** | pin | the block definitions the workspace **pinned**, in pin order. Unpinning takes one out of the folder and leaves the definition standing |
| **blocks**, **relations** | folder | its own definitions of that group, in the folders somebody made for them. **A word about a package's definition is filed here too** — somebody wrote it, so it is theirs |

- **Picking a row holds that definition in the tray**, on whichever tab definitions were last read on — moving down a list of them keeps the question being asked.
- **The workspace's own are filed by hand.** Add and remove definitions and folders from the bar, drag one into a folder or between two rows to file and order it, and rename either in place on a double click. **A package is frozen** and the system's folders are the system's, so neither takes a drop.
- **Blocks and relations are filed apart**, since a definition of one group is never a definition of the other.
- **Dragging a definition onto the drawing** makes an instance of it where nothing is, and **retypes what it lands on** where the kinds agree. A relation definition says lines must connect existing blocks; an interface, a note and a reference each say what they need first.
- **Interfaces are never listed** in the tree.
- **Relation definitions are here too**, under their own folder. Dragging one out never draws a line — a relationship is made between two ends — so it retypes a line it lands on and says so where it lands on nothing. **Pinned line definitions are also on the rail**, which is what a right drag draws from.
