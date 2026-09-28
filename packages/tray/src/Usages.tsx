/** The usages tab: the lines or the blocks, and what each is. */

import { useState } from "react";
import { BASE_RELATIONS, edge_base, may_retype, relation_base, relations, shipped,
         type Act, type Graph, type Id } from "@mnd/core";
import { Choice, lit_row, scope_chips, Table, type Column, type Scope } from "./Table";
import { block_usage_rows, usage_rows } from "./rows";

/** The base's option in *retype all*, whose own value is blank. */
const BLANK = "@base";

export type UsagesProps = {
  graph: Graph;
  /** Which usages: blocks or lines. */
  group: "block" | "relation";
  /** Where the listing reaches, held by the tray for every table. */
  scope: Scope;
  onScope: (to: Scope) => void;
  layer: Id | null;
  /** The definition the tray is about, which the third chip group narrows by. */
  about: Id | null;
  /** What the tray asks to light, which this table settles against its own listing. */
  lit: readonly Id[];
  onLit: (id: Id) => void;
  onHover?: (id: Id | null) => void;
  onAct: Act;
  /** Go to where a line lives: open its layer and pick it there. */
  onView?: (id: Id) => void;
  /** The layer a line is drawn in. */
  home: (id: Id) => Id | null;
};

export function Usages({ graph, group, scope, onScope, layer, about, lit, onLit, onHover, onAct,
                         onView, home }: UsagesProps) {
  const lines = group === "relation";
  /** The root layer reads the whole project until somebody says otherwise. */
  const [module, set_module] = useState("all");
  /** Narrowed to the definition in context until somebody widens it. The choice is kept as what
   *  it means rather than as one definition's id, so it survives a move to the next one. */
  const [by, set_by] = useState("own");

  const deep = scope === "workspace";
  const all = lines ? usage_rows(graph, layer, deep) : block_usage_rows(graph, layer, deep);
  /** The default is blank: an element naming nothing follows its kind's. */
  const offered = [{ value: "", word: "default" },
    ...(lines ? relations(graph) : Object.values(graph.defs).filter((d) => d.group === "block"))
      .filter((d) => !shipped(d) && d.default === undefined)
      .map((d) => ({ value: d.id, word: d.name }))];
  /** What one usage may be retyped to: its own kind's or module's definitions only. */
  const fits = (id: Id) => offered.filter((o) => !o.value
    || (lines ? relation_base(graph, o.value) === edge_base(graph, id)
              : may_retype(graph, id, o.value)));

  const held = about ? graph.defs[about] : undefined;
  const narrow = [
    { key: "any", word: "any", keep: (_r: (typeof all)[number]) => true },
    ...(held ? [{ key: "own", word: held.name,
                  keep: (r: (typeof all)[number]) => r.chain.includes(held.id) }] : []),
  ];
  /** With no definition in context there is nothing to narrow by, so `any` answers. */
  const keep = narrow.find((n) => n.key === by) ?? narrow[0]!;
  const modules = ["all", ...BASE_RELATIONS];
  const rows = all.filter((r) => (!lines || module === "all" || r.module === module)
                                 && keep.keep(r));

  const columns: readonly Column[] = [
    { key: "name", label: lines ? "line" : "block" },
    { key: "what", label: lines ? "joins" : "kind" },
    ...(deep ? [{ key: "layer", label: "in" }] : []),
    { key: "def", label: "definition" },
  ];

  /** Blank is the default: each usage goes back to its own kind's. */
  const blank_to = (value: string) => (value === BLANK ? "" : value);
  /** What is asked for and listed, else the first row. */
  const on = lit_row(rows, lit);

  return (
    <Table
      columns={columns}
      acts="6rem"
      picked={on}
      onPick={onLit}
      onHover={onHover}
      tools={rows.length ? (
        <select value="" aria-label="retype every line listed"
                onChange={(e) => onAct("retype", { ids: rows.map((r) => r.id),
                                                  type: blank_to(e.target.value) })}>
          <option value="">retype all {rows.length} →</option>
          {offered.map((o) => <option key={o.value || BLANK} value={o.value || BLANK}>{o.word}</option>)}
        </select>
      ) : null}
      empty={all.length ? "nothing of that sort"
        : `no ${lines ? "lines" : "blocks"} in this ${deep ? "workspace" : "layer"} yet`}
      chips={[
        scope_chips(scope, onScope),
        ...(lines ? [{ key: "module", on: module, onPick: set_module,
          of: modules.map((m) => ({ key: m, word: m,
            count: m === "all" ? all.length : all.filter((r) => r.module === m).length })) }] : []),
        { key: "by", on: keep.key, onPick: set_by,
          of: narrow.map((n) => ({ key: n.key, word: n.word, count: all.filter(n.keep).length })) },
      ]}
      rows={rows.map((r) => ({
        id: r.id,
        titles: { name: r.name, what: r.what, layer: r.layer },
        cells: {
          name: r.name,
          what: r.what,
          layer: r.layer,
          def: (
            <Choice value={r.def} label={`what ${r.name} follows`} of={fits(r.id)}
                    onPick={(id) => onAct("retype", { ids: [r.id], type: blank_to(id) })} />
          ),
        },
        /** The lit row's view chip, which is the only way a row moves the context. */
        actions: onView && on.includes(r.id) ? (
          <button className="chip"
                  title={home(r.id) === layer ? "make this the context"
                                              : "open the layer this is in"}
                  onClick={(e) => { e.stopPropagation(); onView(r.id); }}>
            view
          </button>
        ) : null,
      }))}
    />
  );
}
