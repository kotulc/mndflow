/** **Playing a presentation** (docs/presentations.md): where the reader is (core `Play`), the
 *  overview each stop opens, what it rings, dims and lights, the steps drawn one a `pace`, the
 *  keys, a dive and its resume, and *into* and out. The host reads its answers; core says what a
 *  presentation is. */

import { useEffect, useState } from "react";
import { path, pace_of, play_at, play_into, play_next, play_out, play_prev, play_start,
         presentations_of, stop_of, used_model, type Graph, type Hop, type Id,
         type Play } from "@mnd/core";
import { hop_trace, ACROSS, type Scene } from "@mnd/views";
import type { Showing } from "@mnd/stage";

/** Where the reader's own pace is kept: their setting, over the file's, while it plays. */
const PACE_KEY = "mnd.pace";

/** How long a stop holds once all its steps are shown, at least, in seconds. */
const HOLD = 2.5;

/** The pace the reader set, if any, read safely. */
function remembered(): number | undefined {
  try {
    const said = localStorage.getItem(PACE_KEY);
    return said === null ? undefined : Number(said);
  } catch { return undefined; }
}

/** What playing hands the host: the state, the overview's open boxes, what the stage shows, the
 *  blocks the camera fits, the layer to be on, and the controls. */
export type Presenting = ReturnType<typeof usePresent>;

/** **A presentation played** on the layer `layer`: its state, kept here, and the moves on it. */
export function usePresent(graph: Graph, layer: Id | null) {
  const [play, set_play] = useState<Play | null>(null);
  /** The layers the presentations entered are drawn on, outermost first: a use for each *into*. */
  const [where, set_where] = useState<Id[]>([]);
  const [pace, set_pace_state] = useState<number | undefined>(remembered);
  /** **Paused** (2026-11-21): nothing moves on its own; next and previous still step. */
  const [paused, set_paused] = useState(false);
  const now = play ? stop_of(graph, play) : null;
  const stop = now?.stop ?? null;
  const steps = stop?.steps ?? [];
  const home = where[where.length - 1] ?? null;
  /** **The layer a stop is on**: the diagram it shows, else the overview it plays on. */
  const on = stop?.show ?? home;

  /** **Played through, as a video is** (the user, 2026-11-21): steps build at the pace; once a
   *  stop's are all shown it holds, then goes on — into the stop's sub presentation where it
   *  leads into one, else the next stop — and at the very end it pauses. Paused, or at `0`
   *  pace, nothing moves on its own. */
  const seconds = play ? pace_of(graph, play, pace) : 0;
  const last = !!play && !!now && play.stop === now.presentation.stops.length - 1
    && !play.stack.length;
  useEffect(() => {
    if (!play || !stop || play.dive || paused || seconds <= 0) return;
    if (play.shown < steps.length) {
      const wait = setTimeout(() => set_play((p) => (p ? { ...p, shown: p.shown + 1 } : p)),
                              (play.shown ? seconds : 0.6 + 1.1) * 1000);
      return () => clearTimeout(wait);
    }
    /** Come back out of its sub presentation (every step shown past its count), a stop goes
     *  on rather than in again. */
    const back = play.shown > steps.length;
    if (last && (!stop.into || back)) { set_paused(true); return; }
    const wait = setTimeout(() => (stop.into && !back ? into() : next()),
                            Math.max(HOLD, seconds) * 1000);
    return () => clearTimeout(wait);
  }, [play, stop, steps.length, seconds, paused, last]);

  /** A model's presentation started on the layer drawing its overview, at its first stop or
   *  the one asked for. */
  const start = (at: number, from = 0) => {
    const model = layer ? used_model(graph, layer) : null;
    if (!model || !layer || !presentations_of(graph, model)[at]) return;
    set_where([layer]);
    set_paused(false);
    set_play(play_at(play_start(model, at), from));
  };
  const stop_playing = () => { set_play(null); set_where([]); set_paused(false); };
  /** Play and pause, one control: played again from its end, it starts over. */
  const toggle = () => {
    if (paused && last && play && play.shown >= steps.length) {
      set_play((p) => (p ? play_at(p, 0) : p));
    }
    set_paused((x) => !x);
  };
  const next = () => set_play((p) => {
    if (!p) return p;
    const n = play_next(graph, p);
    if (n.stack.length < p.stack.length) set_where((w) => w.slice(0, n.stack.length + 1));
    return n;
  });
  const prev = () => set_play((p) => (p ? play_prev(p) : p));
  const go = (at: number) => set_play((p) => (p ? play_at(p, at) : p));
  const into = () => {
    if (!play || !stop?.into) return;
    const n = play_into(graph, play);
    if (n === play) return;
    set_where((w) => [...w, stop.at]);
    set_play(n);
  };
  const out = () => {
    if (!play?.stack.length) return;
    set_where((w) => w.slice(0, -1));
    set_play(play_out(play));
  };
  /** **A dive**: a part clicked while playing opens, the camera fits it; resume goes back. */
  const dive = (id: Id) => set_play((p) => (p ? { ...p, dive: id } : p));
  const resume = () => set_play((p) => (p ? { ...p, dive: null } : p));
  const set_pace = (s: number) => {
    set_pace_state(s);
    try { localStorage.setItem(PACE_KEY, String(s)); } catch { /* kept for this sitting */ }
  };

  /** **Keys while playing**: next on the right arrow or space, the previous stop on the left,
   *  Escape resumes a dive or stops. Taken before the canvas's own. */
  useEffect(() => {
    if (!play) return;
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(el?.tagName ?? "")) return;
      const done = () => { e.preventDefault(); e.stopPropagation(); };
      if (e.key === " ") { done(); toggle(); }
      else if (e.key === "ArrowRight") { done(); next(); }
      else if (e.key === "ArrowLeft") { done(); prev(); }
      else if (e.key === "Escape") { done(); if (play.dive) resume(); else stop_playing(); }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [play, paused, last, steps.length]);

  /** The overview's boxes open at this stop, where it says (unsaid, the host's), and a dive. */
  const open = stop && layer === home ? stop.open ?? null : null;
  const diving = stop && layer === home ? play?.dive ?? null : null;

  return { play, stop, presentation: now?.presentation ?? null, open, diving, on, home,
           pace: seconds, paused, start, stop_playing, toggle, next, prev, go, into, out,
           dive, resume, set_pace };
}

/** **What a stop shows** on the drawing it is on: the block ringed, what stays clear, its steps'
 *  legs on a map and the lines they light elsewhere. Null off its drawing. */
export function showing_of(graph: Graph, layer: Id | null, scene: Scene,
                           p: Presenting): Showing | null {
  const { play, stop, on, home } = p;
  if (!play || !stop || layer !== on) return null;
  const drawn = new Set(scene.nodes.map((n) => n.id));
  const lift = (id: Id) => drawn_as(graph, drawn, id);
  if (play.dive) {
    const at = lift(play.dive);
    return { ring: at ? [at] : [], keep: [], lines: [], steps: null };
  }
  const shown = (stop.steps ?? []).slice(0, play.shown);
  const marks = shown.flatMap((s) => (s.mark ? [lift(s.mark)] : []))
    .filter((x): x is Id => !!x);
  const lines = shown.flatMap((s) => (s.relation ? [s.relation] : []));
  /** A line drawn crossing the frame to what is across lights as the relation it draws. */
  const drawn_lines = lines.flatMap((id) => [id, `${ACROSS}${id}`]);
  const hops: Hop[] = lines.flatMap((id) => {
    const e = graph.edges[id];
    return e ? [{ from: e.from, to: e.to, names: e.name ? [e.name] : [] }] : [];
  });
  const legs = scene.areas ? hops.flatMap((h) => hop_trace(graph, scene, [h])?.legs ?? []) : [];
  const at = lift(stop.at);
  /** **What stays clear**: the block the stop is about, what is round and inside it, and its
   *  steps' ends; nothing dims where it is about the whole system. */
  const whole = !at || at === layer || at === home;
  /** Inside the stop's block as drawn: under its area on a map, a use's parts read through
   *  included; else under it in the graph. */
  const up = new Map((scene.areas ?? []).map((a) => [a.id, a.parent]));
  const inside = (id: Id) => {
    for (let a: Id | null | undefined = id; a; a = up.get(a)) if (a === at) return true;
    return path(graph, id).some((b) => b.id === stop.at);
  };
  const ends = hops.flatMap((h) => [lift(h.from), lift(h.to)]).filter((x): x is Id => !!x);
  const keep = whole ? [] : [...new Set([at, ...marks, ...ends,
    ...scene.nodes.filter((n) => inside(n.id) || n.data.marks.includes("zone"))
      .map((n) => n.id)])];
  const last = shown[shown.length - 1];
  /** **The current block** (the user, 2026-11-21): the card the step just lit lands on is ringed
   *  with it, so where the presentation is reads at a glance. */
  const landed = last?.relation ? lift(graph.edges[last.relation]?.to ?? "") : undefined;
  /** **The step now**: the last shown's line, drawn over the rest on a diagram. */
  const now = last?.relation ? [last.relation, `${ACROSS}${last.relation}`] : [];
  return { ring: [...new Set([...(at && !whole ? [at] : []), ...marks,
                              ...(landed ? [landed] : [])])], keep, lines: drawn_lines, now,
           steps: legs.length ? { blocks: [], lines: [], legs,
                                  ...(last?.relation ? {} : { still: true }) } : null };
}

/** **A block as a drawing draws it**: itself, else drawn across the frame (`@across:`), else
 *  the nearest block holding it that is either. */
export function drawn_as(graph: Graph, drawn: { has: (id: Id) => boolean }, id: Id): Id | undefined {
  for (const b of [...path(graph, id)].reverse()) {
    if (drawn.has(b.id)) return b.id;
    if (drawn.has(`${ACROSS}${b.id}`)) return `${ACROSS}${b.id}`;
  }
  return undefined;
}

/** **What the camera follows** within a stop (the user, 2026-11-21): the step just shown — the
 *  card its line lands on, then the one it leaves, or the block it marks. Null before the first
 *  step, in a dive, and off the stop's drawing. */
export function step_of(graph: Graph, layer: Id | null, p: Presenting): Id[] | null {
  const { play, stop, on } = p;
  if (!play || !stop || layer !== on || play.dive || !play.shown) return null;
  const last = (stop.steps ?? [])[Math.min(play.shown, stop.steps?.length ?? 0) - 1];
  const e = last?.relation ? graph.edges[last.relation] : undefined;
  return e ? [e.to, e.from] : last?.mark ? [last.mark] : null;
}

/** **What the tray is about while playing** (the user, 2026-11-22): the part dived into, else
 *  the block the step just shown lands on or marks, else the diagram the stop shows, else its
 *  block. */
export function current_of(graph: Graph, p: Presenting): Id | null {
  const { play, stop } = p;
  if (!play || !stop) return null;
  if (play.dive) return play.dive;
  const last = (stop.steps ?? [])[Math.min(play.shown, stop.steps?.length ?? 0) - 1];
  const e = last?.relation ? graph.edges[last.relation] : undefined;
  return e?.to ?? last?.mark ?? stop.show ?? stop.at;
}

/** **What the camera fits** at a stop: a dive's part; else the stop's `fit`, else its block and
 *  every block its steps touch. Null off its overview, and where it shows a diagram. */
export function fit_of(graph: Graph, layer: Id | null, p: Presenting): Id[] | null {
  const { play, stop, on } = p;
  if (!play || !stop || layer !== on) return null;
  if (play.dive) return [play.dive];
  /** A shown diagram is fitted whole. */
  if (stop.show) return [];
  if (stop.fit) return stop.fit;
  const ends = (stop.steps ?? []).flatMap((s) => {
    const e = s.relation ? graph.edges[s.relation] : undefined;
    return e ? [e.from, e.to] : s.mark ? [s.mark] : [];
  });
  return [stop.at, ...ends];
}
