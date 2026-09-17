/** Groups and grids: membership, cells, merges, headers and allocation. */

import { module_of } from "./defs";
import type { Block, Cell, Graph, HeaderRole, Id, Span } from "./types";


/** Whether two spans cover any cell in common. */
export function overlaps(a: Span, b: Span): boolean {
  return a.r < b.r + b.rows && b.r < a.r + a.rows
      && a.c < b.c + b.cols && b.c < a.c + a.cols;
}

/** Whether a span covers this address. */
export function covers(s: Span, r: number, c: number): boolean {
  return r >= s.r && r < s.r + s.rows && c >= s.c && c < s.c + s.cols;
}

/** Whether a block is a grid — a region with an extent and cells to seat in. */
export function is_grid(graph: Graph, id: Id): boolean {
  return module_of(graph, id) === "grid";
}

/** Whether a block is a boundary — a dashed rim round its members. */
export function is_group(graph: Graph, id: Id): boolean {
  return module_of(graph, id) === "group";
}

/** Whether a block holds others, either way. */
export function is_holder(graph: Graph, id: Id): boolean {
  const m = module_of(graph, id);
  return m === "grid" || m === "group";
}

/** The group a block sits in, or null. */
export function grid_of(graph: Graph, id: Id): Block | null {
  const held = graph.blocks[id]?.group;
  return (held ? graph.blocks[held] : undefined) ?? null;
}

/** Where a block sits in its group, or null. */
export function cell_of(graph: Graph, id: Id): Cell | null {
  const b = graph.blocks[id];
  return b?.group && b.cell ? { ...b.cell } : null;
}

/** How many groups enclose a block — zero for one sitting on the layer. */
export function group_depth(graph: Graph, id: Id): number {
  let depth = 0;
  let at = graph.blocks[id]?.group;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    depth++;
    at = graph.blocks[at]?.group;
  }
  return depth;
}

/** Everything a group holds, in the layer's stable order. */
export function members_of(graph: Graph, group: Id): Block[] {
  return Object.values(graph.blocks)
    .filter((b) => b.group === group)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
}

/** Whether `holder` may contain `id` — not itself and not a cycle. */
export function can_hold(graph: Graph, holder: Id, id: Id,
                        held?: ReadonlyMap<Id, Id | undefined>): boolean {
  const g = graph.blocks[holder];
  if (!g || !is_holder(graph, holder)) return false;
  if (holder === id) return false;
  if (is_grid(graph, holder) && is_holder(graph, id)) return false;
  const map = held ?? new Map(Object.values(graph.blocks).map((b) => [b.id, b.group]));
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
  return graph.blocks[group]?.merges?.find((s) => covers(s, r, c)) ?? null;
}

/** What sits at this address; a merge answers at every address it covers. */
export function at_cell(graph: Graph, group: Id, r: number, c: number): Block | null {
  const span = merge_at(graph, group, r, c);
  const want = span ? { r: span.r, c: span.c } : { r, c };
  return members_of(graph, group)
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

/** The headers a block is allocated to: the one heading its row, its column, or both. */
export function allocations_of(graph: Graph, id: Id): Block[] {
  const me = region_of(graph, id);
  const group = graph.blocks[id]?.group;
  if (!me || !group) return [];
  const out: Block[] = [];
  for (const h of members_of(graph, group)) {
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

/** Everything allocated to this header. */
export function allocated_to(graph: Graph, id: Id): Block[] {
  const group = graph.blocks[id]?.group;
  if (!group || !graph.blocks[id]?.header) return [];
  return members_of(graph, group)
    .filter((b) => b.id !== id && allocations_of(graph, b.id).some((h) => h.id === id));
}
