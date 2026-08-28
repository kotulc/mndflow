/** Scene → React, and nothing else.
 *
 *  It reads what a projection placed and knows nothing about the graph, the log
 *  or the actions. Binding a hit to an action name is the whole of its input
 *  job: it names what was meant and never writes a mutation. */

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Box, Hit, Route, Scene } from "@mnd/views";
import type { Point } from "@mnd/core";
import { begins, caught, far_enough, grabbed, swept, REACH,
         type Drag } from "./drag";
import { useFlight } from "./animate";

/** What a gesture on a region meant. The consumer decides what to do with it. */
export type Gesture = {
  on: string | null;
  kind: Hit["kind"] | "empty";
  button: "left" | "right";
  count: 1 | 2;
  /** Where, in scene coordinates. A position can only come from a gesture. */
  at: Point;
};

export type SceneViewProps = {
  scene: Scene;
  picked?: readonly string[];
  onGesture?: (g: Gesture) => void;
  /** A right drag from one thing to another, or to empty space. */
  onDragTo?: (from: string, to: string | null, at: Point) => void;
  /** A left drag, finished. Positional and unsayable — an adjustment. */
  onDrag?: (drag: Drag) => void;
};

const PAD = 48;

type Live = { kind: Drag["kind"]; on: string | null; end?: "from" | "to";
              from: Point; to: Point };

export function SceneView(props: SceneViewProps) {
  const { scene, picked = [], onGesture, onDragTo, onDrag } = props;

  const view = useMemo(() => {
    const w = Math.max(scene.bounds.w, 200);
    const h = Math.max(scene.bounds.h, 200);
    return { x: -w / 2 - PAD, y: -h / 2 - PAD, w: w + PAD * 2, h: h + PAD * 2 };
  }, [scene.bounds.w, scene.bounds.h]);

  /** **The camera, and the only animation in the product.** Where a pointer
   *  lands is read against the settled view rather than the flying one: a
   *  gesture means the same thing whether or not something is in the air. */
  const camera = useFlight(scene, view);

  /** What a right drag set off from, and what a left drag is doing. Refs, not
   *  locals: both have to survive the renders between press and release. */
  const relating = useRef<string | null>(null);
  const dragging = useRef<Live | null>(null);
  const [live, set_live] = useState<Live | null>(null);

  /** Where a pointer landed, in scene coordinates.
   *
   *  The viewBox is fitted with `xMidYMid meet`, so unless the element happens
   *  to share the scene's aspect ratio the drawing is **letterboxed** — one
   *  axis is scaled to fit and the other is centred with a margin either side.
   *  Reading the position as if the box mapped straight onto the viewBox is
   *  right only in the one case where it does, and wrong everywhere else. */
  const spot = (e: ReactPointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return at_scene(view, box, e.clientX, e.clientY);
  };

  /** The innermost thing under the pointer is what a click would act on, so the
   *  smallest hit wins rather than the last one drawn. */
  const under = (at: Point, only?: Hit["kind"], not?: string | null): Hit | null => {
    let best: Hit | null = null;
    for (const h of scene.hits) {
      if (only && h.kind !== only) continue;
      if (not && h.on === not) continue;
      const r = h.region;
      if (at.x < r.x || at.x > r.x + r.w || at.y < r.y || at.y > r.y + r.h) continue;
      if (!best || r.w * r.h < best.region.w * best.region.h) best = h;
    }
    return best;
  };

  /** What a card would be dropped **on**. A box and never the frame: the frame
   *  spans the whole layer, so counting it would make every drop a re-parent. */
  const dropped_on = (at: Point, dragged: string | null) =>
    under(at, "box", dragged)?.on ?? null;

  /** The layer, when the pointer is on the frame's own name. A label has no
   *  region the projection could compute — text measures itself, and only once
   *  it is drawn — so the one hit that cannot come from the Scene is read off
   *  the DOM. Glyphs rise above the border they sit on, so this answers for
   *  itself rather than leaning on the region underneath. */
  const named = (e: ReactPointerEvent<SVGSVGElement>): string | null => {
    const el = e.target as Element;
    if (el.tagName !== "text" || !el.parentElement?.classList.contains("frame")) return null;
    return scene.hits.find((h) => h.kind === "frame")?.on ?? null;
  };

  const fire = (e: ReactPointerEvent<SVGSVGElement>, count: 1 | 2) => {
    if (!onGesture) return;
    const at = spot(e);
    const title = named(e);
    const hit = title ? null : under(at);
    onGesture({ on: title ?? hit?.on ?? null,
                kind: title ? "title" : hit?.kind ?? "empty",
                button: e.button === 2 ? "right" : "left", count, at });
  };

  const moved = live?.kind === "move" && live.on && far_enough(live.from, live.to)
    ? { id: live.on, dx: live.to.x - live.from.x, dy: live.to.y - live.from.y }
    : null;
  const over = moved ? dropped_on(live!.to, moved.id) : null;
  const sweep = live?.kind === "sweep" && far_enough(live.from, live.to)
    ? swept(live.from, live.to) : null;

  return (
    <svg
      className="scene"
      viewBox={`${camera.x} ${camera.y} ${camera.w} ${camera.h}`}
      preserveAspectRatio="xMidYMid meet"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        const at = spot(e);
        const hit = under(at);
        if (e.button === 2) {
          if (hit?.kind === "box") relating.current = hit.on;
        } else if (e.button === 0) {
          /** A picked line's end wins over what is under it: the handle is the
           *  smaller target and picking it is what asked for the handle. */
          const grab = grabbed(scene, picked, at);
          dragging.current = grab
            ? { kind: "wall", on: grab.on, end: grab.end, from: at, to: at }
            : { kind: begins(hit), on: hit?.on ?? null, from: at, to: at };
        }
        fire(e, 1);
      }}
      onPointerMove={(e) => {
        const now = dragging.current;
        if (!now) return;
        now.to = spot(e);
        set_live({ ...now });
      }}
      onPointerUp={(e) => {
        const at = spot(e);

        const from = relating.current;
        relating.current = null;
        if (from) {
          onDragTo?.(from, dropped_on(at, from), at);
          return;
        }

        const now = dragging.current;
        dragging.current = null;
        set_live(null);
        if (!now || !far_enough(now.from, at)) return;
        if (now.kind === "move" && now.on) {
          onDrag?.({ kind: "move", on: now.on, from: now.from, to: at,
                     over: dropped_on(at, now.on) });
        } else if (now.kind === "seat" && now.on) {
          onDrag?.({ kind: "seat", on: now.on, to: at });
        } else if (now.kind === "wall" && now.on && now.end) {
          onDrag?.({ kind: "wall", on: now.on, end: now.end, to: at });
        } else if (now.kind === "sweep") {
          onDrag?.({ kind: "sweep", from: now.from, to: at,
                     caught: caught(scene, now.from, at) });
        }
      }}
      onPointerCancel={() => { dragging.current = null; set_live(null); }}
      onDoubleClick={(e) => fire(e as unknown as ReactPointerEvent<SVGSVGElement>, 2)}
    >
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" className="head" />
        </marker>
      </defs>

      {scene.frame ? (
        <g className="frame">
          <rect x={scene.frame.x} y={scene.frame.y}
                width={scene.frame.w} height={scene.frame.h} rx={3} />
          <text x={scene.frame.x + 12} y={scene.frame.y}>{scene.frame.label}</text>
        </g>
      ) : null}

      {scene.routes.map((r) => (
        <Line key={r.id} route={r} picked={picked.includes(r.id)} />
      ))}

      {scene.boxes.map((b) => {
        const shift = moved?.id === b.id ? moved : null;
        return (
          <g key={b.id}
             className={["card", ...b.marks,
                         picked.includes(b.id) ? "picked" : "",
                         over === b.id ? "over" : "",
                         shift ? "moving" : ""].filter(Boolean).join(" ")}
             data-def={b.def}
             transform={shift ? `translate(${shift.dx} ${shift.dy})` : undefined}>
            {b.marks.includes("decision") || b.marks.includes("merge")
              ? <polygon points={diamond(b)} />
              : <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} />}
            <title>{b.label}</title>
            {b.on ? null : <Label box={b} />}
          </g>
        );
      })}

      {scene.routes.filter((r) => picked.includes(r.id)).map((r) => (
        <Ends key={`${r.id}-ends`} route={r} />
      ))}

      {sweep ? (
        <rect className="sweep" x={sweep.x} y={sweep.y} width={sweep.w} height={sweep.h} />
      ) : null}
    </svg>
  );
}

function Line({ route, picked }: { route: Route; picked: boolean }) {
  const d = route.points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const forward = route.dir === "forward" || route.dir === "both" || route.module === "directed";
  const back = route.dir === "back" || route.dir === "both";
  return (
    <g className={["route", route.module, picked ? "picked" : ""].filter(Boolean).join(" ")}>
      <path d={d} fill="none"
            markerEnd={forward ? "url(#arrow)" : undefined}
            markerStart={back ? "url(#arrow)" : undefined} />
      {route.label ? (
        <text x={mid(route).x} y={mid(route).y - 4} textAnchor="middle">{route.label}</text>
      ) : null}
    </g>
  );
}

/** A name too long for its card is **clipped**: nothing is held back for text
 *  that might arrive, so what does arrive stops at the edge rather than running
 *  across whatever is drawn beside it. The full name is what a hover says.
 *
 *  **A turned label reads up the box** — a matrix column is as wide as a mark
 *  needs to be, and a name is not. */
function Label({ box }: { box: Box }) {
  const turned = box.marks.includes("turned");
  const at = turned
    ? { x: box.x + box.w / 2, y: box.y + box.h - 6 }
    : { x: box.x + box.w / 2, y: box.marks.includes("lane") ? box.y + 14 : box.y + box.h / 2 };
  return (
    <>
      <clipPath id={`clip-${box.id}`}>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} />
      </clipPath>
      <text {...at} clipPath={turned ? undefined : `url(#clip-${box.id})`}
            dominantBaseline="central" textAnchor={turned ? "start" : "middle"}
            transform={turned ? `rotate(-90 ${at.x} ${at.y})` : undefined}>
        {box.label}
      </text>
    </>
  );
}

/** A decision and a merge are the one pair of controls that is not a bar. */
function diamond(b: { x: number; y: number; w: number; h: number }): string {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return [[cx, b.y], [b.x + b.w, cy], [cx, b.y + b.h], [b.x, cy]]
    .map(([x, y]) => `${x},${y}`).join(" ");
}

/** The handles a picked line offers. Taking one to another wall is `wall`,
 *  which is the only thing about a line anybody places by hand. */
function Ends({ route }: { route: Route }) {
  const at = [route.points[0], route.points[route.points.length - 1]];
  return (
    <g className="ends">
      {at.map((p, i) => (p ? (
        <rect key={i} x={p.x - REACH / 2} y={p.y - REACH / 2} width={REACH} height={REACH} />
      ) : null))}
    </g>
  );
}

type Rect = { left: number; top: number; width: number; height: number };
type View = { x: number; y: number; w: number; h: number };

/** The inverse of what `xMidYMid meet` does. Exported so it can be proven on
 *  its own, at aspect ratios a stubbed box would never produce. */
export function at_scene(view: View, box: Rect, clientX: number, clientY: number): Point {
  const scale = Math.min(box.width / view.w, box.height / view.h) || 1;
  const bar_x = (box.width - view.w * scale) / 2;
  const bar_y = (box.height - view.h * scale) / 2;
  return {
    x: view.x + (clientX - box.left - bar_x) / scale,
    y: view.y + (clientY - box.top - bar_y) / scale,
  };
}

function mid(route: Route): Point {
  const at = route.points[Math.floor(route.points.length / 2)];
  return at ?? { x: 0, y: 0 };
}
