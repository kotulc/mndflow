/** What a relation's ends mean, read down its chain, and the behaviours a block holds. */

import { def_at, isa, setting_of } from "./defs";
import { shown_name } from "./names";
import { children, ports_on } from "./tree";
import { OWNERSHIPS, type Block, type End, type Ends, type Graph, type Id } from "./types";

/** What a line may say of an end over its definition: what varies per use. Ownership and
 *  navigability say what the relation is, so only a definition says them. */
export const LINE_SAYS: readonly (keyof End)[] = ["multiplicity", "role"];

/** A multiplicity: a count, `*`, or a range of them. */
const MULTIPLICITY = /^(\d+|\*)(\.\.(\d+|\*))?$/;

/** Why an end as said cannot be kept, or null. */
export function end_refusal(end: End): string | null {
  if (end.multiplicity !== undefined && !MULTIPLICITY.test(end.multiplicity)) {
    return `"${end.multiplicity}" is not a multiplicity: say 1, 0..1, *, 1..* or m..n`;
  }
  if (end.ownership !== undefined && !OWNERSHIPS.includes(end.ownership)) {
    return `ownership is one of ${OWNERSHIPS.join(", ")}`;
  }
  return null;
}

/** A relation's ends as they hold: its definition chain's, nearest first, then a line's own
 *  multiplicity and role over them. `id` is a line or a relation definition. */
export function ends_of(graph: Graph, id: Id): Ends {
  const line = graph.edges[id];
  const chain = isa(graph, line ? line.type ?? "line" : id);
  const out: Ends = {};
  for (const way of ["from", "to"] as const) {
    const end: End = {};
    for (const d of [...chain].reverse()) Object.assign(end, d.def.ends?.[way]);
    for (const key of LINE_SAYS) {
      const said = line?.ends?.[way]?.[key];
      if (said !== undefined) Object.assign(end, { [key]: said });
    }
    if (Object.keys(end).length) out[way] = end;
  }
  return out;
}

/** Whether a block is a behaviour: a usage whose kind carries *is behaviour*. */
export function is_behaviour(graph: Graph, id: Id): boolean {
  const b = graph.blocks[id];
  return !!b && !b.def && setting_of(graph, id, "block")["behaviour"] === true;
}

/** The behaviours a block or definition has: its own, then — a usage — its definition's chain's,
 *  nearest first. They are its methods. */
export function behaviours_of(graph: Graph, id: Id): Block[] {
  const b = graph.blocks[id];
  if (!b) return [];
  const own = (at: Id) => children(graph, at).filter((c) => is_behaviour(graph, c.id));
  const chain = isa(graph, b.type).map((d) => d.id);
  return [...own(id), ...chain.filter((d) => d !== id).flatMap(own)];
}

/** A behaviour's signature from its interfaces: `name(param: type, …): type`. Its in-interfaces
 *  are its parameters, its out-interfaces its return; each is typed by its interface definition. */
export function signature_of(graph: Graph, id: Id): string {
  const ports = ports_on(graph, id);
  const typed = (p: Block) => {
    const d = def_at(graph, p.type);
    return d && d.id !== "interface" ? d.name : "";
  };
  const params = ports.filter((p) => p.flow !== "out")
    .map((p) => [p.name ?? "", typed(p)].filter(Boolean).join(": "));
  const returns = ports.filter((p) => p.flow === "out").map((p) => typed(p) || p.name || "")
    .filter(Boolean);
  return `${shown_name(graph, id)}(${params.join(", ")})${returns.length ? `: ${returns.join(", ")}` : ""}`;
}
