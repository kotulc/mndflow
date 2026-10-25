# Stage

**The working area, and the one thing that never yields.** Chrome gives way under pressure — the crumbs fold to `…`, the option groups scroll, the explorer bounds itself — and the stage keeps its room.

**The stage hosts the diagram, and there is one way to draw it.**

| | Fills the stage with |
|---|---|
| **canvas** | a frame, cards, holders, cells and routed lines |

**The canvas fills the stage.** A **grid** is a block drawn on it, with cells things are seated in — not a second surface and not a second way of drawing.

**The stage publishes its geometry upward.** Arranging needs the laid-out result only the stage has, so the options rail calls what it was handed. The shell never reaches into the stage — dependencies run one way.

**Everything the app says goes to one strip at the top of the stage**: a refusal, a repair report, a storage warning, a rule note. One place to look, and silent when there is nothing to say.

**The two right-hand corners hold the key to what is drawn.** A legend, in whichever corner the workspace chose, listing the kinds the open layer draws and the system marks they wear. **It reads the Scene and nothing else** — a card already carries its look, its role and its mark, so the key cannot disagree with the cards it explains. Each half is dropped where the layer has none, and a plain drawing shows nothing at all.

## The gestures it names

- **The left button works what is already there; the right button makes something new.** Within the right button, a click makes the thing that sits at a point and a drag makes the thing that has extent.
- **A click on the stage selects and never navigates**; opening (a double-click, Enter) moves the canvas, as in the explorer.
- **A left drag is decided at the press and never revised** — a gesture that changes its mind halfway is the aim-and-hope this design is written against.
- **A drag never places a card.** Dropped on another card, in another room, holder or cell, it is a `move` there; dropped where it was, it writes nothing and the drawing puts it back. A region dragged up or down is reordered among its neighbours.
- **The stage works out what an adjustment writes** (`moves.ts`) — a `move`, a `group`, a `seat`, a `refer` into a header cell, a `relink`, a size — and hands the list to the host, which runs it as one batch. **One gesture, one step.**
- **A header cell is its own drop target, read from the pointer.** A header line is one unit across, narrower than any card, so where the card's middle lands cannot find one; the cell lights alone while it is the target.
- **A relationship may end on a group or a grid**, at its rim, as on any block.
- **A drop lands on a box and never on the frame** — the frame spans the whole layer, so counting it would make every drop a re-parent.
- **The stage publishes its geometry upward** so the options rail calls what it was handed. The shell never reaches into the stage.
- **A right drag lands on a card, never on a line.** A relationship joins two blocks; a note is tied to the block it is about.
- **A run's menu offers promoting only the ends that are not interfaces yet**, and a grip's menu knows which end it is.

## Inside the canvas

**`Flow.tsx` is the canvas, composed from hooks with one job each.**

| | Is |
|---|---|
| `room.ts` | the camera: `useFocus` fits the focus or a stop, flies to a new one and pans to a block revealed inside; across a change of drawing — the map, a view entered from it (`realm_of`) — it cuts; **a focus that changed size, or a view resized, is framed again** unless there is no room left to fit into. `usePage` is the kit's scrolled page |
| `sync.ts` | React Flow's copy of the arrays, kept in step with the Scene and the selection |
| `draw.ts` | the right button: a relationship from a card, a grid across the ground |
| `drag.ts` | what travels with a dragged node, what is lit, and the adjustment a drop makes |
| `Grips.tsx` | the ends of what is picked, and the berths of hidden interfaces |
| `Legend.tsx` | the key, in a right-hand corner. **The icon is dressed as the card is**, so its colour is the card's own paint rather than a second answer about it |
| `moves.ts` | what an adjustment writes, as actions — never a position |
| `nodes.tsx` | the node types, each drawn whole at every zoom; `scaled` lays a registry's tile out at its own size and scales it. A map's box is its walls and title (`MapBox`); a chip its icon, name, counts and inner treemap (`ChipNode`) |
| `arrays.ts` | the Scene as React Flow's arrays, and **draw order** (`DEPTH`): holders, lines, cards and chips, seats, each two steps higher per holder it sits in |
| `Wire.tsx` | one run: the route libavoid found while it meets its handles, else `route`; **a run the Scene already drew (`data.points`) is drawn as given**, at its scale, its stroke and heads scaled with it |
| `flow.css` · `routes.css` · `groups.css` | cards and the frame; runs and their ends; bands and grids — loaded in that order |

## Hover and pick

**Another surface points; only a gesture picks.** A hovered table row arrives as `lit` and draws an accent outline round a card or an accent stroke on a run. A pick draws an accent border and a raised fill on a card, and the grips on a run — so the two differ in what is shown, never only in strength.

## The camera

**One camera, a map and the views entered from it** (design.md *Perspectives*). The stage draws what the views hand it and owns every viewport change; React Flow's own fit stays off. **Only the camera moves** while browsing the map: focusing and zooming never move a chip, and entering one cuts to its view where the chip filled the screen.

| Rule | |
|---|---|
| **the map** | the model's and the library's: boxes and chips, read only. Walls and edges are hairline shadows, since a border under a pixel is drawn at one before the zoom. The camera is held to the map and its band. **Entering** a chip flies into it until it fills the view, then the entered view takes over there and fades in; nothing slides across the change (`cut`, `fresh`). Escape plays it back |
| **navigation focuses** | on the map a click on a chip or a box goes to it and picks it, flying there; two enter it. Choosing a block in the explorer goes to its area; its open enters; the arrow keys go to the nearest area that way. **The wheel only zooms** |
| **one flight** | every other change of focus or mode flies: zoom eased in scale, the centre in a line. Reduced motion jumps |
| **edits slide** | in an entered view an edit lays the layer out again, and what stays slides to its new place |
