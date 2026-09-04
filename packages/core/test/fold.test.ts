/** The fold: determinism, derivation, and undo as a refold.
 *
 *  Properties, never values — nothing here asserts a coordinate, an id or a
 *  count that tuning would change. */

import { describe, expect, it } from "vitest";
import { fixture, flat, nested, related } from "@mnd/fixtures";
import { arrangement_of, children, config_of, edges_in, fold, is_container, is_reference,
         is_top_block, module_named, module_of, next_num, path, resolve_def, session,
         shown_name, stands_for, subtree, ROOT, type Definition } from "../src/index";

describe("fold", () => {
  it.each(["flat", "nested", "related"])("is deterministic over %s", (name) => {
    const log = fixture(name);
    expect(fold(log)).toEqual(fold(log));
  });

  it("throws the graph away rather than editing it", () => {
    const log = flat();
    const once = fold(log);
    once.blocks["block_ledger"]!.label = "scribbled on";
    expect(fold(log).blocks["block_ledger"]!.label).toBe("Ledger");
  });

  it("skips reverted steps", () => {
    const log = flat();
    const before = Object.keys(fold(log).blocks).length;
    log[log.length - 1]!.status = "reverted";
    expect(Object.keys(fold(log).blocks).length).toBe(before - 1);
  });

  it("always has a root with no parent", () => {
    for (const name of ["flat", "nested", "related"]) {
      const graph = fold(fixture(name));
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
    const graph = fold(nested());
    expect(is_container(graph, "block_edge")).toBe(true);
    expect(is_container(graph, "block_auth")).toBe(false);
  });

  it("reads a tier root from position, and nothing stores one", () => {
    const graph = fold(nested());
    expect(is_top_block(graph, "block_shelf")).toBe(true);
    expect(is_top_block(graph, "block_ledger")).toBe(false);
  });

  it("walks a path from root to the block, itself last", () => {
    const graph = fold(nested());
    const trail = path(graph, "block_rate").map((b) => b.id);
    expect(trail[0]).toBe(ROOT);
    expect(trail.at(-1)).toBe("block_rate");
  });

  it("holds every descendant in a subtree", () => {
    const graph = fold(nested());
    const under = subtree(graph, "block_ledger");
    expect(under).toContain("block_rate");
    expect(under).not.toContain("block_site");
  });

  it("lists only relations with both ends in the layer", () => {
    const graph = fold(related());
    for (const e of edges_in(graph, "block_loop")) {
      expect(graph.blocks[e.from]?.parent).toBe("block_loop");
      expect(graph.blocks[e.to]?.parent).toBe("block_loop");
    }
  });

  it("gives a layer that says nothing the free arrangement", () => {
    const graph = fold(flat());
    expect(arrangement_of(graph, "block_ledger")).toBe("free");
    expect(arrangement_of(fold(related()), "block_loop")).toBe("right");
  });

  it("reads a null layer as the root layer, and never as the root itself", () => {
    const graph = fold(nested());
    expect(children(graph, null).map((b) => b.label)).toEqual(["Shelf", "Site"]);
    expect(children(graph, null).map((b) => b.id)).not.toContain(ROOT);
    expect(children(graph, null)).toEqual(children(graph, ROOT));
  });

  it("takes the lowest number not in use among siblings", () => {
    const graph = fold(flat());
    expect(next_num(graph, "block_ledger")).toBeGreaterThan(0);
  });
});

describe("references", () => {
  it("reads its target's name, and missing when the target is gone", () => {
    const s = session();
    s.go("create", { label: "Ledger" });
    const ledger = children(s.graph(), ROOT)[0]!.id;
    s.go("create", { label: "Auth", parent: ledger });
    const auth = children(s.graph(), ledger)[0]!.id;

    s.look(null);
    s.go("refer", { target: auth });
    const ref = children(s.graph(), null).find((b) => is_reference(b))!;

    expect(shown_name(s.graph(), ref.id)).toBe("Auth");
    expect(stands_for(s.graph(), ref.id)?.id).toBe(auth);
    expect(module_of(s.graph(), ref.id)).toBe("reference");

    s.go("delete", { id: auth });
    expect(shown_name(s.graph(), ref.id)).toBe("missing");
  });
});

describe("definitions resolve up the tree", () => {
  it("finds one filed on an ancestor, and misses one filed elsewhere", () => {
    const graph = fold(nested());
    expect(resolve_def(graph, "block_rate", "block")?.id).toBe("block");
    expect(resolve_def(graph, "block_rate", "not a thing")).toBeNull();
  });

  it("prefers the nearer ancestor when two share a name", () => {
    const log = nested();
    log.push({ id: "s", action: "define", at: 99, status: "applied", mutations: [
      { op: "set_def", def: { id: "def_near", home: "block_ledger", group: "block",
                             name: "block" } },
    ] });
    const graph = fold(log);
    expect(resolve_def(graph, "block_rate", "block")?.id).toBe("def_near");
  });
});
/** **The cascade, and the one rule it exists to make true.** A chain is laid
 *  down base first, one property at a time, and the nearest link has the last
 *  word ~~ so a refinement says only what it changes and inherits the rest. */
/** The base kinds, as the seven definitions that name them. Stated here rather
 *  than imported: core ships no vocabulary — an app hands one in — so a test
 *  seeds what it needs. */
const BASE: Definition[] = ["block", "folder", "resource", "reference",
                            "interface", "group", "note"].map((name) => ({
  id: name, home: ROOT, group: "block" as const, name,
  ...(name === "note" ? { extends: "resource" } : {}),
  components: { block: { module: name } },
}));

const kinds = (more: Definition[] = []) => session({
  defs: [...BASE, ...more].map((def) => ({ op: "set_def" as const, def })),
});

describe("definitions cascade", () => {
  const with_defs = (defs: Definition[]) => kinds(defs).graph();

  it("keeps what a refinement did not restate", () => {
    const graph = with_defs([
      { id: "d_base", home: ROOT, group: "block", name: "base",
        components: { style: { slot: "primary", emphasis: "quiet" } } },
      { id: "d_sub", home: ROOT, group: "block", name: "sub", extends: "d_base",
        components: { style: { slot: "tertiary" } } },
    ]);
    /** The nearest wins on what it says, and says nothing about the rest. */
    expect(config_of(graph, "d_sub", "style"))
      .toEqual({ slot: "tertiary", emphasis: "quiet" });
  });

  it("reads a kind from the nearest link that names one", () => {
    const graph = with_defs([
      { id: "d_bin", home: ROOT, group: "block", name: "bin", extends: "folder",
        components: { style: { slot: "muted" } } },
    ]);
    expect(module_named(graph, "d_bin")).toBe("folder");
    /** A note names its own kind while extending a resource for its look. */
    expect(module_named(graph, "note")).toBe("note");
  });
});

/** **A subtype refines what a thing is like, never what it is.** A block, a
 *  folder and a resource are one family; every other kind is its own. */
describe("what a block may become", () => {
  it("swaps freely among block, folder and resource", () => {
    const s = kinds();
    s.go("create", { label: "A" });
    const id = children(s.graph(), ROOT)[0]!.id;
    for (const type of ["folder", "resource", "block"]) {
      expect(s.go("retype", { id, type })).toBeNull();
      expect(module_of(s.graph(), id)).toBe(type);
    }
  });

  it.each(["group", "note", "interface", "reference"])(
    "refuses to make a block a %s", (type) => {
      const s = kinds();
      s.go("create", { label: "A" });
      const id = children(s.graph(), ROOT)[0]!.id;
      expect(s.go("retype", { id, type })).toEqual(expect.any(String));
      expect(module_of(s.graph(), id)).toBe("block");
    });
});

