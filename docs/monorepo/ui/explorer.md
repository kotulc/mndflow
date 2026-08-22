# Workspace Explorer
The workspace explorer is a file explorer that displays the top-level nodes of the project graph tree and supports re-organizing these objects (files). The explorer sits on the left side of the page next to the canvas. The explorer can resized by dragging its right double border.

## Explorer Options
The header of the explorer component displays the workspace chip (a view button that displays the top-level blocks) followed by the standard workspace options: **Add**, Fold/Unfold toggle, Hide/Show empty block toggle, and Delete.

**One create control, never two.** A folder is a block with a type, so *add block* and *add folder* would be one action asked twice — and *the app never asks which sort of thing you mean* is the whole point of the block model. What gets made follows the selection, and the tooltip names it.

## Explorer Tree
A minimal file (block) tree with each block name listed after its identifying icon. Icons display empty/subtle when the block has no children and filled/bright when the block contains children. The selected (in context) layer of the tree is highlighted. Each top-level block under the workspace appears as its own subtree. Hide/Show toggle option hides all empty childless blocks except for the top-level blocks.