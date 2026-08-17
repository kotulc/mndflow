/** Properties of the icon vocabulary.
 *
 *  The set replaced the Unicode marks, so what U.2 held over the glyphs now has
 *  to hold over these: one mark, one meaning. Properties, not drawings —
 *  nothing here asserts a path, a size or a count that retuning would change. */

import { describe, expect, it } from "vitest";

import { known, names, paths } from "../../src/modules/icons";
import { views } from "../../src/modules/view";

describe("the set", () => {
  it("draws something for every name it publishes", () => {
    expect(names().length).toBeGreaterThan(0);
    for (const name of names()) expect(known(name)).toBe(true);
  });

  it("refuses a name it does not draw, so a typo cannot render blank", () => {
    expect(known("nothing_by_that_name")).toBe(false);
    expect(known("")).toBe(false);
  });

  it("names a purpose rather than a shape", () => {
    // A shape name would let two purposes share one mark by accident, which is
    // the rule U.2 was written for. Checked as a property of the vocabulary.
    const shapes = ["chevron", "square", "circle", "triangle", "arrow", "box"];
    for (const name of names()) {
      for (const shape of shapes) expect(name).not.toBe(shape);
    }
  });
});

describe("no mark means two things", () => {
  it("never draws two purposes the same way", () => {
    // The rule U.2 held over the glyphs, kept over these. It was broken once
    // already while this set was being written — `plain` and `none` came out
    // as the same dash, in two groups sitting side by side.
    const seen = new Map<string, string>();
    for (const name of names()) {
      const drawn = paths(name);
      const twin = seen.get(drawn);
      expect(twin, `${name} draws the same path as ${twin}`).toBeUndefined();
      seen.set(drawn, name);
    }
  });

  it("draws a non-empty path for every name", () => {
    for (const name of names()) expect(paths(name).length).toBeGreaterThan(0);
  });
});

describe("the view modules draw from it", () => {
  it("every registered module's icon is a name the set knows", () => {
    for (const module of views()) expect(known(module.icon)).toBe(true);
  });

  it("no two modules share a mark", () => {
    const drawn = views().map((module) => module.icon);
    expect(new Set(drawn).size).toBe(drawn.length);
  });
});
