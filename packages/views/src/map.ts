/** The map, the library's and the models': one treemap of a section, what holds things as boxes
 *  and what is entered as chips. **A chip is its card at map scale**: as large as what it holds
 *  or what it shows, its name and kind's icon over its facts, then a preview of the first thing
 *  it has — a diagram's structure, a definition's uses by place, else its attributes, records,
 *  body or description — each row shown only where it has room. **The models' map is a forest**
 *  of every package holding a model, and stops at diagrams: a model or a diagram is a chip, unless it holds diagrams, when it is a box of one
 *  cell for each block it holds. **The library's**: packages and folders as boxes, each
 *  definition a chip as large as its uses, previewing them as its registry lays them. A click
 *  selects; two read what was clicked (core's `read_at`). Worked out on every graph change, never
 *  stored. */

import { Graph as Ranks, layout } from "@dagrejs/dagre";
import { hierarchy, treemap, treemapSquarify, type HierarchyNode } from "d3-hierarchy";
import { children, definition_uses, diagram_kind, has_lifelines, is_aside, is_grid,
         head_of, is_folder, is_group, is_header, is_holder, is_interface, is_model, is_notation,
         is_reference,
         is_region, is_tie, inline, lattice_of, layer_of, members_of, lens_of, notation_of,
         on_side, owner_of, packages, path, region_of, shown_name, type Graph,
         type Id } from "@mnd/core";
import { colour_of, kind_of, preview_of, type Preview } from "./about";
import { counted, fact, facts_of, total, type Counted, type Facts, type Groups } from "./facts";
import { carried, trail_of } from "./derive";
import { compounded, tree_groups } from "./flow";
import { box_label, box_place, filed, name_of, registry_map, usage_groups } from "./library";
import { look_of, tint_attrs } from "./look";
import { cell, type Area, type BoxNode, type InnerTile, type Scene } from "./scene";
import { SHAPE } from "./size";

/** The area every map is drawn in. */
export const MAP_ROOT = "@map";


/** How wide a map is: about a canvas, so a chip's name reads at 100%. */
const WIDE = 1200;

/** **One gap**, the same everywhere and never scaled per chip: between areas, round what a box
 *  holds and below its title, and round a chip's body; and the room above a box's title. */
const AIR = { inner: 6, outer: 6, title: 26 };
const PAD = { chip: 6, diagram: 6 };

/** **How much larger a chip's head and facts may be held** than laid, zoomed out (`flow.css`
 *  `--chip-k`): their rows are laid at that size, so held text never covers the body. */
const HELD = 1.35;

/** **A chip's rows**, as `flow.css` draws them: its name's line with the air over it and the gap
 *  under its text, each line of its facts, both at their held size; and each row of a preview; an
 *  upright head's width. A level shows only where the chip has room for it. */
const ROW = { name: 4 + Math.ceil(17 * HELD) + 6, facts: Math.ceil(17 * HELD), line: 15 };

/** The least body a chip keeps under its facts: a diagram's or a holder's structure, else a line
 *  of preview. Where it would not, the facts give way, and its hover card says them. */
const KEEP = { structure: 36, preview: ROW.line };
const UPRIGHT_HEAD = 40;

/** **A chip is as large as what it shows**: never less than its rows need, at least `ROWS` of them,
 *  laid at about a card's width. */
const ROWS = 4;
const CARD_W = 168;

/** How narrow a tall chip may be laid before it is widened, and the most it is widened by; how
 *  many rounds the room chips need is weighed in. */
const SLIVER = 120;
const WIDEST = 4;
const SETTLE = 3;

/** How narrow a tall chip is before its head turns upright, as if the chip were turned -90°. */
const UPRIGHT = 64;

/** How wide a card reads, width over height: the shape a diagram chip's tiles aim at. */
const CELL = 1.5;

/** The least a chip weighs, so one holding, used or showing little still shows its icon. */
const LEAST = 2.5;

/** The least share of its heaviest sibling an empty model's chip weighs, so beside a large one it
 *  still has room for its name and icon. */
const EMPTY = 0.04;

/** One entry of a map: a box of what it holds, or a chip entering `block`, counting `held` — or,
 *  a definition's, previewing its `uses` — with what it previews, how many rows that takes, and
 *  what it holds or where it is used, each read once. */
type Leaf = { id: Id; kids?: Leaf[]; value?: number; rows?: number; empty?: boolean;
              panel?: boolean;
              chip?: { block: Id; held: readonly Id[]; kind?: string; uses?: boolean;
                       diagram?: boolean; preview: Preview | null; counts?: Counted;
                       groups?: Groups } };


/** A section's map: the library's for its definitions, else the models'. */
export function section_map(graph: Graph, lists?: "domain" | "structure"): Scene {
  return lists === "domain" ? library_map(graph) : model_map(graph);
}

/** **The models' map**: every package holding a model, each a box of the folders on the way and
 *  its models, stopping at diagrams. */
export function model_map(graph: Graph): Scene {
  const held = (id: Id) => members(graph, id);
  const diagram = (id: Id) => !!lens_of(graph, id, "structure");
  /** **A reference never boxes**: it stands for a block drawn elsewhere, so it is a tile. */
  const deep = new Map<Id, boolean>();
  const holds_diagrams = (id: Id): boolean => {
    if (!deep.has(id)) {
      deep.set(id, held(id).some((c) => !is_reference(graph, c)
        && (diagram(c) || holds_diagrams(c))));
    }
    return deep.get(id)!;
  };
  /** A chip: a diagram's, or a group's or a region's, laid by its structure; any other block's a
   *  plain treemap of what it holds. A diagram's says its kind beside its name. */
  const chip = (id: Id, block: Id, list: readonly Id[]): Leaf => {
    /** Its kind as its card says it: one identity everywhere. */
    const kind = kind_of(graph, block);
    const counts = counted(graph, list);
    const preview = list.length ? null : preview_of(graph, block);
    return { id, value: Math.max(LEAST, list.length ? 1 + total(counts) : 1),
             rows: rows_of(preview),
             ...(!list.length && is_model(graph, block) ? { empty: true } : {}),
             chip: { block, held: list, preview, counts,
                     ...(kind && kind !== "block" ? { kind } : {}),
                     diagram: diagram(block) || is_holder(graph, block) } };
  };
  /** A box where diagrams lie below, one cell for each block it holds, a group whose membership
   *  is a tree gathering its members' cells as a panel; else a chip. */
  const panel = (id: Id, kids: Leaf[]): Leaf => ({ id, kids, panel: true });
  const entry = (id: Id): Leaf => (holds_diagrams(id)
    ? { id, kids: compounded(tree_groups(graph, inline(graph, id) ? layer_of(graph, id) : id),
                             held(id).map(entry), panel) }
    : chip(id, id, held(id)));
  const tops = packages(graph).filter((p) => on_side(graph, p.id, "structure"));
  return mapped(graph, { id: MAP_ROOT, kids: tops.map((p) => ({ id: p.id,
                                                                kids: held(p.id).map(entry) })) },
                "models");
}

/** The library's map: every package's folders as boxes, each definition a chip as large as its
 *  uses or what it shows, previewing them. */
export function library_map(graph: Graph): Scene {
  const entry = (id: Id): Leaf => {
    if (!graph.blocks[id]?.def) return { id, kids: filed(graph, id).map(entry) };
    const uses = definition_uses(graph, id).length;
    const groups = usage_groups(graph, id);
    const preview = preview_of(graph, id);
    return { id, value: Math.max(LEAST, uses + 1), rows: rows_of(preview) + groups.length,
             chip: { block: id, held: [], uses: true, preview, groups } };
  };
  const tops = packages(graph).filter((p) => filed(graph, p.id).length);
  return mapped(graph, { id: MAP_ROOT, kids: tops.map((p) => entry(p.id)) }, "library");
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
function mapped(graph: Graph, tree: Leaf, title: "library" | "models"): Scene {
  const root = hierarchy<Leaf>(tree, (n) => (n.kids?.length ? n.kids : undefined))
    .sum((n) => n.value ?? 0);
  const size: [number, number] = [WIDE, Math.round(WIDE / SHAPE.aspect)];
  /** An empty model is weighed against its heaviest sibling; a chip showing rows weighs at least
   *  the room they need, as a share of the whole. */
  const least = new Map(root.leaves().filter((n) => n.data.empty).map((n) => [n.data,
    EMPTY * Math.max(...(n.parent?.children ?? [n]).map((c) => c.value ?? 0))]));
  const area = size[0] * size[1];
  const need = (n: Leaf) => (n.rows
    ? (ROW.name + ROW.facts + Math.min(ROWS, n.rows) * ROW.line + 2 * PAD.chip) * CARD_W : 0);
  const wider = new Map<Leaf, number>();
  /** Each value weighs as much area as the whole map shares out to it, so the room a chip needs
   *  is weighed against the total it makes: worked to a fixed point, a few rounds. */
  const weigh = () => {
    let unit = area / Math.max(1, root.sum((n) => n.value ?? 0).value ?? 0);
    for (let i = 0; i < SETTLE; i++) {
      root.sum((n) => (n.value
        ? Math.max(n.value, least.get(n) ?? 0, need(n) / unit) * (wider.get(n) ?? 1) : 0));
      unit = area / Math.max(1, root.value ?? 0);
    }
    return root;
  };
  const tile = () => treemap<Leaf>().tile(treemapSquarify.ratio(1.2)).size(size).round(true)
    .paddingInner(AIR.inner)
    .paddingOuter(AIR.outer)
    .paddingTop((n) => (n.depth === 0 ? AIR.outer : AIR.title))(weigh());
  /** **A chip is never a sliver**: one laid narrower than a card and taller than wide is widened
   *  in proportion, within bounds, and the map laid again, once. */
  let laid = tile();
  for (const n of laid.leaves()) {
    const [w, h] = [n.x1 - n.x0, n.y1 - n.y0];
    if (n.data.chip && w < SLIVER && h > w) {
      wider.set(n.data, Math.min(WIDEST, SLIVER / Math.max(1, w)));
    }
  }
  if (wider.size) laid = tile();
  const areas: Area[] = [];
  const nodes: BoxNode[] = [];
  for (const n of laid.descendants()) {
    const id = n.data.id;
    const chip = n.data.chip;
    const box = { x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 };
    const label = id === MAP_ROOT ? title : name_of(graph, id);
    areas.push({ id, parent: n.parent?.data.id ?? null, ...box, label, depth: n.depth,
                 chip: !!chip });
    if (id === MAP_ROOT) continue;
    const own = carried(graph, id, "small");
    const data = { label, marks: [], ...(own.role ? { role: own.role } : {}),
                   ...(own.description ? { description: own.description } : {}) };
    if (!chip) {
      const marks = n.data.panel ? { marks: ["group" as const] } : {};
      const facts = n.data.panel ? null : box_facts(graph, n, title);
      nodes.push({ ...cell(id, box, { ...data, ...marks, ...(facts ? { facts } : {}) }, "box"),
                   draggable: false });
      continue;
    }
    /** Narrow and tall, its head runs up its left side and its body sits beside it; else its
     *  name's line, and its facts under it where its body keeps room for what it shows. */
    const upright = box.w < UPRIGHT && box.h > box.w;
    const facts = facts_of(graph, chip.block, !!chip.uses,
                           { ...(chip.groups ? { groups: chip.groups } : {}),
                             ...(chip.counts ? { counts: chip.counts } : {}) });
    const any = facts.counts.length + facts.ports.length + facts.tags.length > 0;
    const keep = (chip.held.length ? KEEP.structure : KEEP.preview)
      + (chip.diagram ? PAD.diagram : PAD.chip);
    const strip = !upright && any && box.h >= ROW.name + ROW.facts + keep;
    const head = upright ? { w: UPRIGHT_HEAD, h: 0 }
      : { w: 0, h: ROW.name + (strip ? ROW.facts : 0) };
    const body = chip.uses ? previewed(graph, chip, box, head)
      : chip.held.length ? inner(graph, chip.block, chip.held, box, !!chip.diagram, head)
      : profiled(chip.preview, box, head);
    nodes.push({ ...cell(id, box, { ...data, ...(strip ? { facts } : {}),
                                    ...(upright ? { upright } : {}), head: head.w || head.h,
                                    ...(chip.kind ? { kind: chip.kind } : {}),
                                    ...(chip.diagram ? { diagram: true } : {}),
                                    ...body, look: colour_of(graph, chip.block) },
                         "chip"), draggable: false });
  }
  return { layer: null, areas, map: title, nodes, edges: [], perches: [], slots: ["display"],
           trail: [] };
}

/** **A box's counts**, in its title after its name, in the facts strip's words: a block what it
 *  holds, as its chip would count it; a package or a folder what it gathers — its models and
 *  diagrams on the models' map, its definitions on the library's. */
function box_facts(graph: Graph, n: HierarchyNode<Leaf>, title: "library" | "models"): Facts | null {
  const id = n.data.id;
  const b = graph.blocks[id];
  if (!b) return null;
  const filed = b.parent === null || is_folder(graph, id);
  if (!filed) return { ...facts_of(graph, id, false), ports: [], tags: [] };
  const chips = n.leaves().flatMap((l) => (l.data.chip ? [l.data.chip] : []));
  const counts = title === "library" ? fact(chips.length, "definition")
    : [...fact(n.descendants().filter((d) => is_model(graph, d.data.id)).length, "model"),
       ...fact(chips.filter((c) => !is_model(graph, c.block)
         && !!lens_of(graph, c.block, "structure")).length, "diagram")];
  return counts.length ? { counts, ports: [], tags: [] } : null;
}

/** What a block holds on the map: its blocks, holders and a flow's marks, never a note, a label,
 *  an interface or a group — a group is a panel over its members (`paneled`). */
function members(graph: Graph, id: Id): Id[] {
  return children(graph, id).filter((b) => on_side(graph, b.id, "structure")
    && !is_interface(graph, b.id) && !is_group(graph, b.id)
    && (!is_notation(graph, b.id) || !is_aside(graph, b.id)))
    .map((b) => b.id);
}

/** **A diagram's groups as panels** over its members' tiles, wherever they landed, a quarter gap
 *  round them, laid first so its blocks draw over them. A group with no tile placed draws none. */
function paneled(graph: Graph, block: Id, placed: readonly Placed[]): Placed[] {
  const panels = children(graph, block).filter((g) => is_group(graph, g.id)).flatMap((g) => {
    const ids = new Set(members_of(graph, g.id).map((b) => b.id));
    const mine = placed.filter((t) => ids.has(t.id));
    if (!mine.length) return [];
    return [{ id: g.id, as: "group" as const, x0: Math.min(...mine.map((t) => t.x0)) - GAP / 4,
              y0: Math.min(...mine.map((t) => t.y0)) - GAP / 4,
              x1: Math.max(...mine.map((t) => t.x1)) + GAP / 4,
              y1: Math.max(...mine.map((t) => t.y1)) + GAP / 4 }];
  });
  return [...panels, ...placed];
}

/** A chip's body: the chip less its head, above or beside it, and the padding round the rest. */
function body_of(box: { w: number; h: number }, head: Head, pad: number) {
  return { w: Math.max(1, box.w - (head.w || pad) - pad),
           h: Math.max(1, box.h - (head.h || pad) - pad) };
}

/** A chip's head: `h` tall above its body, or `w` wide beside it, upright. */
type Head = { w: number; h: number };

/** **A definition's chip previews its uses by place** as its registry lays them — the tray's
 *  small map of them, as shares of the chip's body beside its head: a box per place, in its
 *  colour, each use a small card. Where too few of its uses would read by name, **its profile**
 *  instead: what it declares, over a bar of its uses split by place. */
function previewed(graph: Graph, chip: NonNullable<Leaf["chip"]>, box: { w: number; h: number },
                   head: Head): Pick<BoxNode["data"], "tiles" | "preview" | "bar"> {
  const { w, h } = body_of(box, head, PAD.chip);
  if (h < 12 || w < 12) return {};
  const def = chip.block;
  const groups = chip.groups ?? [];
  const laid = registry_map(graph, def, w, h, groups);
  /** **Its uses, wherever it has any**: each tile shows what its own size on screen holds — its
   *  mark, then its name — so no share of them need read for the rest to draw. Only a definition
   *  used nowhere shows its profile. */
  if (!laid.some((t) => t.kind !== "box")) {
    const placed = groups.map((g) => ({ id: g.place, label: box_label(graph, g.place),
                                        n: g.uses.length,
                                        tint: tint_attrs(colour_of(graph, g.place)) }));
    const bar = placed.map(({ n, tint }) => ({ n, tint }));
    return { ...profiled(chip.preview, box, head, placed), ...(bar.length ? { bar } : {}) };
  }
  return { tiles: laid.map((t): InnerTile => {
    const at = { id: t.id, label: t.label, x: t.x / w, y: t.y / h, w: t.w / w, h: t.h / h };
    const place = t.kind === "box" ? box_place(def, t.id) : null;
    if (place) return { ...at, as: "group", tint: tint_attrs(colour_of(graph, place)) };
    if (t.kind !== "use") return at;
    const face = carried(graph, t.id, "small");
    /** A stand-in for the definition says its name again: its place's box says enough. */
    const again = t.label === shown_name(graph, def) ? { label: "" } : {};
    return { ...at, ...again, ...(face.role ? { role: face.role } : {}),
             tint: tint_attrs(look_of(graph, t.id)) };
  }) };
}

/** **What a chip shows of a block with no structure to draw**: its preview, and a definition's
 *  places with how many uses each holds, where its body has a row's room. */
function profiled(preview: Preview | null, box: { w: number; h: number }, head: Head,
                  places: Preview["places"] = []): Pick<BoxNode["data"], "preview"> {
  const { h } = body_of(box, head, PAD.chip);
  if (h < ROW.line) return {};
  const shown = { ...preview, ...(places.length ? { places } : {}) };
  return Object.keys(shown).length ? { preview: shown } : {};
}

/** How many rows a preview shows. */
function rows_of(preview: Preview | null): number {
  return preview?.rows?.length ?? preview?.lines?.length ?? 0;
}

/** A chip's inner treemap: what it holds, each as large as it counts, in the chip's body beside
 *  its head, padded round, as shares of the body. A
 *  diagram's is laid by its structure instead (`laid`), its flow turned to fit the chip. A
 *  block's tile wears its own colour. */
function inner(graph: Graph, block: Id, held: readonly Id[], box: { w: number; h: number },
               diagram: boolean, head: Head): { tiles: InnerTile[] } {
  const { w, h } = body_of(box, head, diagram ? PAD.diagram : PAD.chip);
  if (!held.length || h < 12 || w < 12) return { tiles: [] };
  const kind = diagram_kind(graph, block);
  const texture = kind === "class" ? { texture: "class" as const }
    : kind === "entity" ? { texture: "entity" as const } : {};
  const share = (t: Placed): InnerTile => {
    const at = { id: t.id, x: t.x0 / w, y: t.y0 / h, w: Math.max(0, t.x1 - t.x0) / w,
                 h: Math.max(0, t.y1 - t.y0) / h, ...(t.in ? { in: t.in } : {}),
                 ...(t.holds ? { holds: true } : {}) };
    /** A header strip standing for its header block is named and coloured as the block is. */
    if (t.as === "head" && graph.blocks[t.id]) {
      return { ...at, label: shown_name(graph, t.id), as: t.as,
               tint: tint_attrs(look_of(graph, t.id)) };
    }
    if (t.as === "head" || t.as === "track" || t.as === "life" || t.as === "rule"
        || t.as === "flow" || t.as === "arrow") {
      return { ...at, label: "", as: t.as, ...(t.down ? { down: true } : {}) };
    }
    const face = carried(graph, t.id, "small");
    const is = t.as === "block" ? mark_of(graph, t.id) : undefined;
    /** A group's panel in a chip shows where its members are, not its name: it has no room. */
    const label = is_group(graph, t.id) ? "" : shown_name(graph, t.id);
    return { ...at, label, ...(face.role ? { role: face.role } : {}),
             ...(t.as === "block" ? (is ? { mark: is }
               : { ...texture, tint: tint_attrs(look_of(graph, t.id)),
                   ...(t.holds ? {} : said(graph, t.id)) }) : { as: t.as }),
             ...(t.odd ? { odd: true } : {}) };
  };
  const whole = { x0: 0, y0: 0, x1: w, y1: h };
  if (!diagram) {
    return { tiles: nested(graph, squarified(graph, held, whole, 2)
      .map((t) => ({ ...t, as: "block" as const }))).map(share) };
  }
  if (is_grid(graph, block)) {
    return { tiles: nested(graph, gridded(graph, block, whole)).map(share) };
  }
  const first = laid(graph, held, whole);
  if (!first.gaps.length) {
    return { tiles: nested(graph, paneled(graph, block, first.placed)).map(share) };
  }
  /** **What its lines rank runs one way, between a start and an end**: a strip across each end
   *  of its flow, its blocks a gap within them; a faint line down its middle, behind its blocks,
   *  from the start strip to an arrow whose tip meets the end strip. */
  const along = first.across ? w : h;
  const span = (a0: number, a1: number, c0: number, c1: number): Rect => (first.across
    ? { x0: a0, x1: a1, y0: c0, y1: c1 } : { x0: c0, x1: c1, y0: a0, y1: a1 });
  const wide = first.across ? h : w;
  const { placed, across } = laid(graph, held,
                                  span(STRIP + GAP, along - STRIP - GAP, 0, wide), first.across);
  const down = across ? {} : { down: true };
  const [tip, broad] = [GAP * 0.6, GAP * 0.9];
  const ends: Placed[] = [
    { ...span(0, STRIP, 0, wide), id: `${block}@start`, as: "head" },
    { ...span(along - STRIP, along, 0, wide), id: `${block}@end`, as: "head" },
    { ...span(STRIP, along - STRIP - tip, wide / 2, wide / 2), id: `${block}@flow`, as: "flow",
      ...down },
    { ...span(along - STRIP - tip, along - STRIP, (wide - broad) / 2, (wide + broad) / 2),
      id: `${block}@arrow`, as: "arrow", ...down },
  ];
  return { tiles: [...ends, ...nested(graph, paneled(graph, block, placed))].map(share) };
}

/** **What a tile says under its name**, as it grows on screen: its counts and seats in one quiet
 *  line, then its preview — its attributes or records a row each, else its body or description. */
function said(graph: Graph, id: Id): Pick<InnerTile, "facts" | "rows"> {
  const f = facts_of(graph, id, false);
  const facts = [...f.counts.map((c) => `${c.n} ${c.word}`), ...f.ports.map((p) => p.name)]
    .join(" · ");
  const p = preview_of(graph, id);
  const rows = p?.rows?.map((r) => r.join("  ")) ?? p?.lines ?? [];
  return { ...(facts ? { facts } : {}), ...(rows.length ? { rows } : {}) };
}

/** One tile a diagram's structure lays: a block, a group's panel, a region's band (`odd` every
 *  other), a grid's header strip, a lifeline, a rule between rows, a flow's line or its arrow
 *  (`down` where it runs down). */
type Placed = Rect & { id: Id; as: "block" | "group" | "band" | "head" | "track" | "life" | "rule"
                         | "flow" | "arrow";
                       odd?: boolean; down?: boolean;
                       /** The tile it is nested in, and whether it holds tiles of its own. */
                       in?: Id; holds?: boolean };

/** **What a tile holds, nested inside it, at any depth**: under a line for its name, its members
 *  squarified by weight, a narrow gap between them, each in turn holding its own. Nesting stops
 *  where a member would be smaller than `FLOOR`: too small to show even its mark at the map's
 *  closest zoom. The drawing shows each from its own size on screen (theme `chip.tsx`). */
function nested(graph: Graph, placed: readonly Placed[]): Placed[] {
  return placed.flatMap((t): Placed[] => {
    const held = t.as === "block" && !mark_of(graph, t.id) ? members(graph, t.id) : [];
    if (!held.length) return [t];
    const body = below(inset(t, NEST.pad), NEST.head);
    const kids = squarified(graph, held, body, NEST.gap);
    if (kids.length < held.length
        || kids.some((k) => Math.min(k.x1 - k.x0, k.y1 - k.y0) < NEST.floor)) return [t];
    return [{ ...t, holds: true },
            ...nested(graph, kids.map((k) => ({ ...k, as: "block" as const, in: t.id })))];
  });
}

/** A nested tile's room: its name's line over its members, the air round them and between them,
 *  and the least a member may be laid at, in layout units. */
const NEST = { head: 14, pad: 2, gap: 2, floor: 4 };

/** **The one gap in a diagram's chip**: between any two of its tiles — layers, what sits in one,
 *  a grid's rows and columns — and, halved, round what a group,
 *  a band or a grid's cell holds, so every two blocks stand as far apart, in every chip alike —
 *  wide enough to read zoomed out. A grid's header strips sit closer (`HUG`). */
const GAP = 16;
const HUG = 4;

/** **A diagram's tiles laid by its structure**, filling `rect`: a layer with regions in bands, in
 *  list order as the entered view bands it — each region, and each run of loose blocks between
 *  them; anything else in the layers its lines rank it into (`layered`), run across or down as
 *  `way` says where it says. Whether the flow runs across, and the gaps between ranked layers. */
function laid(graph: Graph, ids: readonly Id[], rect: Rect, way?: boolean): Laid {
  const order = ids.filter((id) => is_region(graph, id));
  if (!order.length) return layered(graph, ids, rect, way);
  const bands: { region: Id | null; ids: Id[] }[] = [];
  for (const id of ids) {
    if (is_region(graph, id)) bands.push({ region: id, ids: members(graph, id) });
    else if (bands.at(-1)?.region === null) bands.at(-1)!.ids.push(id);
    else bands.push({ region: null, ids: [id] });
  }
  const across = rect.x1 - rect.x0 >= rect.y1 - rect.y0;
  const parts = tracks(across ? rect.x0 : rect.y0, across ? rect.x1 : rect.y1,
                       bands.map((b) => b.ids.reduce((n, id) => n + weight(graph, id), 0) || THIN),
                       GAP);
  const placed = bands.flatMap(({ region, ids: held }, i): Placed[] => {
    const [lo, hi] = parts[i]!;
    const r = across ? { ...rect, x0: lo, x1: hi } : { ...rect, y0: lo, y1: hi };
    if (!region) return layered(graph, held, r).placed;
    const odd = order.indexOf(region) % 2 === 1;
    return [{ ...r, id: region, as: "band", ...(odd ? { odd } : {}) },
            ...laid(graph, held, below(inset(r, GAP / 2), BAND_HEAD)).placed];
  });
  return { placed, across, gaps: [] };
}

/** A structure laid: its tiles, whether its flow runs across, and the middle of each gap between
 *  the layers its lines rank — none where no line ranks it. */
type Laid = { placed: Placed[]; across: boolean; gaps: number[] };

/** **Some blocks in the layers their lines rank them into**: each layer along the flow, what sits
 *  in it across in order, every one as large as it counts; blocks no line joins wrap after them,
 *  as many to a layer as the fullest holds, or in rows of their own where no line joins any. Of
 *  the ways to run it — across or down, or only `way` where it is said — the one whose tiles
 *  come nearest a card's shape. */
function layered(graph: Graph, ids: readonly Id[], rect: Rect, way?: boolean): Laid {
  const [w, h] = [rect.x1 - rect.x0, rect.y1 - rect.y0];
  if (!ids.length) return { placed: [], across: w >= h, gaps: [] };
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
    .flatMap((layers) => [true, false].filter((across) => way === undefined || across === way)
      .map((across) => ({ layers, across, off: off(layers, across) })))
    .reduce((a, b) => (b.off < a.off ? b : a));
  const by = (l: readonly Id[]) => l.reduce((n, id) => n + weight(graph, id), 0);
  const along = tracks(across ? rect.x0 : rect.y0, across ? rect.x1 : rect.y1, layers.map(by),
                       GAP);
  const placed = layers.flatMap((layer, i) => {
    const [a0, a1] = along[i]!;
    const cross = tracks(across ? rect.y0 : rect.x0, across ? rect.y1 : rect.x1,
                         layer.map((id) => weight(graph, id)), GAP);
    return layer.flatMap((id, j) => {
      const [c0, c1] = cross[j]!;
      return tile(graph, id, across ? { x0: a0, x1: a1, y0: c0, y1: c1 }
        : { x0: c0, x1: c1, y0: a0, y1: a1 });
    });
  });
  const ranked_layers = tied.size ? ranked.length : 0;
  const gaps = along.slice(0, Math.max(0, ranked_layers - 1)).map(([, end]) => end + GAP / 2);
  return { placed, across, gaps };
}

/** One block's tiles: a grid its panel and rows (`gridded`), a group its panel round its members
 *  laid in turn, anything else a block. */
function tile(graph: Graph, id: Id, r: Rect): Placed[] {
  const body = below(inset(r, GAP / 2), GROUP_HEAD - GAP / 2);
  if (is_grid(graph, id)) return [{ ...r, id, as: "group" }, ...gridded(graph, id, body)];
  if (is_holder(graph, id)) {
    return [{ ...r, id, as: "group" }, ...laid(graph, members(graph, id), body).placed];
  }
  return [{ ...r, id, as: "block" }];
}

/** What sits together in a grid: the blocks in one cell or merge, past the headers, and the rows
 *  and columns they reach. */
type Seat = { ids: Id[]; r: number; c: number; rows: number; cols: number };

/** **A grid's rows filled**: a quiet header strip over each column — and beside each row where
 *  it has no lifelines — never labelled; each row and column as large as what sits in it, an
 *  empty one thin. What sits in a cell or a merge widens, in every row it reaches, to the column
 *  line halfway to its nearest neighbour, so each row is full. A grid read as time has a lifeline down
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
  /** Its header blocks, each by the body lines it heads: a column's from the top row, a row's from
   *  the left column. */
  const heads = members(graph, id).flatMap((b) => {
    const at = region_of(graph, b);
    const role = head_of(graph, b);
    return at && (role === "col" || role === "row")
      ? [{ id: b, role, lo: (role === "col" ? at.c : at.r) - 1,
           hi: (role === "col" ? at.c + at.cols : at.r + at.rows) - 2 }] : [];
  });
  /** The lines past the headers, each as large as what sits in it, shared across a merge. */
  const [rows, cols] = [Array<number>(g.rows - 1).fill(0), Array<number>(g.cols - 1).fill(0)];
  for (const s of all) {
    const w = s.ids.reduce((n, b) => n + weight(graph, b), 0);
    for (let r = s.r; r < s.r + s.rows; r++) rows[r] = (rows[r] ?? 0) + w / s.rows;
    for (let c = s.c; c < s.c + s.cols; c++) cols[c] = (cols[c] ?? 0) + w / s.cols;
  }
  /** **Header strips widen to carry their names** where the grid has room for them, a whole
   *  label's line deep, laid once: the top where every row still keeps its own line after it, the
   *  side where every column keeps a few letters' width. */
  const keeps = (span: number, lines: number, least: number) =>
    (span - LABEL.strip) / Math.max(1, lines) - GAP / 2 >= least;
  const top = heads.some((h) => h.role === "col")
    && keeps(rect.y1 - rect.y0, rows.length, LABEL.row) ? LABEL.strip : STRIP;
  const side = heads.some((h) => h.role === "row")
    && keeps(rect.x1 - rect.x0, cols.length, LABEL.col) ? LABEL.strip : STRIP;
  /** The body under the header strips, beside the side ones where it has no lifelines: its
   *  first row's and column's air taken back, so the strips sit close by the blocks. */
  const body = { ...rect, y0: Math.min(rect.y1, rect.y0 + top + HUG - GAP / 4) };
  if (!life) body.x0 = Math.min(body.x1, body.x0 + side + HUG - GAP / 4);
  /** A labelled header's line is laid at least as wide, or as deep, as its label reads. */
  const xs = tracks(body.x0, body.x1, cols.map((v) => v || THIN), 0,
                    top === LABEL.strip ? LABEL.col + GAP / 2 : 0);
  const ys = tracks(body.y0, body.y1, rows.map((v) => v || THIN), 0,
                    side === LABEL.strip ? LABEL.row + GAP / 2 : 0);
  /** A strip over each column, and beside each row where it has no lifelines: its header
   *  block's, across every line it heads, else a quiet one of its own. */
  const strips = (role: "col" | "row", lines: readonly [number, number][]): Placed[] => {
    const named = heads.filter((h) => h.role === role && lines[h.lo] && lines[h.hi]);
    const free = lines.flatMap((_, i) => (named.some((h) => i >= h.lo && i <= h.hi) ? [] : [i]));
    const spans = [...named.map((h) => ({ id: h.id, lo: h.lo, hi: h.hi })),
                   ...free.map((i) => ({ id: `${id}@${role === "col" ? "head" : "side"}${i}`,
                                         lo: i, hi: i }))];
    return spans.map(({ id: at, lo, hi }) => {
      const [a, b] = [lines[lo]![0] + GAP / 4, lines[hi]![1] - GAP / 4];
      return role === "col"
        ? { x0: a, x1: b, y0: rect.y0, y1: rect.y0 + top, id: at, as: "head" as const }
        : { x0: rect.x0, x1: rect.x0 + side, y0: a, y1: b, id: at, as: "head" as const };
    });
  };
  /** A track behind each run of header strips, the grid's whole width or height. */
  const out: Placed[] = [{ ...rect, y1: rect.y0 + top, id: `${id}@heads`, as: "track" },
                         ...(life ? [] : [{ ...rect, y0: body.y0, x1: rect.x0 + side,
                                            id: `${id}@sides`, as: "track" as const }]),
                         ...strips("col", xs)];
  if (!life) out.push(...strips("row", ys));
  if (life) {
    xs.forEach(([a, b], c) => out.push({ ...body, x0: (a + b) / 2, x1: (a + b) / 2,
                                         y0: rect.y0 + top, id: `${id}@life${c}`,
                                         as: "life" }));
  } else {
    ys.slice(1).forEach(([a], r) => out.push({ ...body, x0: body.x0 + GAP / 2, y0: a, y1: a,
                                                id: `${id}@rule${r}`, as: "rule" }));
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
    /** A cell's rules part it from its neighbours, so what sits in it needs half the air. */
    out.push(...layered(graph, s.ids, inset({ x0, x1, y0, y1 }, GAP / 4)).placed);
  }
  return out;
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

/** A rect with its top brought down by `d`, never past its bottom. */
function below(r: Rect, d: number): Rect {
  return { ...r, y0: Math.min(r.y1, r.y0 + d) };
}

/** From `lo` to `hi` split by weight, `gap` between, each part at least `least` where the room
 *  holds every one at that: where each part lies. */
function tracks(lo: number, hi: number, ws: readonly number[], gap: number,
                least = 0): [number, number][] {
  const room = Math.max(0, hi - lo - gap * (ws.length - 1));
  const sizes = floored(room, ws, least * ws.length <= room ? least : 0);
  let at = lo;
  return sizes.map((v) => {
    const part: [number, number] = [at, at + v];
    at = part[1] + gap;
    return part;
  });
}

/** `room` shared by weight, each share at least `least`: those that would fall short are held at
 *  it, and the rest shared again by weight, until none falls short. */
function floored(room: number, ws: readonly number[], least: number): number[] {
  const held = new Set<number>();
  for (;;) {
    const free = ws.reduce((n, v, i) => (held.has(i) ? n : n + v), 0) || 1;
    const left = room - held.size * least;
    const short = ws.findIndex((v, i) => !held.has(i) && (left * v) / free < least);
    if (short < 0) return ws.map((v, i) => (held.has(i) ? least : (left * v) / free));
    held.add(short);
  }
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
 *  strips and how thin an empty row or column is. */
const GROUP_HEAD = 14;
const BAND_HEAD = 6;
const STRIP = 6;

/** A header strip carrying its name: how deep it is, and the least each row and column must keep
 *  beside it — a tile's line, a few letters' width. */
const LABEL = { strip: 16, row: 16, col: 32 };
const THIN = 0.35;

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

/** The map an element's picture comes from: the library's for a definition, else the models'. */
export function chip_map(graph: Graph, id: Id): "library" | "models" {
  return !graph.edges[id] && graph.blocks[id]?.def ? "library" : "models";
}

/** **An element's picture is a chip off the map**, never a scaled drawing: its own chip where it
 *  gathers anything — a diagram's members, a definition's uses — else the chip of the room it sits
 *  in, its own tile lit; a line lights both its ends. Null where the map draws neither. */
export function chip_for(graph: Graph, id: Id, scene: Scene): { chip: BoxNode; lit: Id[] } | null {
  const e = graph.edges[id];
  const chips = scene.nodes.filter((n) => n.type === "chip");
  const own = chips.find((n) => n.id === id && (n.data.tiles?.length || n.data.preview
    || n.data.bar));
  if (own) return { chip: own, lit: [] };
  const ends = e ? [e.from, e.to].map((x) => owner_of(graph, x) ?? x) : [id];
  const room = chips.find((n) => ends.every((x) => n.data.tiles?.some((t) => t.id === x)))
    ?? chips.find((n) => n.data.tiles?.some((t) => ends.includes(t.id)));
  return room ? { chip: room, lit: ends } : null;
}
