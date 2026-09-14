/** The types tab: **every type a line can be, and the template each extends.**
 *
 *  A type names a line; the template it extends is how that line draws. The
 *  base type — *none* — is what a plain line follows, listed first and never
 *  removed. **A type is written here before any line names it**: the last row
 *  takes a name and a template, and the template each type extends is changed
 *  in its row. */

import { useState } from "react";
import { def_named, templates, type Act, type Graph, type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Table, type Column } from "./Table";
import { stereotype_rows } from "./rows";

const COLUMNS: readonly Column[] = [
  { key: "name", label: "type", width: "36%" },
  { key: "template", label: "template", width: "36%" },
  { key: "used", label: "used", width: "18%" },
  { key: "drop", label: "", width: "10%" },
];

/** The row that adds a type. Not an id `def_id` can mint. */
const NEW = "@new-type";

export type TypesProps = {
  graph: Graph;
  /** The template a new type starts from — the one the tray has in hand. */
  from: Id;
  onAct: Act;
};

/** A type's name, edited where it is listed. **Kept when the box is left**;
 *  a name another definition holds is said and not kept. */
function Renamed({ graph, id, name, onRename }: {
  graph: Graph; id: Id; name: string; onRename: (to: string) => void;
}) {
  const [draft, set_draft] = useState(name);
  const other = def_named(graph, draft);
  const clash = !!other && other.id !== id;
  return (
    <span className="adding">
      <input value={draft} aria-label={`rename ${name}`}
             onClick={(e) => e.stopPropagation()}
             onChange={(e) => set_draft(e.target.value)}
             onBlur={() => {
               if (draft.trim() && draft.trim() !== name && !clash) onRename(draft.trim());
               else set_draft(name);
             }}
             onKeyDown={(e) => {
               if (e.key === "Enter") (e.target as HTMLInputElement).blur();
               if (e.key === "Escape") set_draft(name);
             }} />
      {clash ? <span className="warn">{other!.name} already exists</span> : null}
    </span>
  );
}

export function Types({ graph, from, onAct }: TypesProps) {
  const [name, set_name] = useState("");
  const [template, set_template] = useState<Id | null>(null);
  /** **Only templates**, since a type extends a look and never another name. */
  const offered = templates(graph);
  const extend = template && graph.defs[template] ? template : from;
  const taken = def_named(graph, name);

  const add = () => {
    if (!name.trim() || taken) return;
    onAct("define", { name: name.trim(), group: "relation", extends: extend });
    set_name("");
    set_template(null);
  };

  const pick = (value: Id, label: string, onChange: (id: Id) => void) => (
    <select value={value} aria-label={label} onClick={(e) => e.stopPropagation()}
            onChange={(e) => onChange(e.target.value)}>
      {offered.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
  );

  return (
    <Table
      columns={COLUMNS}
      empty="no types yet"
      rows={[
        ...stereotype_rows(graph).map((r) => ({
          id: r.id,
          titles: { name: r.base ? "what a line naming nothing follows" : r.name },
          cells: {
            /** **Renamed in place**, and every line naming it reads the new name. */
            name: r.base ? <span className="none">none</span> : (
              <Renamed key={`${r.id}:${r.name}`} graph={graph} id={r.id} name={r.name}
                       onRename={(to) => onAct("rename_def", { id: r.id, name: to })} />
            ),
            template: pick(r.template, `what ${r.name} extends`,
                           (id) => onAct("define", { name: r.name, extends: id })),
            used: String(r.used),
            /** **Removing a type keeps how its lines draw**: they go on naming
             *  the template it extended. The base type stays. */
            drop: r.base ? null : (
              <button className="drop" title={`remove ${r.name}`}
                      onClick={(e) => { e.stopPropagation(); onAct("unpin", { id: r.id }); }}>
                <Icon name="remove" />
              </button>
            ),
          },
        })),
        {
          id: NEW,
          cells: {
            name: (
              <span className="adding">
                <input value={name} aria-label="type name" placeholder="add a type"
                       onChange={(e) => set_name(e.target.value)}
                       onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
                {taken ? <span className="warn">{taken.name} already exists</span> : null}
              </span>
            ),
            template: pick(extend, "extends", set_template),
            used: "",
            drop: (
              <button className="drop" title="add this type" disabled={!name.trim() || !!taken}
                      onClick={add}>
                <Icon name="add" />
              </button>
            ),
          },
        },
      ]}
    />
  );
}
