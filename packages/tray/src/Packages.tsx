/** The packages tab: **what this project draws on.**
 *
 *  The workspace's `fields` slot. A block declares what it carries; the
 *  workspace declares what it borrows — the same position in the panel, and
 *  the word changes with the subject.
 *
 *  **Two sources, reconciled here.** `vocabulary` groups every definition by
 *  the package it came from, so what is *in use* is read off the graph rather
 *  than trusted from a list. A package a project names but has nothing from is
 *  the case nothing checked for. */

import { Table, type Column } from "./Table";
import { vocabulary, type Graph } from "@mnd/core";

const COLUMNS: readonly Column[] = [
  { key: "name", label: "package", width: "46%" },
  { key: "defs", label: "definitions", width: "27%" },
  { key: "used", label: "in use", width: "27%" },
];

export type PackagesProps = { graph: Graph };

export function Packages({ graph }: PackagesProps) {
  /** **The workspace's own is not a package.** It is what this project made,
   *  which is the thing every other row is defined against. */
  const packs = vocabulary(graph).filter((g) => g.from !== null);
  const used = new Set(Object.values(graph.blocks).map((b) => b.type)
    .concat(Object.values(graph.edges).map((e) => e.type))
    .filter(Boolean) as string[]);

  return (
    <Table
      columns={COLUMNS}
      empty="this project draws on nothing outside itself"
      rows={packs.map((g) => ({
        id: g.from!,
        titles: { name: g.from! },
        cells: {
          name: g.from!,
          defs: String(g.defs.length),
          used: String(g.defs.filter((d) => used.has(d.id)).length),
        },
      }))}
    />
  );
}
