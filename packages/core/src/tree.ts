/** Where blocks sit: layers, children, order, and the relations drawn among them. */

import type { Arrangement, Block, Graph, Id, Relation, Unit } from "./types";


/** Every block under this one, itself included. */
export function subtree(graph: Graph, id: Id): Id[] {
  const out: Id[] = [id];
  for (let i = 0; i < out.length; i++) {
    const here = out[i]!;
    for (const b of Object.values(graph.blocks)) {
      if (b.parent === here) out.push(b.id);
    }
  }
  return out;
}

/** A null layer is the root layer. */
export function layer_id(graph: Graph, layer: Id | null): Id {
  return layer ?? graph.root;
}

/** What a gesture is about: the one element picked, else the open layer. Picking several, or
 *  nothing, leaves the layer to answer — **one rule, so every view is about the same thing**. */
export function about_of(graph: Graph, layer: Id | null, picked: readonly Id[]): Id {
  const one = picked.length === 1 ? picked[0]! : null;
  return one && (graph.blocks[one] ?? graph.edges[one]) ? one : layer_id(graph, layer);
}

/** What a listing frames: the block in context, else the open layer. **A block frames its own
 *  contents whether or not it holds anything**; a line holds nothing and the root is the layer
 *  itself, so both leave the layer to answer. */
export function frame_of(graph: Graph, layer: Id | null, about: Id): Id | null {
  return graph.blocks[about] && about !== graph.root ? about : layer;
}

/** The direct children of a layer, in a stable order. */
export function children(graph: Graph, layer: Id | null): Block[] {
  const here = layer_id(graph, layer);
  return Object.values(graph.blocks)
    .filter((b) => b.parent === here)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
}

/** The chain from root down to this block, itself last. */
export function path(graph: Graph, id: Id): Block[] {
  const out: Block[] = [];
  let at: Id | null = id;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    const b: Block | undefined = graph.blocks[at];
    if (!b) break;
    out.unshift(b);
    at = b.parent;
  }
  return out;
}

export function is_interface(b: Unit): boolean {
  return "side" in b && b.side !== undefined;
}

/** Everything drawn in a layer: the blocks it holds, and the holders drawn over them. */
export function units_in(graph: Graph, layer: Id | null): Unit[] {
  const here = layer_id(graph, layer);
  return [...Object.values(graph.blocks).filter((b) => b.parent === here),
          ...Object.values(graph.holders).filter((h) => h.parent === here)]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
}

export function is_reference(b: Block): boolean {
  return b.of !== undefined;
}

/** A block holding blocks draws as a container. */
export function is_container(graph: Graph, id: Id): boolean {
  return Object.values(graph.blocks).some((b) => b.parent === id && !is_interface(b));
}

/** A block no other block contains. */
export function is_top_block(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b && b.parent === graph.root;
}

/** What a reference stands for, followed to the end. */
export function stands_for(graph: Graph, id: Id): Block | null {
  let b: Block | undefined = graph.blocks[id];
  const seen = new Set<Id>();
  while (b?.of && !seen.has(b.id)) {
    seen.add(b.id);
    b = graph.blocks[b.of];
  }
  return b ?? null;
}

/** The number a new sibling takes: one past the last. */
export function next_order(graph: Graph, parent: Id | null): number {
  return children(graph, parent).reduce((n, b) => Math.max(n, b.order ?? 0), 0) + 1;
}

/** The sibling orders that change when `moved` goes before `before`, or last. */
export function reorder(graph: Graph, parent: Id | null, moved: Id | readonly Id[],
                        before?: Id | null): { id: Id; order: number }[] {
  /** Several arrive as one run, in the order given. */
  const run = Array.isArray(moved) ? [...moved] : [moved as Id];
  const rest = children(graph, parent).filter((b) => !run.includes(b.id)).map((b) => b.id);
  const at = before ? rest.indexOf(before) : -1;
  const order = at < 0 ? [...rest, ...run] : [...rest.slice(0, at), ...run, ...rest.slice(at)];
  return order
    .map((id, i) => ({ id, order: i + 1 }))
    .filter(({ id, order }) => (graph.blocks[id]?.order ?? 0) !== order);
}

/** The block an end is drawn on: an interface's owner, or itself. */
export function owner_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  return b && is_interface(b) && b.parent ? b.parent : id;
}

/** Relations with both ends drawn in this layer. */
export function edges_in(graph: Graph, layer: Id | null): Relation[] {
  const here = new Set(children(graph, layer).map((b) => b.id));
  const room = layer_id(graph, layer);
  const drawn = (id: Id) => here.has(owner_of(graph, id)) || owner_of(graph, id) === room;
  return Object.values(graph.edges)
    .filter((e) => drawn(e.from) && drawn(e.to))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** The layer's arrangement. `free` is what a layer says nothing about. */
export function arrangement_of(graph: Graph, layer: Id | null): Arrangement {
  return graph.blocks[layer_id(graph, layer)]?.arrangement ?? "free";
}
