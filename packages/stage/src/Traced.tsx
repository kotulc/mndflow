/** **Hops traced across a map** (views `trace.ts`): each leg square, out of its source's right and
 *  into its target's left, drawn over the chips on a halo of the ground so it cuts cleanly across
 *  what it passes, an arrow just inside its target, **heavier the more it gathers** (`weight`, a
 *  few steps). **No pill or badge on a leg** (the user, 2026-11-22): what it carries is said on
 *  hover, and a step's words in the tray. **A presentation's steps** (`steps`,
 *  docs/presentations.md): earlier legs faded, the last drawn from its start, its datum
 *  travelling along it. */

import { useEffect, useRef } from "react";
import { useStore } from "@xyflow/react";
import type { Leg, Trace } from "@mnd/views";

/** How long a step's line takes to draw, and its datum to travel it, in seconds. */
const DRAW = 1;

export function Traced({ trace, as = "path" }: { trace: Trace; as?: "path" | "steps" }) {
  const head = `mnd-trace-head-${as}`;
  const zoom = useStore((st) => st.transform[2]);
  /** A presentation's step drawing now: its last, unless the last was a mark. */
  const now = (i: number) => as === "steps" && !trace.still && i === trace.legs.length - 1;
  return (
    <svg className={`mnd-trace ${as}`}
         style={{ position: "absolute", overflow: "visible", left: 0, top: 0 }}>
      <defs>
        <marker id={head} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5"
                markerHeight="4.5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" />
        </marker>
      </defs>
      {trace.legs.map((l, i) => {
        const points = tipped(l, zoom).map((p) => `${p.x},${p.y}`).join(" ");
        return (
          <g key={`${l.from}>${l.to}.${i}`} data-weight={weight(l.n)}
             className={["mnd-trace-leg", as === "steps" ? (now(i) ? "now" : "past") : ""]
               .filter(Boolean).join(" ")}>
            <title>{[...l.names.filter(Boolean), ...(l.n > 1 ? [`${l.n} relations`] : [])]
              .join(" · ")}</title>
            <polyline className="hit" points={points} />
            <polyline className="halo" points={points} />
            <polyline className="run" points={points} pathLength={1} markerEnd={`url(#${head})`}
                      {...(l.both ? { markerStart: `url(#${head})` } : {})} />
            {now(i) ? <Datum leg={l} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

/** **A leg's weight**, by how many relations it gathers: a step each time they double, four
 *  steps at most (0 for one). */
function weight(n: number): number {
  return Math.min(3, Math.floor(Math.log2(Math.max(1, n))));
}

/** The datum travelling along a step's line as it draws, started as it mounts: the drawing
 *  outlives it, so its timeline began before. */
function Datum({ leg }: { leg: Leg }) {
  const d = `M${leg.run.map((p) => `${p.x},${p.y}`).join(" L")}`;
  const motion = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => { motion.current?.beginElement(); }, []);
  return (
    <circle className="datum" r={4}>
      <animateMotion ref={motion} dur={`${DRAW}s`} path={d} begin="indefinite" fill="freeze" />
    </circle>
  );
}

/** How far a leg's arrow reaches into its target on screen, past its border (2026-11-18). */
const TIP = 6;

/** **A leg's run, its tip into its target**: its last stretch carried on `TIP` further — its
 *  first too, back into its source, where it goes both ways. */
function tipped(leg: Leg, zoom: number): { x: number; y: number }[] {
  const run = leg.run.map((p) => ({ ...p }));
  const carry = (end: number, from: number) => {
    const [p, q] = [run[end], run[from]];
    if (!p || !q) return;
    const n = Math.hypot(p.x - q.x, p.y - q.y) || 1;
    run[end] = { x: p.x + (p.x - q.x) / n * TIP / zoom, y: p.y + (p.y - q.y) / n * TIP / zoom };
  };
  if (run.length > 1) {
    carry(run.length - 1, run.length - 2);
    if (leg.both) carry(0, 1);
  }
  return run;
}
