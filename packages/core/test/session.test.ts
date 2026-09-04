/** The loop, the door and the file: undo by refold, repairs reported, and a
 *  round trip that changes nothing. */

import { describe, expect, it } from "vitest";
import { flat, nested, related } from "@mnd/fixtures";
import { seed } from "@mnd/defs";
import { CAP, check, children, compact, fold, hash, read, say, session, write,
         write_subtree, ROOT, type Log, type Storage } from "../src/index";

function memory(): Storage & { held: () => Log | null } {
  let held: Log | null = null;
  return { read: () => held, write: (log) => { held = structuredClone(log); },
           clear: () => { held = null; }, held: () => held };
}

describe("undo is a refold", () => {
  it("needs no inverse, and the graph comes back by the same path", () => {
    const s = session();
    s.go("create", { label: "Ledger" });
    const after_one = hash(s.graph());
    s.go("create", { label: "Site" });
    expect(hash(s.graph())).not.toBe(after_one);
    expect(s.undo()).toBe(true);
    expect(hash(s.graph())).toBe(after_one);
  });

  it("unwinds in the order things were applied", () => {
    const s = session();
    s.go("create", { label: "A" });
    s.go("create", { label: "B" });
    s.go("create", { label: "C" });
    s.undo();
    expect(children(s.graph(), ROOT).map((b) => b.label)).toEqual(["A", "B"]);
    s.undo();
    expect(children(s.graph(), ROOT).map((b) => b.label)).toEqual(["A"]);
  });

  it("reports itself spent when there is nothing left", () => {
    const s = session();
    expect(s.undo()).toBe(false);
  });

  it("redoes what it reverted, and drops the redo once work continues", () => {
    const s = session();
    s.go("create", { label: "A" });
    s.undo();
    expect(s.redo()).toBe(true);
    s.undo();
    s.go("create", { label: "B" });
    expect(s.redo()).toBe(false);
  });

  it("restores the graph, never the context", () => {
    const s = session();
    s.go("create", { label: "A" });
    const a = children(s.graph(), ROOT)[0]!.id;
    s.pick([a]);
    s.go("delete", { id: a });
    expect(s.picked()).toEqual([]);
    s.undo();
    expect(s.picked()).toEqual([]);
  });
});

describe("one step per action", () => {
  it("writes one step however many mutations it took", () => {
    const s = session();
    s.go("create", { label: "Pump" });
    const pump = Object.values(s.graph().blocks).find((b) => b.label === "Pump")!.id;
    s.go("note", { about: pump, text: "hello", spot: { x: 24, y: 24 } });
    expect(s.log().filter((x) => x.action === "note")).toHaveLength(1);
    expect(s.log().find((x) => x.action === "note")!.mutations.length).toBeGreaterThan(1);
  });

  it("writes nothing for a refusal", () => {
    const s = session();
    const before = s.log().length;
    expect(s.go("create", { label: "" })).toBeNull();
    /** A sibling may wear the same name, so two of these are two steps. */
    s.go("create", { label: "A" });
    expect(s.go("create", { label: "A" })).toBeNull();
    expect(s.go("refer", { target: "block_nowhere" })).toMatch(/not there/);
    expect(s.log().length).toBe(before + 3);
  });

  it("writes no step for navigation", () => {
    const s = session();
    s.go("create", { label: "A" });
    const before = s.log().length;
    s.go("open", { id: children(s.graph(), ROOT)[0]!.id });
    s.go("up");
    expect(s.log().length).toBe(before);
  });
});

describe("the door", () => {
  it("says nothing about a clean log", () => {
    expect(say(check(nested()).faults)).toBe("");
  });

  it("repairs a block whose parent is not there, and says so", () => {
    const log = flat();
    log.push({ id: "s", action: "x", at: 9, status: "applied", mutations: [
      { op: "add_block", block: { id: "block_orphan", parent: "block_nowhere", label: "Orphan" } },
    ] });
    const got = check(log);
    expect(say(got.faults)).toMatch(/repaired/);
    expect(fold(got.log).blocks["block_orphan"]!.parent).toBe(ROOT);
  });

  it("drops an op this build does not know", () => {
    const got = check([{ id: "s", action: "x", at: 0, status: "applied",
                         mutations: [{ op: "teleport_block" }] }]);
    expect(say(got.faults)).toMatch(/could not read/);
  });

  it("refuses something that is not a log at all", () => {
    expect(check({ not: "a log" }).faults).toHaveLength(1);
  });
});

describe("files", () => {
  it("round-trips through the file format", () => {
    const before = fold(related());
    const got = read(write(before));
    expect(got.faults).toHaveLength(0);
    expect(fold(got.log)).toEqual(before);
  });

  it("re-exports byte-identically", () => {
    const graph = fold(related());
    expect(write(graph)).toBe(write(fold(read(write(graph)).log)));
  });

  it("refuses a file written for another major schema", () => {
    const bad = JSON.parse(write(fold(flat())));
    bad.schema = "9.0";
    expect(read(JSON.stringify(bad)).faults[0]!.kind).toBe("dropped");
  });

  it("exports a subtree with the definitions it reaches, and nothing else", () => {
    const graph = fold(nested());
    const out = JSON.parse(write_subtree(graph, "block_ledger"));
    expect(out.graph.blocks["block_rate"]).toBeDefined();
    expect(out.graph.blocks["block_site"]).toBeUndefined();
    expect(out.graph.blocks["block_ledger"].parent).toBeNull();
    expect(out.graph.defs["block"]).toBeDefined();
  });

  it("computes the hash rather than storing it", () => {
    expect(JSON.parse(write(fold(flat())))).not.toHaveProperty("hash");
    expect(hash(fold(flat()))).toBe(hash(fold(flat())));
  });
});

describe("storage", () => {
  it("saves as you go and comes back after a reload", () => {
    const store = memory();
    const one = session({ storage: store });
    one.go("create", { label: "Ledger" });
    const two = session({ storage: store });
    expect(children(two.graph(), ROOT).map((b) => b.label)).toEqual(["Ledger"]);
  });

  it("keeps a repair, so a mended log is not re-read as damaged", () => {
    const store = memory();
    store.write([{ id: "s", action: "hand-edited", at: 0, status: "applied", mutations: [
      { op: "add_block", block: { id: "block_orphan", parent: "block_nowhere", label: "Orphan" } },
    ] }]);

    const one = session({ storage: store });
    expect(one.said()?.text).toMatch(/repaired/);
    expect(store.held()!.some((x) => x.action === "repair")).toBe(true);

    /** Opening it again finds nothing left to mend, and says nothing. */
    const two = session({ storage: store });
    expect(two.said()).toBeNull();
    expect(store.held()!.filter((x) => x.action === "repair")).toHaveLength(1);
    expect(children(two.graph(), ROOT).map((b) => b.label)).toEqual(["Orphan"]);
  });

  it("says nothing on opening a clean log", () => {
    const store = memory();
    session({ storage: store }).go("create", { label: "A" });
    expect(session({ storage: store }).said()).toBeNull();
  });

  it("survives storage that forgets", () => {
    const s = session();
    s.go("create", { label: "Ledger" });
    expect(children(s.graph(), ROOT)).toHaveLength(1);
  });
});

describe("compaction", () => {
  it("caps the log and keeps the graph unchanged", () => {
    let log: Log = [];
    for (let i = 0; i < CAP + 400; i++) {
      log.push({ id: `step_${i}`, action: "create", at: i, status: "applied", mutations: [
        { op: "add_block", block: { id: `block_${i}`, parent: ROOT, label: `B${i}` } },
      ] });
    }
    const before = fold(log);
    log = compact(log);
    expect(log.length).toBeLessThanOrEqual(CAP + 1);
    expect(fold(log)).toEqual(before);
  });
});

/** **Starting over is dropping the log, not editing it.** A fresh workspace is
 *  the seed laid down again — which is also the only way a definition this
 *  build no longer ships leaves a workspace that already carried one. */
describe("a new workspace", () => {
  it("puts back exactly what a first run opens with", () => {
    const s = session({ defs: seed() });
    const fresh = Object.keys(s.graph().defs).sort();
    s.go("create", { label: "Loop" });
    expect(Object.keys(s.graph().blocks)).toHaveLength(2);

    s.reset();
    expect(Object.keys(s.graph().blocks)).toEqual([ROOT]);
    expect(Object.keys(s.graph().defs).sort()).toEqual(fresh);
    expect(s.layer()).toBeNull();
  });

  it("drops a definition this build no longer ships", () => {
    const s = session({ defs: seed() });
    s.go("define", { name: "activity", group: "view" });
    expect(Object.values(s.graph().defs).some((d) => d.name === "activity")).toBe(true);

    s.reset();
    expect(Object.values(s.graph().defs).some((d) => d.name === "activity")).toBe(false);
  });

  it("leaves nothing to undo into", () => {
    const s = session({ defs: seed() });
    s.go("create", { label: "Loop" });
    s.reset();
    s.undo();
    expect(Object.keys(s.graph().blocks)).toEqual([ROOT]);
  });
});
