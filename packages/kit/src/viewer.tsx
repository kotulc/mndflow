/** An embedded view: interactive, self-contained, and not editable. */

import { useState } from "react";
import { is_container, type Graph, type Id } from "@mnd/core";
import { class_def, fields_graph, project, set_card, set_full, type Config } from "@mnd/views";
import { Crumbs, FlowView, Legend, type Corner, type Gesture } from "@mnd/stage";

/** Nothing picked, as one constant so it never reads as a change. */
const NONE: readonly Id[] = [];

export type ViewerProps = {
  graph: Graph;
  /** Which layer to draw. The root layer unless said otherwise. */
  layer?: Id | null;
  /** Which blocks are lit, without moving the layer. */
  picked?: readonly Id[];
  config?: Config;
  /** The default card, in units of the lattice. The layout's own default unless said. */
  card?: { w: number; h: number };
  /** Whether a card that fits its content grows to show all of it. Off, it previews it at the one
   *  card height and cuts it off. */
  full?: boolean;
  /** Chrome over the canvas. */
  chrome?: {
    crumbs?: boolean;
    /** The ruled lattice behind the cards. On unless turned off. */
    lattice?: boolean;
    /** The key to what the layer draws, and which right-hand corner it keeps to. */
    legend?: boolean;
    corner?: Corner;
  };
  /** Told where the viewer is looking, whenever that changes. */
  onLook?: (layer: Id | null) => void;
  /** Told what is lit, whenever that changes. */
  onPick?: (ids: Id[]) => void;
  /** Told a card double-clicked — on its body, its name or its border — in place of the viewer
   *  opening or following it. */
  onOpen?: (id: Id) => void;
  /** Told where a box points, when one that holds nothing is opened. */
  onFollow?: (link: string, id: Id) => void;
  /** The layer drawn as its fields' class diagram rather than its contents. */
  fields?: Id | null;
  /** Told what the view toggle asks for: the open layer drawn as a diagram, or null for its
   *  contents. Given it, a layer whose blocks carry fields offers the toggle in the canvas's bottom
   *  right-hand corner. A pick on the diagram's class card is told as its definition. */
  onFields?: (id: Id | null) => void;
  /** The layer read down the page: fitted to its width, scrolled rather than zoomed. */
  scroll?: boolean;
  /** Where a scrolled layer is read: the card brought to the middle of the view; with none, the
   *  whole layer is fitted. */
  focus?: Id | null;
  /** How wide a scrolled layer reads, in drawing units: its whole width unless said. */
  reach?: number | null;
  /** The most a scrolled layer ever takes in across, in drawing units: unbounded unless said. */
  widest?: number | null;
};

export function Viewer({ graph, layer = null, picked = NONE, config, card, full = false, chrome,
                        onLook, onPick, onOpen, onFollow, fields = null, onFields, scroll = false,
                        focus = null, reach = null, widest = null }: ViewerProps) {
  const [at, set_at] = driven<Id | null>(layer);
  const [lit, set_lit] = driven<readonly Id[]>(picked);

  /** The card size is the layout's, held in one place, so it is set before anything measures. */
  if (card) set_card(card.w, card.h);
  set_full(full);
  /** A fields diagram is the open layer drawn another way, in its own frame. It is only ever the
   *  open layer's: one asked for elsewhere draws nothing until that layer is open. */
  const diagram = at ? fields_graph(graph, at) : null;
  const drawn = fields === at ? diagram : null;
  const scene = project(drawn ?? graph, at, config);

  const pick = (ids: Id[]) => {
    set_lit(ids);
    onPick?.(ids.map((id) => class_def(id) ?? id));
  };

  /** Moving layer leaves a diagram behind. */
  const look = (next: Id | null) => {
    set_at(next);
    onLook?.(next);
    if (fields) onFields?.(null);
    pick([]);
  };

  /** Where a box points, if it points anywhere. */
  const link_of = (id: string) => scene.nodes.find((n) => n.id === id)?.data.link;

  const follow = (link: string, id: Id) => {
    if (onFollow) onFollow(link, id);
    else if (typeof window !== "undefined") window.location.assign(link);
  };

  /** Double-click opens a container, follows a link, or goes back out. */
  const gesture = (g: Gesture) => {
    if (g.button !== "left") return;
    if (g.count === 2) {
      if (onOpen && g.on && OPENS.includes(g.kind)) { onOpen(g.on); return; }
      if (g.on && g.kind === "box") {
        const link = link_of(g.on);
        if (is_container(graph, g.on)) look(g.on);
        else if (link) follow(link, g.on);
      } else if (!g.on) look(at ? graph.blocks[at]?.parent ?? null : null);
      return;
    }
    pick(g.on ? [g.on] : []);
  };

  const flow = (
    /** A view of its own, so the camera frames each afresh: a room is kept per layer, and the
     *  diagram's is not the contents'. */
    <FlowView key={drawn ? "diagram" : "contents"} scene={scene} picked={lit}
      lattice={chrome?.lattice ?? true} scroll={scroll} focus={focus}
      reach={reach} widest={widest}
      onGesture={gesture} onPick={pick} />
  );
  if (!chrome?.crumbs && !chrome?.legend && !onFields) return flow;

  /** The toggle is offered only inside a layer whose blocks carry fields. */
  const fielded = !!onFields && !!diagram;

  return (
    <section className="stage" style={{ position: "relative", width: "100%", height: "100%",
                                        minWidth: 0, minHeight: 0, overflow: "hidden" }}>
      {chrome?.crumbs ? (
        <Crumbs trail={scene.trail} onAct={(name, args) => {
          if (name !== "open") return;
          const id = args?.id === undefined ? undefined : String(args.id);
          if (id === undefined) look(at ? graph.blocks[at]?.parent ?? null : null);
          else look(id === graph.root ? null : id);
        }} />
      ) : null}
      {flow}
      {fielded ? (
        <span className="mnd-views" role="group" aria-label="view">
          <button type="button" aria-pressed={!drawn} title="the layer's contents"
                  onClick={() => onFields!(null)}>contents</button>
          <button type="button" aria-pressed={!!drawn} title="the layer's fields as a class diagram"
                  onClick={() => onFields!(at)}>diagram</button>
        </span>
      ) : null}
      {chrome?.legend ? <Legend scene={scene} at={chrome.corner ?? "top"} /> : null}
    </section>
  );
}

/** What a double-click opens a card by. */
const OPENS: readonly Gesture["kind"][] = ["box", "name", "brim"];

/** A value the host may drive: the viewer's own until the host sets it. */
function driven<T>(sent: T): [T, (next: T) => void] {
  const [held, set_held] = useState(sent);
  const [was, set_was] = useState(sent);
  if (sent !== was) { set_was(sent); set_held(sent); }
  return [held, set_held];
}
