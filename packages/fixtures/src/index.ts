/** Sample data, as logs rather than graphs. */

import { FLOOR as BASE_FLOOR } from "@mnd/defs";
import { MAIN, type Dir, type Log, type Mutation, type Step } from "@mnd/core";

let n = 0;
const step = (action: string, mutations: Mutation[]): Step =>
  ({ id: `step_${String(++n).padStart(4, "0")}`, action, at: n, status: "applied", mutations });

/** Orders counted per parent, as the create action counts them. */
let counts: Record<string, number> = {};
const block = (id: string, parent: string | null, name: string, type?: string): Mutation => {
  const key = parent ?? "";
  counts[key] = (counts[key] ?? 0) + 1;
  return { op: "add_block", block: { id, parent, name, type, order: counts[key] } };
};

const start = () => { n = 0; counts = {}; };

/** A run points because `dir` says so. */
const link = (id: string, from: string, to: string, dir?: Dir): Mutation =>
  ({ op: "link_blocks", edge: { id, from, to, ...(dir ? { dir } : {}) } });

/** The shipped floor, which every fold of a fixture starts from. */
export const FLOOR = BASE_FLOOR;

/** Nothing but the floor: a workspace as it opens for the first time. */
export function blank(): Log {
  start();
  return [];
}

/** One project, three siblings, nothing else. */
export function flat(): Log {
  start();
  return [
    step("create", [block("block_ledger", MAIN, "Ledger", "block")]),
    step("create", [block("block_edge", "block_ledger", "Edge", "block")]),
    step("create", [block("block_auth", "block_ledger", "Auth", "block")]),
    step("create", [block("block_billing", "block_ledger", "Billing", "block")]),
  ];
}

/** Two projects, one nested two deep, one folder. */
export function nested(): Log {
  start();
  return [
    step("create", [block("block_shelf", MAIN, "Shelf", "folder")]),
    step("create", [block("block_ledger", "block_shelf", "Ledger", "block")]),
    step("create", [block("block_edge", "block_ledger", "Edge", "block")]),
    step("create", [block("block_rate", "block_edge", "Rate Limit", "block")]),
    step("create", [block("block_auth", "block_edge", "Auth", "block")]),
    step("create", [block("block_billing", "block_ledger", "Billing", "block")]),
    step("create", [block("block_site", MAIN, "Site", "block")]),
    step("create", [block("block_pages", "block_site", "Pages", "block")]),
  ];
}

/** A chain and a fan, with a note and a boundary. */
export function related(): Log {
  start();
  return [
    step("create", [block("block_loop", MAIN, "Coolant Loop", "block")]),
    step("create", [block("block_pump", "block_loop", "Pump", "block")]),
    step("create", [block("block_hx", "block_loop", "Heat Exchanger", "block")]),
    step("create", [block("block_tank", "block_loop", "Reservoir", "block")]),
    step("create", [block("block_valve", "block_loop", "Valve", "block")]),
    step("relate", [link("edge_a", "block_pump", "block_hx", "forward")]),
    step("relate", [link("edge_b", "block_hx", "block_tank", "forward")]),
    step("relate", [link("edge_c", "block_tank", "block_pump", "forward")]),
    step("relate", [link("edge_d", "block_valve", "block_hx")]),
    step("note", [
      block("block_note", "block_loop", "", "note"),
      { op: "set_body", id: "block_note", body: "the loop runs clockwise" },
    ]),
    step("group", [
      { op: "add_block", block: { id: "block_hot", parent: "block_loop", name: "Hot side",
                                  type: "group", order: 7 } },
      { op: "move_block", id: "block_hx", parent: "block_hot" },
      { op: "move_block", id: "block_tank", parent: "block_hot" },
    ]),
    step("layout", [auto("block_loop")]),
  ];
}

/** Interfaces, seated and related through. */
export function interfaced(): Log {
  start();
  return [
    step("create", [block("block_loop", MAIN, "Coolant Loop", "block")]),
    step("create", [block("block_pump", "block_loop", "Pump", "block")]),
    step("create", [block("block_hx", "block_loop", "Heat Exchanger", "block")]),
    step("interface", [
      { op: "add_block", block: { id: "port_out", parent: "block_pump",
                                  side: "right", at: 0.5, flow: "out", order: 1 } },
      { op: "add_block", block: { id: "port_in", parent: "block_hx",
                                  side: "left", at: 0.5, flow: "in", order: 1 } },
    ]),
    step("relate", [link("edge_flow", "port_out", "port_in", "forward")]),
    step("relate", [link("edge_plain", "block_pump", "block_hx")]),
    step("layout", [auto("block_loop")]),
  ];
}

/** A grid whose left column heads its lanes, with a reference to a block in each header and a
 *  flow across each lane. */
export function gridded(): Log {
  start();
  const seat = (id: string, r: number, c: number): Mutation =>
    ({ op: "seat_cell", id, cell: { r, c } });
  const joins = (id: string): Mutation => ({ op: "move_block", id, parent: "block_lanes" });
  const named: [string, string][] = [
    ["block_draft", "Draft"], ["block_review", "Review"], ["block_ship", "Ship"],
    ["block_plan", "Plan"], ["block_build", "Build"],
  ];
  return [
    step("create", [block("block_board", MAIN, "Board", "block")]),
    /** The lanes' owners live elsewhere; the board's headers refer to them. */
    step("create", [block("block_team", MAIN, "Team", "folder"),
                    block("block_alice", "block_team", "Alice", "block"),
                    block("block_bob", "block_team", "Bob", "block")]),
    step("layout", [auto("block_board")]),
    step("group", [
      { op: "add_block", block: { id: "block_lanes", parent: "block_board", name: "Lanes",
                                  type: "grid", x: 0, y: 0, order: 1 } },
      { op: "set_grid", id: "block_lanes", grid: { rows: 3, cols: 4 } },
    ]),
    ...named.map(([id, label]) =>
      step("create", [block(id, "block_board", label, "block")])),
    step("seat", [
      { op: "add_block", block: { id: "ref_alice", parent: "block_board", of: "block_alice" } },
      joins("ref_alice"), seat("ref_alice", 1, 0),
      { op: "add_block", block: { id: "ref_bob", parent: "block_board", of: "block_bob" } },
      joins("ref_bob"), seat("ref_bob", 2, 0),
      joins("block_draft"), seat("block_draft", 1, 1),
      joins("block_review"), seat("block_review", 1, 2),
      joins("block_ship"), seat("block_ship", 1, 3),
      joins("block_plan"), seat("block_plan", 2, 1),
      joins("block_build"), seat("block_build", 2, 2),
    ]),
    step("chain", [
      link("edge_1", "block_draft", "block_review", "forward"),
      link("edge_2", "block_review", "block_ship", "forward"),
      link("edge_3", "block_plan", "block_build", "forward"),
    ]),
  ];
}

/** A layer laid out for you. */
function auto(layer: string): Mutation {
  return { op: "set_setting", id: layer, key: "layout", name: "kind", value: "auto" };
}

export const FIXTURES = { blank, flat, nested, related, interfaced, gridded };

export type FixtureName = keyof typeof FIXTURES;

export const NAMES = Object.keys(FIXTURES) as FixtureName[];

export function fixture(name: string): Log {
  const make = FIXTURES[name as FixtureName];
  if (!make) throw new Error(`no fixture called "${name}" — try ${NAMES.join(", ")}`);
  return make();
}

/** Sample files, for the seam that takes state rather than history. */
export { GRAPHS, GRAPH_NAMES, graph_file, type GraphName } from "./graphs";

/** A graph as a translator hands one over, for the seam's contract test. */
export { TIER, translated } from "./translated";
