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

import type { Box, Route, Scene } from "./scene";

/** How the drawing is dressed. Every one of these has a default that works. */
export type Paper = {
  /** The accessible name. Defaults to what the layer is called. */
  title?: string;
  /** Replaces the default stylesheet outright. */
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
 *  — never as a second palette to pick from. */
const SHEET = `
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
svg.scene .card.derived text { fill: var(--dim); font-style: italic; }
svg.scene .card.interface rect {
  fill: var(--bg, var(--ground)); stroke: var(--stroke); stroke-width: 1.5;
}
svg.scene .card.interface.in rect { fill: var(--lead); }
svg.scene .card.interface.out rect { fill: none; }
svg.scene .card.interface.in.out rect { fill: var(--lead-fill); }
svg.scene .card.lane rect {
  fill: var(--faint-fill); fill-opacity: 0.25; stroke: var(--faint-line);
}
svg.scene .card.lane text { fill: var(--faint); }
svg.scene .card.lifeline rect { fill: var(--stroke); fill-opacity: 0.45; stroke: none; }
svg.scene .card.control rect,
svg.scene .card.control polygon { fill: var(--lead); stroke: var(--lead); }
svg.scene .card.control.decision polygon,
svg.scene .card.control.merge polygon { fill: var(--bg, var(--ground)); stroke-width: 1.5; }
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
  const w = Math.max(scene.bounds.w, 200) + pad * 2;
  const h = Math.max(scene.bounds.h, 200) + pad * 2;
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

  for (const r of scene.routes) parts.push(line(r, key));
  scene.boxes.forEach((b, n) => parts.push(card(b, `${key}-clip-${n}`)));

  parts.push(`</svg>`);
  return parts.join("\n") + "\n";
}

/** One card. A box that names a link is **wrapped** rather than drawn
 *  differently: where it points is not a look. */
function card(box: Box, clip: string): string {
  const shape = box.marks.includes("decision") || box.marks.includes("merge")
    ? `<polygon points="${diamond(box)}" />`
    : `<rect x="${round(box.x)}" y="${round(box.y)}"`
      + ` width="${round(box.w)}" height="${round(box.h)}" rx="3" />`;
  const drawn = `<g class="${["card", ...box.marks].join(" ")}"`
    + (box.def ? ` data-def="${esc(box.def)}"` : "") + `>`
    + shape + `<title>${esc(box.label)}</title>`
    + (box.on ? `` : label(box, clip)) + `</g>`;
  return box.link ? `<a href="${esc(box.link)}">${drawn}</a>` : drawn;
}

/** A name too long for its card is clipped, and a turned one reads up the box —
 *  the same two rules the React renderer draws by. */
function label(box: Box, clip: string): string {
  if (!box.label) return ``;
  const turned = box.marks.includes("turned");
  const x = box.x + box.w / 2;
  const y = turned ? box.y + box.h - 6
          : box.marks.includes("lane") ? box.y + 14 : box.y + box.h / 2;
  const spin = turned ? ` transform="rotate(-90 ${round(x)} ${round(y)})"` : ``;
  const cut = turned ? `` : ` clip-path="url(#${clip})"`;
  return `<clipPath id="${clip}"><rect x="${round(box.x)}" y="${round(box.y)}"`
    + ` width="${round(box.w)}" height="${round(box.h)}" /></clipPath>`
    + `<text x="${round(x)}" y="${round(y)}" dominant-baseline="central"`
    + ` text-anchor="${turned ? "start" : "middle"}"${spin}${cut}>${esc(box.label)}</text>`;
}

function line(route: Route, key: string): string {
  const d = route.points.map((p, i) => `${i ? "L" : "M"} ${round(p.x)} ${round(p.y)}`).join(" ");
  const forward = route.dir === "forward" || route.dir === "both" || route.module === "directed";
  const back = route.dir === "back" || route.dir === "both";
  const at = route.points[Math.floor(route.points.length / 2)] ?? { x: 0, y: 0 };
  return `<g class="route ${route.module}"><path d="${d}"`
    + (forward ? ` marker-end="url(#${key}-arrow)"` : ``)
    + (back ? ` marker-start="url(#${key}-arrow)"` : ``) + ` />`
    + (route.label
        ? `<text x="${round(at.x)}" y="${round(at.y - 4)}" text-anchor="middle">`
          + `${esc(route.label)}</text>`
        : ``)
    + `</g>`;
}

/** A decision and a merge are the one pair of controls that is not a bar. */
function diamond(b: Box): string {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  return `${round(cx)},${round(b.y)} ${round(b.x + b.w)},${round(cy)} `
       + `${round(cx)},${round(b.y + b.h)} ${round(b.x)},${round(cy)}`;
}

/** Placements are fractional, and a file that is diffed is read by a person, so
 *  a coordinate is written to the tenth rather than to the sixteenth. */
function round(n: number): string {
  return String(Math.round(n * 10) / 10);
}

function esc(text: string): string {
  return text.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}
