/** Preset registration and the module validate hook.
 *
 *  Both seams are settled — named sets later-win, look up by name; optional
 *  hooks register on publish and advise about one usage — so these are
 *  property tests against those contracts. No real preset or module check is
 *  shipped here: inventing combinations and escape-hatch rules are later. */

import { describe, expect, it } from "vitest";

import { findings, preset, presets, publish, ship } from "../src/modules/index";
import type { Module, Preset } from "../src/modules/index";
import type { Graph } from "../src/graph/types";

const empty = {} as Graph;

describe("the preset registry", () => {
  it("answers a shipped name and nothing outside the set", () => {
    const one: Preset = {
      name: "a0.4-probe",
      components: { card: { layout: "type" } },
    };

    ship(one);

    expect(preset(one.name)).toEqual(one);
    expect(presets().some((p) => p.name === one.name)).toBe(true);
    expect(preset("a0.4-never-shipped")).toBeNull();
  });

  it("lets a later ship of the same name replace the earlier", () => {
    const name = "a0.4-replace";

    ship({ name, components: { card: { layout: "name" } } });
    ship({ name, components: { card: { layout: "fields" } } });

    expect(preset(name)?.components.card).toEqual({ layout: "fields" });
    expect(presets().filter((p) => p.name === name)).toHaveLength(1);
  });

  it("keeps each component key opaque — recombination is data, not the registry's", () => {
    const name = "a0.4-opaque";
    const components = {
      card: { layout: "shape", shape: "diamond" },
      style: { set: null },
      view: { module: "block" },
    };

    ship({ name, components });

    expect(preset(name)?.components).toEqual(components);
  });
});

describe("a module's validate hook", () => {
  it("adds no findings when the module ships no hook", () => {
    const id = "s5.4-silent-usage";
    const before = findings(empty, id);

    publish({
      name: "s5.4-silent",
      components: [],
      validate: () => ["s5.4-should-not-linger"],
    });
    publish({ name: "s5.4-silent", components: [] });

    expect(findings(empty, id)).toEqual(before);
  });

  it("collects every published hook's words about one usage", () => {
    const a: Module = {
      name: "s5.4-a",
      components: [],
      validate: (_g, id) => (id === "s5.4-x" ? ["s5.4-from-a"] : []),
    };
    const b: Module = {
      name: "s5.4-b",
      components: [],
      validate: (_g, id) => (id === "s5.4-x" ? ["s5.4-from-b"] : []),
    };

    publish(a, b);

    const onX = findings(empty, "s5.4-x").filter((n) => n.startsWith("s5.4-from-"));
    expect(onX.sort()).toEqual(["s5.4-from-a", "s5.4-from-b"]);
    expect(findings(empty, "s5.4-y").filter((n) => n.startsWith("s5.4-from-"))).toEqual([]);
  });

  it("lets a later publish of the same module replace or clear its hook", () => {
    const name = "s5.4-replace";
    const id = "s5.4-replace-usage";
    const mine = (notes: string[]) => notes.filter((n) => n.startsWith("s5.4-rep-"));

    publish({ name, components: [], validate: () => ["s5.4-rep-first"] });
    expect(mine(findings(empty, id))).toEqual(["s5.4-rep-first"]);

    publish({ name, components: [], validate: () => ["s5.4-rep-second"] });
    expect(mine(findings(empty, id))).toEqual(["s5.4-rep-second"]);

    publish({ name, components: [] });
    expect(mine(findings(empty, id))).toEqual([]);
  });
});
