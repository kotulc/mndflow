/** An embedded view: interactive, self-contained, and not editable.
 *
 *  A drawing that cannot be walked is a picture, and `draw_svg` already makes
 *  those. This is the other artifact: it holds a graph, projects the layer you
 *  are looking at, and lets you look somewhere else. **Nothing here writes.**
 *
 *  So the left button only ever changes what is being looked at — a layer, or
 *  wherever a box says it came from — and the right
 *  button — which is how the app makes something new — is dropped on the floor.
 *  The editing props `SceneView` offers are not passed and not forwarded, which
 *  is why they are absent from `@mnd/kit/react` too: a consumer cannot reach an
 *  edit through this, rather than being trusted not to. */

import { useState } from "react";
import { children, type Graph, type Id, type ViewModule } from "@mnd/core";
import { EMPTY, view, type Config } from "@mnd/views";
import { SceneView, type Gesture } from "@mnd/render";

/** Nothing picked. A constant, because a fresh `[]` every render would read as
 *  the host changing its mind on every render. */
const NONE: readonly Id[] = [];

export type ViewerProps = {
  graph: Graph;
  /** Which layer to draw. The root layer unless said otherwise. Driven: the
   *  viewer walks on its own, and follows this whenever the host changes it. */
  layer?: Id | null;
  /** Which blocks are lit. Driven the same way, so a host with a tree beside
   *  the drawing can light what the tree selected — **without moving the
   *  layer**, which is the whole point of the two being separate. */
  picked?: readonly Id[];
  /** Which module draws it. `block` is any planar projection. */
  module?: ViewModule;
  config?: Config;
  /** Told where the viewer is looking, whenever that changes. */
  onLook?: (layer: Id | null) => void;
  /** Told what is lit, whenever that changes. */
  onPick?: (ids: Id[]) => void;
  /** Told where a box points, when one that holds nothing is opened. Unset,
   *  the browser is sent there — the same thing `draw_svg`'s anchor does. A
   *  host with routing of its own passes this and the page never reloads. */
  onFollow?: (link: string, id: Id) => void;
};

export function Viewer({ graph, layer = null, picked = NONE, module = "block",
                        config, onLook, onPick, onFollow }: ViewerProps) {
  const [at, set_at] = driven<Id | null>(layer);
  const [lit, set_lit] = driven<readonly Id[]>(picked);

  const scene = view(module)?.project(graph, at, config) ?? EMPTY;

  const pick = (ids: Id[]) => {
    set_lit(ids);
    onPick?.(ids);
  };

  const look = (next: Id | null) => {
    set_at(next);
    onLook?.(next);
    pick([]);
  };

  /** Where a box points, if it points anywhere. The Scene carries it, so this
   *  reads the drawing rather than the graph — `draw_svg` reads the same. */
  const link_of = (id: string) => scene.boxes.find((b) => b.id === id)?.link;

  const follow = (link: string, id: Id) => {
    if (onFollow) onFollow(link, id);
    else if (typeof window !== "undefined") window.location.assign(link);
  };

  /** Double-click **opens** what is under it: a box that holds something opens
   *  as a layer, a box that holds nothing opens where it points, and empty
   *  space goes back out to the parent. A single click selects, which is a
   *  highlight and not a change.
   *
   *  Holding beats pointing, and deliberately: a linked container is a page
   *  with sections in it, and walking in is what the viewer is for. Its link
   *  is still reachable — from the leaf, or from a host reading `Box.link`. */
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

  return <SceneView scene={scene} picked={lit} onGesture={gesture} />;
}

/** A value the host may drive: the viewer's own until the host changes its
 *  mind, and the host's from then on. An embed that passes nothing still
 *  walks and still highlights, which is what makes it self-contained. */
function driven<T>(sent: T): [T, (next: T) => void] {
  const [held, set_held] = useState(sent);
  const [was, set_was] = useState(sent);
  if (sent !== was) { set_was(sent); set_held(sent); }
  return [held, set_held];
}
