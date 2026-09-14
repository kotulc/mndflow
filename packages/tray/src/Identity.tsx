/** What one thing is: **the left column of the settings panel.**
 *
 *  The drawing first, with what kind it is and how many there are beside it;
 *  then what it is called, what it refines, and where it is offered. **Every
 *  branch on which holder this is lives here**, which is what leaves the column
 *  beside it uniform.
 *
 *  | holder | rows |
 *  |---|---|
 *  | workspace | name, id |
 *  | block | name, type, offer |
 *  | block definition | name, type, offer |
 *  | relation definition, or a line's | name, label, extends, offer |
 *
 *  **A line is described by the definition it follows.** Styling one makes a
 *  working definition, named here and kept with *save*; which definition a line
 *  follows is set on the usages tab.
 *
 *  A pure function of its props, like every other surface. */

import { useState } from "react";
import { alias_of, BASE_PACKAGE, base_line, def_of, isa, kind_word, may_retype, module_of,
         pinned_lines, relations, role_of, shipped, shown_name,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon, role_icon, type IconName } from "@mnd/theme";
import { Band, Body, Line } from "./Body";
import { Card } from "./Card";
import { taken } from "./Definitions";
import { Entry } from "./Entry";
import { Wire } from "./Wire";
import { DRAFT } from "./draft";
import { held, kind_of, reading } from "./holder";

export type IdentityProps = {
  graph: Graph; id: Id; onAct: Act;
  /** What a line's working definition will be saved as. */
  working?: string;
};

export function Identity({ graph, id, onAct, working = "" }: IdentityProps) {
  const it = held(graph, id);
  if (!it) return <p className="empty">that is not here any more</p>;
  const { def: d, block: b, edge, borrowed } = it;
  const { said, now } = reading(graph, id, it);
  const { kind, runs } = kind_of(graph, id, it);
  const is_root = !d && id === graph.root;
  const drafted = id === DRAFT;
  const named = b?.type;

  /** **The relation definition this is about**: itself, or the one a line follows. */
  const follows = runs ? (d ?? graph.defs[def_of(graph, id) ?? ""]) : undefined;
  /** A line that says anything about its own drawing has a working definition. */
  const wip = !!edge && ["line", "style"].some((k) => Object.keys(edge.looks?.[k] ?? {}).length > 0);
  /** The name being written, and whether it is taken. **Never a lookup.** */
  const writing = drafted ? d!.name.trim() : wip ? working.trim() : "";
  const clash = writing ? taken(graph, writing, runs ? "relation" : "block", drafted ? DRAFT : undefined) : null;
  const base = base_line(graph);

  /** **The definition the boxes are about.** */
  const own = runs ? follows : d ?? (named ? graph.defs[named] : undefined);
  const mine = !!own && !shipped(own) && !own.from && own.id !== DRAFT;
  const listed = pinned_lines(graph).some((x) => x.id === own?.id);

  const role = b ? role_of(graph, id) : null;
  /** **A line's preview draws what the canvas does**: the label it follows. */
  const label = runs ? own?.label ?? "" : d ? d.name : shown_name(graph, id);
  const word = (d ?? (named ? graph.defs[named] : undefined))?.name ?? kind;
  const shows = now("card", "shows", "");

  /** How many of this the workspace holds: lines drawing through the definition,
   *  blocks naming the definition, or blocks of the kind. */
  const tally = runs
    ? Object.values(graph.edges)
        .filter((x) => isa(graph, def_of(graph, x.id)).some((up) => up.id === follows?.id)).length
    : d ? Object.values(graph.blocks).filter((x) => x.type === d.id).length
    : Object.values(graph.blocks).filter((x) => module_of(graph, x.id) === kind).length;
  const mark: IconName = runs ? (kind === "tie" ? "relation_tie" : "relation_plain")
    : role_icon(role ?? kind);

  /** What a definition may extend: its own group — never itself or anything
   *  below it. */
  const extendable = (self: Definition) =>
    (runs ? relations(graph) : Object.values(graph.defs).filter((x) => x.group === "block"))
      .filter((x) => x.id !== self.id && !isa(graph, x.id).some((up) => up.id === self.id))
      .sort((a, z) => a.name.localeCompare(z.name));

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
        {/* **Name.** A draft's and a working definition's are written here and
            kept by saving; a filed definition's is read-only, since its id is
            slugged from it. */}
        {drafted ? (
          <Line label="name" tip="What this will be called. Saving keeps it under this name.">
            <input value={d!.name} aria-label="name" placeholder="name it to save it"
                   onChange={(e) => onAct("define", { id, name: e.target.value,
                                                     extends: d!.extends ?? "" })} />
            {clash ? <span className="from warn">{clash}</span> : null}
          </Line>
        ) : wip ? (
          <Line label="name" tip="This line's working definition. Name it and save it to keep it.">
            <input value={working} aria-label="name" placeholder="name the working definition"
                   onChange={(e) => onAct("@working", { id, name: e.target.value })} />
            {clash ? <span className="from warn">{clash}</span>
                   : <span className="from">working</span>}
          </Line>
        ) : runs || d ? (
          <Line label="name" tip={runs ? "The definition this follows. Renaming it keeps every line naming it."
                                       : "What this definition is called. Renaming it keeps everything naming it."}>
            {/* **Renamed in place**: the id stays, so nothing naming it is retyped. */}
            {mine ? (
              <Entry key={own!.id} value={own!.name} label="name"
                     clash={(to) => taken(graph, to, own!.group, own!.id)}
                     onCommit={(to) => onAct("rename_def", { id: own!.id, name: to })} />
            ) : (
              <input value={own?.name ?? ""} readOnly aria-label="name" />
            )}
          </Line>
        ) : b ? (
          <Line label="name" tip="What this is called, as the drawing writes it.">
            <input value={b.name ?? ""} aria-label="name" placeholder={kind_word(graph, b)}
                   onChange={(e) => onAct("rename", { id, name: e.target.value })} />
          </Line>
        ) : null}

        {is_root ? (
          <Line label="id" tip="What this project is called in the file and in every log.">
            <input value={id} readOnly aria-label="id" />
          </Line>
        ) : null}

        {/* **Label.** What a line naming the definition draws, exactly as typed;
            its own, never inherited. A working look keeps the one it follows. */}
        {runs && drafted ? (
          <Line label="label" tip="What a line naming this draws, exactly as typed — a stereotype such as <<relates>>.">
            <input value={d!.label ?? ""} aria-label="label" placeholder="no label"
                   onChange={(e) => onAct("define", { id, name: d!.name, label: e.target.value,
                                                     extends: d!.extends ?? "" })} />
          </Line>
        ) : runs ? (
          <Line label="label" tip="What a line naming this draws, exactly as typed — a stereotype such as <<relates>>.">
            {mine && !wip ? (
              <Entry key={own!.id} value={own!.label ?? ""} label="label" placeholder="no label" blank
                     onCommit={(to) => onAct("define", { name: own!.name, group: "relation", label: to })} />
            ) : (
              <input value={own?.label ?? ""} readOnly aria-label="label" placeholder="no label" />
            )}
          </Line>
        ) : null}

        {/* **Extends, or type.** A relation definition refines another; a block
            definition refines a block definition; a block names one. */}
        {d && runs && d.id === base?.id ? (
          <Line label="extends" tip="The base line is what every other definition extends, so it extends nothing.">
            <span className="read" />
          </Line>
        ) : d ? (
          <Line label={runs ? "extends" : "type"} className="subtype"
                tip={runs ? "The definition this one refines — the base line unless another is picked."
                          : "The definition this one refines."}>
            {/* **A relation definition always extends one**: the base, where nothing
                more particular was said. A block definition may refine nothing. */}
            <select value={d.extends ?? (runs ? base?.id ?? "" : "")}
                    aria-label={runs ? "extends" : "type"} disabled={borrowed}
                    onChange={(e) => onAct("define", { ...(drafted ? { id } : {}),
                                                       name: d.name, group: d.group, extends: e.target.value })}>
              {runs ? null : <option value="">nothing</option>}
              {extendable(d).map((x) => <option key={x.id} value={x.id}>{where(x)}</option>)}
            </select>
          </Line>
        ) : edge ? (
          <Line label="extends" tip="The definition a working look is saved over.">
            <span className="read">{wip ? follows?.name ?? ""
              : follows?.id === base?.id ? ""
              : graph.defs[follows?.extends ?? ""]?.name ?? base?.name ?? ""}</span>
          </Line>
        ) : b ? (
          <Line label="type" className="subtype"
                tip="What sort of thing this is. Pick one, or type a new name to keep this look as a definition.">
            <Picker key={`${id}:${named ?? ""}`} id={id}
                    current={named && graph.defs[named] && !shipped(graph.defs[named]!)
                      ? graph.defs[named]!.name : ""}
                    offered={Object.values(graph.defs).filter((x) => x.group === "block"
                      && !shipped(x) && may_retype(graph, id, x.id))}
                    blank={`default/${kind}`} noun="definition"
                    onPick={(x) => onAct("retype", { ids: [id], type: x.id })}
                    onNew={(name) => onAct("pin", { id, name })}
                    onClear={() => onAct("retype", { ids: [id], type: kind })} />
            {mine ? (
              <button className="drop" title={`dissolve ${own!.name} back into everything naming it`}
                      onClick={() => onAct("unpin", { id: own!.id })}>
                <Icon name="remove" />
              </button>
            ) : null}
          </Line>
        ) : null}

        {/* **Where the definition is offered.** A relation definition goes on the
            rail; a block definition may be what every plain block follows. */}
        {!is_root ? (
          <Line label="offer" className="marks"
                tip={runs ? "Whether this definition is on the rail, so a right drag can draw one."
                          : "Whether every plain one of its kind follows this definition."}>
            {runs ? (
              <label className="check" title="Offer this on the rail, so a right drag can draw one">
                <input type="checkbox" checked={listed}
                       disabled={!own || shipped(own) || own.id === DRAFT || wip}
                       onChange={(e) => onAct("pin_line", { id: own!.id,
                                                            on: e.target.checked ? "yes" : "no" })} />
                pin line
              </label>
            ) : (
              <label className="check"
                     title={`Every ${kind} that names nothing draws from this one instead of the base`}>
                <input type="checkbox" checked={!!own?.default} disabled={!mine}
                       onChange={(e) => onAct("default", { id: own!.id,
                                                           on: e.target.checked ? "yes" : "no" })} />
                make default
              </label>
            )}
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
 *  Committed on Enter or on leaving the box, never per keystroke. */
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
