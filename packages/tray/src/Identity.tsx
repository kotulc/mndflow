/** What one thing is: **the left column of the settings panel.**
 *
 *  The drawing first, with what kind it is, how many there are and whether it
 *  is pinned beside it; then what it is called and what it refines. **Every
 *  branch on which holder this is lives here**, which is what leaves the column
 *  beside it uniform.
 *
 *  | holder | rows |
 *  |---|---|
 *  | block, the workspace included | name, tags, type |
 *  | block definition | name, type |
 *  | relation definition | name, label, extends |
 *  | a line | name, label, tags, extends |
 *
 *  **A line is described by the definition it follows.** Styling one makes a
 *  working definition, named here and kept with *save*; which definition a line
 *  follows is set on the usages tab.
 *
 *  A pure function of its props, like every other surface. */

import { alias_of, BASE_PACKAGE, SCHEMA, def_of, isa, kind_word, may_retype, module_named, module_of,
         pinned_defs, relation_named, role_of, shipped, shown_name,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon, role_icon, type IconName } from "@mnd/theme";
import { Band, Body, Line } from "./Body";
import { Card } from "./Card";
import { taken } from "./Definitions";
import { Entry } from "./Entry";
import { Tags } from "./Tags";
import { Wire } from "./Wire";
import { DRAFT } from "./draft";
import { held, kind_of, reading } from "./holder";

export type IdentityProps = {
  graph: Graph; id: Id; onAct: Act;
  /** What a line's working definition will be saved as. */
  working?: string;
};

/** A count and its noun, plural where it is not one. */
const count = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

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
  /** A block or a line that says anything about its own drawing has a working
   *  definition, named here and kept with *save definition*. */
  const wip = (edge ? ["line", "style"] : b ? ["card", "style"] : [])
    .some((k) => Object.keys((edge ?? b)?.looks?.[k] ?? {}).length > 0);
  /** The name being written, and whether it is taken. **Never a lookup.** */
  const writing = drafted ? d!.name.trim() : wip ? working.trim() : "";
  const clash = writing ? taken(graph, writing, runs ? "relation" : "block", drafted ? DRAFT : undefined) : null;

  /** **The definition the boxes are about.** */
  const own = runs ? follows : d ?? (named ? graph.defs[named] : undefined);
  const mine = !!own && !shipped(own) && !own.from && own.id !== DRAFT;
  /** **A base or a default is fixed**: never renamed, removed or pinned. A
   *  default may still be re-typed; a base may not. */
  const fixed = !own || shipped(own) || own.default !== undefined;
  const listed = pinned_defs(graph, runs ? "relation" : "block").some((x) => x.id === own?.id);

  const role = b ? role_of(graph, id) : null;
  /** **A line's preview draws what the canvas does**: the label it follows. */
  const label = runs ? own?.label ?? "" : d ? d.name : shown_name(graph, id);
  const word = (d ?? (named ? graph.defs[named] : undefined))?.name ?? kind;

  /** How many of this the workspace holds: **usages of this definition only**,
   *  never of what extends it — or, for a plain block, blocks of its kind. */
  const tally = runs
    ? Object.values(graph.edges).filter((x) => def_of(graph, x.id) === follows?.id).length
    : own ? Object.keys(graph.blocks).filter((x) => def_of(graph, x) === own.id).length
    : Object.values(graph.blocks).filter((x) => module_of(graph, x.id) === kind).length;
  const mark: IconName = runs ? (kind === "tie" ? "relation_tie" : "relation_plain")
    : role_icon(role ?? kind);

  /** What a definition may extend: its own group — never itself or anything
   *  below it. */
  /** Where a definition sits, pinned ones under their folder. */
  const path = (x: Definition) => where(x, (graph.blocks[graph.root]?.pinned ?? []).includes(x.id));
  const kind_named = (x: Id) => (runs ? relation_named(graph, x) : module_named(graph, x));
  const extendable = (self: Definition) =>
    Object.values(graph.defs).filter((x) => x.group === self.group && x.id !== self.id
      && !isa(graph, x.id).some((up) => up.id === self.id)
      /** **A default keeps its kind**, or it would stop standing in for it. */
      && (self.default === undefined || kind_named(x.id) === self.default))
      .sort((a, z) => path(a).localeCompare(path(z)));

  return (
    <div className="col what">
      <div className="styles-head">
        {runs ? (
          <Wire label={label} alias={edge ? alias_of(graph, id, true) : undefined}
                said={said} now={now} />
        ) : (
          <Card label={label}
                alias={!b ? undefined : now("card", "alias", "") === "show" ? alias_of(graph, id, true)
                  : now("card", "alias", "") === "hide" ? undefined : alias_of(graph, id)}
                kind={word} icon={(now("card", "icon", "") || role_icon(role ?? kind)) as IconName}
                role={role ?? kind} said={said} now={now} />
        )}
        <div className="kind-rows">
          <span><span className="holder">{runs ? "line type" : "card type"}</span>
            <span className="base">{kind}<Icon name={mark} size={12} /></span></span>
          {/* **The workspace says the schema an export of it is written in**,
              where every other block says how many there are. */}
          <span className="tally">{is_root ? `schema ${SCHEMA}` : count(tally, "instance")}</span>
          {/* **Pinned sits beside the card**: a relation definition on the rail,
              a block definition in the pinned folder. A base or a default is
              never pinned, so it offers nothing. */}
          {own && !fixed ? (
            <label className="check"
                   title={runs ? "Offer this on the rail, so a right drag can draw one"
                               : "List this in the explorer's pinned folder"}>
              <input type="checkbox" checked={listed} disabled={own.id === DRAFT || wip}
                     onChange={(e) => onAct("pin", { id: own.id,
                                                     on: e.target.checked ? "yes" : "no" })} />
              pinned
            </label>
          ) : null}
        </div>
      </div>

      <Band label="identity" />
      <Body>
        {/* **Name.** A draft's and a working definition's are written here and
            kept by saving; a filed definition's is read-only, since its id is
            slugged from it. */}
        {drafted ? (
          <Line label="name" tip="What this will be called. Naming it adds it to the definitions.">
            {/* **Named is kept**: leaving the box files the draft under its name. */}
            <Entry key="draft" value="" label="name" placeholder="name it to add it"
                   clash={(to) => taken(graph, to, runs ? "relation" : "block", DRAFT)}
                   onCommit={(to) => onAct("@name", { name: to })} />
          </Line>
        ) : wip && runs ? (
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
            {mine && !fixed ? (
              <Entry key={own!.id} value={own!.name} label="name"
                     clash={(to) => taken(graph, to, own!.group, own!.id)}
                     onCommit={(to) => onAct("rename_def", { id: own!.id, name: to })} />
            ) : (
              <input value={own ? path(own) : ""} readOnly aria-label="name" />
            )}
          </Line>
        ) : b ? (
          <Line label="name" tip="What this is called, as the drawing writes it.">
            <input value={b.name ?? ""} aria-label="name" placeholder={kind_word(graph, b)}
                   onChange={(e) => onAct("rename", { id, name: e.target.value })} />
          </Line>
        ) : null}

        {/* **A block's working definition** is named on a row of its own, since
            its name row is the block's. */}
        {b && wip ? (
          <Line label="definition" tip="This block's working definition. Name it and save it to keep it.">
            <input value={working} aria-label="definition" placeholder="name the working definition"
                   onChange={(e) => onAct("@working", { id, name: e.target.value })} />
            {clash ? <span className="from warn">{clash}</span>
                   : <span className="from">working</span>}
          </Line>
        ) : null}

        {/* **Tags are an element's own**, never its definition's: words that say
            what this one thing is like. */}
        {(b || edge) && !d ? (
          <Line label="tags" tip="Words that say what this is like. Tags carry nothing and are never inherited.">
            <Tags tags={(b ?? edge)!.tags ?? []}
                  onCommit={(to) => onAct("tag", { ids: [id], tags: to })} />
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
        {d && shipped(d) ? (
          <Line label={runs ? "extends" : "type"}
                tip="A base is shipped and extends nothing.">
            <span className="read">{graph.defs[d.extends ?? ""] ? path(graph.defs[d.extends!]!) : ""}</span>
          </Line>
        ) : d ? (
          <Line label={runs ? "extends" : "type"} className="subtype"
                tip="The definition this one refines — its kind's base unless another is picked.">
            {/* **Every definition extends one**: its kind's base, where nothing
                more particular was said. */}
            <select value={d.extends ?? ""}
                    aria-label={runs ? "extends" : "type"} disabled={borrowed}
                    onChange={(e) => onAct("define", { ...(drafted ? { id } : {}),
                                                       name: d.name, group: d.group, extends: e.target.value })}>
              {extendable(d).map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
          </Line>
        ) : edge ? (
          <Line label="extends" tip="The definition a working look is saved over.">
            <span className="read">{wip ? (follows ? path(follows) : "")
              : graph.defs[follows?.extends ?? ""] ? path(graph.defs[follows!.extends!]!) : ""}</span>
          </Line>
        ) : b ? (
          <Line label="type" className="subtype"
                tip={`Which ${kind} definition this block follows. Only definitions of its own kind apply.`}>
            {/* **Only what applies.** A block keeps its kind, so the list is the
                base kind and every definition of that kind. */}
            <select value={named && own && !fixed ? named : ""}
                    aria-label="type"
                    onChange={(e) => onAct("retype", { ids: [id], type: e.target.value || kind })}>
              <option value="">{`default/${kind}`}</option>
              {Object.values(graph.defs)
                .filter((x) => x.group === "block" && !shipped(x) && x.default === undefined
                               && may_retype(graph, id, x.id))
                .sort((a, z) => path(a).localeCompare(path(z)))
                .map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
            {mine && !fixed ? (
              <button className="drop" title={`remove ${own!.name}, dissolving it into everything naming it`}
                      onClick={() => onAct("remove_def", { id: own!.id })}>
                <Icon name="remove" />
              </button>
            ) : null}
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

/** Where a definition sits in the definitions folder, as a path. **The tree's
 *  own sections**, so the picker and the folder say one thing. */
function where(d: Definition, pinned = false): string {
  return d.default ? `default/${d.default}`
    : d.from === BASE_PACKAGE ? `base/${d.name}`
    : d.from ? `packages/${d.from}/${d.name}`
    : pinned ? `pinned/${d.name}` : d.name;
}
