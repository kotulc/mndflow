/** The overview tab: every element's first, lines included, **one layout for all**. The card,
 *  then where it lives — its whole model or package, the element lit — then its path heading
 *  titled answers: why it matters, how it is used, where it sits, and its text. **Only its own
 *  answers**: nothing borrowed from its definition. Gaps are quiet rows, in the editor only. It
 *  reflows by the tray's width. */

import { useMemo } from "react";
import { appearances_of, behaviours_of, children, class_of, def_at, def_of, definition_uses,
         diagram_kind, edges_in, ends_of, is_model, is_notation, is_behaviour, is_group,
         is_reference, layer_of, may_retype, object_of, of_ref, opens, owner_of, package_of,
         role_of, shown_name, stands_for, stood_def, tag_at, tags_of, use_places, BASE_PACKAGE,
         DIAGRAM_QUESTIONS, DIAGRAMS, type Act, type Block, type Graph, type Id,
         type Relation } from "@mnd/core";
import { Icon, role_icon } from "@mnd/theme";
import { kind_of, wire_of, wire_tint } from "@mnd/views";
import { Content } from "./Content";
import { Faces } from "./Faces";
import { Empty, LineCard, List, Painted, Section, type Item } from "./Lists";
import { Trail, Where } from "./Where";

export type OverviewProps = {
  graph: Graph;
  id: Id;
  onAct?: Act;
  /** The side the canvas looks at, so the overview offers what reading there does, and the way
   *  across to the other side. */
  lists?: "domain" | "structure";
};

export function Overview({ graph, id, onAct, lists }: OverviewProps) {
  const e = graph.edges[id];
  if (e) return <LineOverview graph={graph} e={e} />;
  const b = graph.blocks[id];
  if (!b) return null;
  /** A reference is drawn as what it stands for, which is what opening it shows. */
  const seen = of_ref(graph, id) ? stands_for(graph, id)?.id ?? id : id;
  const kind = diagram_kind(graph, seen);
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
  /** A diagram's or a document's own text, read last. */
  const text = class_of(graph, seen) !== "part" ? graph.blocks[seen]?.body?.trim() ?? "" : undefined;
  return (
    <div className="ov">
      {/* A package is drawn as no card. */}
      {b.parent ? <div className="ov-card"><Faces graph={graph} id={id} one /></div> : null}
      <div className="ov-pic">
        <Where graph={graph} id={id} />
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
      <div className="ov-answers lists">
        <Trail graph={graph} id={id} />
        <Why graph={graph} b={b} kind={kind} editor={!!onAct} />
        <How graph={graph} b={b} seen={graph.blocks[seen] ?? b} kind={kind}
             {...(onAct ? { onAct } : {})} />
        {onAct && b.parent && !b.def ? <Place graph={graph} b={b} onAct={onAct} /> : null}
        {/* What it says as text, last: a diagram's or a document's own. */}
        {text !== undefined && (text || onAct) ? (
          <Section name="text" about="What it says: a diagram's or a document's own text">
            <Content graph={graph} id={seen} band={false} {...(onAct ? { onAct } : {})} />
          </Section>
        ) : null}
      </div>
    </div>
  );
}

/** **A line's overview**: the line drawn whole as its card, its ends as a list; where it lives,
 *  both ends lit; then its path, why and how, as a block's. */
function LineOverview({ graph, e }: { graph: Graph; e: Relation }) {
  const ends = ends_of(graph, e.id);
  const swatch = <span className="swatch" {...wire_tint(wire_of(graph, e.id))} />;
  const end_of = (way: "from" | "to") => shown_name(graph, owner_of(graph, e[way]));
  const end = (way: "from" | "to"): Item => {
    const at = ends[way];
    return { id: way, mark: swatch, name: end_of(way),
             kind: [at?.multiplicity, at?.role].filter(Boolean).join(" "),
             says: [at?.ownership && at.ownership !== "none" ? at.ownership : "",
                    at?.navigable === false ? "not navigable" : ""].filter(Boolean).join(" · ") };
  };
  return (
    <div className="ov">
      <div className="ov-card">
        <span className="lead-cap">card</span>
        <LineCard graph={graph} id={e.id} />
        <div className="sec-body"><List label="ends" items={[end("from"), end("to")]} /></div>
      </div>
      <div className="ov-pic"><Where graph={graph} id={e.id} /></div>
      <div className="ov-answers lists">
        <Trail graph={graph} id={e.id} />
        <Section name="why it matters" about="What it is: its relation type">
          <div className="chips"><span className="chip-like">{kind_of(graph, e.id)}</span></div>
        </Section>
        <Section name="how it is used" about="What it joins, from one end to the other">
          <p className="why">{end_of("from")} → {end_of("to")}</p>
        </Section>
      </div>
    </div>
  );
}

/** **Why it matters**: its own description — a gap, quiet, in the editor where it has none —
 *  then its definition, its kind, whether it is a behaviour, and its tags. */
function Why({ graph, b, kind, editor }: { graph: Graph; b: Block; kind: Id | null;
                                           editor: boolean }) {
  const def = b.def ? undefined : def_of(graph, b.id);
  /** Base's definitions are kinds: the kind's chip already names them. */
  const own = def && package_of(graph, def) !== BASE_PACKAGE ? def_at(graph, def) : undefined;
  return (
    <Section name="why it matters" about="What it is for, in its own words; then what it is">
      {b.description ? <p className="why">{b.description}</p>
        : editor ? <p className="gap">no description yet</p> : null}
      <div className="chips">
        {own ? <Painted graph={graph} entry={own.id} word={own.name} chip /> : null}
        {kind ? <span className="chip-like"><Icon name={role_icon(kind)} size={11} />{kind}</span>
          : null}
        {is_behaviour(graph, b.id) ? <span className="chip-like dim">behaviour</span> : null}
        {tags_of(graph, b.id).map((t) => (
          <Painted key={t} graph={graph} entry={t} word={tag_at(graph, t)?.name ?? t} chip />
        ))}
      </div>
    </Section>
  );
}

/** **How it is used**: its lines in and out where it sits, by port, each with its relation's
 *  swatch; every side it is seen from, and what draws the same records; a definition's uses, in
 *  words. */
function How({ graph, b, seen, kind, onAct }: {
  graph: Graph; b: Block; seen: Block; kind: Id | null; onAct?: Act;
}) {
  const same = useMemo(() => (kind === "class" || kind === "entity" ? alike(graph, seen.id) : []),
                       [graph, seen.id, kind]);
  if (b.def) {
    const uses = definition_uses(graph, b.id).length;
    const places = use_places(graph, b.id).length;
    return (
      <Section name="how it is used" about="Where its uses are drawn">
        {uses ? (
          <p className="why">
            used {uses} {uses === 1 ? "time" : "times"} in {places} {places === 1 ? "place" : "places"}
          </p>
        ) : <Empty>nothing uses it yet</Empty>}
      </Section>
    );
  }
  const lines = b.parent ? edges_in(graph, b.parent) : [];
  const ends = (way: "in" | "out"): Item[] => lines
    .filter((e) => owner_of(graph, way === "in" ? e.to : e.from) === b.id)
    .map((e) => {
      const far = way === "in" ? e.from : e.to;
      const port = b.ports?.find((p) => p.id === (way === "in" ? e.toPort : e.fromPort));
      return { id: e.id, mark: <span className="swatch" {...wire_tint(wire_of(graph, e.id))} />,
               name: shown_name(graph, owner_of(graph, far)), kind: e.name ?? kind_of(graph, e.id),
               says: port?.name ?? "" };
    });
  const [inn, out] = [ends("in"), ends("out")];
  return (
    <Section name="how it is used" about="The lines that join it where it sits, in and out">
      {inn.length || out.length ? (
        <div className="sec-body">
          {inn.length ? <List label="in" items={inn} /> : null}
          {out.length ? <List label="out" items={out} /> : null}
        </div>
      ) : <Empty>no lines join it where it sits</Empty>}
      {onAct ? <Sides graph={graph} id={b.id} onAct={onAct} /> : null}
      {same.length ? (
        <div className="chips">
          <span className="faint">same records as</span>
          {same.map((x) => <span key={x} className="chip-like">{shown_name(graph, x)}</span>)}
        </div>
      ) : null}
    </Section>
  );
}

/** **The model's joins**: every layer drawing the block — its own first, then each diagram a
 *  stand-in puts it on — revealed there, picked; then its behaviours, each read as its own
 *  diagram. */
function Sides({ graph, id, onAct }: { graph: Graph; id: Id; onAct: Act }) {
  const drawn = appearances_of(graph, id).filter((a) => layer_of(graph, a));
  const acts = behaviours_of(graph, object_of(graph, id));
  if (drawn.length + acts.length < 2) return null;
  return (
    <div className="chips">
      <span className="faint">seen on</span>
      {drawn.map((a) => (
        <button key={a} className="chip" title="go to where it is drawn"
                onClick={() => onAct("reveal", { id: a })}>
          {shown_name(graph, layer_of(graph, a)!)}
        </button>
      ))}
      {acts.map((x) => (
        <button key={x.id} className="chip" title="read this behaviour, its own diagram"
                onClick={() => onAct("read", { id: x.id })}>
          <Icon name={role_icon(role_of(graph, x.id))} size={11} />{shown_name(graph, x.id)}
        </button>
      ))}
    </div>
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
    <Section name="where it sits" about="Its order in its room, which reading follows">
      <div className="chips place">
        <span className="faint">order {at + 1} of {sibs.length} in {shown_name(graph, b.parent!)}</span>
        <button className="chip" disabled={at <= 0} onClick={() => move(-1)}>earlier</button>
        <button className="chip" disabled={at >= sibs.length - 1} onClick={() => move(1)}>later</button>
      </div>
    </Section>
  );
}

/** What it holds that is a part: no notation, no organization. */
function parts(graph: Graph, id: Id): Block[] {
  return children(graph, id).filter((c) => !is_notation(graph, c.id) && !is_group(graph, c.id));
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
