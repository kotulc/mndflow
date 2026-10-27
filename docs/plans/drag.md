# Drag to reorder

A drag places nothing. The tray already reorders a region by rewriting its place in the sibling list. Dragging does that same edit from the canvas, and does the same kind of edit for a sequence step inside its column.

Lands last of the placement plans, after plans/order.md, whose list order it edits. A drag only starts in an editable view, never on a map or a registry (stage `editable`).

A region drag today calls `move` with `before`, but it uses vertical position only, compares every sibling, and draws no line. A sequence step dropped on the canvas is filed into whatever it lands on. This replaces both. A region moves before or after another region, along the one line the bands follow. A sequence step is inserted in its column, and the steps at that row and below move down.

## Steps

| # | Step | Where |
|---|---|---|
| 1 | **the band axis.** The winning band direction, columns or rows, is returned with the placement and carried on the scene | views `flow.ts` `Placement`, `layer.ts`, `scene.ts` |
| 2 | **a region, by its name.** The name is the drag handle; a double-click still renames it. The pointer is read on the band axis only. The drop line is the gap before the region it will precede, or after the last. Loose blocks are not targets. The write is `move` with `before`, the same edit as the tray | stage `nodes.tsx`, `drag.ts`, `moves.ts` `restacked`, `groups.css` |
| 3 | **a sequence step, in its column.** The drag stays in the column. The drop line is the gap before a row. The write inserts the step at that row in that column only: the steps there and below move down, the row it left closes up, and the grid grows a row when the insert passes the last cell. Not `insert`, which shifts every column | core `actions/grid.ts`, stage `drag.ts`, `moves.ts` |
| 4 | **docs.** design.md already says a drag along a band or a column reorders; the column insert is named in `actions.md` | core `actions.md` |


## A region

The bands are one line. Columns run left to right. Rows run top to bottom. `flow.ts` already tries both and keeps the one nearer the canvas. That choice is not kept today: `Placement` is `{ w, h, spots }`. It gains `across`, true when the bands are columns, and the scene carries it. No regions, and `across` is absent.

The drag starts on the region's name (`.mnd-group-name`). The rest of the band does not start it. The name keeps renaming on a double-click, as every name does (stage `Stage.tsx`); a press that moves past React Flow's drag threshold drags instead. While renaming, the name is `nodrag`, so typing never drags. On a region's name the cursor is `grab`, not `text`. While it moves, a line is drawn across the band axis at the gap where the region will sit: before the first region whose start on that axis lies past the pointer, or after the last. Only regions are considered.

On drop, `moves.ts` `restacked` is replaced. It calls `move` with the region's parent and `before` set to that region, or with no `before` when it lands last. `reorder` renumbers the siblings. That is the list order in plans/order.md. A loose block is not a `before` target, so the region is spliced immediately in front of the target region and loose blocks stay where the list put them.

The band is not left where the pointer let go. The next layout draws it in its new place.


## A sequence step

A sequence is a grid. A participant is a column, a step is a block in a body cell, and row 0 is the header. One block occupies a cell. Dragging a step keeps its column. The pointer chooses a body row. A line is drawn across the column at that gap. The header row is not a gap.

The drop is an insertion in that column's list of steps:

| | |
|---|---|
| **out** | the step leaves its row. Steps below it in the same column move up one |
| **in** | it takes the row the line marked. Steps at that row and below, in that column, move down one |
| **grow** | the grid gains a row only when the insert passes the last body cell. Other columns do not move |

`insert` in `grid.ts` shifts every block on that row index. This does not call it. The shift is a new function beside `shifted`, limited to one column, and one action the drag calls so the edit is a single undo step. The step's parent does not change.


## Done when

On Shop, both canvas shapes, dragging a region's name shows the line and the band moves to that gap. A loose block is never the landing place. On a sequence, dragging a step along its column inserts it: the steps below move down, the old row closes, and a row is added only when it is dropped past the last step. The other columns stay put.
