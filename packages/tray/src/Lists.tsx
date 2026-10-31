/** **The tray's read-first parts**, one home for every tab: a titled section, a list opening on its
 *  band, rows on shared columns, an empty element's one sentence, and the left column — the card,
 *  then the chip where the chip is the list drawn. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { owner_of, shown_name, type Graph, type Id } from "@mnd/core";
import { ChipFace } from "@mnd/theme";
import { box_of, chip_for, chip_map, entry_look, kind_of, library_map, model_map, tint_attrs,
         wire_of, wire_tint } from "@mnd/views";
import { Faces } from "./Faces";

/** **A section names itself**, semibold in the body's ink, with an *i* whose tip says what it is.
 *  It carries no count: its lists do. */
export function Section({ name, about, children }: { name: string; about: string;
                                                     children: ReactNode }) {
  return (
    <section className="sec">
      <h5 className="sec-name">{name}<i className="sec-about" title={about}>i</i></h5>
      <div className="sec-body">{children}</div>
    </section>
  );
}

/** One row: its mark, its name, its kind quieter, and what it says at the right. */
export type Item = { id: string; mark?: ReactNode; name: ReactNode; kind?: ReactNode;
                     says?: ReactNode; quiet?: boolean };

/** **A list opens on its band**: its label flush left and its count at the right, over a rule;
 *  then its rows on the section's shared columns, a rule under each. Hovering a row lights what it
 *  names on the card. */
export function List({ label, items, onLight }: { label: string; items: readonly Item[];
                                                  onLight?: (id: string | null) => void }) {
  return (
    <div className="list">
      <div className="band"><span>{label}</span><span className="n">{items.length}</span></div>
      {items.map((it) => (
        <div key={it.id} className={it.quiet ? "item quiet" : "item"}
             onMouseEnter={() => onLight?.(it.id)} onMouseLeave={() => onLight?.(null)}>
          <span className="mark">{it.mark}</span>
          <span className="name">{it.name}</span>
          <span className="kind">{it.kind}</span>
          <span className="says">{it.says}</span>
        </div>
      ))}
    </div>
  );
}

/** What an element carrying nothing says, in one sentence. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="sec-empty">{children}</p>;
}

/** **The left column**, which stays put as tabs change: the card, then the chip where it is the
 *  list drawn. */
export function Lead({ graph, id, chip = false, lit }: { graph: Graph; id: Id; chip?: boolean;
                                                         lit?: string | null }) {
  return (
    <div className="lead">
      <span className="lead-cap">card</span>
      {graph.edges[id] ? <LineCard graph={graph} id={id} />
        : <Faces graph={graph} id={id} one {...(lit ? { lit } : {})} />}
      {chip ? <Chip graph={graph} id={id} /> : null}
    </div>
  );
}

/** **A chip off the map** (views `chip_for`): the element's own where it gathers anything, else
 *  its room's with it lit; fitted to the column, never past its own size. */
export function Chip({ graph, id }: { graph: Graph; id: Id }) {
  /** Only the map it comes from is laid out. */
  const which = chip_map(graph, id);
  const scene = useMemo(() => (which === "library" ? library_map : model_map)(graph),
                        [graph, which]);
  const found = chip_for(graph, id, scene);
  const held = useRef<HTMLDivElement>(null);
  const [room, set_room] = useState(0);
  /** Measured again whenever a chip comes to be drawn, since none may have been at first. */
  useEffect(() => {
    const at = held.current;
    if (!at) return;
    const seen = new ResizeObserver(() => set_room(at.clientWidth));
    seen.observe(at);
    return () => seen.disconnect();
  }, [!!found]);
  if (!found) return <p className="faint pic-none">the map draws no chip for it</p>;
  const { w, h } = box_of(found.chip);
  const scale = room ? Math.min(1, room / w) : 1;
  const own = found.chip.id === id;
  return (
    <div className="lead-chip" ref={held}>
      <span className="lead-cap">{own ? "its chip" : `its place · ${found.chip.data.label}`}</span>
      <div className="chip-room" style={{ height: h * scale }}>
        <div style={{ width: w, height: h, transform: `scale(${scale})`,
                      transformOrigin: "top left" }}>
          <ChipFace data={{ ...found.chip.data,
                            ...(found.chip.data.look ? { tint: tint_attrs(found.chip.data.look) } : {}) }}
                    w={w} h={h} level={3} lit={found.lit} />
        </div>
      </div>
    </div>
  );
}

/** **A line's card**: its two ends joined by its relation's swatch, its type under it. */
export function LineCard({ graph, id }: { graph: Graph; id: Id }) {
  const e = graph.edges[id];
  if (!e) return null;
  const end = (at: Id) => shown_name(graph, owner_of(graph, at));
  return (
    <div className="line-card">
      <span>{end(e.from)}</span>
      <span className="swatch long" {...wire_tint(wire_of(graph, id))} />
      <span>{end(e.to)}</span>
      <span className="line-kind">{kind_of(graph, id)}</span>
    </div>
  );
}

/** A component's name in its definition's colour: a library entry's look, read down its chain. */
export function Painted({ graph, entry, word, chip = false }: { graph: Graph; entry: Id | undefined;
                                                         word: string; chip?: boolean }) {
  const tint = tint_attrs(entry ? entry_look(graph, entry) : undefined);
  return <span className={chip ? "painted chip-like" : "painted"} {...tint}>{word}</span>;
}
