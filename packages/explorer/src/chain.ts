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
import { first_in, in_section, is_inside, is_layer_view, root_below, trace,
         EDITOR, type Graph, type Id, type Section, type Top,
         type View } from "@mnd/core";
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
  /** The tree the canvas draws from inside, never its definition view, listed in its section even while it holds nothing. */
  drawn: Id | null;
  /** A definition drawn from inside a structure section, listed there before it holds anything. */
  opening: Id | null;
  onChoose: (at: number, id: Id | null) => void;
  /** Hold a whole path at once, outermost first; the last is in focus unless `at` says which. */
  onTrace: (path: readonly (Id | null)[], at?: number) => void;
  /** Hold nothing in any section, `at` in focus. */
  onClear?: (at: number) => void;
};


/** What each section holds, remembered per root, and which is in focus. `view` is what the canvas
 *  draws: the section it looks into from inside lists the canvas's tree. Unsaid, a section holds
 *  its first block; cleared, it holds nothing. */
export function useChain(graph: Graph | null, slices: readonly Slice[], top: Top = "forest",
                         view: View | null = null) {
  const [said, set_said] = useState<Record<string, Id | null | undefined>>({});
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
  /** The tree the canvas draws from inside, never its definition view. */
  const drawn = pin && view && is_inside(view.kind) ? pin.root ?? null : null;
  /** A definition the canvas is inside, which structure lists before it holds anything. */
  const opening = graph && view && is_inside(view.kind) && view.layer
    && graph.blocks[view.layer]?.def && slices[view.at]?.lists === "structure"
    ? view.layer : null;
  slices.forEach((slice, n) => {
    /** Structure lists every package, whatever the section above holds. */
    if (slice.lists === "structure") {
      const root = null;
      roots.push(graph ? root : undefined);
      if (!graph) { held.push(null); return; }
      const was = said[key(n, root)];
      if (was === null) { held.push(null); return; }
      const kept = was !== undefined
        && in_section(graph, was, root, slice.cut, slice.lists, opening);
      held.push(kept ? was
        : slice.first ? slice.first(graph, root) : first_in(graph, root, slice.cut, slice.lists));
      return;
    }
    const pinned = pin && pin.at === n && pin.root !== undefined ? pin.root : undefined;
    const root = pinned ?? below(n, held[n - 1] ?? null);
    roots.push(root);
    if (!graph || root === undefined) { held.push(null); return; }
    const was = said[key(n, root)];
    if (was === null) { held.push(null); return; }
    const kept = was !== undefined
      && in_section(graph, was, root, slice.cut, slice.lists, opening);
    held.push(kept ? was : slice.first ? slice.first(graph, root)
      : first_in(graph, root, slice.cut, slice.lists));
  });
  /** Choosing a row holds it in its section and puts that section in focus. */
  const onChoose = (n: number, id: Id | null) => {
    const root = roots[n];
    if (graph && id && root !== undefined
        && !in_section(graph, id, root, slices[n]!.cut, slices[n]!.lists, opening)) {
      const way = trace(graph, { top, sections: slices }, id).held;
      if (way[n] === id) { onTrace(way.slice(0, n + 1), n); return; }
    }
    if (root !== undefined) set_said((was) => ({ ...was, [key(n, root)]: id }));
    set_at(n);
  };
  /** A whole path held at once, each under the root the one above it gives; a section the path
   *  holds nothing in goes back to holding its first. */
  const onTrace = (path: readonly (Id | null)[], focus = path.length - 1) => {
    const kept: Record<string, Id | undefined> = {};
    path.forEach((id, n) => {
      const root = slices[n]?.lists === "structure" ? null : below(n, path[n - 1] ?? null);
      if (root !== undefined) kept[key(n, root)] = id ?? undefined;
    });
    set_said((was) => ({ ...was, ...kept }));
    set_at(Math.max(0, focus));
  };
  /** Every section, under the root it lists now, holding nothing. */
  const onClear = (focus: number) => {
    const none = Object.fromEntries(roots.flatMap((root, n) =>
      root === undefined ? [] : [[key(n, root), null]]));
    set_said((was) => ({ ...was, ...none }));
    set_at(focus);
  };
  const chain: Chain = { slices, roots, held, at: Math.min(at, slices.length - 1),
                         drawn, opening, onChoose, onTrace, onClear };
  return chain;
}

/** The editor's sections, core's `EDITOR`: the definition side, and structure under every package.
 *  Structure starts on the workspace. */
export function editor_slices(): Slice[] {
  const [definitions, structure] = EDITOR.sections;
  return [
    { ...definitions!, mark: "vocabulary" },
    { ...structure!, mark: "usages", first: (graph) => graph.root },
  ];
}
