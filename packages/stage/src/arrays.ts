/** A Scene as React Flow's node and edge arrays, and the canvas's constants. */

import type { Id } from "@mnd/core";
import { at_seat, box_of, look_key, perch_id, roomed, FRAME, type BoxNode, type Frame,
         type LineEdge, type Scene } from "@mnd/views";

/** Fitting frames what is there; it never magnifies. */
export const FIT = { padding: 0.25, maxZoom: 1 };

/** How far a press travels before it is a drag. */
export const NUDGE = 5;

/** The band left around a layer's frame, in screen pixels. */
export const BAND = 56;

/** Long enough to read as one motion, short enough not to be waited on. */
export const FLIGHT = 440;

/** Whether the camera should not travel. */
export const still = () => typeof matchMedia === "function"
  && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The smallest zoom, so a flight from a small card starts somewhere reachable. */
export const MIN_ZOOM = 0.1;

/** Draw order: room, holders, cards, then seats; selection never lifts a node. */
export const DEPTH: Record<string, number> = {
  frame: 0, group: 1, grid: 1, card: 3, control: 3, seat: 4,
};

/** The layer's room, grown to the panel's shape and size in whole cells. */
export function panelled(frame: Frame, seen: { w: number; h: number }): Frame {
  const room = { w: seen.w - BAND * 2, h: seen.h - BAND * 2 };
  if (room.w <= 0 || room.h <= 0) return frame;
  const shape = room.w / room.h;
  let { w, h } = frame;
  w / h > shape ? (h = w / shape) : (w = h * shape);
  const floor = Math.max(1, room.w / w, room.h / h);
  return { ...frame, ...roomed({
    x: frame.x + frame.w / 2 - (w * floor) / 2,
    y: frame.y + frame.h / 2 - (h * floor) / 2,
    w: w * floor, h: h * floor,
  }) };
}

/** Seats on the room's wall keep their fraction when the room grows. */
export function met_on(room: Frame, scene: Scene): Frame {
  if (!room.seats?.length) return room;
  const at = new Map(scene.perches
    .filter((p) => p.on === FRAME)
    .map((p) => [perch_id(p.edge, p.end), p.at]));
  return { ...room, seats: room.seats.map((t) => {
    const spot = at.get(t.id);
    return spot === undefined ? t : { ...t, at: spot };
  }) };
}

/** The projection's nodes, plus selection and depth. */
export function nodes_of(scene: Scene, picked: readonly Id[], frame: Frame | null): BoxNode[] {
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
            ...(frame.side ? { side: frame.side } : {}),
            ...(frame.seats ? { seats: frame.seats } : {}) },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: DEPTH["frame"],
  }] : [];

  /** The layer's own interfaces, set into the room's walls. */
  for (const p of frame?.ports ?? []) {
    const at = at_seat(frame!, { side: p.side, at: p.at });
    out.push({
      id: p.id,
      type: "seat",
      position: { x: at.x, y: at.y },
      width: at.w,
      height: at.h,
      data: { label: p.label, marks: p.marks, on: FRAME, side: p.side,
              ...(p.look ? { look: p.look } : {}) },
      selected: picked.includes(p.id),
      zIndex: DEPTH["seat"],
      measured: { width: at.w, height: at.h },
    });
  }

  for (const n of scene.nodes) {
    const nest = (n.data.nest ?? 0) * 2;
    const base = DEPTH[n.type ?? "card"] ?? 1;
    const band = n.type === "group";
    out.push({
      ...n,
      selected: picked.includes(n.id),
      zIndex: base + nest,
      ...(band ? { className: "mnd-band-node" } : {}),
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
      className: READS[d?.module ?? "line"] ?? "line",
      /** An end is dragged by its own grip, not the library's anchor. */
      reconnectable: false,
    };
  });
}

/** What in a Scene would change the drawing; selection is left out so the two copies never echo. */
export function signature(scene: Scene, frame: Frame | null): string {
  return [
    scene.layer,
    frame && `${frame.x},${frame.y},${frame.w},${frame.h},${frame.label},${frame.role ?? ""}`
      + `,${frame.side ?? ""}`,
    frame?.seats?.map((t) => `${t.id}${t.side}${t.at}`).join("|"),
    frame?.ports.map((p) => `${p.id}${p.side}${p.at}${p.marks.join("")}`).join("|"),
    scene.nodes.map((n) => {
      const b = box_of(n);
      /** Everything a card draws from. */
      return [
        n.id, n.type, `${b.x},${b.y},${b.w},${b.h}`, n.data.label, n.data.alias ?? "",
        n.data.marks.join(""), n.data.side ?? "",
        look_key(n.data.look),
        /** The lattice is what a grid draws. */
        n.data.grid?.map((c) => `${c.r},${c.c},${c.w},${c.h}${c.marks.join("")}`).join(""),
        /** Where a line meets this card is part of what it draws. */
        n.data.seats?.map((t) => `${t.id}${t.side}${t.at}`).join(""),
      ].join(":");
    }).join("|"),
    /** Everything a run draws from. */
    scene.edges.map((e) => [
      e.id, `${e.source}>${e.target}`, e.data?.dir, e.data?.module,
      e.label ?? "", e.data?.alias ?? "", look_key(e.data?.wire),
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
