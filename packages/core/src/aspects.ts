/** Aspects: what the definition view draws round a definition, and what an edit there does to
 *  it. Views draws them; **what an edit there means is decided here**, so every host edits alike. */

import { chain_of, def_at, traits_of } from "./defs";
import { is_tag, is_trait } from "./tags";
import { children, is_interface } from "./tree";
import type { Args } from "./actions";
import type { Drop } from "./drop";
import type { Block, Graph, Id } from "./types";

/** The note the definition view ties to its definition: the definition's body. */
export const ABOUT = "@about";

/** What surrounds a definition: what it extends, its ports by flow — unmarked with both — and the
 *  tags and traits it carries itself. */
export type Aspects = { extends: Id | null; ins: Block[]; outs: Block[]; both: Block[];
                        tags: Id[]; traits: Id[] };


/** The aspects of a definition: what it extends — the nearest link of its chain, a base included
 *  — its ports, and its own tags and traits. */
export function aspects_of(graph: Graph, def: Id): Aspects {
  const d = def_at(graph, def);
  const ports = children(graph, def).filter(is_interface);
  const flowing = (...flows: (string | undefined)[]) => ports.filter((p) => flows.includes(p.flow));
  return { extends: chain_of(graph, def)[1]?.id ?? null,
           ins: flowing("in"), outs: flowing("out"), both: flowing("both", undefined),
           tags: d?.tags ?? [], traits: d?.traits ?? [] };
}

/** What dropping a definition onto a definition's view does: a trait joins the traits in force —
 *  stating them, where it only inherited them — a tag its tags. Anything else, or one it carries
 *  already, does nothing. */
export function attach_of(graph: Graph, def: Id, id: Id): Drop | null {
  const { tags } = aspects_of(graph, def);
  const traits = traits_of(graph, def);
  if (id === def || !is_tag(graph, id)) return null;
  if (is_trait(graph, id)) {
    return traits.includes(id) ? null : { act: "trait", args: { ids: [def], traits: [...traits, id] } };
  }
  return tags.includes(id) ? null : { act: "tag", args: { ids: [def], tags: [...tags, id] } };
}

/** An act on a definition's view, as it edits the definition: deleting detaches what it carries
 *  and deletes its ports, never the definitions drawn round it; renaming the note writes the
 *  body. Anything else passes as it is. */
export function aspect_acts(graph: Graph, def: Id, name: string, args: Args): Drop[] {
  if (name === "rename" && args["id"] === ABOUT) {
    return [{ act: "describe", args: { id: def, body: String(args["name"] ?? "") } }];
  }
  if (name !== "delete") return [{ act: name, args }];
  const ids = Array.isArray(args["ids"]) ? args["ids"].map(String) : [];
  const { tags, traits, ins, outs, both } = aspects_of(graph, def);
  const ports = [...ins, ...outs, ...both].map((p) => p.id).filter((p) => ids.includes(p));
  const kept_tags = tags.filter((t) => !ids.includes(t));
  const kept_traits = traits.filter((t) => !ids.includes(t));
  return [
    ...(kept_tags.length < tags.length ? [{ act: "tag", args: { ids: [def], tags: kept_tags } }] : []),
    /** The last trait gone gives the set back to what it extends. */
    ...(kept_traits.length < traits.length
      ? [{ act: "trait", args: { ids: [def], ...(kept_traits.length ? { traits: kept_traits } : {}) } }]
      : []),
    ...(ports.length ? [{ act: "delete", args: { ids: ports } }] : []),
  ];
}
