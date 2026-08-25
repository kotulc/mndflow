/** One answer, as actions somebody else runs.
 *
 *  **The loop writes no mutation of its own.** An answer comes back as action
 *  names and arguments, the app runs them, and what they write is a step like
 *  any other — so everything the conversation can do is something a gesture
 *  could already have done, and every capability it adds exists without it.
 *
 *  Nothing here is a parser. An answer is split, and the names in it are looked
 *  for among what is already in the layer — through `score` where a host has
 *  bound one, and by substring where it has not. */

import { ROOT, children, shown_name, type Graph, type Id, type Score } from "@mnd/core";
import { ENTRY, DOMAIN, type Question } from "./router";
import type { Entry, Wordings } from "./domains";

/** An action to run, and what to run it with. The same seam the pointer and
 *  the keyboard reach — a name and arguments, never a mutation. */
export type Doing = { action: string; args: Record<string, unknown> };

export type Answering = {
  graph: Graph;
  layer: Id | null;
  said: Wordings;
  /** Text similarity, where a host has bound it. Unbound, matching is
   *  substring, and everything still works. */
  score?: Score;
};

/** A list somebody typed, however they separated it. */
function listed(answer: string): string[] {
  return answer.split(/[,\n;]|\s+and\s+/).map((s) => s.trim()).filter(Boolean);
}

/** Which template an answer means: the chip they picked, what it is closest to
 *  in meaning, or the catch-all. **Not guessing falls to freeform**, which is
 *  why that entry has to exist. */
export function routes(entry: Entry, answer: string, score?: Score): string {
  const want = answer.trim().toLowerCase();
  const chip = entry.templates.find((t) => t.chip.toLowerCase() === want);
  if (chip) return chip.id;

  if (score && want) {
    /** Each tag on its own, best one winning — a long tag list joined into one
     *  vector is vaguer the more it says. */
    const tags = entry.templates.flatMap((t) => t.tags.map((tag) => ({ tag, id: t.id })));
    const at = score.nearest(answer.trim(), tags.map((t) => t.tag));
    if (at !== null && tags[at]) return tags[at]!.id;
  }
  return entry.templates.at(-1)?.id ?? "freeform";
}

/** The blocks an answer names, **in the order it names them**. Substring over
 *  the shown names, longest first so `Auth Service` wins over `Auth`. */
export function named_in(graph: Graph, layer: Id | null, answer: string): Id[] {
  const want = answer.toLowerCase();
  return children(graph, layer)
    .map((b) => ({ id: b.id, name: shown_name(graph, b.id).toLowerCase() }))
    .filter((b) => b.name && want.includes(b.name))
    .sort((a, b) => b.name.length - a.name.length)
    .filter((b, _n, all) => !all.some((o) => o !== b && o.name.includes(b.name)))
    .sort((a, b) => want.indexOf(a.name) - want.indexOf(b.name))
    .map((b) => b.id);
}

/** One answer, as the actions it means.
 *
 *  Empty where the answer said nothing to do — which is an answer, and leaves
 *  the loop to ask the next thing rather than refusing this one. */
export function turn(question: Question, answer: string, ctx: Answering): Doing[] {
  const text = answer.trim();
  if (!text) return [];

  if (question.operation === ENTRY) return entering(text, ctx);

  const about = question.about;
  const layer = ctx.layer;

  if (question.operation === "describe") {
    return about ? [{ action: "describe", args: { id: about, body: text } }] : [];
  }

  if (question.operation === "relate") {
    /** **Two ends, in the order they were named.** About a block, that block
     *  is the first; in the workspace layer the answer names both. Anything it
     *  names that is not here yet is made, and related next time round. */
    const found = named_in(ctx.graph, layer, text).filter((id) => id !== about);
    const ends = about ? [about, ...found] : found;
    if (ends.length >= 2) {
      return [{ action: "relate",
                args: { from: ends[0], to: ends[1], module: "directed" } }];
    }
    return listed(text).filter((name) => !named_in(ctx.graph, layer, name).length)
      .map((label) => ({ action: "create", args: { label } }));
  }

  /** `add`, and anything else a domain words: a list of names, one block each,
   *  inside what the question was about. */
  return listed(text).map((label) => ({
    action: "create",
    args: about ? { label, parent: about } : { label },
  }));
}

/** The opening answer: which domain this is, and what the workspace is called.
 *
 *  **Both are by id**, so neither depends on what the other wrote — a turn
 *  hands back actions all at once, and one that had to read the result of a
 *  previous one would need a second seam to do it through. */
function entering(text: string, ctx: Answering): Doing[] {
  const picked = routes(ctx.said.entry, text, ctx.score);
  const chip = ctx.said.entry.templates.find((t) => t.id === picked);
  const out: Doing[] = [{ action: "field",
    args: { holder: ctx.graph.root ?? ROOT, name: DOMAIN, value: picked } }];

  /** Free text says what this *is*, so it names the workspace. Picking a chip
   *  says only which vocabulary, and names nothing. */
  if (chip && chip.chip.toLowerCase() !== text.toLowerCase()) {
    out.push({ action: "rename", args: { id: ctx.graph.root ?? ROOT, label: text } });
  }
  return out;
}
