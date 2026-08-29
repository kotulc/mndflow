/** What one row carries, and what its definition says everything like it
 *  carries.
 *
 *  **Two panels, because they are two different things.** A value lives on the
 *  usage and is content; a field lives on the definition and every usage of it
 *  gains one. Editing them in the same place is what makes the difference
 *  visible — and this is the only place either is edited, because the tray is
 *  the only surface that already lists a relationship and an interface.
 *
 *  A pure function of its props, like everything else here: it holds a draft
 *  and nothing else, and every change leaves as an action name. */

import { useState } from "react";
import { VALUE_FORMS, defs_in_scope, shown_name,
         type Act, type Definition, type Field, type FieldDef, type Graph, type Id }
  from "@mnd/core";

import { Icon } from "@mnd/theme";
export type EditorProps = {
  graph: Graph;
  /** The row being edited: a block or a relationship. */
  id: Id;
  onAct: Act;
};

/** A field's value, and what carries it. A relationship carries fields too, so
 *  neither panel asks which of the two it is looking at. */
function held(graph: Graph, id: Id): { fields: Field[]; type?: Id; name: string } | null {
  const b = graph.blocks[id];
  if (b) return { fields: b.fields ?? [], type: b.type, name: shown_name(graph, id) };
  const e = graph.edges[id];
  if (e) return { fields: e.fields ?? [], type: e.type, name: e.module };
  return null;
}

export function Editor(props: EditorProps) {
  const { graph, id, onAct } = props;
  const [adding, set_adding] = useState("");
  const [declaring, set_declaring] = useState("");
  const [form, set_form] = useState<string>("text");

  const it = held(graph, id);
  if (!it) return null;

  const def: Definition | undefined = it.type ? graph.defs[it.type] : undefined;
  /** Every definition this could name, nearest first. A relationship is filed
   *  where its ends are, so the scope is asked of the block either way. */
  const scope = defs_in_scope(graph, graph.blocks[id] ? id : graph.edges[id]?.from ?? graph.root)
    .filter((d) => d.group === (graph.edges[id] ? "relation" : "block"));

  const set_value = (name: string, value: string) =>
    onAct("field", { holder: id, name, value });

  const add = () => {
    if (!adding.trim()) return;
    set_value(adding.trim(), "");
    set_adding("");
  };

  const declare = () => {
    if (!declaring.trim() || !def) return;
    onAct("declare", { def: def.id, name: declaring.trim(), form });
    set_declaring("");
  };

  return (
    <div className="editor">
      <div className="panel">
        <div className="panel-head">
          <b>{it.name}</b>
          {/* Retyping is a write like any other, so the picker is the action. */}
          <select value={it.type ?? ""} title="which definition this names"
                  onChange={(e) => onAct("retype", { id, type: e.target.value })}>
            <option value="">untyped</option>
            {scope.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <table className="values">
          <tbody>
            {it.fields.map((f) => (
              <tr key={f.name}>
                <td className="key" title={`${f.form}${f.tags?.length ? ` · ${f.tags}` : ""}`}>
                  {f.name}
                </td>
                <td>
                  <input value={f.value ?? ""}
                         onChange={(e) => set_value(f.name, e.target.value)} />
                </td>
                <td className="drop">
                  <button title={`drop ${f.name}`}
                          onClick={() => onAct("unfield", { holder: id, name: f.name })}><Icon name="remove" /></button>
                </td>
              </tr>
            ))}
            {it.fields.length === 0 ? (
              <tr className="empty"><td colSpan={3}>no values yet</td></tr>
            ) : null}
          </tbody>
        </table>

        {/* Adding a field from the bar, which is how a value gets its first
            name when no definition asked for one. */}
        <div className="add">
          <input value={adding} placeholder="add a value" aria-label="add a value"
                 onChange={(e) => set_adding(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <button onClick={add} disabled={!adding.trim()}><Icon name="add" /></button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <b>{def ? def.name : "no definition"}</b>
          <span className="muted">{def ? "every usage carries these" : "nothing to declare on"}</span>
        </div>

        {def ? (
          <>
            <table className="values">
              <tbody>
                {(def.fields ?? []).map((f: FieldDef) => (
                  <tr key={f.name}>
                    <td className="key">{f.name}</td>
                    <td className="form">
                      {f.form}{f.unit ? ` · ${f.unit}` : ""}
                      {f.choices?.length ? ` · ${f.choices.join(", ")}` : ""}
                    </td>
                    <td className="drop">
                      <button title={`drop ${f.name} from ${def.name}`}
                              onClick={() => onAct("undeclare",
                                                   { def: def.id, name: f.name })}><Icon name="remove" /></button>
                    </td>
                  </tr>
                ))}
                {(def.fields ?? []).length === 0 ? (
                  <tr className="empty"><td colSpan={3}>it asks for nothing yet</td></tr>
                ) : null}
              </tbody>
            </table>

            {/* **Each form with its own shape**: what a field is decides what a
                usage may put in it, so it is picked here and never guessed. */}
            <div className="add">
              <input value={declaring} placeholder="declare a field"
                     aria-label="declare a field"
                     onChange={(e) => set_declaring(e.target.value)}
                     onKeyDown={(e) => { if (e.key === "Enter") declare(); }} />
              <select value={form} title="what sort of value"
                      onChange={(e) => set_form(e.target.value)}>
                {VALUE_FORMS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <button onClick={declare} disabled={!declaring.trim()}><Icon name="add" /></button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
