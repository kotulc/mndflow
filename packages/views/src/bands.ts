/** Bands and grids inside a layer: members packed in a band, seated blocks placed by cell. */

import { edges_in, group_depth, is_group, is_grid, is_header, is_holder, is_interface,
         members_of, type Arrangement, type Block, type Graph, type Id, type Unit }
  from "@mnd/core";
import type { Placed } from "./arrange";
import { is_satellite, pack_units, seat_satellites } from "./pack";
import { cell_box, centred_in, fills_cell, gridded, size_of, BLOCK, GAP, type Size } from "./size";

export type Sized = { b: Unit; s: Size };


/** Whether a block sits in a dashed band rather than a grid. */
export function in_band(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id] ?? graph.holders[id];
  return !!b?.group && is_group(graph, b.group);
}

/** What a band takes up for spacing: its members packed, plus a margin. */
export function band_size(graph: Graph, layer: Id | null, band: Unit, how: Arrangement): Size {
  const layout = band_layout(graph, layer, band.id, how);
  /** An empty band keeps room for a card. */
  if (!layout.length) return { w: BLOCK.w + GAP * 2, h: BLOCK.h + GAP * 2 };
  const right = Math.max(...layout.map((p) => p.x + p.w));
  const bottom = Math.max(...layout.map((p) => p.y + p.h));
  return { w: right + GAP * 2, h: bottom + GAP * 2 };
}

/** Edges whose endpoints both belong to a band — internal layout only. */
function band_edges(graph: Graph, layer: Id | null, band_id: Id) {
  const inside = new Set(members_of(graph, band_id).map((b) => b.id));
  return edges_in(graph, layer).filter((e) => inside.has(e.from) && inside.has(e.to));
}

/** A band's members, relative to its corner. */
export function band_layout(graph: Graph, layer: Id | null, band_id: Id, how: Arrangement): Placed[] {
  const members = members_of(graph, band_id)
    .filter((b) => !is_interface(b) && !gridded(graph, b.id));
  if (!members.length) return [];

  /** Inside a band, members stay themselves. */
  const unit = (id: Id) => id;
  const edges = band_edges(graph, layer, band_id);
  const structural = members.filter((b) => !is_satellite(graph, layer, b));
  const satellites = members.filter((b) => is_satellite(graph, layer, b))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));
  const sized = structural.map((b) => ({
    b,
    s: is_group(graph, b.id) ? band_size(graph, layer, b, how) : size_of(graph, b.id),
  }));

  const ordered_mem = [...sized].sort((a, b) =>
    (a.b.order ?? 0) - (b.b.order ?? 0) || a.b.id.localeCompare(b.b.id));
  const packed_in = how === "grid" ? pack_units(graph, layer, sized, unit, edges)
                                   : packed(ordered_mem).layout;
  return from_corner([...packed_in,
                      ...seat_satellites(graph, layer, satellites, packed_in, unit, edges)]);
}

/** A band's layout shifted so its own corner is the top-left of everything in it. */
function from_corner(layout: Placed[]): Placed[] {
  if (!layout.length) return layout;
  const dx = Math.min(...layout.map((p) => p.x));
  const dy = Math.min(...layout.map((p) => p.y));
  if (!dx && !dy) return layout;
  return layout.map((p) => ({ ...p, x: p.x - dx, y: p.y - dy }));
}

/** Lay out one band's members, recursing into nested bands. */
function lay_band(graph: Graph, layer: Id | null, band_id: Id, origin: Placed,
                  how: Arrangement, out: Placed[]): void {
  for (const p of band_layout(graph, layer, band_id, how)) {
    const spot = { id: p.id, x: origin.x + GAP + p.x, y: origin.y + GAP + p.y, w: p.w, h: p.h };
    out.push(spot);
    if (is_group(graph, p.id)) lay_band(graph, layer, p.id, spot, how, out);
  }
}

/** Every member of a band, placed inside it once the band has a spot. */
export function band_members(graph: Graph, layer: Id | null, how: Arrangement,
                      units: readonly Unit[], spots: readonly Placed[]): Placed[] {
  const at = new Map(spots.map((p) => [p.id, p]));
  const out: Placed[] = [];
  for (const b of units) {
    if (!is_group(graph, b.id) || in_band(graph, b.id)) continue;
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

/** Where a seated block draws, given where its grid came to rest. A cell seats a card, so only a
 *  block ever answers here. */
export function cell_spot(graph: Graph, b: Block, grid: Placed): Placed {
  const box = cell_box(graph.holders[b.group!]!, b.cell!.r, b.cell!.c);
  const in_cell = is_header(b) ? fills_cell(box) : centred_in(box, size_of(graph, b.id));
  return { id: b.id, x: grid.x + in_cell.x, y: grid.y + in_cell.y,
           w: in_cell.w, h: in_cell.h };
}

/** Every gridded member, placed by its address inside the grid holding it. */
export function celled(graph: Graph, units: readonly Unit[], spots: readonly Placed[]): Placed[] {
  const at = new Map(spots.map((p) => [p.id, p]));
  const out: Placed[] = [];
  const seated = units.filter((b): b is Block => gridded(graph, b.id))
    .sort((a, b) => group_depth(graph, a.id) - group_depth(graph, b.id));
  for (const b of seated) {
    const grid = at.get(b.group!);
    if (!grid) continue;
    const spot = cell_spot(graph, b, grid);
    at.set(b.id, spot);
    out.push(spot);
  }
  return out;
}

/** Where a seated member would draw inside a container already on the layer. */
export function member_in_holder(graph: Graph, layer: Id | null, holder_id: Id, member_id: Id,
                          holder: Placed, how: Arrangement): Placed | null {
  const b = graph.blocks[member_id];
  if (!b) return null;
  if (is_grid(graph, holder_id) && b.cell) return cell_spot(graph, b, holder);
  if (is_group(graph, holder_id)) {
    for (const p of band_layout(graph, layer, holder_id, how)) {
      if (p.id === member_id) {
        return { id: member_id, x: holder.x + GAP + p.x, y: holder.y + GAP + p.y,
                 w: p.w, h: p.h };
      }
    }
  }
  return null;
}

/** Which loose unit a block belongs to for placement — a band or grid is one thing. */
export function loose_unit(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  if (!b) return id;
  if (is_interface(b) && b.parent) return loose_unit(graph, b.parent);
  if (b.group && is_holder(graph, b.group)) return b.group;
  return id;
}
