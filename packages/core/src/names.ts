/** What elements are called: names, handles, labels and the role every surface marks. */

import { base_of, def_of, edge_base, outside, schema_of } from "./defs";
import { children, stands_for } from "./tree";
import { BASE_BLOCKS, BASE_RELATIONS, type Block, type Graph, type Id } from "./types";


/** The word each base reads as when nothing is named; a boundary has none. */
const WORD: Record<string, string> = {
  block: "Block", folder: "Folder", interface: "Interface", reference: "Reference",
  group: "", grid: "", note: "Note",
};

export function kind_word(graph: Graph, b: Block): string {
  const def = b.type ? graph.defs[b.type] : undefined;
  if (def && !BASE_BLOCKS.includes(def.name)) {
    return def.name.charAt(0).toUpperCase() + def.name.slice(1);
  }
  return WORD[base_of(graph, b.id)] ?? "Block";
}

/** Which letter each kind's handles run under. */
export const ALIAS_LETTER: Record<string, string> = {
  block: "B", folder: "F", interface: "I", reference: "R",
  group: "G", grid: "D", note: "N", relation: "L",
};

/** Which counter an element draws its handle from: its base, so a folder still runs under F and a
 *  holder under the shape it draws as. */
export function alias_kind(graph: Graph, id: Id): string {
  if (graph.edges[id]) return "relation";
  const held = graph.holders[id];
  if (held) return held.arrangement === "grid" ? "grid" : "group";
  return base_of(graph, id);
}

/** An element's handle while it is unnamed, or always when asked. */
export function alias_of(graph: Graph, id: Id, always = false): string {
  const held = graph.blocks[id] ?? graph.holders[id] ?? graph.edges[id];
  if (!held || held.alias === undefined) return "";
  const named = is_named(graph, id);
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

/** Whether somebody named this element, as against the tag it wears until they do. A line counts
 *  as named by its own name or by the type it follows. */
export function is_named(graph: Graph, id: Id): boolean {
  const e = graph.edges[id];
  if (e) return !!e.name?.trim() || !!e.type;
  const held = graph.holders[id];
  if (held) return !!held.name?.trim();
  const b = graph.blocks[id];
  if (!b) return false;
  /** A definition and a package both carry a name of their own. */
  if (b.of && (graph.defs[b.of] || graph.packages[b.of])) return true;
  const target = b.of ? stands_for(graph, id) : b;
  if (!target) return false;
  /** Only the name counts, never the body. */
  return !!target.name?.trim();
}

/** What a thing is called, and only that. */
export function shown_name(graph: Graph, id: Id): string {
  /** A holder draws the name somebody gave it, and nothing where nobody did. */
  const held = graph.holders[id];
  if (held) return held.name?.trim() ?? "";
  const b = graph.blocks[id];
  if (!b) return graph.edges[id] ? label_of(graph, id) || edge_base(graph, id) : "missing";
  if (b.of) {
    /** A stand-in for a definition or a package reads as what it points at. */
    const said = graph.defs[b.of]?.name ?? graph.packages[b.of]?.name;
    if (said) return said;
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

/** What a line draws beside itself: its own name, else the name of the definition it follows, and
 *  nothing where it follows none. **The same rule a card reads** — `kind_word` answers it for a
 *  block, off the same key. */
export function label_of(graph: Graph, id: Id): string {
  const e = graph.edges[id];
  if (e?.name?.trim()) return e.name.trim();
  const d = graph.defs[id] ?? graph.defs[def_of(graph, id) ?? ""];
  return d && !shipped_name(d.name) ? d.name : "";
}

/** A base relation definition names its module, which is a word no run draws. */
function shipped_name(name: string): boolean {
  return BASE_RELATIONS.includes(name);
}

/** What sort of thing a card is, as the icon it wears in its top corner. A person may set their
 *  own over it with `card.icon`; this is what it draws when nobody has. */
export type Role = "block" | "folder" | "reference" | "interface" | "group" | "grid" | "note";

/** Every base that draws as itself. **A holder's two are here as well**: a block may name one,
 *  and when it does it should wear that mark rather than fall back to the plain card's. */
const ROLES: readonly string[] = ["block", "folder", "reference", "interface", "note",
                                  "group", "grid"];

export function role_of(graph: Graph, id: Id): Role {
  const held = graph.holders[id];
  if (held) return held.arrangement === "grid" ? "grid" : "group";
  const base = base_of(graph, id);
  return ROLES.includes(base) ? base as Role : "block";
}

/** The system marks a card wears in its bottom corner. Derived, never set — that is what the
 *  highlight colour says. A stand-in wears the one thing it stands for; anything else wears what
 *  describes it, and those stack. **Holding parts is not one of these**: that is said by filling
 *  the card's own icon, not by stamping a second. */
export type Mark = "reference" | "definition" | "package" | "data";

/** What each mark means, in a phrase — the legend's wording, kept beside the type it reads. */
export const MARK_MEANING: Record<Mark, string> = {
  reference: "stands for a block elsewhere",
  definition: "stands for a definition",
  package: "stands for a package",
  data: "carries data: field values, or a schema",
};

/** The workspace definition whose fields a block's data answers, or null where it has none: a
 *  definition of its own that declares fields, else the one what it holds answers — a table's
 *  schema is its rows'. A package's own fields are its vocabulary, not the workspace's data. */
export function schema_def(graph: Graph, id: Id): Id | null {
  const own = (type: Id | undefined) => {
    const d = type ? graph.defs[type] : undefined;
    return d && !outside(d) && schema_of(graph, d.id).length ? d.id : null;
  };
  if (graph.defs[id]) return own(id);
  const b = graph.blocks[id];
  if (!b) return null;
  return own(b.type) ?? children(graph, id).map((k) => own(k.type)).find(Boolean) ?? null;
}

/** What a card is stamped with: what it stands in for, alone, or else what describes it. A
 *  stand-in carries nothing of its own, so the two never meet. */
export function stamps_of(graph: Graph, id: Id): Mark[] {
  const b = graph.blocks[id];
  if (!b) return [];
  if (b.of) {
    return [graph.defs[b.of] ? "definition" : graph.packages[b.of] ? "package" : "reference"];
  }
  const out: Mark[] = [];
  if (b.fields?.some((f) => f.value) || schema_of(graph, b.type).length) out.push("data");
  return out;
}
