/** What a positional drag on a Scene is asking for.
 *
 *  A drag ends as a name and a number, and this is the number. The Scene
 *  already says what a box is seated on and where a line's ends land, so the
 *  seat and the wall are questions about the Scene rather than about the graph
 *  — which is what lets a renderer ask them without reaching for either. */

import type { Side } from "@mnd/core";
import { nearest_seat, nearest_wall, type Seat, type Spot } from "@mnd/layout";
import type { Box, Scene } from "./scene";

/** Where a slide would seat this interface: a side of the card it sits on, and
 *  how far along. Null where it is not seated on anything drawn. */
export function reseat(scene: Scene, id: string, at: Spot): Seat | null {
  const box = scene.boxes.find((b) => b.id === id);
  const on = box?.on ? scene.boxes.find((b) => b.id === box.on) : null;
  return on ? nearest_seat(on, at) : null;
}

/** Which wall a relationship's end would leave by. **The card's wall**, so an
 *  end seated on an interface asks the card the interface sits on. */
export function rewall(scene: Scene, id: string, end: "from" | "to", at: Spot): Side | null {
  const route = scene.routes.find((r) => r.id === id);
  if (!route) return null;
  const at_end = scene.boxes.find((b) => b.id === (end === "from" ? route.from : route.to));
  const on: Box | undefined = at_end?.on
    ? scene.boxes.find((b) => b.id === at_end.on) : at_end;
  return on ? nearest_wall(on, at) : null;
}
