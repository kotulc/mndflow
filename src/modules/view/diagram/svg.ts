/** Minimal SVG of the current layer — a renderer that is not React Flow.
 *
 *  Geometry comes from `stageOf` / `laidOf`, the same composition the canvas
 *  hosts on top of. This half writes plain SVG so a commit can sit a picture
 *  beside the JSON source without dragging the React Flow tree into export.
 *  The page's project export downloads that markup beside the `.mndflow.json`
 *  (store.downloadSvg); this module only renders. */

import { axisOf, nameOf } from "../../../graph/fold";
import type { Graph } from "../../../graph/types";
import { stageOf, laidOf, type Stage } from "./compose";

/** Default stage size when the host has no viewport to measure. Large enough
 *  that a framed layer still gets a frame; the SVG viewBox crops to content. */
const STAGE = { w: 1200, h: 800 };

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
export function svgOf(graph: Graph, layer: string | null): string {
  const stage = stageOf(graph, layer, STAGE);
  const axis = axisOf(graph, layer);
  const laid = laidOf(graph, stage, layer, axis, false, () => true);
  const box = boundsOf(stage, Object.values(laid.runs));

  const parts: string[] = [];

  if (stage.frameBox && layer) {
    const f = stage.frameBox;
    parts.push(
      `<rect data-kind="frame" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" ` +
      `fill="none" stroke="#2f4a3e" stroke-width="1.5"/>`,
    );
  }

  for (const { attr, box: b } of stage.bands) {
    parts.push(
      `<rect data-kind="group" data-id="${esc(attr.id)}" x="${b.x}" y="${b.y}" ` +
      `width="${b.w}" height="${b.h}" fill="none" stroke="#5a7a6a" ` +
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
      `fill="#f4f7f5" stroke="#2f4a3e" stroke-width="1.25" rx="2"/>` +
      `<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2}" text-anchor="middle" ` +
      `dominant-baseline="middle" font-family="system-ui,sans-serif" ` +
      `font-size="12" fill="#1a2a22">${label}</text>` +
      `</g>`,
    );
  }

  for (const [id, run] of Object.entries(laid.runs)) {
    parts.push(
      `<polyline data-kind="edge" data-id="${esc(id)}" fill="none" ` +
      `stroke="#2f4a3e" stroke-width="1.5" points="${pointsOf(run)}"/>`,
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
