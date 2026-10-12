/** Bands and grids inside a layer: members packed in a band, seated blocks placed by cell. */

import { group_depth, inline, is_group, is_header, is_interface,
         lattice_of, layout_of, members_of, type Block, type Graph, type Id, type Layout }
  from "@mnd/core";
import type { Placed } from "./arrange";
import { pack_units } from "./pack";
import { cell_box, centred_in, fills_cell, gridded, size_of, BLOCK, GAP, PAD,
         type Size } from "./size";

export type Sized = { b: Block; s: Size };

/** The room between rows of a band where a band sits in one, a card high, so a nested band's
 *  name reads clear of what is over it and the nesting reads at a glance. */
const APART = BLOCK.h;


/** Whether a block sits in a dashed band drawn on the layer, rather than on the layer itself. */
export function in_band(graph: Graph, id: Id, layer: Id | null = null): boolean {
  const at = graph.blocks[id]?.parent ?? undefined;
  return at !== layer && is_group(graph, at);
}

/** What a band takes up for spacing: its members packed, at least as wide as it says it is, plus
 *  its air. */
export function band_size(graph: Graph, layer: Id | null, band: Block, how: Layout): Size {
  const layout = band_layout(graph, layer, band.id, how);
  /** An empty band keeps room for a card. */
  if (!layout.length) return { w: BLOCK.w + PAD * 2, h: BLOCK.h + PAD * 2 };
  const right = Math.max(band.w ?? 0, ...layout.map((p) => p.x + p.w));
  const bottom = Math.max(...layout.map((p) => p.y + p.h));
  return { w: right + PAD * 2, h: bottom + PAD * 2 };
}

/** A band's members, relative to its corner. */
export function band_layout(graph: Graph, layer: Id | null, band_id: Id, how: Layout): Placed[] {
  const members = members_of(graph, band_id)
    .filter((b) => !is_interface(graph, b.id) && !gridded(graph, b.id));
  if (!members.length) return [];

  /** A band set free keeps each member where it was put, from the band's own corner. */
  if (layout_of(graph, band_id) === "free" && graph.blocks[band_id]?.settings?.["layout"]) {
    return from_corner(members.map((b) => ({ id: b.id, x: b.x ?? 0, y: b.y ?? 0,
      ...(is_group(graph, b.id) ? band_size(graph, layer, b, how) : size_of(graph, b.id)) })));
  }

  const sized = members.map((b): Sized => ({
    b, s: is_group(graph, b.id) ? band_size(graph, layer, b, how) : size_of(graph, b.id),
  }));
  /** The grid starts at the band's corner, its cells on the guides. */
  if (how === "auto") return pack_units(sized);
  const ordered_mem = [...sized].sort((a, b) =>
    (a.b.order ?? 0) - (b.b.order ?? 0) || a.b.id.localeCompare(b.b.id));
  return from_corner(packed(ordered_mem, graph.blocks[band_id]?.w,
                            (id) => is_group(graph, id)).layout);
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
                  how: Layout, out: Placed[]): void {
  for (const p of band_layout(graph, layer, band_id, how)) {
    const spot = { id: p.id, x: origin.x + PAD + p.x, y: origin.y + PAD + p.y, w: p.w, h: p.h };
    out.push(spot);
    if (is_group(graph, p.id)) lay_band(graph, layer, p.id, spot, how, out);
  }
}

/** Every member of a band, placed inside it once the band has a spot. */
export function band_members(graph: Graph, layer: Id | null, how: Layout,
                      units: readonly Block[], spots: readonly Placed[]): Placed[] {
  const at = new Map(spots.map((p) => [p.id, p]));
  const out: Placed[] = [];
  for (const b of units) {
    if (!is_group(graph, b.id) || in_band(graph, b.id, layer)) continue;
    const band = at.get(b.id);
    if (!band) continue;
    lay_band(graph, layer, b.id, band, how, out);
  }
  return out;
}

/** Members shelved inside a band, from the band's own corner: in rows as wide as the band says
 *  it is, else roughly square, and rows holding a band set `APART`. */
function packed(all: Sized[], wide?: number, banded: (id: Id) => boolean = () => false
                ): { layout: Placed[]; w: number; h: number } {
  if (!all.length) return { layout: [], w: 0, h: 0 };
  const area = all.reduce((n, it) => n + (it.s.w + GAP) * (it.s.h + GAP), 0);
  const want = Math.max(...all.map((it) => it.s.w), wide ?? Math.sqrt(area));
  const layout: Placed[] = [];
  let x = 0;
  let y = 0;
  let tall = 0;
  let bands = false;
  for (const it of all) {
    const band = banded(it.b.id);
    if (x > 0 && x + it.s.w > want) {
      y += tall + (bands || band ? APART : GAP);
      x = 0;
      tall = 0;
      bands = false;
    }
    layout.push({ id: it.b.id, x, y, ...it.s });
    x += it.s.w + GAP;
    tall = Math.max(tall, it.s.h);
    bands ||= band;
  }
  const right = Math.max(...layout.map((p) => p.x + p.w));
  const bottom = Math.max(...layout.map((p) => p.y + p.h));
  return { layout, w: right, h: bottom };
}

/** Where a seated block draws, given where its grid came to rest: a header fills its cell, and
 *  anything else is centred in its own. */
export function cell_spot(graph: Graph, b: Block, grid: Placed): Placed {
  const box = cell_box(lattice_of(graph, b.parent ?? undefined)!, b.cell!.r, b.cell!.c);
  const in_cell = is_header(graph, b.id) ? fills_cell(box) : centred_in(box, size_of(graph, b.id));
  return { id: b.id, x: grid.x + in_cell.x, y: grid.y + in_cell.y,
           w: in_cell.w, h: in_cell.h };
}

/** Every gridded member, placed by its address inside the grid holding it. */
export function celled(graph: Graph, units: readonly Block[], spots: readonly Placed[]): Placed[] {
  const at = new Map(spots.map((p) => [p.id, p]));
  const out: Placed[] = [];
  const seated = units.filter((b) => gridded(graph, b.id))
    .sort((a, b) => group_depth(graph, a.id) - group_depth(graph, b.id));
  for (const b of seated) {
    const grid = at.get(b.parent!);
    if (!grid) continue;
    const spot = cell_spot(graph, b, grid);
    at.set(b.id, spot);
    out.push(spot);
  }
  return out;
}

/** Which loose unit a block belongs to for placement — a band or open grid is one thing. */
export function loose_unit(graph: Graph, id: Id): Id {
  const b = graph.blocks[id];
  if (!b) return id;
  if (is_interface(graph, b.id) && b.parent) return loose_unit(graph, b.parent);
  if (inline(graph, b.parent ?? undefined)) return b.parent!;
  return id;
}
