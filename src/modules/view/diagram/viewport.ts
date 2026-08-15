/** The viewport: a camera over the working area.
 *
 *  What "fit" and "go to this" mean for a diagram. A table would scroll instead;
 *  this module zooms and pans. Pure numbers — the React Flow calls that apply
 *  them stay with the compositor. */

import { around, type Box } from "../../../geometry/layout";
import { BAND, MARGIN } from "./surround";

export type Camera = { zoom: number; x: number; y: number };

/** The resting zoom: frame (or the free cards) plus the band of margin.
 *  Wheel zoom may go in from here, but not out past it. */
export function floorOf(
  frame: Box | null,
  boxes: Box[],
  seen: { w: number; h: number },
): number {
  if (frame) {
    const scale = Math.min(
      (seen.w - BAND * 2) / frame.w,
      (seen.h - BAND * 2) / frame.h,
    );
    return Math.max(0.15, Math.min(scale, 1.6));
  }

  const outer = around(boxes, 0);
  if (!outer || seen.w < 1 || seen.h < 1) return 0.15;

  // Matches fitView({ padding: 0.24, maxZoom: 1.3 }) at the top level.
  const pad = 0.24;
  const scale = Math.min(
    (seen.w * (1 - pad * 2)) / Math.max(outer.w, 1),
    (seen.h * (1 - pad * 2)) / Math.max(outer.h, 1),
  );
  return Math.max(0.15, Math.min(scale, 1.3));
}

/** Centered resting camera at the floor zoom — frame (or free cards) with
 *  even margin. Zoom-to-cursor leaves pan skewed when you hit the floor; this
 *  is what we snap back to. */
export function restOf(
  floor: number,
  frame: Box | null,
  boxes: Box[],
  seen: { w: number; h: number },
): Camera | null {
  if (frame) {
    return {
      zoom: floor,
      x: seen.w / 2 - (frame.x + frame.w / 2) * floor,
      y: seen.h / 2 - (frame.y + frame.h / 2) * floor,
    };
  }

  const outer = around(boxes, 0);
  if (!outer) return null;

  return {
    zoom: floor,
    x: seen.w / 2 - (outer.x + outer.w / 2) * floor,
    y: seen.h / 2 - (outer.y + outer.h / 2) * floor,
  };
}

/** How far the canvas may be panned: the layer, plus room on every side to
 *  put something new. It grows as the layer does. */
export function extentOf(
  frame: Box | null,
  boxes: Box[],
): [[number, number], [number, number]] {
  const outer = frame ?? around(boxes, MARGIN)
                         ?? { x: -260, y: -140, w: 520, h: 280 };
  // Inside a frame, only enough to reach past its edge — that is the gesture
  // for pushing a card up a layer, and beyond it there is nothing to see.
  const room = frame ? MARGIN * 2 : 520;

  return [[outer.x - room, outer.y - room],
          [outer.x + outer.w + room, outer.y + outer.h + room]];
}
