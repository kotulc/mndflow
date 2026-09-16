/** The packages tab: what this project draws on. */

import { Table, type Column } from "./Table";
import { packages, type Graph } from "@mnd/core";

/** Blocks and relations are counted apart, since the definitions tab lists one group at a time. */
const COLUMNS: readonly Column[] = [
  { key: "name", label: "package" },
  { key: "blocks", label: "blocks" },
  { key: "relations", label: "relations" },
  { key: "used", label: "in use" },
];

export type PackagesProps = {
  graph: Graph;
  /** The package the tray is pointed at, lit. */
  held?: string | null;
  onPick?: (from: string) => void;
};

export function Packages({ graph, held = null, onPick }: PackagesProps) {
  const packs = packages(graph);
  const used = new Set(Object.values(graph.blocks).map((b) => b.type)
    .concat(Object.values(graph.edges).map((e) => e.type))
    .filter(Boolean) as string[]);

  return (
    <Table
      columns={COLUMNS}
      picked={held ? [held] : []}
      {...(onPick ? { onPick } : {})}
      empty="this project draws on nothing outside itself"
      rows={packs.map((g) => ({
        id: g.from,
        titles: { name: g.from },
        cells: {
          name: g.from,
          blocks: String(g.defs.filter((d) => d.group === "block").length),
          relations: String(g.defs.filter((d) => d.group === "relation").length),
          used: String(g.defs.filter((d) => used.has(d.id)).length),
        },
      }))}
    />
  );
}
