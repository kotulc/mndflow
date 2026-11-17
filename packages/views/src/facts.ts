/** **A block's facts**: the header's meta line (docs/design/card.md) — its presentations, what it
 *  counts, the seats it wears each way, then its tags — in one order on every form: chip, card,
 *  box, hover card and tray head. **A card's never repeats its face**: no attribute count where
 *  its table lists them, no seats where its walls draw them. Worked out when asked, never stored. */

import { attributes_of, children, definition_uses, is_header, is_holder, is_interface,
         is_notation, ports_on, presentations_of, subtree, subtypes, tag_at, tags_stated,
         use_places, type Graph, type Id } from "@mnd/core";
import { listed } from "./face";
import type { usage_groups } from "./library";
import { entry_look, look_of, tint_attrs, type Tint } from "./look";

/** How many of something a block has, said in a word. */
export type Fact = { n: number; word: string };

/** **The facts**, in their one order: what it counts, then its tags. */
export type Facts = { counts: Fact[];
                      tags: { id: Id; label: string; tint: Tint }[];
                      /** How many presentations it plays; the seats it wears each way. */
                      plays?: number; seats?: { in: number; out: number } };

/** A definition's uses grouped by place, and what some blocks hold: worked out by a caller that
 *  has them already, so they are read once. */
export type Groups = ReturnType<typeof usage_groups>;
export type Counted = ReturnType<typeof counted>;


/** **A block's facts**, the same slots in the same order wherever it is shown. A definition in the
 *  library counts its uses, the places they are drawn and its subtypes; anything else what it
 *  holds — blocks and lines — as the map counts it where it says so. Both then their attributes
 *  and their tags. */
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
  }
  say(b?.def ? attributes_of(graph, id).length : listed(graph, id).length, "attribute");
  const tags = tags_stated(graph, id).ids.flatMap((t) => {
    const tag = tag_at(graph, t);
    return tag ? [{ id: t, label: tag.name, tint: tint_attrs(entry_look(graph, t)) }] : [];
  });
  const plays = presentations_of(graph, id).length;
  const flows = ports_on(graph, id).map((p) => p.flow ?? "both");
  const seats = { in: flows.filter((f) => f !== "out").length,
                  out: flows.filter((f) => f !== "in").length };
  return { counts, tags, ...(plays ? { plays } : {}),
           ...(seats.in + seats.out ? { seats } : {}) };
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
  /** A leaf holds a line only to itself. */
  const lines = all.size < 2 ? loops(graph).get(ids[0] ?? "") ?? 0
    : Object.values(graph.edges).filter((e) => all.has(e.from) && all.has(e.to)).length;
  return { blocks, lines, ports };
}

/** Each block's lines to itself, counted once per set of lines. */
const LOOPED = new WeakMap<object, Map<Id, number>>();
function loops(graph: Graph): Map<Id, number> {
  let by = LOOPED.get(graph.edges);
  if (!by) {
    by = new Map();
    for (const e of Object.values(graph.edges)) {
      if (e.from === e.to) by.set(e.from, (by.get(e.from) ?? 0) + 1);
    }
    LOOPED.set(graph.edges, by);
  }
  return by;
}

/** One count in the strip's words, absent at nought. */
export function fact(n: number, one: string): Fact[] {
  return n ? [{ n, word: n === 1 ? one : `${one}s` }] : [];
}

/** Whether a facts strip says anything. */
export function any_fact(f: Facts): boolean {
  return f.counts.length + f.tags.length + (f.plays ?? 0)
    + (f.seats ? 1 : 0) > 0;
}

/** **A card's meta line**, where it says anything: never on notation or a grid's header, which
 *  are their shape alone. It never repeats the face: its seats are on its walls, and attributes a
 *  table lists are left out. */
export function card_facts(graph: Graph, id: Id): Facts | null {
  if (is_header(graph, id) || is_notation(graph, id)) return null;
  const { seats: _, ...facts } = facts_of(graph, id, false);
  const ruled = look_of(graph, id).shows.some((s) => s === "attributes" || s === "behaviours");
  const counts = ruled ? facts.counts.filter((c) => !c.word.startsWith("attribute"))
    : facts.counts;
  const said = { ...facts, counts };
  return any_fact(said) ? said : null;
}

/** A count's whole. */
export function total(n: { blocks: number; lines: number; ports: number }): number {
  return n.blocks + n.lines + n.ports;
}
