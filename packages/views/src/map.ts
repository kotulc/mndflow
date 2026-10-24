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
import { children, diagram_kind, has_lifelines, is_aside, is_grid, is_header, is_holder,
         is_interface, is_notation, is_region, is_tie, lattice_of, lens_of, notation_of, on_side,
         owner_of, packages, path, ports_on, region_of, shown_name, subtree, type Graph,
         type Id } from "@mnd/core";
import { carried, trail_of } from "./derive";
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

/** Air between areas and round what a box holds, the same everywhere — more in a box holding a
 *  diagram's chip, so the chip stands apart: `share` of the box's smaller side, `inner` to `clear`,
 *  as much between as round and below the title; above a box's title; and a chip's head. Round a
 *  chip's body, more round a diagram's. */
const AIR = { inner: 6, outer: 6, clear: 16, share: 0.06, title: 26 };
const HEAD = 34;
const PAD = { chip: 4, diagram: 8 };

/** How wide a card reads, width over height: the shape a diagram chip's tiles aim at. */
const CELL = 1.5;

/** One entry of a map: a box of what it holds, or a chip entering `block`, counting `held`. */
type Leaf = { id: Id; kids?: Leaf[]; value?: number;
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
    return { id, value: 1 + total(n),
             chip: { block, held: list, counts: words(n), diagram: diagram(block) } };
  };
  /** A box where diagrams lie below; else a chip. A diagram's own blocks share one chip. */
  const entry = (id: Id): Leaf => {
    if (!holds_diagrams(id)) return chip(id, id, held(id));
    const kids = held(id);
    const plain = kids.filter((c) => !diagram(c) && !holds_diagrams(c));
    const own = diagram(id) && plain.length ? [chip(`${id}${OWN}`, id, plain)] : [];
    return { id, kids: [...own, ...kids.filter((c) => !own.length || !plain.includes(c))
      .map(entry)] };
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

/** The map gone to `focus`: its area, else its nearest area above it, is the map's layer; the
 *  trail is the block's. Nothing lights for it: only what is picked does. */
export function map_focus(graph: Graph, map: Scene, focus: Id | null): Scene {
  const at = area_of(graph, map, focus);
  return { ...map, layer: at ? area_block(at.id) : null, trail: trail_of(graph, focus) };
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

/** A map laid out: the tree as a treemap about a canvas wide, squarified a little wide, each
 *  box's title above what it holds; each chip a node with its inner treemap. d3 lets an outer
 *  padding overwrite a top one, so the top is said last. */
function mapped(graph: Graph, tree: Leaf, title: string): Scene {
  const root = hierarchy<Leaf>(tree, (n) => (n.kids?.length ? n.kids : undefined))
    .sum((n) => n.value ?? 0);
  const laid = treemap<Leaf>().tile(treemapSquarify.ratio(1.2))
    .size([WIDE, Math.round(WIDE / SHAPE.aspect)]).round(true)
    .paddingInner((n) => air(n as HierarchyRectangularNode<Leaf>))
    .paddingOuter((n) => air(n as HierarchyRectangularNode<Leaf>))
    .paddingTop((n) => (n.depth === 0 ? AIR.outer
      : AIR.title + air(n as HierarchyRectangularNode<Leaf>) - AIR.outer))(root);
  const areas: Area[] = [];
  const nodes: BoxNode[] = [];
  for (const n of laid.descendants()) {
    const id = n.data.id;
    const chip = n.data.chip;
    const box = { x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 };
    const label = id === MAP_ROOT ? title : name_of(graph, area_block(id));
    areas.push({ id, parent: n.parent?.data.id ?? null, ...box, label, depth: n.depth,
                 chip: !!chip });
    if (id === MAP_ROOT) continue;
    const own = carried(graph, area_block(id), "small");
    const data = { label, marks: [], ...(own.role ? { role: own.role } : {}),
                   ...(own.description ? { description: own.description } : {}) };
    if (!chip) {
      nodes.push({ ...cell(id, box, data, "box"), draggable: false });
      continue;
    }
    const bare = id.endsWith(OWN);
    nodes.push({ ...cell(id, box, { ...data, counts: chip.counts,
                                    ...(chip.uses && holds_blocks(graph, chip.block)
                                      ? { stacked: true } : {}),
                                    ...inner(graph, chip.block, chip.held, box, !!chip.diagram,
                                             bare ? 0 : HEAD),
                                    ...(bare ? { own: true } : {}),
                                    ...(chip.diagram ? {} : { look: look_of(graph, chip.block) }) },
                         "chip"), draggable: false });
  }
  return { layer: null, areas, nodes, edges: [], perches: [], slots: ["display"], trail: [] };
}

/** The air in a box, the same round and between what it holds: where it holds a diagram's chip a
 *  share of its smaller side, within bounds; else the map's own. d3 has placed the box by now. */
function air(n: HierarchyRectangularNode<Leaf>): number {
  if (!n.children?.some((k) => k.data.chip?.diagram)) return AIR.inner;
  const least = Math.min(n.x1 - n.x0, n.y1 - n.y0);
  return Math.round(Math.min(AIR.clear, Math.max(AIR.inner, AIR.share * least)));
}

/** What a block holds on the map: its blocks, holders and a flow's marks, never a note, a label
 *  or an interface. */
function members(graph: Graph, id: Id): Id[] {
  return children(graph, id).filter((b) => on_side(graph, b.id, "structure")
    && !is_interface(graph, b.id) && (!is_notation(graph, b.id) || !is_aside(graph, b.id)))
    .map((b) => b.id);
}

/** A chip's inner treemap: what it holds, each as large as it counts, in the chip's body under
 *  its head (`head` tall; none on a diagram's own chip), padded round, as shares of the body. A
 *  diagram's is laid by its structure instead (`laid`), its flow turned to fit the chip, its
 *  interfaces notched on the edges its flow enters and leaves by. */
function inner(graph: Graph, block: Id, held: readonly Id[], box: { w: number; h: number },
               diagram: boolean, head: number): { tiles: InnerTile[]; diagram?: true } {
  const pad = diagram ? PAD.diagram : PAD.chip;
  const w = Math.max(1, box.w - 2 * pad), h = Math.max(1, box.h - (head || pad) - pad);
  const mark = diagram ? { diagram: true as const } : {};
  if (!held.length || h < 12) return { tiles: [], ...mark };
  const kind = diagram_kind(graph, block);
  const texture = kind === "class" ? { texture: "class" as const }
    : kind === "entity" ? { texture: "entity" as const } : {};
  const share = (t: Placed): InnerTile => {
    const at = { id: t.id, x: t.x0 / w, y: t.y0 / h, w: Math.max(0, t.x1 - t.x0) / w,
                 h: Math.max(0, t.y1 - t.y0) / h };
    if (t.as === "head" || t.as === "life" || t.as === "rule" || t.as === "port") {
      return { ...at, label: "", as: t.as };
    }
    const face = carried(graph, t.id, "small");
    const is = t.as === "block" ? mark_of(graph, t.id) : undefined;
    return { ...at, label: shown_name(graph, t.id), ...(face.role ? { role: face.role } : {}),
             ...(t.as === "block" ? (is ? { mark: is } : texture) : { as: t.as }),
             ...(t.odd ? { odd: true } : {}) };
  };
  const whole = { x0: 0, y0: 0, x1: w, y1: h };
  if (!diagram) {
    return { tiles: squarified(graph, held, whole, 2).map((t) => share({ ...t, as: "block" })) };
  }
  if (is_grid(graph, block)) return { tiles: gridded(graph, block, whole).map(share), ...mark };
  const { placed, across } = laid(graph, held, whole);
  return { tiles: [...placed, ...notches(graph, block, w, h, across, pad)].map(share),
           ...mark };
}

/** One tile a diagram's structure lays: a block, a group's panel, a region's band (`odd` every
 *  other), a grid's header strip, a lifeline, a rule between rows, an interface's notch. */
type Placed = Rect & { id: Id; as: "block" | "group" | "band" | "head" | "life" | "rule" | "port";
                       odd?: boolean };

/** The air between a diagram's layers, and between what sits in one: the flow's rhythm. */
const ALONG = 8;
const ACROSS = 2;

/** **A diagram's tiles laid by its structure**, filling `rect`: a layer with regions in bands, in
 *  the entered view's order — those a line meets, then those none does — each loose block in the
 *  band its lines reach, else in a band before them all; anything else in the layers its lines
 *  rank it into (`layered`). Whether the flow runs across. */
function laid(graph: Graph, ids: readonly Id[], rect: Rect)
    : { placed: Placed[]; across: boolean } {
  const regions = ids.filter((id) => is_region(graph, id));
  if (!regions.length) return layered(graph, ids, rect);
  const ends = line_ends(graph);
  const met = (r: Id) => subtree(graph, r).some((x) => ends.has(x));
  const order = [...regions.filter(met), ...regions.filter((r) => !met(r))];
  const pairs = joined(graph, ids);
  const home = (id: Id) => order.find((r) => pairs.some((p) => (p.from === id && p.to === r)
    || (p.to === id && p.from === r))) ?? null;
  const loose = ids.filter((id) => !is_region(graph, id));
  const lead = loose.filter((id) => !home(id));
  const bands = [...(lead.length ? [{ region: null, ids: lead }] : []),
                 ...order.map((region) => ({ region, ids: [...members(graph, region),
                                                           ...loose.filter((id) => home(id)
                                                             === region)] }))];
  const across = rect.x1 - rect.x0 >= rect.y1 - rect.y0;
  const parts = tracks(across ? rect.x0 : rect.y0, across ? rect.x1 : rect.y1,
                       bands.map((b) => b.ids.reduce((n, id) => n + weight(graph, id), 0) || THIN),
                       ALONG);
  const placed = bands.flatMap(({ region, ids: held }, i): Placed[] => {
    const [lo, hi] = parts[i]!;
    const r = across ? { ...rect, x0: lo, x1: hi } : { ...rect, y0: lo, y1: hi };
    if (!region) return layered(graph, held, r).placed;
    const odd = order.indexOf(region) % 2 === 1;
    return [{ ...r, id: region, as: "band", ...(odd ? { odd } : {}) },
            ...laid(graph, held, below(inset(r, 3), BAND_HEAD)).placed];
  });
  return { placed, across };
}

/** **Some blocks in the layers their lines rank them into**: each layer along the flow, what sits
 *  in it across in order, every one as large as it counts; blocks no line joins wrap after them,
 *  as many to a layer as the fullest holds, or in rows of their own where no line joins any. Of
 *  the ways to run it, the one whose tiles come nearest a card's shape. */
function layered(graph: Graph, ids: readonly Id[], rect: Rect)
    : { placed: Placed[]; across: boolean } {
  const [w, h] = [rect.x1 - rect.x0, rect.y1 - rect.y0];
  if (!ids.length) return { placed: [], across: w >= h };
  const pairs = joined(graph, ids);
  const tied = new Set(pairs.flatMap((p) => [p.from, p.to]));
  const lone = ids.filter((id) => !tied.has(id));
  const ranked = tied.size ? ranks(ids.filter((id) => tied.has(id)), pairs) : [];
  const most = Math.max(0, ...ranked.map((l) => l.length));
  const ways = tied.size ? [[...ranked, ...chunks(lone, most)]]
    : [...new Set(ids.map((_, k) => Math.ceil(ids.length / (k + 1))))].map((n) => chunks(ids, n));
  const off = (layers: Id[][], across: boolean) => {
    const [along, wide] = across ? [w, h] : [h, w];
    const fullest = Math.max(...layers.map((l) => l.length));
    const cell = (along / layers.length) / (wide / fullest);
    return Math.abs(Math.log(Math.max(1e-3, across ? cell : 1 / cell) / CELL));
  };
  const { layers, across } = ways
    .flatMap((layers) => [true, false].map((across) => ({ layers, across,
                                                          off: off(layers, across) })))
    .reduce((a, b) => (b.off < a.off ? b : a));
  const by = (l: readonly Id[]) => l.reduce((n, id) => n + weight(graph, id), 0);
  const along = tracks(across ? rect.x0 : rect.y0, across ? rect.x1 : rect.y1, layers.map(by),
                       ALONG);
  const placed = layers.flatMap((layer, i) => {
    const [a0, a1] = along[i]!;
    const cross = tracks(across ? rect.y0 : rect.x0, across ? rect.y1 : rect.x1,
                         layer.map((id) => weight(graph, id)), ACROSS);
    return layer.flatMap((id, j) => {
      const [c0, c1] = cross[j]!;
      return tile(graph, id, across ? { x0: a0, x1: a1, y0: c0, y1: c1 }
        : { x0: c0, x1: c1, y0: a0, y1: a1 });
    });
  });
  return { placed, across };
}

/** One block's tiles: a grid its panel and rows (`gridded`), a group its panel round its members
 *  laid in turn, anything else a block. */
function tile(graph: Graph, id: Id, r: Rect): Placed[] {
  const body = below(inset(r, 2), GROUP_HEAD - 2);
  if (is_grid(graph, id)) return [{ ...r, id, as: "group" }, ...gridded(graph, id, body)];
  if (is_holder(graph, id)) {
    return [{ ...r, id, as: "group" }, ...laid(graph, members(graph, id), body).placed];
  }
  return [{ ...r, id, as: "block" }];
}

/** What sits together in a grid: the blocks in one cell or merge, past the headers, and the rows
 *  and columns they reach. */
type Seat = { ids: Id[]; r: number; c: number; rows: number; cols: number };

/** **A grid's rows filled**: a plain header strip on top — and down its side where it has no
 *  lifelines — never labelled; each row and column as large as what sits in it, an empty one
 *  thin. What sits in a cell or a merge widens, in every row it reaches, to the column line
 *  halfway to its nearest neighbour, so each row is full. A grid read as time has a lifeline down
 *  each column behind its blocks; any other a rule between its rows. */
function gridded(graph: Graph, id: Id, rect: Rect): Placed[] {
  const g = lattice_of(graph, id)!;
  const life = has_lifelines(graph, id);
  const seats = new Map<string, Seat>();
  for (const b of members(graph, id)) {
    const at = region_of(graph, b);
    if (!at || is_header(graph, b)) continue;
    const key = `${at.r},${at.c}`;
    const s = seats.get(key) ?? { ids: [], r: at.r - 1, c: at.c - 1, rows: 1, cols: 1 };
    seats.set(key, { ...s, ids: [...s.ids, b], rows: Math.max(s.rows, at.rows),
                     cols: Math.max(s.cols, at.cols) });
  }
  const all = [...seats.values()];
  /** The lines past the headers, each as large as what sits in it, shared across a merge. */
  const [rows, cols] = [Array<number>(g.rows - 1).fill(0), Array<number>(g.cols - 1).fill(0)];
  for (const s of all) {
    const w = s.ids.reduce((n, b) => n + weight(graph, b), 0);
    for (let r = s.r; r < s.r + s.rows; r++) rows[r] = (rows[r] ?? 0) + w / s.rows;
    for (let c = s.c; c < s.c + s.cols; c++) cols[c] = (cols[c] ?? 0) + w / s.cols;
  }
  const out: Placed[] = [{ ...rect, y1: rect.y0 + STRIP, id: `${id}@head`, as: "head" }];
  const body = { ...rect, y0: Math.min(rect.y1, rect.y0 + STRIP + 1) };
  if (!life) {
    out.push({ ...body, x1: body.x0 + STRIP, id: `${id}@side`, as: "head" });
    body.x0 = Math.min(body.x1, body.x0 + STRIP + 1);
  }
  const xs = tracks(body.x0, body.x1, cols.map((v) => v || THIN), 0);
  const ys = tracks(body.y0, body.y1, rows.map((v) => v || THIN), 0);
  if (life) {
    xs.forEach(([a, b], c) => out.push({ ...body, x0: (a + b) / 2, x1: (a + b) / 2,
                                         id: `${id}@life${c}`, as: "life" }));
  } else {
    ys.slice(1).forEach(([a], r) => out.push({ ...body, y0: a, y1: a, id: `${id}@rule${r}`,
                                                as: "rule" }));
  }
  for (const s of all) {
    /** Its nearest neighbours, either side, in any row it reaches. */
    const near = all.filter((o) => o !== s && o.r < s.r + s.rows && s.r < o.r + o.rows);
    const left = Math.max(-1, ...near.filter((o) => o.c + o.cols <= s.c).map((o) => o.c + o.cols));
    const right = Math.min(cols.length, ...near.filter((o) => o.c >= s.c + s.cols)
      .map((o) => o.c));
    const x0 = left < 0 ? body.x0 : xs[Math.round((left + s.c) / 2)]![0];
    const x1 = right >= cols.length ? body.x1 : xs[Math.round((s.c + s.cols + right) / 2)]![0];
    const [y0, y1] = [ys[s.r]![0], ys[Math.min(ys.length, s.r + s.rows) - 1]![1]];
    const air = Math.min(ROW_AIR / 2, (y1 - y0) / 4);
    out.push(...layered(graph, s.ids, { x0: x0 + 1, x1: x1 - 1, y0: y0 + air, y1: y1 - air })
      .placed);
  }
  return out;
}

/** A diagram's interfaces as notches on its chip's edge, `pad` out from its body: those carrying
 *  in where the flow enters, those carrying out where it leaves, spaced evenly; one carrying both
 *  ways has no side to sit on, so none. A port the usage restates is notched once. */
function notches(graph: Graph, block: Id, w: number, h: number, across: boolean, pad: number)
    : Placed[] {
  const ports = ports_on(graph, block).filter((p, i, all) => all.findIndex((q) => q.id === p.id)
    === i);
  return (["in", "out"] as const).flatMap((way) => {
    const mine = ports.filter((p) => p.flow === way);
    return mine.map((p, i): Placed => {
      const at = (i + 1) / (mine.length + 1);
      const edge = way === "in" ? -pad : (across ? w : h) + pad - NOTCH;
      const id = `${block}@${p.id}`;
      return across ? { x0: edge, x1: edge + NOTCH, y0: h * at - NOTCH, y1: h * at + NOTCH, id,
                        as: "port" }
        : { x0: w * at - NOTCH, x1: w * at + NOTCH, y0: edge, y1: edge + NOTCH, id, as: "port" };
    });
  });
}

/** Some blocks ranked by dagre, across, each the same size: a layer is where their centres share
 *  a line along the flow, read on that one axis only; what sits in it in order down it. */
function ranks(ids: readonly Id[], pairs: readonly { from: Id; to: Id }[]): Id[][] {
  const g = new Ranks();
  g.setGraph({ rankdir: "LR", nodesep: 10, ranksep: 10, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of ids) g.setNode(id, { width: 10, height: 10 });
  for (const p of pairs) g.setEdge(p.from, p.to);
  layout(g);
  const by = new Map<number, { id: Id; y: number }[]>();
  for (const id of ids) {
    const x = Math.round(g.node(id).x);
    by.set(x, [...(by.get(x) ?? []), { id, y: g.node(id).y }]);
  }
  return [...by.keys()].sort((a, b) => a - b)
    .map((x) => by.get(x)!.sort((a, b) => a.y - b.y).map((n) => n.id));
}

/** Some blocks in order, `size` to a layer. */
function chunks(ids: readonly Id[], size: number): Id[][] {
  if (!ids.length) return [];
  return Array.from({ length: Math.ceil(ids.length / size) },
                    (_, i) => ids.slice(i * size, (i + 1) * size));
}

/** The blocks every line ends on, but a tie's. */
function line_ends(graph: Graph): Set<Id> {
  return new Set(Object.values(graph.edges).filter((e) => !is_tie(graph, e.id))
    .flatMap((e) => [owner_of(graph, e.from), owner_of(graph, e.to)]));
}

/** A rect with its top brought down by `d`, never past its bottom. */
function below(r: Rect, d: number): Rect {
  return { ...r, y0: Math.min(r.y1, r.y0 + d) };
}

/** From `lo` to `hi` split by weight, `gap` between: where each part lies. */
function tracks(lo: number, hi: number, ws: readonly number[], gap: number): [number, number][] {
  const all = ws.reduce((n, v) => n + v, 0) || 1;
  const room = Math.max(0, hi - lo - gap * (ws.length - 1));
  let at = lo;
  return ws.map((v) => {
    const part: [number, number] = [at, at + (room * v) / all];
    at = part[1] + gap;
    return part;
  });
}

/** Which mark a block is — a flow's start, end or decision — or none. */
function mark_of(graph: Graph, id: Id): "start" | "end" | "decision" | undefined {
  const n = notation_of(graph, id);
  return n === "start" || n === "end" || n === "decision" ? n : undefined;
}

/** How much a block weighs in a chip: a start or an end half a block, anything else one and what
 *  it holds — a decision a block, as it carries its question. */
function weight(graph: Graph, id: Id): number {
  const mark = mark_of(graph, id);
  return mark === "start" || mark === "end" ? 0.5 : 1 + total(counted(graph, [id]));
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

/** Above a group's members, room for its name; above a band's, a little air. A grid's header
 *  strips, how thin an empty row or column is, and the air between a grid's rows. How far an
 *  interface's notch stands. */
const GROUP_HEAD = 14;
const BAND_HEAD = 6;
const STRIP = 5;
const THIN = 0.35;
const ROW_AIR = 8;
const NOTCH = 3;

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

/** Whether a block holds blocks, however deep — what a library chip wears a stacked edge for. */
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
