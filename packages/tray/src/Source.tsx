/** Where a block's content lives outside the workspace. */

import type { Act, Graph, Id } from "@mnd/core";
import { Band, Body, Line } from "./Body";
import { Entry } from "./Entry";

export type SourceProps = { graph: Graph; id: Id; onAct: Act };

export function Source({ graph, id, onAct }: SourceProps) {
  const b = graph.blocks[id];
  if (!b) return null;

  return (
    <div className="col source">
      <Band label="source" />
      <Body>
        {/* One uri, and whatever locator syntax the thing it names spells: a fragment for a part
           of it, a revision where there is one. Nothing here parses it. */}
        <Line label="uri"
              tip="Where this block's content lives — a uri, a path, a repo, with whatever anchor or revision that syntax spells. Provenance, not a link: nothing syncs to it, so it may go stale and nothing breaks. Clearing it gives the slot back.">
          <Entry key={`uri-${id}`} value={b.source ?? ""} label="uri" blank
                 placeholder="repo://pumps/main.py#class-Pump"
                 onCommit={(uri) => onAct("source", { id, uri })} />
        </Line>
      </Body>
    </div>
  );
}
