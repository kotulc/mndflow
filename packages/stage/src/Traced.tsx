/** **Hops traced across a map** (views `trace.ts`): each leg square, out of its source's right and
 *  into its target's left, drawn over the chips on a halo of the ground so it cuts cleanly across
 *  what it passes, an arrow just inside its target, what crosses it said on hover. */

import type { Trace } from "@mnd/views";

export function Traced({ trace }: { trace: Trace }) {
  return (
    <svg className="mnd-trace"
         style={{ position: "absolute", overflow: "visible", left: 0, top: 0 }}>
      <defs>
        <marker id="mnd-trace-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.5"
                markerHeight="4.5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" />
        </marker>
      </defs>
      {trace.legs.map((l) => (
        <g key={`${l.from}>${l.to}`} className="mnd-trace-leg">
          <title>{l.names.filter(Boolean).join(" · ")}</title>
          <polyline className="hit" points={l.run.map((p) => `${p.x},${p.y}`).join(" ")} />
          <polyline className="halo" points={l.run.map((p) => `${p.x},${p.y}`).join(" ")} />
          <polyline className="run" points={l.run.map((p) => `${p.x},${p.y}`).join(" ")}
                    markerEnd="url(#mnd-trace-head)"
                    {...(l.both ? { markerStart: "url(#mnd-trace-head)" } : {})} />
        </g>
      ))}
    </svg>
  );
}
