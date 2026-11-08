/** What a canvas adjustment writes: the actions it comes to. **A drag never places a card; it
 *  reorders or files**: a region along its band line, a sequence step along its column, a card
 *  into or out of a group's panel, into another region, holder or cell, or else along its band.
 *  Dropped where it was, it writes nothing, and the drawing puts it back. */

import { adjustments, can_hold, children, grid_of, groups_of, heading, inline, is_group,
         is_holder, is_region, lattice_of, part_end, type Args, type Graph, type Id,
         type Mutation } from "@mnd/core";
import { box_of, extent_in, nearest_seat, snap, taken_on, BLOCK, PORT,
         type Scene } from "@mnd/views";
import type { Adjust } from "./gestures";

/** One write: a said action, or an unsayable adjustment. */
export type Move =
  | { act: string; args: Args }
  | { adjust: "place" | "size" | "seat"; mutations: Mutation[] };

type At = { x: number; y: number };


/** Every write one adjustment makes, in order; the host runs them as one step. */
export function moves_of(graph: Graph, scene: Scene, a: Adjust): Move[] {
  /** **A sequence step moves along its column**, never into a card or another column. */
  if (a.kind === "move" && is_step(graph, scene, a.on)) {
    return a.into === scene.lifelines && a.cell ? [act("move_step", { id: a.on, row: a.cell.r })]
      : [];
  }
  /** Into or out of a group's panel first: a card dropped on a member joins, never files in. */
  const joins = a.kind === "move" ? membership(graph, scene, a) : [];
  if (joins.length) return joins;
  /** A card dropped on a card is a move into it, and places nothing. */
  if (a.kind === "move" && a.over && a.over !== a.on) {
    return [act("move", { id: a.on, parent: a.over })];
  }
  /** A region dragged along its band line is reordered among the regions, never placed. */
  if (a.kind === "move" && is_region(graph, a.on)) {
    return restacked(graph, scene, a.on, a.to, a.pointer);
  }
  /** A group's panel is its members' bounds: it is never dragged anywhere. */
  if (a.kind === "move" && is_group(graph, a.on)) return [];
  return written(graph, scene, a);
}

function act(name: string, args: Args): Move {
  return { act: name, args };
}

/** The writes for one adjustment. */
function written(graph: Graph, scene: Scene, a: Adjust): Move[] {
  /** A corner dragged sizes the card and moves it where a left or top handle moved. */
  if (a.kind === "size") {
    /** A grid is sized in cells, never in pixels; opened, it keeps its place on its layer. */
    const g = lattice_of(graph, a.on);
    if (g) {
      const spot = a.on === scene.layer ? {} : { spot: { x: snap(a.to.x), y: snap(a.to.y) } };
      return [act("group", { into: a.on, ...extent_in(g, a.w, a.h), ...spot })];
    }
    return [{ adjust: "size", mutations: adjustments.size(a.on, a.w, a.h) }];
  }
  if (a.kind === "wall-seat") {
    return [{ adjust: "seat", mutations: adjustments.seat(graph, a.on, a.side, a.at) }];
  }
  if (a.kind === "wall") {
    return graph.blocks[part_end(graph, a.to).block]
      ? [act("relink", { id: a.on, end: a.end, to: a.to })] : [];
  }
  /** Several cards put down at once stay where the layout puts them. */
  if (a.kind === "place") return [];
  /** A seated interface slides along its card, read from the port's middle. */
  const drawn = scene.nodes.find((n) => n.id === a.on);
  const host = drawn?.data.on ? scene.nodes.find((n) => n.id === drawn.data.on) : null;
  if (host) {
    const seat = nearest_seat(box_of(host), { x: a.to.x + PORT.w / 2, y: a.to.y + PORT.h / 2 },
                              taken_on(scene, host.id, a.on));
    return [{ adjust: "seat", mutations: adjustments.seat(graph, a.on, seat.side, seat.at) }];
  }

  const held = grid_of(graph, a.on)?.id ?? null;
  const here = a.cell ? a.into : group_at(graph, scene, a.to, drawn ? box_of(drawn) : BLOCK, held);
  const at = a.cell ? `${a.cell.r},${a.cell.c}` : "";
  /** Leaving a holder is moving onto the layer itself. */
  const layer = scene.layer ?? graph.root;
  const into = (parent: Id, cell = "") =>
    act("move", { ids: [a.on], parent, ...(cell ? { at: cell } : {}) });

  /** A holder may go into or out of another. */
  if (is_holder(graph, a.on)) {
    if (here && here !== held && can_hold(graph, here, a.on)) return [into(here, at)];
    if (held && held === here) return a.cell ? [into(here, at)] : [];
    if (held && !here) return [into(layer)];
    return [];
  }

  const mid = { x: a.to.x + (drawn ? box_of(drawn) : BLOCK).w / 2,
                y: a.to.y + (drawn ? box_of(drawn) : BLOCK).h / 2 };

  /** Where a block came to rest says which holder or cell it is in: a cell, header or body. */
  if (a.cell && here) return [into(here, at)];
  /** In an opened grid there is nowhere off the lattice: it stays in its cell. */
  if (held && held === layer) return [];
  /** Off every box is on the layer; where it already sits it moves along its band instead. */
  const home = here ?? layer;
  const parent = graph.blocks[a.on]?.parent ?? null;
  if (home !== parent) return [into(home)];
  /** A grid's blocks sit by their cells, never in an order. */
  return lattice_of(graph, home) ? [] : reordered(graph, scene, a.on, home, mid);
}

/** **A group is joined or left by its panel**: a card coming to rest on a panel it is not in
 *  joins that group; one leaving a panel it was in leaves it. That is the whole drop. Nothing for
 *  a holder, an interface, a step or a drop into a cell. */
function membership(graph: Graph, scene: Scene, a: Extract<Adjust, { kind: "move" }>): Move[] {
  const drawn = scene.nodes.find((n) => n.id === a.on);
  if (!drawn || drawn.data.on || a.cell || is_holder(graph, a.on) || is_group(graph, a.on)
      || is_step(graph, scene, a.on)) {
    return [];
  }
  const b = box_of(drawn);
  const on = panels_at(graph, scene, { x: a.to.x + b.w / 2, y: a.to.y + b.h / 2 });
  const mine = groups_of(graph, a.on);
  const joined = on.find((g) => !mine.includes(g));
  if (joined) return [act("group", { members: [a.on], into: joined })];
  return mine.filter((g) => !on.includes(g) && scene.nodes.some((n) => n.id === g))
    .map((g) => act("unmember", { id: a.on, from: g }));
}

/** **A card along its band**, dropped in a gap: put before the first sibling card, as drawn, whose
 *  middle lies past its own — down a column, across a row, else in reading order. Nothing where
 *  its place is unchanged. */
function reordered(graph: Graph, scene: Scene, id: Id, parent: Id, mid: At): Move[] {
  const along = (p: At) => (scene.across === undefined ? p.y * 1e4 + p.x
    : scene.across ? p.y : p.x);
  const middle = (n: Scene["nodes"][number]) => {
    const b = box_of(n);
    return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  };
  const drawn = new Map(scene.nodes.map((n) => [n.id, n]));
  /** Its own band only — the run of siblings between regions holding it — read as drawn,
   *  which a band's lines may rank away from the list. */
  const list = children(graph, parent).map((b) => b.id);
  const at = list.indexOf(id);
  let [lo, hi] = [at, at + 1];
  while (lo > 0 && !is_region(graph, list[lo - 1]!)) lo--;
  while (hi < list.length && !is_region(graph, list[hi]!)) hi++;
  const run = list.slice(lo, hi);
  const cards = run.filter((s) => s !== id && drawn.has(s) && !inline(graph, s)
    && !is_group(graph, s))
    .sort((p, q) => along(middle(drawn.get(p)!)) - along(middle(drawn.get(q)!)));
  const before = cards.find((c) => along(middle(drawn.get(c)!)) > along(mid)) ?? null;
  const next = list.slice(at + 1).find((s) => cards.includes(s)) ?? null;
  if (before === next) return [];
  return [act("move", { ids: [id], parent, ...(before ? { before } : {}) })];
}

/** **A region along the band line**: before the first other region whose middle along it lies past
 *  the pointer — else the dragged region's middle — else last. Loose blocks are never a landing
 *  place. */
function restacked(graph: Graph, scene: Scene, id: Id, to: At, pointer?: At): Move[] {
  const parent = graph.blocks[id]?.parent;
  const drawn = scene.nodes.find((n) => n.id === id);
  if (!parent || !drawn) return [];
  const b = box_of(drawn);
  const across = !!scene.across;
  const at = pointer ?? { x: to.x + b.w / 2, y: to.y + b.h / 2 };
  const mid = across ? at.x : at.y;
  const regions = children(graph, parent).filter((r) => r.id !== id && is_region(graph, r.id))
    .flatMap((r) => scene.nodes.filter((n) => n.id === r.id));
  const centre = (n: Scene["nodes"][number]) => {
    const r = box_of(n);
    return across ? r.x + r.w / 2 : r.y + r.h / 2;
  };
  const before = regions.filter((n) => centre(n) > mid).sort((p, q) => centre(p) - centre(q))[0];
  const siblings = children(graph, parent).filter((r) => is_region(graph, r.id)).map((r) => r.id);
  const next = siblings[siblings.indexOf(id) + 1] ?? null;
  if ((before?.id ?? null) === next) return [];
  return [act("move", { ids: [id], parent, ...(before ? { before: before.id } : {}) })];
}

/** Whether a block is a sequence step: in the body of the grid whose columns are lifelines. */
function is_step(graph: Graph, scene: Scene, id: Id): boolean {
  const b = graph.blocks[id];
  return !!scene.lifelines && b?.parent === scene.lifelines && !!b.cell
    && !heading(b.cell.r, b.cell.c);
}

/** The group panels under a point, any depth. */
function panels_at(graph: Graph, scene: Scene, p: At): Id[] {
  return scene.nodes.filter((n) => is_group(graph, n.id)).filter((n) => {
    const b = box_of(n);
    return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  }).map((n) => n.id);
}

/** Which region, folder or grid a drop joins, read from where the block's middle came to rest; a
 *  group's panel is joined by its tag instead (`panels_at`). */
function group_at(graph: Graph, scene: Scene, to: At, size: { w: number; h: number },
                  held: Id | null): Id | null {
  const cx = to.x + size.w / 2;
  const cy = to.y + size.h / 2;
  const inside = (n: Scene["nodes"][number]) => {
    const b = box_of(n);
    return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;
  };
  /** The group it is already in keeps it while it stays inside. */
  const band = held ? scene.nodes.find((n) => n.id === held) : undefined;
  if (band && inside(band)) return held;
  const groups = scene.nodes
    .filter((n) => n.type === "group" && n.id !== held && !is_group(graph, n.id) && inside(n))
    .sort((a, b) => (b.data.nest ?? 0) - (a.data.nest ?? 0));
  return groups[0]?.id ?? null;
}
