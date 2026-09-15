/** The right button draws: from a card a relationship, across the ground a grid. */

import { useCallback, useRef, useState } from "react";
import type { Id, Point, Side } from "@mnd/core";
import { holds, FRAME, type Scene } from "@mnd/views";
import { NUDGE } from "./arrays";
import type { FlowViewProps } from "./gestures";
import { spread } from "./pointer";

/** The four walls, in the order they are drawn. */
const SIDES: readonly Side[] = ["top", "right", "bottom", "left"];


export function useDraw(scene: Scene, at: (e: { clientX: number; clientY: number }) => Point,
                        onRelate: FlowViewProps["onRelate"], onSweep: FlowViewProps["onSweep"]) {
  const drew = useRef<
    { x: number; y: number; on: string | null; side?: Side; cell?: boolean } | null>(null);
  const [drawing, draw] = useState<{ from: Point; to: Point; on: string | null } | null>(null);
  /** Set after a draw, so the context menu that follows is ignored. */
  const swallow = useRef(false);

  /** The card under a page point, and the room wall where that is the frame. */
  const over = useCallback((x: number, y: number): { on: Id | null; side?: Side } => {
    const el = document.elementFromPoint(x, y);
    const rim = el instanceof Element ? el.closest(".mnd-rim") : null;
    if (rim) {
      const side = SIDES.find((s) => rim.classList.contains(`mnd-rim-${s}`));
      return { on: FRAME, ...(side ? { side } : {}) };
    }
    const node = el instanceof Element ? el.closest(".react-flow__node") : null;
    const id = node?.getAttribute("data-id") ?? null;
    /** A relationship never ends on a holder. */
    if (id && scene.nodes.some((n) => n.id === id && holds(n))) return { on: null };
    return { on: id === FRAME ? null : id };
  }, [scene]);

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
      /** The wall let go on is the wall the line meets. */
      onRelate?.(began, landed, {
        ...(from.on === FRAME && from.side ? { fromSide: from.side } : {}),
        ...(to.on === FRAME && to.side ? { toSide: to.side } : {}),
      });
      return;
    }
    if (!from.on && !to.on && !from.cell) onSweep?.(spread(was.from, was.to));
  }, [drawing, over, onRelate, onSweep, scene.layer]);

  return { drawing, swallow, pressed, moved_to, released };
}
