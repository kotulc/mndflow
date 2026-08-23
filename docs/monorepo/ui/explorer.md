# Workspace Explorer
The workspace explorer is a file explorer that displays the top-level nodes of the project graph tree and supports re-organizing these objects (files). The explorer sits on the left side of the page next to the canvas. The explorer can resized by dragging its right double border.

## Explorer Options
The header of the explorer component displays the workspace chip (a view button that displays the top-level blocks) followed by the standard workspace options: Add block, Add folder, Fold/Unfold toggle, Hide/Show empty block toggle, and Delete.

**Add folder is a shortcut, not a second concept.** Both controls reach the same `create` action; the folder one arrives with its type already filled. The filing structure is what somebody reaches for most often in an explorer, and making them create a block and then retype it would be purity charged to the user. **The model still has one create** — the shortcut is in the surface, which is where shortcuts belong.

## Explorer Tree
A minimal file (block) tree with each block name listed after its identifying icon. Icons display empty/subtle when the block has no children and filled/bright when the block contains children. The selected (in context) layer of the tree is highlighted. Each top-level block under the workspace appears as its own subtree. Hide/Show toggle option hides all empty childless blocks except for the top-level blocks.