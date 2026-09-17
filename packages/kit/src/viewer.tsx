/** An embedded view: interactive, self-contained, and not editable. */

import { useState } from "react";
import { children, type Graph, type Id } from "@mnd/core";
import { project, type Config } from "@mnd/views";
import { FlowView, type Gesture } from "@mnd/stage";

/** Nothing picked, as one constant so it never reads as a change. */
const NONE: readonly Id[] = [];

export type ViewerProps = {
  graph: Graph;
  /** Which layer to draw. The root layer unless said otherwise. */
  layer?: Id | null;
  /** Which blocks are lit, without moving the layer. */
  picked?: readonly Id[];
  config?: Config;
  /** Told where the viewer is looking, whenever that changes. */
  onLook?: (layer: Id | null) => void;
  /** Told what is lit, whenever that changes. */
  onPick?: (ids: Id[]) => void;
  /** Told where a box points, when one that holds nothing is opened. */
  onFollow?: (link: string, id: Id) => void;
};

export function Viewer({ graph, layer = null, picked = NONE,
                        config, onLook, onPick, onFollow }: ViewerProps) {
  const [at, set_at] = driven<Id | null>(layer);
  const [lit, set_lit] = driven<readonly Id[]>(picked);

  const scene = project(graph, at, config);

  const pick = (ids: Id[]) => {
    set_lit(ids);
    onPick?.(ids);
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
        if (children(graph, g.on).length) look(g.on);
        else if (link) follow(link, g.on);
      } else if (!g.on) look(at ? graph.blocks[at]?.parent ?? null : null);
      return;
    }
    pick(g.on ? [g.on] : []);
  };

  return <FlowView scene={scene} picked={lit} onGesture={gesture} onPick={pick} />;
}

/** A value the host may drive: the viewer's own until the host sets it. */
function driven<T>(sent: T): [T, (next: T) => void] {
  const [held, set_held] = useState(sent);
  const [was, set_was] = useState(sent);
  if (sent !== was) { set_was(sent); set_held(sent); }
  return [held, set_held];
}
