/** The usages tab: the lines or the blocks, and what each is. */

import { useState } from "react";
import { may_retype, RELATION_MODULES, relation_named, relations, shipped,
         type Act, type Graph, type Id } from "@mnd/core";
import { Choice, scope_chips, Table, type Column, type Scope } from "./Table";
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
  picked: readonly Id[];
  onPick: (id: Id) => void;
  onHover?: (id: Id | null) => void;
  onAct: Act;
  /** Go to where a line lives: open its layer and pick it there. */
  onView?: (id: Id) => void;
  /** The layer a line is drawn in. */
  home: (id: Id) => Id | null;
};

export function Usages({ graph, group, scope, onScope, layer, about, picked, onPick, onHover, onAct, onView,
                         home }: UsagesProps) {
  const lines = group === "relation";
  /** The root layer reads the whole project until somebody says otherwise. */
  const [module, set_module] = useState("all");
  const [by, set_by] = useState("any");

  const deep = scope === "workspace";
  const all = lines ? usage_rows(graph, layer, deep) : block_usage_rows(graph, layer, deep);
  /** The default is blank: an element naming nothing follows its kind's. */
  const offered = [{ value: "", word: "default" },
    ...(lines ? relations(graph) : Object.values(graph.defs).filter((d) => d.group === "block"))
      .filter((d) => !shipped(d) && d.default === undefined)
      .map((d) => ({ value: d.id, word: d.name }))];
  /** What one usage may be retyped to: its own kind's or module's definitions only. */
  const fits = (id: Id) => offered.filter((o) => !o.value
    || (lines ? relation_named(graph, o.value) === graph.edges[id]?.module
              : may_retype(graph, id, o.value)));

  const held = about ? graph.defs[about] : undefined;
  const narrow = [
    { key: "any", word: "any", keep: (_r: (typeof all)[number]) => true },
    ...(held ? [{ key: held.id, word: held.name,
                  keep: (r: (typeof all)[number]) => r.chain.includes(held.id) }] : []),
  ];
  const keep = narrow.find((n) => n.key === by) ?? narrow[0]!;
  const modules = ["all", ...RELATION_MODULES];
  const rows = all.filter((r) => (!lines || module === "all" || r.module === module)
                                 && keep.keep(r));

  const columns: readonly Column[] = [
    { key: "name", label: lines ? "line" : "block" },
    { key: "what", label: lines ? "joins" : "kind" },
    ...(deep ? [{ key: "layer", label: "in" }] : []),
    { key: "def", label: "definition" },
    ...(lines ? [{ key: "label", label: "label" }] : []),
  ];

  /** Blank is the default: each usage goes back to its own kind's. */
  const blank_to = (value: string) => (value === BLANK ? "" : value);

  return (
    <Table
      columns={columns}
      acts="4rem"
      picked={picked}
      onPick={onPick}
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
        titles: { name: r.name, what: r.what, layer: r.layer, label: r.label },
        cells: {
          name: r.name,
          what: r.what,
          layer: r.layer,
          def: (
            <Choice value={r.def} label={`what ${r.name} follows`} of={fits(r.id)}
                    onPick={(id) => onAct("retype", { ids: [r.id], type: blank_to(id) })} />
          ),
          label: r.label,
        },
        /** A view chip on the picked row, only when it lives elsewhere. */
        actions: onView && picked.includes(r.id) && home(r.id) !== layer ? (
          <button className="chip" title="open the layer this is in"
                  onClick={(e) => { e.stopPropagation(); onView(r.id); }}>
            view
          </button>
        ) : null,
      }))}
    />
  );
}
