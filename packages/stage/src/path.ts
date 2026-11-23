/** **A block's hops, lit** (2026-11-04): on a layer, the card under the pointer, else the one
 *  picked, lights what reaches it and what it reaches, a hop each way (core `reached`). **A map
 *  lights only what is picked** (the user, 2026-11-22: a treemap is containment alone), each box
 *  with what it holds (views `picked_trace`). The rest dims (`flow.css` *Hops lit*). Hover shows
 *  it while the pointer is on; a pick holds it. */

import { useEffect, useMemo, useState, type RefObject } from "react";
import { reached, type Graph, type Id } from "@mnd/core";
import { picked_trace, type Scene } from "@mnd/views";

/** What lights: cards and lines, or null where nothing joins. */
export type Lit = { blocks: readonly Id[]; lines: readonly Id[] } | null;


/** The hops lit: on a layer the card hovered, else the one picked; on a map what is picked. */
export function usePath(host: RefObject<HTMLElement>, graph: Graph, scene: Scene,
                        picked: readonly Id[]): Lit {
  const hovered = useOver(host);
  const one = picked.length === 1 ? picked[0]! : null;
  return useMemo(() => {
    if (scene.areas) return picked_trace(scene, picked);
    const lit = (on: Id | null): Lit => {
      if (!on || !graph.blocks[on]) return null;
      const t = reached(graph, on, scene.layer);
      return t.blocks.length > 1 || t.lines.length ? t : null;
    };
    return lit(hovered) ?? lit(one);
  }, [graph, scene, hovered, one, picked]);
}

/** The rule lighting the hops' cards and lines whole, over the dimming. */
export function path_rules(lit: NonNullable<Lit>): string {
  const node = (id: Id) => `.stage.pathing [data-testid="rf__node-${CSS.escape(id)}"]`;
  const line = lit.lines.flatMap((id) => [
    `.stage.pathing [data-testid="rf__edge-${CSS.escape(id)}"]`,
    `.stage.pathing [data-edge="${CSS.escape(id)}"]`]);
  return `${[...lit.blocks.map(node), ...line].join(",")} { opacity: 1; }`;
}

/** How long the pointer rests on a card before its hops light: a pointer passing over the
 *  canvas lights nothing. */
const REST = 250;

/** The card the pointer has rested on (`REST`), by its node; none off every card, at once. */
function useOver(host: RefObject<HTMLElement>): Id | null {
  const [on, set_on] = useState<Id | null>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let wait: ReturnType<typeof setTimeout> | undefined;
    /** The card the pointer is on now, lit or waiting to be. */
    let at: Id | null = null;
    const card = (t: EventTarget | null) => (t instanceof Element
      ? t.closest<HTMLElement>(".react-flow__node")?.dataset["id"] ?? null : null);
    const over = (e: PointerEvent) => {
      const id = card(e.target);
      if (id === at) return;
      at = id;
      clearTimeout(wait);
      wait = setTimeout(() => set_on(id), REST);
    };
    const out = (e: PointerEvent) => {
      if (card(e.relatedTarget)) return;
      at = null;
      clearTimeout(wait);
      set_on(null);
    };
    el.addEventListener("pointerover", over);
    el.addEventListener("pointerout", out);
    return () => {
      clearTimeout(wait);
      el.removeEventListener("pointerover", over);
      el.removeEventListener("pointerout", out);
    };
  }, [host]);
  return on;
}
