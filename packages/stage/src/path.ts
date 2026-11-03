/** **A behaviour's path, lit** (flow-plan stages 4, 7): the card or chip under the pointer, else
 *  the one picked, lights what its behaviours travel — on a layer its cards and lines (core
 *  `travels`), on a map its path traced chip to chip (views `trace_of`); the rest dims (`flow.css`
 *  *A path lit*). Hover shows it while the pointer is on; a pick holds it. */

import { useEffect, useMemo, useState, type RefObject } from "react";
import { travels, type Graph, type Id } from "@mnd/core";
import { trace_of, type Scene, type Trace } from "@mnd/views";

/** What lights: the path's cards and lines, on a map its trace, or null where nothing travels. */
export type Lit = { blocks: readonly Id[]; lines: readonly Id[] } | Trace | null;


/** The path lit, from the card or chip hovered or the one picked. */
export function usePath(host: RefObject<HTMLElement>, graph: Graph, scene: Scene,
                        picked: readonly Id[]): Lit {
  const hovered = useOver(host);
  const on = hovered ?? (picked.length === 1 ? picked[0]! : null);
  return useMemo(() => {
    if (!on || !graph.blocks[on]) return null;
    if (scene.areas) return trace_of(graph, scene, on);
    const t = travels(graph, on, scene.layer);
    return t.blocks.length > 1 || t.lines.length ? t : null;
  }, [graph, scene, on]);
}

/** The rule lighting a path's cards and lines whole, over the dimming. */
export function path_rules(lit: NonNullable<Lit>): string {
  const node = lit.blocks.map((id) => `.stage.pathing [data-testid="rf__node-${CSS.escape(id)}"]`);
  const line = lit.lines.flatMap((id) => [`.stage.pathing [data-testid="rf__edge-${CSS.escape(id)}"]`,
                                          `.stage.pathing [data-edge="${CSS.escape(id)}"]`]);
  return `${[...node, ...line].join(",")} { opacity: 1; }`;
}

/** The card the pointer is on, by its node; none off every card. */
function useOver(host: RefObject<HTMLElement>): Id | null {
  const [on, set_on] = useState<Id | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const card = (t: EventTarget | null) => (t instanceof Element
      ? t.closest<HTMLElement>(".react-flow__node")?.dataset["id"] ?? null : null);
    const over = (e: PointerEvent) => set_on(card(e.target));
    const out = (e: PointerEvent) => { if (!card(e.relatedTarget)) set_on(null); };
    el.addEventListener("pointerover", over);
    el.addEventListener("pointerout", out);
    return () => {
      el.removeEventListener("pointerover", over);
      el.removeEventListener("pointerout", out);
    };
  }, [host]);
  return on;
}
