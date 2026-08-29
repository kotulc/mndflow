/** Where an interface sits.
 *
 *  An interface is **seated** on its owner's edge rather than laid out beside
 *  it: a side and a fraction along it, so the seat survives the owner moving,
 *  growing or being arranged some other way.
 *
 *  **A slide is still ours to read.** The canvas says where a drag came to
 *  rest; which wall that is and how far along it are questions about this
 *  model, and no drawing library has an opinion on them. What *is* gone is
 *  asking the same question of a line's end — that is `onReconnect` now, which
 *  names the card it landed on rather than a point to measure. */

import { children, is_interface, type Graph, type Side } from "@mnd/core";
import type { Placed } from "./arrange";
import { PORT, seat_at, seats } from "./size";

export type Seat = { side: Side; at: number };

export type Rect = { x: number; y: number; w: number; h: number };

/** Every interface drawn in this layer, seated on the card it belongs to. */
export function seated(graph: Graph, spots: readonly Placed[]): Placed[] {
  const out: Placed[] = [];
  for (const p of spots) {
    for (const b of children(graph, p.id)) {
      if (!is_interface(b)) continue;
      out.push({ ...at_seat(p, { side: b.side!, at: b.at ?? 0.5 }), id: b.id });
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/** The box an interface takes: straddling the edge, centred on its seat. */
export function at_seat(on: Placed, seat: Seat): Rect {
  const t = Math.min(1, Math.max(0, seat.at));
  const along = { x: on.x + on.w * t, y: on.y + on.h * t };
  const mid = seat.side === "top" ? { x: along.x, y: on.y }
            : seat.side === "bottom" ? { x: along.x, y: on.y + on.h }
            : seat.side === "left" ? { x: on.x, y: along.y }
            : { x: on.x + on.w, y: along.y };
  return { x: mid.x - PORT.w / 2, y: mid.y - PORT.h / 2, ...PORT };
}

/** Which seat a point asks for: the nearest edge, and the seat along it the
 *  point falls closest to. Seats are discrete, so a slide lands somewhere it
 *  can be landed on again. */
export function nearest_seat(on: Rect, at: { x: number; y: number }): Seat {
  /** How far out of the middle, in halves of the card. Measuring against the
   *  walls themselves would give a wide, short card a top wall that reaches
   *  further than its right one — every point outside would read *top*. */
  const out = { x: (at.x - (on.x + on.w / 2)) / (on.w / 2 || 1),
                y: (at.y - (on.y + on.h / 2)) / (on.h / 2 || 1) };
  const side: Side = Math.abs(out.x) >= Math.abs(out.y)
    ? (out.x >= 0 ? "right" : "left")
    : (out.y >= 0 ? "bottom" : "top");

  const down = side === "left" || side === "right";
  const length = down ? on.h : on.w;
  const along = down ? (at.y - on.y) / (on.h || 1) : (at.x - on.x) / (on.w || 1);
  const count = seats(length);
  const n = Math.min(count - 1, Math.max(0, Math.round(along * (count + 1) - 1)));
  return { side, at: seat_at(n, count) };
}
