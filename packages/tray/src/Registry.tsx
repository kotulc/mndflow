/** A registry's tab, read two ways. **Matrix**: a grid, the blocks using any entry down the side
 *  beside the folder holding them — rolled up into folders past a reasonable count — the entries
 *  across, each cell a square as warm as its count. **List**: one row an entry — what it
 *  means, how many times it is used, and where — where a registry holds only a few entries, the tab
 *  opens on it. A row lights and offers *view*; an entry's head makes that entry the context. */

import { useState, type CSSProperties } from "react";
import { library_of, type Graph, type Id, type Registry as Of } from "@mnd/core";
import { entries_of, look_of, matrix_of, tint_attrs, type Matrix } from "@mnd/views";
import { ChipBar, lit_row, Table, type Column } from "./Table";

const COLUMNS: readonly Column[] = [
  { key: "name", label: "name" },
  { key: "description", label: "description" },
  { key: "uses", label: "uses" },
  { key: "by", label: "used by" },
];

/** The steps the key draws, as shares of the warmest cell. */
const STEPS = [0.25, 0.5, 0.75, 1];

export type RegistryProps = {
  graph: Graph;
  registry: Of;
  lit: Id | null;
  onLit: (id: Id) => void;
  /** Hovering a block's row lights it on the stage. */
  onHover?: (id: Id | null) => void;
  /** Make an entry the context, which is where it is edited. */
  onOpen: (id: Id) => void;
  /** Go to where a block lives. */
  onView?: (id: Id) => void;
};

/** How many characters an entry's head shows before it is cut short. */
const CAP = 10;

/** Below this many entries the matrix is mostly head, so the tab opens on the list. */
const FEW = 3;

export function Registry(props: RegistryProps) {
  const { graph, registry } = props;
  const [shown, set_shown] = useState<"matrix" | "list">(() =>
    (library_of(graph, registry.pkg)[registry.kind]?.length ?? 0) < FEW ? "list" : "matrix");
  const bar = { key: "shown", on: shown, onPick: (k: string) => set_shown(k as typeof shown),
                of: [{ key: "matrix", word: "matrix" }, { key: "list", word: "list" }] };
  return shown === "matrix" ? <Heat {...props} bar={bar} /> : <List {...props} bar={bar} />;
}

type Bar = Parameters<typeof ChipBar>[0]["chips"][number];

/** The matrix: one grid row a block, its folder in the first column spanning the blocks it holds;
 *  one column an entry, named flat in one head line, every column as wide as the longest name up
 *  to a cap, so the squares keep one pitch; each cell a square as warm as its count, centred in
 *  its column. **The readout** over the grid says in full what the pointer is on, and a crosshair
 *  marks its row and column. */
function Heat({ graph, registry, lit, onLit, onHover, onOpen, onView, bar }: RegistryProps & { bar: Bar }) {
  const m = matrix_of(graph, registry);
  const lines = m.groups.flatMap((g) => g.lines);
  const on = lit_row(lines, lit ? [lit] : []);
  const heat = (n: number) => ({ "--heat": m.max ? n / m.max : 0 }) as CSSProperties;
  const totals = m.entries.map((_, i) => lines.reduce((n, l) => n + l.counts[i]!, 0));
  /** Rolled up, the rows are folders, so there is no folder column. */
  const foldered = !m.rolled;
  const row_word = m.rolled ? "folder" : "block";
  /** What the pointer is on: a row, a column, or the cell where they cross. */
  const [at, set_at] = useState<{ r?: Id; c?: number } | null>(null);
  const read = readout(m, at, row_word);
  /** One width for every entry column: the longest name's, up to the cap the head cuts at. */
  const longest = Math.max(2, ...m.entries.map((e) => e.name.length));
  const pitch = { width: `calc(${Math.min(CAP, longest)}ch + 6px)`,
                  maxWidth: `calc(${CAP}ch + 6px)` };

  return (
    <>
      <ChipBar chips={[bar]} tools={m.max ? (
        <span className="heat-key" title={`how many times a ${row_word} uses an entry`}>
          uses
          {STEPS.map((s) => <i key={s} style={heat(s * m.max)} />)}
          {m.max}
        </span>
      ) : null} />
      {!m.entries.length ? <p className="empty">no {registry.kind} here yet</p>
        : !lines.length ? <p className="empty">nothing uses these {registry.kind} yet</p> : (
        <>
        <p className={at ? "heat-readout" : "heat-readout idle"}>{read}</p>
        <div className="heat-scroll">
          <table className={foldered ? "heat-table foldered" : "heat-table"}
                 onMouseLeave={() => set_at(null)}>
            <thead>
              {/* One head row: the rows' kinds over their columns, then the entries' kind
                  pointing across at their names. */}
              <tr>
                {foldered ? <th className="folder axis">folder</th> : null}
                <th className="name axis">
                  <span>{row_word}</span><span className="across">{registry.kind} →</span>
                </th>
                {m.entries.map((e, c) => (
                  <th key={e.id} className={at?.c === c ? "entry cross" : "entry"} style={pitch}
                      onMouseEnter={() => set_at({ c })} onClick={() => onOpen(e.id)}>
                    <span>{e.name}</span>
                  </th>
                ))}
                <th className="total axis">uses</th>
                <th className="acts" />
              </tr>
            </thead>
            {m.groups.map((g) => (
              <tbody key={g.id} onMouseLeave={() => onHover?.(null)}>
                {g.lines.map((l, i) => (
                  <tr key={l.id} className={[on.includes(l.id) ? "picked" : "",
                                             at?.r === l.id ? "cross" : ""].join(" ")}
                      onMouseEnter={() => { onHover?.(l.id); set_at({ r: l.id }); }}
                      onClick={() => onLit(l.id)}>
                    {foldered && !i ? (
                      <th className="folder" rowSpan={g.lines.length} title={g.name}>{g.name}</th>
                    ) : null}
                    <th className="name" title={l.name}>
                      <i className="swatch" {...paint(graph, l.id)} />{l.name}
                    </th>
                    {l.counts.map((n, c) => (
                      <td key={m.entries[c]!.id} className={at?.c === c ? "cell cross" : "cell"}
                          onMouseEnter={() => set_at({ r: l.id, c })}>
                        <span className={n ? "heat" : "heat none"} style={heat(n)}>
                          {n > 1 ? n : ""}
                        </span>
                      </td>
                    ))}
                    <td className="total">{l.uses}</td>
                    <td className="acts">
                      {onView && on.includes(l.id) ? (
                        <button className="chip" title="open the layer this is in"
                                onClick={(x) => { x.stopPropagation(); onView(l.id); }}>
                          view
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot>
              <tr>
                <th className="foot" colSpan={foldered ? 2 : 1}>uses</th>
                {totals.map((n, c) => <td key={m.entries[c]!.id} className="count">{n}</td>)}
                <td className="total">{totals.reduce((a, n) => a + n, 0)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        </>
      )}
    </>
  );
}

/** What the readout says about where the pointer is, in full. */
function readout(m: Matrix, at: { r?: Id; c?: number } | null, row_word: string): string {
  const lines = m.groups.flatMap((g) => g.lines);
  const line = lines.find((l) => l.id === at?.r);
  const entry = at?.c === undefined ? undefined : m.entries[at.c];
  const times = (n: number) => `${n} ${n === 1 ? "use" : "uses"}`;
  if (line && entry) return `${entry.name} × ${line.name}: ${times(line.counts[at!.c!]!)}`;
  if (entry) {
    const by = lines.filter((l) => l.counts[at!.c!]!).length;
    return `${entry.name}: ${times(entry.uses)} by ${by} ${row_word}${by === 1 ? "" : "s"}`
      + (entry.description ? ` — ${entry.description}` : "");
  }
  if (line) return `${line.name}: ${times(line.uses)}`;
  return "point at a square, a row or a column to read it";
}

/** The list: one row an entry, where it is used busiest first. */
function List({ graph, registry, lit, onLit, onOpen, bar }: RegistryProps & { bar: Bar }) {
  const entries = entries_of(graph, registry);
  const on = lit_row(entries, lit ? [lit] : []);
  return (
    <Table columns={COLUMNS} acts="6rem" picked={on} onPick={onLit} chips={[bar]}
           empty={`no ${registry.kind} here yet`}
           rows={entries.map((e) => {
             const by = e.by.map((u) => (u.uses > 1 ? `${u.name} ×${u.uses}` : u.name)).join(", ");
             return {
               id: e.id,
               titles: { description: e.description, by },
               cells: { name: e.name, description: e.description, uses: String(e.uses),
                        by: e.rolled ? `in ${e.by.length} folders: ${by}` : by || "—" },
               actions: on.includes(e.id) ? (
                 <button className="chip" title="make this the context"
                         onClick={(x) => { x.stopPropagation(); onOpen(e.id); }}>
                   view
                 </button>
               ) : null,
             };
           })} />
  );
}

/** A block's colour, as its card wears it, for its swatch. */
function paint(graph: Graph, id: Id) {
  return tint_attrs(graph.blocks[id] ? look_of(graph, id) : undefined);
}
