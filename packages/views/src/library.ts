/** What the library knows of its definitions: each one's uses and where they live, what a package
 *  or folder files, and the small maps the tray draws of both. The library's own map is
 *  `map.ts`'s. Worked out on every graph change, never stored. */

import { hierarchy, treemap } from "d3-hierarchy";
import { children, is_folder, lens_of, of_ref, on_side, path, shown_name, stands_for,
         type Graph, type Id } from "@mnd/core";
import { weight_of } from "./treemap";

/** What one use of a definition is: a block typed by it, a stand-in for it, or a line of it. */
type Use = { id: Id; home: Id; weight: number };

/** Every use of a definition: the blocks it types, the stand-ins for it, and the lines it types,
 *  each with the diagram it lives in. */
export function uses_of(graph: Graph, def: Id): Use[] {
  const out: Use[] = [];
  for (const b of Object.values(graph.blocks)) {
    if (b.def || b.parent === null || !on_side(graph, b.id, "structure")) continue;
    const typed = (b.type ?? "block") === def;
    const stands = of_ref(graph, b.id) && stands_for(graph, b.id)?.id === def;
    if (!typed && !stands) continue;
    out.push({ id: b.id, home: home_of(graph, b.id), weight: weight_of(graph, b.id) });
  }
  for (const e of Object.values(graph.edges)) {
    if ((e.type ?? "line") === def && graph.blocks[e.from]) {
      out.push({ id: e.id, home: home_of(graph, e.from), weight: 1 });
    }
  }
  return out;
}

/** The diagram a block lives in: its nearest block above it with a view of its own, else its
 *  package. */
function home_of(graph: Graph, id: Id): Id {
  const up = path(graph, id).map((b) => b.id).filter((x) => x !== id).reverse();
  const drawn = (x: Id) => !!lens_of(graph, x) && lens_of(graph, x) !== "folder";
  return up.find(drawn) ?? up[up.length - 1] ?? id;
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

/** A definition's registry as a small map `w` by `h`: its uses in boxes of the rooms they live
 *  in, each as large as what it holds. */
export function registry_map(graph: Graph, def: Id, w: number, h: number): Tile[] {
  type Leaf = { id: Id; kids?: Leaf[]; value?: number };
  const homes = new Map<Id, Use[]>();
  for (const u of uses_of(graph, def)) homes.set(u.home, [...homes.get(u.home) ?? [], u]);
  const root = hierarchy<Leaf>({ id: def, kids: [...homes].map(([home, list]) => ({
    id: `@home:${home}`, kids: list.map((u) => ({ id: u.id, value: u.weight })) })) },
  (n) => n.kids?.length ? n.kids : undefined).sum((n) => n.value ?? 0);
  const laid = treemap<Leaf>().size([w, h]).round(true).paddingInner(2).paddingOuter(3)
    .paddingTop((n) => (n.depth === 0 ? 3 : 14))(root);
  return laid.descendants().slice(1).map((n): Tile => {
    const id = n.data.id;
    const home = id.startsWith("@home:") ? id.slice("@home:".length) : null;
    const e = graph.edges[id];
    return { id, x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0,
             kind: home ? "box" : e ? "line" : "use",
             label: home ? `in ${shown_name(graph, home)}`
               : e ? `${shown_name(graph, e.from)} → ${shown_name(graph, e.to)}`
               : shown_name(graph, id) };
  });
}

/** What a package or folder files, as a small map: its folders as boxes, each definition a tile
 *  as large as its uses. */
export function filed_map(graph: Graph, id: Id, w: number, h: number): Tile[] {
  type Leaf = { id: Id; kids?: Leaf[]; value?: number };
  const leaf = (at: Id): Leaf => (graph.blocks[at]?.def
    ? { id: at, value: uses_of(graph, at).length + 1 } : { id: at, kids: filed(graph, at).map(leaf) });
  const root = hierarchy<Leaf>(leaf(id), (n) => n.kids?.length ? n.kids : undefined)
    .sum((n) => n.value ?? 0);
  const laid = treemap<Leaf>().size([w, h]).round(true).paddingInner(2).paddingOuter(3)
    .paddingTop((n) => (n.depth === 0 ? 3 : 14))(root);
  return laid.descendants().slice(1).map((n) => ({
    id: n.data.id, label: name_of(graph, n.data.id), kind: n.children ? "box" : "def",
    x: n.x0, y: n.y0, w: n.x1 - n.x0, h: n.y1 - n.y0 }));
}
