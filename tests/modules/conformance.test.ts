/** The contract every published component and view module keeps, run over all
 *  of them at once.
 *
 *  These were nine tests copied into each module's own file, which meant a new
 *  component was held to the contract only if somebody remembered to copy them
 *  again. Here it is held by **being published** — add a component to the table
 *  below and the whole contract runs against it.
 *
 *  What stays in a module's own file is what only that module can say: which
 *  shapes a card has, what a rule kind means, how a table lays a row out. This
 *  file holds only what is true of *every* one of them. */

import { describe, expect, it } from "vitest";

import { EMPTY, element, type Element, type Graph } from "../../src/graph/types";
import { CHROME } from "../../src/modules/view/diagram/surface";
import { MODULES, named, views } from "../../src/modules/view/index";
import { card, cardOf } from "../../src/modules/card/index";
import { constraints, constraintsOf } from "../../src/modules/constraints/index";
import { rules, rulesOf } from "../../src/modules/rules/index";
import { style, styleOf } from "../../src/modules/style/index";
import { view, viewOf } from "../../src/modules/view/index";
import type { Component } from "../../src/modules/index";

/** One published component, with a configuration its own check accepts. */
type Case = {
  component: Component;
  /** Resolve this element's configuration under this component's key. */
  resolve: (graph: Graph, held: Element) => unknown;
  /** Something the component accepts, and something else it also accepts. */
  mine: Record<string, unknown>;
  other: Record<string, unknown>;
};

const PUBLISHED: Case[] = [
  { component: card, resolve: cardOf,
    mine: { shape: "hex" }, other: { shape: "diamond", shows: ["id"] } },
  { component: constraints, resolve: constraintsOf,
    mine: { required: ["mass"] }, other: { required: ["id", "text"] } },
  { component: rules, resolve: rulesOf,
    mine: { holds: ["def_other"] }, other: { match: ["mass"] } },
  { component: style, resolve: styleOf,
    mine: { set: "sysml" }, other: {} },
  { component: view, resolve: viewOf,
    mine: { module: "table" }, other: { module: "matrix" } },
];

/** A graph holding one element of one definition, configured as given. */
function typed(key: string, config: Record<string, Record<string, unknown>>): [Graph, Element] {
  const held = element("a thing", { id: "block_1", type: "def_one" });

  return [{
    ...EMPTY,
    defs: {
      def_one: {
        id: "def_one", name: "one", form: "block", fields: [],
        components: config,
      },
    },
    elements: { ...EMPTY.elements, block_1: held },
  }, held];
}

/** A graph where a child extends a parent, each configured under `key`. */
function chained(
  key: string,
  parent: Record<string, unknown> | null,
  child: Record<string, unknown> | null,
): [Graph, Element] {
  const held = element("a thing", { id: "block_1", type: "def_child" });

  return [{
    ...EMPTY,
    defs: {
      def_parent: {
        id: "def_parent", name: "parent", form: "block", fields: [],
        ...(parent ? { components: { [key]: parent } } : {}),
      },
      def_child: {
        id: "def_child", name: "child", form: "block", fields: [],
        extends: "def_parent",
        ...(child ? { components: { [key]: child } } : {}),
      },
    },
    elements: { ...EMPTY.elements, block_1: held },
  }, held];
}

describe.each(PUBLISHED)("the $component.name component", (held) => {
  const key = held.component.name;

  it("accepts saying nothing at all", () => {
    expect(held.component.check({})).toBeNull();
  });

  it("refuses a key it knows nothing about, since it owns the whole of its own", () => {
    const why = held.component.check({ ...held.mine, notAKeyAnybodyOwns: 1 });

    expect(why).toContain("notAKeyAnybodyOwns");
  });

  it("accepts what this test configures it with, so the rest of this file means something", () => {
    expect(held.component.check(held.mine)).toBeNull();
    expect(held.component.check(held.other)).toBeNull();
  });

  it("reads its own key and no other's", () => {
    const [alone, one] = typed(key, { [key]: held.mine });
    const [beside, two] = typed(key, { [key]: held.mine, aStranger: { of: "no concern" } });

    expect(held.resolve(beside, two)).toEqual(held.resolve(alone, one));
  });

  it("resolves an element with no definition at all", () => {
    const bare = element("a thing", { id: "block_1" });
    const graph: Graph = { ...EMPTY, elements: { ...EMPTY.elements, block_1: bare } };

    expect(() => held.resolve(graph, bare)).not.toThrow();
  });

  it("inherits what the parent names when the subtype says nothing", () => {
    const [chain, one] = chained(key, held.mine, null);
    const [alone, two] = typed(key, { [key]: held.mine });

    expect(held.resolve(chain, one)).toEqual(held.resolve(alone, two));
  });

  it("replaces the parent's key when the subtype names its own", () => {
    const [chain, one] = chained(key, held.other, held.mine);
    const [alone, two] = typed(key, { [key]: held.mine });

    // The whole key is replaced, never merged into — the parent's does not leak.
    expect(held.resolve(chain, one)).toEqual(held.resolve(alone, two));
  });
});

describe("every registered view module", () => {
  it("registers exactly the six the set names", () => {
    expect(views().map((m) => m.name).sort()).toEqual([...MODULES].sort());
  });

  describe.each([...MODULES])("%s", (name) => {
    const mod = named(name)!;

    it("is registered under the name the set holds", () => {
      expect(mod).toBeTruthy();
      expect(mod.name).toBe(name);
    });

    it("is one of the two kinds and no other", () => {
      expect(["structure", "behavior"]).toContain(mod.kind);
    });

    it("names no chrome kind outside the open set", () => {
      for (const kind of mod.surface?.chrome ?? []) expect(CHROME).toContain(kind);
    });

    it("says what it calls a block", () => {
      expect(typeof mod.word).toBe("string");
      expect(mod.word.length).toBeGreaterThan(0);
    });

    it("carries a scanning icon of its own", () => {
      expect(typeof mod.icon).toBe("string");
      expect(mod.icon.length).toBeGreaterThan(0);
    });

    it("answers what a right-click creates, even if that is nothing", () => {
      expect(mod.creates === null || typeof mod.creates === "string").toBe(true);
    });

    // The rail builds every other group from the page's own state; `types` is
    // the one it cannot, so declaring the group and answering it go together.
    it("answers its own `types` group, and only declares one it can answer", () => {
      const declared = (mod.chrome ?? []).includes("types");

      expect(Boolean(mod.types)).toBe(declared);
      if (!mod.types) return;
      expect(mod.types.icon.length).toBeGreaterThan(0);
      expect(Array.isArray(mod.types.of(EMPTY, null))).toBe(true);
    });
  });

  it("keeps every module's icon distinct from the others", () => {
    const icons = MODULES.map((name) => named(name)!.icon);

    expect(new Set(icons).size).toBe(MODULES.length);
  });
});
