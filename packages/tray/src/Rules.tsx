/** What must be true, read where it is asked.
 *
 *  **Read, not written — for now.** Authoring got as far as three of the five
 *  rule kinds: `ends` and `degree` are nested records and a look says one
 *  property, so the panel could only show them, and the three it could write it
 *  wrote by splitting on whitespace, which turned a field called *rated flow*
 *  into two names nothing could ever satisfy. A surface that can state half a
 *  vocabulary is worse than one that states none, because what it cannot say is
 *  invisible. It comes back when all five can be written.
 *
 *  **One panel, two holders.** A definition says what a whole kind of thing is
 *  asked for; one block says it for itself — and `rules_of` takes either id,
 *  with the nearer statement winning. So this does not ask which it is looking
 *  at.
 *
 *  Pure, and now stateless: it reads the graph and says what it found. */

import { rules_of, type Graph, type Id, type Rules as InForce } from "@mnd/core";
import { Line } from "./Body";

/** Each rule, and what it is asking. */
const STATED = [
  { name: "required", word: "must carry",
    tip: "Field names a usage has to carry a value for. The one constraint — "
       + "asked while modelling, refused only at translation." },
  { name: "holds", word: "may hold",
    tip: "Which definitions this may contain. A rule naming one means it or "
       + "anything below it, so written once it reaches every subtype." },
  { name: "match", word: "must agree",
    tip: "Field names that have to agree across a relationship's two ends." },
] as const;

export type RulesProps = {
  graph: Graph;
  /** The block or definition the rules are read for. */
  holder: Id;
};

export function Rules({ graph, holder }: RulesProps) {
  const force = rules_of(graph, holder);
  const word = (v: string) => graph.defs[v]?.name ?? v;
  const said = STATED.filter((r) => (force[r.name as keyof InForce] as string[] | undefined)?.length);

  if (!said.length && !force.ends && !force.degree) {
    return <p className="empty">nothing is asked of it</p>;
  }

  return (
    <>
      {said.map((r) => (
        <Line key={r.name} label={r.word} tip={r.tip}>
          {((force[r.name as keyof InForce] as string[]) ?? []).map((v) => (
            <span key={v} className="chip from">{word(v)}</span>
          ))}
        </Line>
      ))}
      {force.ends ? (
        <Line label="joins" tip="What may sit at each end of this relationship.">
          <span className="says">{ends_word(graph, force.ends)}</span>
        </Line>
      ) : null}
      {force.degree ? (
        <Line label="degree" tip="How many relationships may arrive at and leave one usage.">
          <span className="says">{degree_word(force.degree)}</span>
        </Line>
      ) : null}
    </>
  );
}

function ends_word(graph: Graph, ends: NonNullable<InForce["ends"]>): string {
  const named = (ids?: readonly Id[]) =>
    ids?.length ? ids.map((d) => graph.defs[d]?.name ?? d).join(", ") : "anything";
  return `${named(ends.from)} → ${named(ends.to)}`;
}

function degree_word(degree: NonNullable<InForce["degree"]>): string {
  const span = (r?: { min?: number; max?: number }) =>
    !r ? "" : r.min !== undefined && r.max !== undefined ? `${r.min}–${r.max}`
      : r.min !== undefined ? `${r.min} or more` : `up to ${r.max}`;
  return [degree.in ? `in ${span(degree.in)}` : "",
          degree.out ? `out ${span(degree.out)}` : ""].filter(Boolean).join(", ");
}
