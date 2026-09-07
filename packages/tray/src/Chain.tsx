/** What one element resolves through, in the order it resolves.
 *
 *  **Base first, the element itself last.** A definition says what a whole kind
 *  of thing is like; anything refining it says so afterwards; and what has been
 *  set on this one element has the final say. Read down the list is read in
 *  order of who wins — which is why the last row is the element and not a
 *  definition at all.
 *
 *  Only what applies here: the chain behind the thing you have hold of, never
 *  the workspace's whole vocabulary. Seeing every definition there is answers a
 *  different question, and would bury this one. */

import { def_of, isa, shown_name, type Graph, type Id } from "@mnd/core";

export type ChainProps = {
  graph: Graph;
  /** The one thing picked, or null while nothing is. */
  id: Id | null;
};

/** The keys a definition can speak about, in the order they read. */
const SAYS = ["block", "card", "style"] as const;

export function Chain({ graph, id }: ChainProps) {
  if (!id) return <p className="empty">pick one thing to see what it resolves through</p>;
  const b = graph.blocks[id];
  /** What it resolves through, which for a thing that names nothing is its own
   *  base kind — there is no untyped. `isa` walks nearest first, so it is
   *  turned round to read as a cascade. */
  const chain = isa(graph, def_of(graph, id)).reverse();

  return (
    <table className="contents-table chain">
      <colgroup>
        <col style={{ width: "12%" }} /><col style={{ width: "26%" }} />
        <col style={{ width: "20%" }} /><col />
      </colgroup>
      <thead>
        <tr><th>order</th><th>from</th><th>kind</th><th>says</th></tr>
      </thead>
      <tbody>
        {chain.map((d, n) => (
          <tr key={d.id}>
            <td className="kind">{n + 1}</td>
            <td className="name">{d.name}</td>
            <td className="type">{d.home === graph.root ? "definition" : "pinned"}</td>
            <td className="what" title={SAYS.map((k) =>
              `${k}: ${JSON.stringify(d.components?.[k] ?? {})}`).join("  ")}>
              {SAYS.filter((k) => d.components?.[k]).join(" · ") || "nothing"}
            </td>
          </tr>
        ))}
        {/* **The element has the last word**, so it is the last row. What it
            has been told about itself beats everything above it. */}
        <tr className="picked">
          <td className="kind">{chain.length + 1}</td>
          <td className="name">{shown_name(graph, id)}</td>
          <td className="type">this element</td>
          <td className="what">
            {[b?.labelled === false ? "no label" : "", b?.locked ? "locked" : "",
              b?.tags?.length ? `tags: ${b.tags.join(", ")}` : "",
              b?.fields?.length ? `${b.fields.length} value${b.fields.length > 1 ? "s" : ""}` : ""]
              .filter(Boolean).join(" · ") || "nothing of its own"}
          </td>
        </tr>
        {chain.length === 0 ? (
          <tr className="empty"><td colSpan={4}>it names no definition, so it is a plain block</td></tr>
        ) : null}
      </tbody>
    </table>
  );
}
