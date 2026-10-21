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
- **Dropping a card on another card is a `move`, which is sayable; dropping it anywhere else is a `place`, which is not.**
- **The stage works out what an adjustment writes** (`moves.ts`) — a place and a `group`, a `leave`, a `seat`, a `refer` into a header cell, a `relink`, a `layout` to `free` on an `auto` layer — and hands the list to the host, which runs it as one batch. **One gesture, one step.**
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
| `room.ts` | the camera: `useFocus` fits the focus or reads it, flies to a new one and pans to a block revealed inside; **a focus that changed size, or a view resized, is framed again** unless there is no room left to fit into. `usePage` is the kit's scrolled page |
| `sync.ts` | React Flow's copy of the arrays, kept in step with the Scene and the selection |
| `draw.ts` | the right button: a relationship from a card, a grid across the ground |
| `drag.ts` | what travels with a dragged node, what is lit, and the adjustment a drop makes |
| `Grips.tsx` | the ends of what is picked, and the berths of hidden interfaces |
| `Thumb.tsx` | a scene at a glance: the canvas's own nodes and lines, fitted whole — or to `focus`, the first of it picked — and fitted again as its box resizes, taking no input. A host hands it to the tray's overview |
| `Legend.tsx` | the key, in a right-hand corner. **The icon is dressed as the card is**, so its colour is the card's own paint rather than a second answer about it |
| `moves.ts` | what an adjustment writes, as actions and positional changes |
| `Wire.tsx` | one run: the route libavoid found while it meets its handles, else `route`; **a run the Scene already drew (`data.points`) is drawn as given** |
| `flow.css` · `routes.css` · `groups.css` | cards and the frame; runs and their ends; bands and grids — loaded in that order |

## Hover and pick

**Another surface points; only a gesture picks.** A hovered table row arrives as `lit` and draws an accent outline round a card or an accent stroke on a run. A pick draws an accent border and a raised fill on a card, and the grips on a run — so the two differ in what is shown, never only in strength.

## The camera

**One camera over one world** (design.md *Perspectives*). The stage draws the world the views compose and owns every viewport change; React Flow's own fit stays off.

| Rule | |
|---|---|
| **world view** | the focus fitted inside the band, never above 100%, centred |
| **reading view** | 100% on the focus; a focus wider or taller than the view starts at its top left plus the band, and wheel and drag pan it, held to its walls plus the band. Chips at the edges say how much is left |
| **one flight** | every change of focus or mode flies: zoom eased in scale, the centre in a line. Reduced motion jumps |
| **context** | outside the focus dimmed, or only the focus's ancestors' outlines (rings) — the workspace's display setting. Lines are bright to the focus's wall and dimmed beyond; a seat where a line leaves names its far end |
| **far out** | below 40%, cards hide their words and room titles grow so the world still reads. A fitted room is often below 60%, and its cards must still read |
| **rooms hug what they hold** | a room is never grown to the panel |
