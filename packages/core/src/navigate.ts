/** Navigation: what opening, leaving and revealing do to the canvas, and what the explorer's
 *  sections hold for it. **One rule for every host.**
 *
 *  The canvas is the overview (`layer: null`) — every package, its domain flattened — or the
 *  structure of the tree opened, at one of its layers. A package, and a holder in a domain, are
 *  only ever seen on the overview. */

import { in_domain, package_of, tree_of } from "./defs";
import { holds_any } from "./capabilities";
import { inline, layer_of } from "./holders";
import { opens } from "./names";
import { is_interface } from "./tree";
import type { Graph, Id } from "./types";

/** What the canvas draws, and what is picked on it. */
export type View = { layer: Id | null; pick: Id | null };

/** What the sections hold for a view, outermost first — a package, then a tree — and which
 *  section is in focus: 0 the packages, 1 the definitions, 2 the structure. */
export type Held = { path: Id[]; at: number };


/** Where a block is seen: on the overview, a package or anything in a domain; else on the layer
 *  it is drawn on in its structure. Picked there either way. */
export function reveal_at(graph: Graph, id: Id): View {
  const b = graph.blocks[id];
  if (!b) return { layer: null, pick: null };
  if (b.parent === null || in_domain(graph, id)) return { layer: null, pick: id };
  return { layer: layer_of(graph, id), pick: id };
}

/** What opening a block does: a tree draws its structure, and any other block in a structure
 *  that opens onto a drawing or may hold — a folder among them, empty or not — draws as its own
 *  layer, as does an interface. A package, anything in a domain, a group or grid, which draw what
 *  they hold inline, and a block with nothing inside and nothing it may hold — a note — are
 *  revealed where they are seen. */
export function open_at(graph: Graph, id: Id): View {
  const b = graph.blocks[id];
  if (!b) return { layer: null, pick: null };
  if (tree_of(graph, id) === id) return { layer: id, pick: null };
  const holds = !inline(graph, id)
    && (is_interface(b) || opens(graph, id) || holds_any(graph, id));
  if (!in_domain(graph, id) && b.parent !== null && holds) return { layer: id, pick: null };
  return reveal_at(graph, id);
}

/** What leaving a layer does: the layer it is drawn on, what was open picked there — and from a
 *  tree's top, the overview. */
export function leave_at(graph: Graph, layer: Id | null): View {
  if (!layer || !graph.blocks[layer]) return { layer: null, pick: null };
  if (tree_of(graph, layer) === layer) return { layer: null, pick: layer };
  return { layer: layer_of(graph, layer), pick: layer };
}

/** What the sections hold for this view: on a structure, its package and tree, the structure in
 *  focus; on the overview, the package and the tree or holder picked, else nothing to change. */
export function held_at(graph: Graph, layer: Id | null, pick: Id | null): Held | null {
  if (layer && graph.blocks[layer]) {
    const tree = tree_of(graph, layer) ?? layer;
    return { path: [package_of(graph, tree), tree], at: 2 };
  }
  const b = pick ? graph.blocks[pick] : undefined;
  if (!b) return null;
  if (b.parent === null) return { path: [b.id], at: 0 };
  return { path: [package_of(graph, b.id), tree_of(graph, b.id) ?? b.id], at: 1 };
}
