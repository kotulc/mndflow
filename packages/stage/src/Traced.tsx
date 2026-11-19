/** **Hops traced across a map** (views `trace.ts`): each leg square, out of its source's right and
 *  into its target's left, drawn over the chips on a halo of the ground so it cuts cleanly across
 *  what it passes, an arrow just inside its target, what crosses it and how many relations it
 *  gathers said on hover, **heavier the more it gathers** (`weight`, a few steps), **named in a pill**
 *  clear of every line and label (`placed`); **a leg too short to read** — between neighbours —
 *  a badge on their shared edge in its place (2026-11-18). **A presentation's steps** (`steps`,
 *  docs/presentations.md): earlier legs faded, the last drawn from its start, its datum
 *  travelling along it, its label after. */

import { useStore } from "@xyflow/react";
import type { Leg, Trace } from "@mnd/views";

/** How long a step's line takes to draw, and its datum to travel it, in seconds. */
const DRAW = 1;

export function Traced({ trace, as = "path" }: { trace: Trace; as?: "path" | "steps" }) {
  const head = `mnd-trace-head-${as}`;
  const zoom = useStore((st) => st.transform[2]);
  const labels = placed(trace.legs, zoom);
  const short = trace.legs.map((l) => run_length(l.run) * zoom < SHORT);
  /** A presentation's step drawing now: its last, unless the last was a mark. */
  const now = (i: number) => as === "steps" && !trace.still && i === trace.legs.length - 1;
  /** A leg's group: its weight, and in a presentation whether it is the step now. */
  const leg_attrs = (l: Leg, i: number) => ({ "data-weight": weight(l.n),
    className: ["mnd-trace-leg", as === "steps" ? (now(i) ? "now" : "past") : ""]
      .filter(Boolean).join(" ") });
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
          <g key={`${l.from}>${l.to}.${i}`} {...leg_attrs(l, i)}>
            <title>{[...l.names.filter(Boolean), ...(l.n > 1 ? [`${l.n} relations`] : [])]
              .join(" · ")}</title>
            {short[i] ? null : <>
              <polyline className="hit" points={points} />
              <polyline className="halo" points={points} />
              <polyline className="run" points={points} pathLength={1}
                        markerEnd={`url(#${head})`}
                        {...(l.both ? { markerStart: `url(#${head})` } : {})} />
            </>}
            {now(i) ? <Datum leg={l} /> : null}
          </g>
        );
      })}
      {/* Every pill over every line, so a line passes under a badge, never across it. */}
      {trace.legs.map((l, i) => (labels[i] ? (
        <g key={`${l.from}>${l.to}.${i}.pill`} {...leg_attrs(l, i)}>
          <Pill {...labels[i]!} />
        </g>
      ) : null))}
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

/** A leg shorter than this on screen is a badge, not a line: its arrows would fill it. */
const SHORT = 24;

/** How far along a run a pill may sit, tried in turn; its measure on screen (`flow.css`
 *  `.mnd-trace .pill`): a monospace glyph, its padding, height and air off the line; and how
 *  far round a leg's ends nothing is set, clear of its arrows. */
const ALONG = [0.5, 0.35, 0.65, 0.2, 0.8];
const PILL = { glyph: 6.6, pad: 5, h: 16, air: 4, end: 12 };

type Box = { x: number; y: number; w: number; h: number };

/** A placed pill: its box and what it says; `badge` where it stands for its leg, `upright`
 *  where its text runs up an upright gap. */
type Placed = Box & { text: string; badge?: boolean; upright?: boolean };

/** **A pill**: its text on the ground, ringed in its leg's colour; upright, read bottom to
 *  top. */
function Pill({ x, y, w, h, text, badge, upright }: Placed) {
  const [cx, cy] = [x + w / 2, y + h / 2];
  return (
    <g className={badge ? "pill badge" : "pill"}>
      <rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) / 4} />
      <text className="label" x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
            {...(upright ? { transform: `rotate(-90 ${cx} ${cy})` } : {})}>{text}</text>
    </g>
  );
}

/** **Each leg's pill placed** (2026-11-18), measured at `zoom` as drawn. A short leg's is its
 *  badge, at its middle, its way as an arrow. Any other's sits off its line — above a level
 *  stretch, beside an upright one — at its middle, else further along: the first place clear of
 *  every line, every leg's ends and every pill before it; none where there is none, its names
 *  then said on hover alone. */
function placed(legs: readonly Leg[], zoom: number): (Placed | null)[] {
  const [h, air, pad] = [PILL.h / zoom, PILL.air / zoom, PILL.pad / zoom];
  const width = (text: string) => text.length * PILL.glyph / zoom + 2 * pad;
  const short = legs.map((l) => run_length(l.run) * zoom < SHORT);
  /** Every line's stretches, and a square round every end, kept clear. */
  const lines = legs.flatMap((l, k) => (short[k] ? [] : stretches(l.run, 1 / zoom)));
  const ends = legs.flatMap((l) => (l.run.length ? [l.run[0]!, l.run[l.run.length - 1]!] : []))
    .map((p) => { const r = PILL.end / zoom; return { x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r }; });
  const taken: Box[] = [];
  const clear = (b: Box) => ![...lines, ...ends, ...taken].some((o) => meets(b, o));
  return legs.map((leg, k) => {
    const said_as = said(leg);
    if (leg.run.length < 2) return null;
    if (short[k]) {
      /** Between neighbours side by side, the gap is upright: so is the badge, along it. */
      const upright = !way_upright(leg);
      const text = `${way(leg, upright)} ${said_as}`.trim();
      const at = along(leg.run, 0.5);
      const w = width(text);
      const box = upright ? { x: at.x - h / 2, y: at.y - w / 2, w: h, h: w, text, badge: true,
                              upright: true }
        : { x: at.x - w / 2, y: at.y - h / 2, w, h, text, badge: true };
      taken.push(box);
      return box;
    }
    if (!said_as) return null;
    const w = width(said_as);
    for (const t of ALONG) {
      const at = along(leg.run, t);
      const box = at.upright ? { x: at.x + air, y: at.y - h / 2, w, h }
        : { x: at.x - w / 2, y: at.y - air - h, w, h };
      if (!clear(box)) continue;
      taken.push(box);
      return { ...box, text: said_as };
    }
    return null;
  });
}

/** Whether a leg runs up or down rather than across. */
function way_upright(leg: Leg): boolean {
  const [a, b] = [leg.run[0]!, leg.run[leg.run.length - 1]!];
  return Math.abs(b.y - a.y) >= Math.abs(b.x - a.x);
}

/** **A short leg's way, as one arrow**: both ways, or the way it runs. In text turned upright
 *  the arrow is turned with it, so it still points the way on screen. */
function way(leg: Leg, turned = false): string {
  const [a, b] = [leg.run[0]!, leg.run[leg.run.length - 1]!];
  const on = way_upright(leg)
    ? (leg.both ? "↕" : b.y > a.y ? "↓" : "↑")
    : (leg.both ? "↔" : b.x > a.x ? "→" : "←");
  return turned ? ({ "↔": "↕", "→": "↓", "←": "↑" } as Record<string, string>)[on] ?? on : on;
}

/** A run's stretches as thin boxes, `t` thick. */
function stretches(run: readonly { x: number; y: number }[], t: number): Box[] {
  return run.slice(1).map((q, i) => {
    const p = run[i]!;
    return { x: Math.min(p.x, q.x) - t, y: Math.min(p.y, q.y) - t,
             w: Math.abs(q.x - p.x) + 2 * t, h: Math.abs(q.y - p.y) + 2 * t };
  });
}

/** Whether two boxes overlap. */
function meets(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** How long a run is. */
function run_length(run: readonly { x: number; y: number }[]): number {
  return run.slice(1).reduce((n, q, i) => n + Math.hypot(q.x - run[i]!.x, q.y - run[i]!.y), 0);
}

/** **What a leg says**: its first relation's name, and how many more it gathers (`+k`); a count
 *  alone where none is named. */
function said(leg: Leg): string {
  const [first] = leg.names.filter(Boolean);
  if (!first) return leg.n > 1 ? `${leg.n} relations` : "";
  return leg.n > 1 ? `${first} +${leg.n - 1}` : first;
}

/** The point `t` of the way along a run, and whether the stretch it sits on is upright. */
function along(run: readonly { x: number; y: number }[], t: number):
    { x: number; y: number; upright: boolean } {
  const lengths = run.slice(1).map((p, i) => Math.hypot(p.x - run[i]!.x, p.y - run[i]!.y));
  let left = lengths.reduce((a, b) => a + b, 0) * t;
  for (const [i, n] of lengths.entries()) {
    if (left <= n) {
      const f = n ? left / n : 0;
      const [a, b] = [run[i]!, run[i + 1]!];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f,
               upright: Math.abs(b.y - a.y) > Math.abs(b.x - a.x) };
    }
    left -= n;
  }
  return { ...run[run.length - 1]!, upright: false };
}
