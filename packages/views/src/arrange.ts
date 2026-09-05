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

import { arrangement_of, children, edges_in, is_grid, is_grid_block, is_group_block,
         is_header, is_interface, is_reference, layer_id, members_of, module_of,
         type Arrangement, type Block, type Graph, type Id, type Point } from "@mnd/core";
import { cell_box, centred_in, fills_cell, gridded, on_unit, size_of, snap,
         GAP, UNIT, type Size } from "./size";

export type Placed = { id: Id; x: number; y: number; w: number; h: number };

/** Every block drawn in this layer, placed. Interfaces are seated on their
 *  owner rather than laid out, so they are not here. */
export function laid(graph: Graph, layer: Id | null): Placed[] {
  const units = children(graph, layer).filter((b) => !is_interface(b));
  if (units.length === 0) return [];
  /** **Two sorts of thing take no part in the loose arrangement.** A block with
   *  a cell is placed by its address, the same way a seated interface is —
   *  what places it is the grid it is in, once that grid has been placed. And
   *  a block in a band is placed inside the band, once the band has been
   *  placed — the same contract a grid's members have. */
  const loose = loose_units(graph, layer);
  const how = arrangement_of(graph, layer);
  const unit = (id: Id) => loose_unit(graph, id);
  /** **Cards first, captions after.** A tied note and a reference are seated
   *  beside what they stand for once the layer they share has landed — they are
   *  not ranked into the same pass as the cards, or a collision search scatters
   *  them across the layer while the tie still says they belong together. */
  const structural = loose.filter((b) => !is_satellite(graph, layer, b));
  const satellites = loose.filter((b) => is_satellite(graph, layer, b))
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id));
  /** **Related cards first, and near what they are related to.** Tree order
   *  alone scatters a chain across the layer; neighbours in the graph are
   *  neighbours in the placement order, and each one starts its search beside
   *  whatever of its mates is already down. */
  const order = placement_order(graph, layer, structural, unit);
  const sized = order
    .map((b) => ({ b, s: is_band(graph, b) ? band_size(graph, layer, b, how) : size_of(graph, b.id) }));
  /** **Hand placement is never re-centred.** `grid` works out positions from
   *  nothing and grows outward from the origin. `free` was already told where
   *  each card goes — and shifting the whole layer to keep its bounds centred
   *  moved every card a little every time any one of them was dropped, so
   *  nothing ever landed where it was let go of and a card made where you
   *  pointed appeared somewhere else. */
  const near = (id: Id, taken: Placed[], size: Size) =>
    anchor_near(graph, layer, id, taken, unit, size);
  const placed = how === "grid" ? settled(sized, near) : free(sized);
  const structural_spots: Placed[] = how === "grid"
    ? straighten_related(graph, layer, structural, unit, placed, how)
    : placed;
  const bands = new Set(units.filter((b) => is_band(graph, b)).map((b) => b.id));
  const loose_spots = structural_spots.filter((p) => !bands.has(p.id));
  const member_spots = [...celled(graph, units, structural_spots),
                          ...band_members(graph, layer, how, units, structural_spots)];
  const laid_so_far = [...loose_spots, ...member_spots];
  const aligned = how === "grid"
    ? align_to_cells(graph, layer, laid_so_far, how) : laid_so_far;
  const satellite_spots: Placed[] = [];
  for (const b of satellites) {
    const s = size_of(graph, b.id);
    if (how === "free" && b.x !== undefined && b.y !== undefined) {
      satellite_spots.push({ id: b.id, ...put({ x: b.x, y: b.y }), ...s });
      continue;
    }
    const anchor = satellite_anchor(graph, layer, b, aligned);
    const taken = [...aligned, ...satellite_spots];
    satellite_spots.push(anchor
      ? seat_satellite(b.id, anchor, s, taken, graph, structural_spots)
      : { id: b.id, ...clear_at(taken, { x: 0, y: 0 }, s) });
  }
  const inside = [...aligned, ...satellite_spots];
  const packed = how === "grid" ? centred(inside) : inside;
  return ordered([...packed, ...banded(graph, units, packed)]);
}

/** Whether a block sits in a dashed band rather than a grid. */
function in_band(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  if (!b?.group) return false;
  return is_group_block(graph, b.group);
}

/** Whether a block is a group boundary rather than a grid. */
function is_band(graph: Graph, b: Block): boolean {
  return is_group_block(graph, b.id);
}

/** What a band takes up for spacing: its members packed tight, plus a margin.
 *
 *  **The same footprint a grid gets from its extent.** A band has no stored
 *  rows and columns, so the size is worked out from what it holds — but once
 *  worked out it is spaced from its neighbours exactly as a grid is. */
function band_size(graph: Graph, layer: Id | null, band: Block, how: Arrangement): Size {
  if (how === "grid") {
    const layout = band_layout(graph, layer, band.id, how);
    if (!layout.length) return { w: GAP * 2, h: GAP * 2 };
    const right = Math.max(...layout.map((p) => p.x + p.w));
    const bottom = Math.max(...layout.map((p) => p.y + p.h));
    return { w: right + GAP * 2, h: bottom + GAP * 2 };
  }
  const mem = band_sized(graph, layer, band.id, how);
  if (!mem.length) return { w: GAP * 2, h: GAP * 2 };
  const { w, h } = packed(mem);
  return { w: w + GAP * 2, h: h + GAP * 2 };
}

function band_sized(graph: Graph, layer: Id | null, band_id: Id, how: Arrangement): Sized[] {
  return members_of(graph, band_id)
    .filter((b) => !is_interface(b) && !gridded(graph, b.id))
    .filter((b) => !is_satellite(graph, layer, b))
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id))
    .map((b) => ({
      b,
      s: is_band(graph, b) ? band_size(graph, layer, b, how) : size_of(graph, b.id),
    }));
}

/** Edges whose endpoints both belong to a band — internal layout only. */
function band_edges(graph: Graph, layer: Id | null, band_id: Id) {
  const in_band = new Set(members_of(graph, band_id).map((b) => b.id));
  return edges_in(graph, layer).filter((e) => in_band.has(e.from) && in_band.has(e.to));
}

/** Which unit a block is for placement inside a band — members stay themselves,
 *  not collapsed to the band the way they are on the layer. */
function band_unit(graph: Graph, band_id: Id, id: Id): Id {
  const b = graph.blocks[id];
  if (!b) return id;
  if (b.group === band_id && is_band(graph, b)) return id;
  return id;
}

/** Lay out a band's members relative to its corner — same pipeline as the layer
 *  under `grid`, shelf packing under `free`. */
function band_layout(graph: Graph, layer: Id | null, band_id: Id, how: Arrangement): Placed[] {
  const members = members_of(graph, band_id)
    .filter((b) => !is_interface(b) && !gridded(graph, b.id));
  if (!members.length) return [];

  const unit = (id: Id) => band_unit(graph, band_id, id);
  const edges = band_edges(graph, layer, band_id);
  const structural = members.filter((b) => !is_satellite(graph, layer, b));
    const order = placement_order(graph, layer, structural, unit, edges);
  const sized = order.map((b) => ({
    b,
    s: is_band(graph, b) ? band_size(graph, layer, b, how) : size_of(graph, b.id),
  }));

  if (how === "grid") {
    const cleared = sized.map(({ b, s }) => ({ b: { ...b, x: undefined, y: undefined }, s }));
    const near = (id: Id, taken: Placed[], size: Size) =>
      anchor_near(graph, layer, id, taken, unit, size, edges);
    const placed = settled(cleared, near);
    return straighten_related(graph, layer, structural, unit, placed, how, edges);
  }
  return packed(sized).layout;
}

/** Lay out one band's members, recursing into nested bands. */
function lay_band(graph: Graph, layer: Id | null, band_id: Id, origin: Placed,
                  how: Arrangement, out: Placed[]): void {
  for (const p of band_layout(graph, layer, band_id, how)) {
    const spot = { id: p.id, x: origin.x + GAP + p.x, y: origin.y + GAP + p.y, w: p.w, h: p.h };
    out.push(spot);
    const b = graph.blocks[p.id];
    if (b && is_band(graph, b)) lay_band(graph, layer, p.id, spot, how, out);
  }
}

/** Every member of a band, placed inside it once the band has a spot. */
function band_members(graph: Graph, layer: Id | null, how: Arrangement,
                      units: readonly Block[], spots: readonly Placed[]): Placed[] {
  const at = new Map(spots.map((p) => [p.id, p]));
  const out: Placed[] = [];
  for (const b of units) {
    if (!is_band(graph, b)) continue;
    const band = at.get(b.id);
    if (!band) continue;
    lay_band(graph, layer, b.id, band, how, out);
  }
  return out;
}

/** Members shelved inside a band, from the band's own corner. */
function packed(all: Sized[]): { layout: Placed[]; w: number; h: number } {
  if (!all.length) return { layout: [], w: 0, h: 0 };
  const area = all.reduce((n, it) => n + (it.s.w + GAP) * (it.s.h + GAP), 0);
  const want = Math.max(...all.map((it) => it.s.w), Math.sqrt(area));
  const layout: Placed[] = [];
  let x = 0;
  let y = 0;
  let tall = 0;
  for (const it of all) {
    if (x > 0 && x + it.s.w > want) { x = 0; y += tall + GAP; tall = 0; }
    layout.push({ id: it.b.id, x, y, ...it.s });
    x += it.s.w + GAP;
    tall = Math.max(tall, it.s.h);
  }
  const right = Math.max(...layout.map((p) => p.x + p.w));
  const bottom = Math.max(...layout.map((p) => p.y + p.h));
  return { layout, w: right, h: bottom };
}

/** Every band, as the bounds of what it holds.
 *
 *  **Worked out here rather than left to whoever draws it.** A band's rim is
 *  still a fact about its members — the spot it took in the lattice is only
 *  for spacing, and the drawn frame hugs what is inside. */
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
    const in_cell = is_header(b)
      ? fills_cell(box) : centred_in(box, size_of(graph, b.id));
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
function settled(all: Sized[],
                 near?: (id: Id, taken: Placed[], size: Size) => Point | null): Placed[] {
  const out: Placed[] = [];
  for (const it of all) {
    const hint = near?.(it.b.id, out, it.s);
    const at = hint
      ? on_unit(hint)
      : it.b.x !== undefined && it.b.y !== undefined
        ? on_unit({ x: it.b.x, y: it.b.y })
        : on_unit({ x: 0, y: 0 });
    const box = { x: at.x, y: at.y, ...it.s };
    out.push({ id: it.b.id,
      ...(out.some((t) => gaps_overlap(box, t)) ? clear_at(out, at, it.s) : box) });
  }
  return out;
}

/** Neighbours that share a relationship are pulled onto one axis so a line
 *  between them can run straight. Only whole-unit nudges, only when already
 *  beside each other, and only when the move stays clear of everything else. */
function straighten_related(graph: Graph, layer: Id | null, units: Block[],
                            unit: (id: Id) => Id, spots: Placed[], how: Arrangement,
                            edges = edges_in(graph, layer)): Placed[] {
  const ids = new Set(units.map((b) => b.id));
  const out = spots.map((p) => ({ ...p }));
  const links = placement_links(graph, layer, ids, unit, edges)
    .sort(([a, b]) => {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const other = a < b ? `${b}|${a}` : `${a}|${b}`;
      return key.localeCompare(other);
    });
  for (const [a_id, b_id] of links) {
    const map = new Map(out.map((p) => [p.id, p]));
    const a = map.get(a_id);
    const b = map.get(b_id);
    if (!a || !b) continue;
    const flow = flow_between(graph, layer, a_id, b_id, unit);
    const anchor = flow?.from ?? a_id;
    const move = flow?.to ?? b_id;
    const fixed = map.get(anchor)!;
    const loose = map.get(move)!;
    const hg = gap_h(fixed, loose);
    const vg = gap_v(fixed, loose);
    if (hg >= GAP && hg <= GAP + UNIT && bands_overlap_y(fixed, loose)) {
      const y = mate_row_y(graph, layer, move, fixed.id, out, how);
      nudge_y(out, move, y, anchor);
    } else if (vg >= GAP && vg <= GAP + UNIT && bands_overlap_x(fixed, loose)) {
      const x = mate_col_x(graph, layer, move, fixed.id, out, how);
      nudge_x(out, move, x, anchor);
    }
  }
  return out;
}

/** Directed or related flow between two units, if the graph names one. */
function link_flow_between(graph: Graph, layer: Id | null, a: Id, b: Id,
                           unit: (id: Id) => Id): { from: Id; to: Id } | null {
  for (const e of edges_in(graph, layer)) {
    const from = unit(e.from);
    const to = unit(e.to);
    if (from === a && to === b) return { from, to };
    if (from === b && to === a) return { from: b, to: a };
  }
  return null;
}

function flow_between(graph: Graph, layer: Id | null, a: Id, b: Id,
                      unit: (id: Id) => Id): { from: Id; to: Id } | null {
  for (const e of edges_in(graph, layer)) {
    if (e.module !== "directed") continue;
    const from = unit(e.from);
    const to = unit(e.to);
    if (from === a && to === b) return { from, to };
    if (from === b && to === a) return { from: b, to: a };
  }
  return null;
}

function gap_h(a: Placed, b: Placed): number {
  return Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
}

function gap_v(a: Placed, b: Placed): number {
  return Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
}

function bands_overlap_y(a: Placed, b: Placed): boolean {
  return a.y < b.y + b.h && b.y < a.y + a.h;
}

function bands_overlap_x(a: Placed, b: Placed): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w;
}

function nudge_y(out: Placed[], id: Id, y: number, keep: Id): void {
  const p = out.find((q) => q.id === id);
  if (!p || p.y === y) return;
  const trial = { ...p, y };
  const others = out.filter((q) => q.id !== id);
  if (!others.some((t) => gaps_overlap(trial, t))) p.y = y;
  else {
    const anchor = out.find((q) => q.id === keep);
    if (!anchor) return;
    const alt = { ...anchor, y };
    if (!others.filter((t) => t.id !== keep).some((t) => gaps_overlap(alt, t))) anchor.y = y;
  }
}

function nudge_x(out: Placed[], id: Id, x: number, keep: Id): void {
  const p = out.find((q) => q.id === id);
  if (!p || p.x === x) return;
  const trial = { ...p, x };
  const others = out.filter((q) => q.id !== id);
  if (!others.some((t) => gaps_overlap(trial, t))) p.x = x;
  else {
    const anchor = out.find((q) => q.id === keep);
    if (!anchor) return;
    const alt = { ...anchor, x };
    if (!others.filter((t) => t.id !== keep).some((t) => gaps_overlap(alt, t))) anchor.x = x;
  }
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
  /** **The same placement `laid` draws, written fresh.** Shelving in tree order
   *  ignored ties — a note beside its subject and a reference beside its
   *  target need the relationship-aware search, not another row to the right. */
  const g: Graph = structuredClone(graph);
  const lid = layer_id(g, layer);
  if (g.blocks[lid]) g.blocks[lid]!.arrangement = "grid";
  const loose = loose_units(g, layer);
  const loose_ids = new Set(loose.map((b) => b.id));
  for (const b of loose) {
    delete g.blocks[b.id]!.x;
    delete g.blocks[b.id]!.y;
  }
  return laid(g, layer)
    .filter((p) => loose_ids.has(p.id))
    .map(({ id, x, y }) => ({ id, x, y }));
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

/** Whether a block is a note. */
function is_note(graph: Graph, b: Block): boolean {
  return b.type === "note" || module_of(graph, b.id) === "note";
}

/** What a note's ties reach on this layer. */
function tie_targets(graph: Graph, layer: Id | null, id: Id): Id[] {
  const out: Id[] = [];
  for (const e of edges_in(graph, layer)) {
    if (e.module !== "tie") continue;
    if (e.from === id) out.push(e.to);
    else if (e.to === id) out.push(e.from);
  }
  return out;
}

/** A note tied to something, or a reference of something — seated after the
 *  layer lands, not ranked into it. */
function is_satellite(graph: Graph, layer: Id | null, b: Block): boolean {
  if (is_reference(b) && b.of) return true;
  return is_note(graph, b) && tie_targets(graph, layer, b.id).length > 0;
}

/** Where a block actually draws — including members seated in a grid or band. */
function placed_of(graph: Graph, id: Id, placed: readonly Placed[]): Placed | null {
  const hit = placed.find((p) => p.id === id);
  if (hit) return hit;
  const b = graph.blocks[id];
  if (!b) return null;
  if (gridded(graph, id) && b.group && b.cell) {
    const grid = placed.find((p) => p.id === b.group);
    if (!grid) return null;
    const box = cell_box(graph.blocks[b.group]!, b.cell.r, b.cell.c);
    const in_cell = is_header(b)
      ? fills_cell(box) : centred_in(box, size_of(graph, id));
    return { id, x: grid.x + in_cell.x, y: grid.y + in_cell.y, w: in_cell.w, h: in_cell.h };
  }
  if (in_band(graph, id) && b.group) {
    const band = placed.find((p) => p.id === b.group);
    if (!band) return null;
    const found = placed.find((p) => p.id === id);
    if (found) return found;
    const scratch: Placed[] = [];
    const layer = graph.blocks[b.group]?.parent ?? null;
    lay_band(graph, layer, b.group, band, arrangement_of(graph, layer), scratch);
    return scratch.find((p) => p.id === id) ?? null;
  }
  return null;
}

/** Blocks on this layer linked to a satellite by any edge. */
function layer_targets(graph: Graph, layer: Id | null, id: Id): Id[] {
  const out: Id[] = [];
  for (const e of edges_in(graph, layer)) {
    if (e.from === id) out.push(e.to);
    else if (e.to === id) out.push(e.from);
  }
  return out;
}

/** The card a satellite should sit beside — the block itself, not the grid that
 *  holds it. */
function satellite_anchor(graph: Graph, layer: Id | null, b: Block,
                          placed: readonly Placed[]): Placed | null {
  if (is_reference(b)) {
    for (const t of layer_targets(graph, layer, b.id)) {
      const anchor = placed_of(graph, t, placed);
      if (anchor) return anchor;
    }
    return null;
  }
  if (is_note(graph, b)) {
    for (const t of tie_targets(graph, layer, b.id)) {
      const anchor = placed_of(graph, t, placed);
      if (anchor) return anchor;
    }
  }
  return null;
}

/** Seat a note or reference one gap from its anchor — below first, then beside,
 *  then row by row under the anchor if every side is taken.
 *
 *  **A block inside a grid or band sits below the rim**, aligned with the
 *  block — not on the far side of the container hunting for a free cell. */
function seat_satellite(id: Id, anchor: Placed, size: Size, taken: readonly Placed[],
                        graph: Graph, structural: readonly Placed[]): Placed {
  const free = (box: Rect) => !taken.some((t) => gaps_overlap(box, t));
  const rim_below = (holder: Placed) => snap(Math.max(anchor.y + anchor.h + GAP, holder.y + holder.h + GAP));
  const b = graph.blocks[anchor.id];
  if (b?.group) {
    const holder = structural.find((p) => p.id === b.group);
    const g = holder ? graph.blocks[b.group] : undefined;
    if (holder && g && (is_grid(g) || is_group_block(graph, b.group))) {
      const y0 = rim_below(holder);
      const x0 = anchor.x;
      for (let drop = 0; drop < 40; drop++) {
        const box = { x: x0, y: y0 + drop * UNIT, ...size };
        if (free(box)) return { id, ...box };
      }
      const out = exterior_side(holder, anchor);
      const beside = out === "left"
        ? { x: anchor.x - size.w - GAP, y: anchor.y }
        : { x: anchor.x + anchor.w + GAP, y: anchor.y };
      const box = { x: snap(beside.x), y: snap(beside.y), ...size };
      if (free(box)) return { id, ...box };
    }
  }
  const candidates = [
    { x: anchor.x, y: anchor.y + anchor.h + GAP },
    { x: anchor.x + anchor.w + GAP, y: anchor.y },
    { x: anchor.x - size.w - GAP, y: anchor.y },
    { x: anchor.x, y: anchor.y - size.h - GAP },
  ];
  for (const c of candidates) {
    const box = { x: snap(c.x), y: snap(c.y), ...size };
    if (free(box)) return { id, ...box };
  }
  let x = snap(anchor.x);
  let y = snap(anchor.y + anchor.h + GAP);
  for (let drop = 0; drop < 40; drop++) {
    const box = { x, y, ...size };
    if (free(box)) return { id, ...box };
    y += UNIT;
  }
  return { id, ...clear_at(taken, { x, y }, size) };
}

function gaps_overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP
    && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;
}

/** Loose blocks the layer places as units — not interfaces, grid seats, or band
 *  members. */
function loose_units(graph: Graph, layer: Id | null): Block[] {
  return children(graph, layer)
    .filter((b) => !is_interface(b) && !gridded(graph, b.id) && !in_band(graph, b.id));
}

/** Which loose unit a block belongs to for placement — a band or grid is one thing. */
function loose_unit(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  if (!b) return id;
  if (is_interface(b) && b.parent) return loose_unit(graph, b.parent);
  if (b.group) {
    const g = graph.blocks[b.group];
    if (g && (is_group_block(graph, b.group) || is_grid_block(graph, b.group))) {
      return b.group;
    }
  }
  return id;
}

/** Every link that should pull two units near each other — relationships on the
 *  layer. */
function placement_links(graph: Graph, layer: Id | null, ids: Set<Id>,
                         unit: (id: Id) => Id,
                         edges = edges_in(graph, layer)): [Id, Id][] {
  const links: [Id, Id][] = [];
  const seen = new Set<string>();
  const add = (a: Id, b: Id) => {
    if (!ids.has(a) || !ids.has(b) || a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    links.push([a, b]);
  };
  for (const e of edges) add(unit(e.from), unit(e.to));
  return links;
}

/** Loose units in an order that keeps related ones together. */
function placement_order(graph: Graph, layer: Id | null, units: Block[],
                         unit: (id: Id) => Id,
                         edges = edges_in(graph, layer)): Block[] {
  const by_id = new Map(units.map((b) => [b.id, b]));
  const ids = new Set(units.map((b) => b.id));
  const adj = new Map<Id, Id[]>();
  for (const [a, b] of placement_links(graph, layer, ids, unit, edges)) {
    adj.set(a, [...new Set([...(adj.get(a) ?? []), b])]);
    adj.set(b, [...new Set([...(adj.get(b) ?? []), a])]);
  }
  const sorted = [...units].sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id));
  const start = [...sorted].sort((a, b) =>
    (adj.get(b.id)?.length ?? 0) - (adj.get(a.id)?.length ?? 0)
    || (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id))[0]!.id;
  const seen = new Set<Id>();
  const out: Block[] = [];
  const queue: Id[] = [start];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const b = by_id.get(id);
    if (b) out.push(b);
    const next = [...(adj.get(id) ?? [])].sort((a, b) =>
      (by_id.get(a)?.num ?? 0) - (by_id.get(b)?.num ?? 0) || a.localeCompare(b));
    for (const n of next) if (!seen.has(n)) queue.push(n);
  }
  for (const b of sorted) if (!seen.has(b.id)) out.push(b);
  return out;
}

/** Related units already placed, if any. */
function placement_mates(graph: Graph, layer: Id | null, id: Id, taken: Placed[],
                         unit: (id: Id) => Id,
                         edges = edges_in(graph, layer)): Placed[] {
  const uid = unit(id);
  const ids = new Set(taken.map((p) => p.id));
  const mates = new Set<Id>();
  for (const [a, b] of placement_links(graph, layer, new Set([uid, ...ids]), unit, edges)) {
    if (a === uid && ids.has(b)) mates.add(b);
    if (b === uid && ids.has(a)) mates.add(a);
  }
  return [...mates].map((mid) => taken.find((p) => p.id === mid)).filter(Boolean) as Placed[];
}

type Side = "left" | "right" | "above" | "below";

function beside(p: Placed, side: Side, size: Size): Point {
  switch (side) {
    case "right": return { x: p.x + p.w + GAP, y: p.y };
    case "left": return { x: p.x - size.w - GAP, y: p.y };
    case "below": return { x: p.x, y: p.y + p.h + GAP };
    case "above": return { x: p.x, y: p.y - size.h - GAP };
  }
}

/** Which sides to try first when anchoring beside a mate — upstream goes left,
 *  downstream goes right, so a run through a band meets on the near edge. */
function anchor_sides(graph: Graph, layer: Id | null, id: Id, mates: readonly Id[],
                      unit: (id: Id) => Id): Side[] {
  const uid = unit(id);
  let upstream = false;
  let downstream = false;
  for (const mate of mates) {
    const flow = link_flow_between(graph, layer, uid, mate, unit);
    if (!flow) continue;
    if (flow.from === uid) upstream = true;
    if (flow.to === uid) downstream = true;
  }
  if (upstream && !downstream) return ["left", "above", "below", "right"];
  if (downstream && !upstream) return ["right", "below", "above", "left"];
  return ["right", "left", "below", "above"];
}

/** After cells land, pull loose blocks onto the row of the member they relate to. */
function align_to_cells(graph: Graph, layer: Id | null, spots: Placed[],
                        how: Arrangement): Placed[] {
  const out = spots.map((p) => ({ ...p }));
  for (const p of out) {
    if (gridded(graph, p.id) || in_band(graph, p.id)) continue;
    const b = graph.blocks[p.id];
    if (!b || is_satellite(graph, layer, b)) continue;
    for (const e of edges_in(graph, layer)) {
      if (e.from !== p.id && e.to !== p.id) continue;
      const other = e.from === p.id ? e.to : e.from;
      const holder_id = loose_unit(graph, other);
      if (holder_id === other || !is_grid_block(graph, holder_id)) continue;
      const spot = member_spot(graph, layer, p.id, holder_id, out, how);
      if (!spot) continue;
      p.y = snap(spot.y);
      break;
    }
  }
  return out;
}

/** Where a seated member would draw inside a container already on the layer. */
function member_in_holder(graph: Graph, layer: Id | null, holder_id: Id, member_id: Id,
                          holder: Placed, how: Arrangement): Placed | null {
  const b = graph.blocks[member_id];
  if (!b) return null;
  if (is_grid_block(graph, holder_id) && b.cell) {
    const g = graph.blocks[holder_id]!;
    const box = cell_box(g, b.cell.r, b.cell.c);
    const in_cell = is_header(b)
      ? fills_cell(box) : centred_in(box, size_of(graph, member_id));
    return { id: member_id, x: holder.x + in_cell.x, y: holder.y + in_cell.y,
             w: in_cell.w, h: in_cell.h };
  }
  if (is_group_block(graph, holder_id)) {
    for (const p of band_layout(graph, layer, holder_id, how)) {
      if (p.id === member_id) {
        return { id: member_id, x: holder.x + GAP + p.x, y: holder.y + GAP + p.y,
                 w: p.w, h: p.h };
      }
    }
  }
  return null;
}

/** The block inside a container that `id` links to on this layer, if any. */
function linked_member(graph: Graph, layer: Id | null, id: Id, holder_id: Id): Id | null {
  for (const e of edges_in(graph, layer)) {
    if (e.from !== id && e.to !== id) continue;
    const other = e.from === id ? e.to : e.from;
    if (loose_unit(graph, other) === holder_id) return other;
  }
  return null;
}

function member_spot(graph: Graph, layer: Id | null, id: Id, holder_id: Id,
                     taken: readonly Placed[], how: Arrangement): Placed | null {
  const member = linked_member(graph, layer, id, holder_id);
  if (!member) return null;
  const at = placed_of(graph, member, taken);
  if (at) return at;
  const holder = taken.find((p) => p.id === holder_id);
  if (!holder) return null;
  return member_in_holder(graph, layer, holder_id, member, holder, how);
}

function mate_row_y(graph: Graph, layer: Id | null, id: Id, holder_id: Id,
                      taken: readonly Placed[], how: Arrangement): number {
  const spot = member_spot(graph, layer, id, holder_id, taken, how);
  if (spot) return snap(spot.y);
  const holder = taken.find((p) => p.id === holder_id);
  return snap(holder?.y ?? 0);
}

function mate_col_x(graph: Graph, layer: Id | null, id: Id, holder_id: Id,
                      taken: readonly Placed[], how: Arrangement): number {
  const spot = member_spot(graph, layer, id, holder_id, taken, how);
  if (spot) return snap(spot.x);
  const holder = taken.find((p) => p.id === holder_id);
  return snap(holder?.x ?? 0);
}

/** Row of the cell inside a container that `id` actually links to — not the rim. */
function mate_cell_y(graph: Graph, layer: Id | null, id: Id, mate_id: Id,
                       taken: readonly Placed[], how: Arrangement): number | null {
  const spot = member_spot(graph, layer, id, mate_id, taken, how);
  return spot ? spot.y : null;
}

/** Which side of a container a seated block sits on — for seating outside it. */
function exterior_side(holder: Placed, anchor: Placed): "left" | "right" {
  const ax = anchor.x + anchor.w / 2;
  const hx = holder.x + holder.w / 2;
  return ax <= hx ? "left" : "right";
}

/** Where to start looking for a spot: beside related units already placed. */
function anchor_near(graph: Graph, layer: Id | null, id: Id, taken: Placed[],
                     unit: (id: Id) => Id, size: Size,
                     edges = edges_in(graph, layer)): Point | null {
  const how = arrangement_of(graph, layer);
  const placed = placement_mates(graph, layer, id, taken, unit, edges);
  if (!placed.length) return null;
  const free_at = (x: number, y: number) => !taken.some((t) =>
    x < t.x + t.w + GAP && t.x < x + size.w + GAP
    && y < t.y + t.h + GAP && t.y < y + size.h + GAP);
  const sides = anchor_sides(graph, layer, id, placed.map((p) => p.id), unit);
  const candidates: Point[] = [];
  for (const p of placed) {
    const cell = is_grid_block(graph, p.id)
      ? member_spot(graph, layer, id, p.id, taken, how) : null;
    const y = cell?.y ?? mate_cell_y(graph, layer, id, p.id, taken, how) ?? p.y;
    if (cell) {
      for (const side of sides) {
        if (side === "left" || side === "right") {
          for (let n = 0; n < 8; n++) {
            candidates.push(side === "left"
              ? { x: p.x - size.w - GAP - n * (size.w + GAP), y }
              : { x: p.x + p.w + GAP + n * (size.w + GAP), y });
          }
        } else {
          candidates.push(beside(cell, side, size));
        }
      }
      continue;
    }
    for (const side of sides) {
      if (side === "left" || side === "right") {
        for (let n = 1; n <= 8; n++) {
          candidates.push(side === "left"
            ? { x: p.x - n * (size.w + GAP), y }
            : { x: p.x + p.w + GAP + (n - 1) * (size.w + GAP), y });
        }
      } else {
        candidates.push(beside(p, side, size));
      }
    }
  }
  let cx = 0;
  let cy = 0;
  for (const p of placed) { cx += p.x + p.w / 2; cy += p.y + p.h / 2; }
  cx /= placed.length;
  cy /= placed.length;
  candidates.push({ x: cx - size.w / 2, y: cy - size.h / 2 });
  for (const c of candidates) {
    const x = snap(c.x);
    const y = snap(c.y);
    if (free_at(x, y)) return { x, y };
  }
  return { x: snap(cx - size.w / 2), y: snap(cy - size.h / 2) };
}
