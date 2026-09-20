/** Groups and grids: membership, cells, merges, headers and allocation. */

import type { Block, Cell, Graph, HeaderRole, Holder, Id, Span } from "./types";


/** The stable order a layer and every holder in it read in. */
const by_order = (a: { order?: number; id: Id }, b: { order?: number; id: Id }): number =>
  (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id);


/** Whether two spans cover any cell in common. */
export function overlaps(a: Span, b: Span): boolean {
  return a.r < b.r + b.rows && b.r < a.r + a.rows
      && a.c < b.c + b.cols && b.c < a.c + a.cols;
}

/** Whether a span covers this address. */
export function covers(s: Span, r: number, c: number): boolean {
  return r >= s.r && r < s.r + s.rows && c >= s.c && c < s.c + s.cols;
}

/** A holder by id, whichever shape it is. Holders are their own element kind: a block id never
 *  answers here, and this is the one place that knows where they live. */
export function holder_of(graph: Graph, id: Id | undefined): Holder | null {
  return (id ? graph.holders[id] : undefined) ?? null;
}

/** Whether this is a grid — a region with an extent and cells to seat in. */
export function is_grid(graph: Graph, id: Id): boolean {
  return graph.holders[id]?.arrangement === "grid";
}

/** Whether this is a boundary — a dashed rim round its members. */
export function is_group(graph: Graph, id: Id): boolean {
  return graph.holders[id]?.arrangement === "free";
}

/** Whether this holds blocks, either way. */
export function is_holder(graph: Graph, id: Id): boolean {
  return !!graph.holders[id];
}

/** Every holder drawn in one layer, in a stable order. */
export function holders_in(graph: Graph, layer: Id): Holder[] {
  return Object.values(graph.holders)
    .filter((h) => h.parent === layer)
    .sort(by_order);
}

/** The holder a block sits in, or null. */
export function grid_of(graph: Graph, id: Id): Holder | null {
  return holder_of(graph, graph.blocks[id]?.group);
}

/** Where a block sits in its group, or null. */
export function cell_of(graph: Graph, id: Id): Cell | null {
  const b = graph.blocks[id];
  return b?.group && b.cell ? { ...b.cell } : null;
}

/** The holders enclosing a block or a holder, nearest first. A holder may sit in another, so
 *  this walks both. */
export function holders_over(graph: Graph, id: Id): Holder[] {
  const out: Holder[] = [];
  const seen = new Set<Id>();
  let at = (graph.blocks[id] ?? graph.holders[id])?.group;
  while (at && !seen.has(at)) {
    seen.add(at);
    const h = graph.holders[at];
    if (!h) break;
    out.push(h);
    at = h.group;
  }
  return out;
}

/** How many holders enclose a block — zero for one sitting on the layer. */
export function group_depth(graph: Graph, id: Id): number {
  return holders_over(graph, id).length;
}

/** Everything a holder holds, in the layer's stable order. Blocks and nested holders alike. */
export function members_of(graph: Graph, group: Id): (Block | Holder)[] {
  return [...Object.values(graph.blocks), ...Object.values(graph.holders)]
    .filter((b) => b.group === group)
    .sort(by_order);
}

/** The blocks a holder holds. A cell seats a card, so everything about cells asks this. */
export function block_members(graph: Graph, group: Id): Block[] {
  return Object.values(graph.blocks)
    .filter((b) => b.group === group)
    .sort(by_order);
}

/** Whether `holder` may contain `id` — not itself and not a cycle. A cell seats one card and a
 *  holder is not a card, which is why a grid holds no holder. */
export function can_hold(graph: Graph, holder: Id, id: Id,
                        held?: ReadonlyMap<Id, Id | undefined>): boolean {
  if (!is_holder(graph, holder)) return false;
  if (holder === id) return false;
  if (is_grid(graph, holder) && is_holder(graph, id)) return false;
  const map = held ?? new Map([...Object.values(graph.blocks),
                               ...Object.values(graph.holders)].map((b) => [b.id, b.group]));
  let at: Id | undefined = holder;
  const seen = new Set<Id>();
  while (at) {
    if (at === id) return false;
    if (seen.has(at)) break;
    seen.add(at);
    at = map.get(at);
  }
  return true;
}

/** The span covering this address, or null. */
export function merge_at(graph: Graph, group: Id, r: number, c: number): Span | null {
  return graph.holders[group]?.merges?.find((s) => covers(s, r, c)) ?? null;
}

/** What sits at this address; a merge answers at every address it covers. */
export function at_cell(graph: Graph, group: Id, r: number, c: number): Block | null {
  const span = merge_at(graph, group, r, c);
  const want = span ? { r: span.r, c: span.c } : { r, c };
  return block_members(graph, group)
    .find((b) => b.cell?.r === want.r && b.cell?.c === want.c) ?? null;
}

/** Whether a block heads the line it sits in, and so fills its cell. */
export function is_header(b: Block): boolean {
  return !!b.header;
}

/** Which line a seated block's position puts it in charge of, whether or not it is a header. */
export function would_head(graph: Graph, id: Id): HeaderRole | null {
  const at = region_of(graph, id);
  if (!at) return null;
  if (at.r === 0) return at.c === 0 ? "both" : "col";
  return "row";
}

/** Which line this block heads, or null where it heads none. */
export function head_of(graph: Graph, id: Id): HeaderRole | null {
  return graph.blocks[id]?.header ? would_head(graph, id) : null;
}

/** Whether this block heads rows, or columns. */
export function heads(graph: Graph, id: Id, way: "row" | "col"): boolean {
  const role = head_of(graph, id);
  return role === way || role === "both";
}

/** The region a seated block occupies: the merge covering its address, or its one cell. */
export function region_of(graph: Graph, id: Id): Span | null {
  const b = graph.blocks[id];
  if (!b?.group || !b.cell) return null;
  return merge_at(graph, b.group, b.cell.r, b.cell.c) ?? { ...b.cell, rows: 1, cols: 1 };
}

/** Whether two runs along one axis share any line. */
function along(a: number, an: number, b: number, bn: number): boolean {
  return a < b + bn && b < a + an;
}

/** The headers a seated block sits under: the one heading its row, its column, or both. */
function headers_over(graph: Graph, id: Id): Block[] {
  const me = region_of(graph, id);
  const group = graph.blocks[id]?.group;
  if (!me || !group) return [];
  const out: Block[] = [];
  for (const h of block_members(graph, group)) {
    if (h.id === id || !h.header) continue;
    const at = region_of(graph, h.id);
    if (!at) continue;
    const row = heads(graph, h.id, "row")
             && along(me.r, me.rows, at.r, at.rows) && me.c >= at.c;
    /** Symmetric; column headers always sit in row 0. */
    const col = heads(graph, h.id, "col")
             && along(me.c, me.cols, at.c, at.cols) && me.r >= at.r;
    if (row || col) out.push(h);
  }
  return out;
}

/** The blocks a block is allocated to. **Both holder shapes answer**: a grid allocates through
 *  its headers, and any holder allocates through the block it stands for — its `of` — so a table
 *  standing for a section puts every cell of it under that section. */
export function allocations_of(graph: Graph, id: Id): Block[] {
  const out = headers_over(graph, id);
  for (const h of holders_over(graph, id)) {
    const stood = h.of ? graph.blocks[h.of] : undefined;
    if (stood && stood.id !== id && !out.some((b) => b.id === stood.id)) out.push(stood);
  }
  return out;
}

/** Everything allocated to this block, whichever way it was allocated. */
export function allocated_to(graph: Graph, id: Id): Block[] {
  return Object.values(graph.blocks)
    .filter((b) => b.id !== id && allocations_of(graph, b.id).some((h) => h.id === id))
    .sort(by_order);
}
