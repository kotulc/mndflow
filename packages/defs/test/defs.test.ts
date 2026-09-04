/** The producer side of the module contract.
 *
 *  **Every shipped definition passes the door, and every module any of them
 *  names exists.** A package is data, so the only thing it can get wrong is
 *  saying something no component in the build can read — which is exactly what
 *  the door now answers, and what this asks it. */

import { describe, expect, it } from "vitest";
import { BLOCK_MODULES, config_of, unreadable, validate } from "@mnd/core";
import { ALL, base_graph } from "../src/index";

describe("the shipped definitions", () => {
  it("leave the door nothing to repair", () => {
    expect(validate(base_graph())).toEqual([]);
  });

  it("say nothing a component in this build refuses", () => {
    const refused = ALL.flatMap((d) => unreadable(d).map((w) => `${d.name}: ${w.why}`));
    expect(refused).toEqual([]);
  });

  it("names only block modules this build has", () => {
    const graph = base_graph();
    const named = ALL.map((d) => config_of(graph, d.id, "block")["module"]).filter(Boolean);
    expect(named.every((m) => BLOCK_MODULES.includes(m as never))).toBe(true);
  });

  it("extends only definitions that travel with it", () => {
    const ids = new Set(ALL.map((d) => d.id));
    expect(ALL.filter((d) => d.extends && !ids.has(d.extends))).toEqual([]);
  });
});
