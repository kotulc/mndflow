/** Properties of the contents tray — what a layer lists, what filters
 *  expose, that constraints/rules advise without blocking the table, and
 *  (T.5) what actually happens on a click, a sort or a hover.
 *
 *  Static shape is read from markup rendered in Node; anything that needs a
 *  pointer or an effect to fire is driven through the happy-dom harness with
 *  `@testing-library/react`, whose queries are role and text — properties of
 *  the markup, never a coordinate or a copy string. */

import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Contents } from "../../src/page/Contents";
import { fold } from "../../src/graph/fold";
import {
  definition, edge, element, field, refTo, step, type Graph, type Mutation,
} from "../../src/graph/types";

type Props = ComponentProps<typeof Contents>;
type Handlers = Omit<Props, "graph" | "view" | "picked" | "unit">;

const silent = () => {};

/** Handlers that never fire — the SSR suite reads markup, not callbacks. */
function handlers(): Handlers {
  return {
    onPick: silent,
    onOpen: silent,
    onHint: silent,
    onRename: silent,
    onRetype: silent,
    onRelation: silent,
    onNameTaken: () => false,
    onSay: silent,
    onDelete: silent,
    onUnlink: silent,
    onSave: silent,
    onSetDir: silent,
    onFlip: silent,
    onMarkPort: silent,
    onAddField: silent,
    onUpdateField: silent,
    onDropField: silent,
    onLeaveGroup: silent,
    onReveal: silent,
    onDefine: silent,
    onUndefine: silent,
  };
}

/** The same handlers as spies — the interactive suite reads what fired. */
function spies(): Handlers {
  return {
    onPick: vi.fn(),
    onOpen: vi.fn(),
    onHint: vi.fn(),
    onRename: vi.fn(),
    onRetype: vi.fn(),
    onRelation: vi.fn(),
    onNameTaken: vi.fn(() => false),
    onSay: vi.fn(),
    onDelete: vi.fn(),
    onUnlink: vi.fn(),
    onSave: vi.fn(),
    onSetDir: vi.fn(),
    onFlip: vi.fn(),
    onMarkPort: vi.fn(),
    onAddField: vi.fn(),
    onUpdateField: vi.fn(),
    onDropField: vi.fn(),
    onLeaveGroup: vi.fn(),
    onReveal: vi.fn(),
    onDefine: vi.fn(),
    onUndefine: vi.fn(),
  };
}

afterEach(cleanup);

function drawn(...mutations: Mutation[]): Graph {
  return fold([step("", "test", mutations)]);
}

function markup(graph: Graph, extra: Partial<Props> = {}): string {
  return renderToStaticMarkup(createElement(Contents, {
    graph,
    view: null,
    picked: null,
    unit: "block",
    ...handlers(),
    ...extra,
  }));
}

/** Mount into the happy-dom document, wired to spies, so a click or a hover
 *  can be fired at it. `rerenderWith` reuses the same spies across a
 *  rerender — the strip's advise effect only fires on a prop change. */
function draw(graph: Graph, extra: Partial<Props> = {}) {
  const calls = spies();
  const of = (patch: Partial<Props>) => createElement(Contents, {
    graph, view: null, picked: null, unit: "block", ...calls, ...extra, ...patch,
  });
  const view = render(of({}));

  return { ...view, calls, rerenderWith: (patch: Partial<Props>) => view.rerender(of(patch)) };
}

/** One of each tray sort — a group only lists once it holds a member, and a
 *  relationship only when both ends are drawn (blocks / proxies / ports). */
function layered() {
  const a = element("Pump", { parent: null });
  const b = element("Valve", { parent: null });
  const port = element("inlet", { parent: a.id, side: "left", at: 0.5, flow: "in" });
  const group = element("Set", { form: "group", parent: null });
  const note = element("watch the seal", { form: "note", parent: null });
  const link = edge(a.id, b.id, { form: "directed", dir: "forward", type: "drives" });

  return {
    graph: drawn(
      { op: "add_element", element: a },
      { op: "add_element", element: b },
      { op: "add_element", element: port },
      { op: "add_element", element: group },
      { op: "add_element", element: note },
      { op: "join_group", id: a.id, group: group.id },
      { op: "link_elements", edge: link },
    ),
    a, b, port, group, note, link,
  };
}

/** A block that holds one child — the "narrows to its own contents" case. */
function nested() {
  const box = element("Box", { parent: null });
  const bolt = element("Bolt", { parent: box.id });

  return {
    graph: drawn(
      { op: "add_element", element: box },
      { op: "add_element", element: bolt },
    ),
    box, bolt,
  };
}

/** Every body row's kind cell, in table order. */
function kinds(html: string): string[] {
  return [...html.matchAll(/<td class="sort">([^<]*)<\/td>/g)].map((m) => m[1]!);
}

/** Filter chip labels that are enabled (a form with something to show). */
function enabled(html: string): string[] {
  const chips = [...html.matchAll(/<button([^>]*)>([^<]*)\s*<i>/g)];
  return chips
    .filter(([, attrs]) => !/\bdisabled\b/.test(attrs ?? ""))
    .map(([, , label]) => (label ?? "").trim());
}

describe("what an empty layer shows", () => {
  it("says the layer holds nothing, and keeps every form filter shut", () => {
    const html = markup(drawn());

    expect(html).toMatch(/Nothing in this layer yet/);
    expect(html).not.toMatch(/contents-table/);
    expect(enabled(html)).toEqual(["types"]);
  });
});

describe("what a layer lists", () => {
  it("lists every sort the layer holds, and never a project type among them", () => {
    const { graph } = layered();
    const withType = {
      ...graph,
      defs: {
        ...graph.defs,
        def_part: definition("Part", { id: "def_part", form: "block", fields: [] }),
      },
    };
    const listed = kinds(markup(withType));

    expect(listed).toEqual(expect.arrayContaining([
      "block", "interface", "group", "note", "relationship",
    ]));
    expect(listed).not.toContain("type");
    expect(listed).not.toContain("definition");
  });

  it("opens a filter chip for each sort that has a row, and leaves empty ones shut", () => {
    const { graph } = layered();
    const open = enabled(markup(graph));

    expect(open).toEqual(expect.arrayContaining([
      "all", "blocks", "interfaces", "relationships", "groups", "notes", "types",
    ]));
  });

  it("keeps a form filter shut when that sort is absent", () => {
    const block = element("Alone", { parent: null });
    const html = markup(drawn({ op: "add_element", element: block }));
    const open = enabled(html);

    expect(open).toContain("blocks");
    expect(open).toContain("all");
    expect(open).not.toContain("interfaces");
    expect(open).not.toContain("relationships");
    expect(open).not.toContain("groups");
    expect(open).not.toContain("notes");
  });

  it("orders by sort then name when nothing has been asked of the columns", () => {
    const { graph } = layered();
    const listed = kinds(markup(graph));
    const order = ["block", "interface", "relationship", "group", "note"];
    const ranks = listed.map((k) => order.indexOf(k));

    expect(ranks.every((r) => r >= 0)).toBe(true);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

describe("constraint and rule notes", () => {
  it("advises a missing required field on the row, and still draws the table", () => {
    const typed = element("Need", { parent: null, type: "def_need" });
    const graph = drawn(
      { op: "set_def", id: "def_need", name: "Needful", form: "block",
        fields: [field("id")],
        components: { constraints: { required: ["id"] } } },
      { op: "add_element", element: typed },
    );
    const html = markup(graph);

    expect(html).toMatch(/contents-table/);
    expect(html).toMatch(/class="error"/);
    expect(html).toMatch(/needs id/);
  });

  it("stays quiet when required fields already carry a value", () => {
    const typed = element("Have", { parent: null, type: "def_have" });
    const graph = drawn(
      { op: "set_def", id: "def_have", name: "Haveful", form: "block",
        fields: [field("id")],
        components: { constraints: { required: ["id"] } } },
      { op: "add_element", element: typed },
      { op: "set_field", id: typed.id, name: "id", form: "text", value: "x" },
    );
    const html = markup(graph);

    expect(html).toMatch(/contents-table/);
    expect(html).not.toMatch(/class="error"/);
  });

  it("advises a relationship whose ends break its rule, without refusing the row", () => {
    const from = element("A", { parent: null, type: "def_a" });
    const to = element("B", { parent: null, type: "def_b" });
    const link = edge(from.id, to.id, {
      form: "directed", dir: "forward", type: "def_rel",
    });
    const graph = drawn(
      { op: "set_def", id: "def_a", name: "A", form: "block" },
      { op: "set_def", id: "def_b", name: "B", form: "block" },
      { op: "set_def", id: "def_rel", name: "Join", form: "directed",
        components: { rules: { ends: { from: ["def_b"], to: ["def_a"] } } } },
      { op: "add_element", element: from },
      { op: "add_element", element: to },
      { op: "link_elements", edge: link },
    );
    const html = markup(graph);

    expect(kinds(html)).toContain("relationship");
    expect(html).toMatch(/class="error"/);
    expect(html).toMatch(/from end|to end/);
  });
});

describe("proxies", () => {
  it("lists a proxy as a block and says what it stands for", () => {
    const stand = element("", {
      parent: null, form: "proxy", of: refTo("gone", "proj_other"),
    });
    const html = markup(drawn({ op: "add_element", element: stand }));

    expect(kinds(html)).toEqual(["block"]);
    expect(html).toMatch(/stands for/);
  });
});

// T.5's leftovers: what a click, a sort or a hover actually does. Driven
// through happy-dom rather than read off static markup.

describe("filter chips narrow the table", () => {
  it("clicking a chip shows only that sort; 'all' brings the rest back", () => {
    const { graph } = layered();
    const { container } = draw(graph);

    fireEvent.click(screen.getByRole("button", { name: /^blocks\b/ }));
    const only = kinds(container.innerHTML);
    expect(only.length).toBeGreaterThan(0);
    expect(only.every((k) => k === "block")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /^all\b/ }));
    expect(kinds(container.innerHTML)).toEqual(expect.arrayContaining([
      "block", "interface", "group", "note", "relationship",
    ]));
  });
});

describe("the name column sorts", () => {
  /** The name cell's text — the row order is what is under test, not the
   *  fixture's own names. */
  function names(html: string): string[] {
    return [...html.matchAll(/<td class="name"[^>]*>[\s\S]*?<\/td>/g)]
      .map((m) => (m[0].match(/<span[^>]*>([^<]*)<\/span>/)?.[1] ?? "").trim());
  }

  it("clicking the header sorts by name; clicking it again reverses it", () => {
    const { graph } = layered();
    const { container } = draw(graph);

    fireEvent.click(screen.getByRole("columnheader", { name: /^name/ }));
    const ascending = names(container.innerHTML);
    expect(ascending).toEqual([...ascending].sort((a, b) => a.localeCompare(b)));

    fireEvent.click(screen.getByRole("columnheader", { name: /^name/ }));
    expect(names(container.innerHTML)).toEqual([...ascending].reverse());
  });
});

describe("clicking a row picks it", () => {
  it("picks a block as a node", () => {
    const { graph, a } = layered();
    const { calls } = draw(graph);

    fireEvent.click(screen.getByText("Pump").closest("tr")!);

    expect(calls.onPick).toHaveBeenCalledWith({ kind: "node", id: a.id });
  });

  it("picks a relationship as an edge", () => {
    const { graph, link } = layered();
    const { calls } = draw(graph);

    fireEvent.click(screen.getByText("drives").closest("tr")!);

    expect(calls.onPick).toHaveBeenCalledWith({ kind: "edge", id: link.id });
  });
});

describe("hovering a row lights what it draws on the canvas", () => {
  it.each([
    ["Pump", "card", (f: ReturnType<typeof layered>) => f.a.id],
    ["inlet", "port", (f: ReturnType<typeof layered>) => f.port.id],
    ["Set", "group", (f: ReturnType<typeof layered>) => f.group.id],
    ["watch the seal", "title", (f: ReturnType<typeof layered>) => f.note.id],
    ["drives", "edge", (f: ReturnType<typeof layered>) => f.link.id],
  ] as const)("entering the %s row hints a %s", (text, kind, idOf) => {
    const fixture = layered();
    const { calls } = draw(fixture.graph);

    fireEvent.mouseEnter(screen.getByText(text).closest("tr")!);

    expect(calls.onHint).toHaveBeenCalledWith({ kind, id: idOf(fixture) });
  });

  it("clears the hint on leaving the tray", () => {
    const { graph } = layered();
    const { calls, container } = draw(graph);

    fireEvent.mouseEnter(screen.getByText("Pump").closest("tr")!);
    fireEvent.mouseLeave(container.querySelector(".contents")!);

    expect(calls.onHint).toHaveBeenLastCalledWith(null);
  });
});

describe("the strip advises the selection", () => {
  it("says the full sentence once a noted row becomes picked", () => {
    const typed = element("Need", { parent: null, type: "def_need" });
    const graph = drawn(
      { op: "set_def", id: "def_need", name: "Needful", form: "block",
        fields: [field("id")],
        components: { constraints: { required: ["id"] } } },
      { op: "add_element", element: typed },
    );
    const { calls, rerenderWith } = draw(graph);

    rerenderWith({ picked: { kind: "node", id: typed.id } });

    expect(calls.onSay).toHaveBeenCalledWith(expect.stringContaining("needs a value for id"));
  });

  it("stays quiet when the picked row carries no notes", () => {
    const plain = element("Fine", { parent: null });
    const graph = drawn({ op: "add_element", element: plain });
    const { calls, rerenderWith } = draw(graph);

    rerenderWith({ picked: { kind: "node", id: plain.id } });

    expect(calls.onSay).not.toHaveBeenCalled();
  });
});

// The crumb and descend U.18 wired for table and matrix, restored on Contents
// after W.1 deleted the module that used to carry them (W.1 repair).

describe("the crumb trail draws only at full stage size", () => {
  it("draws at full and not at partial", () => {
    const { graph } = nested();

    expect(markup(graph, { full: true, path: [] })).toMatch(/class="crumbs"/);
    expect(markup(graph, { full: false })).not.toMatch(/class="crumbs"/);
  });

  it("uses the trail it is given rather than deriving one from the graph", () => {
    const { graph, box } = nested();
    // A derived trail would read "Box" off the graph; an empty one passed
    // in deliberately disagrees, so seeing no crumb for it proves the prop
    // won rather than a graph walk repeating what U.18 already computed.
    const html = markup(graph, { full: true, view: box.id, path: [] });

    expect(html).not.toMatch(/>Box</);
  });
});

describe("double-clicking a block's row descends into it", () => {
  it("opens a container from the row", () => {
    const { graph, box } = nested();
    const { calls } = draw(graph);

    fireEvent.dblClick(screen.getByText("Box").closest("tr")!);
    expect(calls.onOpen).toHaveBeenCalledWith(box.id);
  });

  it("leaves the name cell free for rename instead of descend", () => {
    const { graph } = nested();
    const { calls } = draw(graph);

    fireEvent.dblClick(screen.getByText("Box").closest("td.name")!);
    expect(calls.onOpen).not.toHaveBeenCalled();
  });

  it("withholds descend from a proxy, which has nowhere to go", () => {
    const stand = element("", { parent: null, form: "proxy", of: refTo("gone", "proj_other") });
    const graph = drawn({ op: "add_element", element: stand });
    const { calls, container } = draw(graph);

    fireEvent.dblClick(container.querySelector(".contents-table tbody tr")!);
    expect(calls.onOpen).not.toHaveBeenCalled();
  });
});

describe("the tray scopes to what is in focus (W.2)", () => {
  it("full shows the whole layer even when something is picked", () => {
    const { graph, a } = layered();
    const html = markup(graph, { full: true, picked: { kind: "node", id: a.id } });

    expect(html).toMatch(/contents-tabs/);
    expect(kinds(html)).toEqual(expect.arrayContaining([
      "block", "interface", "group", "note", "relationship",
    ]));
  });

  it("partial narrows to a picked container's own contents", () => {
    const { graph, box, bolt } = nested();
    const html = markup(graph, { full: false, picked: { kind: "node", id: box.id } });

    expect(kinds(html)).toEqual(["block"]);
    expect(html).toMatch(new RegExp(bolt.label));
    expect(html).not.toMatch(/>Box</);
  });

  it("partial narrows to a picked group's own members", () => {
    const { graph, group, a, b } = layered();
    const html = markup(graph, { full: false, picked: { kind: "node", id: group.id } });

    expect(kinds(html)).toEqual(["block"]);
    expect(html).toMatch(new RegExp(a.label));
    expect(html).not.toMatch(new RegExp(b.label));
  });

  it("partial shows the layer when nothing is picked", () => {
    const { graph, box } = nested();
    const html = markup(graph, { full: false, picked: null });

    expect(html).toMatch(new RegExp(box.label));
  });

  it("opens a leaf block's own row instead of an empty table", () => {
    const plain = element("Fine", { parent: null });
    const graph = drawn({ op: "add_element", element: plain });
    const html = markup(graph, { full: false, picked: { kind: "node", id: plain.id } });

    expect(html).not.toMatch(/contents-tabs/);
    expect(html).toMatch(/class="opened"/);
  });

  it("stops at a relationship's summary row, with no editable field it would refuse", () => {
    const { graph, link } = layered();
    const html = markup(graph, { full: false, picked: { kind: "edge", id: link.id } });

    expect(html).not.toMatch(/contents-tabs/);
    expect(html).not.toMatch(/class="opened"/);
    expect(kinds(html)).toEqual(["relationship"]);
  });
});
