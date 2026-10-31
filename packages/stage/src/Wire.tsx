/** What a relationship looks like. */

import { createContext, useCallback, useContext, useState, type CSSProperties } from "react";
import { BaseEdge, EdgeLabelRenderer, useStore, type EdgeProps } from "@xyflow/react";
import { avoided_run, crossed, drawn, end_words, heads, line_level, middle_of, route, BARE,
         TEXT_BAND, UNIT, type LineEdge, type Wire as Look } from "@mnd/views";
import { head_url, Heads, Name, useNaming } from "@mnd/theme";

/** How square a right-angled corner is. */
const BEND = 6;
/** How far beside its run a name sits: above a level leg, right of an upright one. */
const LIFT = 8;
const ASIDE = 6;

/** A name's glyph on screen at the layout's size, in pixels. */
const GLYPH = 6.2;

/** How far in from its end the cross saying an end cannot be reached sits: half a unit, clear of
 *  the head and of the middle. */
const CROSS_IN = UNIT / 2;

/** Half the cross's arms. */
const CROSS = 4;

/** How far the words of an end start along the line from it, and how far out to its side. */
const WORDS = { along: 6, out: 3 };

type Pt = { x: number; y: number };

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

/** **A line climbs the ladder by its length on screen** (views `line_level`): its stroke, its
 *  anchors, its name beside the stroke, its ends' words. Nothing sits on the stroke. Hovered or
 *  picked, it thickens and says its ends at any level. */
export function Wire(props: EdgeProps<LineEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
          label, data, style, selected } = props;
  const [hot, set_hot] = useState(false);

  /** A line with no name still has somewhere to type one. */
  const naming = useNaming();
  const runs = useContext(RunsContext);
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
    : routed ?? route({ x: sourceX, y: sourceY }, sourcePosition,
                      { x: targetX, y: targetY }, targetPosition,
                      data?.fan, data?.module === "tie");
  const fan = given || routed ? undefined : data?.fan;
  const path = drawn(run, BEND);
  const look = data?.wire ?? BARE;
  const end = heads(data);
  const { attrs, style: tint } = paint(look);

  /** The name and the handle, composed rather than folded together. */
  const middle = [label ? String(label) : "", data?.alias ?? ""]
    .filter(Boolean).join(" ");
  /** Beside its longest leg: above it where it is level, right of it where it is upright. */
  const at = middle_of(run, fan);
  const beside = at.level || data?.level
    ? `translate(${at.x}px, ${at.y - LIFT}px) translate(-50%, -50%)`
    : `translate(${at.x + ASIDE}px, ${at.y}px) translate(0, -50%)`;
  const length = length_of(run);
  const level = useStore(useCallback((st) => {
    const k = st.transform[2];
    return line_level(length, k, middle.length * GLYPH
      * Math.min(TEXT_BAND.high, Math.max(TEXT_BAND.low, k)));
  }, [length, middle.length]));
  const loud = hot || !!selected;
  const named = level >= 2 || loud || naming.id === id;
  const ends = level >= 3 || loud;

  return (
    <>
      <g className={loud ? "mnd-wire hot" : "mnd-wire"} {...attrs} style={tint}
         onMouseEnter={() => set_hot(true)} onMouseLeave={() => set_hot(false)}>
        <BaseEdge id={id} path={path} style={style}
                  {...(level >= 1 || loud
                    ? { markerStart: head_url(end.from), markerEnd: head_url(end.to) } : {})} />
        {/* A double line is two strokes, not a thicker one. */}
        {look.border_style === "double"
          ? <path className="mnd-wire-core" d={path} /> : null}
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
                 style={{ ...tint, transform: words_at(run, way) }}>
              {words}
            </div>
          </EdgeLabelRenderer>
        );
      })}
      {(middle && named) || naming.id === id ? (
        <EdgeLabelRenderer>
          {/* `nodrag` and `nopan`, so a press on a name does not pan. */}
          <div className={`mnd-wire-name nodrag nopan${data?.away ? " mnd-out" : ""}`} data-edge={id} {...attrs}
               style={{ ...tint, transform: beside }}
               title={middle}>
            <Name id={id} className="mnd-wire-text card-name" text={middle} />
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

/** The heads live in the theme, shared with the tray's preview. */
export { Heads };

/** One type, keyed by the name a projection asks for. */
export const EDGE_TYPES = { wire: Wire } as const;
