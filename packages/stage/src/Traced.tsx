/** **A path traced across a map** (views `trace.ts`): each leg square, out of its source's top
 *  or bottom, an arrow at its end, its calls said on hover; each block on the path numbered at
 *  its lower right corner in the order the path first reaches it. Drawn over the map, in its
 *  coordinates, quiet enough to read the chips under it. */

import type { Trace } from "@mnd/views";

export function Traced({ trace }: { trace: Trace }) {
  return (
    <>
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
            <title>{`${l.n}. ${l.names.filter(Boolean).join(" · ")}`}</title>
            <polyline className="hit" points={l.run.map((p) => `${p.x},${p.y}`).join(" ")} />
            <polyline className="run" points={l.run.map((p) => `${p.x},${p.y}`).join(" ")}
                      markerEnd="url(#mnd-trace-head)" />
          </g>
        ))}
      </svg>
      {trace.marks.map((m) => (
        <span key={m.id} className="mnd-trace-mark" style={{ left: m.x, top: m.y }}>{m.n}</span>
      ))}
    </>
  );
}
