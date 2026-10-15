/** Aspects: what the definition view draws round a definition, and what an edit there does to
 *  it. Views draws them; **what an edit there means is decided here**, so every host edits alike. */

import { allows_of } from "./capabilities";
import { chain_of, tags_stated, type Stated } from "./defs";
import { is_tag } from "./tags";
import { ports_of } from "./tree";
import type { Args } from "./actions";
import type { Drop } from "./drop";
import type { Block, Graph, Id } from "./types";

/** The note the definition view ties to its definition: the definition's body. */
export const ABOUT = "@about";

/** What surrounds a definition: what it extends, its ports by flow — unmarked with both — the
 *  definitions a relation's ends may join (`allows.ends`), and the tags in force, with the link of
 *  its chain stating them; its chain's included, a port's `parent` saying whose it is. */
export type Aspects = { extends: Id | null; ins: Block[]; outs: Block[]; both: Block[];
                        from: Id[]; to: Id[]; tags: Stated };


/** The aspects of a definition: what it extends — the nearest link of its chain, a base included
 *  — its ports, and what it carries. */
export function aspects_of(graph: Graph, def: Id): Aspects {
  const ports = ports_of(graph, def);
  const flowing = (...flows: (string | undefined)[]) => ports.filter((p) => flows.includes(p.flow));
  const ends = allows_of(graph, def).ends;
  return { extends: chain_of(graph, def)[1]?.id ?? null,
           ins: flowing("in"), outs: flowing("out"), both: flowing("both", undefined),
           from: ends?.from ?? [], to: ends?.to ?? [],
           tags: tags_stated(graph, def) };
}

/** What dropping a definition onto a definition's view does: a tag it does not carry is added
 *  to the list in force, which it then states itself. Anything else does nothing. */
export function attach_of(graph: Graph, def: Id, id: Id): Drop | null {
  if (id === def || !is_tag(graph, id)) return null;
  const held = tags_stated(graph, def).ids;
  if (held.includes(id)) return null;
  return { act: "tag", args: { ids: [def], tags: [...held, id] } };
}

/** An act on a definition's view, as it edits the definition: deleting a tag takes it
 *  out of the list in force, which it then states itself; deleting deletes its own ports, never
 *  the definitions drawn round it; renaming the note writes its description. Anything else passes as it
 *  is. */
export function aspect_acts(graph: Graph, def: Id, name: string, args: Args): Drop[] {
  if (name === "rename" && args["id"] === ABOUT) {
    return [{ act: "describe", args: { id: def, description: String(args["name"] ?? "") } }];
  }
  if (name !== "delete") return [{ act: name, args }];
  const ids = Array.isArray(args["ids"]) ? args["ids"].map(String) : [];
  const { ins, outs, both, tags } = aspects_of(graph, def);
  /** Only its own: an inherited port is deleted where it is declared. */
  const ports = [...ins, ...outs, ...both].filter((p) => p.parent === def && ids.includes(p.id))
    .map((p) => p.id);
  const left = (held: Stated) => held.ids.filter((t) => !ids.includes(t));
  return [
    ...(tags.ids.some((t) => ids.includes(t))
      ? [{ act: "tag", args: { ids: [def], tags: left(tags) } }] : []),
    ...(ports.length ? [{ act: "delete", args: { ids: ports } }] : []),
  ];
}
