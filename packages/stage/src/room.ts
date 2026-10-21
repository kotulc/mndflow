/** The camera: one owner of the viewport. In the world it fits the focus (world view) or reads
 *  it at 100%, scrolling inside its walls (reading view), and flies between foci. A page read
 *  down the view — the kit's reader — keeps its own scrolled camera. */

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import type { Id } from "@mnd/core";
import { box_of, extent, FRAME, type BoxNode, type Frame, type Scene } from "@mnd/views";
import { BAND, FIT, FLIGHT, MIN_ZOOM, scroll_zoom, still } from "./arrays";

type Rect = { x: number; y: number; w: number; h: number };

/** How a focus is looked at: fitted, or read at 100%. */
export type Mode = "world" | "read";


/** How much room there is to draw in, and the frame the focus draws as. */
export function useRoom(scene: Scene) {
  const seen = useStore(useCallback((st) => ({ w: st.width, h: st.height }), []),
                        (a, b) => a.w === b.w && a.h === b.h);
  return { frame: scene.frame ?? null, seen };
}

/** What the camera looks at: the focus's own box — a region stopped at, else the frame, else an
 *  opened grid's own node, else all that is drawn. */
export function aimed(scene: Scene, frame: Frame | null, stop: Rect | null): Rect {
  if (stop) return stop;
  if (frame) return frame;
  const own = scene.nodes.find((n) => n.id === scene.layer);
  return own ? box_of(own) : extent(scene);
}

/** The viewport that looks at `box`: fitted inside the band, never above 100%; or at 100%, centred
 *  where it fits and from its top left where it does not. */
export function view_on(box: Rect, seen: { w: number; h: number }, mode: Mode) {
  const zoom = mode === "read" ? 1
    : Math.max(MIN_ZOOM, Math.min((seen.w - BAND * 2) / Math.max(1, box.w),
                                  (seen.h - BAND * 2) / Math.max(1, box.h), 1));
  const across = (lo: number, len: number, view: number) => (len * zoom + BAND * 2 <= view
    ? view / 2 - (lo + len / 2) * zoom : BAND - lo * zoom);
  return { zoom, x: across(box.x, box.w, seen.w), y: across(box.y, box.h, seen.h) };
}

/** Where reading may pan: the focus and the band round it. */
export function reach_of(box: Rect): [[number, number], [number, number]] {
  return [[box.x - BAND, box.y - BAND], [box.x + box.w + BAND, box.y + box.h + BAND]];
}

/** **The camera fits every focus**: a new focus, a new mode or a resized view is flown to; a
 *  focus that grew is fitted again. A block revealed inside is panned into sight. */
export function useFocus(scene: Scene, frame: Frame | null, stop: Rect | null, mode: Mode,
                         seen: { w: number; h: number }, aim: Id | null) {
  const flow = useReactFlow();
  const box = aimed(scene, frame, stop);
  const key = `${scene.layer}|${stop ? `${stop.x},${stop.y}` : ""}|${mode}`;
  const size = `${Math.round(box.w)}x${Math.round(box.h)}|${seen.w}x${seen.h}`;
  const was = useRef<{ key: string; size: string } | null>(null);

  useEffect(() => {
    if (seen.w < BAND * 2 || seen.h < BAND * 2) return;
    const before = was.current;
    was.current = { key, size };
    if (before && before.key === key && before.size === size) return;
    /** The first look, and a view resized, land at once; a new focus is flown to. */
    const fly = before && before.key !== key && !still() ? FLIGHT : 0;
    void flow.setViewport(view_on(box, seen, mode), { duration: fly });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, size]);

  /** A block revealed inside the focus is brought into sight, at the zoom it is seen at. */
  useEffect(() => {
    const on = aim ? scene.nodes.find((n) => n.id === aim) : undefined;
    if (!on) return;
    const b = box_of(on);
    const vp = flow.getViewport();
    const shown = { x: -vp.x / vp.zoom, y: -vp.y / vp.zoom, w: seen.w / vp.zoom, h: seen.h / vp.zoom };
    const fits = b.x >= shown.x && b.y >= shown.y && b.x + b.w <= shown.x + shown.w
      && b.y + b.h <= shown.y + shown.h;
    if (fits) return;
    void flow.setCenter(b.x + b.w / 2, b.y + b.h / 2,
                        { zoom: vp.zoom, duration: still() ? 0 : FLIGHT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aim]);

  return box;
}

/** A scrolled drawing as the camera and the scroll limit both read it: the page (what is drawn,
 *  with the room that hugs it), the width it is read at, and the one zoom for both. */
export function paged(scene: Scene, seen: { w: number; h: number }, reach: number | null,
                      widest: number | null, most: number | null) {
  const page = extent({ ...scene, nodes: scene.nodes.filter((n) => n.id !== FRAME) });
  const w = Math.min(reach ?? page.w, widest ?? Infinity);
  // A page's zoom is its width's alone: the camera scrolls to a focus, never zooms to it.
  return { page, w, zoom: scroll_zoom(w, null, seen, widest, most) };
}

/** Where a scrolled page may sit down the view: its top a band below the view's, its foot a band
 *  above the view's, and a page shorter than the view in its middle. */
export function bounded(y: number, page: { y: number; h: number }, zoom: number,
                        seen: { h: number }): number {
  if (page.h * zoom <= seen.h - BAND * 2) return seen.h / 2 - (page.y + page.h / 2) * zoom;
  const top = BAND - page.y * zoom;
  const foot = seen.h - BAND - (page.y + page.h) * zoom;
  return Math.min(top, Math.max(foot, y));
}

/** The page camera: the drawing's width, or `reach` of it, held still across and scrolled down,
 *  following the focus. It never takes in more than `widest`, nor magnifies past `most`. */
export function usePage(scene: Scene, seen: { w: number; h: number }, nodes: readonly BoxNode[],
                        focus: Id | null, reach: number | null, widest: number | null,
                        most: number | null, on: boolean) {
  const flow = useReactFlow();
  const settle = useCallback((duration: number) => {
    const { page, w, zoom } = paged(scene, seen, reach, widest, most);
    const at_focus = focus ? scene.nodes.find((n) => n.id === focus) : undefined;
    // **A focus is scrolled into view, never centred**: where it is already in view the page
    // holds still, else it moves just far enough to bring it in — one taller than the view by
    // its top, so it reads from its heading. With none, the page is read from its top.
    const vp = flow.getViewport();
    const same = Math.abs(vp.zoom - zoom) < 1e-3;
    let y = BAND - page.y * zoom;
    if (at_focus) {
      const box = box_of(at_focus);
      const at = same ? vp.y : y;
      const top = box.y * zoom + at;
      const foot = (box.y + box.h) * zoom + at;
      const tall = box.h * zoom > seen.h - BAND * 2;
      y = top < BAND || (tall && foot > seen.h - BAND) ? BAND - box.y * zoom
        : foot > seen.h - BAND ? seen.h - BAND - (box.y + box.h) * zoom : at;
    }
    y = bounded(y, page, zoom, seen);
    // Across, the page holds still whatever is in focus: centred where it is narrower than the
    // window, read from its left where wider.
    const left = page.w < w ? page.x + page.w / 2 - w / 2 : page.x;
    void flow.setViewport({ zoom, x: seen.w / 2 - (left + w / 2) * zoom, y }, { duration });
  }, [flow, focus, reach, widest, most, scene, seen]);

  useEffect(() => {
    if (on) settle(still() ? 0 : FLIGHT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);
  const span = Math.round(extent(scene).w);
  useEffect(() => {
    if (on && nodes.length) settle(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [span, seen.w, seen.h, scene.layer]);
}

/** One fit for the controls, the band on every side. */
export function useFit(frame: Frame | null, seen: { w: number }) {
  return useMemo(() => (frame && seen.w > BAND * 2
    ? { padding: (BAND * 2) / (seen.w - BAND * 2), maxZoom: 1 } : FIT), [frame, seen.w]);
}
