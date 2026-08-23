/** Inference: one-way, one-time, deterministic — and it never guesses into the
 *  structure.
 *
 *  The one rule everything here resolves against: **guess freely in the
 *  behavior, never guess into the structure.** */

import { describe, expect, it } from "vitest";
import { related } from "@mnd/fixtures";
import { ABSTRACTION, capped, children, derived_name, fold, infer, is_reference, module_of,
         ordered, participates, session, shape, shown_name, stands_for, subtree, ROOT,
         type Graph, type Id, type Log } from "../src/index";

/** A layer of `n` leaves, related as told, so a tier can be aimed at. */
function made(n: number, opts: { arrangement?: string; flow?: boolean;
                                 directed?: boolean } = {}): { graph: Graph; ids: Id[] } {
  const log: Log = [
    { id: "s0", action: "seed", at: 0, status: "applied", mutations: [
      { op: "add_block", block: { id: "top", parent: ROOT, label: "Top", type: "structure" } },
      ...(opts.flow ? [{ op: "set_def" as const, def: {
        id: "def_flow", home: ROOT, group: "relation" as const, name: "flow" } }] : []),
      ...(opts.arrangement ? [{ op: "set_arrangement" as const, layer: "top",
        arrangement: opts.arrangement as never }] : []),
    ] },
  ];
  const ids: Id[] = [];
  for (let i = 0; i < n; i++) {
    const id = `b${i}`;
    ids.push(id);
    log.push({ id: `s${i + 1}`, action: "create", at: i + 1, status: "applied", mutations: [
      { op: "add_block", block: { id, parent: "top", label: `B${i}`, type: "structure",
                                  num: i + 1, x: (n - i) * 100, y: 0 } },
    ] });
  }
  if (opts.flow || opts.directed) {
    for (let i = 1; i < n; i++) {
      log.push({ id: `e${i}`, action: "relate", at: 99, status: "applied", mutations: [
        { op: "link_blocks", edge: { id: `edge_${i}`, from: ids[i - 1]!, to: ids[i]!,
                                     module: "directed",
                                     ...(opts.flow ? { type: "def_flow" } : {}) } },
      ] });
    }
  }
  return { graph: fold(log), ids };
}

describe("what the selection becomes", () => {
  it("takes a container's children rather than the container", () => {
    const { graph } = made(3);
    expect(shape(graph, ["top"])).toHaveLength(3);
  });

  it("takes a leaf as itself", () => {
    const { graph, ids } = made(3);
    expect(shape(graph, [ids[0]!])).toEqual([ids[0]]);
  });

  it("takes several as they were given", () => {
    const { graph, ids } = made(3);
    expect(shape(graph, ids)).toEqual(ids);
  });

  it("ignores what is not there", () => {
    const { graph } = made(3);
    expect(shape(graph, ["nowhere"])).toEqual([]);
  });
});

describe("the cap cuts higher rather than dropping things", () => {
  it("leaves a selection under the cap alone", () => {
    const { graph, ids } = made(4);
    expect(capped(graph, ids, ABSTRACTION)).toEqual(ids);
  });

  it("rises to the shallowest level that fits", () => {
    const { graph, ids } = made(9);
    expect(capped(graph, ids, ABSTRACTION)).toEqual(["top"]);
  });

  it("never returns more than it was asked for", () => {
    const { graph, ids } = made(9);
    expect(capped(graph, ids, 3).length).toBeLessThanOrEqual(3);
  });
});

describe("order is read down four tiers", () => {
  it("reads a flow first", () => {
    const { graph, ids } = made(3, { flow: true });
    const got = ordered(graph, ids);
    expect(got.tier).toBe(1);
    expect(got.order).toEqual(ids);
  });

  it("reads any directed relation second", () => {
    const { graph, ids } = made(3, { directed: true });
    expect(ordered(graph, ids).tier).toBe(2);
  });

  it("reads position along a directional arrangement third", () => {
    const { graph, ids } = made(3, { arrangement: "right" });
    const got = ordered(graph, ids);
    expect(got.tier).toBe(3);
    /** x descends with i, so reading right puts the last one first. */
    expect(got.order).toEqual([...ids].reverse());
  });

  it("does not fire tier three under an arrangement with no direction", () => {
    for (const how of ["free", "grid"]) {
      expect(ordered(made(3, { arrangement: how }).graph, made(3).ids).tier).toBe(4);
    }
  });

  it("falls through to connectivity when nothing else speaks", () => {
    const { graph, ids } = made(3);
    expect(ordered(graph, ids).tier).toBe(4);
  });

  it("is deterministic — the same selection reads the same way every time", () => {
    const { graph, ids } = made(4, { directed: true });
    expect(ordered(graph, ids)).toEqual(ordered(graph, [...ids].reverse()));
  });
});

describe("infer makes one new top-level behavior block", () => {
  it("lands at the top level, whatever it was made from", () => {
    const s = session();
    for (const step of related()) s.adjust(step.action, step.mutations);
    s.go("infer", { of: ["block_pump", "block_hx"] });
    const behavior = children(s.graph(), ROOT).find((b) => b.type === "behavior")!;
    expect(behavior.parent).toBe(ROOT);
    expect(module_of(s.graph(), behavior.id)).toBe("behavior");
  });

  it("holds references to the participants, and never parts of them", () => {
    const s = session();
    for (const step of related()) s.adjust(step.action, step.mutations);
    s.pick(["block_pump", "block_hx"]);
    s.look("block_loop");
    s.go("infer", { of: ["block_pump", "block_hx"] });

    const behavior = children(s.graph(), ROOT).find((b) => b.type === "behavior")!;
    const under = subtree(s.graph(), behavior.id).map((id) => s.graph().blocks[id]!);
    const refs = under.filter((b) => is_reference(b));
    expect(refs).toHaveLength(2);
    for (const r of refs) {
      expect(module_of(s.graph(), r.id)).toBe("reference");
      expect(stands_for(s.graph(), r.id)?.parent).toBe("block_loop");
    }
    /** No structure block is *in* the behavior tree — only stood for. */
    expect(under.map((b) => b.id)).not.toContain("block_pump");
  });

  it("writes the order down as directed relations", () => {
    const s = session();
    for (const step of related()) s.adjust(step.action, step.mutations);
    s.go("infer", { of: ["block_pump", "block_hx", "block_tank"] });
    const made_edges = Object.values(s.graph().edges).filter((e) => e.module === "directed");
    expect(made_edges.length).toBeGreaterThan(2);
  });

  it("makes a new block every time rather than editing one", () => {
    const s = session();
    for (const step of related()) s.adjust(step.action, step.mutations);
    s.go("infer", { of: ["block_pump", "block_hx"] });
    s.go("infer", { of: ["block_pump", "block_hx"] });
    expect(children(s.graph(), ROOT).filter((b) => b.type === "behavior")).toHaveLength(2);
  });

  it("refuses an empty selection in words", () => {
    const s = session();
    expect(s.go("infer", { of: [] })).toMatch(/nothing is selected/);
  });
});

describe("a name nobody typed is derived and says so", () => {
  const behaved = () => {
    const s = session({ defs: [
      { op: "set_def" as const, def: { id: "action", home: ROOT, group: "block" as const,
        name: "action", components: { card: { word: "do" } } } },
    ] });
    for (const step of related()) s.adjust(step.action, step.mutations);
    s.go("infer", { of: ["block_pump", "block_hx"] });
    const behavior = children(s.graph(), ROOT).find((b) => b.type === "behavior")!;
    return { s, actions: children(s.graph(), behavior.id) };
  };

  it("names an action for what it stands for, with its verb in front", () => {
    const { s, actions } = behaved();
    expect(actions.map((a) => shown_name(s.graph(), a.id)))
      .toEqual(expect.arrayContaining(["do Pump", "do Heat Exchanger"]));
  });

  it("says the name is derived, so a guess never reads as a statement", () => {
    const { s, actions } = behaved();
    expect(derived_name(s.graph(), actions[0]!.id)).toBeTruthy();
  });

  it("stops being derived the moment somebody types over it", () => {
    const { s, actions } = behaved();
    s.go("rename", { id: actions[0]!.id, label: "Prime the loop" });
    expect(derived_name(s.graph(), actions[0]!.id)).toBeNull();
    expect(shown_name(s.graph(), actions[0]!.id)).toBe("Prime the loop");
  });

  it("follows the block it stands for when that is renamed", () => {
    const { s, actions } = behaved();
    s.go("rename", { id: "block_pump", label: "Main Pump" });
    expect(actions.map((a) => shown_name(s.graph(), a.id))).toContain("do Main Pump");
  });

  it("derives nothing for a block that stands for more than one thing", () => {
    const s = session();
    s.go("create", { label: "Holder" });
    const holder = children(s.graph(), ROOT)[0]!.id;
    s.look(holder);
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    expect(derived_name(s.graph(), holder)).toBeNull();
  });
});

describe("guess freely in the behavior, never into the structure", () => {
  function home_writes(opts: object): number {
    const { graph, ids } = made(3, opts);
    const got = infer(graph, ids)!;
    const inside = new Set<string>();
    for (const m of got.mutations) if (m.op === "add_block") inside.add(m.block.id);
    return got.mutations.filter((m) =>
      m.op === "add_block" && !inside.has(m.block.parent ?? "") && m.block.side !== undefined,
    ).length;
  }

  it("writes interfaces home when a flow stated them", () => {
    expect(home_writes({ flow: true })).toBeGreaterThan(0);
  });

  it("writes nothing home from a plain directed relation", () => {
    expect(home_writes({ directed: true })).toBe(0);
  });

  it("writes nothing home from position", () => {
    expect(home_writes({ arrangement: "right" })).toBe(0);
  });

  it("writes nothing home from connectivity alone", () => {
    expect(home_writes({})).toBe(0);
  });
});

describe("participation is derived, never stored", () => {
  it("asks the graph rather than a back-reference", () => {
    const s = session();
    for (const step of related()) s.adjust(step.action, step.mutations);
    expect(participates(s.graph(), "block_pump")).toEqual([]);

    s.go("infer", { of: ["block_pump", "block_hx"] });
    expect(participates(s.graph(), "block_pump")).toHaveLength(1);
    expect(participates(s.graph(), "block_valve")).toEqual([]);

    /** Nothing was written onto the structure block itself. */
    expect(s.graph().blocks["block_pump"]!.fields ?? []).toEqual([]);
  });
});
