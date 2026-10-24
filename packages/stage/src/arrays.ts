/** A Scene as React Flow's node and edge arrays, and the canvas's constants. */

import type { Id } from "@mnd/core";
import { at_seat, box_of, look_key, perch_id, FRAME, type BoxNode, type Frame,
         type LineEdge, type Scene } from "@mnd/views";

/** Fitting frames what is there; it never magnifies. */
export const FIT = { padding: 0.25, maxZoom: 1 };

/** How far a press travels before it is a drag. */
export const NUDGE = 5;

/** Reading magnifies, but only so far: a narrow layer on a wide screen stays readable. */
export const READ_ZOOM = 2;

/** The zoom that fits a width across the view, leaving the band either side. */
export function read_zoom(w: number, seen: { w: number }): number {
  return Math.min(READ_ZOOM, Math.max(MIN_ZOOM, (seen.w - BAND * 2) / Math.max(1, w)));
}

/** The zoom a scrolled view reads at: `w` across, widened to take in a focus wider than that,
 *  and eased out further where the focus is taller than the view — but never so far that more
 *  than `widest` is across, nor closer than `most`. */
export function scroll_zoom(w: number, focus: { w: number; h: number } | null,
                            seen: { w: number; h: number }, widest: number | null = null,
                            most: number | null = null): number {
  const zoom = Math.min(most ?? READ_ZOOM, read_zoom(Math.max(w, focus?.w ?? 0), seen));
  const tall = focus ? (seen.h - BAND * 2) / Math.max(1, focus.h) : zoom;
  const least = widest ? read_zoom(widest, seen) : MIN_ZOOM;
  return Math.max(least, Math.min(zoom, tall));
}

/** The band left around a layer's frame, in screen pixels. */
export const BAND = 56;

/** Long enough to read as one motion, short enough not to be waited on. */
export const FLIGHT = 440;

/** Whether the camera should not travel. */
export const still = () => typeof matchMedia === "function"
  && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The smallest zoom, so a flight from a small card starts somewhere reachable. */
export const MIN_ZOOM = 0.1;

/** Draw order: holders — a map's boxes, groups, grids — then lines, cards, a map's chips and
 *  seats, each two steps higher for every holder it sits in. Selection never lifts a node. */
export const DEPTH: Record<string, number> = {
  box: 1, group: 1, grid: 1, line: 2, card: 3, chip: 3, control: 3, seat: 4, tie: 1000,
};

/** The projection's nodes, plus selection and depth. */
export function nodes_of(scene: Scene, picked: readonly Id[], frame: Frame | null): BoxNode[] {
  /** The depth a node draws at. */
  const depth = (n: BoxNode) => (DEPTH[n.type ?? "card"] ?? 1) + (n.data.nest ?? 0) * 2;
  const out: BoxNode[] = frame ? [{
    id: FRAME,
    type: "frame",
    position: { x: frame.x, y: frame.y },
    width: frame.w,
    height: frame.h,
    data: { label: frame.label,
            /** The one trait a frame carries: whether it holds anything, which fills its icon. */
            marks: frame.holds_parts ? ["container" as const] : [],
            ...(frame.role ? { role: frame.role } : {}),
            ...(frame.stamps?.length ? { stamps: frame.stamps } : {}),
            ...(frame.seats ? { seats: frame.seats } : {}) },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: DEPTH["line"],
  }] : [];

  /** The layer's own interfaces, set into the room's walls. */
  for (const p of frame?.ports ?? []) {
    const at = at_seat(frame!, { side: p.side, at: p.at });
    const seats = scene.perches.filter((perch) => perch.on === p.id).map((perch) => ({
      id: perch_id(perch.edge, perch.end), side: perch.side, at: perch.at,
    }));
    out.push({
      id: p.id,
      type: "seat",
      position: { x: at.x, y: at.y },
      width: at.w,
      height: at.h,
      data: { label: p.label, marks: p.marks, on: FRAME, side: p.side,
              ...(seats.length ? { seats } : {}),
              ...(p.look ? { look: p.look } : {}), ...(p.def ? { def: p.def } : {}) },
      selected: picked.includes(p.id),
      zIndex: DEPTH["seat"],
      measured: { width: at.w, height: at.h },
    });
  }

  for (const n of scene.nodes) {
    const band = n.type === "group";
    const className = [band ? "mnd-band-node" : "", n.className ?? ""].filter(Boolean).join(" ");
    out.push({
      ...n,
      selected: picked.includes(n.id),
      zIndex: depth(n),

      ...(className ? { className } : {}),
      /** Size is told, not measured, so edges route on the first frame. */
      measured: { width: n.width, height: n.height },
    });
  }
  return out;
}

/** Each module's class. */
export const READS: Record<string, string> = {
  line: "line", tie: "tie",
};

/** Edges as the canvas draws them; ends are the projection's. */
export function edges_of(scene: Scene, picked: readonly Id[]): LineEdge[] {
  return scene.edges.map((e) => {
    const d = e.data;
    return {
      ...e,
      type: "wire",
      data: d ?? { module: "line" as const, dir: "none" as const },
      selected: picked.includes(e.id),
      className: [READS[d?.module ?? "line"] ?? "line", e.className ?? ""].filter(Boolean).join(" "),
      /** A tie draws above every card; other lines over the rooms they cross, under the cards. */
      ...(d?.module === "tie" ? { zIndex: DEPTH["tie"] } : { zIndex: DEPTH["line"] }),
      /** An end is dragged by its own grip, not the library's anchor. */
      reconnectable: false,
    };
  });
}

/** What in a Scene would change the drawing; selection is left out so the two copies never echo. */
export function signature(scene: Scene, frame: Frame | null): string {
  return [
    scene.layer,
    frame && `${frame.x},${frame.y},${frame.w},${frame.h},${frame.label},${frame.role ?? ""}`,
    frame?.seats?.map((t) => `${t.id}${t.side}${t.at}`).join("|"),
    frame?.ports.map((p) => `${p.id}${p.side}${p.at}${p.marks.join("")}${p.def ?? ""}`).join("|"),
    scene.nodes.map((n) => {
      const b = box_of(n);
      /** Everything a card draws from. */
      return [
        n.id, n.type, `${b.x},${b.y},${b.w},${b.h}`, n.data.label, n.data.alias ?? "",
        n.className ?? "",
        n.data.description ?? "",
        n.data.marks.join(""), n.data.side ?? "",
        look_key(n.data.look), n.data.face ?? "", n.data.text ?? "",
        /** The lattice is what a grid draws. */
        n.data.grid?.map((c) => `${c.r},${c.c},${c.w},${c.h}${c.marks.join("")}`).join(""),
        /** Where a line meets this card is part of what it draws. */
        n.data.seats?.map((t) => `${t.id}${t.side}${t.at}`).join(""),
      ].join(":");
    }).join("|"),
    /** Everything a run draws from. */
    scene.edges.map((e) => [
      e.id, `${e.source}>${e.target}`, e.data?.dir, e.data?.module,
      e.label ?? "", e.data?.alias ?? "", look_key(e.data?.wire), e.className ?? "",
      e.data?.points?.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(" "),
    ].join(":")).join("|"),
  ].join("~");
}

/** The selection as a value, for an effect to watch. */
export function chosen(picked: readonly Id[]): string {
  return [...picked].sort().join(",");
}

/** The same set, marked onto whichever of React Flow's own rows disagree. */
export function marked<T extends { id: string; selected?: boolean }>(
  rows: T[], want: Set<string>,
): T[] {
  return rows.some((r) => (r.selected ?? false) !== want.has(r.id))
    ? rows.map((r) => ((r.selected ?? false) === want.has(r.id)
        ? r : { ...r, selected: want.has(r.id) }))
    : rows;
}
