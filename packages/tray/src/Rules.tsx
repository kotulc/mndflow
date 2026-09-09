/** What must be true, stated where it is read.
 *
 *  **One panel, two holders.** A definition says what a whole kind of thing is
 *  asked for; one block says it for itself — and both are written the same way,
 *  because `looks` and `components` are the same bag and `look` takes whichever
 *  holder it is given. So this does not ask which it is looking at.
 *
 *  **The three that are lists of names.** `ends` and `degree` are nested
 *  records and a look says one property, so neither is authored here yet — what
 *  the chain says about them is still read, under the rest.
 *
 *  Pure like every other surface here: it holds what is being typed, and every
 *  change leaves as an action name. */

import { useState } from "react";
import { rules_of, type Act, type Graph, type Id, type Rules as InForce } from "@mnd/core";
import { Icon } from "@mnd/theme";

/** Each rule that is a list of names, and what it is asking. */
const STATED = [
  { name: "required", word: "must carry", of: "field" as const,
    tip: "Field names a usage has to carry a value for. The one constraint — "
       + "asked while modelling, refused only at translation." },
  { name: "holds", word: "may hold", of: "definition" as const,
    tip: "Which definitions this may contain. A rule naming one means it or "
       + "anything below it, so written once it reaches every subtype." },
  { name: "match", word: "must agree", of: "field" as const,
    tip: "Field names that have to agree across a relationship's two ends." },
] as const;

export type RulesProps = {
  graph: Graph;
  /** The block or definition the rules are stated on. */
  holder: Id;
  onAct: Act;
};

/** What this holder states for itself, as against what it inherits. */
function own_of(graph: Graph, holder: Id, name: string): string[] {
  const bag = graph.defs[holder]?.components?.["rules"]
           ?? graph.blocks[holder]?.looks?.["rules"];
  const said = bag?.[name];
  return Array.isArray(said) ? said.map(String) : [];
}

export function Rules({ graph, holder, onAct }: RulesProps) {
  const [adding, set_adding] = useState<Record<string, string>>({});
  const force = rules_of(graph, holder);
  /** Every block definition, for the one rule whose answers are definitions.
   *  **`graph.defs`, not the section** — the section replaces a base row with
   *  the workspace's override of it, and a rule may name either. */
  const named = Object.values(graph.defs).filter((d) => d.group === "block")
    .sort((a, b) => a.name.localeCompare(b.name));

  /** **The whole list, every time.** Adding and taking away are the same act
   *  said two ways, and a list handed over whole is one step and one undo
   *  whichever it was. Handed as a list rather than as text, so a field called
   *  *rated flow* stays one name. */
  const set = (name: string, next: string[]) =>
    onAct("look", { ids: [holder], key: "rules", name, value: next.length ? next : "" });

  return (
    <div className="rules-author">
      {STATED.map((r) => {
        const own = own_of(graph, holder, r.name);
        const inherited = (force[r.name as keyof InForce] as string[] | undefined) ?? [];
        /** **The nearer statement is the whole answer**, so what is inherited
         *  is only shown while this holder says nothing — anything else would
         *  read as a union, which is not what the cascade does. */
        const from_chain = own.length ? [] : inherited;
        const word = (v: string) => graph.defs[v]?.name ?? v;
        const left = r.of === "definition"
          ? named.filter((d) => !own.includes(d.id)) : [];
        return (
          <div key={r.name} className="rule" title={r.tip}>
            <label>{r.word}</label>
            <span className="chips">
              {own.map((v) => (
                <button key={v} className="chip" title={`stop asking for ${word(v)}`}
                        onClick={() => set(r.name, own.filter((x) => x !== v))}>
                  {word(v)}<Icon name="remove" size={10} />
                </button>
              ))}
              {from_chain.map((v) => (
                <span key={v} className="chip from" title="from the chain — restate it here to change it">
                  {word(v)}
                </span>
              ))}
              {r.of === "definition" ? (
                <select value="" aria-label={`add to ${r.name}`} disabled={!left.length}
                        onChange={(e) => {
                          if (!e.target.value) return;
                          set(r.name, [...own, e.target.value]);
                        }}>
                  <option value="">+ {r.of}</option>
                  {left.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              ) : (
                <input value={adding[r.name] ?? ""} placeholder={`+ ${r.of}`}
                       aria-label={`add to ${r.name}`}
                       onChange={(e) => set_adding((was) => ({ ...was, [r.name]: e.target.value }))}
                       onKeyDown={(e) => {
                         const said = (adding[r.name] ?? "").trim();
                         if (e.key !== "Enter" || !said || own.includes(said)) return;
                         set(r.name, [...own, said]);
                         set_adding((was) => ({ ...was, [r.name]: "" }));
                       }} />
              )}
            </span>
          </div>
        );
      })}

      {/* **Read, not written.** Both are nested records and a look says one
          property, so what a package states about them still shows. */}
      {force.ends || force.degree ? (
        <div className="rule read-only">
          <label>also</label>
          <span className="says">
            {force.ends ? `ends ${ends_word(graph, force.ends)}` : ""}
            {force.ends && force.degree ? " · " : ""}
            {force.degree ? `degree ${degree_word(force.degree)}` : ""}
            <em>from the chain, and not editable here</em>
          </span>
        </div>
      ) : null}
    </div>
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
