/** The block diagram's gesture map and the adjustments it accepts.
 *
 *  A view owns its map and binds a gesture to an action name — never the
 *  descriptor. Written from the inventory in actions.md; the hook reads it.
 *  Another module ships its own: a matrix accepts none of the four, a
 *  sequence accepts only `seat`. */

/** The four. Closed — never grow from data. */
export const ADJUSTMENTS = ["place", "size", "seat", "wall"] as const;

export type Adjustment = (typeof ADJUSTMENTS)[number];

/** Which hand named the gesture, or the keyboard. */
export type Hand = "left" | "right" | "key";

/** What the pointer (or a key) did. Keys use the key name as the motion. */
export type Motion =
  | "click" | "double" | "drag" | "drop"
  | "Escape" | "Enter" | "G" | "A" | "F" | "Delete";

/** Where it landed, as actions.md names them. */
export type Target =
  | "card" | "group" | "edge" | "proxy" | "frame" | "empty" | "note"
  | "selection" | "name" | "interface" | "explorer" | "chip" | "outside"
  | "any";

/**
 *  What a binding reaches. Action names match the registry; the rest are
 *  local — selection, clear, marquee, fit, abandon — or `offer` for the
 *  fixed-order list (G.9d).
 */
export type Reaches =
  | "selection" | "clear" | "marquee" | "fit" | "abandon" | "offer"
  | "open" | "reveal" | "up" | "move" | "place" | "refer"
  | "create" | "interface" | "retype" | "group" | "relate" | "tie" | "note"
  | "rename" | "delete" | "unlink";

export type Binding = {
  hand: Hand;
  motion: Motion;
  on: Target | readonly Target[];
  reaches: Reaches;
};

export type GestureMap = {
  /** Which of the four this diagram accepts. Empty means the engine owns
   *  every position and a drag means something else. */
  adjustments: readonly Adjustment[];
  /** Gesture → action, from the inventory. */
  bindings: readonly Binding[];
};

/** Today's canvas, written down as one map among others. All four adjustments;
 *  every binding in actions.md. */
export const MAP: GestureMap = {
  adjustments: ADJUSTMENTS,
  bindings: [
    // Left button — work what already exists.
    { hand: "left", motion: "click", on: ["card", "group", "edge"], reaches: "selection" },
    { hand: "left", motion: "click", on: "proxy", reaches: "selection" },
    { hand: "left", motion: "click", on: ["frame", "empty"], reaches: "clear" },
    { hand: "left", motion: "double", on: "card", reaches: "open" },
    { hand: "left", motion: "double", on: "outside", reaches: "up" },
    { hand: "left", motion: "drag", on: "card", reaches: "place" },
    { hand: "left", motion: "drag", on: "group", reaches: "place" },
    { hand: "left", motion: "drag", on: "note", reaches: "place" },
    { hand: "left", motion: "drag", on: "empty", reaches: "marquee" },
    { hand: "left", motion: "drop", on: "explorer", reaches: "refer" },
    { hand: "left", motion: "drop", on: "chip", reaches: "move" },

    // Right button — create on empty; offer the list on anything that exists.
    // Drags are unchanged: relate, tie, note.
    { hand: "right", motion: "click", on: "empty", reaches: "create" },
    { hand: "right", motion: "click",
      on: ["card", "frame", "edge", "selection", "name", "interface", "group", "note"],
      reaches: "offer" },
    { hand: "right", motion: "drag", on: ["card", "frame"], reaches: "relate" },
    { hand: "right", motion: "drag", on: "note", reaches: "tie" },
    { hand: "right", motion: "drag", on: "empty", reaches: "note" },

    // Keyboard.
    { hand: "key", motion: "Escape", on: "any", reaches: "abandon" },
    { hand: "key", motion: "Enter", on: "card", reaches: "rename" },
    { hand: "key", motion: "G", on: "any", reaches: "group" },
    { hand: "key", motion: "A", on: "any", reaches: "selection" },
    { hand: "key", motion: "F", on: "any", reaches: "fit" },
    { hand: "key", motion: "Delete", on: "any", reaches: "delete" },
  ],
};

/** Whether this diagram accepts the adjustment. */
export function takes(name: Adjustment, map: GestureMap = MAP): boolean {
  return map.adjustments.includes(name);
}

/** What a gesture reaches on this map, or null when nothing is bound. */
export function reaches(
  hand: Hand, motion: Motion, on: Target, map: GestureMap = MAP,
): Reaches | null {
  for (const binding of map.bindings) {
    if (binding.hand !== hand || binding.motion !== motion) continue;
    const targets = typeof binding.on === "string" ? [binding.on] : binding.on;
    if (targets.includes(on) || targets.includes("any")) return binding.reaches;
  }

  return null;
}
