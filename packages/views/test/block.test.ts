/** The block view proves every Scene it emits is well-formed.
 *
 *  A producer proves its output satisfies the invariants; a consumer proves it
 *  handles anything that does. Neither imports the other. */

import { describe, expect, it } from "vitest";
import { fixture, flat, nested, related, NAMES as FIXTURES } from "@mnd/fixtures";
import { children, fold, session, ROOT, type Graph, type Id } from "@mnd/core";
import { box_of, draw, faults, outline, project, EMPTY, type Scene } from "../src/index";

const NAMES = FIXTURES;

function layers(graph: Graph): (Id | null)[] {
  return [null, ...Object.keys(graph.blocks)];
}

describe("every scene is well-formed", () => {
  it.each(NAMES)("over every layer of %s", (name) => {
    const graph = fold(fixture(name));
    for (const layer of layers(graph)) {
      expect(faults(project(graph, layer)), `layer ${layer}`).toEqual([]);
    }
  });

  it("over an empty workspace", () => {
    expect(faults(project(fold([]), null))).toEqual([]);
  });

  it("and the empty scene is well-formed, having nothing to be wrong about", () => {
    expect(faults(EMPTY)).toEqual([]);
  });
});

describe("the invariants catch what they are for", () => {
  const good = project(fold(related()), "block_loop");

  it("an edge reaching a node that is not drawn", () => {
    const bad: Scene = { ...good,
      edges: [{ ...good.edges[0]!, target: "nowhere" }] };
    expect(faults(bad)).toContainEqual(expect.stringContaining("not drawn"));
  });

  it("a node with no size", () => {
    const bad: Scene = { ...good, nodes: [{ ...good.nodes[0]!, width: 0 }] };
    expect(faults(bad)).toContainEqual(expect.stringContaining("no size"));
  });

  it("a node that says nothing about how it draws", () => {
    const bad: Scene = { ...good, nodes: [{ ...good.nodes[0]!, type: undefined }] };
    expect(faults(bad)).toContainEqual(expect.stringContaining("how it draws"));
  });

  it("two nodes sharing an id", () => {
    const bad: Scene = { ...good, nodes: [good.nodes[0]!, good.nodes[0]!] };
    expect(faults(bad)).toContainEqual(expect.stringContaining("share an id"));
  });
});

describe("what the projection shows", () => {
  it("draws one box per unit in the layer, and no more", () => {
    const graph = fold(nested());
    const scene = project(graph, "block_ledger");
    expect(scene.nodes.map((b) => b.id).sort())
      .toEqual(children(graph, "block_ledger").map((b) => b.id).sort());
  });

  it("draws nothing from another layer", () => {
    const graph = fold(nested());
    const scene = project(graph, "block_ledger");
    expect(scene.nodes.map((b) => b.id)).not.toContain("block_rate");
  });

  it("gives every node a type, so a renderer never guesses", () => {
    const scene = project(fold(related()), "block_loop");
    expect(scene.nodes.every((n) => !!n.type)).toBe(true);
  });

  it("projects a grid as a lattice, not a card", () => {
    const scene = project(fold(fixture("gridded")), "block_board");
    const lanes = scene.nodes.find((n) => n.id === "block_lanes")!;
    expect(lanes.type).toBe("grid");
    expect(lanes.data.grid?.length).toBeGreaterThan(0);
    expect(scene.nodes.some((n) => n.id === "block_lanes" && n.type === "card")).toBe(false);
  });

  it("marks how a block reads without anything declaring it", () => {
    const scene = project(fold(related()), "block_loop");
    const mark = (id: string) => scene.nodes.find((b) => b.id === id)!.data.marks;
    expect(mark("block_note")).toContain("note");
    expect(mark("block_hot")).toContain("group");
    expect(mark("block_pump")).not.toContain("container");
  });

  it("sizes a boundary to what it holds", () => {
    const scene = project(fold(related()), "block_loop");
    const band = box_of(scene.nodes.find((b) => b.data.marks.includes("group"))!);
    for (const id of ["block_hx", "block_tank"]) {
      const box = box_of(scene.nodes.find((b) => b.id === id)!);
      expect(box.x).toBeGreaterThanOrEqual(band.x);
      expect(box.x + box.w).toBeLessThanOrEqual(band.x + band.w);
    }
  });

  it("reads a reference's target, and says missing when it is gone", () => {
    const s = session();
    s.go("create", { label: "Ledger" });
    const ledger = children(s.graph(), ROOT)[0]!.id;
    s.go("create", { label: "Auth", parent: ledger });
    const auth = children(s.graph(), ledger)[0]!.id;
    s.go("refer", { target: auth });

    const ref = () => project(s.graph(), null).nodes.find((b) =>
      b.data.marks.includes("reference"))!;
    expect(ref().data.label).toBe("Auth");

    s.go("delete", { id: auth });
    expect(ref().data.marks).toContain("missing");
  });

  it("carries a trail from the root down to the layer", () => {
    const graph = fold(nested());
    const trail = project(graph, "block_rate").trail.map((t) => t.id);
    expect(trail[0]).toBe(ROOT);
    expect(trail.at(-1)).toBe("block_rate");
  });

  /** A slot says what the projection **can** offer, never what it is doing —
   *  so hiding interfaces must not take away the group that shows them, which
   *  is `relations`. */
  it("offers the control groups it can answer, hiding one or not", () => {
    const graph = fold(related());
    expect(project(graph, "block_loop").slots).toContain("relations");
    expect(project(graph, "block_loop", { interfaces: false }).slots)
      .toContain("relations");
  });

  /** Hiding interfaces is a display preference and says nothing about the
   *  relationships tied to them, so a hidden one keeps its seat as a berth
   *  that draws nothing and answers no gesture. */
  it("leaves a berth where an interface is hidden", () => {
    const graph = fold(fixture("interfaced"));
    const off = project(graph, "block_loop", { interfaces: false });
    const ports = off.nodes.filter((b) => b.data.marks.includes("interface"));
    expect(ports.length).toBeGreaterThan(0);
    expect(ports.every((b) => b.data.marks.includes("berth"))).toBe(true);
    expect(ports.every((b) => b.selectable === false)).toBe(true);
  });

  it("is a pure function of the graph — it writes nothing", () => {
    const graph = fold(related());
    const before = structuredClone(graph);
    project(graph, "block_loop");
    expect(graph).toEqual(before);
  });

  it("is stable — projecting twice gives the same scene", () => {
    const graph = fold(related());
    expect(project(graph, "block_loop")).toEqual(project(graph, "block_loop"));
  });
});

describe("the text renderer", () => {
  it("draws a scene as shape rather than coordinates", () => {
    const scene = project(fold(related()), "block_loop");
    const picture = draw(scene);
    /** A card for every block, a band round the group, and more than one row of
     *  them. **Never what fits inside a card** — how many characters a name
     *  gets is the block's width in disguise, and this draws shape. */
    const cards = scene.nodes.filter((n) => !n.data.marks.includes("group")
                                         && !n.data.marks.includes("grid")
                                         && !n.data.marks.includes("reference"));
    expect((picture.match(/\[/g) ?? []).length).toBe(cards.length);
    expect(picture).toContain("(");
    expect(picture.split("\n").length).toBeGreaterThan(1);
  });

  it("says so rather than drawing nothing for an empty layer", () => {
    expect(draw(project(fold(flat()), "block_edge"))).toBe("(empty)");
  });

  it("outlines what a scene holds", () => {
    const text = outline(project(fold(related()), "block_loop"));
    expect(text).toContain("Coolant Loop");
    expect(text).toContain("-->");
  });

  it("draws every fixture without throwing", () => {
    for (const name of NAMES) {
      const graph = fold(fixture(name));
      for (const layer of layers(graph)) {
        expect(() => draw(project(graph, layer))).not.toThrow();
      }
    }
  });
});

describe("interfaces are seated, not placed", () => {
  const scene = project(fold(fixture("interfaced")), "block_loop");
  const port = () => scene.nodes.find((b) => b.id === "port_out")!;

  it("draws one, on the card it belongs to", () => {
    expect(port().data.on).toBe("block_pump");
    expect(port().data.marks).toContain("interface");
  });

  it("marks which way it flows, and the mark constrains nothing", () => {
    expect(port().data.marks).toContain("out");
    expect(scene.nodes.find((b) => b.id === "port_in")!.data.marks).toContain("in");
  });

  it("draws as a seat rather than as a card", () => {
    expect(port().type).toBe("seat");
  });

  it("lands a relationship on the seat it names", () => {
    const line = scene.edges.find((r) => r.id === "edge_flow")!;
    expect([line.source, line.target]).toEqual(["port_out", "port_in"]);
  });

  /** **A line meets the border in the same place whether or not the square is
   *  drawn.** Hiding the seats that moved a line's ends would make a display
   *  preference redraw the model. */
  it("hides the seats and moves neither the lines nor their ends", () => {
    const off = project(fold(fixture("interfaced")), "block_loop", { interfaces: false });
    expect(off.nodes.every((b) => !b.data.marks.includes("interface")
                               || b.data.marks.includes("berth"))).toBe(true);
    expect(off.edges.map((r) => `${r.id}:${r.source}>${r.target}`).sort())
      .toEqual(scene.edges.map((r) => `${r.id}:${r.source}>${r.target}`).sort());
    expect(faults(off)).toEqual([]);
  });
});


/** **A projection is a pure function, and the drawing depends on it.**
 *
 *  Every node component is memoised on what it draws rather than on the object
 *  it arrives in, precisely because these objects are rebuilt on every render
 *  of the app. That only works while two runs over one graph say the same
 *  thing — if a projection ever varies, every card on the layer re-renders on
 *  every keystroke and the canvas goes back to feeling stuck. */
describe("the same graph projects the same scene", () => {
  it("says the same thing twice", () => {
    const graph = fold(related());
    expect(project(graph, "block_loop"))
      .toEqual(project(graph, "block_loop"));
  });
});
