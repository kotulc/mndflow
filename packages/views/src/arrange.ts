/** Where everything in a layer sits. */

import { children, drawn_in, is_aside, is_group, is_interface, is_note, layout_of,
         type Block, type Graph, type Id, type Point } from "@mnd/core";
import { band_members, band_size, celled, loose_unit, type Sized } from "./bands";
import { beside } from "./float";
import { belongs_to, is_satellite, pack_units, tie_targets } from "./pack";
import { across_of } from "./page";
import { gridded, size_of, snap, GAP, PAD, UNIT, type Size } from "./size";

export { beside };

export type Placed = { id: Id; x: number; y: number; w: number; h: number };

type Rect = { x: number; y: number; w: number; h: number };


/** Every block drawn in this layer, placed. */
export function laid(graph: Graph, layer: Id | null): Placed[] {
  const units = drawn_in(graph, layer).filter((b) => !is_interface(graph, b.id));
  if (units.length === 0) return [];
  const loose = loose_units(graph, layer);
  const how = layout_of(graph, layer);
  const unit = (id: Id) => loose_unit(graph, id);
  const sized_of = (b: Block): Sized => ({
    b, s: is_group(graph, b.id) ? band_size(graph, layer, b, how) : size_of(graph, b.id),
  });
  const structural = loose.filter((b) => !is_satellite(graph, layer, b)).map(sized_of);
  const satellites = loose.filter((b) => is_satellite(graph, layer, b))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id)).map(sized_of);

  /** `auto` flows the blocks, then stands the notes in a column on the right. A computed page
   *  has written its places, and `free` draws what was put where it was put. */
  const spots = how === "auto"
    ? noted(graph, layer, structural, satellites, across_of(graph, layer))
    : free(structural, satellites, (b) => belongs_to(graph, layer, b).map(unit));

  /** Bands first, then cells: a grid in a band takes its spot from the band. */
  const band_spots = band_members(graph, layer, how, units, spots);
  const cell_spots = celled(graph, units, [...spots, ...band_spots]);
  return unique([...spots, ...band_spots, ...cell_spots]);
}

function unique(spots: Placed[]): Placed[] {
  const at = new Map<Id, Placed>();
  for (const p of spots) at.set(p.id, p);
  return ordered([...at.values()]);
}

/** The one order a layer is ever stated in, so the same graph draws the same picture whatever
 *  placed it. */
function ordered(spots: Placed[]): Placed[] {
  return spots.sort((a, b) => a.id.localeCompare(b.id));
}

/** Hand placement draws exactly where it was put; an unplaced satellite sits clear above what it
 *  belongs to, and anything else unplaced is shelved below it all. */
function free(all: Sized[], satellites: Sized[], owners: (b: Block) => Id[]): Placed[] {
  const out: Placed[] = [];
  const loose: Sized[] = [];
  const put = (it: Sized) => out.push({ id: it.b.id, x: it.b.x!, y: it.b.y!, ...it.s });
  const placed = (it: Sized) => it.b.x !== undefined && it.b.y !== undefined;
  for (const it of all) {
    if (placed(it)) put(it);
    else loose.push(it);
  }
  for (const it of satellites) {
    if (placed(it)) { put(it); continue; }
    const owner = owners(it.b).map((id) => out.find((p) => p.id === id)).find((p) => !!p);
    if (!owner) { loose.push(it); continue; }
    out.push({ id: it.b.id, ...clear_of(out, { x: owner.x, y: owner.y - it.s.h - GAP }, it.s),
               ...it.s });
  }
  const below = out.length ? snap(Math.max(...out.map((p) => p.y + p.h)) + GAP) : 0;
  let x = 0;
  for (const it of loose) {
    out.push({ id: it.b.id, x, y: below, ...it.s });
    x += snap(it.s.w + GAP);
  }
  return out;
}

/** The tidy: what a computed layout draws, written as ordinary placements so `free` keeps it. */
export function tidy(graph: Graph, scene: { layer: Id | null;
                                            nodes: readonly { id: Id; position: Point }[] })
    : { id: Id; x: number; y: number }[] {
  const loose = new Set(loose_units(graph, scene.layer).map((b) => b.id));
  return scene.nodes.filter((n) => loose.has(n.id))
    .map((n) => ({ id: n.id, x: n.position.x, y: n.position.y }));
}

/** `auto` at the layer: blocks flowed `across` to a row. Untied notes stand in a column on the
 *  right. A card carrying *is aside* floats in the nearest free space beside what it is tied to. */
function noted(graph: Graph, layer: Id | null, structural: Sized[], satellites: Sized[],
               across: number): Placed[] {
  const floats = (it: Sized) => is_aside(graph, it.b.id)
    && tie_targets(graph, layer, it.b.id).length > 0;
  const aside = [...structural, ...satellites].filter(floats);
  const placed = column(graph, layer, structural.filter((it) => !floats(it)),
                        satellites.filter((it) => !floats(it)), across);
  return [...placed, ...floated(graph, layer, aside, placed)];
}

/** Untied notes in one column a gap to the right of the blocks. */
function column(graph: Graph, layer: Id | null, structural: Sized[], satellites: Sized[],
                across: number): Placed[] {
  const note = (it: Sized) => is_note(graph, it.b.id);
  const flowing = [...structural.filter((it) => !note(it)),
                   ...satellites.filter((it) => !note(it))];
  const notes = [...structural, ...satellites].filter(note).sort((a, b) =>
    (a.b.order ?? 0) - (b.b.order ?? 0) || a.b.id.localeCompare(b.b.id));
  const placed = centred(pack_units(flowing, across));
  if (!notes.length) return placed;
  const at = new Map(placed.map((p) => [p.id, p]));
  const hits = (it: Sized) => tie_targets(graph, layer, it.b.id)
    .map((id) => at.get(id)).filter((p): p is Placed => !!p);
  const untied = notes.filter((it) => hits(it).length === 0);
  const right = placed.length ? Math.max(...placed.map((p) => p.x + p.w)) : 0;
  const x = snap(right + GAP);
  const top = placed.length ? Math.min(...placed.map((p) => p.y)) : 0;
  const column: Placed[] = [];
  let y = top;
  for (const it of untied) {
    column.push({ id: it.b.id, x, y, ...it.s });
    y += it.s.h + GAP;
  }
  const after_untied = y;
  const by_row = new Map<number, Placed[]>();
  const row_of = new Map<number, Sized[]>();
  for (const it of notes) {
    if (untied.includes(it)) continue;
    const row = Math.min(...hits(it).map((p) => p.y));
    const list = row_of.get(row) ?? [];
    list.push(it);
    row_of.set(row, list);
  }
  for (const row of [...row_of.keys()].sort((a, b) => a - b)) {
    let ny = row < after_untied ? Math.max(row, after_untied) : row;
    const list: Placed[] = [];
    for (const it of row_of.get(row)!) {
      const spot = { id: it.b.id, x, y: ny, ...it.s };
      list.push(spot);
      column.push(spot);
      ny += it.s.h + GAP;
    }
    by_row.set(row, list);
  }
  const rows = [...new Set(placed.map((p) => p.y))].sort((a, b) => a - b);
  let push = 0;
  for (const row of rows) {
    for (const p of placed) if (p.y === row) p.y += push;
    for (const n of by_row.get(row) ?? []) n.y += push;
    const blocks = placed.filter((p) => p.y === row + push);
    const block_bottom = blocks.length ? Math.max(...blocks.map((p) => p.y + p.h)) : row + push;
    const ns = [
      ...(row === rows[0] ? column.filter((n) => untied.some((u) => u.b.id === n.id)) : []),
      ...(by_row.get(row) ?? []),
    ];
    const note_bottom = ns.length ? Math.max(...ns.map((n) => n.y + n.h)) : block_bottom;
    push += Math.max(0, note_bottom - block_bottom);
  }
  return [...placed, ...column];
}

/** An aside card whose ties meet no placed card. It waits for the interface it is tied to, which
 *  is seated on a wall after the cards are placed. */
export function awaits_seat(graph: Graph, layer: Id | null, id: Id,
                            placed: readonly { id: Id }[]): boolean {
  if (!is_aside(graph, id)) return false;
  const targets = tie_targets(graph, layer, id);
  return targets.length > 0 && targets.every((t) => !placed.some((p) => p.id === t));
}

/** Aside cards, each in the nearest free space beside what it is tied to. One tied only to an
 *  interface is parked; it is moved beside that interface once the interface has a seat. */
function floated(graph: Graph, layer: Id | null, held: readonly Sized[],
                 placed: readonly Placed[]): Placed[] {
  const out = [...placed];
  const pending = [...held].sort((a, b) => a.b.id.localeCompare(b.b.id));
  for (let guard = pending.length; pending.length && guard >= 0; guard--) {
    const it = pending.shift()!;
    const target = tie_targets(graph, layer, it.b.id)
      .map((id) => out.find((p) => p.id === id)).find((p) => !!p);
    if (!target) { pending.push(it); continue; }
    out.push({ id: it.b.id, ...beside(out, target, it.s), ...it.s });
  }
  for (const it of pending) {
    const y = out.length ? Math.max(...out.map((p) => p.y + p.h)) + GAP : 0;
    out.push({ id: it.b.id, x: 0, y, ...it.s });
  }
  return out.filter((p) => !placed.some((was) => was.id === p.id));
}

/** Whether two boxes meet, counting `air` of space between them as taken. */
function hits(a: Rect, b: Rect, air = 0): boolean {
  return a.x < b.x + b.w + air && b.x < a.x + a.w + air
      && a.y < b.y + b.h + air && b.y < a.y + a.h + air;
}

/** Positions relative to the layer's centre. */
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

/** A spot near `at` where a new box lands on nothing drawn. */
export function clear_of(taken: readonly Rect[], at: { x: number; y: number },
                         size: Size, air = 0): { x: number; y: number } {
  const free_at = (x: number, y: number) => !taken.some((t) => hits({ x, y, ...size }, t, air));
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

/** What the whole layer takes up, plus the room a new thing needs. */
export function bounds(spots: readonly Placed[]): { w: number; h: number } {
  if (spots.length === 0) return { w: UNIT * 16, h: UNIT * 10 };
  const reach = (a: number, b: number) => Math.max(Math.abs(a), Math.abs(b));
  const w = Math.max(...spots.map((p) => reach(p.x, p.x + p.w))) * 2;
  const h = Math.max(...spots.map((p) => reach(p.y, p.y + p.h))) * 2;
  return { w: w + GAP * 2, h: h + GAP * 2 };
}

/** A boundary: its members' bounds plus its air. */
export function boundary(spots: readonly Placed[], members: readonly Id[]): Placed | null {
  const inside = spots.filter((p) => members.includes(p.id));
  if (inside.length === 0) return null;
  const x = Math.min(...inside.map((p) => p.x)) - PAD;
  const y = Math.min(...inside.map((p) => p.y)) - PAD;
  const w = Math.max(...inside.map((p) => p.x + p.w)) + PAD - x;
  const h = Math.max(...inside.map((p) => p.y + p.h)) + PAD - y;
  return { id: "", x, y, w, h };
}

function loose_units(graph: Graph, layer: Id | null): Block[] {
  return children(graph, layer)
    .filter((b) => !is_interface(graph, b.id) && (b.parent === layer || !gridded(graph, b.id)));
}
