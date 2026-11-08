/** **A block's hops, lit** (2026-11-04): the card or chip under the pointer, else the one
 *  picked, lights what reaches it and what it reaches, a hop each way — on a layer its cards and
 *  lines (core `reached`), on a map its legs chip to chip (views `trace_of`); while a path is
 *  walked, the step walked instead (`walking`). The rest dims (`flow.css` *Hops lit*). Hover
 *  shows it while the pointer is on; a pick holds it. */

import { useEffect, useMemo, useState, type RefObject } from "react";
import { reached, type Graph, type Hop, type Id } from "@mnd/core";
import { hop_trace, picked_trace, trace_of, type Scene, type Trace } from "@mnd/views";

/** What lights: cards and lines, on a map a trace, or null where nothing joins. */
export type Lit = { blocks: readonly Id[]; lines: readonly Id[] } | Trace | null;


/** The hops lit: the card or chip hovered; else the step walked; else the one picked; else, on a
 *  map, whatever is picked, hops or none, so a pick always reads the same way. */
export function usePath(host: RefObject<HTMLElement>, graph: Graph, scene: Scene,
                        picked: readonly Id[], walking: Hop | null = null): Lit {
  const hovered = useOver(host);
  const one = picked.length === 1 ? picked[0]! : null;
  return useMemo(() => {
    const lit = (on: Id | null): Lit => {
      if (!on || !graph.blocks[on]) return null;
      if (scene.areas) return trace_of(graph, scene, on);
      const t = reached(graph, on, scene.layer);
      return t.blocks.length > 1 || t.lines.length ? t : null;
    };
    const step = (h: Hop): Lit => (scene.areas ? hop_trace(graph, scene, [h])
      : { blocks: [h.from, h.to], lines: [] });
    return lit(hovered) ?? (walking ? step(walking) : lit(one)) ?? picked_trace(scene, picked);
  }, [graph, scene, hovered, walking, one, picked]);
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
