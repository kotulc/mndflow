/** The workspace's library shelf: the folders somebody made, and where its own definitions sit. */

import { shipped } from "./defs";
import type { Definition, Graph, Id, Shelved } from "./types";

type Group = "block" | "relation";

/** One row of a group's shelf: a folder or a definition, with what sits in it. */
export type ShelfNode = { id: Id; folder: boolean; name: string; kids: ShelfNode[] };

/** Whether a definition is the workspace's own to file: not a base, a default or a package's. */
export function shelvable(d: Definition | undefined): boolean {
  return !!d && !shipped(d) && d.default === undefined && !d.from;
}

/** Every entry in order, a definition nobody filed last by name, and nothing that has gone. */
export function shelf_of(graph: Graph): Shelved[] {
  const kept = (graph.blocks[graph.root]?.shelf ?? [])
    .filter((s) => s.name !== undefined || shelvable(graph.defs[s.id]));
  const filed = new Set(kept.map((s) => s.id));
  const loose = Object.values(graph.defs)
    .filter((d) => shelvable(d) && !filed.has(d.id))
    .sort((a, z) => a.name.localeCompare(z.name))
    .map((d): Shelved => ({ id: d.id, group: d.group }));
  return [...kept, ...loose];
}

/** Whether an entry is a folder. */
export const is_shelf = (graph: Graph, id: Id): boolean =>
  (graph.blocks[graph.root]?.shelf ?? []).some((s) => s.id === id && s.name !== undefined);

/** One group's shelf as a tree, in order. A folder that went missing sets its contents at the top. */
export function shelf_tree(graph: Graph, group: Group): ShelfNode[] {
  const entries = shelf_of(graph).filter((s) => s.group === group);
  const folders = new Set(entries.filter((s) => s.name !== undefined).map((s) => s.id));
  const seen = new Set<Id>();
  const under = (at: Id | undefined): ShelfNode[] => entries
    .filter((s) => (s.in && folders.has(s.in) ? s.in : undefined) === at && !seen.has(s.id))
    .map((s) => {
      seen.add(s.id);
      return { id: s.id, folder: s.name !== undefined, name: s.name ?? graph.defs[s.id]?.name ?? "",
               kids: s.name !== undefined ? under(s.id) : [] };
    });
  return under(undefined);
}

/** Whether a folder sits anywhere under another, or is it. */
export function shelved_under(graph: Graph, id: Id, folder: Id): boolean {
  const shelf = shelf_of(graph);
  const seen = new Set<Id>();
  for (let at: Id | undefined = id; at && !seen.has(at); at = shelf.find((s) => s.id === at)?.in) {
    if (at === folder) return true;
    seen.add(at);
  }
  return false;
}

/** The shelf with these entries moved into a folder (absent is the top), before a sibling or last. */
export function reshelved(graph: Graph, ids: readonly Id[], into?: Id, before?: Id): Shelved[] {
  const shelf = shelf_of(graph);
  const moving = shelf.filter((s) => ids.includes(s.id))
    .map(({ in: _was, ...s }): Shelved => (into ? { ...s, in: into } : s));
  const rest = shelf.filter((s) => !ids.includes(s.id));
  const at = before ? rest.findIndex((s) => s.id === before) : -1;
  return at < 0 ? [...rest, ...moving] : [...rest.slice(0, at), ...moving, ...rest.slice(at)];
}
