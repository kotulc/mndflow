/** The map, the library's and the model's: one treemap of a workspace, what holds things as boxes
 *  and what is entered as chips. **A chip is as large as what it holds**, wears its kind's icon,
 *  says what it counts and draws a small treemap of what it holds — a diagram's laid by its
 *  structure. The model's map stops at diagrams: a diagram is a chip, unless it holds
 *  diagrams, when it is a box of them beside a chip of its own. The library's: packages and
 *  folders as boxes, each definition a chip as large as its uses. A click selects; entering a chip opens its view. Worked out on every graph change,
 *  never stored. */

import { Graph as Ranks, layout } from "@dagrejs/dagre";
import { hierarchy, treemap, treemapSquarify, type HierarchyNode,
         type HierarchyRectangularNode } from "d3-hierarchy";
import { children, is_grid, is_header, is_holder, is_interface, is_notation, is_tie, lattice_of,
         lens_of, on_side, owner_of, packages, path, region_of, shown_name, subtree, type Graph,
         type Id, type Span } from "@mnd/core";
import { carried, trail_of } from "./derive";
import { grid_from, type Laid, type Read } from "./gridding";
import { filed, name_of, uses_of } from "./library";
import { look_of } from "./look";
import { cell, type Area, type BoxNode, type InnerTile, type Scene } from "./scene";
import { SHAPE } from "./size";

/** The area every map is drawn in. */
export const MAP_ROOT = "@map";

/** A diagram's own chip, beside the boxes of the diagrams it holds: its id and this. */
const OWN = "@own";

/** How wide a map is: about a canvas, so a chip's name reads at 100%. */
const WIDE = 1200;

/** Air between areas, round what a box holds, above it for its title; and a chip's head. */
const AIR = { inner: 4, outer: 6, title: 26 };
const HEAD = 34;

/** How wide a grid's cell reads, a card's shape: what a grid chip's shape is worked out from. */
const CELL = 1.5;

/** One entry of a map: a box of what it holds, or a chip entering `block`, counting `held`; a
 *  grid's chip the shape its body would rather have (`want`, width over height). */
type Leaf = { id: Id; kids?: Leaf[]; value?: number; want?: number;
              chip?: { block: Id; held: readonly Id[]; counts: string; uses?: boolean;
                       diagram?: boolean } };


/** The block a map area enters: its id, less the mark of a diagram's own chip. */
export function area_block(id: Id): Id {
  return id.endsWith(OWN) ? id.slice(0, -OWN.length) : id;
}

/** The model's map: the package under `root`, stopping at diagrams. */
export function model_map(graph: Graph, root: Id): Scene {
  const held = (id: Id) => members(graph, id);
  const diagram = (id: Id) => !!lens_of(graph, id) && lens_of(graph, id) !== "folder";
  const deep = new Map<Id, boolean>();
  const holds_diagrams = (id: Id): boolean => {
    if (!deep.has(id)) deep.set(id, held(id).some((c) => diagram(c) || holds_diagrams(c)));
    return deep.get(id)!;
  };
  const chip = (id: Id, block: Id, list: readonly Id[]): Leaf => {
    const n = counted(graph, list);
    const g = lattice_of(graph, block);
    return { id, value: 1 + total(n),
             ...(g ? { want: (CELL * Math.max(1, g.cols - 1)) / Math.max(1, g.rows - 1) } : {}),
             chip: { block, held: list, counts: words(n), diagram: diagram(block) } };
  };
  /** A box where diagrams lie below; else a chip. A diagram's own blocks share one chip. */
  const entry = (id: Id): Leaf => {
    if (!holds_diagrams(id)) return chip(id, id, held(id));
    const kids = held(id);
    const plain = kids.filter((c) => !diagram(c) && !holds_diagrams(c));
    const own = diagram(id) && plain.length ? [chip(`${id}${OWN}`, id, plain)] : [];
    /** A diagram's box wants the shape its own chip wants, so its parent lays it so. */
    return { id, ...(own[0]?.want ? { want: own[0].want } : {}),
             kids: [...own, ...kids.filter((c) => !own.length || !plain.includes(c)).map(entry)] };
  };
  return mapped(graph, { id: MAP_ROOT, kids: [{ id: root, kids: held(root).map(entry) }] },
                "model");
}

/** The library's map: every package's folders as boxes, each definition a chip as large as its
 *  uses, with what it holds inside. */
export function library_map(graph: Graph): Scene {
  const entry = (id: Id): Leaf => {
    if (!graph.blocks[id]?.def) return { id, kids: filed(graph, id).map(entry) };
    const uses = uses_of(graph, id).length;
    const parts = children(graph, id).filter((b) => !is_interface(graph, b.id)).map((b) => b.id);
    return { id, value: uses + 1,
             chip: { block: id, held: parts, uses: true,
                     counts: `${uses} ${uses === 1 ? "use" : "uses"}` } };
  };
  const tops = packages(graph).filter((p) => filed(graph, p.id).length);
  return mapped(graph, { id: MAP_ROOT, kids: tops.map((p) => entry(p.id)) }, "library");
}

/** The map with `focus` picked out: its area, else its nearest area above it, wears the focus;
 *  the trail is the block's. */
export function map_focus(graph: Graph, map: Scene, focus: Id | null): Scene {
  const at = area_of(graph, map, focus);
  return { ...map, layer: at ? area_block(at.id) : null, trail: trail_of(graph, focus),
           nodes: map.nodes.map((n) => (n.id === at?.id ? { ...n, className: "mnd-focus" } : n)) };
}

/** A block's area on a map: its own, its own chip, else the nearest area above it. */
export function area_of(graph: Graph, map: Scene, id: Id | null): Area | null {
  const areas = new Map((map.areas ?? []).map((a) => [a.id, a]));
  for (const b of [...path(graph, id ?? graph.root)].reverse()) {
    const at = areas.get(b.id) ?? areas.get(`${b.id}${OWN}`);
    if (at) return at;
  }
  return null;
}

/** The area a block is entered through: its own chip, where it has one, else its area. */
export function entry_area(graph: Graph, map: Scene, id: Id | null): Area | null {
  return map.areas?.find((a) => a.id === `${id}${OWN}`) ?? area_of(graph, map, id);
}

/** Where a map's camera stops for a block: its area, or the whole map for a package or none. */
export function stop_area(graph: Graph, map: Scene, id: Id | null): Area | null {
  const at = area_of(graph, map, id);
  return at && at.depth > 1 ? at : map.areas?.find((a) => a.id === MAP_ROOT) ?? at;
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

/** **A box's entries tiled toward the shapes its grid chips want**: where none wants one,
 *  squarified a little wide, the map's own; else split in two by weight again and again, in the
 *  explorer's order, each split upright or level as lays its halves nearer what they want. */
function tiled(node: HierarchyRectangularNode<Leaf>, x0: number, y0: number, x1: number,
               y1: number): void {
  const kids = node.children ?? [];
  if (kids.some((k) => k.data.want)) split(kids, { x0, y0, x1, y1 }, true);
  else treemapSquarify.ratio(1.2)(node, x0, y0, x1, y1);
}

/** The cheapest split of some entries over `rect`, its cost; where `apply`, each entry placed. */
function split(kids: readonly HierarchyRectangularNode<Leaf>[], rect: Rect, apply: boolean)
    : number {
  if (kids.length === 1) {
    if (apply) Object.assign(kids[0]!, rect);
    return misfit(kids[0]!.data, rect);
  }
  /** Where the halves part: the cut nearest half the weight, or one either side of it. */
  const weight = (ks: typeof kids) => ks.reduce((n, k) => n + (k.value ?? 0), 0);
  const all = weight(kids) || 1;
  let mid = 1;
  while (mid < kids.length - 1 && weight(kids.slice(0, mid + 1)) <= all / 2) mid++;
  const cuts = [mid - 1, mid, mid + 1].filter((c) => c >= 1 && c < kids.length);
  const ways = cuts.flatMap((cut) => [true, false].map((level) => {
    const [a, b] = [kids.slice(0, cut), kids.slice(cut)];
    const part = weight(a) / all;
    const at = level ? rect.y0 + (rect.y1 - rect.y0) * part : rect.x0 + (rect.x1 - rect.x0) * part;
    const [ra, rb] = level ? [{ ...rect, y1: at }, { ...rect, y0: at }]
      : [{ ...rect, x1: at }, { ...rect, x0: at }];
    return { a, b, ra, rb, cost: split(a, ra, false) + split(b, rb, false) };
  }));
  const best = ways.reduce((x, y) => (y.cost < x.cost ? y : x));
  if (apply) { split(best.a, best.ra, true); split(best.b, best.rb, true); }
  return best.cost;
}

/** How far an entry laid over `rect` is from its shape: a grid's chip from the shape it wants,
 *  anything else from square, past 2:1. Its body is under its head or title. */
function misfit(leaf: Leaf, rect: Rect): number {
  const head = !leaf.chip ? AIR.title : leaf.id.endsWith(OWN) ? 0 : HEAD;
  const [w, h] = [rect.x1 - rect.x0, rect.y1 - rect.y0 - head];
  if (h < 8 || w < 8) return 10;
  const a = Math.abs(Math.log(w / h / (leaf.want ?? 1)));
  return leaf.want ? 2 * a : Math.max(0, a - Math.log(2));
}

/** A map laid out: the tree as a treemap about a canvas wide, tiled by `tiled`, each
 *  box's title above what it holds; each chip a node with its inner treemap. d3 lets an outer
 *  padding overwrite a top one, so the top is said last. */
function mapped(graph: Graph, tree: Leaf, title: string): Scene {
  const root = hierarchy<Leaf>(tree, (n) => (n.kids?.length ? n.kids : undefined))
    .sum((n) => n.value ?? 0);
  const laid = treemap<Leaf>().tile(tiled)
    .size([WIDE, Math.round(WIDE / SHAPE.aspect)]).round(true)
    .paddingInner(AIR.inner).paddingOuter(AIR.outer)
    .paddingTop((n) => (n.depth === 0 ? AIR.outer : AIR.title))(root);
  const areas: Area[] = [];
  const nodes: BoxNode[] = [];
  for (const n of laid.descendants()) {
    const box = { x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 };
    const id = n.data.id;
    const chip = n.data.chip;
    const label = id === MAP_ROOT ? title : name_of(graph, area_block(id));
    areas.push({ id, parent: n.parent?.data.id ?? null, ...box, label, depth: n.depth,
                 chip: !!chip });
    if (id === MAP_ROOT) continue;
    const own = carried(graph, area_block(id), "small");
    const data = { label, marks: [], ...(own.role ? { role: own.role } : {}),
                   ...(own.description ? { description: own.description } : {}) };
    if (!chip) { nodes.push({ ...cell(id, box, data, "box"), draggable: false }); continue; }
    const bare = id.endsWith(OWN);
    nodes.push({ ...cell(id, box, { ...data, counts: chip.counts,
                                    ...(holds_blocks(graph, area_block(id)) ? { stacked: true } : {}),
                                    ...inner(graph, chip.block, chip.held, box, !!chip.diagram,
                                             bare ? 0 : HEAD),
                                    ...(bare ? { own: true } : {}),
                                    ...(chip.uses ? { look: look_of(graph, chip.block) } : {}) },
                         "chip"), draggable: false });
  }
  return { layer: null, areas, nodes, edges: [], perches: [], slots: ["display"], trail: [] };
}

/** What a block holds on the map: its blocks and holders, never a note, a label or an
 *  interface. */
function members(graph: Graph, id: Id): Id[] {
  return children(graph, id).filter((b) => on_side(graph, b.id, "structure")
    && !is_interface(graph, b.id) && (!is_notation(graph, b.id) || is_holder(graph, b.id)))
    .map((b) => b.id);
}

/** A chip's inner treemap: what it holds, each as large as it counts, in the chip's body under
 *  its head (`head` tall; none on a diagram's own chip), as shares of the body. A diagram's is laid
 *  by its structure instead (`laid_by`). */
function inner(graph: Graph, block: Id, held: readonly Id[], box: { w: number; h: number },
               diagram: boolean, head: number): { tiles: InnerTile[]; diagram?: true } {
  const w = Math.max(1, box.w - 8), h = Math.max(1, box.h - head - 4);
  const mark = diagram ? { diagram: true as const } : {};
  if (!held.length || h < 12) return { tiles: [], ...mark };
  const share = (t: Placed): InnerTile => {
    const box = { id: t.id, x: t.x0 / w, y: t.y0 / h, w: (t.x1 - t.x0) / w, h: (t.y1 - t.y0) / h };
    if (t.as === "cell") return { ...box, label: "", as: t.as };
    const face = carried(graph, t.id, "small");
    return { id: t.id, label: shown_name(graph, t.id), x: t.x0 / w, y: t.y0 / h,
             w: (t.x1 - t.x0) / w, h: (t.y1 - t.y0) / h, ...(face.role ? { role: face.role } : {}),
             ...(t.as === "block" && holds_blocks(graph, t.id) ? { holds: true } : {}),
             ...(t.as === "block" ? {} : { as: t.as }) };
  };
  const whole = { x0: 0, y0: 0, x1: w, y1: h };
  if (!diagram) {
    return { tiles: squarified(graph, held, whole, 2).map((t) => share({ ...t, as: "block" })) };
  }
  const placed = is_grid(graph, block) ? gridded(graph, block, inset(whole, GAP / 2))
    : listed(graph, held, inset(whole, GAP / 2), block);
  return { tiles: placed.map(share), ...mark };
}

/** One tile a diagram's structure lays: a block, a group round its members, a grid's cell or one
 *  of its headers. */
type Placed = Rect & { id: Id; as: "block" | "group" | "cell" };

/** **A diagram's tiles laid by its structure**, filling what they are given: a grid split into its
 *  rows and columns, what sits in a cell tiled in that cell; a group a tinted tile round its
 *  members; anything else in the grid its lines rank it into (`ranked`). `of` names the cells. */
function listed(graph: Graph, ids: readonly Id[], rect: Rect, of: Id): Placed[] {
  return ranked(graph, ids, rect, of).flatMap((u) => {
    if (u.as === "cell") return [u];
    const t = { ...inset(u, GAP / 2), id: u.id };
    if (is_grid(graph, t.id)) {
      return [{ ...t, as: "group" as const },
              ...gridded(graph, t.id, { ...inset(t, GAP / 2), y0: t.y0 + GROUP_HEAD })];
    }
    if (is_holder(graph, t.id)) {
      return [{ ...t, as: "group" as const },
              ...listed(graph, members(graph, t.id),
                        { ...inset(t, GAP / 2), y0: t.y0 + GROUP_HEAD }, t.id)];
    }
    return [{ ...t, as: "block" as const }];
  });
}

/** A grid's lattice over `rect`, its headers left out — the chip says what is there, not what
 *  heads it: each row and column sized by what sits in it, each cell outlined, what sits in a cell
 *  — or a merge — listed in it. */
function gridded(graph: Graph, id: Id, rect: Rect): Placed[] {
  const g = lattice_of(graph, id)!;
  const kids = members(graph, id);
  /** **Each row and column as large as what sits in it**, one at least, so an empty one shows;
   *  a merge shares its weight among the lines it spans. */
  const [rows, cols] = [Array<number>(g.rows).fill(1), Array<number>(g.cols).fill(1)];
  for (const b of kids) {
    const at = region_of(graph, b);
    if (!at || is_header(graph, b)) continue;
    const weight = 1 + total(counted(graph, [b]));
    for (let r = at.r; r < at.r + at.rows; r++) rows[r] = rows[r]! + weight / at.rows;
    for (let c = at.c; c < at.c + at.cols; c++) cols[c] = cols[c]! + weight / at.cols;
  }
  /** The header lines take no room. */
  const ruler = ruled(rows.slice(1), cols.slice(1), rect);
  const span = (s: Span): Rect => ruler({ ...s, r: s.r - 1, c: s.c - 1 });
  const out: Placed[] = [];
  const spans = new Map<string, { s: Span; ids: Id[] }>();
  for (const s of g.merges ?? []) spans.set(`${s.r},${s.c}`, { s, ids: [] });
  for (let r = 1; r < g.rows; r++) {
    for (let c = 1; c < g.cols; c++) {
      const k = `${r},${c}`;
      const merged = (g.merges ?? []).some((s) => r >= s.r && r < s.r + s.rows && c >= s.c
        && c < s.c + s.cols);
      if (!merged) spans.set(k, { s: { r, c, rows: 1, cols: 1 }, ids: [] });
    }
  }
  for (const b of kids) {
    const at = region_of(graph, b);
    if (at && !is_header(graph, b)) spans.get(`${at.r},${at.c}`)?.ids.push(b);
  }
  for (const [k, { s, ids }] of spans) {
    const cell = span(s);
    out.push({ ...cell, id: `${id}@${k}`, as: "cell" });
    out.push(...listed(graph, ids, cell, `${id}@${k}`));
  }
  return out;
}

/** **Some blocks in the grid their lines rank them into**: dagre lays them out, down and across,
 *  each read as a grid (`grid_from`) and the one nearer `rect`'s shape kept; blocks no line joins
 *  wrap in rows. Each row and column as large as the most that sits in it; every cell outlined,
 *  each block its cell. */
function ranked(graph: Graph, ids: readonly Id[], rect: Rect, of: Id): Placed[] {
  if (ids.length < 2) return ids.map((id) => ({ ...rect, id, as: "block" as const }));
  const pairs = joined(graph, ids);
  const shape = (rect.x1 - rect.x0) / Math.max(1, rect.y1 - rect.y0);
  const ways = pairs.length
    ? (["TB", "LR"] as const).map((dir) => grid_from(ranks(ids, pairs, dir)))
    : [wrapped(ids, Math.max(1, Math.round(Math.sqrt((ids.length * shape) / CELL))))];
  const off = (g: Read) => Math.abs(Math.log((g.cols * CELL) / g.rows / shape));
  const g = ways.reduce((a, b) => (off(b) < off(a) ? b : a));
  /** Each line as large as the heaviest it holds; a span's weight shared among its lines. */
  const [rows, cols] = [Array<number>(g.rows).fill(0), Array<number>(g.cols).fill(0)];
  for (const [id, s] of g.at) {
    const weight = 1 + total(counted(graph, [id]));
    for (let r = s.r; r < s.r + s.rows; r++) rows[r] = Math.max(rows[r]!, weight / s.rows);
    for (let c = s.c; c < s.c + s.cols; c++) cols[c] = Math.max(cols[c]!, weight / s.cols);
  }
  const ruler = ruled(rows, cols, rect);
  const cells: Placed[] = [];
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      cells.push({ ...ruler({ r, c, rows: 1, cols: 1 }), id: `${of}@${r},${c}`, as: "cell" });
    }
  }
  return [...cells, ...[...g.at].map(([id, s]) => ({ ...ruler(s), id, as: "block" as const }))];
}

/** Some blocks laid out by dagre one way, each the same size: only their order counts. */
function ranks(ids: readonly Id[], pairs: readonly { from: Id; to: Id }[],
               rankdir: "TB" | "LR"): Laid[] {
  const g = new Ranks();
  g.setGraph({ rankdir, nodesep: 10, ranksep: 10, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of ids) g.setNode(id, { width: 10, height: 10 });
  for (const p of pairs) g.setEdge(p.from, p.to);
  layout(g);
  return ids.map((id) => ({ id, x: g.node(id).x - 5, y: g.node(id).y - 5, w: 10, h: 10 }));
}

/** Some blocks in order, `cols` to a row. */
function wrapped(ids: readonly Id[], cols: number): Read {
  const at = new Map(ids.map((id, i) => [id, { r: Math.floor(i / cols), c: i % cols, rows: 1,
                                                cols: 1 }]));
  return { rows: Math.ceil(ids.length / cols), cols: Math.min(cols, ids.length), at };
}

/** A grid over `rect`, each row and column as large as it weighs: where a span lies. */
function ruled(rows: readonly number[], cols: readonly number[], rect: Rect): (s: Span) => Rect {
  const track = (lo: number, hi: number, ws: readonly number[]) => {
    const all = ws.reduce((n, v) => n + v, 0) || 1;
    return (i: number) => lo + ((hi - lo) * ws.slice(0, i).reduce((n, v) => n + v, 0)) / all;
  };
  const [x, y] = [track(rect.x0, rect.x1, cols), track(rect.y0, rect.y1, rows)];
  return (s) => ({ x0: x(s.c), y0: y(s.r), x1: x(s.c + s.cols), y1: y(s.r + s.rows) });
}

/** Some blocks squarified over `rect`, each as large as it counts, `pad` between them. */
function squarified(graph: Graph, ids: readonly Id[], rect: Rect, pad: number)
    : (Rect & { id: Id })[] {
  const [w, h] = [rect.x1 - rect.x0, rect.y1 - rect.y0];
  if (!ids.length || w < 4 || h < 4) return [];
  type Item = { id: Id; kids?: Item[] };
  const root = hierarchy<Item>({ id: "", kids: ids.map((id) => ({ id })) }, (n) => n.kids)
    .sum((n) => (n.kids ? 0 : 1 + total(counted(graph, [n.id]))));
  const laid = treemap<Item>().tile(treemapSquarify).size([w, h]).paddingInner(pad)(
    root as HierarchyNode<Item>);
  return laid.leaves().map((l) => ({ id: l.data.id, x0: rect.x0 + l.x0, y0: rect.y0 + l.y0,
                                     x1: rect.x0 + l.x1, y1: rect.y0 + l.y1 }));
}

/** A rect drawn in by `d` on every side. */
function inset(r: Rect, d: number): Rect {
  return { x0: r.x0 + d, y0: r.y0 + d, x1: Math.max(r.x0 + d, r.x1 - d),
           y1: Math.max(r.y0 + d, r.y1 - d) };
}

type Rect = { x0: number; y0: number; x1: number; y1: number };

/** The air between a diagram's tiles; and above a group's members, room for its name. */
const GAP = 10;
const GROUP_HEAD = 14;

/** Which of a diagram's tiles a line joins: each relation's ends lifted to the tiles holding
 *  them, one link a pair; a tie is none. */
function joined(graph: Graph, held: readonly Id[]): { from: Id; to: Id }[] {
  const set = new Set(held);
  const tile = (end: Id) => path(graph, owner_of(graph, end)).find((b) => set.has(b.id))?.id;
  const pairs = new Map<string, { from: Id; to: Id }>();
  for (const e of Object.values(graph.edges)) {
    if (is_tie(graph, e.id)) continue;
    const [from, to] = [tile(e.from), tile(e.to)];
    if (!from || !to || from === to || pairs.has(`${to}|${from}`)) continue;
    pairs.set(`${from}|${to}`, { from, to });
  }
  return [...pairs.values()];
}

/** Whether a block holds blocks, however deep — what a card wears a stacked edge for. */
function holds_blocks(graph: Graph, id: Id): boolean {
  return subtree(graph, id).some((x) => x !== id && !is_notation(graph, x)
    && !is_interface(graph, x));
}

/** What some blocks hold between them: blocks — not notes, labels, holders or a grid's headers,
 *  which the map never draws — the lines among them, and their interfaces. */
function counted(graph: Graph, ids: readonly Id[]) {
  const all = new Set(ids.flatMap((id) => subtree(graph, id)));
  let blocks = 0, ports = 0;
  for (const id of all) {
    if (is_interface(graph, id)) ports++;
    else if (!is_notation(graph, id) && !is_holder(graph, id) && !is_header(graph, id)) blocks++;
  }
  const lines = Object.values(graph.edges).filter((e) => all.has(e.from) && all.has(e.to)).length;
  return { blocks, lines, ports };
}

/** A count's whole. */
function total(n: { blocks: number; lines: number; ports: number }): number {
  return n.blocks + n.lines + n.ports;
}

/** A count in words, what is nought left out. */
function words(n: { blocks: number; lines: number; ports: number }): string {
  const say = (k: number, one: string) => (k ? `${k} ${one}${k === 1 ? "" : "s"}` : "");
  return [say(n.blocks, "block"), say(n.lines, "line"), say(n.ports, "port")]
    .filter(Boolean).join(" · ");
}
