/** What elements are called: names, handles, labels and the role every surface marks. */

import { attributes_of, base_named, base_of, def_at, def_of, edge_base, frozen,
         tree_of } from "./defs";
import { is_flat, is_group, shape_of } from "./holders";
import { children, is_container, stands_for, stood_def } from "./tree";
import { BASE_BLOCKS, BASE_RELATIONS, type Block, type Graph, type Id } from "./types";


/** The word each base reads as when nothing is named. */
const WORD: Record<string, string> = {
  block: "Block", folder: "Folder", interface: "Interface", reference: "Reference",
  group: "Group", grid: "Grid", note: "Note",
};

export function kind_word(graph: Graph, b: Block): string {
  const def = def_at(graph, b.def ? b.id : b.type);
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

/** Which counter an element draws its handle from: its base, so a folder still runs under F. */
export function alias_kind(graph: Graph, id: Id): string {
  if (graph.edges[id]) return "relation";
  return base_of(graph, id);
}

/** An element's handle while it is unnamed, or always when asked. */
export function alias_of(graph: Graph, id: Id, always = false): string {
  const held = graph.blocks[id] ?? graph.edges[id];
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
  const b = graph.blocks[id];
  if (!b) return false;
  /** A stand-in for a definition or a package reads as what it points at. */
  if (b.of && (def_at(graph, b.of) || graph.blocks[b.of]?.parent === null)) return true;
  const target = b.of ? stands_for(graph, id) : b;
  if (!target) return false;
  /** Only the name counts, never the body. */
  return !!target.name?.trim();
}

/** What a thing is called, and only that. */
export function shown_name(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  if (!b) return graph.edges[id] ? label_of(graph, id) || edge_base(graph, id) : "missing";
  if (b.of) {
    /** A stand-in for a definition or a package reads as what it points at, unless it was named
     *  itself. */
    const at = graph.blocks[b.of];
    const said = at && (at.def || at.parent === null) ? at.name : undefined;
    if (said && b.name?.trim()) return b.name.trim();
    if (said) return said;
    const target = stands_for(graph, id);
    if (!target || target.id === b.id) return "missing";
    return named(graph, target);
  }
  return named(graph, b);
}

/** A block's own name, or its kind word. */
function named(graph: Graph, b: Block): string {
  return b.name?.trim() || kind_word(graph, b);
}

/** What a line draws beside itself: its own name, else the name of the definition it follows, and
 *  nothing where it follows none. **The same rule a card reads** — `kind_word` answers it for a
 *  block, off the same key. */
export function label_of(graph: Graph, id: Id): string {
  const e = graph.edges[id];
  if (e?.name?.trim()) return e.name.trim();
  const d = def_at(graph, id) ?? def_at(graph, def_of(graph, id));
  return d && !shipped_name(d.name) ? d.name : "";
}

/** A base relation definition names its module, which is a word no run draws. */
function shipped_name(name: string): boolean {
  return BASE_RELATIONS.includes(name);
}

/** What sort of thing a card is, as the icon it wears in its top corner. A person may set their
 *  own over it with `card.icon`; this is what it draws when nobody has. */
export type Role = "block" | "folder" | "reference" | "interface" | "group" | "grid" | "note";

/** Every base that draws as itself. */
const ROLES: readonly string[] = ["block", "folder", "reference", "interface", "note",
                                  "group", "grid"];

/** A block that holds wears the mark of its shape, whatever kind it descends from. */
export function role_of(graph: Graph, id: Id): Role {
  /** A block a view flattens still reads as what it is. */
  const shape = shape_of(graph, id);
  if (shape && !is_flat(graph, id)) return shape;
  /** A stand-in for a definition wears its usages' role. */
  const stood = stood_def(graph, id);
  const base = stood ? base_named(graph, stood.id) ?? "block" : base_of(graph, id);
  return ROLES.includes(base) ? base as Role : "block";
}

/** The system marks a card wears in its bottom corner: **what it stands for**, never how it
 *  opens — its icon says that. Derived, never set. At most three, in this order: what a stand-in
 *  stands in for, then whether it holds structure, then whether it carries data. */
export type Mark = "reference" | "definition" | "package" | "structure" | "data";

/** What each mark means, in a phrase — the legend's wording, kept beside the type it reads. */
export const MARK_MEANING: Record<Mark, string> = {
  reference: "stands for a block elsewhere",
  definition: "stands for a definition",
  package: "stands for a package",
  structure: "holds structure: blocks of its own",
  data: "carries data: values, or attributes",
};

/** The workspace definition whose attributes a block's data answers, or null where it has none:
 *  a definition of its own that declares attributes, else the one what it holds answers. A
 *  package's own attributes are its vocabulary, not the workspace's data. */
export function schema_def(graph: Graph, id: Id): Id | null {
  const own = (type: Id | undefined) => {
    const d = def_at(graph, type);
    return d && !frozen(graph, d.id) && attributes_of(graph, d.id).length ? d.id : null;
  };
  if (def_at(graph, id)) return own(id);
  const b = graph.blocks[id];
  if (!b) return null;
  return own(b.type) ?? children(graph, id).map((k) => own(k.type)).find(Boolean) ?? null;
}

/** Whether a block holds structure: it sits in a tree and holds blocks there, its interfaces
 *  apart. A package or a folder of definitions holds none. */
export function holds_structure(graph: Graph, id: Id): boolean {
  return tree_of(graph, id) !== null && is_container(graph, id);
}

/** What a card is stamped with: what a stand-in stands in for, then — of the block it stands for,
 *  where it is one — whether that is a definition holding structure, and whether it carries data.
 *  The structure mark tells a definition with structure from one without; a block inside a
 *  structure never wears it. */
export function stamps_of(graph: Graph, id: Id): Mark[] {
  const b = graph.blocks[id];
  if (!b) return [];
  const out: Mark[] = [];
  const at = b.of ? graph.blocks[b.of] : undefined;
  if (b.of) out.push(at?.def ? "definition" : at?.parent === null ? "package" : "reference");
  const self = at && at.id !== id ? at : b;
  if (self.def && holds_structure(graph, self.id)) out.push("structure");
  if (self.values?.some((v) => v.value) || attributes_of(graph, self.def ? self.id : self.type).length) {
    out.push("data");
  }
  return out;
}

/** The blocks a definition is used by: those it types, those tagged with it or carrying it as a
 *  trait, and the definitions with an attribute typed by it. A subtype extends it rather than
 *  using it. */
export function used_by(graph: Graph, def: Id): Block[] {
  return Object.values(graph.blocks).filter((b) => (!b.def && b.type === def)
    || !!b.tags?.includes(def) || !!b.traits?.includes(def)
    || !!b.def?.attributes?.some((a) => a.type === def));
}

/** The definitions that extend this one directly. */
export function subtypes(graph: Graph, def: Id): Block[] {
  return Object.values(graph.blocks).filter((b) => b.def && b.type === def);
}

/** Whether a card opens onto a drawing of its own: a block holding blocks, a usage whose
 *  definition does, a reference to one that does, or a stand-in for a definition. A group never
 *  does: what it holds is drawn in place. A grid opens onto its grid view. */
export function opens(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  if (!b || is_group(graph, id)) return false;
  if (is_container(graph, id)) return true;
  if (!b.def && def_at(graph, b.type) && is_container(graph, b.type!)) return true;
  if (b.of && def_at(graph, b.of)) return is_container(graph, b.of);
  const target = b.of ? stands_for(graph, id) : null;
  return !!target && target.id !== id && is_container(graph, target.id);
}
