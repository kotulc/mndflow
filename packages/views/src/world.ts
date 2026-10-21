/** The world: every room of a package composed into one drawing. A room is a block holding blocks;
 *  each is laid out its own way, sized by what it holds and drawn inside its parent, so the room
 *  opened is the drawing seen from outside. Worked out once per graph change, never stored. */

import { children, inline, is_folder, is_tie, layer_of, lens_of, of_ref, on_side, owner_of,
         packages, path, shown_name, type Graph, type Id, type Lists, type Relation, type Side,
         type ViewKind } from "@mnd/core";
import { routes_of } from "./avoid";
import { lines_of, project } from "./block";
import { trail_of } from "./derive";
import { box_of, FRAME, type BoxNode, type CardClass, type Frame, type LineEdge, type Room,
         type Scene, type Slot } from "./scene";
import { perch_id, seat_all, type Perch, type Rect } from "./seat";
import { sized_as, SHAPE, UNIT } from "./size";
import { filled, wide_for } from "./grid";

/** The world: a scene in world coordinates, and its rooms, outermost first. */
export type World = Scene & { rooms: readonly Room[]; root: Id };

export type WorldConfig = {
  /** Whether interfaces draw. */
  interfaces?: boolean;
  /** The side of the package drawn: its structure, or its definitions. */
  lists?: Lists;
  /** How many cards an `auto` room holds across, unless it says its own. */
  across?: number;
};

/** What the rail offers in the world: the palette, the room's layout, making, and relations. */
const WORLD_SLOTS: readonly Slot[] = ["palette", "layer", "make", "relations"];

/** The node type a room draws as. */
export const ROOM = "room";

/** The views a room draws inside the world; any other block is a card. */
const ROOMS: readonly ViewKind[] = ["internal", "allocation", "sequence", "class", "er"];

/** Where blocks off the drawn side are put out of sight. */
const HIDDEN = "@world:hidden";

/** Air left between a grown room and a neighbour it pushed. */
const AIR = UNIT;

type Composed = { scene: Scene; box: Rect; rooms: Room[] };


/** Whether a block is a room in the world: it draws something of its own and is no stand-in. */
export function is_room(graph: Graph, id: Id): boolean {
  if (inline(graph, id) || of_ref(graph, id)) return false;
  return ROOMS.includes(lens_of(graph, id) ?? "folder");
}

/** The room a world of every package draws them all in: the forest above them. */
export const FOREST_ROOM = "@forest";

/** The world of the package under `root`: every room composed bottom up, then the lines between
 *  rooms routed across the whole. With no root, every package its side lists, one under the next
 *  in the forest's room. */
export function world_of(given: Graph, root: Id | null, config: WorldConfig = {}): World {
  if (root === null) return forest_of(given, config);
  const graph = sided(given, config.lists);
  const composed = compose(graph, root, "internal", 0, null, config);
  const rooms = [...composed.rooms].sort((a, b) => a.depth - b.depth);
  const base: Scene = { ...composed.scene, layer: root, trail: trail_of(graph, root) };
  const { frame: _own, ...scene } = with_root(base, root);
  return { ...across(graph, scene, rooms), rooms, root };
}

/** Every package's world in one room, base first, filling toward the canvas's shape as an
 *  `auto` room does. */
function forest_of(graph: Graph, config: WorldConfig): World {
  const tops = packages(graph).filter((p) => on_side(graph, p.id, config.lists));
  const each = tops.map((p) => world_of(graph, p.id, config)).filter((w) => w.rooms[0]);
  const boxes = each.map((w) => ({ id: w.root, w: w.rooms[0]!.w + AIR * 2,
                                   h: w.rooms[0]!.h + AIR * 2 }));
  const spots = new Map(filled(boxes, wide_for(boxes, SHAPE.aspect)).map((p) => [p.id, p]));
  const parts = each.map((w) => {
    const own = w.rooms[0]!;
    const at = spots.get(w.root)!;
    return shifted(w, { x: at.x - own.x, y: at.y - own.y });
  });
  const rooms = parts.flatMap((w) => w.rooms.map((r) => ({
    ...r, depth: r.depth + 1, parent: r.parent ?? FOREST_ROOM })));
  const outer = rooms.filter((r) => r.depth === 1);
  const box = outer.length ? {
    x: Math.min(...outer.map((r) => r.x)) - AIR, y: Math.min(...outer.map((r) => r.y)) - AIR * 2,
    w: Math.max(...outer.map((r) => r.x + r.w)) - Math.min(...outer.map((r) => r.x)) + AIR * 2,
    h: Math.max(...outer.map((r) => r.y + r.h)) - Math.min(...outer.map((r) => r.y)) + AIR * 3,
  } : { x: 0, y: 0, w: UNIT * 14, h: UNIT * 9 };
  const forest: Room = { id: FOREST_ROOM, parent: null, ...box, label: "packages", depth: 0,
                         dx: 0, dy: 0, ports: [], frame: { ...box, label: "packages", ports: [] },
                         bands: [] };
  return {
    layer: null, root: FOREST_ROOM, rooms: [forest, ...rooms],
    nodes: parts.flatMap((w) => w.nodes), edges: parts.flatMap((w) => w.edges),
    perches: parts.flatMap((w) => w.perches), slots: WORLD_SLOTS, trail: [],
  };
}

/** A world moved by `d`: its nodes, its runs and its rooms. */
function shifted(w: World, d: { x: number; y: number }): World {
  return {
    ...w,
    nodes: w.nodes.map((n) => ({ ...n, position: { x: n.position.x + d.x, y: n.position.y + d.y } })),
    edges: w.edges.map((e) => (e.data?.points ? { ...e, data: { ...e.data,
      points: e.data.points.map((p) => ({ x: p.x + d.x, y: p.y + d.y })) } } : e)),
    rooms: w.rooms.map((r) => moved_room(r, d)),
  };
}

/** The graph with what its side does not list put out of sight: each topmost such block, so a
 *  definition's parts still read through. */
function sided(graph: Graph, lists?: Lists): Graph {
  if (!lists) return graph;
  const blocks = { ...graph.blocks };
  for (const b of Object.values(graph.blocks)) {
    const up = b.parent;
    if (on_side(graph, b.id, lists) || (up && !on_side(graph, up, lists))) continue;
    if (up === null) continue;
    blocks[b.id] = { ...b, parent: HIDDEN };
  }
  return { ...graph, blocks };
}

/** One room laid out with every room inside it composed into it, in its own coordinates. */
function compose(graph: Graph, id: Id, kind: ViewKind, depth: number, parent: Id | null,
                 config: WorldConfig): Composed {
  /** A diagram or a grid draws its own inside; only a room seen from inside holds rooms. */
  const inner = kind !== "internal" ? []
    : children_rooms(graph, id).map((c) =>
        ({ id: c, done: compose(graph, c, lens_of(graph, c)!, depth + 1, id, config) }));
  const sizes = new Map(inner.map((c) => [c.id, { w: c.done.box.w, h: c.done.box.h }]));
  const look = { kind, cut: null };
  let scene = sized_as(sizes, () => project(seated(graph, inner), id, {
    room: true, look, ...(config.interfaces === false ? { interfaces: false } : {}),
    ...(config.across ? { across: config.across } : {}) }));
  scene = routed(pushed(graph, scene, id, new Set(sizes.keys())));
  const frame = scene.frame ?? own_box(scene, id);
  const box = { x: frame.x, y: frame.y, w: frame.w, h: frame.h };
  const rooms: Room[] = [room_of(graph, scene, id, depth, parent, frame)];
  const taken = new Set(scene.nodes.map((n) => n.id));
  for (const c of inner) {
    const at = scene.nodes.find((n) => n.id === c.id);
    if (!at) continue;
    const d = { x: at.position.x - c.done.box.x, y: at.position.y - c.done.box.y };
    scene = placed(scene, c.id, at, c.done, d, taken);
    for (const r of c.done.rooms) rooms.push(moved_room(r, d));
  }
  return { scene, box, rooms };
}

/** The rooms a room holds, through its folders, groups and regions, in reading order. */
function children_rooms(graph: Graph, id: Id): Id[] {
  const out: Id[] = [];
  const walk = (at: Id) => {
    for (const b of children(graph, at)) {
      if (is_room(graph, b.id)) out.push(b.id);
      else if (inline(graph, b.id)) walk(b.id);
    }
  };
  walk(id);
  return out;
}

/** The graph with each inner room's ports stated where its own drawing seated them, so the room
 *  around it seats them on the same spot: **a seat is placed once, from inside**. */
function seated(graph: Graph, inner: readonly { id: Id; done: Composed }[]): Graph {
  if (!inner.length) return graph;
  const blocks = { ...graph.blocks };
  for (const { done } of inner) {
    for (const p of done.rooms[0]!.ports) {
      const b = blocks[p.id];
      if (b) blocks[p.id] = { ...b, side: p.side, at: p.at };
    }
  }
  return { ...graph, blocks };
}

/** A room with no frame of its own — an opened grid — is its own node. */
function own_box(scene: Scene, id: Id): Frame {
  const n = scene.nodes.find((x) => x.id === id);
  const b = n ? box_of(n) : { x: 0, y: 0, w: UNIT, h: UNIT };
  return { ...b, label: n?.data.label ?? id, ports: [] };
}

/** What a room is, in its own coordinates: its box, its walls' ports and its regions. */
function room_of(graph: Graph, scene: Scene, id: Id, depth: number,
                 parent: Id | null, frame: Frame): Room {
  /** Its regions, and the folders it draws in place, are stops the camera may focus. */
  const stop = (n: BoxNode) => (n.data.marks.includes("region") && graph.blocks[n.id]?.parent === id)
    || (is_folder(graph, n.id) && layer_of(graph, n.id) === id);
  const bands = scene.nodes.filter(stop).map((n) => ({ id: n.id, ...box_of(n), label: n.data.label }));
  return { id, parent, x: frame.x, y: frame.y, w: frame.w, h: frame.h,
           label: frame.label || shown_name(graph, id), depth, dx: 0, dy: 0,
           ports: frame.ports, frame, bands };
}

function moved_room(r: Room, d: { x: number; y: number }): Room {
  return { ...r, x: r.x + d.x, y: r.y + d.y, dx: r.dx + d.x, dy: r.dy + d.y,
           frame: { ...r.frame, x: r.frame.x + d.x, y: r.frame.y + d.y },
           bands: r.bands.map((b) => ({ ...b, x: b.x + d.x, y: b.y + d.y })) };
}

/** Every line of a room routed inside it, round its cards and the rooms it holds. */
function routed(scene: Scene): Scene {
  const runs = routes_of(scene);
  if (!runs.size) return scene;
  return { ...scene, edges: scene.edges.map((e) => {
    const run = runs.get(e.id);
    return run && e.data && !e.data.points
      ? { ...e, data: { ...e.data, points: run, routed: true } } : e;
  }) };
}

/** In a room placing cards where they were put, a room grown past its card pushes what it now
 *  overlaps right, or down where that lies below it, until nothing overlaps. Drawn, never stored. */
function pushed(graph: Graph, scene: Scene, layer: Id, grown: ReadonlySet<Id>): Scene {
  if (!grown.size || layer_kind(graph, layer) !== "free") return scene;
  const own = (n: BoxNode) => graph.blocks[n.id]?.parent === layer && !n.data.on;
  const boxes = new Map(scene.nodes.filter(own).map((n) => [n.id, box_of(n)]));
  const moved = new Map<Id, { x: number; y: number }>();
  for (let pass = 0; pass < boxes.size; pass++) {
    let changed = false;
    for (const id of grown) {
      const r = boxes.get(id);
      if (!r) continue;
      for (const [other, s] of boxes) {
        if (other === id || !overlap(r, s)) continue;
        const right = s.x + s.w / 2 >= r.x + r.w / 2 || s.y < r.y;
        const to = right ? { x: snap_up(r.x + r.w + AIR), y: s.y }
                         : { x: s.x, y: snap_up(r.y + r.h + AIR) };
        const was = moved.get(other) ?? { x: 0, y: 0 };
        moved.set(other, { x: was.x + to.x - s.x, y: was.y + to.y - s.y });
        boxes.set(other, { ...s, ...to });
        changed = true;
      }
    }
    if (!changed) break;
  }
  if (!moved.size) return scene;
  const by = (n: BoxNode) => moved.get(n.id) ?? (n.data.on ? moved.get(n.data.on) : undefined);
  return { ...scene, nodes: scene.nodes.map((n) => {
    const d = by(n);
    return d ? { ...n, position: { x: n.position.x + d.x, y: n.position.y + d.y } } : n;
  }) };
}

function layer_kind(graph: Graph, id: Id): string {
  const kind = graph.blocks[id]?.settings?.["layout"]?.["kind"];
  return typeof kind === "string" ? kind : "auto";
}

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function snap_up(n: number): number {
  return Math.ceil(n / UNIT) * UNIT;
}

/** The parent's scene with a child room's drawing set in place of its card: the card becomes
 *  the room's node, and what the child drew moves by `d`. An id the world already draws is kept
 *  apart under the room's. */
function placed(scene: Scene, id: Id, card: BoxNode, child: Composed, d: { x: number; y: number },
                taken: Set<Id>): Scene {
  const inner = child.scene;
  const rename = new Map<Id, Id>();
  for (const n of inner.nodes) if (taken.has(n.id)) rename.set(n.id, `${id}::${n.id}`);
  const named = (x: Id) => (x === FRAME ? id : rename.get(x) ?? x);
  const nodes = inner.nodes.map((n): BoxNode => ({
    ...n, id: named(n.id), position: { x: n.position.x + d.x, y: n.position.y + d.y },
    ...(n.data.on ? { data: { ...n.data, on: named(n.data.on) } } : {}),
  }));
  for (const n of nodes) taken.add(n.id);
  const edge_ids = new Set(scene.edges.map((e) => e.id));
  const edges = inner.edges.map((e): LineEdge => ({
    ...e, id: edge_ids.has(e.id) ? `${id}::${e.id}` : e.id,
    source: named(e.source), target: named(e.target),
    ...(e.data?.points ? { data: { ...e.data,
      points: e.data.points.map((p) => ({ x: p.x + d.x, y: p.y + d.y })) } } : {}),
  }));
  const perches: Perch[] = inner.perches.map((p) => ({ ...p, on: named(p.on) }));
  /** The room's node: what the card said of it, and the seats on its walls inside and out. */
  const walls = [...(card.data.seats ?? []), ...(inner.frame?.seats ?? [])];
  const room: BoxNode = {
    ...card, type: ROOM, width: child.box.w, height: child.box.h,
    data: { ...card.data, marks: room_marks(card.data.marks),
            ...(walls.length ? { seats: walls } : {}) },
  };
  /** An opened grid is its own node: it stays, as the room. */
  const own = inner.nodes.some((n) => n.id === id);
  return {
    ...scene,
    nodes: [...scene.nodes.flatMap((n) => (n.id !== id ? [n] : own ? [] : [room])), ...nodes],
    edges: [...scene.edges, ...edges],
    perches: [...scene.perches, ...perches],
  };
}

/** A room keeps what it is, never the face its card drew. */
function room_marks(marks: readonly CardClass[]): CardClass[] {
  return marks.filter((m) => m !== "unnamed");
}

/** The root's own room as a node, as every other room is. */
function with_root(scene: Scene, root: Id): Scene {
  const f = scene.frame;
  if (!f) return scene;
  const room: BoxNode = {
    id: root, type: ROOM, position: { x: f.x, y: f.y }, width: f.w, height: f.h,
    data: { label: f.label, marks: f.holds_parts ? ["container"] : [],
            ...(f.role ? { role: f.role } : {}), ...(f.stamps ? { stamps: f.stamps } : {}),
            ...(f.seats ? { seats: f.seats } : {}) },
    selectable: true, draggable: false,
  };
  return { ...scene,
    nodes: [room, ...scene.nodes],
    edges: scene.edges.map((e) => ({ ...e, source: e.source === FRAME ? root : e.source,
                                           target: e.target === FRAME ? root : e.target })),
    perches: scene.perches.map((p) => (p.on === FRAME ? { ...p, on: root } : p)) };
}

/** The world with the lines between rooms drawn: each relation no room drew, its ends in two
 *  rooms, seated where it leaves each card and routed across the whole, through the walls between. */
function across(graph: Graph, scene: Scene, rooms: readonly Room[]): Scene {
  const drawn = new Set(scene.nodes.map((n) => n.id));
  const lined = new Set(scene.edges.map((e) => e.id));
  const end = (id: Id): Id | null => (drawn.has(id) ? id
    : drawn.has(owner_of(graph, id)) ? owner_of(graph, id) : null);
  const homes = new Set(rooms.map((r) => r.id));
  const cross: Relation[] = [];
  for (const e of Object.values(graph.edges)) {
    if (lined.has(e.id) || is_tie(graph, e.id)) continue;
    const [a, b] = [end(e.from), end(e.to)];
    if (!a || !b || a === b) continue;
    /** A relation inside one room that the room did not draw stays undrawn. */
    if (layer_of(graph, a) === layer_of(graph, b) && homes.has(layer_of(graph, a) ?? "")) continue;
    cross.push({ ...e, from: a, to: b });
  }
  if (!cross.length) return scene;
  const boxes = new Map(scene.nodes.filter((n) => !n.data.on).map((n) => [n.id, box_of(n)]));
  const seating = seat_all(graph, cross, boxes);
  const offered = new Map<Id, { id: string; side: Side; at: number }[]>();
  for (const p of seating.perches) {
    offered.set(p.on, [...(offered.get(p.on) ?? []), { id: perch_id(p.edge, p.end),
                                                       side: p.side, at: p.at }]);
  }
  const nodes = scene.nodes.map((n) => {
    const more = offered.get(n.id);
    return more ? { ...n, data: { ...n.data, seats: [...(n.data.seats ?? []), ...more] } } : n;
  });
  const edges = lines_of(graph, cross, seating);
  const runs = routes_of({ ...scene, nodes, edges, perches: [...scene.perches, ...seating.perches] });
  return {
    ...scene, nodes,
    edges: [...scene.edges, ...edges.map((e) => {
      const run = runs.get(e.id);
      return run && e.data ? { ...e, data: { ...e.data, points: run, routed: true } } : e;
    })],
    perches: [...scene.perches, ...seating.perches],
  };
}

/** The world seen with one room in focus: that room is the frame, its walls and ports editable as
 *  the open layer's, and everything outside it marked so the stage can dim it. A region in focus
 *  focuses the room holding it. */
export function focused(graph: Graph, world: World, focus: Id | null): Scene {
  const room = world.rooms.find((r) => r.id === focus)
    ?? world.rooms.find((r) => r.bands.some((b) => b.id === focus))
    ?? world.rooms[0]!;
  const id = room.id;
  const here = (x: Id) => (x === id ? FRAME : x);
  const up = new Set(path(graph, id).map((b) => b.id).filter((x) => x !== id));
  const inside = (b: Rect) => b.x >= room.x - 1 && b.y >= room.y - 1
    && b.x + b.w <= room.x + room.w + 1 && b.y + b.h <= room.y + room.h + 1;
  const out = new Set<Id>();
  const nodes = world.nodes
    .filter((n) => n.id !== id && !(n.type === "seat" && n.data.on === id))
    .map((n) => {
      const away = !inside(box_of(n));
      if (away) out.add(n.id);
      const className = up.has(n.id) ? "mnd-anc" : away ? "mnd-out" : undefined;
      return className ? { ...n, className } : n;
    });
  const edges = world.edges.map((e) => {
    const source = here(e.source);
    const target = here(e.target);
    const away = out.has(e.source) && out.has(e.target);
    return { ...e, source, target, ...(away ? { className: "mnd-out" } : {}) };
  });
  const perches = world.perches.map((p) => (p.on === id ? { ...p, on: FRAME } : p));
  const seats = world.nodes.find((n) => n.id === id)?.data.seats;
  return {
    exits: exits_of(world, room, out),
    layer: id,
    frame: { ...room.frame, ...(seats?.length ? { seats } : {}) },
    nodes, edges, perches,
    rooms: world.rooms,
    slots: WORLD_SLOTS,
    trail: trail_of(graph, room.id === focus ? id : focus ?? id),
  };
}

/** Where each line with one end inside the room leaves through its walls, and the words its seat
 *  says there: which way, what it reaches, and the line's name. */
function exits_of(world: World, room: Room, out: ReadonlySet<Id>) {
  /** A port is named by the card it sits on. */
  const by = new Map(world.nodes.map((n) => [n.id, n]));
  const labels = new Map(world.nodes.map((n) => [n.id,
    n.data.on && by.has(n.data.on) ? by.get(n.data.on)!.data.label : n.data.label]));
  const found: { id: string; x: number; y: number; side: Side; text: string }[] = [];
  for (const e of world.edges) {
    const run = e.data?.points;
    if (!run || run.length < 2 || e.source === room.id || e.target === room.id) continue;
    const leaves = !out.has(e.source) && out.has(e.target);
    const enters = out.has(e.source) && !out.has(e.target);
    if (!leaves && !enters) continue;
    const at = crossing(run, room);
    if (!at) continue;
    const far = labels.get(leaves ? e.target : e.source) ?? "";
    const name = typeof e.label === "string" ? e.label : "";
    found.push({ id: e.id, ...at,
                 text: `${leaves ? "→" : "←"} ${far}${name ? ` · ${name}` : ""}` });
  }
  return found;
}

/** Where a run first crosses a box's walls, and which wall. */
function crossing(run: readonly { x: number; y: number }[], box: Rect)
    : { x: number; y: number; side: Side } | null {
  const within = (p: { x: number; y: number }) => p.x >= box.x && p.x <= box.x + box.w
    && p.y >= box.y && p.y <= box.y + box.h;
  for (let i = 1; i < run.length; i++) {
    const [a, b] = [run[i - 1]!, run[i]!];
    if (within(a) === within(b)) continue;
    /** A square leg crosses one wall: the one its fixed coordinate lies across. */
    if (a.y === b.y) {
      const x = within(a) === (b.x > a.x) ? box.x + box.w : box.x;
      return { x, y: a.y, side: x === box.x ? "left" : "right" };
    }
    const y = within(a) === (b.y > a.y) ? box.y + box.h : box.y;
    return { x: a.x, y, side: y === box.y ? "top" : "bottom" };
  }
  return null;
}

/** The room a block draws in, in the world: its nearest room ancestor. */
export function room_at(world: World, graph: Graph, id: Id): Room | null {
  const rooms = new Map(world.rooms.map((r) => [r.id, r]));
  for (const b of [...path(graph, id)].reverse()) if (rooms.has(b.id)) return rooms.get(b.id)!;
  return null;
}


/** The innermost room under a point of the world. */
export function room_under(rooms: readonly Room[], at: { x: number; y: number }): Room | null {
  return rooms.filter((r) => at.x >= r.x && at.x <= r.x + r.w && at.y >= r.y && at.y <= r.y + r.h)
    .sort((a, b) => b.depth - a.depth)[0] ?? null;
}

/** The room a block lives in: its nearest ancestor that is a room. */
export function home_of(graph: Graph, rooms: readonly Room[], id: Id): Room | null {
  const by = new Map(rooms.map((r) => [r.id, r]));
  const up = path(graph, id).map((b) => b.id).filter((x) => x !== id).reverse();
  for (const at of up) if (by.has(at)) return by.get(at)!;
  return null;
}

/** A point of the world as its room's own drawing places it. */
export function local_at(room: Room, at: { x: number; y: number }): { x: number; y: number } {
  return { x: at.x - room.dx, y: at.y - room.dy };
}

/** One room of a world scene as its own drawing: what lives in it, in its own coordinates, the
 *  room as the frame — what an adjustment there is read against. */
export function local_scene(graph: Graph, scene: Scene, room: Room): Scene {
  const rooms = scene.rooms ?? [];
  const lives = (n: BoxNode) => {
    /** A seat lives where the card it sits on does. */
    const id = n.data.on ?? n.id;
    return (graph.blocks[id] ? home_of(graph, rooms, id)?.id : undefined) === room.id;
  };
  const here = (x: Id) => (x === room.id ? FRAME : x);
  const nodes = scene.nodes.filter((n) => n.id !== room.id && lives(n)).map((n) => ({
    ...n, position: local_at(room, n.position) }));
  return {
    ...scene, layer: room.id, nodes,
    frame: { ...room.frame, ...local_at(room, room.frame) },
    edges: scene.edges.map((e) => ({ ...e, source: here(e.source), target: here(e.target) })),
    perches: scene.perches.map((p) => (p.on === room.id ? { ...p, on: FRAME } : p)),
  };
}
