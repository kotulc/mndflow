/** **The camera: one owner of the viewport.** A host says where to look as one `Shot`, worked out
 *  from where it is; `useCamera` lands it — fitted or read down the page, flown or cut — and
 *  nothing else moves the view but the person's own pan and zoom. */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useReactFlow, useStore } from "@xyflow/react";
import { box_of, extent, FRAME, type Frame, type Scene } from "@mnd/views";
import { BAND, FIT, FLIGHT, MIN_ZOOM, scroll_zoom, still } from "./arrays";

/** A box in drawing units, and the scale the world drew it at, so 100% is its own size. */
export type Rect = { x: number; y: number; w: number; h: number; scale?: number };
type Seen = { w: number; h: number };
type Viewport = { x: number; y: number; zoom: number };
/** How a page is read: `reach` of the drawing across, never more than `widest`, nor magnified
 *  past `most`. */
export type Page = { reach?: number | null; widest?: number | null; most?: number | null };

/** **Where to look, as data**: what a host decides and the camera lands. */
export type Shot = {
  /** What is fitted; null is the whole drawing. */
  box: Rect | null;
  /** Read down the page instead: fitted to its width, scrolled to `reveal`. */
  page?: Page | null;
  /** A block brought into sight at the zoom landed at; left where it is if already in sight. */
  reveal?: Rect | null;
  /** Stay put while the drawing and the count are the same: what was last fitted stays fitted. */
  hold?: boolean;
  /** Stay put whatever the count, while the next drawing is laid. */
  wait?: boolean;
  /** On a cut to this drawing, this box starts where the last drawing stood, then flies out. */
  from?: Rect | null;
  /** Entering: `box` flown into only as far as the next drawing will stand once cut to. */
  into?: { scene: Scene; shot: Shot } | null;
  /** A new count lands again, the same shot or not. */
  seq?: number;
};

/** How much room there is to draw in, and the frame the focus draws as. */
export function useRoom(scene: Scene) {
  const seen = useStore(useCallback((st) => ({ w: st.width, h: st.height }), []),
                        (a, b) => a.w === b.w && a.h === b.h);
  return { frame: scene.frame ?? null, seen };
}

/** The whole drawing: the frame, else an opened grid's own node, else all that is drawn. */
function whole_of(scene: Scene): Rect {
  if (scene.frame) return scene.frame;
  const own = scene.nodes.find((n) => n.id === scene.layer);
  return own ? box_of(own) : extent(scene);
}

/** The viewport that looks at `box`: fitted inside the band, never above 100%, and centred. 100%
 *  is the box at its own size: `k` is the scale the world drew it at. */
function view_on(box: Rect, seen: Seen, k = 1): Viewport {
  const zoom = Math.max(MIN_ZOOM, Math.min((seen.w - BAND * 2) / Math.max(1, box.w),
                                           (seen.h - BAND * 2) / Math.max(1, box.h), 1 / k));
  const across = (lo: number, len: number, view: number) => view / 2 - (lo + len / 2) * zoom;
  return { zoom, x: across(box.x, box.w, seen.w), y: across(box.y, box.h, seen.h) };
}

/** Which drawing a scene is: a map, which one, or which layer — a layer drawn as a treemap too,
 *  whose layer, unlike a map's focus, is none of its areas. */
function realm_of(scene: Scene): string {
  const map = scene.areas && !(scene.layer && !scene.areas.some((a) => a.id === scene.layer));
  return map ? `map:${scene.areas![0]?.label ?? ""}` : `layer:${scene.layer ?? ""}`;
}

/** A scrolled drawing as the camera and the scroll limit both read it: the page (what is drawn,
 *  with the room that hugs it), the width it is read at, and the one zoom for both. */
export function paged(scene: Scene, seen: Seen, page: Page) {
  const drawn = extent({ ...scene, nodes: scene.nodes.filter((n) => n.id !== FRAME) });
  const w = Math.min(page.reach ?? drawn.w, page.widest ?? Infinity);
  // A page's zoom is its width's alone: the camera scrolls to a focus, never zooms to it.
  return { page: drawn, w, zoom: scroll_zoom(w, null, seen, page.widest ?? null, page.most ?? null) };
}

/** Where a scrolled page may sit down the view: its top a band below the view's, its foot a band
 *  above the view's, and a page shorter than the view in its middle. */
function bounded(y: number, page: { y: number; h: number }, zoom: number,
                        seen: { h: number }): number {
  if (page.h * zoom <= seen.h - BAND * 2) return seen.h / 2 - (page.y + page.h / 2) * zoom;
  const top = BAND - page.y * zoom;
  const foot = seen.h - BAND - (page.y + page.h) * zoom;
  return Math.min(top, Math.max(foot, y));
}

/** **A page's viewport**: its width held still across and scrolled down. A focus is scrolled
 *  into view, never centred: where it is already in view from `base` the page holds still, else
 *  it moves just far enough — one taller than the view by its top, so it reads from its heading.
 *  With none, the page is read from its top. */
function page_on(scene: Scene, seen: Seen, given: Page, focus: Rect | null,
                 base: Viewport | null): Viewport {
  const { page, w, zoom } = paged(scene, seen, given);
  const same = !!base && Math.abs(base.zoom - zoom) < 1e-3;
  let y = BAND - page.y * zoom;
  if (focus) {
    const at = same ? base!.y : y;
    const top = focus.y * zoom + at;
    const foot = (focus.y + focus.h) * zoom + at;
    const tall = focus.h * zoom > seen.h - BAND * 2;
    y = top < BAND || (tall && foot > seen.h - BAND) ? BAND - focus.y * zoom
      : foot > seen.h - BAND ? seen.h - BAND - (focus.y + focus.h) * zoom : at;
  }
  // Across, centred where the page is narrower than the window, read from its left where wider.
  const left = page.w < w ? page.x + page.w / 2 - w / 2 : page.x;
  return { zoom, x: seen.w / 2 - (left + w / 2) * zoom, y: bounded(y, page, zoom, seen) };
}

/** `vp` panned at its zoom to centre `b`, unless `b` is already wholly in sight. */
function revealed(vp: Viewport, b: Rect, seen: Seen): Viewport {
  const s = on_screen(b, vp);
  if (s.x >= 0 && s.y >= 0 && s.x + s.w <= seen.w && s.y + s.h <= seen.h) return vp;
  return { zoom: vp.zoom, x: seen.w / 2 - (b.x + b.w / 2) * vp.zoom,
           y: seen.h / 2 - (b.y + b.h / 2) * vp.zoom };
}

/** Where a box stands on screen under `vp`. */
function on_screen(b: Rect, vp: Viewport): Rect {
  return { x: b.x * vp.zoom + vp.x, y: b.y * vp.zoom + vp.y, w: b.w * vp.zoom, h: b.h * vp.zoom };
}

/** A screen box cut to the view. */
function clipped(r: Rect, seen: Seen): Rect {
  const [x, y] = [Math.max(0, r.x), Math.max(0, r.y)];
  return { x, y, w: Math.max(1, Math.min(seen.w, r.x + r.w) - x),
           h: Math.max(1, Math.min(seen.h, r.y + r.h) - y) };
}

/** The viewport that sets `b` inside the screen box `r`, as large as fits and centred. */
function fit_into(b: Rect, r: Rect): Viewport {
  const zoom = Math.min(r.w / Math.max(1, b.w), r.h / Math.max(1, b.h));
  return { zoom, x: r.x + r.w / 2 - (b.x + b.w / 2) * zoom,
           y: r.y + r.h / 2 - (b.y + b.h / 2) * zoom };
}

/** What a drawing is matched by across a cut: its page, else the whole drawing. */
function anchor_of(shot: Shot, scene: Scene, seen: Seen): Rect {
  return shot.page ? paged(scene, seen, shot.page).page : whole_of(scene);
}

/** **Where a shot lands**: a page read down, a box fitted, or — entering — the box fitted into
 *  where the next drawing will stand; then the reveal brought into sight. `base` is where the
 *  camera is, for what moves only as far as it must; null fits afresh. */
function landed(shot: Shot, scene: Scene, seen: Seen, base: Viewport | null): Viewport {
  if (shot.page) return page_on(scene, seen, shot.page, shot.reveal ?? null, base);
  if (shot.into) {
    const { scene: next, shot: then } = shot.into;
    const r = on_screen(then.page || !then.box ? anchor_of(then, next, seen) : then.box,
                        landed(then, next, seen, null));
    return fit_into(shot.box ?? whole_of(scene), clipped(r, seen));
  }
  const at = base ?? view_on(shot.box ?? whole_of(scene), seen, shot.box?.scale ?? 1);
  return shot.reveal ? revealed(at, shot.reveal, seen) : at;
}

/** A box as a value, for an effect to watch. */
const key_of = (b: Rect | null | undefined) =>
  (b ? `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.w)},${Math.round(b.h)},${b.scale ?? 1}`
     : "");

/** **The camera lands every shot**: a new shot is flown to, a resized view or a new drawing cut
 *  to; a shot that holds stays put on its drawing. Across a cut the new drawing fades in, and a
 *  shot `from` a box starts with that box where the last drawing stood. Says whether it is in
 *  flight, so levels hold until it lands, and tells `onLand` each shot landed. */
export function useCamera(scene: Scene, shot: Shot, seen: Seen,
                          onLand?: (shot: Shot) => void) {
  const flow = useReactFlow();
  const realm = realm_of(scene);
  const seq = shot.seq ?? 0;
  const page = shot.page ? `${shot.page.reach},${shot.page.widest},${shot.page.most}` : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const anchor = useMemo(() => anchor_of(shot, scene, seen), [scene, page, seen]);
  const fit = [realm, seq, key_of(shot.box), page, shot.into ? realm_of(shot.into.scene) : "",
               shot.hold || shot.wait ? "hold" : ""].join("|");
  const reveal = key_of(shot.reveal);
  const size = `${Math.round(anchor.w)}x${Math.round(anchor.h)}|${seen.w}x${seen.h}`;
  /** What was landed last: its keys, its drawing, the box fitted and the drawing's anchor. */
  const was = useRef<{ realm: string; seq: number; fit: string; reveal: string; size: string;
                       seen: string; box: Rect | null; anchor: Rect } | null>(null);
  /** Where a flight is going, so a shot in the same change is judged against it. */
  const going = useRef<Viewport | null>(null);
  const [flying, set_flying] = useState(false);
  /** The flight's timer: a new flight, or leaving, cancels the last. */
  const landing = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(landing.current), []);
  const told = useRef(onLand);
  told.current = onLand;

  useEffect(() => {
    if (seen.w < BAND * 2 || seen.h < BAND * 2) return;
    const before = was.current;
    const cut = !before || before.realm !== realm;
    const view = `${seen.w}x${seen.h}`;
    /** A shot that holds keeps what was fitted on this drawing, refitted only to a new view; a
     *  new count lands it whole again. */
    const held = !cut && (!!shot.wait || (!!shot.hold && before!.seq === seq));
    const now_fit = held ? before!.fit : fit;
    if (before && before.fit === now_fit && before.size === size && before.reveal === reveal) return;
    const box = held ? before!.box : shot.box;
    was.current = { realm, seq, fit: now_fit, reveal, size, seen: view, box, anchor };
    if (held && before!.seen === view && !reveal) return;
    /** Fitted afresh to a new shot or a new view, or a fitted drawing that changed size; a page
     *  that changed length keeps its place down the page, as a reveal keeps the camera's. */
    const resized = !!before && before.size !== size;
    const afresh = !before || before.fit !== now_fit || before.seen !== view
      || (resized && !shot.page && !held);
    const now = going.current ?? flow.getViewport();
    const to = landed({ ...shot, box }, scene, seen, afresh ? null : now);
    /** Across a cut, a shot from a box starts it where the last drawing stood on screen. */
    const motion = !still();
    const start = cut && before && shot.from && motion
      ? fit_into(shot.from, clipped(on_screen(before.anchor, flow.getViewport()), seen)) : null;
    /** A new shot on the same drawing flies; a view resized or a drawing that grew lands at once. */
    const asked = before && (before.fit !== now_fit || before.reveal !== reveal);
    const fly = motion && (start || (!cut && asked && before!.seen === view)) ? FLIGHT : 0;
    clearTimeout(landing.current);
    going.current = fly ? to : null;
    set_flying(fly > 0);
    if (start) void flow.setViewport(start);
    void flow.setViewport(to, { duration: fly });
    landing.current = setTimeout(() => {
      going.current = null;
      set_flying(false);
      told.current?.(shot);
    }, fly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, reveal, size]);

  /** Which drawing this is: across a change nothing slides, and it fades in where the camera cut.
   *  The fade starts before the cut is painted: the old drawing never shows under the new camera. */
  const was_realm = useRef(realm);
  const cut = was_realm.current !== realm;
  useEffect(() => { was_realm.current = realm; });
  const [fresh, set_fresh] = useState(false);
  useLayoutEffect(() => {
    if (!cut) return;
    set_fresh(true);
    const t = window.setTimeout(() => set_fresh(false), FADE);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realm]);

  return { flying, cut, fresh };
}

/** One fit for the controls, the band on every side. */
export function useFit(frame: Frame | null, seen: { w: number }) {
  return useMemo(() => (frame && seen.w > BAND * 2
    ? { padding: (BAND * 2) / (seen.w - BAND * 2), maxZoom: 1 } : FIT), [frame, seen.w]);
}

/** How long a drawing takes to fade in where the camera cut to it. */
const FADE = 200;
