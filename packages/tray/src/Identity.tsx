/** What one thing is: the identity rows of the element tab. */

import { BASE_PACKAGE, def_of, isa, kind_word, block_base, outside, relation_base, shipped,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Band, Body, Line } from "./Body";
import { taken } from "./Definitions";
import { Entry } from "./Entry";
import { Tags } from "./Tags";
import { DRAFT } from "./draft";
import { defined, held, kind_of, types_for } from "./holder";

export type IdentityProps = { graph: Graph; id: Id; onAct: Act };

export function Identity({ graph, id, onAct }: IdentityProps) {
  const it = held(graph, id);
  if (!it) return <p className="empty">that is not here any more</p>;
  const { def: d, block: b, edge } = it;
  /** What came from outside: its name and what it extends stay theirs, what it says does not. */
  const borrowed = outside(d ?? undefined);
  const { kind, runs } = kind_of(graph, id, it);
  const { own, mine, fixed, wip } = defined(graph, id, it, runs);
  const drafted = id === DRAFT;

  /** Where a definition sits, pinned ones under their folder. */
  const path = (x: Definition) => where(x, (graph.blocks[graph.root]?.pinned ?? []).includes(x.id));
  const kind_named = (x: Id) => (runs ? relation_base(graph, x) : block_base(graph, x));
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

  /** What a label says, in full. */
  const label_tip = "What a line naming this draws, exactly as typed — a stereotype such as <<relates>>.";

  return (
    <div className="col identity">
      <Band label="identity" />
      <Body>
        {/* Name: a draft's is written here, a line's names a new definition, a definition's is
           renamed in place, and a block's is its own. */}
        {drafted ? (
          <Line label="name" tip="What this will be called. Naming it adds it to the definitions.">
            {/* Leaving the box files the draft under its name. */}
            <Entry key="draft" value="" label="name" placeholder="name it to add it"
                   clash={(to) => taken(graph, to, runs ? "relation" : "block", DRAFT)}
                   onCommit={(to) => onAct("@name", { name: to })} />
          </Line>
        ) : edge ? (
          <Line label="name" tip="The definition this line follows. Naming it files a new definition and moves this line onto it.">
            <Entry key={`${id}-${own?.id}`} value={own && !fixed ? own.name : ""} label="name"
                   placeholder={own ? path(own) : kind}
                   clash={(to) => taken(graph, to, "relation")}
                   onCommit={(to) => onAct(wip ? "save_def" : "rename", { id, name: to })} />
          </Line>
        ) : d ? (
          <Line label="name" tip="What this definition is called. Renaming it keeps everything naming it.">
            {/* Renamed in place: the id stays, so nothing naming it is retyped. */}
            {mine && !fixed ? (
              <Entry key={d.id} value={d.name} label="name"
                     clash={(to) => taken(graph, to, d.group, d.id)}
                     onCommit={(to) => onAct("rename_def", { id: d.id, name: to })} />
            ) : (
              <input value={path(d)} readOnly aria-label="name" />
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

        {/* Type: which definition an element follows, among those of its own kind. */}
        {b || edge ? (
          <Line label="type" className="subtype"
                tip={`Which definition this ${runs ? "line" : "block"} follows. Only definitions of its own kind apply.`}>
            <select value={def_of(graph, id) ?? ""} aria-label="type"
                    onChange={(e) => onAct("retype", { ids: [id], type: e.target.value })}>
              {types_for(graph, id).map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
            {b && mine && !fixed ? (
              <button className="drop" title={`remove ${own!.name}, dissolving it into everything naming it`}
                      onClick={() => onAct("remove_def", { id: own!.id })}>
                <Icon name="remove" />
              </button>
            ) : null}
          </Line>
        ) : null}

        {/* Label: what a line naming the definition draws; never inherited. */}
        {runs && drafted ? (
          <Line label="label" tip={label_tip}>
            <input value={d!.label ?? ""} aria-label="label" placeholder="no label"
                   onChange={(e) => onAct("define", { id, name: d!.name, label: e.target.value,
                                                     extends: d!.extends ?? "" })} />
          </Line>
        ) : runs ? (
          <Line label="label" tip={label_tip}>
            {mine && !wip ? (
              <Entry key={own!.id} value={own!.label ?? ""} label="label" placeholder="no label" blank
                     onCommit={(to) => onAct("define", { name: own!.name, group: "relation", label: to })} />
            ) : (
              <input value={own?.label ?? ""} readOnly aria-label="label" placeholder="no label" />
            )}
          </Line>
        ) : null}

        {/* Extends: the definition a definition refines. */}
        {d && shipped(d) ? (
          <Line label="extends" tip="A base is shipped and extends nothing.">
            <span className="read">{graph.defs[d.extends ?? ""] ? path(graph.defs[d.extends!]!) : ""}</span>
          </Line>
        ) : d ? (
          <Line label="extends" className="subtype"
                tip="The definition this one refines — its kind's base unless another is picked.">
            <select value={d.extends ?? ""} aria-label="extends" disabled={borrowed}
                    onChange={(e) => onAct("define", { ...(drafted ? { id } : {}),
                                                       name: d.name, group: d.group, extends: e.target.value })}>
              {d.extends ? null : <option value="">{`base/${kind}`}</option>}
              {extendable(d).map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
          </Line>
        ) : null}

        {/* Tags are the element's own, never its definition's. */}
        {b || edge ? (
          <Line label="tags" tip="Words that say what this is like. Tags carry nothing and are never inherited.">
            <Tags tags={(b ?? edge)!.tags ?? []}
                  onCommit={(to) => onAct("tag", { ids: [id], tags: to })} />
          </Line>
        ) : null}
      </Body>

      {borrowed ? (
        <p className="not-yet">
          This comes from {d!.from ?? "the floor"}, and stays as they wrote it. What it
          says is still yours: styling it or declaring a field writes your own word about
          it, which stands in front of it for everything below. Its name and what it
          extends are theirs.
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
