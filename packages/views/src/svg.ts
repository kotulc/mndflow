/** A Scene as one standalone SVG.
 *
 *  The third renderer, and the one a published page can hold: no React, no DOM
 *  and no runtime — a string a build step writes to a file. It draws the same
 *  class vocabulary the React renderer does, so a page that already carries the
 *  theme styles it, and it ships its own stylesheet so a file opened alone
 *  still reads.
 *
 *  **A box that names a link becomes an anchor.** That is the whole of what
 *  this knows about the outside: where a block came from is a field on the
 *  block, and following one is a renderer's business. */

import { getSmoothStepPath, Position } from "@xyflow/system";
import type { Side } from "@mnd/core";
import { box_of, extent, type BoxNode, type LineEdge, type Scene } from "./scene";
import { at_seat, type Perch } from "./seat";

/** How the drawing is dressed. Every one of these has a default that works. */
export type Paper = {
  /** The accessible name. Defaults to what the layer is called. */
  title?: string;
  /** Replaces the default stylesheet outright. **`""` drops the `<style>`
   *  block**, which is what a page embedding the drawing in MDX wants: CSS is
   *  braces, and MDX reads a brace as the start of an expression. Load `SHEET`
   *  once on such a page instead of once per drawing. */
  style?: string;
  /** Room around the drawing. */
  pad?: number;
  /** What every generated id is prefixed with, so several drawings can sit on
   *  one page without their markers and clips colliding. */
  id?: string;
};

const PAD = 24;

/** The default stylesheet.
 *
 *  Every value is **read from the ramp with a fallback**: inlined in a page
 *  carrying the theme it takes the page's, and standing alone it takes the
 *  whiteprint, which is what a documentation site is. These are the only
 *  colours outside `theme`, and they exist so a file works with nothing loaded
 *  — never as a second palette to pick from.
 *
 *  Exported so a page holding several drawings can carry it once and pass
 *  `style: ""` to each. */
export const SHEET = `
svg.scene {
  --ground: var(--s-neutral-ground, oklch(0.958 0.008 232));
  --fill: var(--s-neutral-fill, oklch(0.985 0.009 232));
  --line: var(--s-neutral-line, oklch(0.800 0.014 232));
  --stroke: var(--s-neutral-stroke, oklch(0.620 0.016 232));
  --dim: var(--s-neutral-dim, oklch(0.495 0.018 232));
  --ink: var(--s-neutral-ink, oklch(0.265 0.026 232));
  --lead-fill: var(--s-primary-fill, oklch(0.985 0.025 235));
  --lead: var(--s-primary-edge, oklch(0.500 0.140 235));
  --faint-fill: var(--s-muted-fill, oklch(0.985 0.005 232));
  --faint-line: var(--s-muted-line, oklch(0.800 0.008 232));
  --faint: var(--s-muted-dim, oklch(0.495 0.010 232));
  --away: var(--s-away-edge, oklch(0.500 0.160 285));
  --wrong: var(--s-error-edge, oklch(0.500 0.180 25));
  --note-fill: var(--s-note-fill, oklch(0.985 0.031 78));
  --note-line: var(--s-note-line, oklch(0.800 0.077 78));
  --note-ink: var(--s-note-ink, oklch(0.265 0.056 78));
  --face: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  background: var(--bg, var(--ground));
}
svg.scene a { cursor: pointer; }
svg.scene a:hover rect { stroke: var(--lead); stroke-width: 2; }
svg.scene .frame rect { fill: none; stroke: var(--stroke); stroke-width: 1; }
svg.scene .frame text {
  fill: var(--dim); font: 11px var(--face); dominant-baseline: middle;
  paint-order: stroke; stroke: var(--bg, var(--ground)); stroke-width: 6px;
  stroke-linejoin: round;
}
svg.scene .card rect { fill: var(--fill); stroke: var(--line); stroke-width: 1; }
svg.scene .card text { fill: var(--ink); font: 12px var(--face); }
svg.scene .card.container rect { fill: var(--lead-fill); stroke: var(--lead); }
svg.scene .card.reference rect { fill: none; stroke: var(--away); stroke-dasharray: 4 3; }
svg.scene .card.reference text { fill: var(--away); }
svg.scene .card.missing rect { stroke: var(--wrong); }
svg.scene .card.missing text { fill: var(--wrong); }
svg.scene .card.note rect { fill: var(--note-fill); stroke: var(--note-line); }
svg.scene .card.note text { fill: var(--note-ink); }
svg.scene .card.group rect {
  fill: var(--faint-fill); fill-opacity: 0.4; stroke: var(--faint-line);
  stroke-dasharray: 6 4;
}
svg.scene .card.group text { fill: var(--faint); dominant-baseline: hanging; }
svg.scene .card.interface rect {
  fill: var(--bg, var(--ground)); stroke: var(--stroke); stroke-width: 1.5;
}
svg.scene .card.interface.in rect { fill: var(--lead); }
svg.scene .card.interface.out rect { fill: none; }
svg.scene .card.interface.in.out rect { fill: var(--lead-fill); }
svg.scene .card.header rect { fill: var(--faint-fill); stroke: var(--faint-line); }
svg.scene .card.header text { fill: var(--faint); font-size: 11px; }
svg.scene .card.cell rect { fill: none; stroke: var(--faint-line); stroke-width: 0.5; }
svg.scene .card.cell text { fill: var(--dim); font-size: 11px; }
svg.scene .card.cell.filled rect { fill: var(--lead-fill); stroke: var(--lead); stroke-width: 1; }
svg.scene .card.cell.filled text { fill: var(--lead); }
svg.scene .route path { fill: none; stroke: var(--stroke); stroke-width: 1.5; }
svg.scene .route .head { fill: var(--stroke); }
svg.scene .route text { fill: var(--dim); font: 10px var(--face); }
svg.scene .route.directed path { stroke: var(--lead); }
svg.scene .route.directed .head { fill: var(--lead); }
svg.scene .route.reference path { stroke: var(--away); stroke-dasharray: 5 3; opacity: 0.6; }
svg.scene .route.tie path {
  stroke: var(--note-line); stroke-dasharray: 2 4; stroke-width: 1; opacity: 0.55;
}
`.trim();

/** The whole scene, as one SVG document. */
export function draw_svg(scene: Scene, paper: Paper = {}): string {
  const pad = paper.pad ?? PAD;
  const key = paper.id ?? "mnd";
  const seen = extent(scene);
  const w = Math.max(seen.w, 200) + pad * 2;
  const h = Math.max(seen.h, 200) + pad * 2;
  const name = paper.title ?? scene.frame?.label ?? scene.trail.at(-1)?.label ?? "diagram";

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" class="scene" role="img"`
    + ` viewBox="${round(-w / 2)} ${round(-h / 2)} ${round(w)} ${round(h)}"`
    + ` width="${round(w)}" height="${round(h)}"`
    + ` preserveAspectRatio="xMidYMid meet" aria-label="${esc(name)}">`,
    `<title>${esc(name)}</title>`,
    `<style>${paper.style ?? SHEET}</style>`,
    `<defs><marker id="${key}-arrow" viewBox="0 0 10 10" refX="9" refY="5"`
    + ` markerWidth="6" markerHeight="6" orient="auto-start-reverse">`
    + `<path d="M 0 0 L 10 5 L 0 10 z" class="head" /></marker></defs>`,
  ];

  if (scene.frame) {
    const f = scene.frame;
    parts.push(`<g class="frame"><rect x="${round(f.x)}" y="${round(f.y)}"`
      + ` width="${round(f.w)}" height="${round(f.h)}" rx="3" />`
      + `<text x="${round(f.x + 12)}" y="${round(f.y)}">${esc(f.label)}</text></g>`);
  }

  const at = new Map(scene.nodes.map((n) => [n.id, box_of(n)]));
  const met = new Map(scene.perches.map((p) => [`${p.edge}|${p.end}`, p]));
  for (const e of scene.edges) parts.push(line(e, at, met, key));
  scene.nodes.forEach((n, i) => parts.push(card(n, `${key}-clip-${i}`)));

  parts.push(`</svg>`);
  return parts.join("\n") + "\n";
}

/** One card. A box that names a link is **wrapped** rather than drawn
 *  differently: where it points is not a look. */
function card(node: BoxNode, clip: string): string {
  const d = node.data;
  const at = box_of(node);
  const shape = `<rect x="${round(at.x)}" y="${round(at.y)}"`
    + ` width="${round(at.w)}" height="${round(at.h)}" rx="3" />`;
  const drawn = `<g class="${["card", ...d.marks].join(" ")}"`
    + (d.def ? ` data-def="${esc(d.def)}"` : "") + `>`
    + shape + `<title>${esc(d.label)}</title>`
    + (d.on ? `` : label(node, clip)) + `</g>`;
  return d.link ? `<a href="${esc(d.link)}">${drawn}</a>` : drawn;
}

/** A name too long for its card is clipped — the same rule the React renderer
 *  draws by. */
function label(node: BoxNode, clip: string): string {
  const d = node.data;
  if (!d.label) return ``;
  const box = box_of(node);
  const x = box.x + box.w / 2;
  const y = box.y + box.h / 2;
  return `<clipPath id="${clip}"><rect x="${round(box.x)}" y="${round(box.y)}"`
    + ` width="${round(box.w)}" height="${round(box.h)}" /></clipPath>`
    + `<text x="${round(x)}" y="${round(y)}" dominant-baseline="central"`
    + ` text-anchor="middle" clip-path="url(#${clip})">${esc(d.label)}</text>`;
}

/** One line. **The same path the canvas draws** — `getSmoothStepPath` is React
 *  Flow's own, it is a pure function of six numbers, and calling it here is
 *  what keeps the headless drawing and the browser one from drifting.
 *
 *  **Where it meets each end is the projection's**, and arrives as a perch, so
 *  this and the canvas read one answer rather than each working one out. An end
 *  seated on an interface has no perch: it meets the middle of the wall the
 *  interface is set into, which is the whole of that interface. */
function line(edge: LineEdge, at: Map<string, At>, met: ReadonlyMap<string, Perch>,
              key: string): string {
  const a = at.get(edge.source);
  const b = at.get(edge.target);
  if (!a || !b) return ``;
  const dx = (b.x + b.w / 2) - (a.x + a.w / 2);
  const dy = (b.y + b.h / 2) - (a.y + a.h / 2);
  const across = Math.abs(dx) >= Math.abs(dy);
  const from_perch = met.get(`${edge.id}|from`);
  const to_perch = met.get(`${edge.id}|to`);
  const out = from_perch ? FACE[from_perch.side]
    : across ? (dx >= 0 ? Position.Right : Position.Left)
             : (dy >= 0 ? Position.Bottom : Position.Top);
  const into = to_perch ? FACE[to_perch.side]
    : across ? (dx >= 0 ? Position.Left : Position.Right)
             : (dy >= 0 ? Position.Top : Position.Bottom);
  const from = from_perch ? seated(a, from_perch) : wall(a, out);
  const to = to_perch ? seated(b, to_perch) : wall(b, into);
  const [d, cx, cy] = getSmoothStepPath({
    sourceX: from.x, sourceY: from.y, sourcePosition: out,
    targetX: to.x, targetY: to.y, targetPosition: into,
  });

  const data = edge.data;
  const forward = data?.dir === "forward" || data?.dir === "both"
               || data?.module === "directed";
  const back = data?.dir === "back" || data?.dir === "both";
  return `<g class="route ${data?.module ?? "line"}"><path d="${d}"`
    + (forward ? ` marker-end="url(#${key}-arrow)"` : ``)
    + (back ? ` marker-start="url(#${key}-arrow)"` : ``) + ` />`
    + (edge.label
        ? `<text x="${round(cx)}" y="${round(cy - 4)}" text-anchor="middle">`
          + `${esc(String(edge.label))}</text>`
        : ``)
    + `</g>`;
}

/** How a side names itself to the path function. */
const FACE: Record<Side, Position> = {
  top: Position.Top, right: Position.Right,
  bottom: Position.Bottom, left: Position.Left,
};

/** The middle of the seat a perch sits on. */
function seated(b: At, perch: Perch): { x: number; y: number } {
  const r = at_seat(b, perch);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** The middle of one wall of a box. */
function wall(b: At, side: Position): { x: number; y: number } {
  if (side === Position.Left) return { x: b.x, y: b.y + b.h / 2 };
  if (side === Position.Right) return { x: b.x + b.w, y: b.y + b.h / 2 };
  if (side === Position.Top) return { x: b.x + b.w / 2, y: b.y };
  return { x: b.x + b.w / 2, y: b.y + b.h };
}

type At = { x: number; y: number; w: number; h: number };

/** Placements are fractional, and a file that is diffed is read by a person, so
 *  a coordinate is written to the tenth rather than to the sixteenth. */
function round(n: number): string {
  return String(Math.round(n * 10) / 10);
}

/** **Braces are escaped along with the markup characters.** They mean nothing
 *  in SVG and everything in MDX, where a `{` opens an expression — so a label
 *  carrying one would break the page holding the drawing rather than the
 *  drawing. A reference costs nothing anywhere else, and reads as the brace. */
function esc(text: string): string {
  return text.replace(/[<>&"'{}]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
       "{": "&#123;", "}": "&#125;" })[c]!);
}
