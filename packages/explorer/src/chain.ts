/** The section chain: each section holds a pick, and the next lists what that pick holds.
 *
 *  A host declares its sections; this keeps what each holds — remembered per pick above, so going
 *  back restores it — and which one is in focus. Session state, never logged. Sections split one
 *  tree by role: package roots, a package's domain, a tree's structure. */

import { useState } from "react";
import { children, in_domain, organizes, package_of, packages, subtree, MAIN, type Graph,
         type Id } from "@mnd/core";
import type { Mark } from "./rows";

/** What a section lists: its top rows, and what it nests under them — a domain's holders and the
 *  trees they organize, a tree's structure, or nothing. */
export type Listing = { top: readonly Id[]; under: "domain" | "structure" | "none" };

/** One section, as a host declares it. `above` is what each section above holds, outermost
 *  first. */
export type Slice = {
  id: string;
  label: string;
  mark: Mark;
  list: (graph: Graph, above: readonly (Id | null)[]) => Listing;
  /** What it holds before anything is chosen; absent, its first row. */
  first?: (graph: Graph, above: readonly (Id | null)[]) => Id | null;
};

/** The chain as the explorer reads it: the sections, what each holds, which is in focus, and
 *  what to tell when a row is chosen. */
export type Chain = {
  slices: readonly Slice[];
  held: readonly (Id | null)[];
  at: number;
  onChoose: (at: number, id: Id | null) => void;
  /** Hold a whole path at once, outermost first; the last is in focus unless `at` says which. */
  onTrace: (path: readonly (Id | null)[], at?: number) => void;
};


/** What each section holds, remembered per pick above, and which is in focus. */
export function useChain(graph: Graph | null, slices: readonly Slice[]) {
  const [said, set_said] = useState<Record<string, Id | null>>({});
  const [at, set_at] = useState(slices.length - 1);
  const held: (Id | null)[] = [];
  const key = (n: number, path: readonly (Id | null)[] = held) =>
    `${slices[n]!.id}|${path.slice(0, n).map((h) => h ?? "*").join("|")}`;
  slices.forEach((slice, n) => {
    const above = held.slice(0, n);
    const was = said[key(n)];
    const kept = was !== undefined && was !== null && !!graph && listed(graph, slice, above, was);
    const first = !graph ? null
      : slice.first ? slice.first(graph, above) : slice.list(graph, above).top[0] ?? null;
    held.push(kept ? was : first);
  });
  /** Choosing a row holds it in its section and puts that section in focus. */
  const onChoose = (n: number, id: Id | null) => {
    set_said((was) => ({ ...was, [key(n)]: id }));
    set_at(n);
  };
  const onTrace = (path: readonly (Id | null)[], focus = path.length - 1) => {
    set_said((was) => ({ ...was, ...Object.fromEntries(path.map((id, n) => [key(n, path), id])) }));
    set_at(Math.max(0, focus));
  };
  const chain: Chain = { slices, held, at: Math.min(at, slices.length - 1), onChoose, onTrace };
  return chain;
}

/** The editor's sections: the packages, the domain of the one held — `main` first in the
 *  workspace, else its first tree — and the tree held with its structure under it. */
export function editor_slices(): Slice[] {
  return [
    { id: "packages", label: "packages", mark: "package",
      list: (graph) => packages_listing(graph), first: (graph) => graph.root },
    { id: "definitions", label: "definitions", mark: "vocabulary",
      list: (graph, [pack]) => domain_listing(graph, pack ?? null),
      first: (graph, [pack]) => {
        if (pack === graph.root && graph.blocks[MAIN]) return MAIN;
        return pack ? first_tree(graph, pack) : null;
      } },
    { id: "structure", label: "structure", mark: "usages",
      list: (graph, [, tree]) => structure_listing(tree && !organizes(graph, tree) ? tree : null),
      first: (graph, [, tree]) => (tree && !organizes(graph, tree) ? tree : null) },
  ];
}

/** Every package, a row each. */
export function packages_listing(graph: Graph): Listing {
  return { top: packages(graph).map((p) => p.id), under: "none" };
}

/** A package's domain: its trees, nested under the holders that organize them. */
export function domain_listing(graph: Graph, pkg: Id | null): Listing {
  return { top: pkg ? children(graph, pkg).map((b) => b.id) : [], under: "domain" };
}

/** A tree and its structure under it. */
export function structure_listing(tree: Id | null): Listing {
  return { top: tree ? [tree] : [], under: "structure" };
}

/** A domain's first tree, in reading order, past the holders organizing it. */
export function first_tree(graph: Graph, at: Id): Id | null {
  for (const b of children(graph, at)) {
    if (!organizes(graph, b.id)) return b.id;
    const deeper = first_tree(graph, b.id);
    if (deeper) return deeper;
  }
  return null;
}

/** Whether a section lists this for the picks above: a top row, or a block nested under one. */
export function listed(graph: Graph, slice: Slice, above: readonly (Id | null)[], id: Id): boolean {
  const { top, under } = slice.list(graph, above);
  if (top.includes(id)) return true;
  if (!graph.blocks[id] || under === "none") return false;
  if (under === "domain") {
    const pkg = graph.blocks[top[0] ?? ""]?.parent;
    return !!pkg && in_domain(graph, id) && package_of(graph, id) === pkg;
  }
  return top.some((tree) => subtree(graph, tree).includes(id));
}
