/** **Where it lives**, the overview's picture (views `where_map`): a compact tree of the major
 *  block holding the element — its boxes and chips outlined, the element's room opened to its own
 *  blocks, the element lit and named — filling the room under the card. A scope's card is its map as one compact tree. And
 *  the element's path, in words. */

import { useEffect, useMemo, useRef, useState } from "react";
import { line_layer, owner_of, path, shown_name, type Graph, type Id } from "@mnd/core";
import { chip_map, library_map, model_map, where_map, type Scene,
         type WhereBox } from "@mnd/views";

/** Each map laid once per graph, however many picks read it. */
const LAID = new WeakMap<Graph, Partial<Record<"library" | "models", Scene>>>();
function laid_map(graph: Graph, which: "library" | "models"): Scene {
  const maps = LAID.get(graph) ?? {};
  LAID.set(graph, maps);
  return (maps[which] ??= (which === "library" ? library_map : model_map)(graph));
}

/** The picture's size, in steps of `STEP` px so a small resize lays nothing again. */
const STEP = 8;
function useSize() {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const seen = new ResizeObserver(([e]) => {
      const r = e!.contentRect;
      const w = Math.floor(r.width / STEP) * STEP;
      const h = Math.floor(r.height / STEP) * STEP;
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);
  return [ref, size] as const;
}

export function Where({ graph, id }: { graph: Graph; id: Id }) {
  /** **The map drawing it nearest**: each map lights the element or the nearest block above it
   *  that it draws; the one lighting it closest wins, its own map on a tie. */
  const pick = (size: Size) => {
    const first = chip_map(graph, id);
    const laid = (which: "library" | "models") => where_map(graph, id, laid_map(graph, which), size);
    const e = graph.edges[id];
    const ups = path(graph, e ? owner_of(graph, e.from) ?? e.from : id).map((b) => b.id).reverse();
    const near = (w: WhereBox[]) => {
      const at = ups.findIndex((u) => w.some((b) => b.lit && b.id === u));
      return at < 0 ? Infinity : at;
    };
    const own = laid(first);
    if (id === graph.root || near(own) === 0) return own;
    const other = laid(first === "library" ? "models" : "library");
    return near(other) < near(own) ? other : own;
  };
  return <Picture graph={graph} at={id} lay={pick} />;
}

/** **A scope's card** — the workspace's or a package's: its own map as one compact tree, lit
 *  nowhere; filling its column (`fill`) where nothing sits under it. */
export function Scope({ graph, id, fill = false }: { graph: Graph; id: Id; fill?: boolean }) {
  const which = chip_map(graph, id);
  /** The workspace's is the whole map. */
  const from = id === graph.root ? undefined : id;
  const lay = (size: Size) => where_map(graph, null, laid_map(graph, which), size, from);
  return <Picture graph={graph} at={`${which}:${id}`} lay={lay} card={!fill} />;
}

type Size = { w: number; h: number };

/** **A name shows whole or not at all**: where its line and every letter fit the box, at `size`
 *  px of the tray's mono face (about 0.6 em a letter). */
const LINE = 12;
function fits(label: string, w: number, h: number, size = 9): boolean {
  return h >= LINE && w >= label.length * size * 0.62 + 6;
}

/** **The picture**: the compact tree, the element lit and named — inside its box where its name
 *  fits, else on a tag beside it, kept in the picture. Nothing where the map draws nothing of it.
 *  Laid again only as the graph, `at` or its size changes. */
function Picture({ graph, at, lay, card = false }: {
  graph: Graph; at: string; lay: (size: Size) => WhereBox[]; card?: boolean;
}) {
  const [ref, size] = useSize();
  /** Whether it draws anything, asked once at a size that always lays. */
  const any = useMemo(() => lay(PROBE).length > 0, [graph, at]);
  const boxes = useMemo(() => lay(size), [graph, at, size]);
  if (!any) return null;
  return (
    <div className={card ? "where-map card" : "where-map"} ref={ref} aria-label="where it lives">
      {boxes.map((b) => (
        <div key={b.id} title={b.label} style={place(b)}
             className={["where-box", b.holds ? "holds" : "", b.on ? "on" : "",
                         b.room ? "room" : "", b.lit ? "lit" : ""].filter(Boolean).join(" ")}>
          {!b.lit && fits(b.label, b.w, b.h) ? <span className="where-name">{b.label}</span> : null}
        </div>
      ))}
      {boxes.filter((b) => b.lit).map((b) => <Named key={`n:${b.id}`} b={b} size={size} />)}
    </div>
  );
}

/** A size every map lays at, to ask whether a picture draws anything. */
const PROBE = { w: 320, h: 320 };

/** A box's place in the picture. */
function place(b: WhereBox) {
  return { left: b.x, top: b.y, width: b.w, height: b.h };
}

/** **The element's name**: inside its box, at its own size or a smaller one, else a tag beside
 *  it — right, else left, else under or over — kept inside the picture. */
function Named({ b, size }: { b: WhereBox; size: Size }) {
  const F = { x: 0, y: 0, ...size };
  if (fits(b.label, b.w, b.h, 10.5)) return <span className="where-tag in" style={place(b)}>{b.label}</span>;
  if (fits(b.label, b.w, b.h, 9)) return <span className="where-tag in small" style={place(b)}>{b.label}</span>;
  const tw = b.label.length * 10.5 * 0.62 + 10, th = 16;
  let x = b.x + b.w + 4, y = b.y + b.h / 2 - th / 2;
  if (x + tw > F.x + F.w - 2) x = b.x - tw - 4;
  if (x < F.x + 2) {
    x = Math.min(Math.max(F.x + 2, b.x + b.w / 2 - tw / 2), F.x + F.w - tw - 2);
    y = b.y + b.h + 4 + th > F.y + F.h ? b.y - th - 4 : b.y + b.h + 4;
  }
  y = Math.min(Math.max(F.y + 2, y), F.y + F.h - th - 2);
  return <span className="where-tag out" style={{ left: x, top: y, width: tw, height: th }}>{b.label}</span>;
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
