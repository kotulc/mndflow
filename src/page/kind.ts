/** A layer's kind — derived from its children, never stored, never declared.
 *
 *  Settled 2026-08-18 (Clay): all-structure children read structure, all-
 *  behavior children read behavior, mixed reads as a **set** (a folder of
 *  stuff, so nothing constrains it), and no children defaults to structure.
 *  Per layer, never per project — a behavior nests inside a structure the
 *  same way a structure nests inside one, and `ViewKind` stays two: a set is
 *  *viewed* as a structure, and its setness shows only as the folder mark
 *  (P.5).
 *
 *  A child's own kind comes from its type's **package** — the one shipped
 *  package whose definitions read as behavior is `pkg_behavior` (`def_action`,
 *  `def_state`); every other package, and a definition with no package at
 *  all, reads structure. A proxy reads as whatever it points at, one hop,
 *  crossing projects through `workspace.resolve` when `open` names the
 *  target's graph — never as a kind of its own, which is what lets a set of
 *  proxies all pointing at structure blocks read as a structure layer.
 *
 *  This replaces `P.6`'s door, which set a kind by fiat on the root's own
 *  definition — the wrong shape, because it let one project be declared a
 *  kind its own contents disagreed with. The vocabulary is never filtered by
 *  what this returns: types in scope are types in scope, whatever a layer
 *  currently reads as. */

import { blocksOf, isProxy } from "../graph/fold";
import { asTarget, refAt, type Element, type Graph } from "../graph/types";
import { kindOf, viewOf, type ViewKind } from "../modules/view";
import { packId, resolve } from "../workspace";

/** The one shipped package whose definitions read as behavior. */
const BEHAVIOR_PACK = packId("behavior");

/** What a child stands for: itself, or one hop through a proxy. Unresolved —
 *  dangling, or its project not open — counts as nothing, the same as an
 *  untyped block gets below. */
function homeOf(
  graph: Graph, open: Record<string, Graph>, node: Element,
): { graph: Graph; element: Element } | null {
  if (!isProxy(node)) return { graph, element: node };
  if (!node.of) return null;

  const target = resolve(graph, open, node.of);
  if (!target) return null;

  const { project } = asTarget(node.of);
  return { graph: project ? (open[project] ?? graph) : graph, element: target };
}

/** One child's own kind: its type's package when it names one, else the
 *  definition's own view module — the same fallback a local, packageless
 *  definition already answers everywhere `viewOf` is asked (`BLOCK`'s
 *  default reads structure). */
function childKind(graph: Graph, open: Record<string, Graph>, node: Element): ViewKind {
  const home = homeOf(graph, open, node);
  if (!home?.element.type) return "structure";

  const { project } = refAt(home.element.type);
  if (project) return project === BEHAVIOR_PACK ? "behavior" : "structure";

  return kindOf(viewOf(home.graph, home.element).module);
}

/** What a layer reads as — the table P settled. A set is the mixed reading;
 *  everything else collapses onto `ViewKind`. */
export type LayerKind = ViewKind | "set";

/** A layer's kind: derived from its direct children, per layer. `open` is
 *  every project currently held, for a proxy that points across one — absent
 *  is fine for a layer known to hold none. */
export function layerKind(
  graph: Graph, layer: string | null, open: Record<string, Graph> = {},
): LayerKind {
  const kids = blocksOf(graph, layer);
  if (!kids.length) return "structure";

  const kinds = new Set(kids.map((k) => childKind(graph, open, k)));
  return kinds.size === 1 ? [...kinds][0]! : "set";
}

/** `ViewKind` stays two — a set is *viewed* as a structure, so a caller that
 *  only needs which of the three modules to offer collapses here rather than
 *  growing a third branch of its own. */
export function asViewKind(kind: LayerKind): ViewKind {
  return kind === "behavior" ? "behavior" : "structure";
}
