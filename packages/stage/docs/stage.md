# Stage

**The working area, and the one thing that never yields.** Chrome gives way under pressure — the crumbs truncate, the option groups scroll, the explorer bounds itself — and the stage keeps its room.

**The stage hosts the diagram, and there is one way to draw it.** `table` and `matrix` were view modules and the grid absorbed them.

| | Fills the stage with |
|---|---|
| **canvas** | a frame, cards, holders, cells and routed lines |

**The canvas fills the stage.** A **grid** is a holder drawn on it, with cells things are seated in — not a second surface and not a second way of drawing.

**The stage publishes its geometry upward.** Arranging needs the laid-out result only the stage has, so the options rail calls what it was handed. The shell never reaches into the stage — dependencies run one way.

**Everything the app says goes to one strip at the top of the stage**: a refusal, a repair report, a storage warning, a rule note. One place to look, and silent when there is nothing to say.

## The gestures it names

**The working area, and the one thing that never yields.** Chrome gives way under pressure and the stage keeps its room.

- **The stage hosts the diagram**, and a grid is a block drawn on it rather than a second surface.
- **The left button works what is already there; the right button makes something new.** Within the right button, a click makes the thing that sits at a point and a drag makes the thing that has extent.
- **A click in the explorer navigates; a click on the stage selects and never navigates.**
- **A left drag is decided at the press and never revised** — a gesture that changes its mind halfway is the aim-and-hope this design is written against.
- **Dropping a card on another card is a `move`, which is sayable; dropping it anywhere else is a `place`, which is not.**
- **The stage works out what an adjustment writes** (`moves.ts`) — a place and a `group`, a `leave`, a `seat`, a `relink`, an `arrange` to `free` on a `grid` layer — and hands the list to the host, which runs it as one batch. **One gesture, one step.**
- **A drop lands on a box and never on the frame** — the frame spans the whole layer, so counting it would make every drop a re-parent.
- **The stage publishes its geometry upward** so the options rail calls what it was handed. The shell never reaches into the stage.
- **A right drag lands on a card, never on a line.** A relationship joins two blocks; a note is tied to the block it is about.
- **A run's menu offers promoting only the ends that are not interfaces yet**, and a grip's menu knows which end it is.

## Inside the canvas

**`Flow.tsx` is the canvas, composed from hooks with one job each.**

| | Is |
|---|---|
| `room.ts` | the room a layer is drawn in, and the camera that flies to it |
| `sync.ts` | React Flow's copy of the arrays, kept in step with the Scene and the selection |
| `draw.ts` | the right button: a relationship from a card, a grid across the ground |
| `drag.ts` | what travels with a dragged node, what is lit, and the adjustment a drop makes |
| `Grips.tsx` | the ends of what is picked, and the berths of hidden interfaces |
| `moves.ts` | what an adjustment writes, as actions and positional changes |
| `flow.css` · `routes.css` · `groups.css` | cards and the frame; runs and their ends; bands and grids — loaded in that order |

## Hover and pick

**Another surface points; only a gesture picks.** A hovered table row arrives as `lit` and draws an accent outline round a card or an accent stroke on a run. A pick draws an accent border and a raised fill on a card, and the grips on a run — so the two differ in what is shown, never only in strength.
