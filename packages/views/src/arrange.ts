/** Where everything in a layer sits.
 *
 *  One setting, two values. `free` is hand placement, rounded to the unit
 *  lattice. `grid` is auto-layout: it ignores stored positions and assigns
 *  every loose unit a box on that lattice from the relationships and the
 *  sizes, so a well-laid layer never has to be nudged by hand.
 *
 *  **Related units share a row or a column and sit one gap apart.** Unrelated
 *  ones fill the next slots of a square-ish shelf. A group or a grid is one
 *  rectangle, sized from what it holds, and spaced like any other box. The
 *  gap is a hard 1-unit halo — never a post-pass hope.
 *
 *  **The lattice is the layer's, not a group's.** A cell is the same size
 *  wherever it is, measured from the layer's origin, so a block the layer
 *  placed and a block seated in a group land on the same lines.
 *
 *  Switching to `grid` still writes the auto-layout as ordinary placements, so
 *  returning to `free` keeps that picture as a starting hand layout. */

import { arrangement_of, children, edges_in, is_grid, is_grid_block, is_group_block,
         is_header, is_interface, is_reference, layer_id, members_of, module_of,
         type Arrangement, type Block, type Graph, type Id, type Point } from "@mnd/core";
import { cell_box, centred_in, fills_cell, gridded, on_unit, size_of, snap,
         GAP, UNIT, type Size } from "./size";

export type Placed = { id: Id; x: number; y: number; w: number; h: number };

type Sized = { b: Block; s: Size };
type Rect = { x: number; y: number; w: number; h: number };
type Side = "left" | "right" | "above" | "below";

/** Every block drawn in this layer, placed. Interfaces are seated on their
 *  owner rather than laid out, so they are not here. */
export function laid(graph: Graph, layer: Id | null): Placed[] {
  const units = children(graph, layer).filter((b) => !is_interface(b));
  if (units.length === 0) return [];
  const loose = loose_units(graph, layer);
  const how = arrangement_of(graph, layer);
  const unit = (id: Id) => loose_unit(graph, id);
  const structural = loose.filter((b) => !is_satellite(graph, layer, b));
  const satellites = loose.filter((b) => is_satellite(graph, layer, b))
    .sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id));

  const sized: Sized[] = structural.map((b) => ({
    b, s: is_band(graph, b) ? band_size(graph, layer, b, how) : size_of(graph, b.id),
  }));
  const structural_spots = how === "grid"
    ? centred(pack_units(graph, layer, sized, unit))
    : free(sized);

  const member_spots = [...celled(graph, units, structural_spots),
                          ...band_members(graph, layer, how, units, structural_spots)];
  const laid_so_far = unique([...structural_spots, ...member_spots]);

  const satellite_spots: Placed[] = [];
  for (const b of satellites) {
    const s = size_of(graph, b.id);
    if (how === "free" && b.x !== undefined && b.y !== undefined) {
      satellite_spots.push({ id: b.id, ...put({ x: b.x, y: b.y }), ...s });
      continue;
    }
    const anchor = satellite_anchor(graph, layer, b, laid_so_far);
    const taken = [...laid_so_far, ...satellite_spots];
    satellite_spots.push(anchor
      ? seat_satellite(b.id, anchor, s, taken, graph, layer)
      : { id: b.id, ...fit(taken, { x: 0, y: 0 }, s), ...s });
  }
  return unique([...laid_so_far, ...satellite_spots]);
}

function unique(spots: Placed[]): Placed[] {
  const at = new Map<Id, Placed>();
  for (const p of spots) at.set(p.id, p);
  return ordered([...at.values()]);
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

/** What a band takes up for spacing: its members packed, plus a margin.
 *
 *  **The same footprint it will draw.** Internals are worked out first, then
 *  the band is one rectangle among its neighbours — never a placeholder that
 *  is later hugged to a different size. */
function band_size(graph: Graph, layer: Id | null, band: Block, how: Arrangement): Size {
  const layout = band_layout(graph, layer, band.id, how);
  if (!layout.length) return { w: GAP * 2, h: GAP * 2 };
  const right = Math.max(...layout.map((p) => p.x + p.w));
  const bottom = Math.max(...layout.map((p) => p.y + p.h));
  return { w: right + GAP * 2, h: bottom + GAP * 2 };
}

/** Edges whose endpoints both belong to a band — internal layout only. */
function band_edges(graph: Graph, layer: Id | null, band_id: Id) {
  const inside = new Set(members_of(graph, band_id).map((b) => b.id));
  return edges_in(graph, layer).filter((e) => inside.has(e.from) && inside.has(e.to));
}

/** Which unit a block is for placement inside a band — members stay themselves,
 *  not collapsed to the band the way they are on the layer. */
function band_unit(_graph: Graph, _band_id: Id, id: Id): Id {
  return id;
}

/** Lay out a band's members relative to its corner — same packer as the layer
 *  under `grid`, shelf packing under `free`. */
function band_layout(graph: Graph, layer: Id | null, band_id: Id, how: Arrangement): Placed[] {
  const members = members_of(graph, band_id)
    .filter((b) => !is_interface(b) && !gridded(graph, b.id));
  if (!members.length) return [];

  const unit = (id: Id) => band_unit(graph, band_id, id);
  const edges = band_edges(graph, layer, band_id);
  const structural = members.filter((b) => !is_satellite(graph, layer, b));
  const sized = structural.map((b) => ({
    b,
    s: is_band(graph, b) ? band_size(graph, layer, b, how) : size_of(graph, b.id),
  }));

  if (how === "grid") return pack_units(graph, layer, sized, unit, edges);
  const ordered_mem = [...sized].sort((a, b) =>
    (a.b.num ?? 0) - (b.b.num ?? 0) || a.b.id.localeCompare(b.b.id));
  return packed(ordered_mem).layout;
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
    if (!is_band(graph, b) || in_band(graph, b.id)) continue;
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

/** Hand placement is what draws; anything unplaced fills the room around it.
 *
 *  **One measure, so one rounding.** A card, a note and a grid all land on the
 *  same lattice. */
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

/** Auto-layout: related clusters first, leftovers on a square-ish shelf.
 *
 *  Stored positions are ignored — `grid` is a picture of the model, not of
 *  wherever something was last dropped. */
function pack_units(graph: Graph, layer: Id | null, sized: Sized[],
                    unit: (id: Id) => Id,
                    edges = edges_in(graph, layer)): Placed[] {
  if (!sized.length) return [];
  const by_id = new Map(sized.map((it) => [it.b.id, it]));
  const components = connected(graph, layer, sized.map((it) => it.b), unit, edges);
  const local = components.map((comp) => {
    const order = placement_order(graph, layer, comp, unit, edges);
    const items = order.map((b) => by_id.get(b.id)!);
    return place_cluster(graph, layer, items, unit, edges);
  });
  return shelf(local);
}

/** Connected components of the placement graph, largest first, then tree order. */
function connected(graph: Graph, layer: Id | null, units: Block[],
                   unit: (id: Id) => Id,
                   edges = edges_in(graph, layer)): Block[][] {
  const by_id = new Map(units.map((b) => [b.id, b]));
  const ids = new Set(units.map((b) => b.id));
  const adj = new Map<Id, Id[]>();
  for (const [a, b] of placement_links(graph, layer, ids, unit, edges)) {
    adj.set(a, [...new Set([...(adj.get(a) ?? []), b])]);
    adj.set(b, [...new Set([...(adj.get(b) ?? []), a])]);
  }
  const sorted = [...units].sort((a, b) => (a.num ?? 0) - (b.num ?? 0) || a.id.localeCompare(b.id));
  const seen = new Set<Id>();
  const out: Block[][] = [];
  for (const start of sorted) {
    if (seen.has(start.id)) continue;
    const comp: Block[] = [];
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const b = by_id.get(id);
      if (b) comp.push(b);
      const next = [...(adj.get(id) ?? [])].sort((a, b) =>
        (by_id.get(a)?.num ?? 0) - (by_id.get(b)?.num ?? 0) || a.localeCompare(b));
      for (const n of next) if (!seen.has(n) && ids.has(n)) queue.push(n);
    }
    out.push(comp);
  }
  return out.sort((a, b) => b.length - a.length
    || (a[0]!.num ?? 0) - (b[0]!.num ?? 0)
    || a[0]!.id.localeCompare(b[0]!.id));
}

/** Place one related cluster: first unit at the origin, each later one in the
 *  nearest free cell around a mate — a grid around a hub, a row along a chain. */
function place_cluster(graph: Graph, layer: Id | null, items: Sized[],
                       unit: (id: Id) => Id,
                       edges = edges_in(graph, layer)): Placed[] {
  const out: Placed[] = [];
  for (const it of items) {
    const hint = desired_at(graph, layer, it.b.id, out, unit, it.s, edges);
    const at = hint ?? { x: 0, y: 0 };
    out.push({ id: it.b.id, ...fit(out, at, it.s), ...it.s });
  }
  if (!out.length) return out;
  const ox = Math.min(...out.map((p) => p.x));
  const oy = Math.min(...out.map((p) => p.y));
  return out.map((p) => ({ ...p, x: p.x - ox, y: p.y - oy }));
}

/** Shelf component bounding boxes into a block about as wide as it is tall. */
function shelf(components: Placed[][]): Placed[] {
  const boxes = components.filter((spots) => spots.length);
  if (boxes.length === 0) return [];
  if (boxes.length === 1) return boxes[0]!;
  const framed = boxes.map((spots) => {
    const x = Math.min(...spots.map((p) => p.x));
    const y = Math.min(...spots.map((p) => p.y));
    return { spots, x, y,
             w: Math.max(...spots.map((p) => p.x + p.w)) - x,
             h: Math.max(...spots.map((p) => p.y + p.h)) - y };
  });
  const area = framed.reduce((n, b) => n + (b.w + GAP) * (b.h + GAP), 0);
  const want = Math.max(...framed.map((b) => b.w), Math.sqrt(area));
  const out: Placed[] = [];
  let x = 0;
  let y = 0;
  let tall = 0;
  for (const box of framed) {
    if (x > 0 && x + box.w > want) { x = 0; y += tall + GAP; tall = 0; }
    const dx = x - box.x;
    const dy = y - box.y;
    for (const p of box.spots) out.push({ ...p, x: p.x + dx, y: p.y + dy });
    x += box.w + GAP;
    tall = Math.max(tall, box.h);
  }
  return out;
}

function open_at(taken: readonly Rect[], x: number, y: number, s: Size): boolean {
  return !taken.some((t) =>
    x < t.x + t.w + GAP && t.x < x + s.w + GAP
    && y < t.y + t.h + GAP && t.y < y + s.h + GAP);
}

function inner_of(graph: Graph, layer: Id | null, id: Id, holder: Placed,
                  taken: Placed[]): Placed | null {
  if (!is_grid_block(graph, holder.id) && !is_group_block(graph, holder.id)) return null;
  return member_spot(graph, layer, id, holder.id, taken, "grid");
}

/** One cell away from a mate on `side`. `n` is how many card-slots out.
 *
 *  **Above and below clear the container**, aligned with the member the
 *  edge names. Sitting above the member itself lands inside a tall group
 *  or grid, so the search skipped that cell and jumped to a far corner. */
function beside_at(p: Placed, side: Side, size: Size, inner: Placed | null, n: number): Point {
  const y = inner?.y ?? p.y;
  const x_align = inner?.x ?? p.x;
  const step_x = size.w + GAP;
  const step_y = size.h + GAP;
  const k = Math.max(1, n) - 1;
  switch (side) {
    case "right": return { x: p.x + p.w + GAP + k * step_x, y };
    case "left": return { x: p.x - size.w - GAP - k * step_x, y };
    case "below": return { x: x_align, y: p.y + p.h + GAP + k * step_y };
    case "above": return { x: x_align, y: p.y - size.h - GAP - k * step_y };
  }
}

/** Diagonal cells around a mate — near the related member first, then the
 *  container's own corners. */
function corners_at(p: Placed, size: Size, toward: Placed): Point[] {
  const dx = size.w + GAP;
  const dy = size.h + GAP;
  const x = toward.x;
  return [
    { x: x + toward.w + GAP, y: p.y - dy },
    { x: x - dx, y: p.y - dy },
    { x: p.x + p.w + GAP, y: p.y - dy },
    { x: p.x - dx, y: p.y - dy },
    { x: x + toward.w + GAP, y: p.y + p.h + GAP },
    { x: x - dx, y: p.y + p.h + GAP },
    { x: p.x + p.w + GAP, y: p.y + p.h + GAP },
    { x: p.x - dx, y: p.y + p.h + GAP },
  ];
}

/** How far a candidate box is from the block the relationship actually names. */
function separation(at: Point, size: Size, toward: Placed): number {
  const dx = Math.max(0, at.x - (toward.x + toward.w), toward.x - (at.x + size.w));
  const dy = Math.max(0, at.y - (toward.y + toward.h), toward.y - (at.y + size.h));
  return dx + dy;
}

/** Preferred cell: the free neighbour nearest the related member.
 *
 *  **Around the member, not the far corner of its container.** Siblings of
 *  a hub take the four sides then the corners, so a star becomes a grid.
 *  When those sides of a tall group are taken, the leftover sits above (or
 *  below) the member it names — not at the opposite corner, which is what
 *  made a path walk around the whole box. A chain still walks one step
 *  along its own mate, so A→B→C stays a run. */
function desired_at(graph: Graph, layer: Id | null, id: Id, taken: Placed[],
                    unit: (id: Id) => Id, size: Size,
                    edges = edges_in(graph, layer)): Point | null {
  const mates = placement_mates(graph, layer, id, taken, unit, edges);
  if (!mates.length) return null;
  const sides = anchor_sides(graph, layer, id, mates.map((p) => p.id), unit);
  const cands: { at: Point; dist: number; rank: number }[] = [];
  for (const p of mates) {
    const inner = inner_of(graph, layer, id, p, taken);
    const toward = inner ?? p;
    let rank = 0;
    const add = (pt: Point, r: number) => {
      const at = on_unit(pt);
      cands.push({ at, dist: separation(at, size, toward), rank: r });
    };
    for (const side of sides) add(beside_at(p, side, size, inner, 1), rank++);
    for (const c of corners_at(p, size, toward)) add(c, 8);
    for (const n of [2, 3]) {
      for (const side of sides) add(beside_at(p, side, size, inner, n), 12);
    }
  }
  const open = cands.filter((c) => open_at(taken, c.at.x, c.at.y, size));
  const pool = open.length ? open : cands;
  pool.sort((a, b) => a.dist - b.dist || a.rank - b.rank || a.at.y - b.at.y || a.at.x - b.at.x);
  return pool[0]!.at;
}

/** Nearest lattice point to `at` where a box of this size keeps a unit of air
 *  from everything already placed. Chebyshev rings, so a free cell beside or
 *  below is taken before one many cards down the same row. */
function fit(taken: readonly Rect[], at: Point, s: Size): { x: number; y: number } {
  const x0 = snap(at.x);
  const y0 = snap(at.y);
  if (open_at(taken, x0, y0, s)) return { x: x0, y: y0 };
  for (let ring = 1; ring <= REACH; ring++) {
    const cardinal: Point[] = [
      { x: x0 + ring * UNIT, y: y0 },
      { x: x0 - ring * UNIT, y: y0 },
      { x: x0, y: y0 + ring * UNIT },
      { x: x0, y: y0 - ring * UNIT },
    ];
    for (const c of cardinal) if (open_at(taken, c.x, c.y, s)) return c;
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        if (dx === 0 || dy === 0) continue;
        const x = x0 + dx * UNIT;
        const y = y0 + dy * UNIT;
        if (open_at(taken, x, y, s)) return { x, y };
      }
    }
  }
  return { x: x0, y: y0 };
}

/** How far a box may hunt for a clear slot, in units. */
const REACH = 64;

/** The tidy: auto-layout written as ordinary placements, so `free` can keep it.
 *
 *  **This is what the button does.** `grid` as a mode already draws this
 *  picture; writing it down is what lets a later `free` start from it. */
export function tidy(graph: Graph, layer: Id | null): { id: Id; x: number; y: number }[] {
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

/** How far the search for a clear drop reaches, in cells. */
const RINGS = 16;

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

function is_note(graph: Graph, b: Block): boolean {
  return b.type === "note" || module_of(graph, b.id) === "note";
}

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
    const found = placed.find((p) => p.id === id);
    if (found) return found;
    const band = placed.find((p) => p.id === b.group);
    if (!band) return null;
    const scratch: Placed[] = [];
    const layer = graph.blocks[b.group]?.parent ?? null;
    lay_band(graph, layer, b.group, band, arrangement_of(graph, layer), scratch);
    return scratch.find((p) => p.id === id) ?? null;
  }
  return null;
}

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

/** Seat a note or reference in the same nearest cell the packer would pick.
 *
 *  **Not a second policy.** These used to always drop below a grid or band,
 *  so a reference of a top cell sat under the whole lattice. They now ask
 *  `desired_at` for the free neighbour nearest the named block. */
function seat_satellite(id: Id, anchor: Placed, size: Size, taken: readonly Placed[],
                        graph: Graph, layer: Id | null): Placed {
  const hint = desired_at(graph, layer, id, [...taken], (x) => loose_unit(graph, x), size)
    ?? { x: anchor.x, y: anchor.y - size.h - GAP };
  return { id, ...fit(taken, hint, size), ...size };
}

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

function link_flow_between(graph: Graph, layer: Id | null, a: Id, b: Id,
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
  if (downstream && !upstream) return ["right", "above", "below", "left"];
  return ["right", "left", "above", "below"];
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
