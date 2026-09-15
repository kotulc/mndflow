/** The ends of what is picked, as grips to drag, and the berths of hidden interfaces near it. */

import { useMemo, useState } from "react";
import { ViewportPortal } from "@xyflow/react";
import type { Id, Point } from "@mnd/core";
import { box_of, holds, perch_id, FRAME, type Frame, type Scene } from "@mnd/views";
import type { Adjust, Gesture } from "./gestures";
import { middle, type Grip } from "./pointer";

export type GripsProps = {
  scene: Scene;
  picked: readonly Id[];
  frame: Frame | null;
  at: (e: { clientX: number; clientY: number }) => Point;
  onAdjust?: (adjust: Adjust) => void;
  onGesture?: (g: Gesture) => void;
};

export function Grips({ scene, picked, frame, at, onAdjust, onGesture }: GripsProps) {
  /** Where the ends of the picked relationships sit. */
  const grips = useMemo((): Grip[] => {
    if (!picked.length) return [];
    const chosen = new Set(picked);
    const boxes = new Map(scene.nodes.map((n) => [n.id, box_of(n)]));
    /** The room is a border like a card's. */
    if (frame) boxes.set(FRAME, frame);
    /** Where the line meets the grown room's wall. */
    const met = new Map((frame?.seats ?? []).map((t) => [t.id, t]));
    const out: Grip[] = [];
    for (const p of scene.perches) {
      if (!chosen.has(p.edge)) continue;
      const box = boxes.get(p.on);
      if (!box) continue;
      const seat = p.on === FRAME ? met.get(perch_id(p.edge, p.end)) ?? p : p;
      out.push({ key: `${p.edge}-${p.end}`, edge: p.edge, end: p.end, on: p.on,
                 side: seat.side, at: seat.at, ...middle(box, seat) });
    }
    return out;
  }, [scene, picked, frame]);

  /** Where a hidden interface is, while its line or card is picked. */
  const berths = useMemo((): Point[] => {
    if (!picked.length) return [];
    const chosen = new Set(picked);
    const tied = new Set<string>();
    for (const e of scene.edges) {
      if (chosen.has(e.id)) { tied.add(e.source); tied.add(e.target); }
    }
    const out: Point[] = [];
    for (const n of scene.nodes) {
      if (!n.data.marks.includes("berth")) continue;
      if (!tied.has(n.id) && !(n.data.on && chosen.has(n.data.on))) continue;
      const b = box_of(n);
      out.push({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
    }
    return out;
  }, [scene, picked]);

  /** The grip being dragged and where it has got to. */
  const [grabbed, grab] = useState<{ key: string; at: Point } | null>(null);

  /** A grip let go on another block relinks that end to the innermost block under the point. */
  const anchored = (g: Grip, e: { clientX: number; clientY: number }) => {
    const to = at(e);
    const landed = [...scene.nodes].reverse().find((n) => {
      if (n.id === g.on || n.selectable === false || holds(n)) return false;
      const b = box_of(n);
      return to.x >= b.x && to.x <= b.x + b.w && to.y >= b.y && to.y <= b.y + b.h;
    });
    if (landed) onAdjust?.({ kind: "wall", on: g.edge, end: g.end, to: landed.id });
  };

  if (!grips.length && !berths.length) return null;
  return (
    <ViewportPortal>
      {berths.map((b, i) => (
        <span key={`berth-${i}`} className="mnd-berth"
              style={{ transform: `translate(-50%, -50%) translate(${b.x}px, ${b.y}px)` }} />
      ))}
      {grips.map((g) => {
        const to = grabbed?.key === g.key ? grabbed.at : g;
        return (
          <span key={g.key}
                className={["mnd-anchor", "nodrag", "nopan",
                            grabbed?.key === g.key ? "held" : ""].filter(Boolean).join(" ")}
                style={{ transform: `translate(-50%, -50%) translate(${to.x}px, ${to.y}px)` }}
                title="drag to move this end along the border · double click to make it an interface"
                /** A click on a grip must not reach the pane and drop the selection. */
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  grab({ key: g.key, at: g });
                }}
                onPointerMove={(e) => {
                  if (grabbed?.key !== g.key) return;
                  grab({ key: g.key, at: at(e) });
                }}
                onPointerUp={(e) => {
                  if (grabbed?.key !== g.key) return;
                  grab(null);
                  anchored(g, e);
                }}
                /** The grip's menu offers promoting this end. */
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  /** An end on the room's wall belongs to the open layer. */
                  onGesture?.({ on: g.edge, kind: "anchor", button: "right", count: 1,
                                at: at(e), screen: { x: e.clientX, y: e.clientY },
                                given: { end: g.end, edge: g.edge,
                                         owner: g.on === FRAME ? scene.layer : g.on,
                                         side: g.side, at: g.at } });
                }} />
        );
      })}
    </ViewportPortal>
  );
}
