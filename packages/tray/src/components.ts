/** The keys a component is asked, as the card tab asks a card's: an interface — what it is
 *  called, which way it carries, which interface definition it is, where it sits — and a tag or a
 *  type from a package's library. Each edit goes home: an interface to the block holding it — its
 *  definition's, where a usage reads it through — a named component to its library. */

import { all_defs, all_types, block_base, def_at, domain_of, frozen, stored_of, is_interface,
         shown_name, tag_at, type_at, users_of, FORMS, type Act, type Graph,
         type Id } from "@mnd/core";
import { FROZEN, where, type Chip, type Pair } from "./pairs";

/** The walls an interface may be seated on. */
const SIDES = ["top", "right", "bottom", "left"] as const;

/** Said where a named component came with a package. */
const LENT = " It came with its package, so it reads only.";


/** What an interface is asked, on whichever block wears it. */
export function port_pairs(graph: Graph, id: Id, onAct: Act, onOpen?: (id: Id) => void): Pair[] {
  const at = stored_of(graph, id);
  const port = graph.blocks[at];
  if (!port || !is_interface(graph, at)) return [];
  const fixed = frozen(graph, at);
  const change = (args: Record<string, unknown>) => onAct("port", { id: at, ...args });
  const owner = port.parent ?? at;
  const home = shown_name(graph, owner);
  const lent = at !== id;
  return [
    { key: "name", word: "name", shown: port.name ?? "", said: !!port.name, fixed, asks: [],
      verbs: [], about: `What this interface is called.${fixed ? FROZEN : ""}`,
      ...(fixed ? {} : { text: { value: port.name ?? "", placeholder: "interface",
                                 commit: (to: string) => onAct("rename", { id: at, name: to }) } }) },
    { key: "flow", word: "flow", shown: port.flow ?? "both", said: !!port.flow, fixed, verbs: [],
      about: "Which way it carries: in, out, or both, which is what it reads unsaid.",
      asks: [{ word: "flow", tip: "Press the one lit to give it back.",
               chips: ["in", "out", "both"].map((f) => ({ value: f, word: f,
                 on: (port.flow ?? "both") === f, set: port.flow === f })),
               pick: (c) => change({ flow: c.set ? "none" : c.value }) }] },
    { key: "type", word: "type", shown: def_at(graph, port.type)?.name ?? "interface",
      said: !!port.type && port.type !== "interface", fixed, verbs: [],
      about: "Which interface definition it is: what it carries is said there, as attributes.",
      asks: [{ word: "type", tip: "Press the one lit to give it back.",
               chips: all_defs(graph).filter((d) => block_base(graph, d.id) === "interface")
                 .map((d) => ({ value: d.id, word: d.name, on: (port.type ?? "interface") === d.id,
                                set: port.type === d.id })),
               pick: (c) => onAct("retype", { ids: [at], type: c.set ? "interface" : c.value }) }] },
    { key: "seat", word: "seat", shown: port.side ? `${port.side} ${port.at ?? 0.5}` : "auto",
      said: !!port.side, fixed,
      about: "Where it sits. Unseated, it takes the face most of its lines look out of on every "
        + "draw; seated, it keeps its place. Dragging it along its wall seats it.",
      asks: [{ word: "side", tip: "Press one to seat it in the middle of that wall.",
               chips: SIDES.map((s) => ({ value: s, word: s, on: port.side === s, set: true })),
               pick: (c) => change({ side: c.value, at: 0.5 }) }],
      verbs: port.side ? [{ word: "free", tip: "let it place itself again",
                            run: () => change({ free: "true" }) }] : [] },
    { key: "declared", word: lent ? "declared on" : "on", shown: home, said: true, fixed: true,
      asks: [],
      about: lent ? `Declared on ${home}: every usage of it wears this interface, and an edit here `
        + "goes home there." : `On ${home}'s wall.`,
      verbs: onOpen && lent ? [{ word: "view definition", tip: `open ${home}`,
                                 run: () => onOpen(owner) }] : [] },
  ];
}

/** What a tag is asked: its name, what it means, and what carries it. */
export function tag_pairs(graph: Graph, id: Id, onAct: Act): Pair[] {
  const tag = tag_at(graph, id)!;
  const fixed = tag.pkg !== graph.root;
  const write = (args: Record<string, unknown>) => onAct("define_tag", { id, name: tag.name, ...args });
  const carriers = users_of(graph, id).length;
  return [
    named(tag.name, fixed, (to) => write({ name: to })),
    described(tag.description, fixed, (to) => write({ description: to })),
    used(carriers, fixed, () => onAct("delete", { ids: [id] }), "carried by"),
  ];
}

/** What a type is asked: its name, what it is for, its form, an enum's options, a number's unit,
 *  and what uses it. */
export function type_pairs(graph: Graph, id: Id, onAct: Act): Pair[] {
  const type = type_at(graph, id)!;
  const fixed = type.pkg !== graph.root;
  const write = (args: Record<string, unknown>) => onAct("define_type", { id, name: type.name, ...args });
  return [
    named(type.name, fixed, (to) => write({ name: to })),
    described(type.description, fixed, (to) => write({ description: to })),
    { key: "form", word: "form", shown: type.form, said: true, fixed, verbs: [],
      about: "How its values are edited: an enum is a choice and its options, an alias one form.",
      asks: [{ word: "form", tip: "Press one to edit its values that way.",
               chips: FORMS.map((f) => ({ value: f, word: f, on: type.form === f, set: true })),
               pick: (c) => write({ form: c.value }) }] },
    ...(type.form === "choice" ? [{
      key: "choices", word: "choices", shown: (type.choices ?? []).join(", "),
      said: !!type.choices?.length, fixed, asks: [], verbs: [],
      about: "An enum's options, in order, split on commas.",
      ...(fixed ? {} : { text: { value: (type.choices ?? []).join(", "), placeholder: "a, b, c",
                                 commit: (to: string) => write({ choices: to }) } }),
    }] : []),
    ...(type.form === "number" ? [{
      key: "unit", word: "unit", shown: type.unit ?? "", said: !!type.unit, fixed, asks: [],
      verbs: [], about: "What its numbers count.",
      ...(fixed ? {} : { text: { value: type.unit ?? "", placeholder: "unit",
                                 commit: (to: string) => write({ unit: to }) } }),
    }] : []),
    used(users_of(graph, id).length, fixed, () => onAct("delete", { ids: [id] }), "used by"),
  ];
}

/** Every type a value or an interface may carry, gathered by where each lives: the forms, then
 *  the libraries' types, then block definitions — links. */
export function type_chips(graph: Graph, now: Id | undefined): Chip[] {
  return [
    ...FORMS.map((f) => ({ value: f, word: f, on: now === f, set: true, group: "forms" })),
    ...all_types(graph).map((t) => ({ value: t.id, word: t.name, on: now === t.id, set: true,
                                      group: "types", tip: t.description ?? t.name })),
    ...all_defs(graph).filter((d) => domain_of(graph, d.id) === "block")
      .map((d) => ({ value: d.id, word: d.name, on: now === d.id, set: true,
                     group: where(graph, d.id), tip: d.description ?? d.name })),
  ];
}

/** A named component's name. */
function named(name: string, fixed: boolean, commit: (to: string) => void): Pair {
  return { key: "name", word: "name", shown: name, said: true, fixed, asks: [], verbs: [],
           about: `What it is called: one name in its package.${fixed ? LENT : ""}`,
           ...(fixed ? {} : { text: { value: name, placeholder: "name", commit } }) };
}

/** What a named component means, in a line. */
function described(said: string | undefined, fixed: boolean, commit: (to: string) => void): Pair {
  return { key: "description", word: "description", shown: said ?? "", said: !!said, fixed,
           asks: [], verbs: [], about: `What it means, in a line.${fixed ? LENT : ""}`,
           ...(fixed ? {} : { text: { value: said ?? "", placeholder: "what it means", commit } }) };
}

/** How much uses a named component, and taking it away while nothing does. */
function used(n: number, fixed: boolean, remove: () => void, word: string): Pair {
  return { key: "used", word, shown: String(n), said: n > 0, fixed, asks: [],
           about: n ? `${n === 1 ? "One element uses" : `${n} elements use`} it, so it stays.`
             : "Nothing uses it.",
           verbs: !fixed && !n ? [{ word: "remove", tip: "take it out of its library",
                                    run: remove }] : [] };
}
