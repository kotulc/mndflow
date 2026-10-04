/** Every action, registered on import. */

import { arrangement_of, children, edges_in } from "../tree";
import type { Id, Mutation, Side } from "../types";
import "./blocks";
import "./relations";
import "./groups";
import "./grid";
import "./definitions";
import "./looks";

export * from "./registry";

/** Adjustments: positional, unsayable, gesture-only. */
export const adjustments = {
  place: (moved: { id: Id; x: number; y: number }[]): Mutation[] =>
    moved.map((m) => ({ op: "place_block", id: m.id, x: m.x, y: m.y })),
  size: (id: Id, w: number, h: number): Mutation[] => [{ op: "size_block", id, w, h }],
  seat: (id: Id, side: Side, at: number): Mutation[] => [{ op: "set_port", id, side, at }],
};

/** Re-exported so a caller can read a layer without importing the fold too. */
export { arrangement_of, children, edges_in };
