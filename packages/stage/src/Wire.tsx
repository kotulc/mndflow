/** What a relationship looks like. */

import { createContext, useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { BaseEdge, EdgeLabelRenderer, Position, type EdgeProps } from "@xyflow/react";
import { avoided_run, crossed, drawn, end_words, heads, line_shows, name_box, route, BARE, NAMED,
         UNIT, type LineEdge, type NameBox, type Wire as Look } from "@mnd/views";
import { head_url, Heads, Name, useNaming } from "@mnd/theme";
import { usePicks } from "./picked";

/** How square a right-angled corner is. */
const BEND = 6;
/** How far in from its end the cross saying an end cannot be reached sits: half a unit, clear of
 *  the head and of the middle. */
const CROSS_IN = UNIT / 2;

/** Half the cross's arms. */
const CROSS = 4;

/** How far the words of an end start along the line from it, and how far out to its side. */
const WORDS = { along: 6, out: 3 };

type Pt = { x: number; y: number };

/** The face opposite another. */
const TURNED: Record<Position, Position> = {
  [Position.Top]: Position.Bottom, [Position.Bottom]: Position.Top,
  [Position.Left]: Position.Right, [Position.Right]: Position.Left,
};

/** The point `d` along a run from one end, and the way the run heads there, as a unit step. */
function along(run: readonly Pt[], way: "from" | "to", d: number): { at: Pt; dir: Pt } {
  const pts = way === "from" ? run : [...run].reverse();
  const [a, b] = [pts[0]!, pts[1] ?? pts[0]!];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const t = Math.min(d, len);
  return { at: { x: a.x + dir.x * t, y: a.y + dir.y * t }, dir };
}

/** The cross drawn half a unit in from an end that cannot be reached. */
function cross_at(run: readonly Pt[], way: "from" | "to"): string {
  const { at, dir } = along(run, way, CROSS_IN);
  /** Two arms at right angles, each at forty-five degrees to the run. */
  const u = { x: (dir.x - dir.y) * CROSS * Math.SQRT1_2, y: (dir.y + dir.x) * CROSS * Math.SQRT1_2 };
  const v = { x: (dir.x + dir.y) * CROSS * Math.SQRT1_2, y: (dir.y - dir.x) * CROSS * Math.SQRT1_2 };
  return `M ${at.x - u.x} ${at.y - u.y} L ${at.x + u.x} ${at.y + u.y} `
    + `M ${at.x - v.x} ${at.y - v.y} L ${at.x + v.x} ${at.y + v.y}`;
}

/** **Where an end's words sit**: they start a little along the line and grow away from the card,
 *  beside the stroke — above a level leg, right of an upright one — so they never cover the card
 *  or the line. A CSS transform from the point. */
function words_at(run: readonly Pt[], way: "from" | "to"): string {
  const { at, dir } = along(run, way, WORDS.along);
  const level = Math.abs(dir.x) >= Math.abs(dir.y);
  const [x, y] = level ? [at.x, at.y - WORDS.out] : [at.x + WORDS.out, at.y];
  const shift = level ? `${dir.x < 0 ? "-100%" : "0"}, -100%` : `0, ${dir.y < 0 ? "-100%" : "0"}`;
  return `translate(${x}px, ${y}px) translate(${shift})`;
}

/** The runs routed round cards for the drawing as it stands, by line. */
export const RunsContext = createContext<ReadonlyMap<string, readonly { x: number; y: number }[]>>(
  new Map());

/** Every card's box as it stands, which a line's name keeps clear of. */
export const CardsContext = createContext<readonly { x: number; y: number; w: number; h: number }[]>(
  []);

/** Every line's name box, placed together so none covers another (views `lines_drawn`). */
export const NamesContext = createContext<ReadonlyMap<string, NameBox>>(new Map());

/** Where each line hops the lines it crosses (views `lines_drawn`). */
export const HopsContext = createContext<ReadonlyMap<string, readonly { x: number; y: number }[]>>(
  new Map());

/** **The lines of a presentation's step now** (stage `Showing.now`): each haloed and drawn in
 *  over the rest; on a dataflow a datum travels it (Stage `flows`). */
export const NowContext = createContext<ReadonlySet<string>>(new Set());

/** How long a step's line takes to draw, and its datum to travel it, in seconds. */
const DRAW = 1;

/** Where a name's box is set from, by the side of its leg it sits on. */
const BESIDE: Record<NameBox["side"], (b: NameBox) => string> = {
  above: (b) => `translate(${b.at.x}px, ${b.at.y - NAMED.lift}px) translate(-50%, -50%)`,
  below: (b) => `translate(${b.at.x}px, ${b.at.y + NAMED.lift}px) translate(-50%, -50%)`,
  right: (b) => `translate(${b.at.x + NAMED.aside}px, ${b.at.y}px) translate(0, -50%)`,
  left: (b) => `translate(${b.at.x - NAMED.aside}px, ${b.at.y}px) translate(-100%, -50%)`,
};

/** How a run paints itself, as the attributes `card.css` already reads. */
function paint(look: Look): { attrs: Record<string, string>; style: CSSProperties } {
  const tinted = look.hue !== undefined;
  /** Only stated keys become attributes, so an unstyled tie keeps its module's look. */
  const stated = (name: string, value: string | undefined) =>
    value ? { [`data-${name}`]: value } : {};
  return {
    attrs: {
      ...(tinted ? { "data-family": "tint" } : stated("family", look.family)),
      ...stated("border-width", look.border_width),
      ...stated("border-style", look.border_style),
      ...stated("border-contrast", look.border_contrast),
      ...stated("name-font", look.name_font),
      ...stated("name-weight", look.name_weight),
      ...stated("name-contrast", look.name_contrast),
    },
    style: (tinted ? { "--card-h": String(look.hue) } : {}) as CSSProperties,
  };
}

/** A run's length, in layout units. */
function length_of(run: readonly Pt[]): number {
  return run.slice(1).reduce((n, q, i) => n + Math.hypot(q.x - run[i]!.x, q.y - run[i]!.y), 0);
}

/** **A line shows by its laid length** (views `line_shows`), never the zoom: its stroke, its
 *  anchors, its name beside the stroke, its ends' words. Nothing sits on the stroke. Hovered or
 *  picked, it thickens and says its ends on any line. */
export function Wire(props: EdgeProps<LineEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
          label, data, style } = props;
  /** A line drawn for several (`×n`) is picked when any of them is. */
  const selected = usePicks([id, ...(data?.also ?? [])]).length > 0;
  const [hot, set_hot] = useState(false);

  /** A line with no name still has somewhere to type one. */
  const naming = useNaming();
  const runs = useContext(RunsContext);
  const cards = useContext(CardsContext);
  const names = useContext(NamesContext);
  const hops = useContext(HopsContext);
  const now = useContext(NowContext).has(id);
  /** A wall's handle faces into the room; the end a line from outside meets faces out
   *  (views `LineData.outer`). */
  const facing = (way: "from" | "to", at: Position) => (data?.outer === way ? TURNED[at] : at);
  /** The run routed round cards, while it still meets both ends; else straight or one Z, turning
   *  where its lines fan. A tie runs straight. */
  const routed = avoided_run(runs.get(id), { x: sourceX, y: sourceY }, { x: targetX, y: targetY });
  /** A sequence message already knows its run. Everything else is routed, or one Z. */
  /** A run the world routed holds while both its ends stay where it was routed to. */
  const kept = data?.routed
    ? avoided_run(data.points, { x: sourceX, y: sourceY }, { x: targetX, y: targetY })
    : null;
  const given = data?.routed ? kept : data?.points;
  const run = given && given.length > 1 ? given
    : routed ?? route({ x: sourceX, y: sourceY }, facing("from", sourcePosition),
                      { x: targetX, y: targetY }, facing("to", targetPosition),
                      data?.fan, data?.module === "tie", cards);
  const fan = given || routed ? undefined : data?.fan;
  /** Hops only where the run is the one they were found on. */
  const path = drawn(run, BEND, given || routed ? hops.get(id) ?? [] : []);
  const look = data?.wire ?? BARE;
  /** **Its anchors**: a head where it has one, else a short bar where it meets the card; a tie
   *  none. */
  const anchor = (h: string) => (h === "none" && data?.module !== "tie" ? "bar" : h);
  const end = heads(data);
  const { attrs, style: tint } = paint(look);

  /** The name and the handle, composed rather than folded together; then how many it stands for,
   *  never a thicker stroke. */
  const middle = [label ? String(label) : "", data?.alias ?? ""]
    .filter(Boolean).join(" ");
  const times = data?.times ? `×${data.times}` : "";
  /** Beside its longest leg clear of the cards (views `name_box`): above or below it where it is
   *  level, right or left of it where it is upright. */
  const placed = names.get(id);
  const box = placed && on_run(run, placed.at) ? placed
    : name_box(run, middle.length + times.length, fan, data?.level, cards);
  const beside = BESIDE[box.side](box);
  const shows = line_shows(length_of(run), box.w);
  const loud = hot || !!selected;
  const named = shows.name || loud || naming.id === id;
  const ends = shows.ends || loud;

  return (
    <>
      <g className={["mnd-wire", loud ? "hot" : "", selected ? "picked" : "", now ? "now" : ""]
           .filter(Boolean).join(" ")} {...attrs} style={tint}
         onMouseEnter={() => set_hot(true)} onMouseLeave={() => set_hot(false)}>
        {/* The step now: a halo of the ground under it, so it reads across what it overlaps. */}
        {now ? <path className="mnd-wire-halo" d={path} /> : null}
        <BaseEdge id={id} path={path} style={style}
                  {...(shows.anchors || loud
                    ? { markerStart: head_url(anchor(end.from)),
                        markerEnd: head_url(anchor(end.to)) } : {})} />
        {/* A double line is two strokes, not a thicker one. */}
        {look.border_style === "double"
          ? <path className="mnd-wire-core" d={path} /> : null}
        {now ? (
          <>
            <path className="mnd-wire-now" d={path} pathLength={1} />
            <Datum path={path} />
          </>
        ) : null}
        {(["from", "to"] as const).filter((way) => crossed(data, way)).map((way) => (
          <path key={way} className="mnd-wire-cross"
                d={cross_at(run, way)} />
        ))}
      </g>
      {(["from", "to"] as const).map((way) => {
        const words = end_words(data, way);
        if (!words || !ends) return null;
        return (
          <EdgeLabelRenderer key={way}>
            <div className={`mnd-wire-end nodrag nopan${data?.away ? " mnd-out" : ""}`} {...attrs}
                 data-edge={id}
                 style={{ ...tint, transform: words_at(run, way) }}>
              {words}
            </div>
          </EdgeLabelRenderer>
        );
      })}
      {((middle || times) && named) || naming.id === id ? (
        <EdgeLabelRenderer>
          {/* `nodrag` and `nopan`, so a press on a name does not pan. */}
          <div className={`mnd-wire-name nodrag nopan${data?.away ? " mnd-out" : ""}${selected ? " picked" : ""}`}
               data-edge={id} {...attrs}
               style={{ ...tint, transform: beside }}
               title={middle}>
            <Name id={id} className="mnd-wire-text card-name" text={middle} />
            {times ? <span className="mnd-wire-times">{times}</span> : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

/** **The datum travelling the step now**, started as it mounts: the edges' drawing outlives it,
 *  so its timeline began long before. */
function Datum({ path }: { path: string }) {
  const motion = useRef<SVGAnimateMotionElement>(null);
  useEffect(() => { motion.current?.beginElement(); }, []);
  return (
    <circle className="mnd-wire-datum" r={4}>
      <animateMotion ref={motion} dur={`${DRAW}s`} path={path} begin="indefinite" fill="freeze" />
    </circle>
  );
}

/** The heads live in the theme, shared with the tray's preview. */
export { Heads };

/** One type, keyed by the name a projection asks for. */
export const EDGE_TYPES = { wire: Wire } as const;

/** Whether a point lies on a run, within a pixel: a name placed together still sits on it. */
function on_run(run: readonly { x: number; y: number }[], p: { x: number; y: number }): boolean {
  return run.slice(1).some((q, i) => {
    const a = run[i]!;
    const [lx, hx, ly, hy] = [Math.min(a.x, q.x), Math.max(a.x, q.x), Math.min(a.y, q.y),
                              Math.max(a.y, q.y)];
    const cross = (q.x - a.x) * (p.y - a.y) - (q.y - a.y) * (p.x - a.x);
    return p.x >= lx - 1 && p.x <= hx + 1 && p.y >= ly - 1 && p.y <= hy + 1
      && Math.abs(cross) <= Math.hypot(q.x - a.x, q.y - a.y);
  });
}
