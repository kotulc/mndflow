/** The overview tab: every element's first, lines and scopes included, **one layout for all**
 *  (2026-11-22). The lead column: its card, then where it lives — its model or package, the
 *  element lit. The answers column, always in this order, each a section that folds: its path,
 *  then **its description first** (the user, 2026-11-22), the presentations that show it (or the
 *  one playing), what it holds, how it is used, where it sits, and its text. A section with nothing to say is left out; the
 *  editor's gaps are quiet rows. **Only its own answers**: nothing borrowed from its definition;
 *  its counts are the tray head's. It reflows by the tray's width. */

import { useMemo, type MouseEvent, type ReactNode } from "react";
import { appearances_of, behaviours_of, children, class_of, def_at, def_of, definition_uses,
         diagram_kind, edges_in, ends_of, featured, is_model, is_notation, is_behaviour,
         is_group, is_reference, layer_of, may_retype, object_of, of_ref, owner_of, package_of,
         role_of, shown_name, stands_for, stood_def, tag_at, tags_of, used_model, BASE_PACKAGE,
         DIAGRAM_QUESTIONS, DIAGRAMS, type Act, type Block, type Graph, type Id,
         type Relation } from "@mnd/core";
import { Icon, role_icon } from "@mnd/theme";
import { hover_of, kind_of, told, wire_of, wire_tint, type Hovered } from "@mnd/views";
import { Content } from "./Content";
import { Card, Empty, LineCard, List, Painted, Section, type Item } from "./Lists";
import { Scope, Trail, Where } from "./Where";
import { Presentation, type PresentationProps } from "./Presentation";
import { ScopeAnswers } from "./Workspace";

export type OverviewProps = {
  graph: Graph;
  id: Id;
  onAct?: Act;
  /** The side the canvas looks at, so the overview offers what reading there does, and the way
   *  across to the other side. */
  lists?: "domain" | "structure";
  /** The presentation playing, or how one is started: the answers' first section. */
  presenting?: PresentationProps;
};

export function Overview({ graph, id, onAct, lists, presenting }: OverviewProps) {
  /** What its hover card says, a definition's uses read as the library reads them; a reference
   *  says what it stands for, as its card does. */
  const read = useMemo(() => (graph.blocks[id]?.parent
    ? hover_of(graph, id, !!graph.blocks[id]?.def || lists === "domain") : null),
  [graph, id, lists]);
  const shows = useMemo(() => featured(graph, id), [graph, id]);
  const e = graph.edges[id];
  const b = graph.blocks[id];
  /** **The presentations, first after its path**: the one playing, else those showing it. */
  const deck = presenting ? <Presentation p={presenting} featured={shows} /> : null;
  if (e) {
    return (
      <Shell lead={<LineCard graph={graph} id={id} />} pic={<Where graph={graph} id={id} />}>
        <Trail graph={graph} id={id} />
        <LineAnswers graph={graph} e={e} deck={deck} />
      </Shell>
    );
  }
  if (!b) return null;
  /** **A scope** — the workspace, a package — reads its own answers; the workspace's card is its
   *  whole map, a package's its own card over the map it sits in. */
  if (!b.parent) {
    const whole = id === graph.root;
    return (
      <Shell lead={whole ? null : <Card graph={graph} id={id} />}
             pic={whole ? <Scope graph={graph} id={id} room /> : <Where graph={graph} id={id} />}>
        <Trail graph={graph} id={id} />
        <ScopeAnswers graph={graph} id={id} deck={deck} {...(onAct ? { onAct } : {})} />
      </Shell>
    );
  }
  return <BlockOverview graph={graph} b={b} read={read} deck={deck}
                        {...(lists ? { lists } : {})} {...(onAct ? { onAct } : {})}
                        {...(presenting ? { presenting } : {})} />;
}

/** The tallest an overview's card stands before it is drawn small. */
const CARD_MOST = 200;

/** **The one layout**: the lead column — the card, the picture — and the answers column. */
function Shell({ lead, pic, children, onClickCapture }: {
  lead: ReactNode; pic: ReactNode; children: ReactNode;
  onClickCapture?: (e: MouseEvent) => void;
}) {
  return (
    <div className="ov" {...(onClickCapture ? { onClickCapture } : {})}>
      {lead ? <div className="ov-card">{lead}</div> : null}
      <div className="ov-pic">{pic}</div>
      <div className="ov-answers lists">{children}</div>
    </div>
  );
}

/** **A block's answers**, in the one order. */
function BlockOverview({ graph, b, read, deck, lists, onAct, presenting }: {
  graph: Graph; b: Block; read: Hovered | null; deck: ReactNode; lists?: "domain" | "structure";
  onAct?: Act; presenting?: PresentationProps;
}) {
  const id = b.id;
  /** A reference is drawn as what it stands for, which is what opening it shows. */
  const seen = of_ref(graph, id) ? stands_for(graph, id)?.id ?? id : id;
  const kind = diagram_kind(graph, seen);
  const used = !!b.def && definition_uses(graph, id).length > 0;
  const model = is_model(graph, id);
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
  /** A header's ▶ plays its model's presentation (theme `header.tsx`, `data-play`). */
  const played = (e: MouseEvent) => {
    const at = (e.target as Element).closest<HTMLElement>("[data-play]")?.dataset["play"];
    const home = used_model(graph, id);
    if (at === undefined || !home || !presenting || presenting.name !== null) return;
    e.stopPropagation();
    presenting.onStart(home, Number(at), 0);
  };
  return (
    <Shell lead={<Card graph={graph} id={id} most={CARD_MOST} />}
           pic={<Where graph={graph} id={id} />} onClickCapture={played}>
      <Trail graph={graph} id={id} />
      <Why graph={graph} b={b} kind={kind} editor={!!onAct}>
        {becomes.length ? (
          <div className="chips">
            <span className="faint">no parts yet: make it</span>
            {becomes.map((k) => (
              <button key={k} className="chip" title={`make it a ${k}: ${DIAGRAM_QUESTIONS[k]}`}
                      onClick={() => onAct!("retype", { ids: [id], type: k })}>
                <Icon name={role_icon(k)} size={11} />{k}
              </button>
            ))}
          </div>
        ) : null}
      </Why>
      {deck}
      {read?.holds ? (
        <Section name="what it holds" about="Its parts, in order">
          <div className="chips">
            {read.holds.map((n, i) => <span key={`${n}${i}`} className="chip-like">{n}</span>)}
          </div>
        </Section>
      ) : null}
      <How graph={graph} b={b} seen={graph.blocks[seen] ?? b} kind={kind} read={read}
           {...(onAct ? { onAct } : {})}>
        {/* Opening is a double-click on the canvas or the explorer, never a button here
            (2026-11-22); only the way across is offered. */}
        {across && onAct ? (
          <div className="chips">
            <button className="chip"
                    title={across === "uses" ? "read where it is used, in the library"
                      : "draw it, in the models"}
                    onClick={() => onAct(across === "uses" ? "@uses" : "@view_model", { id })}>
              {across === "uses" ? "read its uses" : "view the model"}
            </button>
          </div>
        ) : null}
      </How>
      {onAct && !b.def ? <Place graph={graph} b={b} onAct={onAct} /> : null}
      {/* What it says as text, last: a diagram's or a document's own. */}
      {text !== undefined && (text || onAct) ? (
        <Section name="text" about="What it says: a diagram's or a document's own text">
          <Content graph={graph} id={seen} band={false} {...(onAct ? { onAct } : {})} />
        </Section>
      ) : null}
    </Shell>
  );
}

/** **A line's answers**: its description — its type and tags — and how it is used — its ends,
 *  from one to the other, with what each end says. */
function LineAnswers({ graph, e, deck }: { graph: Graph; e: Relation; deck: ReactNode }) {
  const ends = ends_of(graph, e.id);
  const swatch = <span className="swatch" {...wire_tint(wire_of(graph, e.id))} />;
  const end = (way: "from" | "to"): Item => {
    const at = ends[way];
    return { id: way, mark: swatch, name: shown_name(graph, owner_of(graph, e[way])),
             kind: [way, at?.multiplicity, at?.role].filter(Boolean).join(" · "),
             says: [at?.ownership && at.ownership !== "none" ? at.ownership : "",
                    at?.navigable === false ? "not navigable" : ""].filter(Boolean).join(" · ") };
  };
  return (
    <>
      <Section name="description" about="What it is: its relation type and tags">
        <div className="chips">
          <span className="chip-like">{kind_of(graph, e.id)}</span>
          {(e.tags ?? []).map((t) => (
            <Painted key={t} graph={graph} entry={t} word={tag_at(graph, t)?.name ?? t} chip />
          ))}
        </div>
      </Section>
      {deck}
      <Section name="how it is used" about="What it joins, from one end to the other">
        <div className="sec-body"><List label="ends" items={[end("from"), end("to")]} /></div>
      </Section>
    </>
  );
}

/** **Its description**: its own, else its definition's read through, quieter — a gap
 *  in the editor where neither says — then its definition, its kind, whether it is a behaviour,
 *  and its tags; then what it may become. */
function Why({ graph, b, kind, editor, children }: { graph: Graph; b: Block; kind: Id | null;
                                                     editor: boolean; children?: ReactNode }) {
  const def = b.def ? undefined : def_of(graph, b.id);
  /** Base's definitions are kinds: the kind's chip already names them. */
  const own = def && package_of(graph, def) !== BASE_PACKAGE ? def_at(graph, def) : undefined;
  /** A definition's own: what it extends, where that is no kind. */
  const base = b.def && b.type && package_of(graph, b.type) !== BASE_PACKAGE
    ? def_at(graph, b.type) : undefined;
  const through = b.description ? undefined : told(graph, b.id);
  const chips = !!own || !!base || !!kind || is_behaviour(graph, b.id)
    || tags_of(graph, b.id).length > 0;
  return (
    <Section name="description" about="What it is for, in its own words; then what it is">
      {b.description ? <p className="why">{b.description}</p>
        : through ? <p className="why faint">{through}</p>
        : editor ? <p className="gap">no description yet</p> : null}
      {chips ? (
        <div className="chips">
          {own ? <Painted graph={graph} entry={own.id} word={own.name} chip /> : null}
          {base ? <span className="faint">extends</span> : null}
          {base ? <Painted graph={graph} entry={base.id} word={base.name} chip /> : null}
          {kind ? <span className="chip-like"><Icon name={role_icon(kind)} size={11} />{kind}</span>
            : null}
          {is_behaviour(graph, b.id) ? <span className="chip-like dim">behaviour</span> : null}
          {tags_of(graph, b.id).map((t) => (
            <Painted key={t} graph={graph} entry={t} word={tag_at(graph, t)?.name ?? t} chip />
          ))}
        </div>
      ) : null}
      {children}
    </Section>
  );
}

/** **How it is used**: its lines in and out where it sits, by port, each with its relation's
 *  swatch; every side it is seen from, and what draws the same records; a definition's uses, place
 *  by place, as its hover card lists them; then the way across. */
function How({ graph, b, seen, kind, read, onAct, children }: {
  graph: Graph; b: Block; seen: Block; kind: Id | null; read: Hovered | null; onAct?: Act;
  children?: ReactNode;
}) {
  const same = useMemo(() => (kind === "class" || kind === "entity" ? alike(graph, seen.id) : []),
                       [graph, seen.id, kind]);
  if (b.def) {
    return (
      <Section name="how it is used" about="Where its uses are drawn">
        {read?.used ? (
          <div className="sec-body">
            <List label="used in" items={read.used.map((u): Item => ({
              id: u.id, mark: <span className="dot" {...u.tint} />, name: u.label,
              kind: u.names.join(", ") }))} />
          </div>
        ) : <Empty>nothing uses it yet</Empty>}
        {children}
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
      {children}
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
        <span className="faint">{at + 1} of {sibs.length} in {shown_name(graph, b.parent!)}</span>
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
