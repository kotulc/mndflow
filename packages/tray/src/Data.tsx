/** A definition's record as JSON: its own word as it is filed, or resolved down its chain. Read
 *  only: it is what the definition *is*, as against the body above it, which describes it. */

import { useState } from "react";
import { def_at, isa, schema_of, type Graph, type Id } from "@mnd/core";
import { Band } from "./Body";

export type DataProps = { graph: Graph; id: Id };

export function Data({ graph, id }: DataProps) {
  const [resolved, set_resolved] = useState(false);
  const def = def_at(graph, id);
  if (!def) return null;

  return (
    <div className="content data">
      <Band label="definition">
        <button className="chip" aria-pressed={resolved} onClick={() => set_resolved((r) => !r)}
                title="its own word, or what it reads with everything it inherits">
          {resolved ? "resolved" : "own"}
        </button>
      </Band>
      {/* Not a textarea: nothing is typed into it, and a block that grows with what it holds
         leaves the tray's own scroll as the only one. */}
      <pre className="data">{JSON.stringify(resolved ? resolve(graph, id) : def, null, 2)}</pre>
    </div>
  );
}

/** A definition as it reads: every setting its chain gives it, nearest winning, and its whole
 *  schema. */
function resolve(graph: Graph, id: Id) {
  const chain = isa(graph, id);
  const settings: Record<string, Record<string, unknown>> = {};
  for (const d of [...chain].reverse()) {
    for (const [key, config] of Object.entries(d.settings ?? {})) {
      settings[key] = { ...settings[key], ...config };
    }
  }
  const schema = schema_of(graph, id);
  return { ...chain[0], extends: chain.slice(1).map((d) => d.id),
           ...(Object.keys(settings).length ? { settings } : {}),
           ...(schema.length ? { def: { schema } } : {}) };
}
