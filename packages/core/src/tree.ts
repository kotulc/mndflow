/** Where blocks sit: layers, children, order, and the relations drawn among them. */

import { base_of, setting_of } from "./defs";
import { drawn_in } from "./holders";
import { LAYOUTS, type Block, type Definition, type Graph, type Id, type Layout,
         type Relation } from "./types";


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

/** What a gesture is about: the one element picked, else the open layer. Picking several, or
 *  nothing, leaves the layer to answer — **one rule, so every view is about the same thing**. */
export function about_of(graph: Graph, layer: Id | null, picked: readonly Id[]): Id {
  const one = picked.length === 1 ? picked[0]! : null;
  return one && (graph.blocks[one] ?? graph.edges[one]) ? one : layer ?? graph.root;
}

/** What a listing frames: the block in context, else the open layer. **A block frames its own
 *  contents whether or not it holds anything**; a line holds nothing and the root is the layer
 *  itself, so both leave the layer to answer. */
export function frame_of(graph: Graph, layer: Id | null, about: Id): Id | null {
  return graph.blocks[about] && about !== graph.root ? about : layer;
}

/** What a block holds, in a stable order. Null holds the package roots. */
export function children(graph: Graph, layer: Id | null): Block[] {
  return Object.values(graph.blocks)
    .filter((b) => b.parent === layer)
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

/** Whether a block is an interface: a usage whose chain descends from `interface`. */
export function is_interface(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b && !b.def && base_of(graph, id) === "interface";
}

export function is_reference(b: Block): boolean {
  return b.of !== undefined;
}

/** A block holding blocks draws as a container. */
export function is_container(graph: Graph, id: Id): boolean {
  return Object.values(graph.blocks).some((b) => b.parent === id && !is_interface(graph, b.id));
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

/** The block a card previews: what a reference to a block stands for, else the block itself. */
export function previewed(graph: Graph, id: Id): Id {
  const target = graph.blocks[id]?.of ? stands_for(graph, id) : null;
  return target && target.id !== id ? target.id : id;
}

/** The definition a stand-in stands for, where it stands for one: it draws as that definition's
 *  usages do. */
export function stood_def(graph: Graph, id: Id): Definition | undefined {
  const of = graph.blocks[id]?.of;
  const at = of ? graph.blocks[of] : undefined;
  return at?.def ? (at as Definition) : undefined;
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

/** What separates a usage from a part of its definition it reads through: `usage/part`. */
const PART = "/";

/** The id a part of a usage's definition is drawn under on that usage. */
export function part_id(usage: Id, part: Id): Id {
  return `${usage}${PART}${part}`;
}

/** An end as drawn, read back: the block, and the part of its definition it names, if any. */
export function part_end(graph: Graph, id: Id): { block: Id; part?: Id } {
  const at = id.indexOf(PART);
  if (graph.blocks[id] || at < 0) return { block: id };
  return { block: id.slice(0, at), part: id.slice(at + PART.length) };
}

/** The block an end is drawn on: an interface's owner, or itself. */
export function owner_of(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  return b && is_interface(graph, b.id) && b.parent ? b.parent : id;
}

/** Relations with both ends drawn in this layer. */
export function edges_in(graph: Graph, layer: Id | null, flat = false): Relation[] {
  const here = new Set(drawn_in(graph, layer, flat).map((b) => b.id));
  const drawn = (id: Id) => here.has(owner_of(graph, id)) || (!!layer && owner_of(graph, id) === layer);
  return Object.values(graph.edges)
    .filter((e) => drawn(e.from) && drawn(e.to))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** How a layer lays out: its own word, else its definition's. `auto` is what nobody said, and a
 *  kind this build does not know draws as `auto` too. */
export function layout_of(graph: Graph, layer: Id | null): Layout {
  const kind = layer ? setting_of(graph, layer, "layout")["kind"] : undefined;
  if (kind === undefined) return "auto";
  return LAYOUTS.includes(kind as Layout) ? kind as Layout : "auto";
}
