/** The explorer's rows: each section's header, then what it lists, laid out with depth, guides
 *  and folds. Pure, so a host can read the tree without drawing it. */

import { alias_of, all_defs, branch_of, children, config_of, def_of, domain_of,
         holds_structure, is_group, is_interface, is_named, package_of, packages, relation_base,
         role_of, shown_name, stamps_of, tops_of, type Block, type Cut, type Graph, type Id,
         type Role } from "@mnd/core";
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
                    /** Whether it holds structure, as its card's structure mark says. */
                    held?: boolean;
                    /** Whether the label is a chosen name or the type word. */
                    named: boolean;
                    /** The handle an unnamed row wears. */
                    alias: string;
                    /** Per indent column, whether its guide line carries on past this row. */
                    guides: boolean[] };

/** What the explorer stores, in its folds, for a branch somebody opened. **Every branch is shut
 *  until opened**, so a long tree starts short. */
export const OPENED = "+";

/** The icons of the tree's own marks. A role wears its card's icon, so a row and its card agree. */
const OWN: Record<Own, IconName> = {
  locked: "locked",
  vocabulary: "word_def",
  usages: "word_use",
  root: "role_folder",
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
 *  picks the sections above hold. `every` lists every branch, opened or not. */
export function tree_of(graph: Graph, folded: readonly Id[], chain: Chain, every = false): Row[] {
  const out: Row[] = [];
  chain.slices.forEach((slice, at) => {
    const key = `@${slice.id}`;
    out.push({ id: key, ref: key, depth: 0, label: slice.label, kids: 1, mark: slice.mark,
               of: "pack", at, named: true, alias: "", guides: [] });
    const root = chain.roots[at];
    if (folded.includes(key) || root === undefined) return;
    const start = out.length;
    const keyed = (route: string) => `${slice.id}/${route}`;
    const tops = slice.trees ? trees_of(graph, chain.drawn) : tops_of(graph, root);
    for (const id of tops) {
      branch_rows(graph, { cut: slice.cut, root, every }, id, id, undefined, folded, out, keyed,
                  1, new Set());
    }
    for (const row of out.slice(start)) row.at = at;
  });
  return guided(out);
}

/** Whether a branch was opened: its folds hold it as opened. */
export function opened(folded: readonly Id[], id: Id): boolean {
  return folded.includes(`${OPENED}${id}`);
}


/** Where a row's branch ends: past every row under it. */
export function end_of(rows: readonly Row[], i: number): number {
  const r = rows[i]!;
  let j = i + 1;
  while (j < rows.length && rows[j]!.depth > r.depth) j++;
  return j;
}

/** The row a row hangs from: the nearest above it that is shallower; -1 for a top row. */
export function parent_of(rows: readonly Row[], i: number): number {
  const r = rows[i]!;
  for (let j = i - 1; j >= 0; j--) if (rows[j]!.depth < r.depth) return j;
  return -1;
}

/** The block whose row stands for this one: itself, or for a group, which has no row, the
 *  nearest block holding it that is not one. */
export function listed_of(graph: Graph, id: Id): Id {
  let at = id;
  while (is_group(graph, at) && graph.blocks[at]?.parent) at = graph.blocks[at]!.parent!;
  return at;
}

/** A row and what its section lists under it: for a usage, its definition's blocks marked as
 *  parts, then its own children; nothing past the section's cut. What a row holds lists only
 *  once it is opened — so a definition reached through itself never lists forever — unless
 *  every branch is asked for. */
function branch_rows(graph: Graph, at: { cut: Cut; root: Id | null; every: boolean }, id: Id,
                     route: string,
                     via: Id | undefined, folded: readonly Id[], out: Row[],
                     key: (route: string) => string, depth: number,
                     seen: ReadonlySet<Id>): void {
  if (!graph.blocks[id]) return;
  const branch = branch_of(graph, id, at.cut, at.root, seen);
  const parts = unheld(graph, branch.parts);
  const own = unheld(graph, branch.own);
  const row_key = key(route);
  out.push({ ...block_row(graph, id, depth, parts.length + own.length, row_key),
             ...(via ? { via } : {}),
             ...(stamps_of(graph, id).includes("structure") ? { held: true } : {}) });
  /** Parts are never listed whole: a definition may be reached through itself. */
  const every = at.every && !via && !parts.length;
  if (!every && !opened(folded, row_key)) return;
  const deeper = branch.used ? new Set([...seen, branch.used]) : seen;
  for (const p of parts) {
    branch_rows(graph, at, p.id, `${route}/${p.id}`, id, folded, out, key, depth + 1, deeper);
  }
  for (const c of own) {
    branch_rows(graph, at, c.id, `${route}/${c.id}`, via, folded, out, key, depth + 1, deeper);
  }
}

/** What a row lists of these blocks: each, but a group by what it holds, at its level. */
function unheld(graph: Graph, blocks: readonly Block[]): Block[] {
  return blocks.flatMap((b) => (is_group(graph, b.id) ? unheld(graph, under(graph, b.id)) : [b]));
}

/** Every tree holding structure, by its package's place, and the one the canvas draws among them
 *  however little it holds. */
function trees_of(graph: Graph, drawn: Id | null): Id[] {
  const rank = new Map(packages(graph).map((p, n) => [p.id, n]));
  return all_defs(graph).filter((d) => d.id === drawn || holds_structure(graph, d.id))
    .sort((a, z) => (rank.get(package_of(graph, a.id)) ?? 0) - (rank.get(package_of(graph, z.id)) ?? 0))
    .map((d) => d.id);
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
