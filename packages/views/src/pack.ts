/** Auto-layout: every unit in reading order on standard columns. Relations draw lines and never
 *  move a card: a tied note is ordered after its block when it is made, and arranging by relations
 *  is an act of its own. */

import { drawn_in, edges_in, is_box, is_interface, is_note, is_reference, is_tie, setting_of,
         type Block, type Graph, type Id } from "@mnd/core";
import type { Placed } from "./arrange";
import type { Sized } from "./bands";
import { filled, wide_for } from "./grid";
import { size_of, BLOCK, GAP, SHAPE } from "./size";


/** Auto-layout: units in reading order, **filling toward the canvas's shape** — `wide` pixels
 *  across where a width is said, else as wide as their area needs at that aspect — each in the
 *  highest free spot, so nothing waits for a row beside a tall room. */
export function pack_units(sized: readonly Sized[], wide?: number): Placed[] {
  const read = [...sized].sort((a, b) =>
    (a.b.order ?? 0) - (b.b.order ?? 0) || a.b.id.localeCompare(b.b.id));
  const units = read.map((it) => ({ id: it.b.id, ...it.s }));
  return filled(units, Math.max(wide ?? wide_for(units, SHAPE.aspect), ...units.map((u) => u.w)));
}

/** How wide a room's content fills: what it says across, in cards, else its whole drawn area
 *  at the canvas's shape — so every region band in it shares one width. */
export function room_wide(graph: Graph, layer: Id | null): number {
  const said = layer ? setting_of(graph, layer, "layout")["across"] : undefined;
  if (typeof said === "number") return Math.max(1, said) * (BLOCK.w + GAP) - GAP;
  const leaves = drawn_in(graph, layer)
    .filter((b) => !is_box(graph, b.id) && !is_interface(graph, b.id))
    .map((b) => size_of(graph, b.id));
  return wide_for(leaves, SHAPE.aspect);
}

/** What a satellite belongs to: what a reference links on the layer, or what a note is tied to. */
export function belongs_to(graph: Graph, layer: Id | null, b: Block): Id[] {
  return is_reference(graph, b.id) ? layer_targets(graph, layer, b.id) : tie_targets(graph, layer, b.id);
}

/** What a card is tied to on a layer. A tie to the layer itself places nothing there: the card
 *  floats beside everything the layer holds, as an untied one does. */
export function tie_targets(graph: Graph, layer: Id | null, id: Id): Id[] {
  const out: Id[] = [];
  for (const e of edges_in(graph, layer)) {
    if (!is_tie(graph, e.id)) continue;
    const other = e.from === id ? e.to : e.to === id ? e.from : undefined;
    if (other !== undefined && other !== layer) out.push(other);
  }
  return out;
}

/** A tied note or a reference: on a `free` layer, one never placed sits by what it names. */
export function is_satellite(graph: Graph, layer: Id | null, b: Block): boolean {
  if (is_reference(graph, b.id)) return true;
  return is_note(graph, b.id) && tie_targets(graph, layer, b.id).length > 0;
}

function layer_targets(graph: Graph, layer: Id | null, id: Id): Id[] {
  const out: Id[] = [];
  for (const e of edges_in(graph, layer)) {
    if (e.from === id) out.push(e.to);
    else if (e.to === id) out.push(e.from);
  }
  return out;
}
