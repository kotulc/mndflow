/** What an export of the workspace carries, **read, never written here.**
 *
 *  A file is the schema it was written under, the project's id and the graph —
 *  so this lists those, and how much of each the graph holds. */

import { SCHEMA, shipped, type Graph } from "@mnd/core";
import { Band, Body, Line } from "./Body";

export type ProjectProps = { graph: Graph };

export function Project({ graph }: ProjectProps) {
  const defs = Object.values(graph.defs).filter((d) => !shipped(d));
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <div className="col draws">
      <Band label="export" />
      <Body>
        <Line label="schema" tip="The file format this workspace is written in.">
          <span className="read">{String(SCHEMA)}</span>
        </Line>
        <Line label="blocks" tip="Every block in the project, at every depth.">
          <span className="read">{count(Object.keys(graph.blocks).length - 1, "block", "blocks")}</span>
        </Line>
        <Line label="relations" tip="Every relationship in the project.">
          <span className="read">{count(Object.keys(graph.edges).length, "relation", "relations")}</span>
        </Line>
        <Line label="definitions" tip="Definitions this project or its packages wrote. The shipped floor is not counted.">
          <span className="read">{count(defs.length, "definition", "definitions")}</span>
        </Line>
      </Body>
    </div>
  );
}
