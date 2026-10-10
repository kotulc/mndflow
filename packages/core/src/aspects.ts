/** Aspects: what the definition view draws round a definition, and what an edit there does to
 *  it. Views draws them; **what an edit there means is decided here**, so every host edits alike. */

import { carried_tags, chain_of, def_at, is_trait, type Carried } from "./defs";
import { is_tag } from "./tags";
import { children, is_interface } from "./tree";
import type { Args } from "./actions";
import type { Drop } from "./drop";
import type { Block, Graph, Id } from "./types";

/** The note the definition view ties to its definition: the definition's body. */
export const ABOUT = "@about";

/** What surrounds a definition: what it extends, its ports by flow — unmarked with both — and the
 *  tags and traits it carries, its chain's included, each with the link adding it. */
export type Aspects = { extends: Id | null; ins: Block[]; outs: Block[]; both: Block[];
                        tags: Carried[]; traits: Carried[] };


/** The aspects of a definition: what it extends — the nearest link of its chain, a base included
 *  — its ports, and everything it carries. */
export function aspects_of(graph: Graph, def: Id): Aspects {
  const ports = children(graph, def).filter((b) => is_interface(graph, b.id));
  const flowing = (...flows: (string | undefined)[]) => ports.filter((p) => flows.includes(p.flow));
  const all = carried_tags(graph, def);
  return { extends: chain_of(graph, def)[1]?.id ?? null,
           ins: flowing("in"), outs: flowing("out"), both: flowing("both", undefined),
           tags: all.filter((c) => !is_trait(graph, c.id)),
           traits: all.filter((c) => is_trait(graph, c.id)) };
}

/** What dropping a definition onto a definition's view does: a tag, trait or label it does not
 *  carry is added to its own list — or, where it drops it, the drop is taken back. Anything else
 *  does nothing. */
export function attach_of(graph: Graph, def: Id, id: Id): Drop | null {
  if (id === def || !is_tag(graph, id) || carried_tags(graph, def).some((c) => c.id === id)) return null;
  const own = def_at(graph, def)?.tags ?? [];
  const tags = own.includes(`-${id}`) ? own.filter((t) => t !== `-${id}`) : [...own, id];
  return { act: "tag", args: { ids: [def], tags } };
}

/** An act on a definition's view, as it edits the definition: deleting what it carries takes it
 *  off its own list, or drops it where its chain carries it; deleting deletes its ports, never the
 *  definitions drawn round it; renaming the note writes the body. Anything else passes as it is. */
export function aspect_acts(graph: Graph, def: Id, name: string, args: Args): Drop[] {
  if (name === "rename" && args["id"] === ABOUT) {
    return [{ act: "describe", args: { id: def, body: String(args["name"] ?? "") } }];
  }
  if (name !== "delete") return [{ act: name, args }];
  const ids = Array.isArray(args["ids"]) ? args["ids"].map(String) : [];
  const { ins, outs, both } = aspects_of(graph, def);
  const ports = [...ins, ...outs, ...both].map((p) => p.id).filter((p) => ids.includes(p));
  const gone = carried_tags(graph, def).filter((c) => ids.includes(c.id));
  const own = def_at(graph, def)?.tags ?? [];
  const tags = [...own.filter((t) => !gone.some((c) => c.id === t)),
                ...gone.filter((c) => c.from !== def).map((c) => `-${c.id}`)];
  return [
    ...(gone.length ? [{ act: "tag", args: { ids: [def], tags } }] : []),
    ...(ports.length ? [{ act: "delete", args: { ids: ports } }] : []),
  ];
}
