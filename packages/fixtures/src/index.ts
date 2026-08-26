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
    step("create", [block("block_ledger", ROOT, "Ledger", "structure")]),
    step("create", [block("block_edge", "block_ledger", "Edge", "structure")]),
    step("create", [block("block_auth", "block_ledger", "Auth", "structure")]),
    step("create", [block("block_billing", "block_ledger", "Billing", "structure")]),
  ];
}

/** Two projects, one nested two deep, one folder. Exercises the tree. */
export function nested(): Log {
  start();
  return [
    base(),
    step("create", [block("block_shelf", ROOT, "Shelf", "folder")]),
    step("create", [block("block_ledger", "block_shelf", "Ledger", "structure")]),
    step("create", [block("block_edge", "block_ledger", "Edge", "structure")]),
    step("create", [block("block_rate", "block_edge", "Rate Limit", "structure")]),
    step("create", [block("block_auth", "block_edge", "Auth", "structure")]),
    step("create", [block("block_billing", "block_ledger", "Billing", "structure")]),
    step("create", [block("block_site", ROOT, "Site", "structure")]),
    step("create", [block("block_pages", "block_site", "Pages", "structure")]),
  ];
}

/** A chain and a fan, with a note and a boundary. What routing is tested on. */
export function related(): Log {
  start();
  return [
    base(),
    step("create", [block("block_loop", ROOT, "Coolant Loop", "structure")]),
    step("create", [block("block_pump", "block_loop", "Pump", "structure")]),
    step("create", [block("block_hx", "block_loop", "Heat Exchanger", "structure")]),
    step("create", [block("block_tank", "block_loop", "Reservoir", "structure")]),
    step("create", [block("block_valve", "block_loop", "Valve", "structure")]),
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
      { op: "join_group", id: "block_hx", group: "block_hot" },
      { op: "join_group", id: "block_tank", group: "block_hot" },
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
    step("create", [block("block_loop", ROOT, "Coolant Loop", "structure")]),
    step("create", [block("block_pump", "block_loop", "Pump", "structure")]),
    step("create", [block("block_hx", "block_loop", "Heat Exchanger", "structure")]),
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

/** A behavior layer, as `infer` would have written one: one action per
 *  participant, each holding a reference, ordered by directed relationships —
 *  and one action branching in two, which is what draws a control. */
export function behaved(): Log {
  start();
  const act = (id: string, of: string, n: number): Mutation[] => [
    { op: "add_block", block: { id, parent: "block_flow", type: "action", num: n } },
    { op: "add_block", block: { id: `${id}_ref`, parent: id, of, num: 1 } },
  ];
  return [
    base(),
    step("create", [block("block_loop", ROOT, "Coolant Loop", "structure")]),
    step("create", [block("block_pump", "block_loop", "Pump", "structure")]),
    step("create", [block("block_hx", "block_loop", "Heat Exchanger", "structure")]),
    step("create", [block("block_tank", "block_loop", "Reservoir", "structure")]),
    step("infer", [
      { op: "add_block", block: { id: "block_flow", parent: ROOT, type: "behavior",
                                  label: "Coolant Loop behavior", num: 2 } },
      ...act("act_pump", "block_pump", 1),
      ...act("act_hx", "block_hx", 2),
      ...act("act_tank", "block_tank", 3),
      link("order_a", "act_pump", "act_hx", "directed"),
      link("order_b", "act_hx", "act_tank", "directed"),
      link("order_c", "act_pump", "act_tank", "directed"),
    ]),
    step("arrange", [{ op: "set_arrangement", layer: "block_flow", arrangement: "right" }]),
  ];
}

export const FIXTURES = { blank, flat, nested, related, interfaced, behaved };

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
