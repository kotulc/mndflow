/** `infer` end to end through its real trigger.
 *
 *  The activity / state / sequence suites draw what `infer` produces over
 *  hand-built fixtures. This walk is the call site G.9b opened: explorer
 *  selection → offered `infer` → args the menu fills → folded → stage drawn.
 *  Properties of the path, never coordinates or minted ids. */

import { beforeEach, describe, expect, it } from "vitest";

import { offer } from "../../../src/actions/offer";
import { lookup, run, writes, type Context } from "../../../src/actions/index";
import "../../../src/actions/behavior";
import { blocksOf, fold } from "../../../src/graph/fold";
import {
  edge, element, refTo, step, type Graph, type Mutation,
} from "../../../src/graph/types";
import { DIM, stageOf } from "../../../src/modules/view/activity/index";

const STRUCT = "proj_struct";
const BEHAVE = "proj_behave";

function graph_of(...mutations: Mutation[]): Graph {
  return fold([step("", "test", mutations)]);
}

/** Explorer context — project in scope, layer open, nothing picked on the row. */
function explorer(graph: Graph, project = STRUCT): Context {
  return {
    graph,
    view: null,
    picked: null,
    project,
    open: { [project]: graph },
  };
}

/** Args the explorer menu fills for `infer` — selection refs and open graphs. */
function infer_args(chosen: string[], open: Record<string, Graph>, into?: string) {
  return {
    of: chosen,
    open,
    ...(into ? { into } : {}),
  };
}

beforeEach(() => {
  expect(lookup("infer")?.name).toBe("infer");
});

describe("infer through the explorer offer", () => {
  it("walks selection → offer → infer → drawn activity", () => {
    const pump = element("Pump", { parent: null, x: 0, y: 0 });
    const tank = element("Tank", { parent: null, x: 200, y: 0 });
    const structure = graph_of(
      { op: "add_element", element: pump },
      { op: "add_element", element: tank },
      {
        op: "link_elements",
        edge: edge(pump.id, tank.id, {
          form: "directed", dir: "forward",
        }),
      },
    );

    // Shift-click order in the explorer — click order must not matter later.
    const chosen = [refTo(tank.id, STRUCT), refTo(pump.id, STRUCT)];
    const ctx = explorer(structure);
    const open = { [STRUCT]: structure };

    // G.9b: with the explorer as context, `infer` is among what is offered.
    expect(offer(ctx).some((a) => a.name === "infer")).toBe(true);
    // The menu only takes it when the tree can fill `of` — a non-empty Chosen.
    expect(chosen.length).toBeGreaterThan(0);

    const done = run("infer", ctx, infer_args(chosen, open, BEHAVE));
    expect("refused" in done).toBe(false);
    if ("refused" in done) return;

    expect(writes(done)).toBe(true);
    expect(done.into).toBe(BEHAVE);
    expect(done.mutations.some((m) => m.op === "add_element")).toBe(true);
    expect(done.mutations.some((m) => m.op === "link_elements")).toBe(true);

    const drawn = fold([step("", "infer", done.mutations)]);
    const root = blocksOf(drawn, null).find((n) => n.form === "block");
    expect(root).toBeTruthy();

    const stage = stageOf(drawn, root!.id);

    // Drawn: actions with lanes back to the selection, inferred order dimmed.
    expect(stage.actions.length).toBeGreaterThan(0);
    expect(stage.lanes.length).toBeGreaterThan(0);
    expect(stage.lanes.every((lane) => chosen.includes(lane.ref))).toBe(true);
    expect(new Set(stage.lanes.map((lane) => lane.ref)).size)
      .toBe(stage.lanes.length);
    expect(stage.orders.length).toBeGreaterThan(0);
    expect(stage.orders.every((order) => order.inferred)).toBe(true);
    expect(stage.actions.some((action) => action.derived)).toBe(true);
    expect(stage.dim).toEqual(DIM);
    expect(DIM.opacity).toBeGreaterThan(0);
    expect(DIM.opacity).toBeLessThan(1);
  });
});
