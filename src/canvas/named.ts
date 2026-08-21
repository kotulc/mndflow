/** Cross-project naming — `workspace.resolve` handed down from the page,
 *  the same inversion as `graph/check.ts`'s `validating()`.
 *
 *  `actual()` resolves inside one fold by design; the canvas and the table
 *  read names through here instead. */

import { isReference, nameOf } from "../graph/fold";
import { asTarget, type Element, type Graph } from "../graph/types";
import { resolve } from "../workspace";

/** What an element draws as — through a reference when it is one, including
 *  across open projects. A target whose project is not open reads *missing*. */
export function shownName(
  here: Graph, open: Record<string, Graph>, node: Element | undefined,
): string {
  if (!node) return "";
  if (!isReference(node)) return nameOf(here, node);
  if (!node.of) return "missing";

  const target = resolve(here, open, node.of);
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
  if (!node.of) return undefined;

  return resolve(here, open, node.of);
}
