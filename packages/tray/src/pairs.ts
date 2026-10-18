/** The card and settings tabs' keys as data: one pair per key a card or a line says — what its line reads,
 *  whether it is said here or carried, what the key is for, and the choices that answer it. **Every
 *  key is listed, said or not**, so anything a card carries can be changed from one place. The
 *  source column draws the lines; the choices column draws the lit pair's questions as chips. */

import { all_defs, all_tags, attributes_of, base_of, def_at, def_of, domain_of, ends_of, form_of,
         frozen, OWNERSHIPS, type End,
         given_of, holds_defs, honours, is_base, is_domain, is_holder, is_interface, isa, kind_free,
         may_hold, package_of, shown_name, subtree, tag_at, tags_stated, traits_stated, type_at,
         type_name, TRAITS, type Act, type Attribute, type Block,
         type Definition, type Graph, type Id } from "@mnd/core";
import { port_pairs, tag_pairs, type_pairs } from "./components";
import { taken } from "./Definitions";
import { defined, held, kind_of, reading, types_for } from "./holder";
import { AS_RUN, ASKS, parts_in_order, ROWS, type Group } from "./questions";

/** One answer. `on` is what holds; `set`, that it is said here rather than carried. `group` is
 *  where it lives, which the choices are gathered under. */
export type Chip = { value: string; word: string; on: boolean; set?: boolean; tip?: string;
                     group?: string };

/** Free text, where no chip can hold the answer. */
export type Typed = {
  value: string; placeholder: string;
  /** Why this may not be kept, or null. */
  clash?: (to: string) => string | null;
  commit: (to: string) => void;
};

/** One question a key asks, answered by its chips; given `add`, a word typed makes a new one. */
export type Ask = { word: string; tip: string; chips: Chip[]; pick: (chip: Chip) => void;
                    add?: Typed };

/** A one-shot: it does something and is done. */
export type Verb = { word: string; tip: string; run: () => void };

export type Pair = {
  /** Unique among the pairs: what the light is kept by. */
  key: string;
  /** The key as the line writes it. */
  word: string;
  /** The section it is listed under, where it is not a top-level key. */
  under?: string;
  /** What the line reads, and whether it is said here or carried. */
  shown: string;
  said: boolean;
  /** What the key is for, said over its choices. */
  about: string;
  /** Nothing about it is this element's to change. */
  fixed?: boolean;
  /** Typed on the key's own line; `wrap`, in the choices column, where words run long. */
  text?: Typed & { wrap?: boolean };
  asks: Ask[];
  /** A part of how it draws, answered by the look questions of that part. */
  look?: Group;
  verbs: Verb[];
};

/** Every pair a card or a line says, in the order a card source writes them. */
export function pairs_of(graph: Graph, id: Id, onAct: Act, onOpen?: (id: Id) => void): Pair[] {
  /** A component is asked its own questions: an interface, a tag, a type. */
  if (is_interface(graph, id)) return port_pairs(graph, id, onAct, onOpen);
  if (tag_at(graph, id)) return tag_pairs(graph, id, onAct);
  if (type_at(graph, id)) return type_pairs(graph, id, onAct);
  const it = held(graph, id);
  if (!it) return [];
  const d = it.def;
  if (it.edge) {
    return [named(graph, id, onAct), typed(graph, id, onAct, onOpen), ...ended(graph, id, onAct),
            tags(graph, id, onAct)];
  }
  const relation = d && domain_of(graph, d.id) === "relation";
  return d ? [
    named_def(graph, d, onAct), described(graph, id, onAct), extends_of(graph, d, onAct, onOpen),
    ...(relation ? ended(graph, id, onAct) : []),
    placed(graph, id, onAct), tags(graph, id, onAct), traits(graph, d, onAct),
    ...values(graph, id, onAct),
  ] : [
    named(graph, id, onAct), described(graph, id, onAct), typed(graph, id, onAct, onOpen),
    placed(graph, id, onAct), tags(graph, id, onAct), sourced(graph, id, onAct),
    ...values(graph, id, onAct),
  ];
}


/** The multiplicities offered as chips; any other `m..n` is typed. */
const MULTIPLICITIES = ["1", "0..1", "*", "1..*"];

/** What each end of a relation means: how many meet it, its role, who owns whom, and whether it
 *  can be reached. A line says multiplicity and role over its definition's; a relation definition
 *  says all four. */
function ended(graph: Graph, id: Id, onAct: Act): Pair[] {
  const line = !!graph.edges[id];
  const fixed = frozen(graph, id);
  const held_ends = ends_of(graph, id);
  const own = (line ? graph.edges[id]?.ends : def_at(graph, id)?.def.ends) ?? {};
  return (["from", "to"] as const).map((way): Pair => {
    const end: End = held_ends[way] ?? {};
    const mine: End = own[way] ?? {};
    const say = (args: Record<string, unknown>) => onAct("end", { id, end: way, ...args });
    const shown = [end.multiplicity, end.role,
                   end.ownership && end.ownership !== "none" ? end.ownership : "",
                   end.navigable === true ? "navigable" : end.navigable === false ? "not navigable" : ""]
      .filter(Boolean).join(", ");
    const asks: Ask[] = [{
      word: "multiplicity", tip: "How many meet this end. Press the one lit to give it back.",
      chips: MULTIPLICITIES.map((m) => ({ value: m, word: m, on: end.multiplicity === m,
                                          set: mine.multiplicity === m })),
      pick: (c) => say({ multiplicity: c.set ? "" : c.value }),
      add: { value: "", placeholder: "m..n", commit: (to) => say({ multiplicity: to }) },
    }];
    if (!line) {
      asks.push({
        word: "ownership", tip: "Who owns whom, said at the owner's end: shared is an aggregation, "
          + "composite a composition.",
        chips: OWNERSHIPS.map((o) => ({ value: o, word: o, on: (end.ownership ?? "none") === o,
                                        set: mine.ownership === o })),
        pick: (c) => say({ ownership: c.set ? "" : c.value }),
      }, {
        word: "navigable", tip: "Whether this end can be reached from the other: an open head, a "
          + "cross half a unit in, or nothing said.",
        chips: [["yes", true], ["no", false]].map(([w, v]) => ({
          value: String(w), word: String(w), on: end.navigable === v, set: mine.navigable === v })),
        pick: (c) => say({ navigable: c.set ? "unsaid" : c.value }),
      });
    }
    return {
      key: `end-${way}`, word: `${way} end`, shown, said: Object.keys(mine).length > 0, fixed,
      about: `What the ${way} end means.${line ? " A line says its multiplicity and role; the "
        + "rest is its definition's." : ""}${fixed ? FROZEN : ""}`,
      ...(fixed ? {} : { text: { value: mine.role ?? "", placeholder: end.role ?? "role",
                                 commit: (to: string) => say({ role: to }) } }),
      asks: fixed ? [] : asks, verbs: [],
    };
  });
}

/** An element's name: its own, else its type's drawn faint. */
function named(graph: Graph, id: Id, onAct: Act): Pair {
  const it = held(graph, id)!;
  const own = (it.block ?? it.edge)!.name ?? "";
  const placeholder = def_at(graph, def_of(graph, id))?.name ?? kind_of(graph, id, it).kind;
  return {
    key: "name", word: "name", shown: own || placeholder, said: !!own, asks: [], verbs: [],
    about: "What this is called, as the drawing writes it. Left blank it draws its type's name.",
    text: { value: own, placeholder, commit: (to) => onAct("rename", { id, name: to }) },
  };
}

/** A definition's name: the word every usage draws where it carries none of its own. */
function named_def(graph: Graph, d: Definition, onAct: Act): Pair {
  const fixed = frozen(graph, d.id);
  return {
    key: "name", word: "name", shown: d.name, said: true, fixed, asks: [], verbs: [],
    about: "What this definition is called, and the word every usage draws where it carries no "
      + `name of its own. Renaming keeps everything naming it.${fixed ? FROZEN : ""}`,
    ...(fixed ? {} : { text: {
      value: d.name, placeholder: "name",
      clash: (to: string) => taken(graph, to, domain_of(graph, d.id), d.id),
      commit: (to: string) => onAct("rename", { id: d.id, name: to }),
    } }),
  };
}

/** What it is for, in a line: shown beside it and on hover. */
function described(graph: Graph, id: Id, onAct: Act): Pair {
  const said = graph.blocks[id]!.description ?? "";
  const fixed = frozen(graph, id);
  return {
    key: "description", word: "description", shown: said, said: !!said, fixed, asks: [],
    verbs: [],
    about: `What it is for, in a line. The canvas shows it on hover.${fixed ? FROZEN : ""}`,
    ...(fixed ? {} : { text: {
      value: said, placeholder: "what it is for", wrap: true,
      commit: (to: string) => onAct("describe", { id, description: to }),
    } }),
  };
}

/** Which definition an element follows: a base is one of them. A new word files a definition
 *  over what it follows. Its own definition's base is asked under it. */
function typed(graph: Graph, id: Id, onAct: Act, onOpen?: (id: Id) => void): Pair {
  const it = held(graph, id)!;
  const { kind, runs } = kind_of(graph, id, it);
  const { own, mine, fixed } = defined(graph, id, it, runs);
  const following = def_at(graph, def_of(graph, id));
  const at = following?.id ?? kind;
  const retype = (to: Id) => onAct("retype", { ids: [id], type: to });

  const asks: Ask[] = [{
    word: "type", tip: `Which definition this ${runs ? "line" : "block"} follows. Only definitions`
      + " of its own kind apply.",
    chips: types_for(graph, id).map((x) => ({
      value: x.id, word: x.name, on: x.id === at, set: true, group: where(graph, x.id),
      tip: x.description ?? x.name })),
    pick: (c) => { if (!c.on) retype(c.value); },
    add: { value: "", placeholder: "new type",
           clash: (to) => (types_for(graph, id).some((x) => x.name === to)
             ? null : taken(graph, to, runs ? "relation" : "block")),
           commit: (to) => {
             const hit = types_for(graph, id).find((x) => x.name === to);
             if (hit) retype(hit.id);
             else if (to) onAct("define_from", { id, name: to });
           } },
  }];
  /** What its own definition is built on: re-basing it moves everything following it. */
  if (mine && !fixed) asks.push(rebase(graph, own!, onAct, "extends"));

  return {
    key: "type", word: "type", shown: following?.name ?? kind, said: !!following, asks,
    about: "The definition it follows, which says how it draws and what it may carry. A new word "
      + "files a definition over what it follows.",
    verbs: [
      ...(following && onOpen ? [{ word: "view definition",
                                   tip: `open ${following.name} to edit it`,
                                   run: () => onOpen(following.id) }] : []),
      ...(mine && !fixed ? [{ word: "remove definition",
                              tip: `remove ${own!.name} — refused while anything uses it`,
                              run: () => onAct("delete", { ids: [own!.id] }) }] : []),
    ],
  };
}

/** What a definition extends, which is a definition file's `type`: its kind's base unless
 *  another is picked. */
function extends_of(graph: Graph, d: Definition, onAct: Act, onOpen?: (id: Id) => void): Pair {
  const { kind } = kind_of(graph, d.id, { def: d, block: null, edge: null });
  const up = def_at(graph, d.type ?? kind);
  const fixed = frozen(graph, d.id) || is_base(d.id);
  return {
    key: "type", word: "type", shown: up?.name ?? kind, said: !!d.type, fixed,
    about: is_base(d.id) ? "A base is shipped and extends nothing."
      : `The definition this one refines. Re-basing it moves everything following it.${
        fixed ? FROZEN : ""}`,
    asks: is_base(d.id) ? [] : [rebase(graph, d, onAct, "type")],
    verbs: up && onOpen && up.id !== d.id ? [{ word: "view definition", tip: `open ${up.name}`,
                                               run: () => onOpen(up.id) }] : [],
  };
}

/** What a definition may be re-based on: its own kind's, or either kind's while nothing it
 *  shaped exists. Never itself, nor anything built on it. Its base is one of them. */
function rebase(graph: Graph, d: Definition, onAct: Act, word: string): Ask {
  const { kind } = kind_of(graph, d.id, { def: d, block: null, edge: null });
  const at = d.type ?? kind;
  const offered = all_defs(graph)
    .filter((x) => (domain_of(graph, x.id) === domain_of(graph, d.id) || kind_free(graph, d.id))
      && x.id !== d.id && !isa(graph, x.id).some((up) => up.id === d.id));
  return {
    word, tip: `What ${d.name} is built on. Changing it re-bases it, so everything following it `
      + "moves with it.",
    chips: offered.map((x) => ({ value: x.id, word: x.name, on: x.id === at, set: true,
                                 group: where(graph, x.id), tip: x.description ?? x.name })),
    pick: (c) => { if (!c.on) onAct("retype", { ids: [d.id], type: c.value }); },
  };
}

/** Where it sits: a usage in a block of its own package that may hold it, a definition in a
 *  folder of a package's definitions. */
function placed(graph: Graph, id: Id, onAct: Act): Pair {
  const b = graph.blocks[id]!;
  const fixed = frozen(graph, id);
  const inside = new Set(subtree(graph, id));
  const home = package_of(graph, id);
  const may = (x: Block) => !inside.has(x.id) && !frozen(graph, x.id)
    && (b.def ? holds_defs(graph, x.id)
      : !is_domain(graph, x.id) && package_of(graph, x.id) === home
        && (x.id === graph.root || is_holder(graph, x.id) || may_hold(graph, x.id, b.type)));
  const up = graph.blocks[b.parent ?? ""];
  return {
    key: "parent", word: "parent", shown: up ? shown_name(graph, up.id) : "", said: true, fixed,
    about: (b.def ? "The folder this definition is filed in."
                  : "The block it sits in: the layer it is drawn on.") + (fixed ? FROZEN : ""),
    asks: [{
      word: "parent", tip: "Press one to move it there.",
      chips: Object.values(graph.blocks).filter(may)
        .map((x) => ({ value: x.id, word: shown_name(graph, x.id), on: x.id === b.parent,
                       set: true, group: where(graph, x.id) })),
      pick: (c) => { if (!c.on) onAct("move", { ids: [id], parent: c.value }); },
    }],
    verbs: [],
  };
}

/** Its tags, **grouped by source**: stated here, carried from its definition, and one group per
 *  annotation giving one by its name. Every tag is removable: a stated one leaves the list, a
 *  carried one makes the list its own without it, and one an annotation gives takes away the
 *  membership — never the annotation. */
function tags(graph: Graph, id: Id, onAct: Act): Pair {
  const { ids, from } = tags_stated(graph, id);
  const said = from === id;
  const fixed = !!graph.blocks[id] && frozen(graph, id);
  const set = (to: string[]) => onAct("tag", { ids: [id], tags: to });
  const given = graph.blocks[id] ? given_of(graph, id) : [];
  const source = said ? "stated" : `carried from ${name_of(graph, from ?? "")}`;
  const word = (t: Id) => tag_at(graph, t)?.name ?? t;
  const chips: Chip[] = [
    ...ids.map((t) => ({ value: t, word: word(t), on: true, set: said, group: source,
                         tip: tag_at(graph, t)?.description ?? `take ${word(t)} off` })),
    ...given.map((g) => ({ value: `${GIVEN}${g.from}`, word: g.name, on: true, set: true,
                           group: `${base_of(graph, g.from)}: ${g.name}`,
                           tip: g.tie ? `untie the label ${g.name}` : `take it out of ${g.name}` })),
    ...all_tags(graph).filter((t) => !ids.includes(t.id))
      .map((t) => ({ value: t.id, word: t.name, on: false, set: said, group: "library",
                     tip: t.description ?? t.name })),
  ];
  return {
    key: "tags", word: "tags", shown: listed([...ids.map(word), ...given.map((g) => g.name)]),
    said, fixed,
    about: "Tags to find this by, grouped by where each comes from. It carries its definition's "
      + "until it says its own; a group, a region or a label gives one by its name. A new word "
      + `makes a tag in the workspace's library.${fixed ? FROZEN : ""}`,
    asks: [{
      word: "tags", tip: "Press one to put it on or take it off.", chips,
      pick: (c) => (c.value.startsWith(GIVEN)
        ? onAct("unmember", { id, from: c.value.slice(GIVEN.length) })
        : set(c.on ? ids.filter((t) => t !== c.value) : [...ids, c.value])),
      add: { value: "", placeholder: "new tag", commit: (to) => { if (to) set([...ids, to]); } },
    }],
    verbs: said && from && !fixed ? [{ word: "inherit", tip: "carry its definition's tags again",
                                       run: () => onAct("tag", { ids: [id] }) }] : [],
  };
}

/** What marks a chip as a tag an annotation gives, by the annotation's id. */
const GIVEN = "@given:";

/** What a definition can do: one engine trait per capability. */
function traits(graph: Graph, d: Definition, onAct: Act): Pair {
  const { ids, from } = traits_stated(graph, d.id);
  const said = from === d.id;
  const fixed = frozen(graph, d.id);
  const set = (to: Id[]) => onAct("trait", { ids: [d.id], traits: to });
  return {
    key: "traits", word: "traits", shown: listed(ids), said, fixed,
    about: "What it can do, one capability each. It carries what it extends until it says its "
      + `own.${from && !said ? ` Now carried from ${name_of(graph, from)}.` : ""}${
        fixed ? FROZEN : ""}`,
    asks: [{
      word: "traits", tip: "Press one to give it that capability, or take it away.",
      chips: TRAITS.map((x) => ({ value: x.id, word: x.id, on: ids.includes(x.id), set: said,
                                  tip: x.description })),
      pick: (c) => set(c.on ? ids.filter((t) => t !== c.value) : [...ids, c.value]),
    }],
    verbs: said && !fixed ? [{ word: "inherit", tip: "carry the traits of what it extends",
                               run: () => onAct("trait", { ids: [d.id] }) }] : [],
  };
}

/** Where its content came from, as one uri: provenance, never a link. */
function sourced(graph: Graph, id: Id, onAct: Act): Pair {
  const said = graph.blocks[id]!.source ?? "";
  return {
    key: "source", word: "source", shown: said, said: !!said, asks: [], verbs: [],
    about: "Where its content lives outside the workspace — a path or a link. Nothing syncs to "
      + "it; attaching a markdown file sets it.",
    text: { value: said, placeholder: "a path or a link",
            commit: (to) => onAct("source", { id, uri: to }) },
  };
}

/** One pair per attribute: a usage's value, else its default faint; a definition's default,
 *  written where it is declared. */
function values(graph: Graph, id: Id, onAct: Act): Pair[] {
  const d = def_at(graph, id);
  const b = graph.blocks[id]!;
  const fixed = !!d && frozen(graph, id);
  const all = attributes_of(graph, def_of(graph, id));
  const extra = (d ? [] : b.values ?? []).filter((v) => !all.some((a) => a.name === v.name))
    .map((v): Attribute & { from?: Id } => ({ name: v.name }));

  return [...all, ...extra].map((a) => {
    const own = d ? (a.from === id ? a.default : undefined)
      : b.values?.find((v) => v.name === a.name)?.value;
    /** A definition writes only the defaults it declares itself. */
    const mine = !fixed && (!d || a.from === id);
    const write = (to: string) => onAct("field", { holder: id, name: a.name,
                                                   [d ? "default" : "value"]: to });
    const shown = own ?? a.default ?? "";
    const form = form_of(graph, a.type);
    const choices = type_at(graph, a.type)?.choices;
    const of = form === "flag" ? ["true", "false"] : form === "choice" && choices ? choices : null;
    return {
      key: `@${a.name}`, word: a.name, shown, said: own !== undefined, fixed: !mine,
      about: [a.note, `An attribute: ${type_name(graph, a.type)}`
                + `${a.unit ? `, in ${a.unit}` : ""}.`,
              d && a.from !== id ? `Declared on ${name_of(graph, a.from!)}.` : ""]
        .filter(Boolean).join(" "),
      ...(mine && !of ? { text: { value: own ?? "", placeholder: a.default ?? "",
                                  commit: write } } : {}),
      asks: of ? [{
        word: d ? "default" : "value", tip: "Press the one lit to give it back.",
        chips: of.map((v) => ({ value: v, word: v, on: shown === v, set: own === v })),
        pick: (c) => write(c.set ? "" : c.value),
      }] : [],
      verbs: mine && own !== undefined && !d ? [{
        word: "clear", tip: `clear ${a.name}`,
        run: () => onAct("unfield", { holder: id, name: a.name }) }] : [],
    };
  });
}

/** How a definition draws: **one key per part of the drawing** — name, label, face, head,
 *  colour, border, icon, those its kind honours. Its settings are the part's choices, so the key
 *  says no value of its own: it reads in ink where the definition says any of them, faint where it
 *  carries them all. The settings tab draws these as the card tab draws `pairs_of`. */
export function settings_of(graph: Graph, id: Id, onAct: Act): Pair[] {
  const d = def_at(graph, id);
  const it = held(graph, id);
  if (!d || !it) return [];
  const { kind, runs } = kind_of(graph, id, it);
  const { said } = reading(graph, id, it);
  const honoured = honours(kind);
  const fixed = frozen(graph, id);
  return parts_in_order().filter((g) => honoured.includes(ASKS[g])).flatMap((g): Pair[] => {
    const asked = ROWS[g].filter((q) => honoured.includes(q.key));
    if (!asked.length) return [];
    const own = asked.filter((q) => said(q.key, q.name) !== undefined);
    const word = (runs && AS_RUN[g]) || g;
    return [{
      key: g, word, shown: "", said: own.length > 0, fixed, asks: [], look: g,
      about: `${PARTS[g]}${fixed ? FROZEN : ""}`,
      verbs: own.length && !fixed ? [{
        word: "inherit", tip: `give every ${word} setting back to what it inherits`,
        run: () => own.forEach((q) => onAct("look", { ids: [id], key: q.key, name: q.name,
                                                      value: "" })),
      }] : [],
    }];
  });
}

/** What each part of a drawing is. */
const PARTS: Record<Group, string> = {
  name: "How the name is set: its font, weight and contrast, which end it reads from, and "
    + "whether the handle joins it.",
  label: "The kind word: where it sits, and how it is set.",
  face: "Which large face it draws, how big, and whether that face names itself.",
  head: "What draws where the run leaves and where it arrives.",
  colour: "How it is painted: the family, the pattern, and the hue, intensity and opacity.",
  border: "The line round it: its weight, contrast and style.",
  icon: "The mark in its top corner.",
};


/** Said after a frozen definition's about. */
export const FROZEN = " It came frozen with its package, so it reads only.";

/** A list as YAML flows it. */
function listed(names: string[]): string {
  return names.length ? `[${names.join(", ")}]` : "[]";
}

function name_of(graph: Graph, id: Id): string {
  return graph.blocks[id]?.name ?? id;
}

/** Where a block lives, as the path of what holds it — a package, then its folders — which the
 *  choices are gathered under. */
export function where(graph: Graph, id: Id): string {
  const path: string[] = [];
  for (let at = graph.blocks[graph.blocks[id]?.parent ?? ""]; at;
       at = graph.blocks[at.parent ?? ""]) {
    path.unshift(shown_name(graph, at.id));
  }
  return path.join(" / ");
}
