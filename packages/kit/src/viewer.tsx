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

export type ViewerProps = {
  graph: Graph;
  /** Where to start looking. The root layer unless said otherwise, and the
   *  starting point rather than a controlled value — walking is the viewer's. */
  layer?: Id | null;
  /** Which module draws it. `block` is any planar projection. */
  module?: ViewModule;
  config?: Config;
  /** Told where the viewer is looking, whenever that changes. */
  onLook?: (layer: Id | null) => void;
  /** Told where a box points, when one that holds nothing is opened. Unset,
   *  the browser is sent there — the same thing `draw_svg`'s anchor does. A
   *  host with routing of its own passes this and the page never reloads. */
  onFollow?: (link: string, id: Id) => void;
};

export function Viewer({ graph, layer = null, module = "block", config,
                        onLook, onFollow }: ViewerProps) {
  const [at, set_at] = useState<Id | null>(layer);
  const [picked, set_picked] = useState<string[]>([]);

  const scene = view(module)?.project(graph, at, config) ?? EMPTY;

  const look = (next: Id | null) => {
    set_at(next);
    set_picked([]);
    onLook?.(next);
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
    set_picked(g.on ? [g.on] : []);
  };

  return <SceneView scene={scene} picked={picked} onGesture={gesture} />;
}
