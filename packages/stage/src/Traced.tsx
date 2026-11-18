/** **Hops traced across a map** (views `trace.ts`): each leg square, out of its source's right and
 *  into its target's left, drawn over the chips on a halo of the ground so it cuts cleanly across
 *  what it passes, an arrow just inside its target, what crosses it and how many relations it
 *  gathers said on hover, **heavier the more it gathers** (`weight`, a few steps). **A model's
 *  lines** draw the same way, `quiet`, under its chips until lit. **A presentation's steps**
 *  (`steps`, docs/presentations.md): earlier legs faded, the last drawn from its start, its datum
 *  travelling along it, its label after. */

import type { Leg, Trace } from "@mnd/views";

/** How long a step's line takes to draw, and its datum to travel it, in seconds. */
const DRAW = 1;

export function Traced({ trace, as = "path" }: { trace: Trace; as?: "path" | "quiet" | "steps" }) {
  const head = `mnd-trace-head-${as}`;
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
        const points = l.run.map((p) => `${p.x},${p.y}`).join(" ");
        const now = as === "steps" && !trace.still && i === trace.legs.length - 1;
        return (
          <g key={`${l.from}>${l.to}.${i}`} data-weight={weight(l.n)}
             className={["mnd-trace-leg", as === "steps" ? (now ? "now" : "past") : ""]
               .filter(Boolean).join(" ")}>
            <title>{[...l.names.filter(Boolean), ...(l.n > 1 ? [`${l.n} relations`] : [])]
              .join(" · ")}</title>
            <polyline className="hit" points={points} />
            <polyline className="halo" points={points} />
            <polyline className="run" points={points} pathLength={1}
                      markerEnd={`url(#${head})`}
                      {...(l.both ? { markerStart: `url(#${head})` } : {})} />
            {now ? <Datum leg={l} /> : null}
            {as === "steps" ? <Label leg={l} /> : null}
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

/** The datum travelling along a step's line as it draws. */
function Datum({ leg }: { leg: Leg }) {
  const d = `M${leg.run.map((p) => `${p.x},${p.y}`).join(" L")}`;
  return (
    <circle className="datum" r={4}>
      <animateMotion dur={`${DRAW}s`} path={d} fill="freeze" />
    </circle>
  );
}

/** **A step's label**: its line's name, plain text with a halo at the middle of its run. */
function Label({ leg }: { leg: Leg }) {
  const name = leg.names.filter(Boolean).join(", ");
  if (!name || leg.run.length < 2) return null;
  const mid = middle(leg.run);
  return <text className="label" x={mid.x} y={mid.y - 6} textAnchor="middle">{name}</text>;
}

/** The point halfway along a run. */
function middle(run: readonly { x: number; y: number }[]): { x: number; y: number } {
  const lengths = run.slice(1).map((p, i) => Math.hypot(p.x - run[i]!.x, p.y - run[i]!.y));
  let left = lengths.reduce((a, b) => a + b, 0) / 2;
  for (const [i, n] of lengths.entries()) {
    if (left <= n) {
      const t = n ? left / n : 0;
      return { x: run[i]!.x + (run[i + 1]!.x - run[i]!.x) * t,
               y: run[i]!.y + (run[i + 1]!.y - run[i]!.y) * t };
    }
    left -= n;
  }
  return run[run.length - 1]!;
}
