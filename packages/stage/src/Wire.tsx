/** What a relationship looks like. */

import { createContext, useContext, type CSSProperties } from "react";
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { avoided_run, crossed, drawn, end_words, heads, middle_of, route, BARE, UNIT,
         type LineEdge, type Wire as Look } from "@mnd/views";
import { head_url, Heads, Name, useNaming } from "@mnd/theme";

/** How square a right-angled corner is. */
const BEND = 6;
/** How far above its run a name that reads level sits. */
const LIFT = 8;

/** How far in from its end the cross saying an end cannot be reached sits: half a unit, clear of
 *  the head and of the middle. */
const CROSS_IN = UNIT / 2;

/** Half the cross's arms. */
const CROSS = 4;

/** How far the words of an end sit along the line from it, and out to its side. */
const WORDS = { along: 14, out: 9 };

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

/** Where an end's words sit: a little along the line, out to one side. */
function words_at(run: readonly Pt[], way: "from" | "to"): Pt {
  const { at, dir } = along(run, way, WORDS.along);
  return { x: at.x - dir.y * WORDS.out, y: at.y + dir.x * WORDS.out };
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
    style: {
      ...(tinted ? {
        "--card-h": String(look.hue),
        "--card-c": `calc(var(--tint-ceiling) * ${look.intensity ?? 0.65})`,
      } : {}),
      ...(look.opacity !== undefined ? { opacity: look.opacity } : {}),
    } as CSSProperties,
  };
}

export function Wire(props: EdgeProps<LineEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
          label, data, style } = props;

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
  /** Drawn at its world scale: the run in its own units, the stroke and its heads scaled with it. */
  const k = data?.scale ?? 1;
  const path = drawn(k === 1 ? run : run.map((p) => ({ x: p.x / k, y: p.y / k })), BEND);
  const zoom = k === 1 ? "" : ` scale(${k})`;
  const look = data?.wire ?? BARE;
  const end = heads(data);
  const { attrs, style: tint } = paint(look);

  /** The name and the handle, composed rather than folded together. */
  const middle = [label ? String(label) : "", data?.alias ?? ""]
    .filter(Boolean).join(" ");
  /** Too wide for its leg, a name reads upright across it — unless it reads level, above. */
  const at = middle_of(run, fan, middle.length);
  const { x, y, upright } = data?.level ? { ...at, y: at.y - LIFT, upright: false } : at;

  return (
    <>
      <g className="mnd-wire" {...attrs} style={tint}
         {...(k === 1 ? {} : { transform: `scale(${k})` })}>
        <BaseEdge id={id} path={path} style={style}
                  markerStart={head_url(end.from)} markerEnd={head_url(end.to)} />
        {/* A double line is two strokes, not a thicker one. */}
        {look.border_style === "double"
          ? <path className="mnd-wire-core" d={path} /> : null}
        {(["from", "to"] as const).filter((way) => crossed(data, way)).map((way) => (
          <path key={way} className="mnd-wire-cross"
                d={cross_at(run.map((p) => ({ x: p.x / k, y: p.y / k })), way)} />
        ))}
      </g>
      {(["from", "to"] as const).map((way) => {
        const words = end_words(data, way);
        if (!words) return null;
        const at = words_at(run, way);
        return (
          <EdgeLabelRenderer key={way}>
            <div className={`mnd-wire-end nodrag nopan${data?.away ? " mnd-out" : ""}`} {...attrs}
                 style={{ ...tint, transform: `translate(${at.x}px, ${at.y}px)${zoom} translate(-50%, -50%)` }}>
              {words}
            </div>
          </EdgeLabelRenderer>
        );
      })}
      {middle || naming.id === id ? (
        <EdgeLabelRenderer>
          {/* `nodrag` and `nopan`, so a press on a name does not pan. */}
          <div className={`mnd-wire-name nodrag nopan${data?.away ? " mnd-out" : ""}`} data-edge={id} {...attrs}
               style={{ ...tint,
                        transform: `translate(${x}px, ${y}px)${zoom}${upright ? " rotate(-90deg)" : ""} translate(-50%, -50%)` }}
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
