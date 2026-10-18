/** Every action, registered on import. */

import { children, edges_in, layout_of } from "../tree";
import { port_edit } from "./helpers";
import type { Graph, Id, Mutation, Side } from "../types";
import "./blocks";
import "./relations";
import "./groups";
import "./grid";
import "./definitions";
import "./looks";
import "./cards";
import "./named";

export * from "./registry";

/** Adjustments: positional, unsayable, gesture-only. */
export const adjustments = {
  place: (moved: { id: Id; x: number; y: number }[]): Mutation[] =>
    moved.map((m) => ({ op: "place_block", id: m.id, x: m.x, y: m.y })),
  size: (id: Id, w: number, h: number): Mutation[] => [{ op: "size_block", id, w, h }],
  /** A port as drawn, seated where it is held: its definition's, where a usage reads it. */
  seat: (graph: Graph, id: Id, side: Side, at: number): Mutation[] =>
    port_edit(graph, id, (p) => ({ ...p, side, at })),
};

/** Re-exported so a caller can read a layer without importing the fold too. */
export { children, edges_in, layout_of };
