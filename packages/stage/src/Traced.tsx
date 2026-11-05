/** **A path traced across a map** (views `trace.ts`): each leg square, fanned out of the side of
 *  its source facing where it goes, an arrow at its end, what crosses it said on hover, run under
 *  the chips — the dimmed ones let it through. */

import type { Trace } from "@mnd/views";

export function Traced({ trace }: { trace: Trace }) {
  return (
    <svg className="mnd-trace"
         style={{ position: "absolute", overflow: "visible", left: 0, top: 0 }}>
      <defs>
        <marker id="mnd-trace-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5"
                markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" />
        </marker>
      </defs>
      {trace.legs.map((l) => (
        <g key={`${l.from}>${l.to}`} className="mnd-trace-leg">
          <title>{l.names.filter(Boolean).join(" · ")}</title>
          <polyline className="hit" points={l.run.map((p) => `${p.x},${p.y}`).join(" ")} />
          <polyline className="run" points={l.run.map((p) => `${p.x},${p.y}`).join(" ")}
                    markerEnd="url(#mnd-trace-head)"
                    {...(l.both ? { markerStart: "url(#mnd-trace-head)" } : {})} />
        </g>
      ))}
    </svg>
  );
}
