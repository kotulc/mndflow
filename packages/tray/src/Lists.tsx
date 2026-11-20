/** **The tray's read-first parts**, one home for every tab: a titled section, a list opening on its
 *  band, rows on shared columns, an empty element's one sentence, the tab's filter rows, and the
 *  left column — the card, then what the tab puts under it. */

import type { KeyboardEvent, ReactNode } from "react";
import { owner_of, shown_name, type Graph, type Id } from "@mnd/core";
import { entry_look, kind_of, tint_attrs, wire_of, wire_tint } from "@mnd/views";
import { Faces } from "./Faces";
import { Scope } from "./Where";

/** **A section names itself**, semibold in the body's ink, with an *i* whose tip says what it is.
 *  It carries no count: its lists do. `parts`: its body holds parts set apart, not one list. */
export function Section({ name, about, parts = false, children }: {
  name: string; about: string; parts?: boolean; children: ReactNode }) {
  return (
    <section className={parts ? "sec parts" : "sec"}>
      <h5 className="sec-name">{name}<i className="sec-about" title={about}>i</i></h5>
      <div className="sec-body">{children}</div>
    </section>
  );
}

/** One row: its mark, its name, its kind quieter, and what it says at the right; where it is
 *  picked, `onPick`, and whether it is the one picked, `on`, as a filter row is. */
export type Item = { id: string; mark?: ReactNode; name: ReactNode; kind?: ReactNode;
                     says?: ReactNode; quiet?: boolean; on?: boolean; onPick?: () => void };

/** **A list opens on its band**: its label flush left and its count at the right, over a rule;
 *  then its rows on the section's shared columns, a rule under each. Hovering a row lights what it
 *  names on the card. */
export function List({ label, items, onLight }: { label: string; items: readonly Item[];
                                                  onLight?: (id: string | null) => void }) {
  return (
    <div className="list">
      <div className="band"><span>{label}</span><span className="n">{items.length}</span></div>
      {items.map((it) => (
        <div key={it.id}
             className={["item", it.quiet ? "quiet" : "", it.on ? "on" : "",
                         it.onPick ? "picks" : ""].filter(Boolean).join(" ")}
             {...(it.onPick ? { role: "button", tabIndex: 0, onClick: it.onPick,
                                onKeyDown: (e: KeyboardEvent) => {
                                  if (e.key === "Enter" || e.key === " ") it.onPick!();
                                } } : {})}
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

/** One filter row: its mark, its name, a quiet word after it, and its count at the right; what
 *  it names, lit while it is hovered. */
export type Filter = { key: string; name: ReactNode; mark?: ReactNode; sub?: ReactNode;
                       count?: number; edge?: { "data-family"?: string; style?: object };
                       lights?: readonly string[] };

/** The filter rows *all* stands for. */
export const ALL = "all";

/** **A tab's filters, under the card**: rows as the explorer draws them, local to the tab, in
 *  groups under a quiet label. **Single-select**; hovering a row lights what it names. */
export function Filters({ groups, on, onPick, onLight }: {
  groups: readonly { label?: string; rows: readonly Filter[] }[]; on: string;
  onPick: (key: string) => void; onLight?: (ids: readonly string[] | null) => void;
}) {
  return (
    <div className="filters">
      {groups.filter((g) => g.rows.length).map((g, i) => (
        <div key={g.label ?? i} className="fgroup">
          {g.label ? <span className="fgroup-label">{g.label}</span> : null}
          {g.rows.map((r) => (
            <button key={r.key} type="button" aria-pressed={r.key === on}
                    className={["frow", r.key === on ? "on" : "", r.edge ? "edged" : ""]
                      .filter(Boolean).join(" ")}
                    {...(r.edge ?? {})}
                    onClick={() => onPick(r.key)}
                    onMouseEnter={() => onLight?.(r.lights ?? null)}
                    onMouseLeave={() => onLight?.(null)}>
              <span className="fmark">{r.mark}</span>
              <span className="fname">{r.name}</span>
              {r.sub ? <span className="fsub">{r.sub}</span> : null}
              <span className="fcount">{r.count}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/** **The left column**, which stays put as tabs change: the card, what a list beside it names
 *  lit on it; then what the tab puts under it — its filters, the overview's map. */
export function Lead({ graph, id, lit, children }: {
  graph: Graph; id: Id; lit?: readonly string[] | null; children?: ReactNode;
}) {
  return (
    <div className="lead">
      <Card graph={graph} id={id} {...(lit ? { lit } : {})} />
      {children}
    </div>
  );
}

/** **Its card**, one for every element: a line's ends; a block's face; the workspace's or a
 *  package's, its own map (`Scope`). */
export function Card({ graph, id, lit }: { graph: Graph; id: Id; lit?: readonly string[] }) {
  if (graph.edges[id]) return <LineCard graph={graph} id={id} />;
  const b = graph.blocks[id];
  if (!b) return null;
  return b.parent ? <Faces graph={graph} id={id} one {...(lit ? { lit } : {})} />
    : <Scope graph={graph} id={id} />;
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
