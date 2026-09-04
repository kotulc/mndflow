/** Sample data, as **logs** rather than graphs.
 *
 *  Folding one is what exercises the engine, so the same files feed the CLI,
 *  every suite and every dev harness. One set of sample data, three consumers. */

import { seed } from "@mnd/defs";
import { ROOT, type Log, type Mutation, type Step } from "@mnd/core";

let n = 0;
const step = (action: string, mutations: Mutation[]): Step =>
  ({ id: `step_${String(++n).padStart(4, "0")}`, action, at: n, status: "applied", mutations });

/** `num` is fixed at creation and is what the explorer reads its order from, so
 *  a fixture counts per parent exactly as the create action does. */
let counts: Record<string, number> = {};
const block = (id: string, parent: string | null, label: string, type?: string): Mutation => {
  const key = parent ?? "";
  counts[key] = (counts[key] ?? 0) + 1;
  return { op: "add_block", block: { id, parent, label, type, num: counts[key] } };
};

const start = () => { n = 0; counts = {}; };

const link = (id: string, from: string, to: string,
              module: "line" | "directed" = "line"): Mutation =>
  ({ op: "link_blocks", edge: { id, from, to, module } });

/** The base package, through the same door as everything else. */
const base = (): Step => step("seed", seed());

/** The floor and nothing else: a workspace as it opens for the first time.
 *  What the question loop starts from, and what a fresh session folds to. */
export function blank(): Log {
  start();
  return [base()];
}

/** One project, three siblings, nothing else. The simplest thing that draws. */
export function flat(): Log {
  start();
  return [
    base(),
    step("create", [block("block_ledger", ROOT, "Ledger", "block")]),
    step("create", [block("block_edge", "block_ledger", "Edge", "block")]),
    step("create", [block("block_auth", "block_ledger", "Auth", "block")]),
    step("create", [block("block_billing", "block_ledger", "Billing", "block")]),
  ];
}

/** Two projects, one nested two deep, one folder. Exercises the tree. */
export function nested(): Log {
  start();
  return [
    base(),
    step("create", [block("block_shelf", ROOT, "Shelf", "folder")]),
    step("create", [block("block_ledger", "block_shelf", "Ledger", "block")]),
    step("create", [block("block_edge", "block_ledger", "Edge", "block")]),
    step("create", [block("block_rate", "block_edge", "Rate Limit", "block")]),
    step("create", [block("block_auth", "block_edge", "Auth", "block")]),
    step("create", [block("block_billing", "block_ledger", "Billing", "block")]),
    step("create", [block("block_site", ROOT, "Site", "block")]),
    step("create", [block("block_pages", "block_site", "Pages", "block")]),
  ];
}

/** A chain and a fan, with a note and a boundary. What routing is tested on. */
export function related(): Log {
  start();
  return [
    base(),
    step("create", [block("block_loop", ROOT, "Coolant Loop", "block")]),
    step("create", [block("block_pump", "block_loop", "Pump", "block")]),
    step("create", [block("block_hx", "block_loop", "Heat Exchanger", "block")]),
    step("create", [block("block_tank", "block_loop", "Reservoir", "block")]),
    step("create", [block("block_valve", "block_loop", "Valve", "block")]),
    step("relate", [link("edge_a", "block_pump", "block_hx", "directed")]),
    step("relate", [link("edge_b", "block_hx", "block_tank", "directed")]),
    step("relate", [link("edge_c", "block_tank", "block_pump", "directed")]),
    step("relate", [link("edge_d", "block_valve", "block_hx")]),
    step("note", [
      block("block_note", "block_loop", "", "note"),
      { op: "set_body", id: "block_note", body: "the loop runs clockwise" },
    ]),
    step("group", [
      block("block_hot", "block_loop", "Hot side", "group"),
      { op: "set_group", id: "block_hx", group: "block_hot" },
      { op: "set_group", id: "block_tank", group: "block_hot" },
    ]),
    step("arrange", [{ op: "set_arrangement", layer: "block_loop", arrangement: "right" }]),
  ];
}

/** Interfaces, seated and related through. What `seat` and `wall` are proven
 *  on: two ports on walls of their own, and one relationship running port to
 *  port rather than card to card. */
export function interfaced(): Log {
  start();
  return [
    base(),
    step("create", [block("block_loop", ROOT, "Coolant Loop", "block")]),
    step("create", [block("block_pump", "block_loop", "Pump", "block")]),
    step("create", [block("block_hx", "block_loop", "Heat Exchanger", "block")]),
    step("interface", [
      { op: "add_block", block: { id: "port_out", parent: "block_pump",
                                  side: "right", at: 0.5, flow: "out", num: 1 } },
      { op: "add_block", block: { id: "port_in", parent: "block_hx",
                                  side: "left", at: 0.5, flow: "in", num: 1 } },
    ]),
    step("relate", [link("edge_flow", "port_out", "port_in", "directed")]),
    step("relate", [link("edge_plain", "block_pump", "block_hx")]),
    step("arrange", [{ op: "set_arrangement", layer: "block_loop", arrangement: "right" }]),
  ];
}

/** A grid, with a block in each row header and a flow across each lane.
 *
 *  **Swimlanes, and they cost no code of their own.** A group with an extent,
 *  a block in every cell of column 0, and the rest of each row read left to
 *  right — every one of which is an ordinary block placed by an ordinary
 *  address. What makes it a swimlane is where the blocks are. */
export function gridded(): Log {
  start();
  const seat = (id: string, r: number, c: number): Mutation =>
    ({ op: "seat_cell", id, cell: { r, c } });
  const joins = (id: string): Mutation => ({ op: "set_group", id, group: "block_lanes" });
  const named: [string, string][] = [
    ["block_alice", "Alice"], ["block_bob", "Bob"],
    ["block_draft", "Draft"], ["block_review", "Review"], ["block_ship", "Ship"],
    ["block_plan", "Plan"], ["block_build", "Build"],
  ];
  return [
    base(),
    step("create", [block("block_board", ROOT, "Board", "block")]),
    step("arrange", [{ op: "set_arrangement", layer: "block_board", arrangement: "right" }]),
    step("group", [
      block("block_lanes", "block_board", "Lanes", "group"),
      { op: "set_grid", id: "block_lanes", rows: 3, cols: 4, headers: "row" },
      { op: "place_block", id: "block_lanes", x: 0, y: 0 },
    ]),
    ...named.map(([id, label]) =>
      step("create", [block(id, "block_board", label, "block")])),
    step("seat", [
      joins("block_alice"), seat("block_alice", 1, 0),
      joins("block_bob"), seat("block_bob", 2, 0),
      joins("block_draft"), seat("block_draft", 1, 1),
      joins("block_review"), seat("block_review", 1, 2),
      joins("block_ship"), seat("block_ship", 1, 3),
      joins("block_plan"), seat("block_plan", 2, 1),
      joins("block_build"), seat("block_build", 2, 2),
    ]),
    step("chain", [
      link("edge_1", "block_draft", "block_review", "directed"),
      link("edge_2", "block_review", "block_ship", "directed"),
      link("edge_3", "block_plan", "block_build", "directed"),
    ]),
  ];
}

export const FIXTURES = { blank, flat, nested, related, interfaced, gridded };

export type FixtureName = keyof typeof FIXTURES;

export const NAMES = Object.keys(FIXTURES) as FixtureName[];

export function fixture(name: string): Log {
  const make = FIXTURES[name as FixtureName];
  if (!make) throw new Error(`no fixture called "${name}" — try ${NAMES.join(", ")}`);
  return make();
}

/** Sample **files**, for the seam that takes state rather than history. */
export { GRAPHS, GRAPH_NAMES, graph_file, type GraphName } from "./graphs";

/** A graph as a **translator** hands one over, for the seam's contract test. */
export { TIER, translated } from "./translated";
