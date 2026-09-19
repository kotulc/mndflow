/** A definition's record, exactly as it is filed. Read only: it is what the definition *is*,
 *  as against the `about` above it, which is prose somebody wrote about it. */

import type { Graph, Id } from "@mnd/core";
import { Band } from "./Body";

export type DataProps = { graph: Graph; id: Id };

export function Data({ graph, id }: DataProps) {
  const def = graph.defs[id];
  if (!def) return null;

  return (
    <div className="content data">
      <Band label="definition" />
      {/* Not a textarea: nothing is typed into it, and a block that grows with what it holds
         leaves the tray's own scroll as the only one. */}
      <pre className="data">{JSON.stringify(def, null, 2)}</pre>
    </div>
  );
}
