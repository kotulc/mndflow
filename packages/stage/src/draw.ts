/** The right button draws: from a card a relationship, across the ground a grid. */

import { useCallback, useRef, useState } from "react";
import type { Id, Point } from "@mnd/core";
import { FRAME, type Scene } from "@mnd/views";
import { NUDGE } from "./arrays";
import type { FlowViewProps } from "./gestures";
import { spread } from "./pointer";


export function useDraw(scene: Scene, at: (e: { clientX: number; clientY: number }) => Point,
                        onRelate: FlowViewProps["onRelate"], onSweep: FlowViewProps["onSweep"]) {
  const drew = useRef<
    { x: number; y: number; on: string | null; cell?: boolean } | null>(null);
  const [drawing, draw] = useState<{ from: Point; to: Point; on: string | null } | null>(null);
  /** Set after a draw, so the context menu that follows is ignored. */
  const swallow = useRef(false);

  /** The card under a page point, or the frame where that is the room's rim. */
  const over = useCallback((x: number, y: number): { on: Id | null } => {
    const el = document.elementFromPoint(x, y);
    if (el instanceof Element && el.closest(".mnd-rim")) return { on: FRAME };
    const node = el instanceof Element ? el.closest(".react-flow__node") : null;
    const id = node?.getAttribute("data-id") ?? null;
    return { on: id === FRAME ? null : id };
  }, []);

  const pressed = useCallback((e: React.PointerEvent) => {
    swallow.current = false;
    if (e.button !== 2) return;
    /** A press that began on a cell is not a sweep. */
    const el = e.target instanceof Element ? e.target : null;
    drew.current = { x: e.clientX, y: e.clientY, ...over(e.clientX, e.clientY),
                     ...(el?.closest(".mnd-grid-cell") ? { cell: true } : {}) };
  }, [over]);

  const moved_to = useCallback((e: React.PointerEvent) => {
    const from = drew.current;
    if (!from) return;
    if (!drawing && Math.hypot(e.clientX - from.x, e.clientY - from.y) < NUDGE) return;
    draw({ from: at({ clientX: from.x, clientY: from.y }), to: at(e), on: from.on });
  }, [drawing, at]);

  const released = useCallback((e: React.PointerEvent) => {
    const from = drew.current;
    drew.current = null;
    const was = drawing;
    draw(null);
    if (!from || e.button !== 2 || !was) return;
    swallow.current = true;
    const to = over(e.clientX, e.clientY);
    /** An end on the room's wall is an end on the open layer. */
    const began = from.on === FRAME ? scene.layer : from.on;
    const landed = to.on === FRAME ? scene.layer : to.on;
    if (began && landed && landed !== began) {
      onRelate?.(began, landed);
      return;
    }
    if (!from.on && !to.on && !from.cell) onSweep?.(spread(was.from, was.to));
  }, [drawing, over, onRelate, onSweep, scene.layer]);

  return { drawing, swallow, pressed, moved_to, released };
}
