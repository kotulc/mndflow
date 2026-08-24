# Animate

**The nesting-doll transition between layers.** Descending into a container zooms into it and coming back zooms out, so the tree is felt rather than read from a breadcrumb.

**Not built.** Descending redraws today. What follows is the target.

## Why it earns its place

**A layer is an abstraction of the part it belongs to**, and the thing that makes that legible is seeing where you went. A cut redraws the same-looking canvas with different contents, which is exactly the moment somebody loses their place.

**It is the only animation in the product.** Everything else — a card moving under a drag, a line rerouting — is direct manipulation and should track the pointer rather than play.

## What it has to be

| | |
|---|---|
| **derived** | the frame of the block being entered is already in the Scene, and it is the rectangle the camera flies to. Nothing new is stored |
| **interruptible** | a second descend during the first cancels it rather than queueing |
| **skippable** | reduced-motion turns it into a cut, and nothing else changes |
| **not a state** | the graph is the same before and after. An animation that could be observed by anything but the eye is a bug |

## Open

- **Coming back up has no obvious anchor.** Descending flies to a rectangle that is on screen; ascending flies from one that is about to stop existing.
- **Whether the explorer follows.** Two things moving at once may read as one motion or as two.
- **What it costs on a large layer**, where the frame is far off screen at the start.
