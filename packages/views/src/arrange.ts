/** Where everything in a layer sits. */

import { arrangement_of, children, is_group, is_interface, layer_id, type Block, type Graph,
         type Id } from "@mnd/core";
import { band_members, band_size, celled, in_band, loose_unit, type Sized } from "./bands";
import { is_satellite, pack_units, seat_satellites } from "./pack";
import { gridded, size_of, snap, GAP, UNIT, type Size } from "./size";

export type Placed = { id: Id; x: number; y: number; w: number; h: number };

type Rect = { x: number; y: number; w: number; h: number };


/** Every block drawn in this layer, placed. */
export function laid(graph: Graph, layer: Id | null): Placed[] {
  const units = children(graph, layer).filter((b) => !is_interface(b));
  if (units.length === 0) return [];
  const loose = loose_units(graph, layer);
  const how = arrangement_of(graph, layer);
  const unit = (id: Id) => loose_unit(graph, id);
  const structural = loose.filter((b) => !is_satellite(graph, layer, b));
  const satellites = loose.filter((b) => is_satellite(graph, layer, b))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));

  const sized: Sized[] = structural.map((b) => ({
    b, s: is_group(graph, b.id) ? band_size(graph, layer, b, how) : size_of(graph, b.id),
  }));
  const structural_spots = how === "grid"
    ? centred(pack_units(graph, layer, sized, unit))
    : free(sized);

  /** Bands first, then cells: a grid in a band takes its spot from the band. */
  const band_spots = band_members(graph, layer, how, units, structural_spots);
  const cell_spots = celled(graph, units, [...structural_spots, ...band_spots]);
  const laid_so_far = unique([...structural_spots, ...band_spots, ...cell_spots]);

  /** What was put somewhere stands first. */
  const fixed: Placed[] = [];
  const floating: Block[] = [];
  for (const b of satellites) {
    if (how === "free" && b.x !== undefined && b.y !== undefined) {
      fixed.push({ id: b.id, ...put({ x: b.x, y: b.y }), ...size_of(graph, b.id) });
    } else floating.push(b);
  }
  const standing = [...laid_so_far, ...fixed];
  return unique([...standing, ...seat_satellites(graph, layer, floating, standing, unit)]);
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

/** Hand placement is what draws; anything unplaced fills the room around it. */
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

/** The tidy: auto-layout written as ordinary placements, so `free` can keep it. */
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

/** What the whole layer takes up, plus the room a new thing needs. */
export function bounds(spots: readonly Placed[]): { w: number; h: number } {
  if (spots.length === 0) return { w: UNIT * 16, h: UNIT * 10 };
  const reach = (a: number, b: number) => Math.max(Math.abs(a), Math.abs(b));
  const w = Math.max(...spots.map((p) => reach(p.x, p.x + p.w))) * 2;
  const h = Math.max(...spots.map((p) => reach(p.y, p.y + p.h))) * 2;
  return { w: w + GAP * 2, h: h + GAP * 2 };
}

/** A boundary: its members' bounds plus a cell of air. */
export function boundary(spots: readonly Placed[], members: readonly Id[]): Placed | null {
  const inside = spots.filter((p) => members.includes(p.id));
  if (inside.length === 0) return null;
  const x = Math.min(...inside.map((p) => p.x)) - GAP;
  const y = Math.min(...inside.map((p) => p.y)) - GAP;
  const w = Math.max(...inside.map((p) => p.x + p.w)) + GAP - x;
  const h = Math.max(...inside.map((p) => p.y + p.h)) + GAP - y;
  return { id: "", x, y, w, h };
}

function loose_units(graph: Graph, layer: Id | null): Block[] {
  return children(graph, layer)
    .filter((b) => !is_interface(b) && !gridded(graph, b.id) && !in_band(graph, b.id));
}
