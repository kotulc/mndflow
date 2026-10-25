/** The explorer's rows: each section's header, then what it lists, laid out with depth, guides
 *  and folds. Pure, so a host can read the tree without drawing it. */

import { alias_of, branch_of, children, domain_of, KINDS, library_of, of_ref, on_side, opens,
         is_folder, is_grid, is_notation, is_box, is_named, relation_base, role_of, setting_of, shown_name, stamps_of, tops_of,
         type Block, type Cut, type Graph, type Id, type Lists, type Registry,
         type Role } from "@mnd/core";
import { known, MARK_ICON, role_icon, type IconName } from "@mnd/theme";
import type { Chain } from "./chain";

/** What a row reads as: a block's role, as its card reads, or one of the tree's own marks. */
export type Mark = Role | Own;

/** The tree's own marks: package roots, section headers, relation definitions, and the library's
 *  named components. */
type Own = "locked" | "vocabulary" | "usages" | "root" | "package" | "line" | "tie" | "library"
  | "type" | "tag" | "constraint";

export type Row = { id: Id; depth: number; label: string; kids: number; mark: Mark;
                    /** The icon its definition names with `card.icon`, worn over its mark's. */
                    icon?: IconName;
                    /** What a row is: a block, a section's own header, a package's group of named
                     *  components, or a named component. */
                    of: "block" | "pack" | "group" | "named";
                    /** The block the row stands for. */
                    ref: Id;
                    /** The section it is listed in. */
                    at?: number;
                    /** What choosing it holds as its section's pick; absent, it can't be chosen. */
                    pick?: Id;
                    /** The registry a package's group of named components opens. */
                    registry?: Registry;
                    /** The usage a part is seen through: a block of its definition's structure. */
                    via?: Id;
                    /** Whether it roots a structure, as its card's structure mark says. */
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
  usages: MARK_ICON.structure!,
  root: "role_folder",
  package: "word_pkg",
  line: "relation_plain",
  tie: "relation_tie",
  library: "data",
  type: "data",
  tag: "tag",
  constraint: "content_rule",
};

/** The icon a mark wears. */
export function mark_icon(mark: Mark): IconName {
  return mark in OWN ? OWN[mark as Own] : role_icon(mark);
}


/** What the tree draws under a block: every block it holds, in order. */
export function under(graph: Graph, parent: Id | null) {
  return children(graph, parent);
}

/** The icon a block names with `card.icon`, where this set draws it: its own word first, then its
 *  definition's chain. */
export function card_icon(graph: Graph, id: Id): IconName | undefined {
  const said = setting_of(graph, id, "card")["icon"];
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
    const forest = slice.lists === "structure";
    const tops = tops_of(graph, forest ? null : root ?? null).filter((id) => !forest
      || on_side(graph, id, "structure"));
    for (const id of tops) {
      branch_rows(graph, { cut: slice.cut, root, every, lists: slice.lists }, id, id, undefined,
                  folded, out, keyed, 1, new Set());
    }
    for (const row of out.slice(start)) row.at = at;
  });
  return guided(out);
}

/** A package's named components in the library, after its definitions: a *types* group, a *tags*
 *  group, then an *interfaces* group, each folded until opened, every component a row of its own,
 *  never a block. A group is its registry's row: chosen, it opens the registry. */
function named_rows(graph: Graph, pkg: Id, route: string, folded: readonly Id[], out: Row[],
                    key: (route: string) => string, depth: number): void {
  const lib = library_of(graph, pkg);
  const kinds = [{ key: "types" as const, mark: "type" as const, all: lib.types ?? [] },
                 { key: "tags" as const, mark: "tag" as const, all: lib.tags ?? [] },
                 { key: "interfaces" as const, mark: "interface" as const,
                   all: lib.interfaces ?? [] },
                 { key: "constraints" as const, mark: "constraint" as const,
                   all: lib.constraints ?? [] }];
  for (const kind of kinds) {
    if (!kind.all.length) continue;
    const id = key(`${route}/@${kind.key}`);
    out.push({ id, ref: id, depth, label: kind.key, kids: kind.all.length, mark: kind.mark,
               of: "group", registry: { pkg, kind: kind.key }, named: true, alias: "",
               guides: [] });
    if (!opened(folded, id)) continue;
    for (const c of kind.all) {
      out.push({ id: `${id}/${c.id}`, ref: c.id, depth: depth + 1, label: c.name, kids: 0,
                 mark: kind.mark, of: "named", named: true, alias: "", guides: [] });
    }
  }
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

/** The block whose row stands for this one: itself, or for notation, which has no row, the
 *  nearest block holding it that is not notation. */
export function listed_of(graph: Graph, id: Id): Id {
  let at = id;
  while (is_notation(graph, at) && graph.blocks[at]?.parent) at = graph.blocks[at]!.parent!;
  return at;
}

/** A row and what its section lists under it: for a usage, its definition's blocks marked as
 *  parts, then its own children; nothing past the section's cut. What a row holds lists only
 *  once it is opened — so a definition reached through itself never lists forever — unless
 *  every branch is asked for. */
function branch_rows(graph: Graph,
                     at: { cut: Cut; root: Id | null; every: boolean; lists?: Lists }, id: Id,
                     route: string,
                     via: Id | undefined, folded: readonly Id[], out: Row[],
                     key: (route: string) => string, depth: number,
                     seen: ReadonlySet<Id>): void {
  if (!graph.blocks[id]) return;
  const branch = branch_of(graph, id, at.cut, at.root, seen, at.lists);
  /** **The model lists rooms only**: what holds blocks; its other blocks list in the tray. */
  const listed = (bs: Block[]) => (at.lists === "structure"
    ? bs.filter((b) => is_room_row(graph, b.id)) : bs);
  const parts = listed(unheld(graph, branch.parts));
  const own = listed(unheld(graph, branch.own));
  const row_key = key(route);
  /** A package root in the library lists its named components after its definitions. */
  const lib = at.lists === "domain" && graph.blocks[id]!.parent === null ? library_of(graph, id) : {};
  const groups = KINDS.filter((k) => lib[k]?.length).length;
  out.push({ ...block_row(graph, id, depth, parts.length + own.length + groups, row_key),
             ...(via ? { via } : {}),
             ...(at.lists !== "structure" && stamps_of(graph, id).includes("structure")
               ? { held: true } : {}) });
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
  if (groups) named_rows(graph, id, route, folded, out, key, depth + 1);
}

/** Whether a block is a room, as the model lists it: a package, a folder, a grid, or a block
 *  holding blocks — never a stand-in, which is drawn where it stands. */
function is_room_row(graph: Graph, id: Id): boolean {
  if (of_ref(graph, id)) return false;
  return graph.blocks[id]?.parent === null || is_folder(graph, id) || is_grid(graph, id)
    || opens(graph, id);
}

/** What a row lists of these blocks: each, but notation never — a group or region by what it
 *  holds, at its level. */
function unheld(graph: Graph, blocks: readonly Block[]): Block[] {
  return blocks.flatMap((b) => (!is_notation(graph, b.id) ? [b]
    : is_box(graph, b.id) ? unheld(graph, under(graph, b.id)) : []));
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
