/** **The tree view** (docs/design/chip.md): the map (the world root), a model's overview (a
 *  model root) and an entered folder, each one treemap of containment that fills its space, what
 *  is open as **boxes** and what is closed as **chips**. **A chip is a card's header over a
 *  well**: its children as a quiet treemap one level deep, each named where it has room.
 *  **Landscape-biased**: laid at half width, then stretched, so names read across. **Opened from
 *  the top**: every box starts closed and opens, wide before deep, while the view keeps within its
 *  chip budget and every chip holds its name. A click selects; two read what was clicked (core's
 *  `read_at`). Worked out on every graph change, never stored. */

import { hierarchy, treemap, treemapSquarify, type HierarchyNode,
         type HierarchyRectangularNode as Tiled } from "d3-hierarchy";
import { base_of, children, diagram_kind, filed, is_aside, is_behaviour, is_folder,
         is_group, is_holder, is_interface, is_model, is_reference, lens_of, owner_of, on_side,
         packages, path, shown_name, used_model, type Graph, type Id } from "@mnd/core";
import { colour_of, kind_of } from "./about";
import { counted, fact, facts_of, total, type Facts } from "./facts";
import { carried, trail_of } from "./derive";
import { name_of } from "./library";
import { look_of, tint_attrs } from "./look";
import { box_of, cell, type Area, type BoxNode, type ChipCell, type InnerTile,
         type Scene } from "./scene";
import { layer_tree, members, model_tree, parts_of, type Branch } from "./tree";
import { around, zone_room, zones_of } from "./overview";
import { CANVAS } from "./size";

/** The area every map is drawn in. */
export const MAP_ROOT = "@map";


/** The room each chip is given on average before a map grows past its canvas — about two names
 *  square. Goes once grouping keeps every view within its budget. */
const ROOM = 128 * 128;

/** **Landscape bias**: cells are laid in a space `K` times narrower, then stretched back, so they
 *  come out wider than tall and every name reads across. */
const K = 2;

/** **Gaps**, each the same everywhere and never scaled per chip: between the root's cells, between
 *  any other two (halved down, by the bias), round what a box holds, and the room a box's header
 *  takes over it (theme `face.css` `.mnd-header`, at 13px, with its padding). */
const AIR = { major: 24, inner: 8, outer: 6, title: 46 };

/** **The least a chip is laid at**: a name's room, the header's two lines with the chip's
 *  padding. A chip with no room for a well says only its counts. */
export const FLOOR = { w: 96, h: 48 };

/** **A chip laid too small is weighed up** `RAISE` times a round, for at most `ROUNDS` rounds,
 *  before its level stays closed: squarify can lay a light chip short and wide. */
const RAISE = 2;
const ROUNDS = 6;

/** **A chip's name grows with its cell**, continuously: its size in pixels from the root of its
 *  laid area, held between the least and the most. */
const NAME = { least: 11, most: 20, per: 13 };

/** **A chip's room** (theme `flow.css` `.mnd-chip`): its padding over the header, the gap under
 *  it, the air round its well and under it, the least well worth drawing, the well's inset round
 *  its cells. */
const CHIP = { top: 8, gap: 8, side: 26, foot: 9, well: 26, inset: 8 };

/** **Every child in a well is named**, its name shrunk to fit its cell (a monospace character is
 *  `char` of its size across, the line with its padding `line` of it down), between the least and
 *  the most; where even the least is too long, cut short. */
const NAMED = { least: 8, most: 10.5, char: 0.6, pad: 0.45, line: 1.8, right: 4 };

/** The least share of the canvas a model's middle keeps, each way, beside its zones and About. */
const KEEP = 0.7;

/** How many grades a well's cells step through (stage `flow.css` *The well*). */
const GRADES = 4;

/** **The least a chip weighs**, in shares of the budget: one share is a legible chip's room, the
 *  other the headers and air of the boxes round it. */
const SHARES = 2;

/** **A legible chip's room**: the least chip that holds — its header at the least name over the
 *  least well — with the air beside and below it. */
const LEGIBLE = { w: FLOOR.w + AIR.inner,
                  h: CHIP.top + head_h(NAME.least) + CHIP.gap + CHIP.well + CHIP.foot + AIR.inner };

/** One entry of a tree: a box of what it holds, or a chip entering `block`, holding `held` (a
 *  definition's: its uses). A box carries the chip it closes into. */
type Leaf = { id: Id; kids?: Leaf[]; value?: number; panel?: boolean;
              /** A box the view makes, named here (a registry's place). */
              label?: string;
              /** A box of a model's overview that opens and closes, and how it stands now. */
              toggle?: "open" | "closed";
              /** What a box closes into, where it may close. */
              closed?: Leaf;
              chip?: { block: Id; held: readonly Id[]; kind?: string } };


/** A section's map: the library's for its definitions, else the models'. */
export function section_map(graph: Graph, lists?: "domain" | "structure",
                            tree?: readonly Branch[]): Scene {
  return lists === "domain" ? library_map(graph) : model_map(graph, tree);
}

/** **The models' map, the world root**: the models' tree (`tree.ts`) laid out — every package
 *  holding a model, its folders, and each model open one level. */
export function model_map(graph: Graph, tree: readonly Branch[] = model_tree(graph)): Scene {
  return mapped(graph, { id: MAP_ROOT, kids: tree.map(leaf_of(graph)) }, "models");
}

/** **A treemap diagram is its map**: what it holds, laid as the models' map lays it — read only,
 *  each chip entered. **A model's is its overview** (docs/diagrams/tree.md), a use of a model
 *  its model's read through: its parts by containment, each box in `open` open and the rest
 *  closed chips, context's zones round them and About below (`overview.ts`). */
export function layer_map(graph: Graph, layer: Id, open?: readonly Id[],
                          keep?: Id | null): Scene {
  const model = used_model(graph, layer);
  if (!model) {
    const kids = layer_tree(graph, layer).map(leaf_of(graph));
    const top = is_folder(graph, layer) ? [framed(layer, kids)] : kids;
    return { ...mapped(graph, { id: MAP_ROOT, kids: top }, "models", layer), layer,
             trail: trail_of(graph, layer) };
  }
  const zones = zones_of(graph, layer_tree(graph, layer).map((b) => b.id));
  const shown = new Set(open ?? opened(graph, layer, model));
  /** A box or a chip that can hold something opens and closes; a group's panel never does, and
   *  a reference stands for what is drawn elsewhere. */
  const toggled = (b: Branch): Leaf => {
    const opens = b.as !== "group" && !is_reference(graph, b.id)
      && (b.as === "box" || b.held.length > 0);
    const leaf = leaf_of(graph)(b);
    return { ...leaf,
             ...(opens ? { toggle: b.as === "box" ? "open" as const : "closed" as const } : {}),
             ...(leaf.closed ? { closed: { ...leaf.closed, toggle: "closed" as const } } : {}),
             ...(b.as !== "chip" ? { kids: b.kids.map(toggled) } : {}) };
  };
  const kids = layer_tree(graph, layer, shown).filter((b) => !zones.has(b.id)).map(toggled);
  /** The middle keeps at least `KEEP` of the canvas each way, however much stands round it. */
  const less = zone_room(zones);
  const room = { w: Math.max(CANVAS.w * KEEP, CANVAS.w - less.w),
                 h: Math.max(CANVAS.h * KEEP, CANVAS.h - less.h) };
  const middle = mapped(graph, { id: MAP_ROOT, kids }, "models", keep, room);
  return { ...around(graph, model, layer, middle, zones), layer, trail: trail_of(graph, layer) };
}

/** **The boxes a model's overview starts open**: its file's `open:`, else its primary parts —
 *  each holding parts of its own. */
export function opened(graph: Graph, layer: Id, model: Id): Id[] {
  return graph.blocks[model]?.open ?? layer_tree(graph, layer)
    .filter((b) => holds_parts(graph, b.shows)).map((b) => b.id);
}

/** **What a block weighs**: the square root of what it holds, never how often it is joined. */
function weight(graph: Graph, held: readonly Id[]): number {
  return Math.sqrt(1 + (held.length ? total(counted(graph, held)) : 0));
}

/** A branch of a tree as the map lays it: a box its cells, closing into a chip of what it holds;
 *  a group a panel over its members; a chip as heavy as what it holds. */
function leaf_of(graph: Graph): (b: Branch) => Leaf {
  const chip = (b: Branch): Leaf => {
    const kind = kind_of(graph, b.shows);
    return { id: b.id, value: weight(graph, b.held),
             chip: { block: b.shows, held: b.held, ...(kind && kind !== "block" ? { kind } : {}) } };
  };
  const leaf = (b: Branch): Leaf => {
    if (b.as === "group") return { id: b.id, kids: b.kids.map(leaf), panel: true };
    if (b.as === "box") return { id: b.id, kids: b.kids.map(leaf), closed: chip(b) };
    return chip(b);
  };
  return leaf;
}

/** **The library's map**: every package's folders as boxes, each definition a chip of its parts —
 *  what it holds, never where it is used (the tray's usages) — its counts still saying its uses;
 *  a folder says how many definitions it files (views `facts_of`). **Entered at a folder**
 *  (`root`), the same map rooted at it, the folder framed round what it holds. A folder filing no
 *  definition, at any depth, is the models'. */
export function library_map(graph: Graph, root?: Id): Scene {
  const entry = (id: Id): Leaf | null => {
    if (!graph.blocks[id]?.def) {
      const kids = filed(graph, id).map(entry).filter((k): k is Leaf => !!k);
      return kids.length ? framed(id, kids) : null;
    }
    const parts = parts_of(graph, id);
    return { id, value: weight(graph, parts), chip: { block: id, held: parts } };
  };
  const tops = (root ? [root] : packages(graph).map((p) => p.id)).map(entry)
    .filter((k): k is Leaf => !!k);
  const map = mapped(graph, { id: MAP_ROOT, kids: tops }, "library", root);
  return root ? { ...map, layer: root, trail: trail_of(graph, root) } : map;
}

/** **A folder's box**: what it holds, closing into a chip as heavy as how many it holds. Entered,
 *  it frames its view, as the map frames a package — opened as by hand (`mapped`'s `keep`). */
function framed(id: Id, kids: Leaf[]): Leaf {
  return { id, kids, closed: { id, value: Math.sqrt(1 + kids.length),
                               chip: { block: id, held: kids.map((k) => k.id) } } };
}

/** The map gone to `focus`: its area, else its nearest area above it, is the map's layer; the
 *  trail is the block's. Nothing lights for it: only what is picked does. */
export function map_focus(graph: Graph, map: Scene, focus: Id | null): Scene {
  const at = area_of(graph, map, focus);
  return { ...map, layer: at?.id ?? null, trail: trail_of(graph, focus) };
}

/** A block's area on a map: its own, else the nearest area above it. */
export function area_of(graph: Graph, map: Scene, id: Id | null): Area | null {
  const areas = new Map((map.areas ?? []).map((a) => [a.id, a]));
  for (const b of [...path(graph, id ?? graph.root)].reverse()) {
    const at = areas.get(b.id);
    if (at) return at;
  }
  return null;
}

/** The innermost area under a point of a map. */
export function area_under(areas: readonly Area[], at: { x: number; y: number }): Area | null {
  return areas.filter((r) => at.x >= r.x && at.x <= r.x + r.w && at.y >= r.y && at.y <= r.y + r.h)
    .sort((a, b) => b.depth - a.depth)[0] ?? null;
}

/** The nearest area one way from `from` — never one round it or inside it: of the areas whose
 *  centre lies that way, the one least far along and across, across counting twice. */
export function towards(areas: readonly Area[], from: Id,
                        way: "left" | "right" | "up" | "down"): Area | null {
  const by = new Map(areas.map((r) => [r.id, r]));
  const at = by.get(from);
  if (!at) return null;
  /** Whether `a` holds `b`, at any depth. */
  const holds = (a: Id, b: Area) => {
    for (let r: Area | undefined = b; r; r = r.parent ? by.get(r.parent) : undefined) {
      if (r.parent === a) return true;
    }
    return false;
  };
  const mid = (r: Area) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const o = mid(at);
  const score = (r: Area) => {
    const c = mid(r);
    const [along, across] = way === "left" ? [o.x - c.x, c.y - o.y]
      : way === "right" ? [c.x - o.x, c.y - o.y]
      : way === "up" ? [o.y - c.y, c.x - o.x] : [c.y - o.y, c.x - o.x];
    return along > 0 ? along + 2 * Math.abs(across) : Infinity;
  };
  const near = areas.filter((r) => r.id !== from && r.id !== MAP_ROOT && !holds(r.id, at)
    && !holds(from, r)).map((r) => ({ r, s: score(r) })).filter((x) => x.s < Infinity)
    .sort((a, b) => a.s - b.s);
  return near[0]?.r ?? null;
}


/** Whether a block holds parts of its own — never only its behaviours, interfaces, groups or
 *  notes; never a folder, band or group itself. What makes a part primary, on the map and in an
 *  entered diagram (`layer.ts` `ranked`). */
export function holds_parts(graph: Graph, id: Id): boolean {
  return !is_folder(graph, id) && !is_holder(graph, id)
    && children(graph, id).some((c) => !is_behaviour(graph, c.id) && !is_interface(graph, c.id)
      && !is_group(graph, c.id) && !is_aside(graph, c.id));
}

/** **What kind of cell a block is** (docs/design/chip.md): an actor or an external by its kind;
 *  a diagram by its structure (never a model); a folder or package; else whether it holds
 *  anything. */
export function cell_of(graph: Graph, id: Id, holds: boolean): ChipCell {
  const base = base_of(graph, id);
  if (base === "actor" || base === "external") return base;
  if (!is_model(graph, id) && diagram_kind(graph, id) && lens_of(graph, id, "structure")) {
    return "diagram";
  }
  if (is_folder(graph, id) || (graph.blocks[id] && graph.blocks[id]!.parent === null)) {
    return "folder";
  }
  return holds ? "holds" : "leaf";
}

/** **A view's chip budget**: as many legible chips (`LEGIBLE`) as its room holds — never a
 *  fixed count. */
export function budget(room: { w: number; h: number }): number {
  return Math.max(1, Math.floor((room.w * room.h) / (LEGIBLE.w * LEGIBLE.h)));
}

/** **A map opened from the top, a level at a time**: every box that can close starts closed;
 *  the next level of boxes is opened together — what holds the box opened by hand (`keep`) first,
 *  then what is preferred, then the shallowest (`ranked`) — and kept open only while the view's
 *  chips stay within its `budget` and every chip is laid legible (`FLOOR`), a chip laid too small
 *  weighed up `RAISE` times a round for at most `ROUNDS` rounds; else that level stays closed.
 *  What holds `keep` always opens. Decided from the laid shape, never the zoom. */
function mapped(graph: Graph, tree: Leaf, title: "library" | "models",
                keep?: Id | null, room: { w: number; h: number } = CANVAS): Scene {
  const most = budget(room);
  const rank = ranked(graph, tree, keep);
  const open = new Set<Leaf>();
  const shut = new Set<Leaf>();
  let raised = new Map<Id, number>();
  let laid = laid_out(viewed(tree, open), room, raised);
  for (let next = level(tree, open, shut, rank); next.length;
       next = level(tree, open, shut, rank)) {
    for (const n of next) open.add(n);
    const forced = rank.get(next[0]!)!.tier === 0;
    const tried = viewed(tree, open);
    const fits = forced || chips(tried) <= most;
    const up = new Map(raised);
    let at = fits ? laid_out(tried, room, up) : null;
    for (let round = 0; at && !forced && small(at).length && round < ROUNDS; round++) {
      for (const n of small(at)) up.set(n.data.id, (up.get(n.data.id) ?? 1) * RAISE);
      at = laid_out(tried, room, up);
    }
    if (at && (forced || !small(at).length)) {
      [laid, raised] = [at, up];
      continue;
    }
    for (const n of next) {
      open.delete(n);
      shut.add(n);
    }
  }
  return drawn(graph, laid, title);
}

/** **How a box ranks to open**: tier 0 holds the box opened by hand, tier 1 is preferred — a
 *  box shown open (a model's `open:`) or a model — tier 2 the rest; a box ranks as well as
 *  anything it holds. Then shallowest. */
type Rank = { tier: number; depth: number };
function ranked(graph: Graph, tree: Leaf, keep?: Id | null): Map<Leaf, Rank> {
  const ranks = new Map<Leaf, Rank>();
  const walk = (n: Leaf, depth: number): number => {
    const own = n.id === keep ? 0 : n.toggle === "open" || is_model(graph, n.id) ? 1 : 2;
    const tier = Math.min(own, ...(n.kids ?? []).map((k) => walk(k, depth + 1)));
    if (n.closed) ranks.set(n, { tier, depth });
    return tier;
  };
  walk(tree, 0);
  return ranks;
}

/** **The next level to open**: of the closed boxes whose holder is open, never one already turned
 *  down, every one of the best rank. */
function level(tree: Leaf, open: ReadonlySet<Leaf>, shut: ReadonlySet<Leaf>,
               rank: ReadonlyMap<Leaf, Rank>): Leaf[] {
  const ready: Leaf[] = [];
  const walk = (n: Leaf) => {
    if (n.closed && !open.has(n)) {
      if (!shut.has(n)) ready.push(n);
      return;
    }
    for (const k of n.kids ?? []) walk(k);
  };
  walk(tree);
  const key = (n: Leaf) => rank.get(n)!.tier * 1e6 + rank.get(n)!.depth;
  const top = Math.min(...ready.map(key));
  return ready.filter((n) => key(n) === top);
}

/** The tree as the view draws it: each box not `open` its closed chip. */
function viewed(tree: Leaf, open: ReadonlySet<Leaf>): Leaf {
  if (tree.closed && !open.has(tree)) return tree.closed;
  return tree.kids ? { ...tree, kids: tree.kids.map((k) => viewed(k, open)) } : tree;
}

/** How many chips a viewed tree draws: its leaves, never a panel. */
function chips(tree: Leaf): number {
  return tree.kids?.length ? tree.kids.reduce((n, k) => n + chips(k), 0) : tree.panel ? 0 : 1;
}

/** The chips of a laid tree laid smaller than legible (`FLOOR`). */
function small(laid: Tiled<Leaf>): Tiled<Leaf>[] {
  return laid.leaves().filter((n) => n.depth > 0 && !n.data.panel
    && (n.x1 - n.x0 < FLOOR.w || n.y1 - n.y0 < FLOOR.h));
}

/** **The tree as a treemap** its room's size — the canvas, less what sits round it, larger in its
 *  shape where it holds more chips than would each keep `ROOM` (until grouping keeps every view
 *  within its budget) — squarified at `1/K` width and stretched back: every box's cells fill it,
 *  sized by weight, its header over them, **no chip weighing less than `SHARES` of the budget**,
 *  so a light chip still gets a legible chip's room, what is `raised` weighing more. **Never by
 *  what is picked**: a selection never moves a cell. d3 lets an outer padding overwrite a top
 *  one, so each side is said apart. */
function laid_out(tree: Leaf, room: { w: number; h: number },
                  raised: ReadonlyMap<Id, number> = new Map()): Tiled<Leaf> {
  const root = hierarchy<Leaf>(tree, (n) => (n.kids?.length ? n.kids : undefined));
  const least = (root.sum((n) => (n.kids?.length ? 0 : n.value ?? 0)).value ?? 0) * SHARES
    / budget(room);
  root.sum((n) => (n.kids?.length ? 0 : Math.max(least, n.value ?? 0) * (raised.get(n.id) ?? 1)))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const [w, h] = [Math.max(320, room.w), Math.max(240, room.h)];
  const grow = Math.max(1, Math.sqrt(root.leaves().length * ROOM / (w * h)));
  const laid = treemap<Leaf>().tile(treemapSquarify.ratio(1.6))
    .size([w * grow / K, h * grow])
    .paddingInner((n) => (n.depth ? AIR.inner : AIR.major) / K)
    .paddingLeft((n) => (n.depth ? AIR.outer / K : 0))
    .paddingRight((n) => (n.depth ? AIR.outer / K : 0))
    .paddingBottom((n) => (n.depth ? AIR.outer : 0))
    .paddingTop((n) => (n.depth ? AIR.title : 0))(root);
  for (const n of laid.descendants()) {
    [n.x0, n.x1, n.y0, n.y1] = [Math.round(n.x0 * K), Math.round(n.x1 * K), Math.round(n.y0),
                                Math.round(n.y1)];
  }
  return laid;
}

/** **A laid tree as nodes**: each box with its header, each chip its header over its well, and an
 *  area for each to fly to. Anything with no room, or laid outside what holds it, is not drawn,
 *  nor what it holds: nothing is cut through. */
function drawn(graph: Graph, laid: Tiled<Leaf>, title: "library" | "models"): Scene {
  const areas: Area[] = [];
  const nodes: BoxNode[] = [];
  const gone = new Set<HierarchyNode<Leaf>>();
  for (const n of laid.descendants()) {
    const id = n.data.id;
    const box = { x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 };
    const up = n.parent;
    if (up && (gone.has(up) || box.w < 1 || box.h < 1
        || n.y1 > up.y1 || n.x1 > up.x1 || n.y0 < up.y0 || n.x0 < up.x0)) {
      gone.add(n);
      continue;
    }
    const chip = n.children ? undefined : n.data.chip;
    const label = id === MAP_ROOT ? title : n.data.label ?? name_of(graph, id);
    areas.push({ id, parent: up?.data.id ?? null, ...box, label, depth: n.depth, chip: !!chip });
    if (id === MAP_ROOT) continue;
    const own: Partial<ReturnType<typeof carried>> = graph.blocks[id]
      ? carried(graph, id, "small") : {};
    /** The workspace's package is the models' model root and the library's folder; an imported
     *  package wears a lock (explorer `rows.ts` `mark_of`). */
    const top = graph.blocks[id]?.parent === null;
    const role = !top ? own.role : title === "models" && id === graph.root ? "model" : "folder";
    const data = { label, marks: n.data.panel ? ["group" as const] : [],
                   ...(role ? { role } : {}),
                   ...(top && id !== graph.root ? { icon: "locked" } : {}),
                   ...(own.description ? { description: own.description } : {}),
                   ...(n.data.toggle ? { toggle: n.data.toggle } : {}) };
    if (!chip) {
      const facts = n.data.panel ? null : box_facts(graph, n, title);
      nodes.push({ ...cell(id, box, { ...data, ...(facts ? { facts } : {}) }, "box"),
                   draggable: false });
      continue;
    }
    nodes.push({ ...cell(id, box, { ...data, ...chip_drawn(graph, chip, box, title === "library") },
                         "chip"),
                 draggable: false });
  }
  return { layer: null, areas, map: title, nodes, edges: [], perches: [], slots: ["display"],
           trail: [] };
}

/** **A chip as drawn**: its kind of cell, its name's size grown with its cell, its meta line —
 *  read as the `library` reads it there — and its well where it holds anything and has room. */
function chip_drawn(graph: Graph, chip: NonNullable<Leaf["chip"]>,
                    box: { w: number; h: number }, library: boolean) {
  const size = name_size(box.w, box.h);
  const top = CHIP.top + head_h(size) + CHIP.gap;
  const room = { w: box.w - CHIP.side - CHIP.inset, h: box.h - top - CHIP.foot - CHIP.inset };
  const tiles = chip.held.length && room.h + CHIP.inset >= CHIP.well
    ? well(graph, chip.held, room) : [];
  const facts = facts_of(graph, chip.block, library);
  const holds = chip.held.length > 0;
  const def = library && !!graph.blocks[chip.block]?.def;
  return { size, cell: def ? (holds ? "holds" as const : "leaf" as const)
             : cell_of(graph, chip.block, holds),
           ...(chip.kind ? { kind: chip.kind } : {}),
           ...(facts ? { facts } : {}), ...(tiles.length ? { well: top, tiles } : {}),
           look: colour_of(graph, chip.block) };
}

/** A chip's name's size in pixels, grown with its cell (`NAME`). */
function name_size(w: number, h: number): number {
  return Math.max(NAME.least, Math.min(NAME.most, Math.round(Math.sqrt(w * h) / NAME.per)));
}

/** A header's height at a name of `size` pixels: its name's line, the gap, the meta line (theme
 *  `face.css` `.mnd-header`). */
function head_h(size: number): number {
  return Math.round(size * 1.25 + 3 + 15);
}

/** **A chip's well**: a preview of what it holds as a quiet treemap, one level, by weight,
 *  landscape-biased as the map is, as shares of the well's cells. **Never flooded**: only as many
 *  of the heaviest as each lay whole with a legible name (`legible_cell`), the rest one *+N more*
 *  cell; none where not even one fits. **Neighbours stand apart**: each cell takes the next of
 *  `GRADES` grades, in the order squarify lays them. */
function well(graph: Graph, ids: readonly Id[], room: { w: number; h: number }): InnerTile[] {
  const weights = new Map(ids.map((id) => [id, weight(graph, members(graph, id))]));
  const weigh = (id: Id) => weights.get(id)!;
  const order = [...ids].sort((a, b) => weigh(b) - weigh(a));
  /** The most cells that could each hold a legible name, then the most that do. */
  let [lo, hi] = [0, Math.min(order.length, Math.floor((room.w * room.h) / LEAST_CELL))];
  let best: InnerTile[] = [];
  while (lo < hi) {
    const k = Math.ceil((lo + hi) / 2);
    const laid = well_laid(graph, order.slice(0, k), order.length - k, room, weigh);
    if (laid.legible) [lo, best] = [k, laid.tiles];
    else hi = k - 1;
  }
  return best;
}

/** The least room a well's cell needs: a name of `MIN_CHARS` characters at the least size. */
const MIN_CHARS = 4;
const LEAST_CELL = (NAMED.least * (NAMED.char * MIN_CHARS + NAMED.pad) + NAMED.right)
  * NAMED.least * NAMED.line;

/** **A well laid**: `shown` by weight, then a *+N more* cell for the `more` left out, as heavy
 *  as the lightest shown; legible where every cell's name shows `MIN_CHARS` at least at the least
 *  size, a longer name shrunk to fit, else cut short — the *+N more* whole. */
function well_laid(graph: Graph, shown: readonly Id[], more: number, room: { w: number; h: number },
                   weigh: (id: Id) => number): { tiles: InnerTile[]; legible: boolean } {
  const [w, h] = [Math.max(1, room.w), Math.max(1, room.h)];
  const MORE = "+more";
  type Item = { id: Id; kids?: Item[] };
  const kids = [...shown.map((id) => ({ id })), ...(more ? [{ id: MORE }] : [])];
  const least = shown.length ? weigh(shown[shown.length - 1]!) : 1;
  const root = hierarchy<Item>({ id: "", kids }, (n) => n.kids)
    .sum((n) => (n.kids ? 0 : n.id === MORE ? least : weigh(n.id)))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const laid = treemap<Item>().tile(treemapSquarify.ratio(1.6)).size([w / K, h])
    .paddingInner(2 / K)(root);
  let legible = true;
  const tiles = laid.leaves().map((l, i): InnerTile => {
    const [x, y, lw, lh] = [l.x0 * K, l.y0, (l.x1 - l.x0) * K, l.y1 - l.y0];
    const id = l.data.id;
    const label = id === MORE ? `+${more} more` : shown_name(graph, id);
    /** The size a name fits at: whole, else at least the least, cut short. */
    const across = (chars: number) => (lw - NAMED.right) / (NAMED.char * chars + NAMED.pad);
    const tall = lh / NAMED.line;
    const least = id === MORE ? label.length : Math.min(label.length, MIN_CHARS);
    if (Math.min(tall, across(least)) < NAMED.least) legible = false;
    const size = Math.min(NAMED.most, tall, Math.max(NAMED.least, across(label.length)));
    const at = { label, size: Math.round(size * 2) / 2, x: x / w, y: y / h, w: lw / w, h: lh / h,
                 grade: i % GRADES };
    if (id === MORE) return { id, ...at, more: true };
    return { id, ...at, cell: cell_of(graph, id, members(graph, id).length > 0),
             tint: tint_attrs(look_of(graph, id)) };
  });
  return { tiles, legible };
}

/** **A box's meta line**: a block's facts, as its chip would say them — on the library's map a
 *  folder's definitions; a package or a folder on the models' map its models and diagrams. */
function box_facts(graph: Graph, n: HierarchyNode<Leaf>,
                   title: "library" | "models"): Facts | null {
  const id = n.data.id;
  const b = graph.blocks[id];
  if (!b) return null;
  const filed = b.parent === null || is_folder(graph, id);
  if (!filed || title === "library") return facts_of(graph, id, title === "library");
  const chips = n.leaves().flatMap((l) => (l.data.chip ? [l.data.chip] : []));
  const models = n.descendants().filter((d) => is_model(graph, d.data.id)).length;
  const diagrams = chips.filter((c) => !is_model(graph, c.block)
    && !!lens_of(graph, c.block, "structure")).length;
  const counts = [...fact(models, "model"), ...fact(diagrams, "diagram")];
  return counts.length ? { counts, tags: [] } : null;
}

/** **A box's picture is its box off the map**: the box and every box and chip inside it, each
 *  where the map lays it. Null where the map draws no box for it. */
export function box_for(id: Id, scene: Scene): { box: BoxNode; nodes: BoxNode[] } | null {
  const box = scene.nodes.find((n) => n.id === id && n.type === "box");
  if (!box) return null;
  const up = new Map((scene.areas ?? []).map((a) => [a.id, a.parent]));
  const inside = (at: Id) => {
    for (let p = up.get(at); p; p = up.get(p)) if (p === id) return true;
    return false;
  };
  return { box, nodes: scene.nodes.filter((n) => inside(n.id)) };
}

/** **The map an element is drawn from**: the library's for a definition, and for a package that
 *  files definitions; the models' for the workspace while any package holds a model; else the
 *  models'. */
export function chip_map(graph: Graph, id: Id): "library" | "models" {
  const b = graph.edges[id] ? undefined : graph.blocks[id];
  if (id === graph.root) {
    return packages(graph).some((p) => on_side(graph, p.id, "structure")) ? "models" : "library";
  }
  return b?.def || (b && b.parent === null && filed(graph, id).length) ? "library" : "models";
}

/** **An element's picture is a chip off the map**, never a scaled drawing: its own chip where it
 *  gathers anything — a diagram's members, a definition's parts — else the chip of the room it sits
 *  in, its own tile lit; a line lights both its ends. Null where the map draws neither. */
export function chip_for(graph: Graph, id: Id, scene: Scene): { chip: BoxNode; lit: Id[] } | null {
  const e = graph.edges[id];
  const chips = scene.nodes.filter((n) => n.type === "chip");
  const own = chips.find((n) => n.id === id && n.data.tiles?.length);
  if (own) return { chip: own, lit: [] };
  const ends = e ? [e.from, e.to].map((x) => owner_of(graph, x) ?? x) : [id];
  const room = chips.find((n) => ends.every((x) => n.data.tiles?.some((t) => t.id === x)))
    ?? chips.find((n) => n.data.tiles?.some((t) => ends.includes(t.id)));
  return room ? { chip: room, lit: ends } : null;
}

/** A map read once for a picture: each area's children, and each chip's blocks in its well. */
type Read = { by: Map<Id, Area>; kids: (id: Id) => Area[]; tiles: (id: Id) => readonly InnerTile[] };
function read(scene: Scene): Read {
  const all = scene.areas ?? [];
  const held = new Map<Id, Area[]>();
  for (const a of all) if (a.parent) held.set(a.parent, [...(held.get(a.parent) ?? []), a]);
  const nodes = new Map(scene.nodes.map((n) => [n.id, n]));
  return { by: new Map(all.map((a) => [a.id, a])), kids: (id) => held.get(id) ?? [],
           tiles: (id) => nodes.get(id)?.data.tiles ?? [] };
}

/** One box of a mini map, in its pixels: a box or a chip as the map lays it. `holds` where its
 *  name heads what it holds; `on` on the way to what is lit; `lit` the element. */
export type WhereBox = { id: Id; label: string; x: number; y: number; w: number; h: number;
                         holds?: boolean; chip?: boolean; on?: boolean; lit?: boolean };

/** **A mini map**: the map itself, every box and chip where it lays them, scaled to `size.w` —
 *  never laid again, so it reads as the map does — and `h` tall: the map's own height, or
 *  `size.h` where that is less, the window then centred on what is lit: the element, or the
 *  nearest block above it the map draws, a line both its ends. From `from`, a package's own region. Empty where the map draws
 *  none of it. */
export function mini_map(graph: Graph, id: Id | null, scene: Scene, size: { w: number; h: number },
                         from: Id = MAP_ROOT): Mini {
  const map = read(scene);
  const top = map.by.get(from);
  const none = { boxes: [], h: 0 };
  if (!top || size.w < 40 || size.h < 40) return none;
  const k = size.w / top.w;
  const h = Math.min(top.h * k, size.h);

  /** What it lights: the element, or a line's two ends, where drawn. */
  const e = id === null ? undefined : graph.edges[id];
  const ends = e ? [e.from, e.to].map((x) => owner_of(graph, x) ?? x)
    : id === null || id === graph.root ? [] : [id];
  const seen = ends.map((t) => drawn_at(graph, t, map)?.id).filter((x): x is Id => !!x);
  if (ends.length && !seen.length) return none;
  const lit = new Set(seen);
  const on = new Set<Id>();
  for (const l of lit) for (let a = map.by.get(l); a?.parent; a = map.by.get(a.parent)) on.add(a.parent);

  const inside = (b: { x: number; y: number; w: number; h: number }) => b.x >= top.x
    && b.y >= top.y && b.x + b.w <= top.x + top.w && b.y + b.h <= top.y + top.h;
  /** The window: centred on what is lit, held within the map. */
  const focus = scene.nodes.filter((n) => lit.has(n.id)).map(box_of);
  const y0 = focus.length ? Math.min(...focus.map((b) => b.y)) : top.y;
  const y1 = focus.length ? Math.max(...focus.map((b) => b.y + b.h)) : top.y;
  const mid = Math.min(Math.max((y0 + y1) / 2 - h / k / 2, top.y), top.y + top.h - h / k);
  const at = (p: { x: number; y: number }) => ({ x: (p.x - top.x) * k, y: (p.y - mid) * k });

  const boxes = scene.nodes.filter((n) => n.id !== from && inside(box_of(n))).map((n) => {
    const b = box_of(n);
    const p = at(b);
    return { id: n.id, label: n.data.label, ...p, w: b.w * k, h: b.h * k,
             ...(n.type === "chip" ? { chip: true } : { holds: true }),
             ...(lit.has(n.id) ? { lit: true } : on.has(n.id) ? { on: true } : {}) };
  });
  return {
    boxes: boxes.filter((b) => b.y < h && b.y + b.h > 0),
    h,
  };
}

/** A mini map: its boxes, in its pixels; its height. */
export type Mini = { boxes: WhereBox[]; h: number };

/** **Where the map draws a block**: its own area, its room the area holding it; else the tile
 *  standing for it — its own, or the nearest block above it — in the deepest chip holding one,
 *  that chip its room; else the nearest block above it the map draws (a pattern's part, its
 *  pattern). Null where the map draws none of them. */
function drawn_at(graph: Graph, id: Id, map: Read): { id: Id; room: Id } | null {
  const own = map.by.get(id);
  if (own) return own.parent ? { id, room: own.parent } : null;
  const ups = path(graph, id).map((b) => b.id).reverse();
  for (const chip of [...map.by.values()].reverse().filter((a) => a.chip)) {
    const tiles = map.tiles(chip.id);
    const t = ups.map((u) => tiles.find((x) => x.id === u)).find((x) => !!x);
    if (t) return { id: t.id, room: chip.id };
  }
  const above = ups.map((u) => map.by.get(u)).find((a) => a?.parent);
  return above ? { id: above.id, room: above.parent! } : null;
}
