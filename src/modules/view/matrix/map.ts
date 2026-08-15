/** The matrix's gesture map and the adjustments it accepts.
 *
 *  None of the four: a cell has no place, size, seat or wall. Gestures that
 *  still make sense on a grid — pick a row/column member, open, refer — are
 *  bound here; the host reads the map the same way the table's does. */

import { type Adjustment } from "../diagram/map";

export type { Adjustment };

export type Hand = "left" | "right" | "key";

export type Motion =
  | "click" | "double" | "drag" | "drop"
  | "Escape" | "Enter" | "G" | "A" | "F" | "Delete";

/** Where it landed. `cell` / `axis` are the matrix's pieces; the rest match
 *  the inventory so a host can share one handler across modules. */
export type Target =
  | "cell" | "axis" | "empty" | "selection" | "name" | "explorer" | "outside" | "any";

export type Reaches =
  | "selection" | "clear" | "abandon" | "nothing"
  | "open" | "up" | "refer" | "create" | "rename" | "delete" | "relate";

export type Binding = {
  hand: Hand;
  motion: Motion;
  on: Target | readonly Target[];
  reaches: Reaches;
};

export type GestureMap = {
  adjustments: readonly Adjustment[];
  bindings: readonly Binding[];
};

/** A grid the engine lays out: no positional adjustments, the cell gestures. */
export const MAP: GestureMap = {
  adjustments: [],
  bindings: [
    { hand: "left", motion: "click", on: "cell", reaches: "selection" },
    { hand: "left", motion: "click", on: "axis", reaches: "selection" },
    { hand: "left", motion: "click", on: "empty", reaches: "clear" },
    { hand: "left", motion: "double", on: "axis", reaches: "open" },
    { hand: "left", motion: "double", on: "outside", reaches: "up" },
    { hand: "left", motion: "drop", on: "explorer", reaches: "refer" },

    { hand: "right", motion: "click", on: "empty", reaches: "create" },
    { hand: "right", motion: "click", on: "cell", reaches: "relate" },
    { hand: "right", motion: "click", on: "name", reaches: "nothing" },

    { hand: "key", motion: "Escape", on: "any", reaches: "abandon" },
    { hand: "key", motion: "Enter", on: "axis", reaches: "rename" },
    { hand: "key", motion: "A", on: "any", reaches: "selection" },
    { hand: "key", motion: "Delete", on: "any", reaches: "delete" },
  ],
};

/** Whether this matrix accepts the adjustment. */
export function takes(name: Adjustment, map: GestureMap = MAP): boolean {
  return map.adjustments.includes(name);
}

/** What a gesture reaches on this map, or null when nothing is bound. */
export function reaches(
  hand: Hand, motion: Motion, on: Target, map: GestureMap = MAP,
): Reaches | null {
  for (const binding of map.bindings) {
    const spots = typeof binding.on === "string" ? [binding.on] : binding.on;
    if (binding.hand === hand && binding.motion === motion && spots.includes(on)) {
      return binding.reaches;
    }
  }

  return null;
}
