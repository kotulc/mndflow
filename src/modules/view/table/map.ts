/** The table's gesture map and the adjustments it accepts.
 *
 *  None of the four: a row has no place, size, seat or wall. Gestures that
 *  still make sense on a list — pick, open, refer, rename, delete — are bound
 *  here; the host reads the map the same way the diagram's does. */

import { type Adjustment } from "../diagram/map";

export type { Adjustment };

export type Hand = "left" | "right" | "key";

export type Motion =
  | "click" | "double" | "drag" | "drop"
  | "Escape" | "Enter" | "G" | "A" | "F" | "Delete";

/** Where it landed. `row` is the table's piece; the rest match the inventory
 *  so a host can share one handler across modules. */
export type Target =
  | "row" | "empty" | "selection" | "name" | "explorer" | "outside" | "any";

export type Reaches =
  | "selection" | "clear" | "abandon" | "nothing"
  | "open" | "up" | "refer" | "create" | "rename" | "delete";

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

/** A list the engine lays out: no positional adjustments, the row gestures. */
export const MAP: GestureMap = {
  adjustments: [],
  bindings: [
    { hand: "left", motion: "click", on: "row", reaches: "selection" },
    { hand: "left", motion: "click", on: "empty", reaches: "clear" },
    { hand: "left", motion: "double", on: "row", reaches: "open" },
    { hand: "left", motion: "double", on: "outside", reaches: "up" },
    { hand: "left", motion: "drop", on: "explorer", reaches: "refer" },

    { hand: "right", motion: "click", on: "empty", reaches: "create" },
    { hand: "right", motion: "click", on: "name", reaches: "nothing" },

    { hand: "key", motion: "Escape", on: "any", reaches: "abandon" },
    { hand: "key", motion: "Enter", on: "row", reaches: "rename" },
    { hand: "key", motion: "A", on: "any", reaches: "selection" },
    { hand: "key", motion: "Delete", on: "any", reaches: "delete" },
  ],
};

/** Whether this table accepts the adjustment. */
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
