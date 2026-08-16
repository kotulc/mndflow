/** Properties of the contents tray — what a layer lists, what filters
 *  expose, and that constraints/rules advise without blocking the table.
 *
 *  Rendered to markup in Node: the tray's settled claims are about which
 *  rows and chips appear, not pointer coordinates or copy wording. */

import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Contents } from "../../src/page/Contents";
import { fold } from "../../src/graph/fold";
import {
  definition, edge, element, field, refTo, step, type Graph, type Mutation,
} from "../../src/graph/types";

type Props = ComponentProps<typeof Contents>;

const silent = () => {};

/** Handlers that never fire — the suite reads the markup, not callbacks. */
function handlers(): Omit<Props, "graph" | "view" | "picked" | "unit"> {
  return {
    onPick: silent,
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
