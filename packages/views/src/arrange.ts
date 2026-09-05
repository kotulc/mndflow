/** Where everything in a layer sits.
 *
 *  One setting, two values, and **both of them are hand placement** — what
 *  differs is what the hand lands on. `free` rounds a drop to the fine grid;
 *  `grid` rounds it to the nearest cell of the layer's lattice, and to the
 *  nearest *free* one where the cell it wanted is taken.
 *
 *  **The tidy is the button, not the mode.** Asking for `grid` lays the layer
 *  out tight and writes where everything went, once; from then on the mode only
 *  constrains where a drop may land. A mode that recomputed every fold could
 *  not be moved about at all — every drag sprang back, because there was
 *  nowhere for the answer to live.
 *
 *  **The lattice is the layer's, not a group's.** A cell is the same size
 *  wherever it is, measured from the layer's origin, so a block the layer
 *  placed and a block seated in a group land on the same lines — which is what
 *  lets the backdrop draw them once for both.
 *
 *  **The four directional values are gone.** They ranked by relationships
 *  through dagre, which drew a picture of the graph rather than of the model —
 *  and the reading directions they carried were a setting nobody set. */

import { arrangement_of, children, is_grid, is_interface, members_of, module_of,
         type Block, type Graph, type Id } from "@mnd/core";
import { cell_box, centred_in, gridded, grid_snap, lattice_box, size_of, snap, span_of,
         CELL, UNIT, UNITS, type Size } from "./size";

export type Placed = { id: Id; x: number; y: number; w: number; h: number };

/** Tight inside a unit, open between them — what matters is the contrast.
 *
 *  `member` is how far a boundary reaches past what it holds. **A full cell,
 *  not half of one**: hugged tighter than the gap a card leaves for its own
 *  border, the band read as a box drawn *on* its members rather than round
 *  them, and there was nowhere on it to point at that was not a card. */
export const GAP = { unit: UNITS.gap * 2 * UNIT, member: UNITS.gap * UNIT };

/** Every block drawn in this layer, placed. Interfaces are seated on their
 *  owner rather than laid out, so they are not here. */
export function laid(graph: Graph, layer: Id | null): Placed[] {
  const units = children(graph, layer).filter((b) => !is_interface(b));
  if (units.length === 0) return [];
  /** **Two sorts of thing take no part in the arrangement.** A block with a
   *  cell is placed by its address, the same way a seated interface is — what
   *  places it is the grid it is in, once that grid has been placed. And a band
   *  has no place of its own at all: it is drawn round its members, so it
   *  claims no cell and is worked out once they are down. */
  const loose = units.filter((b) => !gridded(graph, b.id) && !is_band(graph, b));
  const how = arrangement_of(graph, layer);
  /** **The order the layer states them in.** `num` is a block's place among its
   *  siblings, so re-ordering in the tree re-orders the grid — and the same
   *  graph always tiles the same way. */
  const sized = [...loose]
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id))
    .map((b) => ({ b, s: size_of(graph, b.id) }));
  /** **Hand placement is never re-centred.** `grid` works out positions from
   *  nothing and grows outward from the origin. `free` was already told where
   *  each card goes — and shifting the whole layer to keep its bounds centred
   *  moved every card a little every time any one of them was dropped, so
   *  nothing ever landed where it was let go of and a card made where you
   *  pointed appeared somewhere else. */
  const spots = ordered(how === "grid" ? celled_at(sized) : free(sized));
  const inside = [...spots, ...celled(graph, units, spots)];
  return ordered([...inside, ...banded(graph, units, inside)]);
}

/** Whether a group is a band rather than a grid: members and no extent. */
function is_band(graph: Graph, b: Block): boolean {
  return module_of(graph, b.id) === "group" && !is_grid(b);
}

/** Every band, as the bounds of what it holds.
 *
 *  **Worked out here rather than left to whoever draws it.** A band's size is a
 *  fact about its members, so it cannot be arranged and it cannot be stored —
 *  and given a cell of its own in a tiling it took one, leaving a hole in the
 *  square with the band drawn somewhere else entirely. */
function banded(graph: Graph, units: readonly Block[], spots: readonly Placed[]): Placed[] {
  const out: Placed[] = [];
  for (const b of units) {
    if (!is_band(graph, b)) continue;
    const box = boundary(spots, members_of(graph, b.id).map((m) => m.id));
    if (box) out.push({ ...box, id: b.id });
  }
  return out;
}

/** Every gridded member, placed by its address inside the grid holding it.
 *
 *  **Once the grid is placed, and never before** — the address says where in
 *  the grid, and where the grid sits is the layer's answer. A block centres in
 *  the cell it was given, because blocks never resize. */
function celled(graph: Graph, units: readonly Block[], spots: readonly Placed[]): Placed[] {
  const at = new Map(spots.map((p) => [p.id, p]));
  const out: Placed[] = [];
  for (const b of units) {
    if (!gridded(graph, b.id)) continue;
    const grid = at.get(b.group!);
    if (!grid) continue;
    const box = cell_box(graph.blocks[b.group!]!, b.cell!.r, b.cell!.c);
    const in_cell = centred_in(box, size_of(graph, b.id));
    /** **Never re-snapped.** The address already places it exactly, and
     *  rounding to the nearest grid step is what pushed a centred block into
     *  the corner of its own cell. */
    out.push({ id: b.id, x: grid.x + in_cell.x, y: grid.y + in_cell.y,
               w: in_cell.w, h: in_cell.h });
  }
  return out;
}

/** The one order a layer is ever stated in, so the same graph draws the same
 *  picture whatever placed it. */
function ordered(spots: Placed[]): Placed[] {
  return spots.sort((a, b) => a.id.localeCompare(b.id));
}

type Sized = { b: Block; s: Size };

/** Hand placement is what draws; anything unplaced fills the room around it.
 *
 *  **What a thing is rounded to is what it is measured in.** A card lands on the
 *  backdrop dots, which is what a drag has always snapped to. **A grid lands on
 *  the layer's lattice**, because its cells *are* that lattice — rounded to the
 *  nearest dot instead, every grid came to rest half a dot off every line the
 *  canvas draws, and every cell in it with it. */
function put(b: Block, at: { x: number; y: number }) {
  return is_grid(b) ? grid_snap(at) : { x: snap(at.x), y: snap(at.y) };
}

function free(all: Sized[]): Placed[] {
  const out: Placed[] = [];
  const loose: Sized[] = [];
  for (const it of all) {
    if (it.b.x !== undefined && it.b.y !== undefined) {
      out.push({ id: it.b.id, ...put(it.b, { x: it.b.x, y: it.b.y }), ...it.s });
    } else loose.push(it);
  }
  const below = out.length ? Math.max(...out.map((p) => p.y + p.h)) + GAP.unit : 0;
  let x = 0;
  for (const it of loose) {
    out.push({ id: it.b.id, ...put(it.b, { x, y: below }), ...it.s });
    x += it.s.w + GAP.unit;
  }
  return out;
}

/** **The tidy**: everything packed into a tight square of cells, in the order
 *  the layer states its blocks.
 *
 *  Left to right, then a new row — the plainest reading there is, and the one a
 *  page already teaches. The square grows with the count rather than running
 *  off one edge, so a layer of twenty cards is five by four and not a line
 *  twenty long. A card bigger than one cell claims as many as it needs and the
 *  next one steps over it.
 *
 *  **This is what the button does, and nothing else calls it.** Its answer is
 *  written to the graph as ordinary placements — which is what lets everything
 *  afterwards be moved by hand. */
export function tidy(graph: Graph, layer: Id | null): { id: Id; x: number; y: number }[] {
  const units = children(graph, layer)
    .filter((b) => !is_interface(b) && !gridded(graph, b.id) && !is_band(graph, b));
  const sized = [...units]
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id))
    .map((b) => ({ b, s: size_of(graph, b.id) }));
  return packed(sized).map((p) => ({ id: p.id, x: p.x, y: p.y }));
}

/** Everything where its own position says, rounded to a cell.
 *
 *  **The nearest free one.** A cell holds one thing — that is the whole of what
 *  a grid arrangement buys — so where two land on the same address the second
 *  steps outward to the nearest address that fits it. Taken in the order the
 *  layer states them, so the same graph always resolves the same way.
 *
 *  A block nobody has placed goes wherever the search first finds room, which
 *  for a card made on empty ground is the cell it was made in. */
function celled_at(all: Sized[]): Placed[] {
  const taken = new Set<string>();
  const out: Placed[] = [];
  for (const it of all) {
    const at = it.b.x !== undefined && it.b.y !== undefined
      ? { x: it.b.x, y: it.b.y } : { x: 0, y: 0 };
    const span = span_of(it.s);
    /** The address whose span this thing, centred, sits nearest to. */
    const want = {
      c: Math.round((at.x + it.s.w / 2 - (span.cols * CELL.w) / 2) / CELL.w),
      r: Math.round((at.y + it.s.h / 2 - (span.rows * CELL.h) / 2) / CELL.h),
    };
    const seat = nearest_free(taken, want, span);
    claim(taken, seat, span);
    out.push({ id: it.b.id,
               ...centred_in(lattice_box(seat.r, seat.c, span.rows, span.cols), it.s) });
  }
  return out;
}

/** The address nearest the one asked for with room for a span of this size.
 *  Steps outward a ring at a time, so the answer is the closest there is. */
function nearest_free(taken: ReadonlySet<string>, want: { r: number; c: number },
                      span: { rows: number; cols: number }): { r: number; c: number } {
  const fits = (r: number, c: number) => {
    for (let dr = 0; dr < span.rows; dr++) {
      for (let dc = 0; dc < span.cols; dc++) if (taken.has(`${r + dr},${c + dc}`)) return false;
    }
    return true;
  };
  for (let ring = 0; ring <= RINGS; ring++) {
    for (let dr = -ring; dr <= ring; dr++) {
      for (let dc = -ring; dc <= ring; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== ring) continue;
        if (fits(want.r + dr, want.c + dc)) return { r: want.r + dr, c: want.c + dc };
      }
    }
  }
  return want;
}

function claim(taken: Set<string>, at: { r: number; c: number },
               span: { rows: number; cols: number }) {
  for (let dr = 0; dr < span.rows; dr++) {
    for (let dc = 0; dc < span.cols; dc++) taken.add(`${at.r + dr},${at.c + dc}`);
  }
}

/** The tight square itself: first fit, row by row, centred on the origin by
 *  whole cells. **Half a cell would put the whole layer off the lattice** it
 *  was just packed into, which is the one thing this is for. */
function packed(all: Sized[]): Placed[] {
  const spans = all.map((it) => ({ ...it, at: span_of(it.s) }));
  const cols = Math.max(1, Math.ceil(Math.sqrt(
    spans.reduce((n, it) => n + it.at.rows * it.at.cols, 0))));
  const taken = new Set<string>();
  const wide = Math.max(cols, ...spans.map((it) => it.at.cols), 1);
  const seats: { id: Id; s: Size; r: number; c: number; rows: number; cols: number }[] = [];
  let rows = 0;
  for (const it of spans) {
    let r = 0;
    let c = 0;
    while (c + it.at.cols > wide || !free_span(taken, r, c, it.at)) {
      c += 1;
      if (c + it.at.cols > wide) { c = 0; r += 1; }
    }
    claim(taken, { r, c }, it.at);
    rows = Math.max(rows, r + it.at.rows);
    seats.push({ id: it.b.id, s: it.s, r, c, ...it.at });
  }
  const off = { r: -Math.floor(rows / 2), c: -Math.floor(wide / 2) };
  return seats.map((t) => ({
    id: t.id,
    ...centred_in(lattice_box(t.r + off.r, t.c + off.c, t.rows, t.cols), t.s),
  }));
}

function free_span(taken: ReadonlySet<string>, r: number, c: number,
                   span: { rows: number; cols: number }): boolean {
  for (let dr = 0; dr < span.rows; dr++) {
    for (let dc = 0; dc < span.cols; dc++) if (taken.has(`${r + dr},${c + dc}`)) return false;
  }
  return true;
}

/** Positions are relative to the layer's centre, so a layer stays centred as it
 *  grows in any direction. Exported because anything that places has to end
 *  the same way — a reading included. */
export function centred(spots: Placed[]): Placed[] {
  if (spots.length === 0) return spots;
  const left = Math.min(...spots.map((p) => p.x));
  const top = Math.min(...spots.map((p) => p.y));
  const right = Math.max(...spots.map((p) => p.x + p.w));
  const bottom = Math.max(...spots.map((p) => p.y + p.h));
  const dx = snap(-(left + right) / 2);
  const dy = snap(-(top + bottom) / 2);
  return ordered(spots.map((p) => ({ ...p, x: p.x + dx || 0, y: p.y + dy || 0 })));
}

/** Somewhere near `at` a new box of this size can go without landing on
 *  anything already drawn.
 *
 *  **Where you pointed, or the nearest grid step that is free.** A card made on
 *  what looks like empty ground is 168 wide, so aiming just clear of a
 *  neighbour still buried it — and two made in the same place stacked exactly.
 *  Steps outward a cell at a time and takes the first spot that is clear,
 *  which is nearly always the one you asked for. */
export function clear_of(taken: readonly Rect[], at: { x: number; y: number },
                         size: Size): { x: number; y: number } {
  const free_at = (x: number, y: number) => !taken.some((t) =>
    x < t.x + t.w && t.x < x + size.w && y < t.y + t.h && t.y < y + size.h);
  const x0 = snap(at.x);
  const y0 = snap(at.y);
  for (let ring = 0; ring <= RINGS; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = x0 + dx * UNIT;
        const y = y0 + dy * UNIT;
        if (free_at(x, y)) return { x, y };
      }
    }
  }
  return { x: x0, y: y0 };
}

/** How far the search for a clear spot reaches, in cells. Past this the layer
 *  is full enough that anywhere is as good as anywhere. */
const RINGS = 16;

type Rect = { x: number; y: number; w: number; h: number };

/** What the whole layer takes up, plus the room a new thing needs.
 *
 *  Positions are centred on the origin, so what is needed is twice the furthest
 *  **edge** from it. Twice the furthest corner plus its own width counts the
 *  same box twice and leaves a layer drawn at a third of the size it could be. */
export function bounds(spots: readonly Placed[]): { w: number; h: number } {
  if (spots.length === 0) return { w: UNIT * 16, h: UNIT * 10 };
  const reach = (a: number, b: number) => Math.max(Math.abs(a), Math.abs(b));
  const w = Math.max(...spots.map((p) => reach(p.x, p.x + p.w))) * 2;
  const h = Math.max(...spots.map((p) => reach(p.y, p.y + p.h))) * 2;
  return { w: w + GAP.unit * 2, h: h + GAP.unit * 2 };
}

/** A boundary is its members' bounds plus a cell of air — its size is a fact
 *  about what it holds, never something stored. */
export function boundary(spots: readonly Placed[], members: readonly Id[]): Placed | null {
  const inside = spots.filter((p) => members.includes(p.id));
  if (inside.length === 0) return null;
  const x = Math.min(...inside.map((p) => p.x)) - GAP.member;
  const y = Math.min(...inside.map((p) => p.y)) - GAP.member;
  const w = Math.max(...inside.map((p) => p.x + p.w)) + GAP.member - x;
  const h = Math.max(...inside.map((p) => p.y + p.h)) + GAP.member - y;
  return { id: "", x, y, w, h };
}
