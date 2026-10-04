/** The fold: determinism, derivation, and undo as a refold. */

import { describe, expect, it } from "vitest";
import { FLOOR, fixture, flat, nested, related } from "@mnd/fixtures";
import { arrangement_of, children, config_of, edges_in, fold, is_container, is_reference,
         block_base, base_of, next_order, path, session,
         shown_name, stands_for, subtree, MAIN, ROOT, type Block } from "../src/index";

describe("fold", () => {
  it.each(["flat", "nested", "related"])("is deterministic over %s", (name) => {
    const log = fixture(name);
    expect(fold(log)).toEqual(fold(log));
  });

  it("throws the graph away rather than editing it", () => {
    const log = flat();
    const once = fold(log);
    once.blocks["block_ledger"]!.name = "scribbled on";
    expect(fold(log).blocks["block_ledger"]!.name).toBe("Ledger");
  });

  it("skips reverted steps", () => {
    const log = flat();
    const before = Object.keys(fold(log).blocks).length;
    log[log.length - 1]!.status = "reverted";
    expect(Object.keys(fold(log).blocks).length).toBe(before - 1);
  });

  it("always has a root with no parent", () => {
    for (const name of ["flat", "nested", "related"]) {
      const graph = fold(fixture(name), FLOOR);
      expect(graph.blocks[graph.root]?.parent).toBeNull();
    }
  });

  it("deletes a subtree whole, and the relations that met it", () => {
    const graph = fold([...related(),
      { id: "s", action: "delete", at: 99, status: "applied",
        mutations: [{ op: "delete_block", id: "block_hx" }] }]);
    expect(graph.blocks["block_hx"]).toBeUndefined();
    expect(Object.values(graph.edges).some((e) => e.from === "block_hx" || e.to === "block_hx"))
      .toBe(false);
  });
});

describe("derived readings", () => {
  it("reads a container from what it holds, never from a field", () => {
    const graph = fold(nested(), FLOOR);
    expect(is_container(graph, "block_edge")).toBe(true);
    expect(is_container(graph, "block_auth")).toBe(false);
  });

  it("walks a path from root to the block, itself last", () => {
    const graph = fold(nested(), FLOOR);
    const trail = path(graph, "block_rate").map((b) => b.id);
    expect(trail.slice(0, 2)).toEqual([ROOT, MAIN]);
    expect(trail.at(-1)).toBe("block_rate");
  });

  it("holds every descendant in a subtree", () => {
    const graph = fold(nested(), FLOOR);
    const under = subtree(graph, "block_ledger");
    expect(under).toContain("block_rate");
    expect(under).not.toContain("block_site");
  });

  it("lists only relations with both ends in the layer", () => {
    const graph = fold(related(), FLOOR);
    for (const e of edges_in(graph, "block_loop")) {
      expect(graph.blocks[e.from]?.parent).toBe("block_loop");
      expect(graph.blocks[e.to]?.parent).toBe("block_loop");
    }
  });

  it("gives a layer that says nothing the free arrangement", () => {
    const graph = fold(flat(), FLOOR);
    expect(arrangement_of(graph, "block_ledger")).toBe("free");
    expect(arrangement_of(fold(related(), FLOOR), "block_loop")).toBe("auto");
  });

  it("reads a null layer as the workspace's domain, and never as the root itself", () => {
    const graph = fold(nested(), FLOOR);
    expect(children(graph, null).map((b) => b.id)).toContain(MAIN);
    expect(children(graph, null).map((b) => b.id)).not.toContain(ROOT);
    expect(children(graph, null)).toEqual(children(graph, ROOT));
  });

  it("takes the lowest number not in use among siblings", () => {
    const graph = fold(flat(), FLOOR);
    expect(next_order(graph, "block_ledger")).toBeGreaterThan(0);
  });
});

describe("references", () => {
  it("reads its target's name, and missing when the target is gone", () => {
    const s = session();
    s.go("create", { name: "Ledger" });
    const ledger = children(s.graph(), MAIN)[0]!.id;
    s.go("create", { name: "Auth", parent: ledger });
    const auth = children(s.graph(), ledger)[0]!.id;

    s.look(null);
    s.go("refer", { target: auth });
    const ref = children(s.graph(), null).find((b) => is_reference(b))!;

    expect(shown_name(s.graph(), ref.id)).toBe("Auth");
    expect(stands_for(s.graph(), ref.id)?.id).toBe(auth);
    expect(base_of(s.graph(), ref.id)).toBe("reference");

    s.go("delete", { id: auth });
    expect(shown_name(s.graph(), ref.id)).toBe("missing");
  });
});

/** The cascade, and the one rule it exists to make true. */
/** The base kinds, as the seven definitions that name them, under a package of their own. */
const BASE: Block[] = [{ id: "base", parent: null, name: "base" },
  ...["block", "folder", "reference", "interface", "group", "grid", "note"].map((name) => ({
    id: name, parent: "base", name, def: {}, settings: { block: { module: name } },
  }))];

const kinds = (more: Block[] = []) => session({ floor: [...BASE, ...more] });

describe("definitions cascade", () => {
  const with_defs = (defs: Block[]) => kinds(defs).graph();

  it("keeps what a refinement did not restate", () => {
    const graph = with_defs([
      { id: "d_base", parent: "base", name: "base", def: {},
        settings: { style: { slot: "primary", emphasis: "quiet" } } },
      { id: "d_sub", parent: "base", name: "sub", type: "d_base", def: {},
        settings: { style: { slot: "secondary" } } },
    ]);
    /** The nearest wins on what it says, and says nothing about the rest. */
    expect(config_of(graph, "d_sub", "style"))
      .toEqual({ slot: "secondary", emphasis: "quiet" });
  });

  it("reads a kind from the nearest link that names one", () => {
    const graph = with_defs([
      { id: "d_bin", parent: "base", name: "bin", type: "folder", def: {},
        settings: { style: { slot: "muted" } } },
    ]);
    expect(block_base(graph, "d_bin")).toBe("folder");
    expect(block_base(graph, "note")).toBe("note");
  });
});

/** A subtype refines what a thing is like, never what it is. */
describe("what a block may become", () => {
  /** A block takes only a definition of its own kind. */
  it("takes a definition of its own kind", () => {
    const s = kinds();
    s.go("create", { name: "A" });
    const id = children(s.graph(), MAIN)[0]!.id;
    expect(s.go("retype", { id, type: "block" })).toBeNull();
    expect(base_of(s.graph(), id)).toBe("block");
  });

  /** Block, folder, note, group and grid are one open family: none carries a field a retype
   *  cannot invent, so each is the plain block with different configuration. */
  it.each(["folder", "note", "group", "grid"])("makes a block a %s", (type) => {
    const s = kinds();
    s.go("create", { name: "A" });
    const id = children(s.graph(), MAIN)[0]!.id;
    expect(s.go("retype", { id, type })).toBeNull();
    expect(base_of(s.graph(), id)).toBe(type);
  });

  /** The derived kinds each carry something a change of type cannot invent. */
  it.each(["interface", "reference"])(
    "refuses to make a block a %s", (type) => {
      const s = kinds();
      s.go("create", { name: "A" });
      const id = children(s.graph(), MAIN)[0]!.id;
      expect(s.go("retype", { id, type })).toEqual(expect.any(String));
      expect(base_of(s.graph(), id)).toBe("block");
    });
});

