/** What a canvas adjustment writes: the actions and positional changes it comes to. */

import { adjustments, can_hold, is_grid, is_group, type Args, type Graph, type Id,
         type Mutation } from "@mnd/core";
import { box_of, extent_of, nearest_seat, snap, tidy, BLOCK, PORT, type Scene } from "@mnd/views";
import type { Adjust } from "./gestures";

/** One write: a said action, or an unsayable adjustment. */
export type Move =
  | { act: string; args: Args }
  | { adjust: "place" | "size" | "seat"; mutations: Mutation[] };

type At = { x: number; y: number };


/** Every write one adjustment makes, in order; the host runs them as one step. */
export function moves_of(graph: Graph, scene: Scene, a: Adjust): Move[] {
  /** A card dropped on a card is a move into it, and places nothing. */
  if (a.kind === "move" && a.over && a.over !== a.on) {
    return [act("move", { id: a.on, parent: a.over })];
  }
  const out: Move[] = [];
  /** Moving anything by hand on a `grid` layer hands it to `free`, keeping the grid's positions. */
  const layer = scene.layer;
  const arranged = graph.blocks[layer ?? graph.root]?.arrangement ?? "free";
  if (arranged === "grid" && ["place", "move", "wall-seat"].includes(a.kind)) {
    out.push(act("arrange", { layer, arrangement: "free", at: tidy(graph, layer) }));
  }
  return [...out, ...written(graph, scene, a)];
}

function act(name: string, args: Args): Move {
  return { act: name, args };
}

/** Where a hand-placed thing comes to rest: on the lattice. */
function placed(id: Id, to: At): Move {
  return { adjust: "place", mutations: adjustments.place([{ id, x: snap(to.x), y: snap(to.y) }]) };
}

/** The writes for one adjustment, before any change of arrangement. */
function written(graph: Graph, scene: Scene, a: Adjust): Move[] {
  /** A corner dragged sizes the card and moves it where a left or top handle moved. */
  if (a.kind === "size") {
    /** A grid is sized in cells, never in pixels. */
    if (is_grid(graph, a.on)) {
      return [act("group", { into: a.on, ...extent_of(a.w, a.h),
                             spot: { x: snap(a.to.x), y: snap(a.to.y) } })];
    }
    return [{ adjust: "size", mutations: adjustments.size(a.on, a.w, a.h) }, placed(a.on, a.to)];
  }
  if (a.kind === "wall-seat") {
    return [{ adjust: "seat", mutations: adjustments.seat(a.on, a.side, a.at) }];
  }
  if (a.kind === "wall") {
    return graph.blocks[a.to] ? [act("relink", { id: a.on, end: a.end, to: a.to })] : [];
  }
  /** Several cards put down at once. */
  if (a.kind === "place") {
    return [{ adjust: "place", mutations: adjustments.place(
      a.at.map((p) => ({ id: p.id, x: snap(p.to.x), y: snap(p.to.y) }))) }];
  }
  /** A seated interface slides along its card, read from the port's middle. */
  const drawn = scene.nodes.find((n) => n.id === a.on);
  const host = drawn?.data.on ? scene.nodes.find((n) => n.id === drawn.data.on) : null;
  if (host) {
    const seat = nearest_seat(box_of(host), { x: a.to.x + PORT.w / 2, y: a.to.y + PORT.h / 2 });
    return [{ adjust: "seat", mutations: adjustments.seat(a.on, seat.side, seat.at) }];
  }

  const held = (graph.blocks[a.on] ?? graph.holders[a.on])?.group ?? null;
  const here = a.cell ? a.into : group_at(scene, a.to, drawn ? box_of(drawn) : BLOCK, held);
  const seat = a.cell && here
    ? act("seat", { id: a.on, group: here, at: `${a.cell.r},${a.cell.c}` }) : null;

  /** A group is placed by its members, unless it joins or leaves a holder. */
  if (is_group(graph, a.on)) {
    if (seat) return [seat];
    if (here && here !== a.on && can_hold(graph, here, a.on)) {
      return held !== here ? [act("group", { members: [a.on], into: here })] : [];
    }
    if (held && held === here) return [];
    if (held && !here) return [act("leave", { ids: [a.on] }), placed(a.on, a.to)];
    return [placed(a.on, a.to)];
  }

  /** Where a block came to rest says which group or cell it is in. */
  if (seat) return [placed(a.on, a.to), seat];
  if (held === here) return [placed(a.on, a.to)];
  return [placed(a.on, a.to),
          here ? act("group", { members: [a.on], into: here }) : act("leave", { ids: [a.on] })];
}

/** Which group a drop joins, read from where the block's middle came to rest. */
function group_at(scene: Scene, to: At, size: { w: number; h: number }, held: Id | null): Id | null {
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
    .filter((n) => n.type === "group" && n.id !== held && inside(n))
    .sort((a, b) => (b.data.nest ?? 0) - (a.data.nest ?? 0));
  return groups[0]?.id ?? null;
}
