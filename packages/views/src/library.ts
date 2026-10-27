/** What the library knows of its definitions: where each is used, grouped by the model each use
 *  sits in, laid out **once** for the registry, the library's chip and the tray's small map alike;
 *  what a package or folder files. The library's own map is `map.ts`'s. Worked out on every graph
 *  change, never stored. */

import { hierarchy, treemap } from "d3-hierarchy";
import { children, definition_uses, is_folder, model_of, models, on_side, owner_of, package_of,
         shown_name, type Graph, type Id } from "@mnd/core";
import type { Placed } from "./arrange";
import { tiled, weight_of, type Tile as Weighed } from "./treemap";

/** One use of a definition, placed: what it is, the model it sits in, and how much it weighs — a
 *  block or a reference what it holds, a line one. */
export type LocatedUse = { id: Id; model: Id; weight: number;
                           kind: "block" | "reference" | "relation" };

/** A definition's uses, **grouped by the model each sits in**, models in the order they load. */
export function usage_groups(graph: Graph, def: Id): { model: Id; uses: LocatedUse[] }[] {
  const by = new Map<Id, LocatedUse[]>();
  for (const u of definition_uses(graph, def)) {
    const e = graph.edges[u.id];
    const model = model_of(graph, e ? owner_of(graph, e.from) : u.id);
    if (!model) continue;
    const weight = u.kind === "relation" ? 1 : weight_of(graph, u.id);
    const use = { id: u.id, model, weight, kind: u.kind };
    const list = by.get(model);
    if (list) list.push(use);
    else by.set(model, [use]);
  }
  const order = new Map(models(graph).map((m, n) => [m.id, n]));
  return [...by].sort(([a], [z]) => (order.get(a) ?? 0) - (order.get(z) ?? 0))
    .map(([model, uses]) => ({ model, uses }));
}

/** The box a model's uses of `def` sit in: an id of its own, never a block's. */
export function usage_box(def: Id, model: Id): Id {
  return `${def}@${model}`;
}

/** The model a usage box stands for, where an id is one. */
export function box_model(def: Id, id: Id): Id | null {
  return id.startsWith(`${def}@`) ? id.slice(def.length + 1) : null;
}

/** **A definition's uses laid out, once**: a box per model, each use as large as it weighs; a lone
 *  box left out, as the frame says it. Placed at card scale, or filling `size`. */
export function usage_layout(graph: Graph, def: Id, size?: { w: number; h: number }): Placed[] {
  const boxes: Weighed[] = usage_groups(graph, def).map((g) => ({
    id: usage_box(def, g.model), weight: 0,
    kids: g.uses.map((u) => ({ id: u.id, weight: u.weight })) }));
  return tiled(boxes.length === 1 ? boxes[0]!.kids! : boxes, size);
}

/** What a usage box is called: its model, and the model's package where it is not the
 *  workspace's. */
export function box_label(graph: Graph, model: Id): string {
  const pkg = package_of(graph, model);
  const name = shown_name(graph, model);
  return pkg === graph.root ? name : `${name} · ${graph.blocks[pkg]?.name ?? pkg}`;
}

/** A package by the name it was given; anything else by the name it shows. */
export function name_of(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  return b?.parent === null ? b.name ?? id : shown_name(graph, id);
}

/** What the library files under a package or folder: its folders and definitions. */
export function filed(graph: Graph, id: Id): Id[] {
  return children(graph, id).filter((b) => on_side(graph, b.id, "domain")
    && (is_folder(graph, b.id) || !!b.def)).map((b) => b.id);
}

/** One tile of a small map: what it is, its name, and where it lies in a map `w` by `h`. */
export type Tile = { id: Id; label: string; kind: "box" | "use" | "line" | "def";
                     x: number; y: number; w: number; h: number };

/** A definition's registry as a small map `w` by `h`: **the registry's own layout**, laid to fill
 *  the map rather than scaled into it. */
export function registry_map(graph: Graph, def: Id, w: number, h: number): Tile[] {
  return usage_layout(graph, def, { w, h }).map((p): Tile => {
    const model = box_model(def, p.id);
    const e = graph.edges[p.id];
    return { id: p.id, x: p.x, y: p.y, w: p.w, h: p.h,
             kind: model ? "box" : e ? "line" : "use",
             label: model ? box_label(graph, model)
               : e ? `${shown_name(graph, e.from)} → ${shown_name(graph, e.to)}`
               : shown_name(graph, p.id) };
  });
}

/** What a package or folder files, as a small map: its folders as boxes, each definition a tile
 *  as large as its uses. */
export function filed_map(graph: Graph, id: Id, w: number, h: number): Tile[] {
  type Leaf = { id: Id; kids?: Leaf[]; value?: number };
  const leaf = (at: Id): Leaf => (graph.blocks[at]?.def
    ? { id: at, value: definition_uses(graph, at).length + 1 }
    : { id: at, kids: filed(graph, at).map(leaf) });
  const root = hierarchy<Leaf>(leaf(id), (n) => n.kids?.length ? n.kids : undefined)
    .sum((n) => n.value ?? 0);
  const laid = treemap<Leaf>().size([w, h]).round(true).paddingInner(2).paddingOuter(3)
    .paddingTop((n) => (n.depth === 0 ? 3 : 14))(root);
  return laid.descendants().slice(1).map((n) => ({
    id: n.data.id, label: name_of(graph, n.data.id), kind: n.children ? "box" : "def",
    x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 }));
}
