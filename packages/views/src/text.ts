/** A Scene as text.
 *
 *  The second renderer, and the one that makes a notation testable with no
 *  browser in the process: a regression is a diff rather than a screenshot.
 *  It draws **shape, not coordinates** — a grid coarse enough that nudging a
 *  card by a cell does not rewrite the expectation. */

import { box_of, type Scene } from "./scene";

const CELL = 24;

/** The whole scene, as a block of characters. */
export function draw(scene: Scene): string {
  if (scene.nodes.length === 0) return "(empty)";

  const at = scene.nodes.map((n) => ({ ...box_of(n), data: n.data }));
  const left = Math.min(...at.map((b) => b.x));
  const top = Math.min(...at.map((b) => b.y));
  const right = Math.max(...at.map((b) => b.x + b.w));
  const bottom = Math.max(...at.map((b) => b.y + b.h));

  const cols = Math.ceil((right - left) / CELL) + 1;
  const rows = Math.ceil((bottom - top) / CELL) + 1;
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill(" "));

  const put = (x: number, y: number, text: string) => {
    const row = grid[y];
    if (!row) return;
    for (let i = 0; i < text.length && x + i < cols; i++) row[x + i] = text[i]!;
  };

  /** **A straight run between the two ends**, which is all a grid this coarse
   *  could show anyway — where a line actually bends is the renderer's, and a
   *  drawing of shape rather than coordinates never depended on it. */
  const where = new Map(at.map((b, i) => [scene.nodes[i]!.id, b]));
  for (const e of scene.edges) {
    const a = where.get(e.source);
    const b = where.get(e.target);
    if (!a || !b) continue;
    const from = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
    const to = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) / CELL;
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      const x = Math.round((from.x + (to.x - from.x) * t - left) / CELL);
      const y = Math.round((from.y + (to.y - from.y) * t - top) / CELL);
      if (grid[y]?.[x] === " ") put(x, y, e.data?.module === "directed" ? "+" : ".");
    }
  }

  for (const b of at) {
    const x = Math.round((b.x - left) / CELL);
    const y = Math.round((b.y - top) / CELL);
    const w = Math.max(3, Math.round(b.w / CELL));
    const band = b.data.marks.includes("group");
    const open = band ? "(" : b.data.marks.includes("reference") ? "<" : "[";
    const close = band ? ")" : b.data.marks.includes("reference") ? ">" : "]";
    const room = w - 2;
    const name = b.data.label;
    const label = name.length > room ? name.slice(0, Math.max(0, room - 1)) + "…" : name;
    put(x, y, open + label.padEnd(room, " ") + close);
  }

  /** **A grid draws its lattice**, so a text drawing shows the shape the model
   *  is in and not only what is in it. A header reads `=` and every other cell
   *  `-`; a merged cell is one wide rule like any other. Drawn last and only
   *  into blank ground, because a rule must never sit on a name. */
  for (const b of at) {
    for (const c of b.data.grid ?? []) {
      const x = Math.round((b.x + c.x - left) / CELL);
      const y = Math.round((b.y + c.y - top) / CELL);
      const mark = c.marks.includes("header") ? "=" : "-";
      for (let i = 0; i < Math.max(2, Math.round(c.w / CELL)); i++) {
        if (grid[y]?.[x + i] === " ") put(x + i, y, mark);
      }
    }
  }

  return grid.map((row) => row.join("").replace(/\s+$/, "")).join("\n").replace(/\n+$/, "");
}

/** What the scene holds, as a list. Easier to read than a drawing when what is
 *  being checked is composition rather than placement. */
export function outline(scene: Scene): string {
  const lines: string[] = [];
  lines.push(scene.trail.map((t) => t.label).join(" / ") || "(root)");
  for (const n of scene.nodes) {
    const marks = n.data.marks.length ? `  ${n.data.marks.join(" ")}` : "";
    lines.push(`  ${n.data.label}${marks}`);
  }
  for (const e of scene.edges) {
    const arrow = e.data?.module === "directed" ? "-->" : "---";
    lines.push(`  ${e.source} ${arrow} ${e.target}${e.label ? ` (${e.label})` : ""}`);
  }
  return lines.join("\n");
}
