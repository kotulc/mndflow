/** **Presentations, played** (docs/presentations.md): a model's ordered, narrated stops, and where
 *  a reader is in them — which presentation, stop and step, a part dived into, and the stack of
 *  presentations entered by *into*. Pure: the host keeps the state and the timer. */

import { base_of, def_at, is_model } from "./defs";
import { children, stands_for } from "./tree";
import type { AboutGroup, Graph, Id, Presentation, Stop } from "./types";

/** Where a reader is: the model and its presentation, the stop, how many of its steps are shown,
 *  a part dived into (null at the stop), and the presentations entered from, outermost first. */
export type Play = { model: Id; at: number; stop: number; shown: number; dive: Id | null;
                     stack: { model: Id; at: number; stop: number }[] };

/** About's groups when a model says none: its presentations, its entries, its library. */
export const ABOUT: readonly AboutGroup[] = [
  { name: "Presentations" }, { name: "Entries" }, { name: "Library" }];

/** How long a step waits for the next by default, in seconds; `0` waits for a click. */
export const PACE = 1.7;


/** The model a block is, or uses: itself where it is one, else its definition where that is. */
export function used_model(graph: Graph, id: Id): Id | null {
  if (is_model(graph, id)) return id;
  const at = stands_for(graph, id) ?? graph.blocks[id];
  const def = at && !at.def ? def_at(graph, at.type) : undefined;
  return def && is_model(graph, def.id) ? def.id : null;
}

/** A model's presentations, or a use's of its model. */
export function presentations_of(graph: Graph, id: Id): readonly Presentation[] {
  const model = used_model(graph, id);
  return (model && graph.blocks[model]?.presentations) || [];
}

/** A model's About groups: its own, else the defaults. */
export function about_groups(graph: Graph, model: Id): readonly AboutGroup[] {
  return graph.blocks[model]?.about ?? ABOUT;
}

/** **A model's entries**: its parts a reader starts from — tagged `entry`, or reached by a line
 *  from an actor — in list order. */
export function model_entries(graph: Graph, model: Id): Id[] {
  const parts = children(graph, model);
  const actors = new Set(parts.filter((b) => base_of(graph, b.id) === "actor").map((b) => b.id));
  const reached = new Set(Object.values(graph.edges).filter((e) => actors.has(e.from))
    .map((e) => e.to));
  const tagged = (id: Id) => (graph.blocks[id]?.tags ?? []).some((t) => t.endsWith(".entry"));
  return parts.filter((b) => !actors.has(b.id) && (reached.has(b.id) || tagged(b.id)))
    .map((b) => b.id);
}

/** **A model's library**: the definitions its parts use, once each, in the order first used. */
export function model_library(graph: Graph, model: Id): Id[] {
  const out: Id[] = [];
  const walk = (at: Id) => {
    for (const b of children(graph, at)) {
      const def = !b.def ? def_at(graph, b.type) : undefined;
      if (def && !out.includes(def.id) && def.parent !== null && !is_base_kind(def.id)) {
        out.push(def.id);
      }
      walk(b.id);
    }
  };
  walk(model);
  return out;
}

/** Whether a definition is one of `base`'s, which every model uses and About never lists. */
function is_base_kind(id: Id): boolean {
  return !id.includes(".");
}

/** The stop a reader is at, and the presentation it is of. */
export function stop_of(graph: Graph, play: Play): { presentation: Presentation; stop: Stop } | null {
  const presentation = presentations_of(graph, play.model)[play.at];
  const stop = presentation?.stops[play.stop];
  return presentation && stop ? { presentation, stop } : null;
}

/** A presentation started at its first stop. */
export function play_start(model: Id, at: number): Play {
  return { model, at, stop: 0, shown: 0, dive: null, stack: [] };
}

/** **Next**: the stop's next step at once; past its last, the next stop; past the last stop, out
 *  to the presentation it was entered from, at its next stop; at the very end, as it was. */
export function play_next(graph: Graph, play: Play): Play {
  const now = stop_of(graph, play);
  if (!now) return play;
  const steps = now.stop.steps?.length ?? 0;
  if (play.shown < steps) return { ...play, shown: play.shown + 1, dive: null };
  if (play.stop + 1 < now.presentation.stops.length) {
    return { ...play, stop: play.stop + 1, shown: 0, dive: null };
  }
  const back = play_out(play);
  return back === play ? play : play_next(graph, { ...back, shown: Infinity });
}

/** **Previous**: the stop before, from its start. */
export function play_prev(play: Play): Play {
  return play.stop > 0 ? { ...play, stop: play.stop - 1, shown: 0, dive: null } : play;
}

/** A stop gone to, from its start. */
export function play_at(play: Play, stop: number): Play {
  return { ...play, stop, shown: 0, dive: null };
}

/** **Into**: the presentation the stop leads into, of the model its block uses, from its start;
 *  as it was where the stop leads nowhere. */
export function play_into(graph: Graph, play: Play): Play {
  const now = stop_of(graph, play);
  const model = now?.stop.into ? used_model(graph, now.stop.at) : null;
  const at = model ? presentations_of(graph, model).findIndex((p) => p.name === now!.stop.into)
    : -1;
  if (!model || at < 0) return play;
  return { model, at, stop: 0, shown: 0, dive: null,
           stack: [...play.stack, { model: play.model, at: play.at, stop: play.stop }] };
}

/** **Out**: back to the stop it was entered from, every step shown. */
export function play_out(play: Play): Play {
  const up = play.stack[play.stack.length - 1];
  if (!up) return play;
  return { ...up, shown: Infinity, dive: null, stack: play.stack.slice(0, -1) };
}

/** How long a stop's steps wait, in seconds: the reader's setting while playing, else the
 *  stop's, else its presentation's, else the default. */
export function pace_of(graph: Graph, play: Play, reader?: number): number {
  const now = stop_of(graph, play);
  return reader ?? now?.stop.pace ?? now?.presentation.pace ?? PACE;
}
