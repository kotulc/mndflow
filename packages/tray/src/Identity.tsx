/** What one thing is: the identity rows of the element tab.
 *
 *  **The same four rows for a block and for a line** — name, type, extends, tags. Both carry a
 *  name of their own, and what either draws where it has none is its type's name. See types.md
 *  in the root docs. */

import { all_defs, base_of, block_tags, def_at, def_of, def_tags, domain_of, edge_base, frozen,
         is_base, isa, kind_free, type Act, type Definition, type Graph,
         type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Band, Body, Line } from "./Body";
import { taken } from "./Definitions";
import { Entry } from "./Entry";
import { Tags } from "./Tags";
import { def_path, defined, held, kind_of, types_for } from "./holder";

export type IdentityProps = {
  graph: Graph; id: Id; onAct: Act;
  /** Make a definition the context, which is where it is edited. */
  onOpen?: (id: Id) => void;
};

export function Identity({ graph, id, onAct, onOpen }: IdentityProps) {
  const it = held(graph, id);
  if (!it) return <p className="empty">that is not here any more</p>;
  const { def: d, block: b, edge } = it;
  /** What came frozen: nothing about it is the workspace's to change. */
  const borrowed = !!d && frozen(graph, d.id);
  const { kind, runs } = kind_of(graph, id, it);
  const { own, mine, fixed } = defined(graph, id, it, runs);
  const element = !!(b || edge);
  const group = runs ? "relation" : "block";

  /** Where a definition lives: its package, then its name. */
  const path = (x: Definition) => def_path(graph, x);
  /** What it may extend: its own kind's definitions, or either kind's while nothing it shaped —
   *  what it extends is what says its kind. */
  const extendable = (self: Definition) =>
    all_defs(graph).filter((x) => (domain_of(graph, x.id) === domain_of(graph, self.id)
      || kind_free(graph, self.id))
      && x.id !== self.id && !isa(graph, x.id).some((up) => up.id === self.id))
      .sort((a, z) => rank(a) - rank(z) || path(a).localeCompare(path(z)));

  /** The definition in force, whose name this element draws where it carries none. */
  const following = def_at(graph, def_of(graph, id));
  /** Which extends row applies: one it owns and may re-base, or none of its own, or theirs. */
  const re_base = element && mine && !fixed;
  const base_only = element && (!own || is_base(own.id));

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
            /** Committed when it is left, like every other box: renaming per keystroke made one
             *  undo step per character, and trimmed the space off the end as you typed it. */
            <Entry key={`name-${id}`} value={(b ?? edge)!.name ?? ""} label="name" blank
                   placeholder={following?.name ?? kind}
                   onCommit={(to) => onAct("rename", { id, name: to })} />
          ) : (
            <input value="" readOnly aria-label="name" placeholder={d?.name || kind} />
          )}
        </Line>

        {/* Type: the definition, by name. **The same question either way** — an element names the
           one it follows, and a definition names itself, which is what a type name is. */}
        <Line label="type" className="subtype"
              tip={element ? type_tip(runs)
                : "What this definition is called, and the word every usage draws where it carries no name of its own. Renaming it keeps everything naming it."}>
          {element ? (
            <Entry key={`type-${id}-${own?.id ?? ""}`} value={mine && !fixed ? own!.name : ""}
                   label="type" blank placeholder={following?.name ?? kind}
                   clash={(to) => (types_for(graph, id).some((x) => x.name === to)
                     ? null : taken(graph, to, group))}
                   onCommit={(to) => {
                     const [act, args] = typing(graph, id, to, mine && !fixed ? own : undefined);
                     onAct(act, args);
                   }} />
          ) : mine && !fixed ? (
            <Entry key={d!.id} value={d!.name} label="type"
                   clash={(to) => taken(graph, to, domain_of(graph, d!.id), d!.id)}
                   onCommit={(to) => onAct("rename", { id: d!.id, name: to })} />
          ) : (
            /** The same answer, only not yours to change — where it came from is said below. */
            <input value={d!.name} readOnly aria-label="type" />
          )}
          {element && mine && !fixed ? (
            <button className="drop"
                    title={`remove ${own!.name} — refused while anything uses it`}
                    onClick={() => onAct("delete", { ids: [own!.id] })}>
              <Icon name="remove" />
            </button>
          ) : null}
          {/* A usage is edited through what it follows, so the row goes there. */}
          {element && following && onOpen ? (
            <button className="chip" title={`open ${following.name} to edit it`}
                    onClick={() => onOpen(following.id)}>
              view definition
            </button>
          ) : null}
        </Line>

        {/* Tags index a thing, so a definition wears them as an element does: its own, then what
           its definition's chain and its traits carry. */}
        <Line label="tags"
              tip="Tags that say what this is like. A new word makes a tag; a block also carries its definition's tags and traits.">
          <Tags tags={(b ?? edge ?? d)!.tags ?? []}
                carried={b || edge ? block_tags(graph, id) : d ? def_tags(graph, d.id) : []}
                name={(t) => graph.blocks[t]?.name ?? t}
                onCommit={(to) => onAct("tag", { ids: [id], tags: to })} />
        </Line>

        {/* Extends: what the definition in force is built on. An element with none of its own has
           only a base, so the same row moves that instead. */}
        {d && is_base(d.id) ? (
          <Line label="extends" tip="A base is shipped and extends nothing.">
            <span className="read" />
          </Line>
        ) : d && borrowed ? (
          <Line label="extends" tip="It came frozen with its package, so what it extends is theirs.">
            <span className="read">{def_at(graph, d.type) ? path(def_at(graph, d.type)!) : ""}</span>
          </Line>
        ) : d ? (
          <Line label="extends" className="subtype"
                tip="The definition this one refines — its kind's base unless another is picked.">
            <select value={d.type ?? ""} aria-label="extends"
                    onChange={(e) => onAct("retype", { ids: [d.id], type: e.target.value })}>
              {d.type ? null : <option value="">{`base/${kind}`}</option>}
              {extendable(d).map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
          </Line>
        ) : re_base ? (
          <Line label="extends" className="subtype"
                tip={`What ${own!.name} is built on. Changing it re-bases that definition, so everything following it moves with this one.`}>
            <select value={own!.type ?? ""} aria-label="extends"
                    onChange={(e) => onAct("retype", { ids: [own!.id], type: e.target.value })}>
              {own!.type ? null : <option value="">{`base/${kind}`}</option>}
              {extendable(own!).map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
          </Line>
        ) : base_only ? (
          <Line label="extends" className="subtype"
                tip={`What this ${runs ? "line" : "block"} is built on. It follows no definition of its own, so this is its base.`}>
            <select value={based(graph, id, runs)} aria-label="extends"
                    onChange={(e) => onAct("retype", { ids: [id], type: e.target.value })}>
              {types_for(graph, id).filter((x) => is_base(x.id))
                .map((x) => <option key={x.id} value={x.id}>{path(x)}</option>)}
            </select>
          </Line>
        ) : element ? (
          <Line label="extends"
                tip={`${following?.name ?? "What this follows"} came from outside, so what it is built on is theirs.`}>
            <span className="read">
              {def_at(graph, following?.type) ? path(def_at(graph, following!.type)!) : ""}
            </span>
          </Line>
        ) : null}

      </Body>
    </div>
  );
}

/** What the type row is asking, in full. */
function type_tip(runs: boolean): string {
  return `Which definition this ${runs ? "line" : "block"} follows, by name. A name another holds`
    + ` applies that one; a new name renames the workspace definition it follows, or files one`
    + ` where it follows none of the workspace's — view it to change how it draws and what it may`
    + ` do. Only definitions of its own kind apply.`;
}

/** What naming a type does: point the element at the definition of that name, or give it back to
 *  its base where the box is cleared. A name nothing holds **renames the workspace definition the
 *  element already follows**, so editing the box never files one per keystroke; only an element
 *  following a base or a package's definition files a new one. */
function typing(graph: Graph, id: Id, to: string,
                own?: Definition): [string, Record<string, unknown>] {
  const hit = types_for(graph, id).find((x) => x.name === to);
  if (hit) return ["retype", { ids: [id], type: hit.id }];
  if (!to) return ["retype", { ids: [id], type: "" }];
  if (own) return ["rename", { id: own.id, name: to }];
  /** `define_from` files a new definition over what it followed, and moves this one onto it. */
  return ["define_from", { id, name: to }];
}

/** The base an element sits on, which is what its extends row shows where it has no definition. */
function based(graph: Graph, id: Id, runs: boolean): Id {
  const base = runs ? edge_base(graph, id) : base_of(graph, id);
  return def_at(graph, base) ? base : "";
}

/** The bases head a listing, then the rest. */
function rank(d: Definition): number {
  return is_base(d.id) ? 0 : 1;
}

