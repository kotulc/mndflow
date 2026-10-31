/** **A block's facts strip**: what it counts, the seats it wears and its tags, in one order on
 *  every form — chip, card, hover card and tray head. Worked out when asked, never stored. */

import { attributes_of, children, definition_uses, is_header, is_holder, is_interface,
         is_notation, ports_on, subtree, subtypes, tag_at, tags_stated, use_places, type Flow,
         type Graph,
         type Id } from "@mnd/core";
import { listed } from "./face";
import type { usage_groups } from "./library";
import { entry_look, tint_attrs, type Tint } from "./look";

/** How many of something a block has, said in a word. */
export type Fact = { n: number; word: string };

/** **The facts strip**, in its one order: what it counts, the seats it wears, its tags. */
export type Facts = { counts: Fact[]; ports: { name: string; flow: Flow }[];
                      tags: { id: Id; label: string; tint: Tint }[] };

/** A definition's uses grouped by place, and what some blocks hold: worked out by a caller that
 *  has them already, so they are read once. */
export type Groups = ReturnType<typeof usage_groups>;
export type Counted = ReturnType<typeof counted>;


/** **A block's facts**, the same slots in the same order wherever it is shown. A definition in the
 *  library counts its uses, the places they are drawn and its subtypes; anything else what it
 *  holds — blocks, lines, interfaces — as the map counts it where it says so. Both then their
 *  attributes, the seats they wear and their tags. */
export function facts_of(graph: Graph, id: Id, library: boolean,
                         known: { groups?: Groups; counts?: Counted } = {}): Facts {
  const b = graph.blocks[id];
  const counts: Fact[] = [];
  const say = (n: number, one: string) => counts.push(...fact(n, one));
  if (library && b?.def) {
    const places = known.groups?.length ?? use_places(graph, id).length;
    say(definition_uses(graph, id).length, "use");
    if (places > 1) say(places, "place");
    say(subtypes(graph, id).length, "subtype");
  } else {
    const n = known.counts ?? counted(graph, children(graph, id).map((c) => c.id));
    say(n.blocks, "block");
    say(n.lines, "line");
    say(n.ports, "port");
  }
  say(b?.def ? attributes_of(graph, id).length : listed(graph, id).length, "attribute");
  const ports = (b ? ports_on(graph, id) : [])
    .map((p) => ({ name: p.name ?? "", flow: p.flow ?? "both" }));
  const tags = tags_stated(graph, id).ids.flatMap((t) => {
    const tag = tag_at(graph, t);
    return tag ? [{ id: t, label: tag.name, tint: tint_attrs(entry_look(graph, t)) }] : [];
  });
  return { counts, ports, tags };
}

/** What some blocks hold between them: blocks — not notes, labels, holders or a grid's headers,
 *  which a map never draws — the lines among them, and their interfaces. */
export function counted(graph: Graph, ids: readonly Id[]) {
  const all = new Set(ids.flatMap((id) => subtree(graph, id)));
  let blocks = 0, ports = 0;
  for (const id of all) {
    if (is_interface(graph, id)) ports++;
    else if (!is_notation(graph, id) && !is_holder(graph, id) && !is_header(graph, id)) blocks++;
  }
  /** A leaf holds no lines, so it scans none. */
  const lines = all.size < 2 ? 0
    : Object.values(graph.edges).filter((e) => all.has(e.from) && all.has(e.to)).length;
  return { blocks, lines, ports };
}

/** One count in the strip's words, absent at nought. */
export function fact(n: number, one: string): Fact[] {
  return n ? [{ n, word: n === 1 ? one : `${one}s` }] : [];
}

/** Whether a facts strip says anything. */
export function any_fact(f: Facts): boolean {
  return f.counts.length + f.ports.length + f.tags.length > 0;
}

/** **The facts strip a card's face carries** at level 2, where it says anything: never on
 *  notation or a grid's header, which are their shape alone. */
export function card_facts(graph: Graph, id: Id): Facts | null {
  if (is_header(graph, id) || is_notation(graph, id)) return null;
  const facts = facts_of(graph, id, false);
  return any_fact(facts) ? facts : null;
}

/** A count's whole. */
export function total(n: { blocks: number; lines: number; ports: number }): number {
  return n.blocks + n.lines + n.ports;
}
