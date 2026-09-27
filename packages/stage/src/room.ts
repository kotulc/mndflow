/** The room a layer is drawn in, and the camera that frames it. */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import type { Id } from "@mnd/core";
import { box_of, extent, type BoxNode, type Frame, type Scene } from "@mnd/views";
import { BAND, FIT, FLIGHT, met_on, MIN_ZOOM, panelled, scroll_zoom, still } from "./arrays";


/** The room, kept until the layer or panel changes or the work outgrows it, and its fit. */
export function useRoom(scene: Scene) {
  /** How much room there is to draw in. */
  const seen = useStore(useCallback((st) => ({ w: st.width, h: st.height }), []),
                        (a, b) => a.w === b.w && a.h === b.h);
  const kept = useRef<{ of: Id | null; seen: string; room: Frame } | null>(null);
  const frame = useMemo(() => {
    const f = scene.frame;
    if (!f) { kept.current = null; return null; }
    const held = kept.current;
    const seen_key = `${seen.w}x${seen.h}`;
    const holds = held !== null && held.of === scene.layer && held.seen === seen_key
      && f.x >= held.room.x && f.y >= held.room.y
      && f.x + f.w <= held.room.x + held.room.w
      && f.y + f.h <= held.room.y + held.room.h;
    const room = holds
      ? { ...held!.room, label: f.label, ports: f.ports,
          ...(f.side ? { side: f.side } : {}), ...(f.seats ? { seats: f.seats } : {}) }
      : panelled(f, seen);
    kept.current = { of: scene.layer, seen: seen_key, room };
    return met_on(room, scene);
  }, [scene, seen]);

  /** The same band on every side. */
  const fit = useMemo(() => (frame && seen.w > BAND * 2
    ? { padding: (BAND * 2) / (seen.w - BAND * 2), maxZoom: 1 }
    : FIT), [frame, seen.w]);

  return { frame, fit, seen };
}

/** The camera flight on descending or leaving, the only animation, and opening out at the root.
 *  Scrolled, the camera fits the drawing's width, or `reach` of it, and follows the focus,
 *  centred on it. It never takes in more than `widest`. */
export function useCamera(scene: Scene, frame: Frame | null, fit: { padding: number },
                          seen: { w: number; h: number }, key: string, nodes: readonly BoxNode[],
                          scroll = false, focus: Id | null = null, reach: number | null = null,
                          widest: number | null = null) {
  const flow = useReactFlow();
  const was = useRef<Id | null | undefined>(undefined);
  /** How big the room was; a room that grew is fitted again. */
  const room = useRef<string>("");
  /** What was drawn a moment ago, where a descent's flight starts. */
  const drawn = useRef<readonly BoxNode[]>([]);

  /** Fit the room, leaving the band. Scrolled: the focus at the page's width, or the whole room
   *  with nothing in focus. */
  const settle = useCallback((duration: number) => {
    if (scroll) {
      const room = frame ?? extent(scene);
      const page = extent(scene);
      // With nothing in focus, the whole room is.
      const on = focus ? scene.nodes.find((n) => n.id === focus) : undefined;
      const box = on ? box_of(on) : room;
      // The page is `reach` wide, or wide enough for the focus where that is wider, up to `widest`.
      const w = Math.min(Math.max(reach ?? room.w, box.w), widest ?? Infinity);
      const zoom = scroll_zoom(w, box, seen, widest);
      // The focus is centred; with none, a page taller than the view is read from its top.
      const y = on || box.h * zoom <= seen.h - BAND * 2
        ? seen.h / 2 - (box.y + box.h / 2) * zoom
        : BAND - box.y * zoom;
      // The focus is centred, or read from its start where it is wider than the window; with none,
      // the window starts at the drawing's left, or centres a drawing narrower than it.
      const left = on ? (box.w > w ? box.x : box.x + box.w / 2 - w / 2)
        : page.w < w ? page.x + page.w / 2 - w / 2 : page.x;
      void flow.setViewport({ zoom, x: seen.w / 2 - (left + w / 2) * zoom, y }, { duration });
      return;
    }
    if (!frame) { void flow.fitView({ ...FIT, duration }); return; }
    void flow.fitBounds({ x: frame.x, y: frame.y, width: frame.w, height: frame.h },
                        { padding: fit.padding, duration });
  }, [flow, frame, fit, scroll, focus, reach, widest, scene, seen]);

  /** A new focus is flown to, and a cleared one opens out to the whole drawing. */
  useEffect(() => {
    if (scroll) settle(still() ? 0 : FLIGHT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useEffect(() => {
    const quiet = still();
    const last = was.current;
    const moved_layer = last !== undefined && last !== scene.layer;
    const rect = frame ? `${frame.x},${frame.y},${frame.w},${frame.h}` : "";
    const grew = !moved_layer && room.current !== rect;
    was.current = scene.layer;
    room.current = rect;
    const before = drawn.current;
    drawn.current = scene.nodes;

    if (grew) { settle(quiet ? 0 : FLIGHT); return; }
    if (!moved_layer) return;
    if (quiet) { settle(0); return; }
    /** Both ways start on the card and end on the room. */
    const back = last ? scene.nodes.find((n) => n.id === last) : undefined;
    const into = before.find((n) => n.id === scene.layer);
    if (back) {
      const b = box_of(back);
      void flow.fitBounds({ x: b.x, y: b.y, width: b.w, height: b.h }, { duration: 0 });
    } else if (into && frame) {
      const b = box_of(into);
      const vp = flow.getViewport();
      const on = { x: b.x * vp.zoom + vp.x, y: b.y * vp.zoom + vp.y,
                   w: b.w * vp.zoom, h: b.h * vp.zoom };
      const zoom = Math.max(MIN_ZOOM, on.w / frame.w);
      void flow.setViewport({
        zoom,
        x: on.x - frame.x * zoom,
        y: (on.y + on.h / 2) - (frame.y + frame.h / 2) * zoom,
      }, { duration: 0 });
    }
    settle(FLIGHT);
    /** The signature says when the drawing changed. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** The room changed size — the tray opened or shut, the explorer was dragged — so frame the
   *  drawing again. **A stage with no room left is left alone**: a tray taken to the full height
   *  leaves nothing to fit into, and fitting into it would only throw the camera away. */
  const sized = useRef<string>("");
  useEffect(() => {
    const now = `${seen.w}x${seen.h}`;
    const before = sized.current;
    sized.current = now;
    if (!before || before === now || seen.w < BAND * 2 || seen.h < BAND * 2) return;
    settle(still() ? 0 : FLIGHT);
  }, [seen, settle]);

  /** At the root, the camera opens out when the drawing outgrows it. */
  const took = useRef<{ of: Id | null; box: string } | null>(null);
  useEffect(() => {
    if (scroll || frame || !nodes.length || nodes.some((n) => n.dragging)) return;
    const box = extent(scene);
    const size = `${box.x},${box.y},${box.w},${box.h}`;
    const before = took.current;
    took.current = { of: scene.layer, box: size };
    if (!before || before.of !== scene.layer || before.box === size) return;
    const vp = flow.getViewport();
    const shown = { x: -vp.x / vp.zoom, y: -vp.y / vp.zoom,
                    w: seen.w / vp.zoom, h: seen.h / vp.zoom };
    const fits = box.x >= shown.x && box.y >= shown.y
      && box.x + box.w <= shown.x + shown.w && box.y + box.h <= shown.y + shown.h;
    if (fits) return;
    void flow.fitView({ ...FIT, duration: still() ? 0 : FLIGHT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, frame]);
}
