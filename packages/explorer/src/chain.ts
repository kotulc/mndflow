/** The section chain: each section holds a pick, and the next lists what that pick holds.
 *
 *  A host declares its sections; this keeps what each holds — remembered per root, so going back
 *  restores it — and which one is in focus. Session state, never logged. Every section is one
 *  rule (core's `sections.ts`): it lists its root's subtree down to its cut, and the block it
 *  holds at its cut is the next section's root — **but the section the canvas looks into from
 *  inside lists the canvas's tree**, so browsing above it never takes away what is open. **A
 *  section listing every tree stands apart**: what is held above never changes what it lists or
 *  holds; its root is the tree of its own pick, or the canvas's. */

import { useState } from "react";
import { first_in, holds_structure, in_section, is_inside, is_layer_view, root_below, trace,
         tree_of, EDITOR, MAIN, type Graph, type Id, type Section, type Top,
         type View } from "@mnd/core";
import type { Mark } from "./rows";

/** One section, as a host declares it: core's section, the word its header wears, and what it
 *  holds before anything is chosen — absent, its first block at its cut. */
export type Slice = Section & {
  mark: Mark;
  first?: (graph: Graph, root: Id | null) => Id | null;
  /** Whether it lists every tree holding structure as its top rows, apart from the section
   *  above, rather than the tree held there; the definition held above opens among them. */
  trees?: boolean;
};

/** The chain as the explorer reads it: the sections, the root each lists (`undefined` where the
 *  section above holds nothing at its cut), what each holds, which is in focus, and what to
 *  tell when a row is chosen. */
export type Chain = {
  slices: readonly Slice[];
  roots: readonly (Id | null | undefined)[];
  held: readonly (Id | null)[];
  at: number;
  /** The tree the canvas draws from inside, never its definition view, listed in its section even while it holds nothing. */
  drawn: Id | null;
  onChoose: (at: number, id: Id | null) => void;
  /** Hold a whole path at once, outermost first; the last is in focus unless `at` says which. */
  onTrace: (path: readonly (Id | null)[], at?: number) => void;
};


/** What each section holds, remembered per root, and which is in focus. `view` is what the canvas
 *  draws: the section it looks into from inside lists the canvas's tree. */
export function useChain(graph: Graph | null, slices: readonly Slice[], top: Top = "forest",
                         view: View | null = null) {
  const [said, set_said] = useState<Record<string, Id | null>>({});
  const [at, set_at] = useState(slices.length - 1);
  const held: (Id | null)[] = [];
  const roots: (Id | null | undefined)[] = [];
  const key = (n: number, root: Id | null) =>
    `${slices[n]!.id}|${slices[n]!.trees ? "*" : root ?? "*"}`;
  /** The section the canvas looks into, and the root it lists there. */
  const pin = graph && view && is_layer_view(view.kind) && view.layer && graph.blocks[view.layer]
    ? { at: view.at, root: trace(graph, { top, sections: slices }, view.layer).roots[view.at] }
    : null;
  /** The root a section lists below a block held above it. */
  const below = (n: number, above: Id | null) => (!graph ? undefined
    : n === 0 ? (top === "workspace" ? graph.root : null)
    : root_below(graph, slices[n - 1]!.cut, above));
  /** The tree the canvas draws from inside, never its definition view. */
  const drawn = pin && view && is_inside(view.kind) ? pin.root ?? null : null;
  slices.forEach((slice, n) => {
    const pinned = pin && pin.at === n && pin.root !== undefined ? pin.root : undefined;
    if (slice.trees) {
      /** Its own pick, kept while a tree it lists holds it; else the canvas's tree, or `main`. */
      const was = said[key(n, null)];
      const tree = graph && was ? tree_of(graph, was) : null;
      const kept = !!tree && (tree === drawn || holds_structure(graph!, tree));
      const pick = !graph ? null : kept ? was! : pinned ?? (graph.blocks[MAIN] ? MAIN : null);
      roots.push(!graph ? undefined : pinned ?? (pick ? tree_of(graph, pick) ?? pick : null));
      held.push(pick);
      return;
    }
    const root = pinned ?? below(n, held[n - 1] ?? null);
    roots.push(root);
    if (!graph || root === undefined) { held.push(null); return; }
    const was = said[key(n, root)];
    const kept = was !== undefined && was !== null && in_section(graph, was, root, slice.cut);
    held.push(kept ? was : slice.first ? slice.first(graph, root) : first_in(graph, root, slice.cut));
  });
  /** Choosing a row holds it in its section and puts that section in focus. */
  const onChoose = (n: number, id: Id | null) => {
    const root = roots[n];
    if (slices[n]!.trees) {
      set_said((was) => ({ ...was, [key(n, null)]: id }));
      set_at(n);
      return;
    }
    if (graph && id && root !== undefined && !in_section(graph, id, root, slices[n]!.cut)) {
      const way = trace(graph, { top, sections: slices }, id).held;
      if (way[n] === id) { onTrace(way.slice(0, n + 1), n); return; }
    }
    if (root !== undefined) set_said((was) => ({ ...was, [key(n, root)]: id }));
    set_at(n);
  };
  /** A whole path held at once, each under the root the one above it gives. */
  const onTrace = (path: readonly (Id | null)[], focus = path.length - 1) => {
    const kept: Record<string, Id | null> = {};
    path.forEach((id, n) => {
      const root = slices[n]?.trees ? null : below(n, path[n - 1] ?? null);
      if (root !== undefined) kept[key(n, root)] = id;
    });
    set_said((was) => ({ ...was, ...kept }));
    set_at(Math.max(0, focus));
  };
  const chain: Chain = { slices, roots, held, at: Math.min(at, slices.length - 1),
                         drawn, onChoose, onTrace };
  return chain;
}

/** The editor's sections, core's `EDITOR`: every package's domain — `main` held first — and the
 *  tree held with its structure under it. */
export function editor_slices(): Slice[] {
  const [definitions, structure] = EDITOR.sections;
  return [
    { ...definitions!, mark: "vocabulary",
      first: (graph, root) => (graph.blocks[MAIN] ? MAIN : first_in(graph, root, "tree")) },
    { ...structure!, mark: "usages", trees: true },
  ];
}
