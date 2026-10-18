/** The keys a component is asked, as the card tab asks a card's: a port — what it is called,
 *  which way it carries, which interface definition it is, where it sits — and a tag, a type or an
 *  interface definition from a package's library. Each edit goes home: a port to the block holding
 *  it — its definition's, where a usage reads it through — a named component to its library. */

import { all_constraints, all_defs, all_interfaces, all_tags, all_types, constraint_at,
         domain_of, entry_at, frozen, interface_at, port_at, setting_of, shown_name, tag_at,
         type_at, users_of, FORMS, type Act, type Graph, type Id } from "@mnd/core";
import { FROZEN, where, type Chip, type Pair } from "./pairs";

/** The walls an interface may be seated on. */
const SIDES = ["top", "right", "bottom", "left"] as const;

/** Said where a named component came with a package. */
const LENT = " It came with its package, so it reads only.";


/** What a port is asked, on whichever block wears it. */
export function port_pairs(graph: Graph, id: Id, onAct: Act, onOpen?: (id: Id) => void): Pair[] {
  const port = port_at(graph, id);
  if (!port) return [];
  const fixed = frozen(graph, port.holder);
  const change = (args: Record<string, unknown>) => onAct("port", { id, ...args });
  const owner = port.holder;
  const home = shown_name(graph, owner);
  const lent = owner !== port.on;
  return [
    { key: "name", word: "name", shown: port.name ?? "", said: !!port.name, fixed, asks: [],
      verbs: [], about: `What this interface is called.${fixed ? FROZEN : ""}`,
      ...(fixed ? {} : { text: { value: port.name ?? "", placeholder: "interface",
                                 commit: (to: string) => change({ name: to }) } }) },
    { key: "flow", word: "flow", shown: port.flow ?? "both", said: !!port.flow, fixed, verbs: [],
      about: "Which way it carries: in, out, or both, which is what it reads unsaid.",
      asks: [{ word: "flow", tip: "Press the one lit to give it back.",
               chips: ["in", "out", "both"].map((f) => ({ value: f, word: f,
                 on: (port.flow ?? "both") === f, set: port.flow === f })),
               pick: (c) => change({ flow: c.set ? "none" : c.value }) }] },
    { key: "type", word: "type", shown: interface_at(graph, port.type)?.name ?? "interface",
      said: !!port.type, fixed, verbs: [],
      about: "Which interface definition it is, from a library: what it carries is said there.",
      asks: [{ word: "type", tip: "Press the one lit to give it back.",
               chips: all_interfaces(graph).map((d) => ({ value: d.id, word: d.name,
                 on: port.type === d.id, set: port.type === d.id })),
               pick: (c) => change({ type: c.set ? "" : c.value }) }] },
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

/** What a tag is asked: its name, what it means, what it extends, its colour, and what carries
 *  it. */
export function tag_pairs(graph: Graph, id: Id, onAct: Act): Pair[] {
  const tag = tag_at(graph, id)!;
  const fixed = tag.pkg !== graph.root;
  const write = (args: Record<string, unknown>) => onAct("define_tag", { id, name: tag.name, ...args });
  const carriers = users_of(graph, id).length;
  return [
    named(tag.name, fixed, (to) => write({ name: to })),
    described(tag.description, fixed, (to) => write({ description: to })),
    extended(graph, id, all_tags(graph), fixed, write),
    coloured(graph, id, fixed, onAct),
    used(carriers, fixed, () => onAct("delete", { ids: [id] }), "carried by"),
  ];
}

/** What a constraint is asked: its name, what it is for, the values it requires, those a line's
 *  ends must match, what it extends, its colour, and what is held to it. */
export function constraint_pairs(graph: Graph, id: Id, onAct: Act): Pair[] {
  const one = constraint_at(graph, id)!;
  const fixed = one.pkg !== graph.root;
  const write = (args: Record<string, unknown>) =>
    onAct("define_constraint", { id, name: one.name, ...args });
  const words = (key: "required" | "match", about: string): Pair => ({
    key, word: key, shown: (one[key] ?? []).join(", "), said: !!one[key]?.length, fixed,
    asks: [], verbs: [], about,
    ...(fixed ? {} : { text: { value: (one[key] ?? []).join(", "), placeholder: "a, b",
                               commit: (to: string) => write({ [key]: to }) } }),
  });
  return [
    named(one.name, fixed, (to) => write({ name: to })),
    described(one.description, fixed, (to) => write({ description: to })),
    words("required", "The values whatever is held to it must answer, by name, split on commas."),
    words("match", "On a line: the values both its ends must answer alike."),
    extended(graph, id, all_constraints(graph), fixed, write),
    coloured(graph, id, fixed, onAct),
    used(users_of(graph, id).length, fixed, () => onAct("delete", { ids: [id] }), "held by"),
  ];
}

/** What an interface definition is asked: its name, what it carries, what it extends, its colour,
 *  and the ports of it. */
export function interface_pairs(graph: Graph, id: Id, onAct: Act): Pair[] {
  const one = interface_at(graph, id)!;
  const fixed = one.pkg !== graph.root;
  const write = (args: Record<string, unknown>) =>
    onAct("define_interface", { id, name: one.name, ...args });
  return [
    named(one.name, fixed, (to) => write({ name: to })),
    described(one.description, fixed, (to) => write({ description: to })),
    extended(graph, id, all_interfaces(graph), fixed, write),
    coloured(graph, id, fixed, onAct),
    used(users_of(graph, id).length, fixed, () => onAct("delete", { ids: [id] }), "used by"),
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
    { key: "format", word: "format", shown: type.format ?? "", said: !!type.format, fixed,
      asks: [], verbs: [], about: "How its values are written: a pattern such as 0.00 or YYYY-MM-DD.",
      ...(fixed ? {} : { text: { value: type.format ?? "", placeholder: "format",
                                 commit: (to: string) => write({ format: to }) } }) },
    extended(graph, id, all_types(graph), fixed, write),
    coloured(graph, id, fixed, onAct),
    used(users_of(graph, id).length, fixed, () => onAct("delete", { ids: [id] }), "used by"),
  ];
}

/** Hues an entry may wear, by their common names. */
const HUES: readonly [string, number][] = [["red", 25], ["amber", 75], ["green", 145],
                                           ["teal", 190], ["blue", 245], ["violet", 300]];

/** What an entry extends: another of its kind, or its kind's base where it says none. */
function extended(graph: Graph, id: Id, kin: readonly { id: Id; name: string }[], fixed: boolean,
                  write: (args: Record<string, unknown>) => void): Pair {
  const now = entry_at(graph, id)?.type;
  return { key: "extends", word: "extends", shown: kin.find((k) => k.id === now)?.name ?? "",
           said: !!now, fixed, verbs: [],
           about: "Another of its kind it extends: it reads that one's colour and settings, as a "
             + "subtype does. Unsaid, its kind's base.",
           asks: fixed ? [] : [{ word: "extends", tip: "Press the one lit to give it back.",
             chips: kin.filter((k) => k.id !== id).map((k) => ({ value: k.id, word: k.name,
               on: now === k.id, set: now === k.id })),
             pick: (c) => write({ extends: c.set ? "" : c.value }) }] };
}

/** An entry's colour: a hue of its own, else what it extends paints it. */
function coloured(graph: Graph, id: Id, fixed: boolean, onAct: Act): Pair {
  const own = entry_at(graph, id)?.settings?.["style"]?.["hue"];
  const hue = setting_of(graph, id, "style")["hue"];
  const named_hue = HUES.find(([, h]) => h === hue)?.[0];
  return { key: "colour", word: "colour", shown: named_hue ?? (hue !== undefined ? String(hue) : ""),
           said: own !== undefined, fixed, verbs: [],
           about: "The hue its tiles, chips and ports wear: its own, else what it extends.",
           asks: fixed ? [] : [{ word: "hue", tip: "Press the one lit to give it back.",
             chips: HUES.map(([word, h]) => ({ value: String(h), word, on: hue === h,
                                                set: own === h })),
             pick: (c) => onAct("look", { ids: [id], key: "style", name: "hue",
                                          value: c.set ? "" : c.value }) }] };
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
