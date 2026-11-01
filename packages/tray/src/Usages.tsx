/** **The usages tab, read first**: a definition's card on the left, its places under it as filter
 *  rows — in models, then in the library (a definition holding uses is a place), then its
 *  subtypes; on the right its uses by place, a list each, then its subtypes, or the one chosen.
 *  A record definition's uses are its records, read as a table under each place that holds
 *  them. Hovering a row lights it on the canvas; *view* goes to where it is drawn. */

import { attributes_of, holds_records, kind_word, model_of, shown_name, subtypes, type Graph,
         type Id } from "@mnd/core";
import { box_label, kind_of, usage_groups } from "@mnd/views";
import { ALL, Empty, Filters, Lead, List, Section, type Filter, type Item } from "./Lists";

/** The filter row standing for its subtypes. */
const SUBTYPES = "@subtypes";

export type UsagesProps = {
  graph: Graph;
  /** The definition the tray is about. */
  id: Id;
  /** Light a use on the canvas while its row is hovered. */
  onHover?: (id: Id | null) => void;
  /** Go to where a use is drawn: open its layer and pick it there. */
  onView?: (id: Id) => void;
  /** The filter chosen, kept by the tray per tab while the element stays. */
  on: string;
  onPick: (key: string) => void;
};

export function Usages({ graph, id, onHover, onView, on, onPick }: UsagesProps) {
  const all = usage_groups(graph, id);
  const kinds = subtypes(graph, id);
  const groups = on === SUBTYPES ? [] : all.filter((g) => on === ALL || g.place === on);
  const row = (g: (typeof all)[number]): Filter => ({
    key: g.place, name: shown_name(graph, g.place), count: g.uses.length,
    sub: box_label(graph, g.place).split(" · ")[1] ?? "", lights: [g.place] });
  const uses = all.reduce((n, g) => n + g.uses.length, 0);
  const fields = attributes_of(graph, id).map((a) => a.name);
  /** **A record definition**: every use held where records are kept, answering its attributes. */
  const records = fields.length > 0 && all.length > 0 && all.every((g) => g.uses.every((u) =>
    holds_records(graph, graph.blocks[u.id]?.parent ?? "")));
  const view = (use: Id) => (onView ? (
    <button className="chip" onClick={() => onView(use)}>view</button>
  ) : null);
  return (
    <div className="reads">
      <Lead graph={graph} id={id}>
        {all.length || kinds.length ? (
          <Filters on={on} onPick={onPick} onLight={(at) => onHover?.(at?.[0] ?? null)}
                   groups={[{ rows: [{ key: ALL, name: "all", count: uses }] },
                            { label: "in models",
                              rows: all.filter((g) => model_of(graph, g.place)).map(row) },
                            { label: "in the library",
                              rows: all.filter((g) => !model_of(graph, g.place)).map(row) },
                            { label: "subtypes", rows: kinds.length ? [
                              { key: SUBTYPES, name: "subtypes", count: kinds.length }] : [] }]} />
        ) : null}
      </Lead>
      <div className="lists">
        {records ? (
          <Section name="records" about="Its uses are its records: what each answers, by place">
            {groups.map((g) => (
              <Records key={g.place} graph={graph} label={box_label(graph, g.place)}
                       fields={fields} uses={g.uses.map((u) => u.id)} onHover={onHover} />
            ))}
          </Section>
        ) : (
          <Section name="uses" about="Where it is used, by the place that draws each use">
            {groups.length ? groups.map((g) => (
              <List key={g.place} label={box_label(graph, g.place)}
                    onLight={(at) => onHover?.(at)}
                    items={g.uses.map((u): Item => ({
                      id: u.id, mark: <span className="dash">▪</span>,
                      name: shown_name(graph, u.id), kind: kind_of(graph, u.id),
                      says: view(u.id) }))} />
            )) : on === SUBTYPES ? null
              : <Empty>Nothing uses it yet. Drop it onto a diagram to use it there.</Empty>}
          </Section>
        )}
        {kinds.length && (on === ALL || on === SUBTYPES) ? (
          <Section name="subtypes" about="The definitions that extend it">
            <List label={`extend ${shown_name(graph, id)}`}
                  items={kinds.map((k) => ({ id: k.id, mark: <span className="dash">▪</span>,
                                             name: k.name ?? shown_name(graph, k.id),
                                             kind: kind_word(graph, k).toLowerCase(),
                                             says: `${usage_groups(graph, k.id)
                                               .reduce((n, g) => n + g.uses.length, 0)} uses` }))} />
          </Section>
        ) : null}
      </div>
    </div>
  );
}

/** **One place's records**, a table: a row per record, a column per attribute, opening on the
 *  place's band. */
function Records({ graph, label, fields, uses, onHover }: {
  graph: Graph; label: string; fields: readonly string[]; uses: readonly Id[];
  onHover?: (id: Id | null) => void;
}) {
  const value = (use: Id, name: string) =>
    graph.blocks[use]?.values?.find((v) => v.name === name)?.value ?? "";
  return (
    <div className="records">
      <div className="band"><span>{label}</span><span className="n">{uses.length}</span></div>
      <table>
        <thead><tr>{fields.map((f) => <th key={f}>{f}</th>)}</tr></thead>
        <tbody>
          {uses.map((u) => (
            <tr key={u} onMouseEnter={() => onHover?.(u)} onMouseLeave={() => onHover?.(null)}>
              {fields.map((f) => <td key={f}>{value(u, f)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
