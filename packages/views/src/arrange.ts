/** Where everything in a layer sits. */

import { children, drawn_in, is_group, is_interface, layout_of,
         type Block, type Graph, type Id, type Point } from "@mnd/core";
import { band_members, band_size, celled, loose_unit, type Sized } from "./bands";
import { belongs_to, is_satellite, pack_units } from "./pack";
import { across_of } from "./page";
import { gridded, size_of, snap, GAP, PAD, UNIT, type Size } from "./size";

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

  /** `auto` flows every unit in reading order, wrapping at the page's width; a
   *  computed page has written its places, and `free` draws what was put where it was put. */
  const spots = how === "auto"
    ? centred(pack_units([...structural, ...satellites], across_of(graph, layer)))
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
