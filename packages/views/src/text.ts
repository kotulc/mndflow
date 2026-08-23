/** A Scene as text.
 *
 *  The second renderer, and the one that makes a notation testable with no
 *  browser in the process: a regression is a diff rather than a screenshot.
 *  It draws **shape, not coordinates** — a grid coarse enough that nudging a
 *  card by a cell does not rewrite the expectation. */

import type { Scene } from "./scene";

const CELL = 24;

/** The whole scene, as a block of characters. */
export function draw(scene: Scene): string {
  if (scene.boxes.length === 0) return "(empty)";

  const left = Math.min(...scene.boxes.map((b) => b.x));
  const top = Math.min(...scene.boxes.map((b) => b.y));
  const right = Math.max(...scene.boxes.map((b) => b.x + b.w));
  const bottom = Math.max(...scene.boxes.map((b) => b.y + b.h));

  const cols = Math.ceil((right - left) / CELL) + 1;
  const rows = Math.ceil((bottom - top) / CELL) + 1;
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(" "));

  const put = (x: number, y: number, text: string) => {
    const row = grid[y];
    if (!row) return;
    for (let i = 0; i < text.length && x + i < cols; i++) row[x + i] = text[i]!;
  };

  for (const r of scene.routes) {
    for (const p of r.points) {
      const x = Math.round((p.x - left) / CELL);
      const y = Math.round((p.y - top) / CELL);
      if (grid[y]?.[x] === " ") put(x, y, r.module === "directed" ? "+" : ".");
    }
  }

  for (const b of scene.boxes) {
    /** A lifeline is two pixels wide and would draw as an empty card. What it
     *  hangs is what there is to read. */
    if (b.marks.includes("lifeline")) continue;
    const x = Math.round((b.x - left) / CELL);
    const y = Math.round((b.y - top) / CELL);
    const w = Math.max(3, Math.round(b.w / CELL));
    const lane = b.marks.includes("group") || b.marks.includes("lane");
    const open = lane ? "(" : b.marks.includes("reference") ? "<" : "[";
    const close = lane ? ")" : b.marks.includes("reference") ? ">" : "]";
    const room = w - 2;
    const label = b.label.length > room ? b.label.slice(0, Math.max(0, room - 1)) + "…" : b.label;
    put(x, y, open + label.padEnd(room, " ") + close);
  }

  return grid.map((row) => row.join("").replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
}

/** What the scene holds, as a list. Easier to read than a drawing when what is
 *  being checked is composition rather than placement. */
export function outline(scene: Scene): string {
  const lines: string[] = [];
  lines.push(scene.trail.map((t) => t.label).join(" / ") || "(root)");
  for (const b of scene.boxes) {
    const marks = b.marks.length ? `  ${b.marks.join(" ")}` : "";
    lines.push(`  ${b.label}${marks}`);
  }
  for (const r of scene.routes) {
    const arrow = r.module === "directed" ? "-->" : "---";
    lines.push(`  ${r.from} ${arrow} ${r.to}${r.label ? ` (${r.label})` : ""}`);
  }
  return lines.join("\n");
}
