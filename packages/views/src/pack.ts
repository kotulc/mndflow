/** Auto-layout: every unit in reading order on standard columns. Relations draw lines and never
 *  move a card: a tied note is ordered after its block when it is made, and arranging by relations
 *  is an act of its own. */

import { edge_base, edges_in, is_note, is_reference, type Block, type Graph, type Id }
  from "@mnd/core";
import type { Placed } from "./arrange";
import type { Sized } from "./bands";
import { flow } from "./grid";


/** Auto-layout: units flowed in reading order, `across` to a row — a layer's page width — or,
 *  inside a group, about as wide as tall. */
export function pack_units(sized: readonly Sized[], across?: number): Placed[] {
  const read = [...sized].sort((a, b) =>
    (a.b.order ?? 0) - (b.b.order ?? 0) || a.b.id.localeCompare(b.b.id));
  const wide = across ?? Math.ceil(Math.sqrt(read.length));
  return flow(read.map((it) => ({ id: it.b.id, ...it.s })), wide);
}

/** What a satellite belongs to: what a reference links on the layer, or what a note is tied to. */
export function belongs_to(graph: Graph, layer: Id | null, b: Block): Id[] {
  return is_reference(b) ? layer_targets(graph, layer, b.id) : tie_targets(graph, layer, b.id);
}

function tie_targets(graph: Graph, layer: Id | null, id: Id): Id[] {
  const out: Id[] = [];
  for (const e of edges_in(graph, layer)) {
    if (edge_base(graph, e.id) !== "tie") continue;
    if (e.from === id) out.push(e.to);
    else if (e.to === id) out.push(e.from);
  }
  return out;
}

/** A tied note or a reference: on a `free` layer, one never placed sits by what it names. */
export function is_satellite(graph: Graph, layer: Id | null, b: Block): boolean {
  if (is_reference(b) && b.of) return true;
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
