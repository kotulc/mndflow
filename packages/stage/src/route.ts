/** Where a line runs between two borders.
 *
 *  **A search over the lanes a layer leaves, not a handful of guesses.**
 *
 *  The library's step router knows the two ends and nothing else, and the six
 *  shapes this used to try knew only the two end boxes — so a run between two
 *  cards went straight through whatever stood between them. On a busy layer
 *  that was most of them.
 *
 *  What replaces it is the standard answer to this problem. **Only a handful of
 *  lines matter**: a run that has to get round a box turns just clear of one of
 *  its edges, so the candidate turning points are the obstacle edges plus a
 *  margin, in both axes, and nowhere else. That grid is a few hundred points
 *  for a layer of thirty cards, and the cheapest path across it — counting a
 *  corner as worth a good stretch of line — is the run somebody would have
 *  drawn: few bends, no detours, and never through a card.
 *
 *  **Fewest corners first, then shortest.** A corner costs `TURN` pixels of
 *  run, so a route trades a corner for anything shorter than that and takes the
 *  straight lane otherwise. */

import { Position } from "@xyflow/react";
import { GAP } from "@mnd/views";

export type Rect = { x: number; y: number; w: number; h: number };
type Point = { x: number; y: number };

/** How far a line runs straight out of a border before it may turn. Wider than
 *  the border band, so the first turn is always clear of the card. */
export const STUB = 16;

/** Clear space kept between a run and a box it goes round. **The gap the
 *  layout leaves**, so a lane between two things is a lane a line can take. */
const MARGIN = GAP;

/** Which way a run sets off from each face. */
const AWAY: Record<string, Point> = {
  [Position.Left]: { x: -1, y: 0 },
  [Position.Right]: { x: 1, y: 0 },
  [Position.Top]: { x: 0, y: -1 },
  [Position.Bottom]: { x: 0, y: 1 },
};

/** The corners of a run, in order. Both ends leave square to their border. */
export function route(from: Point, out: Position, to: Point, into: Position,
                      clear: readonly Rect[]): Point[] {
  const a = step(from, out);
  const b = step(to, into);
  return tidy([from, ...shortest(a, b, out, into, clear), to]);
}

function step(at: Point, face: Position): Point {
  const d = AWAY[face] ?? AWAY[Position.Right]!;
  return { x: at.x + d.x * STUB, y: at.y + d.y * STUB };
}

/** What a corner costs, as a length of run it is worth going out of the way to
 *  avoid. **Two cells' worth**: a route takes a detour over a bend up to about
 *  that far, which is what keeps a run from stepping round every card it passes
 *  and from jogging when a lane a little further off would be straight. */
const TURN = 60;

type Way = 0 | 1 | 2 | 3;
const WAYS: Point[] = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

/** Which way a face sends a run: out of the border, square to it. */
function way_of(face: Position): Way {
  const d = AWAY[face] ?? AWAY[Position.Right]!;
  return WAYS.findIndex((w) => w.x === d.x && w.y === d.y) as Way;
}

/** The same way, back again. The pairs are laid out so this is one bit. */
function back(w: Way): Way {
  return (w ^ 1) as Way;
}

/** The lines a turn may happen on.
 *
 *  **Just clear of every box, in both axes, plus the two ends' own lines.** A
 *  run turning anywhere else could turn on one of these instead and be no
 *  longer for it, so this is the whole of the search and it is small. */
function lanes(a: Point, b: Point, clear: readonly Rect[]) {
  const xs = new Set<number>([a.x, b.x]);
  const ys = new Set<number>([a.y, b.y]);
  for (const r of clear) {
    xs.add(r.x - MARGIN);
    xs.add(r.x + r.w + MARGIN);
    ys.add(r.y - MARGIN);
    ys.add(r.y + r.h + MARGIN);
  }
  /** **A lane outside everything, on all four sides.**
   *
   *  A stub can be the outermost line there is — an interface in the top wall
   *  of the topmost card is one — and a run has to reach it from beyond it, or
   *  there is no way to come at that border square. Without somewhere out
   *  there to turn, the search could not satisfy the way in at all: it found
   *  nothing, fell back to an elbow, and an elbow is the one answer that goes
   *  through whatever is in the way. Which is exactly what it did. */
  const out = (set: Set<number>) => {
    const all = [...set];
    set.add(Math.min(...all) - STUB * 2);
    set.add(Math.max(...all) + STUB * 2);
  };
  out(xs);
  out(ys);
  return { xs: [...xs].sort((p, q) => p - q), ys: [...ys].sort((p, q) => p - q) };
}

/** The cheapest run between the two stubs that stays out of every box.
 *
 *  Dijkstra over the lane crossings, with the way the run is travelling as part
 *  of where it is — which is what lets a corner be paid for. It leaves by the
 *  face it was given and arrives facing the border it lands on, so neither end
 *  turns on the spot. */
function shortest(a: Point, b: Point, out: Position, into: Position,
                  clear: readonly Rect[]): Point[] {
  const { xs, ys } = lanes(a, b, clear);
  const ax = xs.indexOf(a.x);
  const ay = ys.indexOf(a.y);
  const bx = xs.indexOf(b.x);
  const by = ys.indexOf(b.y);
  if (ax < 0 || ay < 0 || bx < 0 || by < 0) return [a, { x: b.x, y: a.y }, b];

  const at = (ix: number, iy: number): Point => ({ x: xs[ix]!, y: ys[iy]! });
  const key = (ix: number, iy: number, w: Way) => (iy * xs.length + ix) * 4 + w;
  const best = new Map<number, number>();
  const came = new Map<number, number>();
  /** **The way *in*, which is the far face's own way turned round.** A face
   *  sends a run *out* of the border it belongs to; the last leg travels the
   *  other way, into it. Asked for the face's own way, the search had to reach
   *  the far stub travelling away from the card it was about to enter — so it
   *  came at it sideways and the run met the border at a corner instead of
   *  square to it. */
  const arrive = back(way_of(into));
  const start = key(ax, ay, way_of(out));
  const queue: { k: number; ix: number; iy: number; w: Way; cost: number }[] =
    [{ k: start, ix: ax, iy: ay, w: way_of(out), cost: 0 }];
  best.set(start, 0);
  let done: number | null = null;

  while (queue.length) {
    /** A layer's lanes are a few hundred points, so scanning for the cheapest
     *  beats keeping a heap in step with it. */
    let n = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i]!.cost < queue[n]!.cost) n = i;
    const here = queue.splice(n, 1)[0]!;
    if (best.get(here.k)! < here.cost) continue;
    if (here.ix === bx && here.iy === by && here.w === arrive) { done = here.k; break; }

    for (let w = 0 as Way; w < 4; w = (w + 1) as Way) {
      const step = WAYS[w]!;
      const ix = here.ix + step.x;
      const iy = here.iy + step.y;
      if (ix < 0 || iy < 0 || ix >= xs.length || iy >= ys.length) continue;
      const from = at(here.ix, here.iy);
      const to = at(ix, iy);
      if (blocked(from, to, clear)) continue;
      const cost = here.cost + Math.abs(to.x - from.x) + Math.abs(to.y - from.y)
                 + (w === here.w ? 0 : TURN);
      const k = key(ix, iy, w);
      if (cost >= (best.get(k) ?? Infinity)) continue;
      best.set(k, cost);
      came.set(k, here.k);
      queue.push({ k, ix, iy, w, cost });
    }
  }

  /** Nothing got through — every lane out of one end is walled. An elbow is
   *  wrong, but it is drawn and it says where the two ends are. */
  if (done === null) return [a, { x: b.x, y: a.y }, b];

  const run: Point[] = [];
  for (let k: number | undefined = done; k !== undefined; k = came.get(k)) {
    const cell = (k - (k % 4)) / 4;
    run.push(at(cell % xs.length, Math.floor(cell / xs.length)));
  }
  return run.reverse();
}

/** Whether one leg passes through a box. */
function blocked(p: Point, q: Point, clear: readonly Rect[]): boolean {
  const lo = { x: Math.min(p.x, q.x), y: Math.min(p.y, q.y) };
  const hi = { x: Math.max(p.x, q.x), y: Math.max(p.y, q.y) };
  for (const r of clear) {
    if (lo.x < r.x + r.w - 0.5 && hi.x > r.x + 0.5
     && lo.y < r.y + r.h - 0.5 && hi.y > r.y + 0.5) return true;
  }
  return false;
}

/** The same run without the points that turn nothing. */
function tidy(run: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of run) {
    const last = out[out.length - 1];
    if (last && last.x === p.x && last.y === p.y) continue;
    const before = out[out.length - 2];
    if (before && last
        && ((before.x === last.x && last.x === p.x)
         || (before.y === last.y && last.y === p.y))) out.pop();
    out.push(p);
  }
  return out;
}

/** The run as a path, with its corners rounded. */
export function drawn(run: readonly Point[], bend: number): string {
  if (run.length < 2) return "";
  let d = `M${run[0]!.x},${run[0]!.y}`;
  for (let i = 1; i < run.length - 1; i++) {
    const p = run[i - 1]!;
    const c = run[i]!;
    const n = run[i + 1]!;
    const r = Math.min(bend, len(p, c) / 2, len(c, n) / 2);
    d += ` L${toward(c, p, r).x},${toward(c, p, r).y}`;
    d += ` Q${c.x},${c.y} ${toward(c, n, r).x},${toward(c, n, r).y}`;
  }
  const end = run[run.length - 1]!;
  return `${d} L${end.x},${end.y}`;
}

const len = (a: Point, b: Point) => Math.abs(b.x - a.x) + Math.abs(b.y - a.y);

function toward(from: Point, to: Point, by: number): Point {
  const d = len(from, to) || 1;
  return { x: from.x + ((to.x - from.x) / d) * by,
           y: from.y + ((to.y - from.y) / d) * by };
}

/** Where a name sits on a run: the middle of its longest leg, so a label lands
 *  on a stretch of line rather than on a corner. */
export function middle_of(run: readonly Point[]): Point {
  let best = { at: { x: run[0]!.x, y: run[0]!.y }, span: -1 };
  for (let i = 1; i < run.length; i++) {
    const p = run[i - 1]!;
    const q = run[i]!;
    const span = len(p, q);
    if (span > best.span) best = { at: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }, span };
  }
  return best.at;
}
