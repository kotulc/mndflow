/** A registry read out, three ways: as a list — each entry, how many times it is used, and the
 *  blocks using it — and as a matrix — the blocks using any entry down the side, under the folders
 *  holding them, the entries across, each cell how many times. Past `MOST` blocks, they roll up
 *  into the folder or package holding them — and on the canvas, as a treemap (`registry_scene`).
 *  Worked out on every read, never stored. */

import { is_folder, label_of, library_of, registry_at, registry_id, registry_of, shown_name,
         tag_at, type_at, users_of, uses_by, type Graph, type Id, type Registry } from "@mnd/core";
import { carried, trail_of } from "./derive";
import { cell, type BoxNode, type Scene } from "./scene";
import { PAD } from "./size";
import { tiled, type Tile } from "./treemap";

/** Where an entry is used: a block, or a folder standing for the blocks in it. */
export type User = { id: Id; name: string; uses: number };

export type Entry = { id: Id; name: string; description: string; uses: number; by: User[];
                      /** Whether `by` names folders rather than blocks. */
                      rolled: boolean };

/** How many blocks an entry names before they roll up into folders. */
export const MOST = 24;


export function entries_of(graph: Graph, registry: Registry, most = MOST): Entry[] {
  return (library_of(graph, registry.pkg)[registry.kind] ?? []).map((e) => {
    const users = users_of(graph, e.id);
    const rolled = users.length > most;
    const held: (readonly [Id, readonly Id[]])[] = rolled ? folders(graph, users)
      : users.map((u) => [u, [u]]);
    const by = held.map(([id, ids]) => ({
      id, name: graph.blocks[id] ? shown_name(graph, id) : label_of(graph, id),
      uses: ids.reduce((n, u) => n + uses_by(graph, e.id, u), 0) }))
      .sort((a, z) => z.uses - a.uses || a.name.localeCompare(z.name));
    return { id: e.id, name: e.name, description: e.description ?? "", rolled, by,
             uses: by.reduce((n, u) => n + u.uses, 0) };
  }).sort((a, z) => a.name.localeCompare(z.name));
}

/** A matrix row: a block, or a folder standing for the blocks in it, and its count per entry. */
export type Line = { id: Id; name: string; counts: number[]; uses: number };

export type Matrix = {
  /** The columns, in the list's order. */
  entries: Entry[];
  /** The rows under the folder holding them; rolled up, one group whose rows are folders. */
  groups: { id: Id; name: string; lines: Line[] }[];
  /** The most any cell holds, so heat reads against it. */
  max: number;
  rolled: boolean;
};

export function matrix_of(graph: Graph, registry: Registry, most = MOST): Matrix {
  const entries = entries_of(graph, registry, Infinity);
  const users = [...new Set(entries.flatMap((e) => e.by.map((u) => u.id)))];
  const rolled = users.length > most;
  const line = (id: Id, ids: readonly Id[]): Line => {
    const counts = entries.map((e) => ids.reduce((n, u) => n + uses_by(graph, e.id, u), 0));
    return { id, name: graph.blocks[id] ? shown_name(graph, id) : label_of(graph, id), counts,
             uses: counts.reduce((n, c) => n + c, 0) };
  };
  const by_name = (a: { name: string }, z: { name: string }) => a.name.localeCompare(z.name);
  const held = folders(graph, users);
  const groups = rolled
    ? [{ id: registry.pkg, name: "folders",
         lines: held.map(([f, ids]) => line(f, ids)).sort(by_name) }]
    : held.map(([f, ids]) => ({ id: f, name: shown_name(graph, f),
                                lines: ids.map((u) => line(u, [u])).sort(by_name) }))
      .sort(by_name);
  const max = Math.max(0, ...groups.flatMap((g) => g.lines.flatMap((l) => l.counts)));
  return { entries, groups, max, rolled };
}

/** Users gathered by the folder or package they sit in. */
function folders(graph: Graph, users: readonly Id[]): (readonly [Id, Id[]])[] {
  const by = new Map<Id, Id[]>();
  for (const u of users) {
    const at = folder_of(graph, u);
    by.set(at, [...by.get(at) ?? [], u]);
  }
  return [...by];
}

/** The nearest folder or package over a block; over a line, over the block it leaves. */
function folder_of(graph: Graph, id: Id): Id {
  let at = graph.blocks[id]?.parent ?? graph.blocks[graph.edges[id]?.from ?? ""]?.parent;
  while (at && !is_folder(graph, at) && graph.blocks[at]?.parent) at = graph.blocks[at]!.parent!;
  return at ?? graph.root;
}

/** A registry on the canvas, as a treemap; null for anything that is not a registry or an entry.
 *  **Opened on the registry**, each entry is a tile as large as its uses, in the box of its home
 *  folder — the one holding most of its uses — or *across folders* where none holds half, or *no
 *  uses*. **Opened on an entry**, the blocks using it, each as large as its uses there, in the
 *  boxes of their folders. A projection: nothing is dragged or written back. */
export function registry_scene(graph: Graph, id: Id): Scene | null {
  const registry = registry_at(graph, id);
  if (registry) return entries_scene(graph, id, registry);
  const of = registry_of(graph, id);
  return of ? users_scene(graph, id, of) : null;
}

/** The registry: its entries as tiles in the boxes of their home folders. */
function entries_scene(graph: Graph, id: Id, registry: Registry): Scene {
  const entries = entries_of(graph, registry, Infinity);
  const max = Math.max(1, ...entries.map((e) => e.uses));
  const across = `${id}/across`, none = `${id}/none`;
  const home = (e: Entry): Id => {
    if (!e.uses) return none;
    const by = new Map<Id, number>();
    for (const u of e.by) {
      const f = folder_of(graph, u.id);
      by.set(f, (by.get(f) ?? 0) + u.uses);
    }
    const [top, n] = [...by].sort((a, z) => z[1] - a[1])[0]!;
    return n * 2 >= e.uses ? top : across;
  };
  const homes = new Map<Id, Entry[]>();
  for (const e of entries) homes.set(home(e), [...homes.get(home(e)) ?? [], e]);
  const named = (g: Id) => (g === across ? "across folders" : g === none ? "no uses"
    : shown_name(graph, g));
  const tiles: Tile[] = [...homes].map(([g, list]) => ({ id: g, weight: 0,
    kids: list.map((e) => ({ id: e.id, weight: Math.max(e.uses, 1) })) }));
  const at = new Map(entries.map((e) => [e.id, e]));
  const nodes = tiled(tiles).map((p) => {
    const e = at.get(p.id);
    return e ? cell(e.id, p, { label: e.name, marks: [], count: e.uses, heat: e.uses / max,
                               ...(e.description ? { description: e.description } : {}) }, "tile")
      : cell(p.id, p, { label: named(p.id), marks: ["group"],
                        holds: (homes.get(p.id) ?? []).map((x) => x.id) }, "group");
  });
  return drawn(id, registry.kind, nodes, [...trail_of(graph, registry.pkg),
                                          { id, label: registry.kind }]);
}

/** An entry: the blocks using it, each as large as its uses there, in the boxes of their folders.
 *  A line carrying it is a tile of its own. */
function users_scene(graph: Graph, id: Id, registry: Registry): Scene {
  const users = users_of(graph, id);
  const folders = new Map<Id, Id[]>();
  for (const u of users) {
    const f = folder_of(graph, u);
    folders.set(f, [...folders.get(f) ?? [], u]);
  }
  const tiles: Tile[] = [...folders].map(([f, ids]) => ({ id: `${id}/${f}`, weight: 0,
    kids: ids.map((u) => ({ id: u, weight: uses_by(graph, id, u) })) }));
  const name = tag_at(graph, id)?.name ?? type_at(graph, id)?.name ?? id;
  const max = Math.max(1, ...users.map((u) => uses_by(graph, id, u)));
  const nodes = tiled(tiles).map((p) => {
    /** A block is its card's small face: its tile's size is its uses, never its content. */
    if (graph.blocks[p.id]) return cell(p.id, p, carried(graph, p.id, "small"));
    if (graph.edges[p.id]) {
      const n = uses_by(graph, id, p.id);
      return cell(p.id, p, { label: label_of(graph, p.id), marks: [], count: n, heat: n / max },
                  "tile");
    }
    const f = p.id.slice(id.length + 1);
    return cell(p.id, p, { label: shown_name(graph, f), marks: ["group"],
                           holds: folders.get(f) ?? [] }, "group");
  });
  const reg = registry_id(registry);
  return drawn(id, name, nodes, [...trail_of(graph, registry.pkg),
                                 { id: reg, label: registry.kind }, { id, label: name }]);
}

/** A treemap as a scene: its room round the tiles, under the registry's or the entry's name. */
function drawn(id: Id, label: string, nodes: BoxNode[], trail: Scene["trail"]): Scene {
  const right = Math.max(0, ...nodes.map((n) => n.position.x + (n.width ?? 0)));
  const bottom = Math.max(0, ...nodes.map((n) => n.position.y + (n.height ?? 0)));
  const frame = { x: -PAD, y: -PAD * 2, w: right + PAD * 2, h: bottom + PAD * 3, label,
                  ports: [] };
  return { layer: id, frame, nodes: nodes.map((n) => ({ ...n, draggable: false })), edges: [],
           perches: [], slots: ["display"], trail };
}
