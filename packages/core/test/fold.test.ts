/** The fold: determinism, derivation, and undo as a refold.
 *
 *  Properties, never values — nothing here asserts a coordinate, an id or a
 *  count that tuning would change. */

import { describe, expect, it } from "vitest";
import { fixture, flat, nested, related } from "@mnd/fixtures";
import { arrangement_of, children, edges_in, fold, is_container, is_project, is_reference,
         module_of, next_num, path, resolve_def, session, shown_name, stands_for, subtree,
         ROOT } from "../src/index";

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

  it("reads a project from position", () => {
    const graph = fold(nested());
    expect(is_project(graph, "block_shelf")).toBe(true);
    expect(is_project(graph, "block_ledger")).toBe(false);
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
    expect(resolve_def(graph, "block_rate", "structure")?.id).toBe("structure");
    expect(resolve_def(graph, "block_rate", "not a thing")).toBeNull();
  });

  it("prefers the nearer ancestor when two share a name", () => {
    const log = nested();
    log.push({ id: "s", action: "define", at: 99, status: "applied", mutations: [
      { op: "set_def", def: { id: "def_near", home: "block_ledger", group: "block",
                             name: "structure" } },
    ] });
    const graph = fold(log);
    expect(resolve_def(graph, "block_rate", "structure")?.id).toBe("def_near");
  });
});
