/** What one answer does.
 *
 *  There is no language model. An answer is taken literally: what you type is
 *  the name of the thing, or its text, or the far end of a relation —
 *  whichever the question asked for. Matching an existing name is exact, and a
 *  miss becomes a question rather than a guess.
 *
 *  Pure on purpose: given a graph and an answer it returns the changes and the
 *  next unresolved question, touching no state of its own. */

import { blocksOf } from "../graph/fold";
import { score } from "../embed/match";
import { CREATE_IT, ENTRY, classify, type Question } from "./router";
import {
  ROOT, defIdFor, edge as makeEdge, element as makeElement, type Graph, type Mutation,
} from "../graph/types";
import { entry, getDomain, type Terms } from "./workflows";

/** A relation half-built: what we know, and what we still need. */
export type Pending = { source: string | null; wanted: string };

export type Outcome = {
  mutations: Mutation[];
  pending: Pending | null;
  action: string;
};

/** Node id for a label, matching exactly and not otherwise. A loose match is a
 *  silent wrong answer; an exact one is either right or absent. */
export function resolve(graph: Graph, label: string): string | null {
  const wanted = label.trim().toLowerCase();
  if (!wanted) return null;

  return Object.values(graph.elements).find((n) => n.label.toLowerCase() === wanted)?.id ?? null;
}

/** Existing names most like the one given — options to offer, not an answer. */
export function nearest(graph: Graph, label: string, limit = 4): string[] {
  const options = Object.fromEntries(Object.values(graph.elements).map((n) => [n.id, n.label]));

  return score(label, options)
    .filter((hit) => hit.score > 0)
    .slice(0, limit)
    .map((hit) => graph.elements[hit.id].label);
}

/** The question a half-built relation asks. */
export function pendingQuestion(graph: Graph, pending: Pending): Question {
  const named = pending.wanted.trim();
  const others = Object.values(graph.elements)
    .filter((n) => n.id !== pending.source)
    .map((n) => n.label);

  return {
    id: "disambiguate",
    prompt: named
      ? `Nothing here is called "${named}". Which did you mean?`
      : "Which one does it connect to?",
    hint: named ? "Pick the one you meant, or create it." : "Pick the far end.",
    choices: named ? [...nearest(graph, named), CREATE_IT] : others.slice(0, 5),
    placeholder: "",
  };
}

const NOTHING: Outcome = { mutations: [], pending: null, action: "unclear" };

/** Build a relation, one end at a time.
 *
 *  With an object selected it is the near end and the answer is the far one.
 *  At the project level neither is implied, so the first answer fills the near
 *  end and the next question asks for the far one. Either way an unknown name
 *  stalls into a question instead of inventing a node. */
function relate(graph: Graph, said: string, scope: string | null,
                pending: Pending | null, terms: Terms): Outcome {
  const create = said.trim() === CREATE_IT;
  const known: Pending = pending ?? { source: scope, wanted: "" };
  const mutations: Mutation[] = [];
  let other = create ? null : resolve(graph, said);

  if (create && known.wanted) {
    const fresh = makeElement(known.wanted, { parent: scope });
    mutations.push({ op: "add_element", element: fresh });
    other = fresh.id;
  }

  // The name did not resolve, and was not confirmed as new.
  if (!other) {
    return { mutations: [], pending: { source: known.source, wanted: said }, action: "relate" };
  }

  const source = known.source ?? other;
  const target = known.source ? other : null;

  // Only one end known so far — ask for the other before changing anything.
  if (!target || source === target) {
    return { mutations, pending: { source, wanted: "" }, action: "relate" };
  }

  mutations.push({ op: "link_elements", edge: makeEdge(source, target) });

  return { mutations, pending: null, action: "relate" };
}

/** The changes an answer implies, and whatever is still unresolved. */
export function answer(graph: Graph, question: Question | null, said: string,
                       scope: string | null, pending: Pending | null,
                       terms: Terms): Outcome {
  const text = said.trim();
  if (!question || !text) return NOTHING;

  switch (question.id) {
    case "disambiguate":
      return relate(graph, text, scope, pending, terms);

    case ENTRY: {
      const chip = entry.templates.find((t) => t.chip === text);
      const template = classify(text);

      return {
        mutations: [
          { op: "set_vocabulary", vocabulary: template },
          { op: "update_element", id: ROOT, label: chip ? chip.chip : text },
          // The vocabulary's relations are seeded as definitions, so they
          // arrive with the project and are editable from then on.
          ...getDomain(template).relations.map((name) => ({
            op: "set_def" as const,
            id: defIdFor(name),
            name,
            form: "untyped" as const,
          })),
        ],
        pending: null,
        action: "entry",
      };
    }

    case "describe":
      if (!scope) return NOTHING;

      return {
        mutations: [{ op: "set_body", id: scope, body: text }],
        pending: null,
        action: "describe",
      };

    case "relate":
      return relate(graph, text, scope, null, terms);

    case "add": {
      // Commas separate a list. Answering "auth, billing, ledger" is three
      // objects in one step, which is how people actually reel off the parts
      // of something — and one step, so one undo takes the lot back.
      //
      // Names need only be unique among siblings: the same name can sit in two
      // different groups quite legitimately. A twin is skipped rather than
      // duplicated, and an answer that is all twins changes nothing, which the
      // caller reports as a nudge.
      const taken = new Set(blocksOf(graph, scope).map((n) => n.label.toLowerCase()));
      const mutations: Mutation[] = [];

      for (const part of text.split(",")) {
        const label = part.trim();
        if (!label || taken.has(label.toLowerCase())) continue;

        taken.add(label.toLowerCase());
        mutations.push({
          op: "add_element",
          element: makeElement(label, { parent: scope }),
        });
      }

      return { mutations, pending: null, action: "add" };
    }

    default:
      return NOTHING;
  }
}
