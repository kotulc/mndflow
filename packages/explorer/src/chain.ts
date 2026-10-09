/** The section chain: each section holds a pick, and the next lists what that pick holds.
 *
 *  A host declares its sections; this keeps what each holds — remembered per root, so going back
 *  restores it — and which one is in focus. Session state, never logged. Every section is one
 *  rule (core's `sections.ts`): it lists its root's subtree down to its cut, and the block it
 *  holds at its cut is the next section's root — **but the section the canvas looks into from
 *  inside lists the canvas's tree**, so browsing above it never takes away what is open. */

import { useState } from "react";
import { first_in, in_section, is_layer_view, root_below, trace, EDITOR, MAIN, type Graph,
         type Id, type Section, type Top, type View } from "@mnd/core";
import type { Mark } from "./rows";

/** One section, as a host declares it: core's section, the word its header wears, and what it
 *  holds before anything is chosen — absent, its first block at its cut. */
export type Slice = Section & {
  mark: Mark;
  first?: (graph: Graph, root: Id | null) => Id | null;
};

/** The chain as the explorer reads it: the sections, the root each lists (`undefined` where the
 *  section above holds nothing at its cut), what each holds, which is in focus, and what to
 *  tell when a row is chosen. */
export type Chain = {
  slices: readonly Slice[];
  roots: readonly (Id | null | undefined)[];
  held: readonly (Id | null)[];
  at: number;
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
  const key = (n: number, root: Id | null) => `${slices[n]!.id}|${root ?? "*"}`;
  /** The section the canvas looks into, and the root it lists there. */
  const pin = graph && view && is_layer_view(view.kind) && view.layer && graph.blocks[view.layer]
    ? { at: view.at, root: trace(graph, { top, sections: slices }, view.layer).roots[view.at] }
    : null;
  /** The root a section lists below a block held above it. */
  const below = (n: number, above: Id | null) => (!graph ? undefined
    : n === 0 ? (top === "workspace" ? graph.root : null)
    : root_below(graph, slices[n - 1]!.cut, above));
  slices.forEach((slice, n) => {
    const root = pin && pin.at === n && pin.root !== undefined ? pin.root
      : below(n, held[n - 1] ?? null);
    roots.push(root);
    if (!graph || root === undefined) { held.push(null); return; }
    const was = said[key(n, root)];
    const kept = was !== undefined && was !== null && in_section(graph, was, root, slice.cut);
    held.push(kept ? was : slice.first ? slice.first(graph, root) : first_in(graph, root, slice.cut));
  });
  /** Choosing a row holds it in its section and puts that section in focus. */
  const onChoose = (n: number, id: Id | null) => {
    const root = roots[n];
    if (root !== undefined) set_said((was) => ({ ...was, [key(n, root)]: id }));
    set_at(n);
  };
  /** A whole path held at once, each under the root the one above it gives. */
  const onTrace = (path: readonly (Id | null)[], focus = path.length - 1) => {
    const kept: Record<string, Id | null> = {};
    path.forEach((id, n) => {
      const root = below(n, path[n - 1] ?? null);
      if (root !== undefined) kept[key(n, root)] = id;
    });
    set_said((was) => ({ ...was, ...kept }));
    set_at(Math.max(0, focus));
  };
  const chain: Chain = { slices, roots, held, at: Math.min(at, slices.length - 1), onChoose,
                         onTrace };
  return chain;
}

/** The editor's sections, core's `EDITOR`: every package's domain — `main` held first — and the
 *  tree held with its structure under it. */
export function editor_slices(): Slice[] {
  const [definitions, structure] = EDITOR.sections;
  return [
    { ...definitions!, mark: "vocabulary",
      first: (graph, root) => (graph.blocks[MAIN] ? MAIN : first_in(graph, root, "tree")) },
    { ...structure!, mark: "usages" },
  ];
}
