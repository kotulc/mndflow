/** The surround: a frame sized to the panel, or nothing.
 *
 *  The diagram's answer to "where does this layer end?". A table has no frame;
 *  this module always does. Sizing is pure: the drawn border itself still lives
 *  with the canvas pieces that stroke interfaces on it. */

import { around, cell, type Box } from "../../../geometry/layout";

/** Room the layer's frame leaves around its contents, which is where the
 *  interfaces on its edge sit. */
export const MARGIN = 96;

/** The least a layer's working area is ever worth, whatever the panel's shape
 *  will not go below. A frame is drawn from its contents, so a layer holding
 *  two cards would otherwise be a small box magnified to fill the panel — the
 *  same picture, with everything twice the size and no more room to work in. */
export const LEAST = { w: 520, h: 320 };

/** The band left around a layer's frame, in screen pixels. It is where you
 *  double-click to leave, and where the parent's border shows when the layer
 *  is an interface, so it is the same on every side of every layer. */
export const BAND = 56;

/** The layer's own frame, with room on every side for its interfaces.
 *
 *  Shaped like the space it will be shown in, so that scaling it to fit leaves
 *  the same band on every side. Floored to the panel so a sparse layer is roomy
 *  rather than magnified, then snapped to the grid so the border and every
 *  interface on it land on the same lattice the cards do. */
export function framed(
  boxes: Box[],
  seen: { w: number; h: number },
): Box {
  const hug = around(boxes, MARGIN) ?? { x: 0, y: 0, w: 0, h: 0 };

  const shape = (seen.w - BAND * 2) / (seen.h - BAND * 2);
  let w = Math.max(hug.w, LEAST.w);
  let h = Math.max(hug.h, LEAST.h);
  w / h > shape ? (h = w / shape) : (w = h * shape);

  const floor = Math.max(1, (seen.w - BAND * 2) / w, (seen.h - BAND * 2) / h);
  w *= floor;
  h *= floor;

  w = cell(w);
  h = cell(h);

  return { x: cell(hug.x + hug.w / 2 - w / 2), y: cell(hug.y + hug.h / 2 - h / 2), w, h };
}
