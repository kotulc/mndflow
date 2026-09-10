/** What one thing carries.
 *
 *  **A definition declares the schema and a usage answers it** — one control
 *  either way, because `field` already takes whichever holder it is given. That
 *  is the only row that differs between the two.
 *
 *  Its own tab rather than the foot of the styles panel: what a block is called
 *  and what it carries are two questions, and a long list of values used to push
 *  everything above it off the top of the tray. */

import { useState } from "react";
import { VALUE_FORMS, type Act, type Field, type FieldDef,
         type Graph, type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Body, Line } from "./Body";
import { held } from "./holder";

export type FieldsProps = { graph: Graph; id: Id; onAct: Act };

export function Fields({ graph, id, onAct }: FieldsProps) {
  const [adding, set_adding] = useState("");
  const [form, set_form] = useState<string>("text");

  const it = held(graph, id);
  if (!it) return <p className="empty">that is not here any more</p>;
  const { def: d, borrowed } = it;

  const add = () => {
    if (!adding.trim()) return;
    onAct("field", d ? { holder: id, name: adding.trim(), form }
                     : { holder: id, name: adding.trim(), value: "" });
    set_adding("");
  };

  return (
    <div className="fields">
      <Body head={d ? "schema" : "values"}
            note={it.fields.length ? `${it.fields.length}` : ""}>
        {it.fields.map((f: Field | FieldDef) => (
          <Line key={f.name} label={f.name} className="value" tip={f.form}>
            {d ? <span className="form">{f.form}</span>
               : <input value={(f as Field).value ?? ""}
                        onChange={(e) => onAct("field", { holder: id, name: f.name,
                                                          value: e.target.value })} />}
            <button className="drop" title={`drop ${f.name}`} disabled={borrowed}
                    onClick={() => onAct("unfield", { holder: id, name: f.name })}>
              <Icon name="remove" />
            </button>
          </Line>
        ))}
        {it.fields.length === 0 ? (
          <p className="empty">{d ? "it declares no fields yet" : "it carries no values yet"}</p>
        ) : null}
        <Line label="add" className="add">
          <input value={adding} placeholder={d ? "declare a field" : "add a field"}
                 aria-label="add a field" disabled={borrowed}
                 onChange={(e) => set_adding(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <select value={form} title="what sort of value" disabled={borrowed}
                  onChange={(e) => set_form(e.target.value)}>
            {VALUE_FORMS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button onClick={add} disabled={borrowed || !adding.trim()}>
            <Icon name="add" />
          </button>
        </Line>
      </Body>
    </div>
  );
}
