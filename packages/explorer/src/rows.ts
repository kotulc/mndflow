/** The explorer's rows: each section's header, then what it lists, laid out with depth, guides
 *  and folds. Pure, so a host can read the tree without drawing it. */

import { alias_of, branch_of, children, config_of, def_of, domain_of, is_holder, is_interface,
         is_named, organizes, relation_base, role_of, shown_name, tops_of, type Cut, type Graph,
         type Id, type Role } from "@mnd/core";
import { known, role_icon, type IconName } from "@mnd/theme";
import type { Chain } from "./chain";

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
                    /** Whether it is a group's or grid's own row: a header over what it holds,
                     *  which lists at its level rather than under it. */
                    head?: boolean;
                    /** How many groups and grids enclose it within its listing: what one holds
                     *  is joined to it by a line through their marks, never by a branch. */
                    band?: number;
                    /** The lines joining a group or grid to its members that cross this row, by
                     *  indent column: entering at its top, leaving at its foot, or both. */
                    ties?: { col: number; top: boolean; foot: boolean }[];
                    /** Whether its own tick is left out: a member hangs from its holder's row,
                     *  not from the branch both sit on. */
                    bare?: boolean;
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
    const root = chain.roots[at];
    if (folded.includes(key) || root === undefined) return;
    const start = out.length;
    const keyed = (route: string) => `${slice.id}/${route}`;
    for (const id of tops_of(graph, root)) {
      branch_rows(graph, { cut: slice.cut, root }, id, id, undefined, folded, out, keyed, 1, 0,
                  false, new Set());
    }
    for (const row of out.slice(start)) row.at = at;
  });
  return tied(guided(out));
}

/** Whether a lazy row was opened: its folds hold it as opened, never as shut. */
export function opened(folded: readonly Id[], id: Id): boolean {
  return folded.includes(`${OPENED}${id}`);
}


/** Where a row's branch ends: past every row under it, and every member of a group or grid it
 *  heads, which list at its level. */
export function end_of(rows: readonly Row[], i: number): number {
  const r = rows[i]!;
  let j = i + 1;
  while (j < rows.length && (rows[j]!.depth > r.depth
         || (rows[j]!.depth === r.depth && (rows[j]!.band ?? 0) > (r.band ?? 0)))) j++;
  return j;
}

/** The row a row hangs from: the nearest above it that is shallower, or the group or grid it is a
 *  member of; -1 for a top row. */
export function parent_of(rows: readonly Row[], i: number): number {
  const r = rows[i]!;
  for (let j = i - 1; j >= 0; j--) {
    const up = rows[j]!;
    if (up.depth < r.depth || (up.depth === r.depth && (up.band ?? 0) < (r.band ?? 0))) return j;
  }
  return -1;
}

/** A row nested under another: one deeper, still in every group it sits in, or, under a group
 *  or grid, a member at its level, one band further in. */
function nested(graph: Graph, parent: Id, depth: number, band: number) {
  const held = is_holder(graph, parent);
  return { depth: held ? depth : depth + 1, band: held ? band + 1 : band, bare: held };
}

/** What a row says of how it nests: a holder's head, its band, and whether it is bare. */
function placed(graph: Graph, id: Id, band: number, bare: boolean): Partial<Row> {
  return { ...(is_holder(graph, id) ? { head: true } : {}), ...(band ? { band } : {}),
           ...(bare ? { bare: true } : {}) };
}

/** A row and what its section lists under it: for a usage, its definition's blocks marked as
 *  parts, then its own children; nothing past the section's cut. Parts are listed only once the
 *  row is opened, so a definition reached through itself never lists forever. A group or grid
 *  lists what it holds at its own level. */
function branch_rows(graph: Graph, at: { cut: Cut; root: Id | null }, id: Id, route: string,
                     via: Id | undefined, folded: readonly Id[], out: Row[],
                     key: (route: string) => string, depth: number, band: number, bare: boolean,
                     seen: ReadonlySet<Id>): void {
  if (!graph.blocks[id]) return;
  const { parts, own, used } = branch_of(graph, id, at.cut, at.root, seen);
  const row_key = key(route);
  const lazy = parts.length > 0;
  out.push({ ...block_row(graph, id, depth, parts.length + own.length, row_key),
             ...placed(graph, id, band, bare), ...(via ? { via } : {}),
             ...(lazy ? { lazy: true } : {}), ...(held(graph, id) ? { held: true } : {}) });
  const shut = lazy ? !opened(folded, row_key) : folded.includes(row_key);
  if (shut) return;
  const deeper = used ? new Set([...seen, used]) : seen;
  const next = nested(graph, id, depth, band);
  for (const p of parts) {
    branch_rows(graph, at, p.id, `${route}/${p.id}`, id, folded, out, key, next.depth, next.band,
                next.bare, deeper);
  }
  for (const c of own) {
    branch_rows(graph, at, c.id, `${route}/${c.id}`, via, folded, out, key, next.depth,
                next.band, next.bare, deeper);
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

/** The line joining each open group or grid to its members, down its marks' column: from under
 *  its own mark to the top of its last member's, through every row between. */
function tied(rows: Row[]): Row[] {
  rows.forEach((h, i) => {
    if (!h.head) return;
    const end = end_of(rows, i);
    let last = -1;
    for (let j = i + 1; j < end; j++) if (rows[j]!.depth === h.depth) last = j;
    if (last < 0) return;
    const tie = (r: Row, top: boolean, foot: boolean) =>
      (r.ties ??= []).push({ col: h.depth, top, foot });
    tie(h, false, true);
    for (let j = i + 1; j <= last; j++) tie(rows[j]!, true, j < last || rows[j]!.depth > h.depth);
  });
  return rows;
}

/** Each row's guide columns: whether a row one deeper carries on below it, before the tree steps
 *  back out past that column. A group's members are not that row's kin, so they never carry a
 *  line on past a group that ends its branch. */
function guided(rows: Row[]): Row[] {
  rows.forEach((r, i) => {
    r.guides = Array.from({ length: r.depth }, (_, j) => {
      for (const next of rows.slice(i + 1)) {
        if (next.depth <= j) return false;
        if (next.depth === j + 1 && !next.bare) return true;
      }
      return false;
    });
  });
  return rows;
}
