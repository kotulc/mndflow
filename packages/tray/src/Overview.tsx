/** The overview tab: every block's first, one layout for all. On the left the picture that helps
 *  most — what it connects to, a definition's registry, what a folder files, a note's words —
 *  and on the right three
 *  answers: why it matters, how it is used, where it lives. A block's kind decides only what
 *  the left side draws, and what its counts are called. An empty plain block offers the kinds
 *  it may become. */

import { useMemo } from "react";
import { appearances_of, attributes_of, behaviours_of, children, def_at, def_of,
         definition_uses, diagram_kind, edges_in, heading, interface_at, is_model, is_notation,
         is_behaviour, is_group, is_reference, isa, lattice_of, may_retype, members_of, of_ref,
         opens, owner_of, package_of, path, role_of, shown_name, stands_for, stood_def, subtypes,
         tag_at,
         tags_of, BASE_PACKAGE, DIAGRAM_QUESTIONS, DIAGRAMS, type Act, type Block, type Graph,
         type Id } from "@mnd/core";
import { Icon, role_icon } from "@mnd/theme";
import { class_graph, entry_look, look_of, tint_attrs } from "@mnd/views";
import { Painted } from "./Carried";
import { Picture } from "./Picture";

export type OverviewProps = {
  graph: Graph;
  id: Id;
  onAct?: Act;
  /** The side the canvas looks at, so the overview offers what reading there does, and the way
   *  across to the other side. */
  lists?: "domain" | "structure";
};

/** One count: how many, and what of. */
type Count = [number, string];

export function Overview({ graph, id, onAct, lists }: OverviewProps) {
  const b = graph.blocks[id];
  /** What uses it, worked out once: a definition's uses, else what refers to it. **One object**:
   *  a block's users are every other appearance of it, a stand-in's too. */
  const users = useMemo(() => (b?.def
    ? definition_uses(graph, id).flatMap((u) => graph.blocks[u.id] ?? [])
    : appearances_of(graph, id).filter((u) => u !== id).map((u) => graph.blocks[u]!)),
  [graph, id, b]);
  if (!b) return null;
  /** A reference is drawn as what it stands for, which is what opening it shows. */
  const seen = of_ref(graph, id) ? stands_for(graph, id)?.id ?? id : id;
  const kind = diagram_kind(graph, seen);
  const role = role_of(graph, seen);
  /** A room offers to be opened and read alone; a definition, in the library, where it is used;
   *  a model, in the models, its drawing. */
  const used = !!b.def && definition_uses(graph, id).length > 0;
  const model = is_model(graph, id);
  const drawn = b.def ? (lists === "domain" ? used : model) : opens(graph, seen);
  /** **The way across is asked for**: a model read in the library is drawn in the models; a
   *  definition picked in the models is read where it is used, in the library. */
  const across = !onAct ? null : model && lists === "domain" ? "view model"
    : used && lists !== "domain" ? "uses" : null;
  /** An empty plain block may become any kind it fits. */
  const promotes = !b.def && !kind && !parts(graph, id).length && !of_ref(graph, id)
    && !is_notation(graph, id) && !!onAct;
  const becomes = promotes ? DIAGRAMS.filter((k) => may_retype(graph, id, k)) : [];
  return (
    <div className="overview">
      <div className="glance">
        <span className="cap">
          <Icon name={role_icon(role)} size={12} />
          <b>{kind ?? (b.def ? "definition" : role)}</b>
          {kind ? <span> · {DIAGRAM_QUESTIONS[kind]}</span> : null}
        </span>
        <div className="thumb"><Picture graph={graph} id={id} /></div>
        {(drawn || across) && onAct ? (
          <span className="opens">
            {drawn ? (
              <>
                <button className="chip open" onClick={() => onAct("open", { id })}>open</button>
                <button className="chip open" title="enter it: its own view, alone"
                        onClick={() => onAct("read", { id: seen })}>read</button>
              </>
            ) : null}
            {across ? (
              <button className="chip open"
                      title={across === "uses" ? "read where it is used, in the library"
                        : "draw it, in the models"}
                      onClick={() => onAct(across === "uses" ? "@uses" : "@view_model", { id })}>
                {across}
              </button>
            ) : null}
          </span>
        ) : null}
        {becomes.length ? (
          <div className="make">
            <span className="faint">no parts yet: make it one of these</span>
            {becomes.map((k) => (
              <button key={k} className="chip" title={`make it a ${k}: ${DIAGRAM_QUESTIONS[k]}`}
                      onClick={() => onAct!("retype", { ids: [id], type: k })}>
                <Icon name={role_icon(k)} size={11} />{k}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="answers">
        <Why graph={graph} b={b} kind={kind} />
        <How graph={graph} b={b} />
        <Where graph={graph} b={b} seen={graph.blocks[seen] ?? b} kind={kind} users={users}
               {...(onAct ? { onAct } : {})} />
        {onAct && b.parent && !b.def ? <Place graph={graph} b={b} onAct={onAct} /> : null}
      </div>
    </div>
  );
}

/** Why it matters: its description, else its definition's; then what it is, as chips. */
function Why({ graph, b, kind }: { graph: Graph; b: Block; kind: Id | null }) {
  const def = b.def ? undefined : def_of(graph, b.id);
  /** Base's definitions are kinds: their words describe the kind, never this block, and the
   *  kind's chip already names them. */
  const own = def && package_of(graph, def) !== BASE_PACKAGE ? def_at(graph, def) : undefined;
  const said = b.description ?? own?.description;
  return (
    <section>
      <h5>why it matters</h5>
      {said ? <p className="why">{said}</p> : <span className="faint">no description yet</span>}
      <div className="chips">
        {own ? (
          <span className="painted chip-like def" {...tint_attrs(look_of(graph, own.id))}>
            {own.name}
          </span>
        ) : null}
        {kind ? <span className="chip-like"><Icon name={role_icon(kind)} size={11} />{kind}</span>
          : null}
        {is_behaviour(graph, b.id) ? <span className="chip-like dim">behaviour</span> : null}
        {tags_of(graph, b.id).map((t) => (
          <Painted key={t} graph={graph} entry={t} word={tag_at(graph, t)?.name ?? t} chip />
        ))}
      </div>
    </section>
  );
}

/** How it is used: the lines in and out where it sits, by port; then its parts by tag. */
function How({ graph, b }: { graph: Graph; b: Block }) {
  const lines = b.parent ? edges_in(graph, b.parent) : [];
  const ends = (way: "in" | "out") => lines
    .filter((e) => owner_of(graph, way === "in" ? e.to : e.from) === b.id)
    .map((e) => {
      const far = way === "in" ? e.from : e.to;
      const port = b.ports?.find((p) => p.id === (way === "in" ? e.toPort : e.fromPort));
      const via = [e.name, port?.name, port?.type ? interface_at(graph, port.type)?.name : ""]
        .filter(Boolean).join(" · ");
      return { id: e.id, peer: shown_name(graph, owner_of(graph, far)), via };
    });
  const [inn, out] = [ends("in"), ends("out")];
  const peers = (list: typeof inn, none: string) => (list.length ? list.map((p) => (
    <span key={p.id} className="peer">{p.peer} <small>{p.via}</small></span>
  )) : <span className="faint">{none}</span>);
  const by = by_tag(graph, b.id);
  return (
    <section>
      <h5>how it is used</h5>
      {inn.length || out.length ? (
        <div className="flowrow">
          <div className="side right">{peers(inn, "nothing in")}</div>
          <div className="hub">{shown_name(graph, b.id)}</div>
          <div className="side">{peers(out, "nothing out")}</div>
        </div>
      ) : <span className="faint">no lines join it where it sits</span>}
      {by.length ? (
        <>
          <div className="bar">
            {by.map(([tag, n]) => (
              <i key={tag ?? ""} style={{ flex: n }}
                 {...(tag ? tint_attrs(entry_look(graph, tag)) : { "data-none": "" })} />
            ))}
          </div>
          <span className="faint">
            parts by tag: {by.map(([tag, n]) => `${tag ? tag_at(graph, tag)?.name : "none"} ${n}`)
              .join(" · ")}
          </span>
        </>
      ) : null}
    </section>
  );
}

/** Where it lives: its path; what refers to it, or uses it; what draws the same records; and
 *  its counts, in its kind's own words. */
function Where({ graph, b, seen, kind, users, onAct }: {
  graph: Graph; b: Block; seen: Block; kind: Id | null; users: readonly Block[]; onAct?: Act;
}) {
  const trail = path(graph, b.id).slice(0, -1).map((p) => shown_name(graph, p.id));
  const same = useMemo(() => (kind === "class" || kind === "entity" ? alike(graph, seen.id) : []),
                       [graph, seen.id, kind]);
  return (
    <section>
      <h5>where it lives</h5>
      <div className="trail">{trail.join(" / ") || "the workspace"}</div>
      {users.length ? (
        <div className="chips">
          <span className="faint">{b.def ? "used by" : "also drawn"}</span>
          {users.map((u) => (
            <button key={u.id} className="chip" title="go to where it is drawn"
                    onClick={() => onAct?.("reveal", { id: u.id })}>
              {shown_name(graph, u.id)}
              {u.parent ? <small> in {shown_name(graph, u.parent)}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
      {same.length ? (
        <div className="chips">
          <span className="faint">same records as</span>
          {same.map((s) => <span key={s} className="chip-like">{shown_name(graph, s)}</span>)}
        </div>
      ) : null}
      <div className="stat">
        {counts(graph, seen, kind, users.length)
          .map(([n, word]) => <span key={word}><b>{n}</b> {word}</span>)}
      </div>
    </section>
  );
}

/** Where it sits in its room: its place among its siblings — **file order made editable**; a
 *  region's place is its band's. */
function Place({ graph, b, onAct }: { graph: Graph; b: Block; onAct: Act }) {
  const sibs = children(graph, b.parent!);
  const at = sibs.findIndex((s) => s.id === b.id);
  /** Earlier goes before the one ahead; later before the one two behind, or last. */
  const move = (by: -1 | 1) => {
    const before = by < 0 ? sibs[at - 1] : sibs[at + 2];
    onAct("move", { ids: [b.id], parent: b.parent, ...(before ? { before: before.id } : {}) });
  };
  return (
    <section className="place">
      <h5>where it sits</h5>
      <div className="chips">
        <span className="faint">order {at + 1} of {sibs.length} in {shown_name(graph, b.parent!)}</span>
        <button className="chip" disabled={at <= 0} onClick={() => move(-1)}>earlier</button>
        <button className="chip" disabled={at >= sibs.length - 1} onClick={() => move(1)}>later</button>
      </div>
    </section>
  );
}

/** What it holds that is a part: no notation, no organization. */
function parts(graph: Graph, id: Id): Block[] {
  return children(graph, id).filter((c) => !is_notation(graph, c.id) && !is_group(graph, c.id));
}

/** Whether a block is of a kind, by its chain. */
function is_a(graph: Graph, b: Block, kind: Id): boolean {
  return b.type === kind || isa(graph, b.type).some((d) => d.id === kind);
}

/** Its parts by their first tag, the untagged last; nothing where none is tagged. */
function by_tag(graph: Graph, id: Id): [Id | null, number][] {
  const out = new Map<Id | null, number>();
  for (const p of parts(graph, id)) {
    const tag = tags_of(graph, p.id)[0] ?? null;
    out.set(tag, (out.get(tag) ?? 0) + 1);
  }
  const tagged = [...out].filter(([t]) => t !== null);
  return tagged.length ? [...tagged, ...[...out].filter(([t]) => t === null)] : [];
}

/** The definitions a class or entity diagram refers to. */
function records(graph: Graph, id: Id): Set<Id> {
  return new Set(children(graph, id).filter((c) => is_reference(graph, c.id))
    .map((c) => stood_def(graph, c.id)?.id).filter((d): d is Id => !!d));
}

/** The other class and entity diagrams referring to a definition this one refers to. */
function alike(graph: Graph, id: Id): Id[] {
  const own = records(graph, id);
  return Object.values(graph.blocks)
    .filter((o) => o.id !== id && ["class", "entity"].includes(diagram_kind(graph, o.id) ?? ""))
    .filter((o) => [...records(graph, o.id)].some((d) => own.has(d)))
    .map((o) => o.id);
}

/** Its counts, named in its kind's terms. */
function counts(graph: Graph, b: Block, kind: Id | null, usages: number): Count[] {
  const held = parts(graph, b.id);
  const lines = edges_in(graph, b.id).length;
  const decisions = children(graph, b.id).filter((c) => is_a(graph, c, "decision")).length;
  const grid = lattice_of(graph, b.id);
  const steps = members_of(graph, b.id).filter((m) => m.cell && !heading(m.cell.r, m.cell.c));
  const drawn = (k: "class" | "er") => Object.keys(class_graph(graph, b.id, k)?.edges ?? {}).length;
  if (b.def) {
    return [[attributes_of(graph, b.id).length, "fields"],
            [behaviours_of(graph, b.id).length, "behaviours"],
            [usages, "usages"], [subtypes(graph, b.id).length, "subtypes"]];
  }
  switch (kind) {
    case "flow": return [[held.length, "steps"], [decisions, "decisions"],
                         [lines, "lines"]];
    case "state": return [[held.length, "states"], [lines, "transitions"]];
    case "sequence": return [[(grid?.cols ?? 1) - 1, "lifelines"], [steps.length, "steps"],
                             [lines, "messages"]];
    case "swimlane": return [[(grid?.cols ?? 1) - 1, "lanes"], [(grid?.rows ?? 1) - 1, "phases"],
                             [steps.length, "steps"]];
    case "class": return [[records(graph, b.id).size, "classes"], [drawn("class"), "lines"]];
    case "entity": return [[records(graph, b.id).size, "tables"], [drawn("er"), "relations"]];
    case "treemap": return [[children(graph, b.id).filter((c) => is_group(graph, c.id)).length,
                             "boxes"],
                            [children(graph, b.id).flatMap((c) => children(graph, c.id))
                              .filter((c) => is_reference(graph, c.id)).length, "references"]];
    default: return [[held.length, "parts"], [b.ports?.length ?? 0, "ports"], [lines, "lines"]];
  }
}
