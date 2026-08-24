/** The block view proves every Scene it emits is well-formed.
 *
 *  A producer proves its output satisfies the invariants; a consumer proves it
 *  handles anything that does. Neither imports the other. */

import { describe, expect, it } from "vitest";
import { fixture, flat, nested, related, NAMES as FIXTURES } from "@mnd/fixtures";
import { children, fold, session, ROOT, type Graph, type Id } from "@mnd/core";
import { block, draw, faults, matrix, outline, reseat, rewall, table, view, views, EMPTY,
         type Scene } from "../src/index";

const NAMES = FIXTURES;

function layers(graph: Graph): (Id | null)[] {
  return [null, ...Object.keys(graph.blocks)];
}

describe("every scene is well-formed", () => {
  it.each(NAMES)("over every layer of %s", (name) => {
    const graph = fold(fixture(name));
    for (const layer of layers(graph)) {
      expect(faults(block.project(graph, layer)), `layer ${layer}`).toEqual([]);
    }
  });

  it("over an empty workspace", () => {
    expect(faults(block.project(fold([]), null))).toEqual([]);
  });

  it("and the empty scene is well-formed except for having no bounds", () => {
    expect(faults({ ...EMPTY, bounds: { w: 1, h: 1 } })).toEqual([]);
  });
});

describe("the invariants catch what they are for", () => {
  const good = block.project(fold(related()), "block_loop");

  it("a route reaching a box that is not drawn", () => {
    const bad: Scene = { ...good,
      routes: [{ ...good.routes[0]!, to: "nowhere" }] };
    expect(faults(bad)).toContainEqual(expect.stringContaining("not drawn"));
  });

  it("a bend that is not square", () => {
    const bad: Scene = { ...good, routes: [{ ...good.routes[0]!,
      points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }] };
    expect(faults(bad)).toContainEqual(expect.stringContaining("not square"));
  });

  it("a box with no size", () => {
    const bad: Scene = { ...good, boxes: [{ ...good.boxes[0]!, w: 0 }] };
    expect(faults(bad)).toContainEqual(expect.stringContaining("no size"));
  });

  it("two boxes sharing an id", () => {
    const bad: Scene = { ...good, boxes: [good.boxes[0]!, good.boxes[0]!] };
    expect(faults(bad)).toContainEqual(expect.stringContaining("share an id"));
  });
});

describe("what the projection shows", () => {
  it("draws one box per unit in the layer, and no more", () => {
    const graph = fold(nested());
    const scene = block.project(graph, "block_ledger");
    expect(scene.boxes.map((b) => b.id).sort())
      .toEqual(children(graph, "block_ledger").map((b) => b.id).sort());
  });

  it("draws nothing from another layer", () => {
    const graph = fold(nested());
    const scene = block.project(graph, "block_ledger");
    expect(scene.boxes.map((b) => b.id)).not.toContain("block_rate");
  });

  it("gives every box a hit, and every route one too", () => {
    const scene = block.project(fold(related()), "block_loop");
    for (const b of scene.boxes) expect(scene.hits.some((h) => h.on === b.id)).toBe(true);
    for (const r of scene.routes) expect(scene.hits.some((h) => h.on === r.id)).toBe(true);
  });

  it("marks how a block reads without anything declaring it", () => {
    const scene = block.project(fold(related()), "block_loop");
    const mark = (id: string) => scene.boxes.find((b) => b.id === id)!.marks;
    expect(mark("block_note")).toContain("note");
    expect(mark("block_hot")).toContain("group");
    expect(mark("block_pump")).not.toContain("container");
  });

  it("sizes a boundary to what it holds", () => {
    const scene = block.project(fold(related()), "block_loop");
    const group = scene.boxes.find((b) => b.marks.includes("group"))!;
    for (const id of ["block_hx", "block_tank"]) {
      const box = scene.boxes.find((b) => b.id === id)!;
      expect(box.x).toBeGreaterThanOrEqual(group.x);
      expect(box.x + box.w).toBeLessThanOrEqual(group.x + group.w);
    }
  });

  it("reads a reference's target, and says missing when it is gone", () => {
    const s = session();
    s.go("create", { label: "Ledger" });
    const ledger = children(s.graph(), ROOT)[0]!.id;
    s.go("create", { label: "Auth", parent: ledger });
    const auth = children(s.graph(), ledger)[0]!.id;
    s.go("refer", { target: auth });

    const ref = () => block.project(s.graph(), null).boxes.find((b) =>
      b.marks.includes("reference"))!;
    expect(ref().label).toBe("Auth");

    s.go("delete", { id: auth });
    expect(ref().marks).toContain("missing");
  });

  it("carries a trail from the root down to the layer", () => {
    const graph = fold(nested());
    const trail = block.project(graph, "block_rate").trail.map((t) => t.id);
    expect(trail[0]).toBe(ROOT);
    expect(trail.at(-1)).toBe("block_rate");
  });

  /** A slot says what the projection **can** offer, never what it is doing —
   *  so hiding interfaces must not take away the control that shows them. */
  it("offers the control groups it can answer, hiding one or not", () => {
    const graph = fold(related());
    expect(block.project(graph, "block_loop").slots).toContain("interfaces");
    expect(block.project(graph, "block_loop", { interfaces: false }).slots)
      .toContain("interfaces");
  });

  it("still draws no interface when it is told to hide them", () => {
    const graph = fold(fixture("interfaced"));
    const off = block.project(graph, "block_loop", { interfaces: false });
    expect(off.boxes.some((b) => b.marks.includes("interface"))).toBe(false);
  });

  it("is a pure function of the graph — it writes nothing", () => {
    const graph = fold(related());
    const before = structuredClone(graph);
    block.project(graph, "block_loop");
    expect(graph).toEqual(before);
  });

  it("is stable — projecting twice gives the same scene", () => {
    const graph = fold(related());
    expect(block.project(graph, "block_loop")).toEqual(block.project(graph, "block_loop"));
  });
});

describe("the text renderer", () => {
  it("draws a scene as shape rather than coordinates", () => {
    const scene = block.project(fold(related()), "block_loop");
    const picture = draw(scene);
    expect(picture).toContain("[Pump");
    expect(picture.split("\n").length).toBeGreaterThan(1);
  });

  it("says so rather than drawing nothing for an empty layer", () => {
    expect(draw(block.project(fold(flat()), "block_edge"))).toBe("(empty)");
  });

  it("outlines what a scene holds", () => {
    const text = outline(block.project(fold(related()), "block_loop"));
    expect(text).toContain("Coolant Loop");
    expect(text).toContain("-->");
  });

  it("draws every fixture without throwing", () => {
    for (const name of NAMES) {
      const graph = fold(fixture(name));
      for (const layer of layers(graph)) {
        expect(() => draw(block.project(graph, layer))).not.toThrow();
      }
    }
  });
});

describe("interfaces are seated, not placed", () => {
  const scene = block.project(fold(fixture("interfaced")), "block_loop");
  const port = () => scene.boxes.find((b) => b.id === "port_out")!;

  it("draws one, on the card it belongs to", () => {
    expect(port().on).toBe("block_pump");
    expect(port().marks).toContain("interface");
  });

  it("marks which way it flows, and the mark constrains nothing", () => {
    expect(port().marks).toContain("out");
    expect(scene.boxes.find((b) => b.id === "port_in")!.marks).toContain("in");
  });

  it("answers a gesture as a seat rather than as a card", () => {
    const hit = scene.hits.find((h) => h.on === "port_out")!;
    expect(hit.kind).toBe("seat");
  });

  it("lands a relationship on the seat it names", () => {
    const line = scene.routes.find((r) => r.id === "edge_flow")!;
    expect([line.from, line.to]).toEqual(["port_out", "port_in"]);
  });

  it("hides the seats and never the lines", () => {
    const off = block.project(fold(fixture("interfaced")), "block_loop", { interfaces: false });
    expect(off.boxes.some((b) => b.marks.includes("interface"))).toBe(false);
    expect(off.routes.map((r) => r.id).sort()).toEqual(scene.routes.map((r) => r.id).sort());
    expect(faults(off)).toEqual([]);
  });
});

describe("what a positional drag is asking for", () => {
  const scene = block.project(fold(fixture("interfaced")), "block_loop");
  const on = scene.boxes.find((b) => b.id === "block_pump")!;

  it("seats an interface on the wall the point is nearest", () => {
    const above = reseat(scene, "port_out", { x: on.x + on.w / 2, y: on.y - 20 })!;
    expect(above.side).toBe("top");
    expect(above.at).toBeGreaterThan(0);
  });

  it("says nothing about a box that is seated on nothing", () => {
    expect(reseat(scene, "block_pump", { x: 0, y: 0 })).toBeNull();
    expect(reseat(scene, "nobody", { x: 0, y: 0 })).toBeNull();
  });

  it("walls a line's end by the card the end is on, never by the seat", () => {
    expect(rewall(scene, "edge_flow", "from", { x: on.x + on.w / 2, y: on.y - 20 })).toBe("top");
    expect(rewall(scene, "nothing", "from", { x: 0, y: 0 })).toBeNull();
  });
});

describe("one behavior layer, read three ways", () => {
  const graph = fold(fixture("behaved"));
  const LAYER = "block_flow";
  const of = (reading?: "activity" | "sequence" | "state") =>
    block.project(graph, LAYER, reading ? { reading } : {});
  const lanes = (s: Scene) => s.boxes.filter((b) => b.marks.includes("lane"));

  it.each([undefined, "activity", "sequence", "state"] as const)(
    "is well-formed read as %s", (reading) => {
      expect(faults(of(reading))).toEqual([]);
    });

  it("reads a behavior layer as an activity when nobody says otherwise", () => {
    expect(of()).toEqual(of("activity"));
  });

  it("draws one lane per participant, named through the reference", () => {
    expect(lanes(of("activity")).map((b) => b.label))
      .toEqual(["Pump", "Heat Exchanger", "Reservoir"]);
  });

  it("draws the same lanes as columns in a sequence, and hangs a lifeline", () => {
    const seq = of("sequence");
    expect(lanes(seq).map((b) => b.label)).toEqual(lanes(of("activity")).map((b) => b.label));
    expect(seq.boxes.filter((b) => b.marks.includes("lifeline")))
      .toHaveLength(lanes(seq).length);
  });

  it("stands a sequence's columns side by side and runs its order down", () => {
    const seq = of("sequence");
    const [first, second] = lanes(seq);
    expect(second!.x).toBeGreaterThan(first!.x);
    expect(second!.y).toBe(first!.y);
    const act = (id: string) => seq.boxes.find((b) => b.id === id)!;
    expect(act("act_hx").y).toBeGreaterThan(act("act_pump").y);
  });

  it("draws no lane in a state reading — a machine is about one thing", () => {
    expect(lanes(of("state"))).toEqual([]);
  });

  it("counts a branch as a fork and what it rejoins as a join", () => {
    const kinds = of("activity").boxes.filter((b) => b.marks.includes("control"))
      .flatMap((b) => b.marks.filter((m) => m !== "control"));
    expect(kinds.sort()).toEqual(["fork", "join"]);
  });

  it("takes every branch through the control, keeping its own id", () => {
    const act = of("activity");
    const fork = act.boxes.find((b) => b.marks.includes("fork"))!;
    expect(act.routes.find((r) => r.id === "order_a")!.from).toBe(fork.id);
    expect(act.routes.map((r) => r.id)).toContain("order_b");
  });

  it("draws no control in a sequence — order already runs down the page", () => {
    expect(of("sequence").boxes.some((b) => b.marks.includes("control"))).toBe(false);
  });

  it("offers no gesture on anything derived", () => {
    for (const scene of [of("activity"), of("sequence"), of("state")]) {
      const derived = scene.boxes.filter((b) =>
        b.marks.includes("lane") || b.marks.includes("lifeline") || b.marks.includes("control"));
      for (const b of derived) expect(scene.hits.some((h) => h.on === b.id)).toBe(false);
    }
  });

  it("offers columns where a plane offers an arrangement", () => {
    expect(of("sequence").slots).toContain("columns");
    expect(of("activity").slots).toContain("arrange");
  });
});

describe("the two projections that are not a plane", () => {
  const graph = fold(fixture("related"));
  const LAYER = "block_loop";

  it("is registered under the name core owns, with a word and a glyph of its own", () => {
    expect(views().map((v) => v.name).sort()).toEqual(["block", "matrix", "table"]);
    expect(new Set(views().map((v) => v.icon)).size).toBe(3);
    expect(new Set(views().map((v) => v.word)).size).toBe(3);
    expect(view("nothing")).toBeNull();
  });

  it.each(["block", "table", "matrix"])("emits a well-formed Scene from %s", (name) => {
    for (const layer of layers(graph)) {
      expect(faults(view(name)!.project(graph, layer)), `${name} on ${layer}`).toEqual([]);
    }
  });

  describe("table", () => {
    const scene = table.project(graph, LAYER);
    const head = scene.boxes.filter((b) => b.marks.includes("header"));

    it("draws no frame — a table is a list and has no inside", () => {
      expect(scene.frame).toBeUndefined();
    });

    it("gives one row per thing the layer holds", () => {
      const rows = scene.boxes.filter((b) => !b.marks.includes("header")
                                          && !b.marks.includes("cell"));
      expect(rows.map((b) => b.id).sort())
        .toEqual(children(graph, LAYER).map((b) => b.id).sort());
    });

    it("names a column for every field the rows carry, and none they do not", () => {
      const fielded: Graph = structuredClone(graph);
      fielded.blocks["block_pump"]!.fields = [{ name: "duty", form: "text", value: "high" }];
      const with_field = table.project(fielded, LAYER);
      expect(with_field.boxes.filter((b) => b.marks.includes("header")).map((b) => b.label))
        .toEqual(["name", "duty"]);
      expect(head.map((b) => b.label)).toEqual(["name"]);
    });

    it("answers a cell as a field and a row as a block", () => {
      const fielded: Graph = structuredClone(graph);
      fielded.blocks["block_pump"]!.fields = [{ name: "duty", form: "text", value: "high" }];
      const scene2 = table.project(fielded, LAYER);
      expect(scene2.hits.find((h) => h.on === "block_pump:duty")!.kind).toBe("field");
      expect(scene2.hits.find((h) => h.on === "block_pump")!.kind).toBe("box");
    });

    it("offers columns and types, and nothing a plane offers", () => {
      expect([...scene.slots].sort()).toEqual(["columns", "types"]);
    });
  });

  describe("matrix", () => {
    const scene = matrix.project(graph, LAYER);
    const cell = (row: string, col: string) => scene.boxes.find((b) => b.id === `${row}:${col}`)!;

    it("names both axes from the same layer, once each way", () => {
      const here = children(graph, LAYER).map((b) => b.id);
      for (const id of here) {
        expect(scene.boxes.some((b) => b.id === `row:${id}`)).toBe(true);
        expect(scene.boxes.some((b) => b.id === `column:${id}`)).toBe(true);
      }
    });

    it("fills the cell where a relationship already runs, both ways round", () => {
      expect(cell("block_pump", "block_hx").marks).toContain("filled");
      expect(cell("block_hx", "block_pump").marks).toContain("filled");
    });

    it("leaves a cell empty where nothing relates them", () => {
      expect(cell("block_pump", "block_valve").marks).not.toContain("filled");
    });

    it("draws a cell for every pair, and no route — a matrix has no lines", () => {
      const here = children(graph, LAYER).length;
      expect(scene.boxes.filter((b) => b.marks.includes("cell"))).toHaveLength(here * here);
      expect(scene.routes).toEqual([]);
    });
  });
});
