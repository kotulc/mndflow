/** What one thing is: the identity rows of the element tab.
 *
 *  **The same four rows for a block and for a line** — name, type, extends, tags. Both carry a
 *  name of their own, and what either draws where it has none is its type's name. See types.md
 *  in the root docs. */

import { base_of, def_of, edge_base, isa, block_base, outside, relation_base, shipped,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Band, Body, Line } from "./Body";
import { taken } from "./Definitions";
import { Entry } from "./Entry";
import { Tags } from "./Tags";
import { DRAFT } from "./draft";
import { def_path, defined, held, kind_of, types_for } from "./holder";

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
  const element = !!(b || edge);
  const group = runs ? "relation" : "block";

  /** Where a definition lives, as the explorer files it. */
  const path = def_path;
  const kind_named = (x: Id) => (runs ? relation_base(graph, x) : block_base(graph, x));
  const extendable = (self: Definition) =>
    Object.values(graph.defs).filter((x) => x.group === self.group && x.id !== self.id
      && !isa(graph, x.id).some((up) => up.id === self.id)
      /** A default keeps its kind, or it would stop standing in for it. */
      && (self.default === undefined || kind_named(x.id) === self.default))
      .sort((a, z) => rank(a) - rank(z) || path(a).localeCompare(path(z)));

  /** The definition in force, whose name this element draws where it carries none. */
  const following = graph.defs[def_of(graph, id) ?? ""];
  /** Which extends row applies: one it owns and may re-base, or none of its own, or theirs. */
  const re_base = element && mine && !fixed;
  const base_only = element && (!own || shipped(own));

  return (
    <div className="col identity">
      <Band label="identity" />
      <Body>
        {/* Name: what this one element is called. **A definition has none** — it is not drawn
           anywhere, and what its usages draw is its type name, on the row below. */}
        <Line label="name"
              tip={element
                ? "What this is called, as the drawing writes it. Left blank it draws its type's name."
                : "A definition is not drawn anywhere, so it carries no name of its own. What its usages draw is its type name, below."}>
          {element ? (
            <input value={(b ?? edge)!.name ?? ""} aria-label="name"
                   placeholder={following?.name ?? kind}
                   onChange={(e) => onAct("rename", { id, name: e.target.value })} />
          ) : (
            <input value="" readOnly aria-label="name" placeholder={d?.name || kind} />
          )}
        </Line>

        {/* Type: the definition, by name. **The same question either way** — an element names the
           one it follows, and a definition names itself, which is what a type name is. */}
        <Line label="type" className="subtype"
              tip={drafted
                ? "What this definition will be called. Naming it adds it to the definitions."
                : element ? type_tip(runs, wip)
                : "What this definition is called, and the word every usage draws where it carries no name of its own. Renaming it keeps everything naming it."}>
          {drafted ? (
            /** Leaving the box files the draft under its name. */
            <Entry key="draft" value="" label="type" placeholder="name it to add it"
                   clash={(to) => taken(graph, to, group, DRAFT)}
                   onCommit={(to) => onAct("@name", { name: to })} />
          ) : element ? (
            <Entry key={`type-${id}-${own?.id ?? ""}`} value={mine && !fixed ? own!.name : ""}
                   label="type" blank placeholder={following?.name ?? kind}
                   clash={(to) => (types_for(graph, id).some((x) => x.name === to)
                     ? null : taken(graph, to, group))}
                   onCommit={(to) => {
                     const [act, args] = typing(graph, id, to);
                     onAct(act, args);
                   }} />
          ) : mine && !fixed ? (
            <Entry key={d!.id} value={d!.name} label="type"
                   clash={(to) => taken(graph, to, d!.group, d!.id)}
                   onCommit={(to) => onAct("rename_def", { id: d!.id, name: to })} />
          ) : (
            /** The same answer, only not yours to change — where it came from is said below. */
            <input value={d!.name} readOnly aria-label="type" />
          )}
          {element && mine && !fixed ? (
            <button className="drop"
                    title={`remove ${own!.name}, dissolving it into everything naming it`}
                    onClick={() => onAct("remove_def", { id: own!.id })}>
              <Icon name="remove" />
            </button>
          ) : null}
        </Line>

        {/* Tags index a thing, so a definition wears them as an element does. Never inherited. */}
        <Line label="tags"
              tip="Words that say what this is like. Tags carry nothing and are never inherited.">
          <Tags tags={(b ?? edge ?? d)!.tags ?? []}
                onCommit={(to) => onAct("tag", { ids: [id], tags: to })} />
        </Line>

        {/* Extends: what the definition in force is built on. An element with none of its own has
           only a base, so the same row moves that instead. */}
        {d && shipped(d) ? (
          <Line label="extends" tip="A base is shipped and extends nothing.">
            <span className="read">
              {graph.defs[d.extends ?? ""] ? path(graph.defs[d.extends!]!) : ""}
            </span>
          </Line>
        ) : d ? (
          <Line label="extends" className="subtype"
                tip="The definition this one refines — its kind's base unless another is picked.">
            <select value={d.extends ?? ""} aria-label="extends" disabled={borrowed}
                    onChange={(e) => onAct("define", { ...(drafted ? { id } : {}), name: d.name,
                                                       group: d.group, extends: e.target.value })}>
              {d.extends ? null : <option value="">{`base/${kind}`}</option>}
              {extendable(d).map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
          </Line>
        ) : re_base ? (
          <Line label="extends" className="subtype"
                tip={`What ${own!.name} is built on. Changing it re-bases that definition, so everything following it moves with this one.`}>
            <select value={own!.extends ?? ""} aria-label="extends"
                    onChange={(e) => onAct("define", { name: own!.name, group: own!.group,
                                                       extends: e.target.value })}>
              {own!.extends ? null : <option value="">{`base/${kind}`}</option>}
              {extendable(own!).map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
          </Line>
        ) : base_only ? (
          <Line label="extends" className="subtype"
                tip={`What this ${runs ? "line" : "block"} is built on. It follows no definition of its own, so this is its base.`}>
            <select value={based(graph, id, runs)} aria-label="extends"
                    onChange={(e) => onAct("retype", { ids: [id], type: e.target.value })}>
              {types_for(graph, id).filter(shipped)
                .map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
          </Line>
        ) : element ? (
          <Line label="extends"
                tip={`${following?.name ?? "What this follows"} came from outside, so what it is built on is theirs.`}>
            <span className="read">
              {graph.defs[following?.extends ?? ""] ? path(graph.defs[following!.extends!]!) : ""}
            </span>
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

/** What the type row is asking, in full. */
function type_tip(runs: boolean, wip: boolean): string {
  return `Which definition this ${runs ? "line" : "block"} follows, by name. A name nothing holds`
    + ` files a new definition${wip ? ", carrying the look this one is wearing," : ""} and moves`
    + ` this one onto it. Only definitions of its own kind apply.`;
}

/** What naming a type does: point the element at the definition of that name, file one where
 *  nothing holds it, or give the element back to its base where the box is cleared. */
function typing(graph: Graph, id: Id, to: string): [string, Record<string, unknown>] {
  const hit = types_for(graph, id).find((x) => x.name === to);
  if (hit) return ["retype", { ids: [id], type: hit.id }];
  if (!to) return ["retype", { ids: [id], type: "" }];
  /** `save_def` files what it followed as the new one's base, and any look it wears travels. */
  return ["save_def", { id, name: to }];
}

/** The base an element sits on, which is what its extends row shows where it has no definition. */
function based(graph: Graph, id: Id, runs: boolean): Id {
  const base = runs ? edge_base(graph, id) : base_of(graph, id);
  return graph.defs[base] ? base : "";
}

/** The shipped bases head a listing, then the defaults, then the rest. */
function rank(d: Definition): number {
  return shipped(d) ? 0 : d.default !== undefined ? 1 : 2;
}

