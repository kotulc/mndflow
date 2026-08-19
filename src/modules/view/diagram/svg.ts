/** Minimal SVG of the current layer — a renderer that is not React Flow.
 *
 *  Geometry comes from `stageOf` / `laidOf`, the same composition the canvas
 *  hosts on top of. This half writes plain SVG so a commit can sit a picture
 *  beside the JSON source without dragging the React Flow tree into export.
 *  The page's project export downloads that markup beside the `.mndflow.json`
 *  (store.downloadSvg); this module only renders.
 *
 *  **A file has no page to read a variable from**, so every colour here is
 *  inlined. It is still not a second palette: {@link lookNow} resolves the
 *  page's own ramp and hands it over, so what leaves in the file is what was
 *  on the screen. Called without one — a test, a build step, anything with no
 *  document — it falls back to {@link PAPER}, a light look that reads on a
 *  white page, which is what an SVG dropped into a document is for. */

import { axisOf, nameOf } from "../../../graph/fold";
import type { Graph } from "../../../graph/types";
import { stageOf, laidOf, type Stage } from "./compose";

/** Default stage size when the host has no viewport to measure. Large enough
 *  that a framed layer still gets a frame; the SVG viewBox crops to content. */
const STAGE = { w: 1200, h: 800 };

/** The concrete colours one exported file is drawn in. Six, because that is
 *  every distinct thing this renderer draws. */
export type Look = {
  frame: string;
  band: string;
  fill: string;
  stroke: string;
  ink: string;
  route: string;
};

/** Which ramp name each part of the drawing takes, so a look read off the page
 *  cannot drift from what the canvas showed. */
const FROM: Record<keyof Look, string> = {
  frame: "--wall",
  band: "--s-muted-line",
  fill: "--card-fill",
  stroke: "--border",
  ink: "--text",
  route: "--route",
};

/** The fallback for a caller with no page — a light look that reads on paper.
 *  Kept concrete on purpose: an SVG opened on its own has no theme. */
export const PAPER: Look = {
  frame: "#2f4a3e",
  band: "#5a7a6a",
  fill: "#f4f7f5",
  stroke: "#2f4a3e",
  ink: "#1a2a22",
  route: "#2f4a3e",
};

/** The look currently on the page, resolved to concrete colours.
 *
 *  The only DOM this module touches, and the reason the export follows the
 *  theme rather than stamping one: the ramp stays `styles.css`'s alone, and
 *  this reads what it came to. Falls back to {@link PAPER} wherever there is
 *  no document, or where a name resolved to nothing. */
export function lookNow(): Look {
  if (typeof document === "undefined") return PAPER;

  // **Through a probe, not off the root.** A custom property's value comes back
  // as it was authored — `oklch(L calc(C * .55) H)` — and a file another tool
  // opens should not have to do the arithmetic. Setting it as a real `color`
  // and reading that back gives the used value, flat.
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);

  const out = { ...PAPER };
  try {
    for (const [part, name] of Object.entries(FROM) as [keyof Look, string][]) {
      probe.style.color = "";
      probe.style.color = `var(${name})`;
      const used = getComputedStyle(probe).color.trim();
      if (used) out[part] = used;
    }
  } finally {
    probe.remove();
  }

  return out;
}

/** Escape text that lands inside an SVG attribute or element. */
function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Bounding box of everything drawn, with a little padding. */
function boundsOf(stage: Stage, runs: { points: { x: number; y: number }[] }[]): {
  x: number; y: number; w: number; h: number;
} {
  const pts: { x: number; y: number }[] = [];

  for (const box of Object.values(stage.boxes)) {
    pts.push({ x: box.x, y: box.y }, { x: box.x + box.w, y: box.y + box.h });
  }
  if (stage.frameBox) {
    const f = stage.frameBox;
    pts.push({ x: f.x, y: f.y }, { x: f.x + f.w, y: f.y + f.h });
  }
  for (const run of runs) {
    for (const p of run.points) pts.push(p);
  }

  if (!pts.length) return { x: 0, y: 0, w: 1, h: 1 };

  let x0 = pts[0].x, y0 = pts[0].y, x1 = pts[0].x, y1 = pts[0].y;
  for (const p of pts) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }

  const pad = 16;
  return { x: x0 - pad, y: y0 - pad, w: Math.max(1, x1 - x0 + pad * 2), h: Math.max(1, y1 - y0 + pad * 2) };
}

/** Polyline points attribute from a run. */
function pointsOf(run: { points: { x: number; y: number }[] }): string {
  return run.points.map((p) => `${p.x},${p.y}`).join(" ");
}

/** SVG markup for one open layer — cards, frame, and relationship runs. */
export function svgOf(graph: Graph, layer: string | null, look: Look = PAPER): string {
  const stage = stageOf(graph, layer, STAGE);
  const axis = axisOf(graph, layer);
  const laid = laidOf(graph, stage, layer, axis, false, () => true);
  const box = boundsOf(stage, Object.values(laid.runs));

  const parts: string[] = [];

  if (stage.frameBox && layer) {
    const f = stage.frameBox;
    parts.push(
      `<rect data-kind="frame" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" ` +
      `fill="none" stroke="${look.frame}" stroke-width="1.5"/>`,
    );
  }

  for (const { attr, box: b } of stage.bands) {
    parts.push(
      `<rect data-kind="group" data-id="${esc(attr.id)}" x="${b.x}" y="${b.y}" ` +
      `width="${b.w}" height="${b.h}" fill="none" stroke="${look.band}" ` +
      `stroke-width="1" stroke-dasharray="4 3"/>`,
    );
  }

  for (const node of stage.members) {
    const b = stage.boxes[node.id];
    if (!b) continue;
    const label = esc(nameOf(graph, node) || "·");
    parts.push(
      `<g data-kind="card" data-id="${esc(node.id)}">` +
      `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" ` +
      `fill="${look.fill}" stroke="${look.stroke}" stroke-width="1.25" rx="2"/>` +
      `<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2}" text-anchor="middle" ` +
      `dominant-baseline="middle" font-family="system-ui,sans-serif" ` +
      `font-size="12" fill="${look.ink}">${label}</text>` +
      `</g>`,
    );
  }

  for (const [id, run] of Object.entries(laid.runs)) {
    parts.push(
      `<polyline data-kind="edge" data-id="${esc(id)}" fill="none" ` +
      `stroke="${look.route}" stroke-width="1.5" points="${pointsOf(run)}"/>`,
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" ` +
    `viewBox="${box.x} ${box.y} ${box.w} ${box.h}" ` +
    `width="${box.w}" height="${box.h}">` +
    parts.join("") +
    `</svg>`
  );
}
