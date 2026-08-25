/** The nesting-doll transition between layers.
 *
 *  **Descending into a container zooms into it and coming back zooms out**, so
 *  the tree is felt rather than read off a breadcrumb. A cut redraws the same-
 *  looking canvas with different contents, which is exactly the moment somebody
 *  loses their place.
 *
 *  **It is the only animation in the product.** Everything else — a card under
 *  a drag, a line rerouting — is direct manipulation and tracks the pointer
 *  rather than playing.
 *
 *  Four things hold it in place:
 *
 *  - **Derived.** The rectangle the camera flies from is already in the Scene:
 *    coming back up, it is the box of the layer just left; going down, there is
 *    no such box, so it is how much bigger the last view was than the thing
 *    entered. Nothing new is stored.
 *  - **Interruptible.** A second descend during the first cancels it rather
 *    than queueing.
 *  - **Skippable.** Reduced motion makes it a cut and changes nothing else.
 *  - **Not a state.** All that moves is the viewBox. An animation anything but
 *    the eye could observe would be a bug. */

import { useEffect, useRef, useState } from "react";
import type { Scene } from "@mnd/views";

export type View = { x: number; y: number; w: number; h: number };

/** Long enough to read as one motion, short enough not to be waited on. */
const FLIGHT = 260;

const ease = (t: number) => 1 - (1 - t) ** 3;

const centre = (v: { x: number; y: number; w: number; h: number }) =>
  ({ x: v.x + v.w / 2, y: v.y + v.h / 2 });

/** A view of the same shape, scaled about a point. */
function around(view: View, at: { x: number; y: number }, by: number): View {
  return { w: view.w * by, h: view.h * by,
           x: at.x - (view.w * by) / 2, y: at.y - (view.h * by) / 2 };
}

function between(a: View, b: View, t: number): View {
  const k = ease(t);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k,
           w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k };
}

function still(): boolean {
  return typeof matchMedia === "function"
    && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Where the flight starts, or null where there is nothing to fly from.
 *
 *  Coming back up, the layer just left is drawn here, and that box is the
 *  rectangle exactly. Going down, it is not — so the last view against the box
 *  that was entered says how much of the screen it had, and the camera starts
 *  that much further out. */
function from(scene: Scene, view: View, was: { scene: Scene; view: View }): View | null {
  const left = was.scene.layer;
  if (left && left !== scene.layer) {
    const box = scene.boxes.find((b) => b.id === left);
    if (box) return around(view, centre(box), Math.max(box.w / view.w, box.h / view.h));
  }
  const entered = was.scene.boxes.find((b) => b.id === scene.layer);
  if (entered) {
    const grew = Math.max(was.view.w / entered.w, was.view.h / entered.h);
    return around(view, centre(scene.frame ?? view), grew);
  }
  return null;
}

/** The viewBox to draw with. The settled one until a layer changes, then the
 *  flight, then the settled one again. */
export function useFlight(scene: Scene, view: View): View {
  const was = useRef<{ scene: Scene; view: View } | null>(null);
  const running = useRef<number | null>(null);
  const [flying, set_flying] = useState<View | null>(null);

  useEffect(() => {
    const last = was.current;
    was.current = { scene, view };

    /** **Interruptible**: whatever was in the air is dropped, not queued. */
    if (running.current !== null) cancelAnimationFrame(running.current);
    running.current = null;

    if (!last || last.scene.layer === scene.layer || still()) {
      set_flying(null);
      return;
    }
    const start = from(scene, view, last);
    if (!start) {
      set_flying(null);
      return;
    }

    const began = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - began) / FLIGHT);
      set_flying(t < 1 ? between(start, view, t) : null);
      running.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    set_flying(start);
    running.current = requestAnimationFrame(step);

    return () => {
      if (running.current !== null) cancelAnimationFrame(running.current);
      running.current = null;
    };
  }, [scene, view]);

  return flying ?? view;
}
