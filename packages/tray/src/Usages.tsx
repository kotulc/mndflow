/** The usages tab: **the lines or the blocks, and what each is.**
 *
 *  Chips narrow three ways, each on its own:
 *
 *  | chips | narrows to |
 *  |---|---|
 *  | here / workspace | the open layer's lines, or every line in the project |
 *  | line / tie | the module a line is drawn by |
 *  | any / the definition | lines following what the tray holds, or anything extending it |
 *
 *  Each row offers the definition it names, so a line is retyped where it is
 *  listed, and says the label that draws. **Retype all** sets every line the
 *  chips leave listed at once — one step, one undo.
 *  Picking a row selects the line, the way contents does. */

import { useState } from "react";
import { base_line, may_retype, RELATION_MODULES, relations, shipped,
         type Act, type Graph, type Id } from "@mnd/core";
import { Choice, Table, type Column } from "./Table";
import { block_usage_rows, usage_rows } from "./rows";

/** The base's option in *retype all*, whose own value is blank. */
const BLANK = "@base";

export type UsagesProps = {
  graph: Graph;
  /** Which usages: blocks or lines. */
  group: "block" | "relation";
  layer: Id | null;
  /** The definition the tray is about, which the third chip group narrows by. */
  about: Id | null;
  picked: readonly Id[];
  onPick: (id: Id) => void;
  onHover?: (id: Id | null) => void;
  onAct: Act;
  /** **Go to where a line lives**: open its layer and pick it there. */
  onView?: (id: Id) => void;
  /** The layer a line is drawn in. */
  home: (id: Id) => Id | null;
};

export function Usages({ graph, group, layer, about, picked, onPick, onHover, onAct, onView,
                         home }: UsagesProps) {
  const lines = group === "relation";
  /** **The root layer reads the whole project** until somebody says otherwise. */
  const [scope, set_scope] = useState<"here" | "workspace">(layer === null ? "workspace" : "here");
  const [module, set_module] = useState("all");
  const [by, set_by] = useState("any");

  const deep = scope === "workspace";
  const all = lines ? usage_rows(graph, layer, deep) : block_usage_rows(graph, layer, deep);
  /** **The base is blank**: a line naming nothing follows it. */
  const base = lines ? base_line(graph) : undefined;
  const offered = lines
    ? [{ value: "", word: base?.name ?? "default" },
       ...relations(graph).filter((d) => d.id !== base?.id)
         .map((d) => ({ value: d.id, word: d.name }))]
    : [{ value: "", word: "default" },
       ...Object.values(graph.defs).filter((d) => d.group === "block" && !shipped(d))
         .map((d) => ({ value: d.id, word: d.name }))];
  /** What one block may be retyped to: its own kind's definitions only. */
  const fits = (id: Id) => (lines ? offered
    : offered.filter((o) => !o.value || may_retype(graph, id, o.value)));

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
    { key: "name", label: lines ? "line" : "block", width: deep ? "18%" : "22%" },
    { key: "what", label: lines ? "joins" : "kind", width: deep ? "26%" : "34%" },
    ...(deep ? [{ key: "layer", label: "in", width: "18%" }] : []),
    { key: "def", label: "definition", width: deep ? "20%" : "24%" },
    ...(lines ? [{ key: "label", label: "label", width: deep ? "18%" : "20%" }] : []),
    { key: "view", label: "", width: "4.5em" },
  ];

  /** **Blank is the base.** A line naming nothing follows the base line; a block
   *  goes back to its own kind. */
  const blank_to = (value: string, id?: Id) => {
    const said = value === BLANK ? "" : value;
    return said || lines ? said : all.find((r) => r.id === id)?.module ?? "";
  };

  return (
    <Table
      columns={columns}
      picked={picked}
      onPick={onPick}
      onHover={onHover}
      tools={rows.length ? (
        <select value="" aria-label="retype every line listed"
                onChange={(e) => onAct("retype", { ids: rows.map((r) => r.id),
                                                  type: blank_to(e.target.value, rows[0]?.id) })}>
          <option value="">retype all {rows.length} →</option>
          {/* A block's base is its own kind, so *retype all* has no one blank to offer. */}
          {offered.filter((o) => lines || o.value)
            .map((o) => <option key={o.value || BLANK} value={o.value || BLANK}>{o.word}</option>)}
        </select>
      ) : null}
      empty={all.length ? "nothing of that sort" : deep ? "no lines in this project yet"
                                                    : "no lines in this layer"}
      chips={[
        { key: "scope", on: scope, onPick: (k) => set_scope(k as "here" | "workspace"),
          of: [{ key: "here", word: "here" }, { key: "workspace", word: "workspace" }] },
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
                    onPick={(id) => onAct("retype", { ids: [r.id], type: blank_to(id, r.id) })} />
          ),
          label: r.label,
          /** **Only on the row picked, and only when it is elsewhere** — one
           *  that is here already lights. */
          view: onView && picked.includes(r.id) && home(r.id) !== layer ? (
            <button className="chip" title="open the layer this is in"
                    onClick={(e) => { e.stopPropagation(); onView(r.id); }}>
              view
            </button>
          ) : null,
        },
      }))}
    />
  );
}
