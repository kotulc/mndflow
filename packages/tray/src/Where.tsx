/** **Where it lives**, the overview's picture (views `mini_map`): the map itself at the card's
 *  width, in the room under the card — never more, so it is read without scrolling — the window
 *  on what is lit where the map is taller; its boxes and chips where the map lays them, the
 *  element lit, unnamed since its card is just above: one quiet outline on every mini map, never
 *  a path. A scope's card is its own region of the map. And the element's path, in words. */

import { useEffect, useMemo, useRef, useState } from "react";
import { line_layer, owner_of, path, shown_name, type Graph, type Id } from "@mnd/core";
import { chip_map, library_map, mini_map, model_map, type Mini, type Scene,
         type WhereBox } from "@mnd/views";

/** Each map laid once per graph, however many picks read it. */
const LAID = new WeakMap<Graph, Partial<Record<"library" | "models", Scene>>>();
function laid_map(graph: Graph, which: "library" | "models"): Scene {
  const maps = LAID.get(graph) ?? {};
  LAID.set(graph, maps);
  return (maps[which] ??= (which === "library" ? library_map : model_map)(graph));
}

/** The picture's size, in whole pixels. */
function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const seen = new ResizeObserver(([e]) => {
      const r = e!.contentRect;
      const [w, h] = [Math.round(r.width), Math.round(r.height)];
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);
  return [ref, size] as const;
}

export function Where({ graph, id }: { graph: Graph; id: Id }) {
  /** **The map drawing it**: the element's own map, or the other where its own draws none of
   *  it. */
  const lay = (size: Size): Mini => {
    const first = chip_map(graph, id);
    const own = mini_map(graph, id, laid_map(graph, first), size);
    if (id === graph.root || own.boxes.some((b) => b.lit)) return own;
    const other = mini_map(graph, id, laid_map(graph, first === "library" ? "models" : "library"),
                           size);
    return other.boxes.some((b) => b.lit) ? other : own;
  };
  return <Picture graph={graph} at={id} lay={lay} room />;
}

/** **A scope's card** — the workspace's or a package's: its own region of the map, lit nowhere;
 *  in the `room` under it where nothing sits there, else whole. */
export function Scope({ graph, id, room = false }: { graph: Graph; id: Id; room?: boolean }) {
  const which = chip_map(graph, id);
  /** The workspace's is the whole map. */
  const from = id === graph.root ? undefined : id;
  const lay = (size: Size) => mini_map(graph, null, laid_map(graph, which), size, from);
  return <Picture graph={graph} at={`${which}:${id}`} lay={lay} room={room} />;
}

type Size = { w: number; h: number };

/** **A name shows whole or not at all**: where its line and every letter fit the box, at the
 *  picture's 9 px mono face (about 0.6 em a letter), and no other box but those holding it
 *  covers that line. */
const LINE = 12;
function named(boxes: readonly WhereBox[]): Set<Id> {
  const out = new Set<Id>();
  for (const b of boxes) {
    const w = b.label.length * 9 * 0.62 + 6;
    if (b.h < LINE || b.w < w) continue;
    const holds = (o: WhereBox) => o.x <= b.x && o.y <= b.y && o.x + o.w >= b.x + b.w
      && o.y + o.h >= b.y + b.h;
    const covers = (o: WhereBox) => o.x < b.x + w && o.x + o.w > b.x && o.y < b.y + LINE
      && o.y + o.h > b.y;
    if (!boxes.some((o) => o !== b && !holds(o) && covers(o))) out.add(b.id);
  }
  return out;
}

/** **The picture**: the map scaled, the element lit — named nowhere, its card says it. Nothing
 *  where the map draws nothing of it. Laid again only as the graph, `at` or its size changes. */
function Picture({ graph, at, lay, room = false }: {
  graph: Graph; at: string; lay: (size: Size) => Mini; room?: boolean;
}) {
  const [ref, measured] = useSize();
  const size = room ? measured : { w: measured.w, h: Infinity };
  /** Whether it draws anything, and its shape, asked once at a size that always lays. */
  const probe = useMemo(() => lay(PROBE), [graph, at]);
  const mini = useMemo(() => lay(size), [graph, at, size.w, size.h]);
  const names = useMemo(() => named(mini.boxes), [mini]);
  if (!probe.boxes.length) return null;
  return (
    <div className={room ? "where-pic room" : "where-pic"} ref={ref}>
      <div className="where-map" aria-label="where it lives" style={{ height: mini.h }}>
        {mini.boxes.map((b) => (
          <div key={b.id} title={b.label} style={place(b)}
               className={["where-box", b.chip ? "chip" : "holds", b.on ? "on" : "",
                           b.lit ? "lit" : ""].filter(Boolean).join(" ")}>
            {!b.lit && names.has(b.id) ? <span className="where-name">{b.label}</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A size every map lays at, to ask whether a picture draws anything. */
const PROBE = { w: 320, h: 320 };

/** A box's place in the picture. */
function place(b: { x: number; y: number; w: number; h: number }) {
  return { left: b.x, top: b.y, width: b.w, height: b.h };
}

/** **Its path**, heading the answers: where it is filed, its own name last; a line's, the layer
 *  it is drawn in, then its ends. */
export function Trail({ graph, id }: { graph: Graph; id: Id }) {
  const e = graph.edges[id];
  const at = e ? line_layer(graph, id) : id;
  const steps = at ? path(graph, at).map((b) => shown_name(graph, b.id)) : [];
  const end = (x: Id) => shown_name(graph, owner_of(graph, x));
  const last = e ? `${end(e.from)} → ${end(e.to)}` : steps.pop();
  return (
    <div className="trail">
      {steps.map((s, i) => <span key={i}>{s}</span>)}
      {last ? <b>{last}</b> : null}
    </div>
  );
}
