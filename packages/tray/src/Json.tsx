/** The json tab: the definition an element follows, or itself, as JSON and read only — its own
 *  word as it is filed. */

import { def_at, def_of, type Graph, type Id } from "@mnd/core";
import { Markdown } from "@mnd/theme";

export type JsonProps = { graph: Graph; id: Id };

export function Json({ graph, id }: JsonProps) {
  const def = def_at(graph, id) ?? def_at(graph, def_of(graph, id) ?? "");
  if (!def) return <p className="not-yet">it follows no definition</p>;
  const json = JSON.stringify(def, null, 2);
  return (
    <div className="json">
      <Markdown className="card-record" text={`\`\`\`json\n${json}\n\`\`\``} />
    </div>
  );
}
