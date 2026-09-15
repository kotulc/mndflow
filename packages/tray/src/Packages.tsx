/** The packages tab: what this project draws on. */

import { Table, type Column } from "./Table";
import { vocabulary, type Graph } from "@mnd/core";

const COLUMNS: readonly Column[] = [
  { key: "name", label: "package" },
  { key: "defs", label: "definitions" },
  { key: "used", label: "in use" },
];

export type PackagesProps = { graph: Graph };

export function Packages({ graph }: PackagesProps) {
  /** The workspace's own is not a package. */
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
