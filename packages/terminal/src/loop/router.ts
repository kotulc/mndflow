/** What to ask next, decided **from the graph** rather than from a script.
 *
 *  This is where the control flow the YAML refuses to carry actually lives. A
 *  domain says what the words are; this says whether there is anything to ask
 *  at all, which of the known operations it is, and what the question is about.
 *
 *  **The conditions are code, keyed by the name a file uses.** A file names
 *  one; what it means is here, so a domain can never invent a branch.
 *
 *  It reads context and changes none of it — the same rule the strip lives by,
 *  for the same reason: it ranks and chooses *against* context. */

import { children, shown_name, type Graph, type Id } from "@mnd/core";
import { domain, wording, type Operation, type Wordings } from "./domains";

/** The first question, which is not about an operation: which domain this is.
 *  Named rather than blank so a turn can tell it apart without a special case. */
export const ENTRY = "entry";

export type Question = {
  /** Which operation this asks about, or `entry` for the opening one. */
  operation: string;
  /** The block it is about. Null in the workspace layer, and at the entry. */
  about: Id | null;
  prompt: string;
  hint: string;
  /** What is offered as an answer. Never a closed list — every one of these is
   *  also typeable, and free text is what the loop is for. */
  choices: readonly string[];
};

/** The field a project records its domain in. An ordinary value, so it
 *  exports, undoes and is visible like anything else the user wrote. */
export const DOMAIN = "domain";

/** Whether there is anything to ask, per operation. **A lookup or a count**,
 *  which is all a condition is allowed to be. */
const WHEN: Record<string, (graph: Graph, layer: Id | null) => boolean> = {
  always: () => true,
  /** Nothing has been said about this block yet. */
  no_summary: (graph, layer) => layer !== null && !graph.blocks[layer]?.body?.trim(),
  /** Two or more here, so there is something to connect. */
  has_parts: (graph, layer) => children(graph, layer).length >= 2,
};

/** Which domain is in force: the nearest one named on the way up to the root.
 *  Per project where a project says, and per workspace where only it does. */
export function domain_of(graph: Graph, layer: Id | null): string {
  let at: Id | null = layer ?? graph.root;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    seen.add(at);
    const b: Graph["blocks"][string] | undefined = graph.blocks[at];
    const said = b?.fields?.find((f) => f.name === DOMAIN)?.value?.trim();
    if (said) return said;
    at = b?.parent ?? null;
  }
  return "";
}

/** The operations there is anything to ask about here, in the order they are
 *  preferred: the domain's lead first, then the order the file declares.
 *
 *  **`where` is what the conversation is about** — the block in focus, or the
 *  open layer when nothing is. Which of the two a host means is the host's, the
 *  same way it decides everything else about context. */
export function eligible(said: Wordings, graph: Graph, where: Id | null): Operation[] {
  const lead = domain(said, domain_of(graph, where)).lead;
  return said.operations
    .filter((op) => (WHEN[op.when] ?? WHEN["always"]!)(graph, where))
    .sort((a, b) => Number(b.id === lead) - Number(a.id === lead));
}

/** One of the wordings, picked by how much is here.
 *
 *  **Deterministic, and still varying** — random would make the same workspace
 *  read differently twice and could not be driven headlessly, while a fixed
 *  choice would make the loop a form. The model growing is what moves it. */
function one(of: readonly string[], graph: Graph): string {
  return of.length ? of[Object.keys(graph.blocks).length % of.length]! : "";
}

/** What to ask next, or null when this domain has nothing to say about
 *  anything that is eligible.
 *
 *  `last` is the operation just answered: another eligible one is preferred
 *  over asking the same thing twice, which is what keeps it a conversation. */
export function next(said: Wordings, graph: Graph, where: Id | null,
                     last?: string): Question | null {
  if (!domain_of(graph, where)) return opening(said, graph);

  const of = domain(said, domain_of(graph, where));
  const root = where === null || where === graph.root;
  const able = eligible(said, graph, where)
    .map((op) => ({ op, words: wording(of, op.id, root) }))
    .filter((x) => x.words);
  if (!able.length) return null;

  const pick = able.find((x) => x.op.id !== last) ?? able[0]!;
  const about = root ? null : where;
  return {
    operation: pick.op.id,
    about,
    prompt: fill(one(pick.words!.prompt, graph), graph, about),
    hint: fill(pick.words!.hint, graph, about),
    choices: pick.words!.choices.length ? pick.words!.choices
                                        : offers(pick.op.id, graph, where),
  };
}

/** The opening question: what is being built, and which domain that is. */
export function opening(said: Wordings, graph: Graph): Question {
  return {
    operation: ENTRY,
    about: null,
    prompt: one(said.entry.welcome, graph),
    hint: said.entry.hint,
    choices: said.entry.templates.map((t) => t.chip),
  };
}

/** What is already here, offered as an answer. **Derived from the layer**, so
 *  it is the router's rather than a file's: naming two of these is how a
 *  relationship gets drawn without leaving the strip. */
function offers(operation: string, graph: Graph, where: Id | null): string[] {
  if (operation !== "relate") return [];
  return children(graph, where).map((b) => shown_name(graph, b.id));
}

function fill(text: string, graph: Graph, about: Id | null): string {
  return about ? text.replaceAll("{label}", shown_name(graph, about)) : text;
}
