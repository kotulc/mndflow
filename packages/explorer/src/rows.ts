/** The explorer's rows: each section's header, then what it lists, laid out with depth, guides
 *  and folds. Pure, so a host can read the tree without drawing it. */

import { alias_of, base_of, children, config_of, def_of, domain_of, group_head, headed_group,
         is_group, is_holder, is_interface, is_named, relation_base, shape_of, shown_name,
         type Block, type Graph, type Id } from "@mnd/core";
import { known, type IconName } from "@mnd/theme";
import type { Chain, Listing } from "./chain";

export type Mark = "leaf" | "folder" | "interface" | "reference" | "note" | "group" | "grid" | "pin"
  | "locked" | "vocabulary" | "usages" | "root" | "package" | "line" | "tie" | "tag";

export type Row = { id: Id; depth: number; label: string; kids: number; mark: Mark;
                    /** The icon its definition names with `card.icon`, worn over its mark's. */
                    icon?: IconName;
                    /** What a row is: a block, or a section's own header. */
                    of: "block" | "pack";
                    /** The block the row stands for. */
                    ref: Id;
                    /** The section it is listed in, where there are sections. */
                    at?: number;
                    /** What choosing it holds as its section's pick; absent, it can't be chosen. */
                    pick?: Id;
                    /** Whether a definition has structure of its own: its icon lights, as a
                     *  block's that holds does. */
                    held?: boolean;
                    /** Whether the label is a chosen name or the type word. */
                    named: boolean;
                    /** The handle an unnamed row wears. */
                    alias: string;
                    /** Per indent column, whether its guide line carries on past this row. */
                    guides: boolean[] };

/** What a row reads as, as a mark. A `word` is three letters rather than a drawing, and is never
 *  filled: a fill closes its counters and leaves a blot. */
export const MARK: Record<Mark, { icon: IconName; word?: true }> = {
  leaf: { icon: "role_leaf" },
  folder: { icon: "role_folder" },
  interface: { icon: "role_interface" },
  reference: { icon: "role_reference" },
  note: { icon: "role_note" },
  group: { icon: "role_group" },
  grid: { icon: "role_table" },
  pin: { icon: "pin" },
  locked: { icon: "locked" },
  vocabulary: { icon: "word_def", word: true },
  usages: { icon: "word_use", word: true },
  root: { icon: "role_root" },
  package: { icon: "word_pkg", word: true },
  line: { icon: "relation_plain" },
  tie: { icon: "relation_tie" },
  tag: { icon: "role_note" },
};

/** The kinds a block row wears its base's mark for; any other block is a leaf. */
const MARKED: readonly string[] = ["folder", "reference", "note", "tag"];

/** The kinds a definition's row wears, holders among them: a definition is its kind. */
const KINDS: readonly string[] = [...MARKED, "interface", "group", "grid"];


/** What the tree draws under a block: every block it holds, in order. A seat on its wall is part
 *  of the block, not something it holds, and a group that is no layer only boxes its members on
 *  the layer they share, so it is no row: its members read in their own order. */
export function under(graph: Graph, parent: Id | null) {
  return children(graph, parent).filter((b) => !is_interface(b)
    && !(is_group(graph, b.id) && !children(graph, b.id).length));
}

/** Everything a group holds, however deep, in order: what dragging its head carries. */
export function inside(graph: Graph, group: Id): Id[] {
  return Object.values(graph.blocks).filter((b) => within(graph, b.id, group))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((b) => b.id);
}

/** The icon a block names with `card.icon`, where this set draws it: its own word first, then its
 *  definition's chain. */
export function card_icon(graph: Graph, id: Id): IconName | undefined {
  const own = graph.blocks[id]?.settings?.["card"]?.["icon"];
  const said = own ?? config_of(graph, def_of(graph, id), "card")["icon"];
  return typeof said === "string" && known(said) ? said : undefined;
}

/** The panel's rows. With a chain, each section's header — a label, never chosen — then what it
 *  lists for the picks the sections above hold. Without, the workspace's one tree from its root. */
export function tree_of(graph: Graph, folded: readonly Id[], chain?: Chain | null): Row[] {
  const out: Row[] = [];
  if (!chain) {
    out.push(block_row(graph, graph.root, 0, under(graph, graph.root).length, graph.root));
    if (!folded.includes(graph.root)) blocks_of(graph, graph.root, folded, out);
    return guided(out);
  }
  chain.slices.forEach((slice, at) => {
    const key = `@${slice.id}`;
    out.push({ id: key, ref: key, depth: 0, label: slice.label, kids: 1, mark: slice.mark,
               of: "pack", at, named: true, alias: "", guides: [] });
    if (folded.includes(key)) return;
    const start = out.length;
    listing_of(graph, slice.list(graph, chain.held.slice(0, at)), folded, out, slice.id);
    for (const row of out.slice(start)) row.at = at;
  });
  return guided(out);
}


/** Whether a block sits in a group, however deep. */
function within(graph: Graph, id: Id, group: Id): boolean {
  for (let at = graph.blocks[id]?.group; at; at = graph.blocks[at]?.group) if (at === group) return true;
  return false;
}

/** How far a row steps in on its layer: once for each headed group it sits in, but a head sits
 *  level with the group it heads. */
function indent(graph: Graph, id: Id): number {
  let n = 0;
  for (let at = graph.blocks[id]?.group; at; at = graph.blocks[at]?.group) if (group_head(graph, at)) n++;
  return headed_group(graph, id) ? n - 1 : n;
}

/** A section's rows: each top row, and what it lists under it. */
function listing_of(graph: Graph, listing: Listing, folded: readonly Id[], out: Row[],
                    section: string): void {
  const key = (id: Id) => `${section}/${id}`;
  const keep = (b: Block) => (listing.under === "defs" ? !!b.def : !b.def);
  if (listing.under === "defs") {
    domain_rows(graph, listing.top, folded, out, key, 1);
    return;
  }
  for (const id of listing.top) {
    const kids = listing.under === "none" ? 0 : under(graph, id).filter(keep).length;
    out.push({ ...block_row(graph, id, 1, kids, key(id)), ...(held(graph, id) ? { held: true } : {}) });
    if (kids && !folded.includes(key(id))) blocks_of(graph, id, folded, out, section, keep, 2);
  }
}

/** A package's domain as rows: each definition, a holder's members under it, and a folder's
 *  definitions under it. */
function domain_rows(graph: Graph, ids: readonly Id[], folded: readonly Id[], out: Row[],
                     key: (id: Id) => Id, depth: number): void {
  const here = new Set(ids);
  /** A member reads under its holder, so it is no top row of its own. */
  const loose = ids.filter((id) => !here.has(graph.blocks[id]?.group ?? ""));
  for (const id of loose) {
    const members = is_holder(graph, id) ? ids.filter((m) => graph.blocks[m]?.group === id) : [];
    const nested = children(graph, id).filter((b) => b.def).map((b) => b.id);
    const kids = [...members, ...nested];
    out.push({ ...block_row(graph, id, depth, kids.length, key(id)),
               ...(held(graph, id) ? { held: true } : {}) });
    if (!kids.length || folded.includes(key(id))) continue;
    domain_rows(graph, members, folded, out, key, depth + 1);
    domain_rows(graph, nested, folded, out, key, depth + 1);
  }
}

/** Whether a definition has structure of its own. */
function held(graph: Graph, id: Id): boolean {
  return !!graph.blocks[id]?.def && children(graph, id).some((b) => !b.def && !is_interface(b));
}

/** What a block holds, as a tree: each layer's blocks stepped in under the heads of the groups
 *  they sit in — a head holds its group's other members as a row holds its children, and folds
 *  them the same way. Rows in a section are keyed by it, as a block may list in two. */
function blocks_of(graph: Graph, parent: Id, folded: readonly Id[], out: Row[], section?: string,
                   keep: (b: Block) => boolean = () => true, from = 1): void {
  const key = (id: Id) => (section ? `${section}/${id}` : id);
  /** Whether a block is folded away under a head: in a group whose head is shut. */
  const hidden = (id: Id) => {
    for (let at = graph.blocks[id]?.group; at; at = graph.blocks[at]?.group) {
      const head = group_head(graph, at);
      if (head && head !== id && folded.includes(key(head))) return true;
    }
    return false;
  };
  const walk = (parent: Id, at: number) => {
    for (const b of under(graph, parent).filter(keep)) {
      if (hidden(b.id)) continue;
      const group = headed_group(graph, b.id);
      const kids = under(graph, b.id).filter(keep).length;
      const deep = at + indent(graph, b.id);
      out.push(block_row(graph, b.id, deep,
                         kids + (group ? inside(graph, group).length - 1 : 0), key(b.id)));
      if (!folded.includes(key(b.id))) walk(b.id, deep + 1);
    }
  };
  walk(parent, from);
}

/** A block's row: its name, its mark, and how many rows it holds. */
function block_row(graph: Graph, id: Id, depth: number, kids: number, key: Id): Row {
  const icon = card_icon(graph, id);
  return { ...(icon ? { icon } : {}), id: key, ref: id, pick: id, depth,
           label: shown_name(graph, id), kids, named: is_named(graph, id),
           alias: graph.blocks[id]?.parent === null ? "" : alias_of(graph, id), of: "block",
           mark: mark_of(graph, id), guides: [] };
}

/** The mark a row wears: a package's root or lock, a definition its kind's, else its shape or
 *  base. */
function mark_of(graph: Graph, id: Id): Mark {
  const b = graph.blocks[id];
  if (b?.parent === null) return id === graph.root ? "root" : "locked";
  if (b?.def && domain_of(graph, id) === "relation") return relation_base(graph, id) as Mark;
  const base = base_of(graph, id);
  if (b?.def && KINDS.includes(base)) return base as Mark;
  return shape_of(graph, id) ?? (MARKED.includes(base) ? base as Mark : "leaf");
}

/** Each row's guide columns: whether a row one deeper carries on below it, before the tree steps
 *  back out past that column. */
function guided(rows: Row[]): Row[] {
  rows.forEach((r, i) => {
    r.guides = Array.from({ length: r.depth }, (_, j) => {
      for (const next of rows.slice(i + 1)) {
        if (next.depth <= j) return false;
        if (next.depth === j + 1) return true;
      }
      return false;
    });
  });
  return rows;
}
