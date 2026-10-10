/** Routing round cards, by libavoid: an experiment beside `route`. A scene's lines are routed at
 *  once, square, round every card they do not end on, with the fewest bends, parallel runs
 *  nudged apart. Where an end meets its card and which way it leaves stay ours: a pin at the
 *  seat, facing out of its face. Ties stay straight. */

import { AvoidLib } from "libavoid-js";
import { end_of } from "./ends";
import type { Id } from "@mnd/core";
import { box_of, type Scene } from "./scene";
import { SEAT } from "./size";

type Point = { x: number; y: number };

/** libavoid, once loaded; until then every line routes as `route` draws it. */
let avoid: any = null;

/** Which way a pin lets a line leave, by the face it sits on. */
const DIRS: Record<string, number> = { top: 1, bottom: 2, left: 4, right: 8 };

/** What a line goes round: cards and notes, never a box drawn round others. */
const SOLID = new Set(["card", "note"]);

/** How far a drawn end may lie from where it was routed and still be the same end: half a unit. */
const SAME = SEAT;

/** How far off square a leg may be and still count as square: a handle measured to a fraction. */
const SQUARE = 1.5;


/** Loads libavoid from its wasm, once. */
export async function load_avoid(wasm: string): Promise<void> {
  await AvoidLib.load(wasm);
  avoid = AvoidLib.getInstance();
}

/** The run libavoid routes for each line of a scene, as drawn — its nodes where they stand and its
 *  room as the stage hangs it. None until libavoid is loaded. */
export function routes_of(scene: Scene): ReadonlyMap<Id, Point[]> {
  if (!avoid) return new Map();
  const A = avoid;
  const router = new A.Router(A.RouterFlag.OrthogonalRouting.value);
  router.setRoutingParameter(A.RoutingParameter.shapeBufferDistance, SEAT);
  router.setRoutingParameter(A.RoutingParameter.idealNudgingDistance, SEAT);
  router.setRoutingParameter(A.RoutingParameter.segmentPenalty, 50);
  router.setRoutingOption(A.RoutingOption.nudgeOrthogonalSegmentsConnectedToShapes, false);
  router.setRoutingOption(A.RoutingOption.nudgeSharedPathsWithCommonEndPoint, false);

  /** Every card a shape; what is not one gets a speck where its line ends. */
  const shapes = new Map<string, { ref: unknown; x: number; y: number }>();
  const shape = (x: number, y: number, w: number, h: number) =>
    new A.ShapeRef(router, new A.Rectangle(new A.Point(x, y), new A.Point(x + w, y + h)));
  for (const n of scene.nodes.filter((n) => SOLID.has(n.type ?? ""))) {
    const b = box_of(n);
    shapes.set(n.id, { ref: shape(b.x, b.y, b.w, b.h), x: b.x, y: b.y });
  }

  /** An end: a pin at its seat, facing out of its face, shared by every line meeting it there —
   *  libavoid ignores a second pin on the same spot. */
  const pins = new Map<string, { ref: unknown; pin: number }>();
  const end_at = (id: string, at: Point, face: string) => {
    const key = `${id}|${Math.round(at.x)},${Math.round(at.y)}|${face}`;
    if (!pins.has(key)) {
      const on = shapes.get(id) ?? { ref: shape(at.x - 1, at.y - 1, 2, 2), x: at.x - 1, y: at.y - 1 };
      const pin = pins.size + 1;
      const p = new A.ShapeConnectionPin(on.ref, pin, at.x - on.x, at.y - on.y, false, 0, DIRS[face]);
      p.setExclusive(false);
      pins.set(key, { ref: on.ref, pin });
    }
    const { ref, pin } = pins.get(key)!;
    return new A.ConnEnd(ref, pin);
  };

  const conns = new Map<string, any>();
  for (const e of scene.edges) {
    if (e.hidden || e.data?.module === "tie") continue;
    const a = end_of(e, "from", scene.nodes, scene.perches, scene.frame);
    const b = end_of(e, "to", scene.nodes, scene.perches, scene.frame);
    if (!a || !b) continue;
    conns.set(e.id, new A.ConnRef(router, end_at(e.source, a, a.face), end_at(e.target, b, b.face)));
  }
  router.processTransaction();

  const runs = new Map<string, Point[]>();
  for (const [id, conn] of conns) {
    const line = conn.displayRoute();
    const run: Point[] = [];
    for (let i = 0; i < line.size(); i++) run.push({ x: line.at(i).x, y: line.at(i).y });
    runs.set(id, run);
  }
  router.delete();
  return runs;
}

/** The run libavoid gave, its ends moved onto the ends as drawn, where they lie within half a unit
 *  — a handle measured a few pixels off — and every leg is still square. Else none. */
export function avoided_run(run: readonly Point[] | undefined, from: Point,
                            to: Point): Point[] | null {
  if (!run || run.length < 2) return null;
  const meets = (p: Point, q: Point) => Math.abs(p.x - q.x) < SAME && Math.abs(p.y - q.y) < SAME;
  if (!meets(run[0]!, from) || !meets(run[run.length - 1]!, to)) return null;
  const out = run.map((p) => ({ ...p }));
  /** An end moved, the leg it starts keeps square: its next corner follows it across. */
  const move = (end: number, next: number, at: Point) => {
    const p = out[end]!;
    const n = out[next];
    if (n && out.length > 2) {
      if (n.y === p.y) n.y = at.y;
      else if (n.x === p.x) n.x = at.x;
    }
    out[end] = { ...at };
  };
  move(0, 1, from);
  move(out.length - 1, out.length - 2, to);
  const square = out.slice(1).every((q, i) =>
    Math.abs(q.x - out[i]!.x) < SQUARE || Math.abs(q.y - out[i]!.y) < SQUARE);
  return square ? out : null;
}
