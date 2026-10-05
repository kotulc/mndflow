/** The explorer's rows: each section's header, then what it lists, laid out with depth, guides
 *  and folds. Pure, so a host can read the tree without drawing it. */

import { alias_of, children, config_of, def_at, def_of, domain_of, headed_group, is_interface,
         is_named, organizes, relation_base, role_of, shown_name, type Graph, type Id,
         type Role } from "@mnd/core";
import { known, role_icon, type IconName } from "@mnd/theme";
import type { Chain, Listing } from "./chain";

/** What a row reads as: a block's role, as its card reads, or one of the tree's own marks. */
export type Mark = Role | Own;

/** The tree's own marks: package roots, section headers and relation definitions. */
type Own = "locked" | "vocabulary" | "usages" | "root" | "package" | "line" | "tie";

export type Row = { id: Id; depth: number; label: string; kids: number; mark: Mark;
                    /** The icon its definition names with `card.icon`, worn over its mark's. */
                    icon?: IconName;
                    /** What a row is: a block, or a section's own header. */
                    of: "block" | "pack";
                    /** The block the row stands for. */
                    ref: Id;
                    /** The section it is listed in. */
                    at?: number;
                    /** What choosing it holds as its section's pick; absent, it can't be chosen. */
                    pick?: Id;
                    /** The usage a part is seen through: a block of its definition's structure. */
                    via?: Id;
                    /** Whether its parts are listed only once it is opened: a usage reading its
                     *  definition through, folded until somebody unfolds it. */
                    lazy?: boolean;
                    /** Whether a tree has structure of its own: its icon lights, as a block's
                     *  that holds does. */
                    held?: boolean;
                    /** Whether the label is a chosen name or the type word. */
                    named: boolean;
                    /** The handle an unnamed row wears. */
                    alias: string;
                    /** Per indent column, whether its guide line carries on past this row. */
                    guides: boolean[] };

/** What the explorer stores, in its folds, for a lazy row somebody opened. */
export const OPENED = "+";

/** The icons of the tree's own marks. A role wears its card's icon, so a row and its card agree. */
const OWN: Record<Own, IconName> = {
  locked: "locked",
  vocabulary: "word_def",
  usages: "word_use",
  root: "role_root",
  package: "word_pkg",
  line: "relation_plain",
  tie: "relation_tie",
};

/** The icon a mark wears. */
export function mark_icon(mark: Mark): IconName {
  return mark in OWN ? OWN[mark as Own] : role_icon(mark);
}


/** What the tree draws under a block: every block it holds, in order, but the interfaces seated
 *  on its walls, which are part of it. */
export function under(graph: Graph, parent: Id | null) {
  return children(graph, parent).filter((b) => !is_interface(b));
}

/** Everything a group holds, however deep, in order: what dragging its head carries. */
export function inside(graph: Graph, group: Id): Id[] {
  const out: Id[] = [];
  const walk = (at: Id) => {
    for (const b of under(graph, at)) { out.push(b.id); walk(b.id); }
  };
  walk(group);
  return out;
}

/** The icon a block names with `card.icon`, where this set draws it: its own word first, then its
 *  definition's chain. */
export function card_icon(graph: Graph, id: Id): IconName | undefined {
  const own = graph.blocks[id]?.settings?.["card"]?.["icon"];
  const said = own ?? config_of(graph, def_of(graph, id), "card")["icon"];
  return typeof said === "string" && known(said) ? said : undefined;
}

/** The panel's rows: each section's header — a label, never chosen — then what it lists for the
 *  picks the sections above hold. */
export function tree_of(graph: Graph, folded: readonly Id[], chain: Chain): Row[] {
  const out: Row[] = [];
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

/** Whether a lazy row was opened: its folds hold it as opened, never as shut. */
export function opened(folded: readonly Id[], id: Id): boolean {
  return folded.includes(`${OPENED}${id}`);
}


/** How far a row steps in: a group's head sits level with its group. */
function head_back(graph: Graph, id: Id): number {
  return headed_group(graph, id) ? -1 : 0;
}

/** A section's rows: each top row, and what it nests under it. */
function listing_of(graph: Graph, listing: Listing, folded: readonly Id[], out: Row[],
                    section: string): void {
  const key = (route: string) => `${section}/${route}`;
  for (const id of listing.top) {
    if (listing.under === "none") { out.push(block_row(graph, id, 1, 0, key(id))); continue; }
    if (listing.under === "domain") { domain_rows(graph, id, folded, out, key, 1); continue; }
    structure_rows(graph, id, id, undefined, folded, out, key, 1, new Set());
  }
}

/** A domain row: a holder with what it organizes under it, or a tree, which lists alone — its
 *  structure is the next section's. */
function domain_rows(graph: Graph, id: Id, folded: readonly Id[], out: Row[],
                     key: (route: string) => string, depth: number): void {
  if (!organizes(graph, id)) {
    out.push({ ...block_row(graph, id, depth, 0, key(id)), ...(held(graph, id) ? { held: true } : {}) });
    return;
  }
  const kids = under(graph, id);
  out.push(block_row(graph, id, depth, kids.length, key(id)));
  if (folded.includes(key(id))) return;
  for (const b of kids) domain_rows(graph, b.id, folded, out, key, depth + 1);
}

/** A structure row and what it shows under it: for a usage, its definition's blocks marked as
 *  parts, then its own children. Parts are listed only once the row is opened, so a definition
 *  reached through itself never lists forever. */
function structure_rows(graph: Graph, id: Id, route: string, via: Id | undefined,
                        folded: readonly Id[], out: Row[], key: (route: string) => string,
                        depth: number, seen: ReadonlySet<Id>): void {
  const b = graph.blocks[id];
  if (!b) return;
  const used = !b.def ? def_at(graph, b.type) : undefined;
  const parts = used && !seen.has(used.id) ? under(graph, used.id) : [];
  const own = under(graph, id);
  const row_key = key(route);
  const lazy = parts.length > 0;
  out.push({ ...block_row(graph, id, depth + head_back(graph, id), parts.length + own.length, row_key),
             ...(via ? { via } : {}), ...(lazy ? { lazy: true } : {}),
             ...(held(graph, id) ? { held: true } : {}) });
  const shut = lazy ? !opened(folded, row_key) : folded.includes(row_key);
  if (shut) return;
  const deeper = used ? new Set([...seen, used.id]) : seen;
  for (const p of parts) {
    structure_rows(graph, p.id, `${route}/${p.id}`, id, folded, out, key, depth + 1, deeper);
  }
  for (const c of own) {
    structure_rows(graph, c.id, `${route}/${c.id}`, via, folded, out, key, depth + 1, deeper);
  }
}

/** Whether a tree has structure of its own. */
function held(graph: Graph, id: Id): boolean {
  return !organizes(graph, id) && under(graph, id).length > 0;
}

/** A block's row: its name, its mark, and how many rows it holds. */
function block_row(graph: Graph, id: Id, depth: number, kids: number, key: Id): Row {
  const icon = card_icon(graph, id);
  return { ...(icon ? { icon } : {}), id: key, ref: id, pick: id, depth,
           label: shown_name(graph, id), kids, named: is_named(graph, id),
           alias: graph.blocks[id]?.parent === null ? "" : alias_of(graph, id), of: "block",
           mark: mark_of(graph, id), guides: [] };
}

/** The mark a row wears: a package's root or lock, a relation definition its base's, else the
 *  role its card reads as. */
function mark_of(graph: Graph, id: Id): Mark {
  const b = graph.blocks[id];
  if (b?.parent === null) return id === graph.root ? "root" : "locked";
  if (b?.def && domain_of(graph, id) === "relation") return relation_base(graph, id) as Mark;
  return role_of(graph, id);
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
