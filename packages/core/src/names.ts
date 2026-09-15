/** What elements are called: names, handles, labels and the role every surface marks. */

import { def_of, edge_module, module_of } from "./defs";
import { is_container, stands_for } from "./tree";
import { BLOCK_MODULES, type Block, type BlockModule, type Graph, type Id } from "./types";


/** The word each kind reads as when nothing is named; a boundary has none. */
const WORD: Record<BlockModule, string> = {
  block: "Block", folder: "Folder", resource: "Resource",
  interface: "Interface", reference: "Reference", group: "", grid: "", note: "Note",
};

export function kind_word(graph: Graph, b: Block): string {
  const def = b.type ? graph.defs[b.type] : undefined;
  if (def && !BLOCK_MODULES.includes(def.name as BlockModule)) {
    return def.name.charAt(0).toUpperCase() + def.name.slice(1);
  }
  return WORD[module_of(graph, b.id)];
}

/** Which letter each kind's handles run under. */
export const ALIAS_LETTER: Record<string, string> = {
  block: "B", folder: "F", resource: "E", interface: "I", reference: "R",
  group: "G", grid: "D", note: "N", relation: "L",
};

/** Which counter an element draws its handle from. */
export function alias_kind(graph: Graph, id: Id): string {
  return graph.edges[id] ? "relation" : module_of(graph, id);
}

/** An element's handle while it is unnamed, or always when asked. */
export function alias_of(graph: Graph, id: Id, always = false): string {
  const held = graph.blocks[id] ?? graph.edges[id];
  if (!held || held.alias === undefined) return "";
  /** A line counts as named by its type. */
  const named = graph.edges[id] ? !!graph.edges[id]!.type : is_named(graph, id);
  if (!always && named) return "";
  return alias_name(alias_kind(graph, id), held.alias);
}

/** A serial as a mark: `B1`, `I4`, `L12`. */
export function alias_name(kind: string, n: number): string {
  return `${ALIAS_LETTER[kind] ?? "B"}${n}`;
}

/** The serial the next element of this kind takes. */
export function next_alias(graph: Graph, kind: string): number {
  return (graph.blocks[graph.root]?.counters?.[kind] ?? 0) + 1;
}

/** Whether somebody named this block, as against the tag it wears until they do. */
export function is_named(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  if (!b) return false;
  const target = b.of ? stands_for(graph, id) : b;
  if (!target) return false;
  /** Only the name counts, never the body. */
  return !!target.name?.trim();
}

/** What a thing is called, and only that. */
export function shown_name(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  if (!b) return graph.edges[id] ? label_of(graph, id) || edge_module(graph, id) : "missing";
  if (b.of) {
    const target = stands_for(graph, id);
    if (!target || target.id === b.id) return "missing";
    return named(graph, target);
  }
  return named(graph, b);
}

/** A block's own name, or its kind word; a boundary's is blank. */
function named(graph: Graph, b: Block): string {
  return b.name?.trim() || kind_word(graph, b);
}

/** What a line draws beside itself: the label of the definition it follows, or nothing. */
export function label_of(graph: Graph, id: Id): string {
  const d = graph.defs[id] ?? graph.defs[def_of(graph, id) ?? ""];
  return d?.label ?? "";
}

/** What a block is, as the one word every surface draws a mark for. */
export type Role = "block" | "container" | "folder" | "resource" | "reference"
                 | "interface" | "group" | "grid" | "note";

const MARKED: readonly string[] = ["folder", "resource", "reference", "interface", "group", "grid", "note"];

export function role_of(graph: Graph, id: Id): Role {
  const module = module_of(graph, id);
  if (MARKED.includes(module)) return module as Role;
  return is_container(graph, id) ? "container" : "block";
}
