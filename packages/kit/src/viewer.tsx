/** An embedded view: interactive, self-contained, and not editable. */

import { useState } from "react";
import { children, type Graph, type Id } from "@mnd/core";
import { class_def, fields_graph, project, set_card, type Config } from "@mnd/views";
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
  /** Told where a box points, when one that holds nothing is opened. */
  onFollow?: (link: string, id: Id) => void;
  /** The block or definition whose fields are drawn instead of the layer, as a class diagram. */
  fields?: Id | null;
  /** Told when the diagram asks to close. A pick on its class card is told as its definition. */
  onFields?: (id: Id | null) => void;
};

export function Viewer({ graph, layer = null, picked = NONE, config, card, chrome,
                        onLook, onPick, onFollow, fields = null, onFields }: ViewerProps) {
  const [at, set_at] = driven<Id | null>(layer);
  const [lit, set_lit] = driven<readonly Id[]>(picked);

  /** The card size is the layout's, held in one place, so it is set before anything measures. */
  if (card) set_card(card.w, card.h);
  /** A fields diagram is its own small graph, drawn whole in place of the layer. */
  const drawn = fields ? fields_graph(graph, fields) : null;
  const shown = drawn ?? graph;
  const scene = project(shown, drawn ? null : at, config);

  const pick = (ids: Id[]) => {
    set_lit(ids);
    onPick?.(ids.map((id) => class_def(id) ?? id));
  };

  const look = (next: Id | null) => {
    set_at(next);
    onLook?.(next);
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
      if (g.on && g.kind === "box") {
        const link = link_of(g.on);
        if (!drawn && children(graph, g.on).length) look(g.on);
        else if (link) follow(link, g.on);
      } else if (!g.on && !drawn) look(at ? graph.blocks[at]?.parent ?? null : null);
      return;
    }
    pick(g.on ? [g.on] : []);
  };

  const flow = (
    <FlowView scene={scene} picked={lit} lattice={chrome?.lattice ?? true}
      onGesture={gesture} onPick={pick} />
  );
  if (!chrome?.crumbs && !chrome?.legend && !drawn) return flow;

  return (
    <section className="stage" style={{ position: "relative", width: "100%", height: "100%",
                                        minWidth: 0, minHeight: 0, overflow: "hidden" }}>
      {chrome?.crumbs ? (
        <Crumbs trail={scene.trail} onAct={(name, args) => {
          if (name !== "open") return;
          /** Out of a diagram is back to the layer it was drawn over. */
          if (drawn) { onFields?.(null); return; }
          const id = args?.id === undefined ? undefined : String(args.id);
          if (id === undefined) look(at ? graph.blocks[at]?.parent ?? null : null);
          else look(id === graph.root ? null : id);
        }} />
      ) : null}
      {flow}
      {drawn ? (
        <button type="button" className="mnd-close" title="back to the layer"
                onClick={() => onFields?.(null)}>close diagram</button>
      ) : null}
      {chrome?.legend ? <Legend scene={scene} at={chrome.corner ?? "top"} /> : null}
    </section>
  );
}

/** A value the host may drive: the viewer's own until the host sets it. */
function driven<T>(sent: T): [T, (next: T) => void] {
  const [held, set_held] = useState(sent);
  const [was, set_was] = useState(sent);
  if (sent !== was) { set_was(sent); set_held(sent); }
  return [held, set_held];
}
