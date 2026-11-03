/** **A behaviour's path, lit** (flow-plan stage 4): the card under the pointer, else the one card
 *  picked, lights what its behaviours travel on the layer (core `travels`); the rest dims
 *  (`flow.css` *A path lit*). Hover shows it while the pointer is on; a pick holds it. */

import { useEffect, useMemo, useState, type RefObject } from "react";
import { travels, type Graph, type Id } from "@mnd/core";
import type { Scene } from "@mnd/views";

/** What lights: the path's cards and lines, or null where nothing travels. */
export type Lit = { blocks: readonly Id[]; lines: readonly Id[] } | null;


/** The path lit on a layer, from the card hovered or the one picked. A map lights none. */
export function usePath(host: RefObject<HTMLElement>, graph: Graph, scene: Scene,
                        picked: readonly Id[]): Lit {
  const hovered = useOver(host);
  const on = hovered ?? (picked.length === 1 ? picked[0]! : null);
  return useMemo(() => {
    if (scene.areas || !on || !graph.blocks[on]) return null;
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
