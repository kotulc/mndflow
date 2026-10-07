/** Holders: folders, groups and grids, what each draws, cells, merges, headers and allocation. */

import { allows_of, permits } from "./capabilities";
import { base_of, setting_of } from "./defs";
import { children, stands_for } from "./tree";
import type { Block, Cell, Graph, Grid, HeaderRole, Id, Shape, Span } from "./types";


/** The extent a grid draws where it has not said one. */
export const GRID: Grid = { rows: 2, cols: 2 };

/** What a new grid is made with: two by two, under a header row and a header column. */
export const HEADED: Grid = { rows: 3, cols: 3, head: { top: true, left: true } };

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

/** Which holder with a shape a block is, or null: what its traits say — `matrix` for a grid,
 *  `inline` for a group. **A definition always draws as a card**, so it is never one, whatever it
 *  extends. */
export function shape_of(graph: Graph, id: Id | undefined): Shape | null {
  const b = id ? graph.blocks[id] : undefined;
  if (!b || b.def || b.of || b.side !== undefined) return null;
  const said = setting_of(graph, b.id, "holder");
  return said["matrix"] === true ? "grid" : said["inline"] === true ? "group" : null;
}

/** Whether this is a grid — a region with an extent and cells to seat in. */
export function is_grid(graph: Graph, id: Id | undefined): boolean {
  return shape_of(graph, id) === "grid";
}

/** Whether this is a boundary — a rim round what it holds. */
export function is_group(graph: Graph, id: Id | undefined): boolean {
  return shape_of(graph, id) === "group";
}

/** Whether a group is a block flattened by a view: drawn as a box of what it holds, but still
 *  what it is — a folder or a block — rather than a group somebody made. */
export function is_flat(graph: Graph, id: Id | undefined): boolean {
  return is_group(graph, id) && setting_of(graph, id, "holder")["flat"] === true;
}

/** Whether this is a group or a grid. */
export function is_holder(graph: Graph, id: Id | undefined): boolean {
  return shape_of(graph, id) !== null;
}

/** Whether a block is a folder: a holder that hides what it holds. */
export function is_folder(graph: Graph, id: Id | undefined): boolean {
  const b = id ? graph.blocks[id] : undefined;
  return !!b && !b.def && base_of(graph, b.id) === "folder";
}

/** Whether a block organizes: a folder, a group or a grid. */
export function organizes(graph: Graph, id: Id | undefined): boolean {
  return is_holder(graph, id) || is_folder(graph, id);
}

/** Whether a block draws what it holds on the layer it sits on, rather than behind its card: a
 *  group, and a grid only where a view flattens it. Flattened, a folder does too. */
export function inline(graph: Graph, id: Id | undefined, flat = false): boolean {
  if (is_group(graph, id)) return true;
  if (is_grid(graph, id)) return setting_of(graph, id, "holder")["flat"] === true;
  return flat && is_folder(graph, id);
}

/** The layer a block draws on: its nearest ancestor that hides what it holds. */
export function layer_of(graph: Graph, id: Id, flat = false): Id | null {
  let at = graph.blocks[id]?.parent ?? null;
  const seen = new Set<Id>();
  while (at && !seen.has(at) && inline(graph, at, flat)) {
    seen.add(at);
    at = graph.blocks[at]?.parent ?? null;
  }
  return at;
}

/** Every block a layer draws, in reading order: what it holds, and what its inline holders hold,
 *  however deep. Flattened, folders draw what they hold too. */
export function drawn_in(graph: Graph, layer: Id | null, flat = false): Block[] {
  const out: Block[] = [];
  const seen = new Set<Id>();
  const walk = (parent: Id | null) => {
    for (const b of children(graph, parent)) {
      if (seen.has(b.id)) continue;
      seen.add(b.id);
      out.push(b);
      if (inline(graph, b.id, flat)) walk(b.id);
    }
  };
  walk(layer);
  return out;
}

/** A grid's lattice, with the default extent where it said none; null where it is not a grid. */
export function lattice_of(graph: Graph, id: Id | undefined): Grid | null {
  if (!id || !is_grid(graph, id)) return null;
  return { ...GRID, ...graph.blocks[id]!.grid };
}

/** Every holder drawn inline in one layer, in a stable order. */
export function holders_in(graph: Graph, layer: Id | null, flat = false): Block[] {
  return drawn_in(graph, layer, flat).filter((b) => inline(graph, b.id, flat));
}

/** The group or grid a block sits in, or null. */
export function grid_of(graph: Graph, id: Id): Block | null {
  const at = graph.blocks[id]?.parent;
  return at && is_holder(graph, at) ? graph.blocks[at]! : null;
}

/** Where a block sits in its grid, or null. */
export function cell_of(graph: Graph, id: Id): Cell | null {
  const b = graph.blocks[id];
  return b?.cell && is_grid(graph, b.parent ?? undefined) ? { ...b.cell } : null;
}

/** The groups and grids enclosing a block, nearest first. */
export function holders_over(graph: Graph, id: Id): Block[] {
  const out: Block[] = [];
  const seen = new Set<Id>([id]);
  let at = graph.blocks[id]?.parent;
  while (at && !seen.has(at) && is_holder(graph, at)) {
    seen.add(at);
    out.push(graph.blocks[at]!);
    at = graph.blocks[at]!.parent;
  }
  return out;
}

/** How many holders drawn inline enclose a block — zero for one sitting on the layer. */
export function group_depth(graph: Graph, id: Id): number {
  let n = 0;
  const seen = new Set<Id>([id]);
  for (let at = graph.blocks[id]?.parent; at && !seen.has(at) && inline(graph, at);
       at = graph.blocks[at]?.parent) {
    seen.add(at);
    n++;
  }
  return n;
}

/** The block heading what holds it: its first, where the holder's definition says what may head
 *  it and that block is one. A head is never stored: it is whichever block comes first. */
export function group_head(graph: Graph, group: Id | undefined): Id | null {
  const heads = group ? allows_of(graph, group).heads : undefined;
  const first = group ? children(graph, group).find((b) => b.side === undefined) : undefined;
  return first && permits(graph, heads, first.type) ? first.id : null;
}

/** The group a block heads, where it heads one. */
export function headed_group(graph: Graph, id: Id): Id | null {
  const group = graph.blocks[id]?.parent;
  return group && group_head(graph, group) === id ? group : null;
}

/** Everything a group or grid holds, in order. */
export function members_of(graph: Graph, group: Id): Block[] {
  if (!is_holder(graph, group)) return [];
  return children(graph, group).filter((b) => b.side === undefined);
}

/** Whether `holder` may take `id`: a group or grid, not itself, and not a cycle. Any block may
 *  sit in a group or a cell; what it may be is its settings' to say. */
export function can_hold(graph: Graph, holder: Id, id: Id): boolean {
  const h = graph.blocks[holder];
  const b = graph.blocks[id];
  if (!h || !b || holder === id || !is_holder(graph, holder)) return false;
  for (let at: Id | null | undefined = holder; at; at = graph.blocks[at]?.parent) {
    if (at === id) return false;
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
  const g = lattice_of(graph, b?.parent ?? undefined);
  return g && b?.cell ? heading(g, b.cell.r, b.cell.c) : null;
}

/** Whether a block heads a line of its grid. */
export function is_header(graph: Graph, id: Id): boolean {
  return head_of(graph, id) !== null;
}

/** The region a seated block occupies: the merge covering its address, or its one cell. */
export function region_of(graph: Graph, id: Id): Span | null {
  const b = graph.blocks[id];
  if (!b?.cell || !is_grid(graph, b.parent ?? undefined)) return null;
  return merge_at(graph, b.parent!, b.cell.r, b.cell.c) ?? { ...b.cell, rows: 1, cols: 1 };
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
  for (const h of members_of(graph, graph.blocks[id]!.parent!)) {
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
