/** What one thing is: the identity rows of the element tab. */

import { BASE_PACKAGE, isa, kind_word, may_retype, module_named, relation_named, shipped,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Band, Body, Line } from "./Body";
import { taken } from "./Definitions";
import { Entry } from "./Entry";
import { Tags } from "./Tags";
import { DRAFT } from "./draft";
import { defined, held, kind_of } from "./holder";

export type IdentityProps = { graph: Graph; id: Id; onAct: Act };

export function Identity({ graph, id, onAct }: IdentityProps) {
  const it = held(graph, id);
  if (!it) return <p className="empty">that is not here any more</p>;
  const { def: d, block: b, edge, borrowed } = it;
  const { kind, runs } = kind_of(graph, id, it);
  const { follows, own, mine, fixed, wip } = defined(graph, id, it, runs);
  const drafted = id === DRAFT;
  const named = b?.type;

  /** Where a definition sits, pinned ones under their folder. */
  const path = (x: Definition) => where(x, (graph.blocks[graph.root]?.pinned ?? []).includes(x.id));
  const kind_named = (x: Id) => (runs ? relation_named(graph, x) : module_named(graph, x));
  const extendable = (self: Definition) =>
    Object.values(graph.defs).filter((x) => x.group === self.group && x.id !== self.id
      && !isa(graph, x.id).some((up) => up.id === self.id)
      /** A default keeps its kind, or it would stop standing in for it. */
      && (self.default === undefined || kind_named(x.id) === self.default))
      .sort((a, z) => path(a).localeCompare(path(z)));

  /** Naming a working look saves it as a definition, the moment the box is left. */
  const saving = (label: string) => (
    <Entry key={`working-${id}`} value="" label={label} placeholder="name it to save it"
           clash={(to) => taken(graph, to, runs ? "relation" : "block")}
           onCommit={(to) => onAct("save_def", { id, name: to })} />
  );

  return (
    <div className="col identity">
      <Band label="identity" />
      <Body>
        {/* Name: a draft's or working definition's is written here; a filed one's is renamed in
           place. */}
        {drafted ? (
          <Line label="name" tip="What this will be called. Naming it adds it to the definitions.">
            {/* Leaving the box files the draft under its name. */}
            <Entry key="draft" value="" label="name" placeholder="name it to add it"
                   clash={(to) => taken(graph, to, runs ? "relation" : "block", DRAFT)}
                   onCommit={(to) => onAct("@name", { name: to })} />
          </Line>
        ) : wip && runs ? (
          <Line label="name" tip="This line's working definition. Naming it saves it.">
            {saving("name")}
          </Line>
        ) : runs || d ? (
          <Line label="name" tip={runs ? "The definition this follows. Renaming it keeps every line naming it."
                                       : "What this definition is called. Renaming it keeps everything naming it."}>
            {/* Renamed in place: the id stays, so nothing naming it is retyped. */}
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

        {/* A block's working definition is named on its own row. */}
        {b && wip ? (
          <Line label="definition" tip="This block's working definition. Naming it saves it.">
            {saving("definition")}
          </Line>
        ) : null}

        {/* Label: what a line naming the definition draws; never inherited. */}
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

        {/* Extends, or type. */}
        {d && shipped(d) ? (
          <Line label={runs ? "extends" : "type"}
                tip="A base is shipped and extends nothing.">
            <span className="read">{graph.defs[d.extends ?? ""] ? path(graph.defs[d.extends!]!) : ""}</span>
          </Line>
        ) : d ? (
          <Line label={runs ? "extends" : "type"} className="subtype"
                tip="The definition this one refines — its kind's base unless another is picked.">
            {/* Every definition extends one: its kind's base unless another is picked. */}
            <select value={d.extends ?? ""}
                    aria-label={runs ? "extends" : "type"} disabled={borrowed}
                    onChange={(e) => onAct("define", { ...(drafted ? { id } : {}),
                                                       name: d.name, group: d.group, extends: e.target.value })}>
              {d.extends ? null : <option value="">{`base/${kind}`}</option>}
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
            {/* Only definitions of the block's own kind apply. */}
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

        {/* Tags are the element's own, never its definition's. */}
        {(b || edge) && !d ? (
          <Line label="tags" tip="Words that say what this is like. Tags carry nothing and are never inherited.">
            <Tags tags={(b ?? edge)!.tags ?? []}
                  onCommit={(to) => onAct("tag", { ids: [id], tags: to })} />
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

/** Where a definition sits in the definitions folder, as a path. */
function where(d: Definition, pinned = false): string {
  return d.default ? `default/${d.default}`
    : d.from === BASE_PACKAGE ? `base/${d.name}`
    : d.from ? `packages/${d.from}/${d.name}`
    : pinned ? `pinned/${d.name}` : d.name;
}
