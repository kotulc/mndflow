/** What one thing is: **the left column of the settings panel.**
 *
 *  The drawing first, with what kind it is and how many there are beside it;
 *  then its name, the definition it draws through, and the boxes that say where
 *  that definition is offered. **Every branch on which holder this is lives
 *  here**, which is what leaves the column beside it uniform.
 *
 *  | holder | name | type |
 *  |---|---|---|
 *  | workspace | its name, and its id | — |
 *  | block | its name | its definition |
 *  | line | its stereotype, or blank | its template |
 *  | definition | its name | what it refines |
 *
 *  A pure function of its props, like every other surface. */

import { useState } from "react";
import { alias_of, BASE_PACKAGE, def_id, isa, is_template, kind_word, may_retype, module_of,
         pinned_lines, role_of, shipped, shown_name, stereotypes, template_of, templates,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon, role_icon, type IconName } from "@mnd/theme";
import { Band, Body, Line } from "./Body";
import { Card } from "./Card";
import { Wire } from "./Wire";
import { DRAFT } from "./draft";
import { held, kind_of, reading } from "./holder";

export type IdentityProps = { graph: Graph; id: Id; onAct: Act };

export function Identity({ graph, id, onAct }: IdentityProps) {
  const it = held(graph, id);
  if (!it) return <p className="empty">that is not here any more</p>;
  const { def: d, block: b, edge, borrowed } = it;
  const { said, now } = reading(graph, id, it);
  const { kind, runs } = kind_of(graph, id, it);
  const is_root = !d && id === graph.root;
  /** **A draft is a definition nothing has filed yet**: its name is still
   *  being written, and nothing can offer it until it is saved. */
  const drafted = id === DRAFT;
  const taken = drafted && d!.name.trim() ? graph.defs[def_id(d!.name.trim())] : undefined;

  const all = Object.values(graph.defs)
    .filter((x) => x.group === (runs ? "relation" : "block"))
    .sort((a, z) => a.name.localeCompare(z.name));
  const named = b?.type ?? edge?.type;

  /** **A line's one type answers two rows**: the template it draws through,
   *  and the stereotype naming it where the type is not itself a template. */
  const template = edge ? template_of(graph, named) : undefined;
  const stereotype = edge && named && graph.defs[named] && !is_template(graph.defs[named]!)
    ? graph.defs[named] : undefined;

  /** **The definition the boxes are about** — itself; a line's template, since
   *  that is what the rail offers; or the one a block names. */
  const own = d ?? (edge ? template : named ? graph.defs[named] : undefined);
  const mine = !!own && !shipped(own) && !own.from && own.id !== DRAFT;
  const listed = pinned_lines(graph).some((x) => x.id === own?.id);

  const role = b ? role_of(graph, id) : null;
  const label = d ? d.name : shown_name(graph, id);
  const word = (d ?? (named ? graph.defs[named] : undefined))?.name ?? kind;
  const shows = now("card", "shows", "");

  /** How many of this the workspace holds — of that definition where one is
   *  held, of that kind otherwise. **Counted among its own sort.** */
  const tally = d
    ? (runs ? Object.values(graph.edges) : Object.values(graph.blocks))
        .filter((x) => x.type === d.id).length
    : edge ? Object.values(graph.edges)
        .filter((x) => template_of(graph, x.type)?.id === template?.id && x.module === kind).length
    : Object.values(graph.blocks).filter((x) => module_of(graph, x.id) === kind).length;
  const mark: IconName = runs ? (kind === "tie" ? "relation_tie" : "relation_plain")
    : role_icon(role ?? kind);

  return (
    <div className="col what">
      <div className="styles-head">
        {runs ? (
          <Wire label={label} alias={edge ? alias_of(graph, id, true) : undefined}
                said={said} now={now} />
        ) : (
          <Card label={label} alias={b ? alias_of(graph, id) : undefined}
                kind={word} icon={(now("card", "icon", "") || role_icon(role ?? kind)) as IconName}
                role={role ?? kind} mark={now("card", "mark", "")}
                fields={it.fields} shows={shows.length > 0} said={said} now={now} />
        )}
        {/* **What kind it is and how many there are**, beside the drawing they
            are about — the two facts about a kind that are not on the card. */}
        {!is_root ? (
          <div className="kind-rows">
            <span><span className="holder">{runs ? "line type" : "card type"}</span>
              <span className="base">{kind}<Icon name={mark} size={12} /></span></span>
            <span className="tally">{tally} {tally === 1 ? "instance" : "instances"}</span>
          </div>
        ) : null}
      </div>

      <Band label="identity" />
      <Body>
        {/* **A draft's name is never a lookup**: one already taken is said, and
            saving waits. A filed definition's name is read-only, since the id
            is slugged from it. */}
        {drafted ? (
          <Line label="name" tip="What this definition will be called. Saving files it under this name.">
            <input value={d!.name} aria-label="name" placeholder="name it to save it"
                   onChange={(e) => onAct("define", { id, name: e.target.value,
                                                     extends: d!.extends ?? "" })} />
            {taken ? <span className="from warn">{taken.name} already exists</span> : null}
          </Line>
        ) : d ? (
          <Line label="name" tip="What this definition is called. Retiring it is unpinning it.">
            <input value={d.name} readOnly aria-label="name" />
          </Line>
        ) : b ? (
          <Line label="name" tip="What this is called, as the drawing writes it.">
            <input value={b.name ?? ""} aria-label="name" placeholder={kind_word(graph, b)}
                   onChange={(e) => onAct("rename", { id, name: e.target.value })} />
          </Line>
        ) : edge ? (
          <Line label="name" tip="The stereotype naming this line. Pick one, type a new one, or leave it blank.">
            <Picker key={`${id}:n:${named ?? ""}`} id={id} current={stereotype?.name ?? ""}
                    offered={stereotypes(graph)} blank="no stereotype" noun="stereotype"
                    onPick={(x) => onAct("retype", { ids: [id], type: x.id })}
                    onNew={(name) => onAct("rename", { id, name })}
                    onClear={() => onAct("retype", { ids: [id], type: template?.id ?? "" })} />
          </Line>
        ) : null}

        {is_root ? (
          <Line label="id" tip="What this project is called in the file and in every log.">
            <input value={id} readOnly aria-label="id" />
          </Line>
        ) : null}

        {d ? (
          <Line label="type" className="subtype"
                tip="The definition this one refines. The path is where it sits in the definitions folder.">
            <select value={d.extends ?? ""} aria-label="type" disabled={borrowed}
                    onChange={(e) => onAct("define", { ...(drafted ? { id } : {}),
                                                       name: d.name, extends: e.target.value })}>
              <option value="">nothing</option>
              {all.filter((x) => x.id !== d.id && !isa(graph, x.id).some((up) => up.id === d.id))
                  .map((x) => <option key={x.id} value={x.id}>{where(x)}</option>)}
            </select>
          </Line>
        ) : !is_root ? (
          <Line label="type" className="subtype"
                tip={edge
                  ? "The template this line draws through. Picking one drops its stereotype; a new name keeps this look as a template."
                  : "What sort of thing this is. Pick one, or type a new name to keep this look as a definition."}>
            <Picker key={`${id}:t:${named ?? ""}`} id={id}
                    current={edge ? template?.name ?? "" : named && graph.defs[named]
                      && !shipped(graph.defs[named]!) ? graph.defs[named]!.name : ""}
                    offered={edge ? templates(graph)
                      : all.filter((x) => !shipped(x) && may_retype(graph, id, x.id))}
                    blank={edge ? "plain line" : `default/${kind}`}
                    noun={edge ? "template" : "definition"}
                    onPick={(x) => onAct("retype", { ids: [id], type: x.id })}
                    onNew={(name) => onAct("pin", { id, name })}
                    onClear={() => onAct("retype", { ids: [id], type: edge ? "" : kind })} />
            {mine ? (
              <button className="drop" title={`dissolve ${own!.name} back into everything naming it`}
                      onClick={() => onAct("unpin", { id: own!.id })}>
                <Icon name="remove" />
              </button>
            ) : null}
          </Line>
        ) : null}

        {/* **Where the definition is offered.** Both boxes are about the
            definition, so both wait until there is one of this workspace's own. */}
        {!is_root ? (
          <Line label="offer" className="marks"
                tip="Whether this definition is on the rail, and whether every plain one of its kind follows it.">
            {runs ? (
              <label className="check" title="Offer this on the rail, so a right drag can draw one">
                <input type="checkbox" checked={listed}
                       disabled={!own || shipped(own) || own.id === DRAFT}
                       onChange={(e) => onAct("pin_line", { id: own!.id,
                                                            on: e.target.checked ? "yes" : "no" })} />
                pin line
              </label>
            ) : null}
            <label className="check"
                   title={`Every ${kind} that names nothing draws from this one instead of the base`}>
              <input type="checkbox" checked={!!own?.default} disabled={!mine}
                     onChange={(e) => onAct("default", { id: own!.id,
                                                         on: e.target.checked ? "yes" : "no" })} />
              make default
            </label>
          </Line>
        ) : null}
      </Body>

      {borrowed ? (
        <p className="not-yet">
          This comes from {d!.from}, and a package resists editing. Extend it
          with a subtype instead — the subtype is yours to change.
        </p>
      ) : null}
    </div>
  );
}

/** **Pick one, or name a new one.** A box over a list: a name the list holds
 *  picks it, a name it does not holds a new one, and nothing clears it — and
 *  what Enter would do is said beside the box before it is done.
 *
 *  Committed on Enter or on leaving the box, never per keystroke — a keystroke
 *  at a time would file one definition per letter. */
function Picker({ id, current, offered, blank, noun, onPick, onNew, onClear }: {
  id: Id; current: string; offered: readonly Definition[]; blank: string; noun: string;
  onPick: (d: Definition) => void; onNew: (name: string) => void; onClear: () => void;
}) {
  const [draft, set_draft] = useState(current);
  const said = draft.trim();
  const hit = offered.find((x) => x.name === said || x.id === said || where(x) === said);
  const list = `${noun}-${id}`;
  const hint = said === current ? null
    : !said ? blank : hit ? `uses ${where(hit)}` : `new ${noun}`;

  const commit = () => {
    if (said === current) return;
    if (!said) onClear();
    else if (hit) onPick(hit);
    else onNew(said);
  };

  return (
    <>
      <input value={draft} list={list} aria-label={noun} placeholder={blank}
             onChange={(e) => set_draft(e.target.value)}
             onBlur={commit}
             onKeyDown={(e) => {
               if (e.key === "Enter") (e.target as HTMLInputElement).blur();
               if (e.key === "Escape") set_draft(current);
             }} />
      <datalist id={list}>
        {offered.map((x) => <option key={x.id} value={x.name}>{where(x)}</option>)}
      </datalist>
      {hint ? <span className="from">{hint}</span> : null}
    </>
  );
}

/** Where a definition sits in the definitions folder, as a path. **The tree's
 *  own three sections**, so the picker and the folder say one thing. */
function where(d: Definition): string {
  return d.from === BASE_PACKAGE ? `default/${d.name}`
    : d.from ? `packages/${d.from}/${d.name}`
    : `workspace/${d.name}`;
}
