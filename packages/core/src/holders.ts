/** Groups and grids: which blocks hold, membership, cells, merges, headers and allocation. */

import { allows_of, permits } from "./capabilities";
import { children, stands_for } from "./tree";
import type { Block, Cell, Graph, Grid, HeaderRole, Id, Shape, Span } from "./types";


/** The extent a grid draws where it has not said one. */
export const GRID: Grid = { rows: 2, cols: 2 };

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

/** Which holder a block is, or null: what its definition's capability says. */
export function shape_of(graph: Graph, id: Id | undefined): Shape | null {
  if (!id || !graph.blocks[id]) return null;
  const said = allows_of(graph, id).holder;
  return said === "group" || said === "grid" ? said : null;
}

/** Whether this is a grid — a region with an extent and cells to seat in. */
export function is_grid(graph: Graph, id: Id | undefined): boolean {
  return shape_of(graph, id) === "grid";
}

/** Whether this is a boundary — a dashed rim round its members. */
export function is_group(graph: Graph, id: Id | undefined): boolean {
  return shape_of(graph, id) === "group";
}

/** Whether this holds blocks, either way. */
export function is_holder(graph: Graph, id: Id | undefined): boolean {
  return shape_of(graph, id) !== null;
}

/** A grid's lattice, with the default extent where it said none; null where it is not a grid. */
export function lattice_of(graph: Graph, id: Id | undefined): Grid | null {
  if (!id || !is_grid(graph, id)) return null;
  return { ...GRID, ...graph.blocks[id]!.grid };
}

/** Every holder drawn in one layer, in a stable order. */
export function holders_in(graph: Graph, layer: Id | null): Block[] {
  return children(graph, layer).filter((b) => is_holder(graph, b.id));
}

/** The holder a block sits in, or null — a dormant membership, in a block that no longer holds,
 *  answers nothing. */
export function grid_of(graph: Graph, id: Id): Block | null {
  const at = graph.blocks[id]?.group;
  return at && is_holder(graph, at) ? graph.blocks[at]! : null;
}

/** Where a block sits in its grid, or null. */
export function cell_of(graph: Graph, id: Id): Cell | null {
  const b = graph.blocks[id];
  return b?.cell && is_grid(graph, b.group) ? { ...b.cell } : null;
}

/** The holders enclosing a block, nearest first. */
export function holders_over(graph: Graph, id: Id): Block[] {
  const out: Block[] = [];
  const seen = new Set<Id>([id]);
  let at = graph.blocks[id]?.group;
  while (at && !seen.has(at) && is_holder(graph, at)) {
    seen.add(at);
    out.push(graph.blocks[at]!);
    at = graph.blocks[at]!.group;
  }
  return out;
}

/** How many holders enclose a block — zero for one sitting on the layer. */
export function group_depth(graph: Graph, id: Id): number {
  return holders_over(graph, id).length;
}

/** The member heading a group: its first, where the group's definition says what may head it and
 *  that member is one. A head is never stored: it is whichever member comes first. */
export function group_head(graph: Graph, group: Id | undefined): Id | null {
  const heads = group && is_group(graph, group) ? allows_of(graph, group).heads : undefined;
  const first = heads === undefined ? undefined : members_of(graph, group!)[0];
  return first && permits(graph, heads, first.type) ? first.id : null;
}

/** The group a block heads, where it heads one. */
export function headed_group(graph: Graph, id: Id): Id | null {
  const group = graph.blocks[id]?.group;
  return group && group_head(graph, group) === id ? group : null;
}

/** Everything a holder holds, in the layer's stable order. */
export function members_of(graph: Graph, group: Id): Block[] {
  if (!is_holder(graph, group)) return [];
  return Object.values(graph.blocks)
    .filter((b) => b.group === group && b.id !== group)
    .sort(by_order);
}

/** Whether `holder` may contain `id`: on the same layer, not itself and not a cycle. **Only a group
 *  nests**: a group may sit in a group, and a grid sits in nothing and seats no holder. */
export function can_hold(graph: Graph, holder: Id, id: Id): boolean {
  const h = graph.blocks[holder];
  const b = graph.blocks[id];
  if (!h || !b || holder === id || !is_holder(graph, holder)) return false;
  if (h.parent !== b.parent) return false;
  const shape = shape_of(graph, id);
  if (shape && (shape === "grid" || !is_group(graph, holder))) return false;
  let at: Id | undefined = holder;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    if (at === id) return false;
    seen.add(at);
    at = graph.blocks[at]?.group;
  }
  return true;
}

/** The span covering this address, or null. */
export function merge_at(graph: Graph, group: Id, r: number, c: number): Span | null {
  return lattice_of(graph, group)?.merges?.find((s) => covers(s, r, c)) ?? null;
}

/** What sits at this address; a merge answers at every address it covers. */
export function at_cell(graph: Graph, group: Id, r: number, c: number): Block | null {
  const span = merge_at(graph, group, r, c);
  const want = span ? { r: span.r, c: span.c } : { r, c };
  return members_of(graph, group)
    .find((b) => b.cell?.r === want.r && b.cell?.c === want.c) ?? null;
}

/** Which line a cell of this lattice heads, or null: the top row heads columns, the left column
 *  heads rows, and the corner both. */
export function heading(g: Grid, r: number, c: number): HeaderRole | null {
  const top = !!g.head?.top && r === 0;
  const left = !!g.head?.left && c === 0;
  return top && left ? "both" : top ? "col" : left ? "row" : null;
}

/** Whether an address lies inside a lattice's extent. */
export function inside(g: Grid, at: Cell): boolean {
  return at.r >= 0 && at.c >= 0 && at.r < g.rows && at.c < g.cols;
}

/** Whether a span stays on one side of the header lines, as a merge must. */
export function one_side(g: Grid, s: Span): boolean {
  return heading(g, s.r, s.c) === heading(g, s.r + s.rows - 1, s.c + s.cols - 1);
}

/** Which line a seated block heads, or null where it sits in the body or nowhere. */
export function head_of(graph: Graph, id: Id): HeaderRole | null {
  const b = graph.blocks[id];
  const g = lattice_of(graph, b?.group);
  return g && b?.cell ? heading(g, b.cell.r, b.cell.c) : null;
}

/** Whether a block heads a line of its grid. */
export function is_header(graph: Graph, id: Id): boolean {
  return head_of(graph, id) !== null;
}

/** The region a seated block occupies: the merge covering its address, or its one cell. */
export function region_of(graph: Graph, id: Id): Span | null {
  const b = graph.blocks[id];
  if (!b?.cell || !is_grid(graph, b.group)) return null;
  return merge_at(graph, b.group!, b.cell.r, b.cell.c) ?? { ...b.cell, rows: 1, cols: 1 };
}

/** Whether two runs along one axis share any line. */
function along(a: number, an: number, b: number, bn: number): boolean {
  return a < b + bn && b < a + an;
}

/** The headers a body block sits under: the one heading its row, its column, or both. The corner
 *  heads the header lines themselves, never the body. */
function headers_over(graph: Graph, id: Id): Block[] {
  const me = region_of(graph, id);
  if (!me || is_header(graph, id)) return [];
  const out: Block[] = [];
  for (const h of members_of(graph, graph.blocks[id]!.group!)) {
    const role = head_of(graph, h.id);
    const at = region_of(graph, h.id);
    if (!at || role === null || role === "both") continue;
    const hit = role === "row" ? along(me.r, me.rows, at.r, at.rows)
                               : along(me.c, me.cols, at.c, at.cols);
    if (hit) out.push(h);
  }
  return out;
}

/** The blocks a block is allocated to: whatever heads its row and column — **the block a header
 *  stands for**, where it is a reference — and every holder it sits in. */
export function allocations_of(graph: Graph, id: Id): Block[] {
  const out: Block[] = [];
  const add = (b: Block | null) => {
    if (b && b.id !== id && !out.some((o) => o.id === b.id)) out.push(b);
  };
  for (const h of headers_over(graph, id)) add(stands_for(graph, h.id));
  for (const h of holders_over(graph, id)) add(h);
  return out;
}

/** Everything allocated to this block, whichever way it was allocated. */
export function allocated_to(graph: Graph, id: Id): Block[] {
  return Object.values(graph.blocks)
    .filter((b) => b.id !== id && allocations_of(graph, b.id).some((h) => h.id === id))
    .sort(by_order);
}
