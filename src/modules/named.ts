/** Cross-project naming — `open` handed down from the page, so a reference
 *  reads its target without this layer reaching into the workspace.
 *
 *  `actual()` resolves inside one fold by design; the canvas and the table
 *  read names through here instead. */

import { isReference, nameOf } from "../graph/fold";
import { asTarget, type Element, type Graph } from "../graph/types";

/** asTarget, then `here` or `open[project]` — the same lookup workspace.resolve
 *  is, without importing workspace. */
function looking(
  here: Graph, open: Record<string, Graph>, of: string,
): Element | undefined {
  const { project, element: id } = asTarget(of);
  if (!project) return here.elements[id];

  return open[project]?.elements[id];
}

/** A path that names a project this `open` map does not hold. */
function shut(open: Record<string, Graph>, of: string): boolean {
  const { project } = asTarget(of);

  return project != null && !(project in open);
}

/** What an element draws as — through a reference when it is one, including
 *  across open projects. A target whose project is not open reads *closed*;
 *  one whose target is gone reads *missing*. */
export function shownName(
  here: Graph, open: Record<string, Graph>, node: Element | undefined,
): string {
  if (!node) return "";
  if (!isReference(node)) return nameOf(here, node);
  if (!node.of) return "missing";
  if (shut(open, node.of)) return "closed";

  const target = looking(here, open, node.of);
  if (!target) return "missing";

  const { project } = asTarget(node.of);
  const home = project ? (open[project] ?? here) : here;

  return nameOf(home, target);
}

/** What a reference stands in for — one hop, crossing projects when `open`
 *  holds the target's graph. */
export function stoodFor(
  here: Graph, open: Record<string, Graph>, id: string | null,
): Element | undefined {
  const node = id ? here.elements[id] : undefined;
  if (!node || !isReference(node)) return node;
  if (!node.of || shut(open, node.of)) return undefined;

  return looking(here, open, node.of);
}
