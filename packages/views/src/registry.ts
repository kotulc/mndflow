/** A registry read out, two ways: as a list — each entry, how many times it is used, and the
 *  blocks using it — and as a matrix — the blocks using any entry down the side, under the folders
 *  holding them, the entries across, each cell how many times. Past `MOST` blocks, they roll up
 *  into the folder or package holding them. Worked out on every read, never stored. */

import { is_folder, label_of, library_of, shown_name, users_of, uses_by, type Graph, type Id,
         type Registry } from "@mnd/core";

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
