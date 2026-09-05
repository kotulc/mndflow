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
         type Block, type Graph, type Id, type Point } from "@mnd/core";
import { cell_box, centred_in, gridded, on_unit, size_of, snap,
         GAP, UNIT, type Size } from "./size";

export type Placed = { id: Id; x: number; y: number; w: number; h: number };

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
  const spots = ordered(how === "grid" ? settled(sized) : free(sized));
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
 *  **One measure, so one rounding.** A card, a note and a grid all land on the
 *  same lattice — there is no coarser lattice for a grid to be quantised to,
 *  which is what used to stop one being nudged. */
function put(at: { x: number; y: number }) {
  return { x: snap(at.x), y: snap(at.y) };
}

function free(all: Sized[]): Placed[] {
  const out: Placed[] = [];
  const loose: Sized[] = [];
  for (const it of all) {
    if (it.b.x !== undefined && it.b.y !== undefined) {
      out.push({ id: it.b.id, ...put({ x: it.b.x, y: it.b.y }), ...it.s });
    } else loose.push(it);
  }
  const below = out.length ? Math.max(...out.map((p) => p.y + p.h)) + GAP : 0;
  let x = 0;
  for (const it of loose) {
    out.push({ id: it.b.id, ...put({ x, y: below }), ...it.s });
    x += it.s.w + GAP;
  }
  return out;
}

/** Everything where its own position says, rounded onto the lattice and pushed
 *  clear of whatever is already there.
 *
 *  **A gap between any two things, and the gap is a unit.** Nothing is
 *  quantised to anything bigger: a card, a note and a grid all round to the
 *  same lines and all keep the same distance from their neighbours. Taken in
 *  the order the layer states them, so the same graph always resolves the same
 *  way.
 *
 *  A block nobody has placed starts at the origin and is pushed out from
 *  there, which for a card made on empty ground is where it was made. */
function settled(all: Sized[]): Placed[] {
  const out: Placed[] = [];
  for (const it of all) {
    const at = on_unit(it.b.x !== undefined && it.b.y !== undefined
      ? { x: it.b.x, y: it.b.y } : { x: 0, y: 0 });
    out.push({ id: it.b.id, ...clear_at(out, at, it.s) });
  }
  return out;
}

/** The nearest place to `at` where a box of this size stands a gap clear of
 *  everything already placed. Steps outward a unit at a time, so the answer is
 *  the closest there is. */
function clear_at(taken: readonly Rect[], at: Point, s: Size): Rect {
  const free_at = (x: number, y: number) => !taken.some((t) =>
    x < t.x + t.w + GAP && t.x < x + s.w + GAP
    && y < t.y + t.h + GAP && t.y < y + s.h + GAP);
  for (let ring = 0; ring <= RINGS; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = at.x + dx * UNIT;
        const y = at.y + dy * UNIT;
        if (free_at(x, y)) return { x, y, ...s };
      }
    }
  }
  return { ...at, ...s };
}

/** **The tidy**: everything laid out in rows, left to right, a gap between
 *  each and between the rows.
 *
 *  In the order the layer states its blocks — the plainest reading there is,
 *  and the one a page already teaches. The rows are kept about as wide as the
 *  whole is tall, so a layer of twenty cards is a block of them rather than a
 *  line twenty long.
 *
 *  **Everything is a whole number of units from everything else**, including
 *  the row it starts. Nothing here knows what a cell is: a grid is simply a
 *  wide, tall thing, and it is spaced from its neighbour exactly as a card is.
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
  return shelved(sized).map((p) => ({ id: p.id, x: p.x, y: p.y }));
}

function shelved(all: Sized[]): Placed[] {
  if (!all.length) return [];
  /** About as wide as it is tall, and never narrower than the widest thing. */
  const area = all.reduce((n, it) => n + (it.s.w + GAP) * (it.s.h + GAP), 0);
  const want = Math.max(...all.map((it) => it.s.w), Math.sqrt(area));
  const out: Placed[] = [];
  let x = 0;
  let y = 0;
  let tall = 0;
  for (const it of all) {
    if (x > 0 && x + it.s.w > want) { x = 0; y += tall + GAP; tall = 0; }
    out.push({ id: it.b.id, x, y, ...it.s });
    x += it.s.w + GAP;
    tall = Math.max(tall, it.s.h);
  }
  /** Centred on the origin **by whole units**, so what was just laid out on the
   *  lattice stays on it. */
  const right = Math.max(...out.map((p) => p.x + p.w));
  const bottom = Math.max(...out.map((p) => p.y + p.h));
  const off = { x: -Math.round(right / 2 / UNIT) * UNIT, y: -Math.round(bottom / 2 / UNIT) * UNIT };
  return out.map((p) => ({ ...p, x: p.x + off.x, y: p.y + off.y }));
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
  return { w: w + GAP * 2, h: h + GAP * 2 };
}

/** A boundary is its members' bounds plus a cell of air — its size is a fact
 *  about what it holds, never something stored. */
export function boundary(spots: readonly Placed[], members: readonly Id[]): Placed | null {
  const inside = spots.filter((p) => members.includes(p.id));
  if (inside.length === 0) return null;
  const x = Math.min(...inside.map((p) => p.x)) - GAP;
  const y = Math.min(...inside.map((p) => p.y)) - GAP;
  const w = Math.max(...inside.map((p) => p.x + p.w)) + GAP - x;
  const h = Math.max(...inside.map((p) => p.y + p.h)) + GAP - y;
  return { id: "", x, y, w, h };
}
