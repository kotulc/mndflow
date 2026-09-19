/** What the catalogue ships, through the door — the check the shipped vocabularies never had. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { open, review, type Graph } from "@mnd/core";
import { seed } from "@mnd/defs";

const CATALOGUE = join(__dirname, "../public/packages");

/** The shipped floor, which a package is read over rather than carrying. */
const FLOOR: Graph["defs"] = {};
for (const m of seed()) FLOOR[m.def.id] = m.def;

type Listed = { name: string; about: string; at: string };

const listed: Listed[] =
  JSON.parse(readFileSync(join(CATALOGUE, "index.json"), "utf8")).packages;

const opened = (at: string) => open(readFileSync(join(CATALOGUE, at), "utf8"), FLOOR);

describe("every package in the catalogue", () => {
  it("lists at least the three that ship", () => {
    expect(listed.map((p) => p.name).sort()).toEqual(["doc", "requirements", "sysml"]);
  });

  it.each(listed)("reads $name with nothing repaired or dropped", ({ at }) => {
    expect(opened(at).faults).toEqual([]);
  });

  it.each(listed)("asks nothing of $name that it does not answer", ({ at }) => {
    expect(review(opened(at).graph)).toEqual([]);
  });
});
