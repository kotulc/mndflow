/** Properties of the shared argument-filling layer.
 *
 *  These are the rules three copied versions disagreed about, which is what
 *  let a menu offer a tie whose note and holder were one card. Properties, not
 *  values: nothing here asserts an id, a label or a count. */

import { describe, expect, it } from "vitest";

import { fill, fillable, rank, ORDER, type Supply } from "../../src/actions/fill";
import { lookup, type Action, type Context } from "../../src/actions/index";
import "../../src/actions/groups";
import "../../src/actions/elements";
import "../../src/actions/fields";
import { fold } from "../../src/graph/fold";
import { element, step, type Mutation } from "../../src/graph/types";

function graph_of(...mutations: Mutation[]) {
  return fold([step("", "test", mutations)]);
}

function at(graph: Context["graph"], view: string | null = null): Context {
  return { graph, view, picked: null };
}

function supply(ids: string[], over: Partial<Supply> = {}): Supply {
  return { ids, view: null, ...over };
}

/** A layer holding two blocks, a note and a group with one member. */
function scene() {
  return graph_of(
    { op: "add_element", element: element("A", { id: "a" }) },
    { op: "add_element", element: element("B", { id: "b" }) },
    { op: "add_element", element: element("N", { id: "n", form: "note" }) },
    { op: "add_element", element: element("G", { id: "g", form: "group" }) },
    { op: "join_group", id: "a", group: "g" },
  );
}

function act(name: string): Action {
  const held = lookup(name);
  expect(held?.name).toBe(name);
  return held as Action;
}

describe("an element argument takes a candidate of its own", () => {
  it("never gives two element arguments the same id", () => {
    const graph = scene();
    const args = fill(act("tie"), at(graph), supply(["n", "b"]));
    const ids = act("tie").args
      .filter((a) => a.kind === "element")
      .map((a) => args[a.name])
      .filter((v) => typeof v === "string");

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("leaves an argument empty rather than reusing the one candidate", () => {
    const graph = scene();
    const tie = act("tie");
    const args = fill(tie, at(graph), supply(["n"]));
    const filled = tie.args.filter((a) => a.kind === "element" && a.name in args);

    expect(filled.length).toBeLessThan(
      tie.args.filter((a) => a.kind === "element").length,
    );
  });

  it("withholds the action when a required element cannot be filled", () => {
    const graph = scene();
    expect(fillable(act("tie"), at(graph), supply(["n"], { prompts: true }))).toBe(false);
  });
});

describe("a form on an argument narrows what fills it", () => {
  it("takes a candidate of the form it asks for", () => {
    const graph = scene();
    const args = fill(act("tie"), at(graph), supply(["b", "n"]));

    expect(graph.elements[String(args.note)]?.form).toBe("note");
  });

  it("reads the enclosing group for a required group argument", () => {
    const graph = scene();
    const args = fill(act("leave"), at(graph), supply(["a"]));

    expect(args.id).toBe("a");
    expect(graph.elements[String(args.group)]?.form).toBe("group");
    expect(args.group).not.toBe(args.id);
  });

  it("leaves an optional group argument empty rather than reading the enclosing one", () => {
    const graph = scene();
    const args = fill(act("group"), at(graph), supply(["a"]));

    // `into` empty is what means *make a new group* rather than join one.
    expect("into" in args).toBe(false);
  });
});

describe("the layer in view", () => {
  it("fills a container argument, and a null view counts as filled", () => {
    const graph = scene();
    const args = fill(act("create"), at(graph, null), supply([]));

    expect("parent" in args).toBe(true);
    expect(args.parent).toBeNull();
  });
});

describe("text is the surface's business", () => {
  it("offers a promptable word to a surface that can ask", () => {
    const graph = scene();
    expect(fillable(act("create"), at(graph), supply([], { prompts: true }))).toBe(true);
  });

  it("withholds it from a surface that cannot", () => {
    const graph = scene();
    expect(fillable(act("create"), at(graph), supply([]))).toBe(false);
  });

  it("fills a text argument from words the surface already has", () => {
    const graph = scene();
    const args = fill(act("create"), at(graph), supply([], { text: "  Pump  " }));

    // `create`'s word is `label`; the rule is that the surface's text fills
    // the text argument, whatever it is called.
    expect(args.label).toBe("Pump");
  });

  it("never treats a word with no prompt as askable", () => {
    const graph = scene();
    const undefine = act("undefine");
    const asked = undefine.args.some((a) => !a.optional && a.kind === "text" && a.prompt);

    expect(asked).toBe(false);
    expect(fillable(undefine, at(graph), supply([], { prompts: true }))).toBe(false);
  });
});

describe("order", () => {
  it("ranks a known action ahead of one it does not list", () => {
    expect(rank(ORDER[0])).toBeLessThan(rank("nothing.by.that.name"));
  });
});
