/** The state's gesture map and the adjustments it accepts.
 *
 *  A plane like activity: place cards and groups, relate for transitions,
 *  create a state. No interface / wall — a behavior layer holds refs, not
 *  ports on a frame edge. */

import { type Adjustment } from "../diagram/map";

export type { Adjustment };

export type Hand = "left" | "right" | "key";

export type Motion =
  | "click" | "double" | "drag" | "drop"
  | "Escape" | "Enter" | "G" | "A" | "F" | "Delete";

export type Target =
  | "card" | "group" | "edge" | "proxy" | "frame" | "empty"
  | "selection" | "name" | "explorer" | "outside" | "any";

export type Reaches =
  | "selection" | "clear" | "marquee" | "fit" | "abandon" | "nothing"
  | "open" | "up" | "place" | "refer" | "create" | "group" | "relate"
  | "rename" | "delete";

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

/** Place only — size / seat / wall are structure-diagram concerns. */
export const MAP: GestureMap = {
  adjustments: ["place"],
  bindings: [
    { hand: "left", motion: "click", on: ["card", "group", "edge"], reaches: "selection" },
    { hand: "left", motion: "click", on: "proxy", reaches: "selection" },
    { hand: "left", motion: "click", on: ["frame", "empty"], reaches: "clear" },
    { hand: "left", motion: "double", on: "card", reaches: "open" },
    { hand: "left", motion: "double", on: "outside", reaches: "up" },
    { hand: "left", motion: "drag", on: "card", reaches: "place" },
    { hand: "left", motion: "drag", on: "group", reaches: "place" },
    { hand: "left", motion: "drag", on: "empty", reaches: "marquee" },
    { hand: "left", motion: "drop", on: "explorer", reaches: "refer" },

    { hand: "right", motion: "click", on: "empty", reaches: "create" },
    { hand: "right", motion: "click", on: "selection", reaches: "group" },
    { hand: "right", motion: "click", on: "name", reaches: "nothing" },
    { hand: "right", motion: "drag", on: "card", reaches: "relate" },

    { hand: "key", motion: "Escape", on: "any", reaches: "abandon" },
    { hand: "key", motion: "Enter", on: "card", reaches: "rename" },
    { hand: "key", motion: "G", on: "any", reaches: "group" },
    { hand: "key", motion: "A", on: "any", reaches: "selection" },
    { hand: "key", motion: "F", on: "any", reaches: "fit" },
    { hand: "key", motion: "Delete", on: "any", reaches: "delete" },
  ],
};

/** Whether this state view accepts the adjustment. */
export function takes(name: Adjustment, map: GestureMap = MAP): boolean {
  return map.adjustments.includes(name);
}

/** What a gesture reaches on this map, or null when nothing is bound. */
export function reaches(
  hand: Hand, motion: Motion, on: Target, map: GestureMap = MAP,
): Reaches | null {
  for (const binding of map.bindings) {
    if (binding.hand !== hand || binding.motion !== motion) continue;
    const spots = typeof binding.on === "string" ? [binding.on] : binding.on;
    if (spots.includes(on) || spots.includes("any")) return binding.reaches;
  }

  return null;
}
