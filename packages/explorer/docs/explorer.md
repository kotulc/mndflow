# Workspace Explorer
The workspace explorer is a file explorer that displays the top-level nodes of the project graph tree and supports re-organizing these objects (files). The explorer sits on the left side of the page next to the canvas. The explorer can resized by dragging its right double border.

## Explorer Options
The header of the explorer displays the workspace by its own name — a button that opens the top level, and renames on two clicks like every other name in the app — followed by the standard options: Add block, Add folder, Fold/Unfold, and Delete.

**The panel is dragged to its width** by the edge on its right, between a narrow margin and a third of the window, and the cap is restated in CSS so a window resized narrower gives the drawing its two thirds back without anybody dragging anything.

**Selection matches the canvas.** A plain click reveals and picks; the toggle key adds or drops one; shift takes the run between the anchor and here. Only a plain click reveals — building a selection is not asking to be taken somewhere else. A drag off a picked row carries the whole selection.

**Guide lines are drawn per indent column**, each hung under the mark of the row it belongs to, and a branch draws its own half-row down from below its mark so the line it hangs from is joined rather than floating. A row's columns are its holder's plus one for itself, handed down rather than re-derived.

**Add folder is a shortcut, not a second concept.** Both controls reach the same `create` action; the folder one arrives with its type already filled. The filing structure is what somebody reaches for most often in an explorer, and making them create a block and then retype it would be purity charged to the user. **The model still has one create** — the shortcut is in the surface, which is where shortcuts belong.

## Explorer Tree
A minimal file (block) tree with each block name listed after its identifying icon. Icons display empty/subtle when the block has no children and filled/bright when the block contains children. The selected (in context) layer of the tree is highlighted. Each top-level block under the workspace appears as its own subtree. Hide/Show toggle option hides all empty childless blocks except for the top-level blocks.

## Structure and only structure

**Structure and only structure**, nested to any depth.

- **The tree is blocks.** Boundaries, notes, fields and references are never listed — a reference is a second appearance of something already there. **Interfaces are behind a toggle.**
- **Every top-level block is its own subtree**, filed into the folders the workspace keeps.
- **The open layer and the selection are two states with two looks.** *Open* is where the stage is pointed; *selected* is what an action would act on. They stack, and selected reads first.
- **Every role carries a mark** — leaf, container, interface, folder — and a container is filled where a leaf is outlined, because the fill is what says it holds something.
- **The bar's `＋` follows the selection**, and its tooltip names which, so the meaning is never hidden. **Add folder is a shortcut, not a second concept** — the same `create`, arriving with its type filled, and offered only where a folder can go.
- **Right-click opens the offered list** for the selection, in fixed order.
- **Every row is draggable**, and a drag crossing a tier lands as that tier's elementary unit rather than refusing. **Dropping in the clear space below makes the block top-level**, since a tier root is a block no other block contains.
- **A move drops what does not travel** — group memberships, note ties, and relationships to anything staying behind. A move is never confirmed first; undo is the answer.
- **Folding is the user's alone**: walking into a layer never rearranges the tree.
