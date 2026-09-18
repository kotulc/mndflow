/** What one thing carries. */

import { useState } from "react";
import { def_of, schema_of, VALUE_FORMS, type Act, type Field, type FieldDef,
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
  const { def: d } = it;

  const own = it.fields as readonly FieldDef[];
  const names = own.map((f) => f.name);
  /** The schema this answers or inherits. */
  const schema = schema_of(graph, d ? d.extends : def_of(graph, id))
    .filter((f) => !(d && names.includes(f.name)));
  const answers = d ? [] : schema;
  const extra = d ? own : own.filter((f) => !schema.some((s) => s.name === f.name));
  const moveable = extra.map((f) => f.name);

  const say = (args: Record<string, unknown>) => onAct("field", { holder: id, ...args });
  const move = (name: string, by: -1 | 1) => {
    const at = names.indexOf(name);
    const before = by < 0 ? names[at - 1] : names[at + 2];
    onAct("order_field", { holder: id, name, ...(before ? { before } : {}) });
  };
  const add = () => {
    if (!adding.trim()) return;
    say({ name: adding.trim(), form, ...(d ? {} : { value: "" }) });
    set_adding("");
  };

  return (
    <div className="fields">
      {d && schema.length ? (
        <Body head="inherited" note={`${schema.length}`}>
          {schema.map((f) => (
            <Line key={f.name} label={f.name} className="value" tip={`declared by ${f.from}`}>
              <span className="form">{f.form}{f.unit ? ` · ${f.unit}` : ""}</span>
              <span className="from">from {graph.defs[f.from]?.name ?? f.from}</span>
            </Line>
          ))}
        </Body>
      ) : null}

      {answers.length ? (
        <Body head="schema" note={`${answers.length}`}>
          {answers.map((f) => {
            const mine = own.find((x) => x.name === f.name);
            return (
              <Line key={f.name} label={f.name} className="value"
                    tip={`declared by ${graph.defs[f.from]?.name ?? f.from}`}>
                <Value field={{ ...f, value: mine?.value }} fallback={f.value ?? ""}
                       onSet={(value) => say({ name: f.name, value })} />
                {f.unit ? <span className="form">{f.unit}</span> : null}
                <button className="drop" disabled={!mine} title="give the default back"
                        onClick={() => onAct("unfield", { holder: id, name: f.name })}>
                  <Icon name="clear" />
                </button>
              </Line>
            );
          })}
        </Body>
      ) : null}

      <Body head={d ? "declares" : "values"} note={extra.length ? `${extra.length}` : ""}>
        {extra.map((f, n) => (
          <Line key={f.name} label={
                  <Commit value={f.name} label="field name"
                          onCommit={(to) => to && say({ name: f.name, to })} />
                } className="value">
            <select value={f.form} title="what sort of value"
                    onChange={(e) => say({ name: f.name, form: e.target.value })}>
              {VALUE_FORMS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            {d ? (
              <Commit value={f.unit ?? ""} label="unit" placeholder="unit"
                      onCommit={(unit) => say({ name: f.name, unit })} />
            ) : null}
            {d && f.form === "choice" ? (
              <Commit value={(f.choices ?? []).join(", ")} label="choices"
                      placeholder="choices, by commas"
                      onCommit={(choices) => say({ name: f.name, choices })} />
            ) : null}
            <Value field={f} fallback={d ? "default" : ""}
                   onSet={(value) => say({ name: f.name, value })} />
            <button className="drop" title="move up" disabled={n === 0}
                    onClick={() => move(f.name, -1)}><Icon name="less" /></button>
            <button className="drop" title="move down"
                    disabled={n === moveable.length - 1}
                    onClick={() => move(f.name, 1)}><Icon name="more" /></button>
            <button className="drop" title={`drop ${f.name}`}
                    onClick={() => onAct("unfield", { holder: id, name: f.name })}>
              <Icon name="remove" />
            </button>
          </Line>
        ))}
        {extra.length === 0 ? (
          <p className="empty">{d ? "it declares no fields of its own" : "it carries no values of its own"}</p>
        ) : null}
        <Line label="add" className="add">
          <input value={adding} placeholder={d ? "declare a field" : "add a field"}
                 aria-label="add a field"
                 onChange={(e) => set_adding(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
          <select value={form} title="what sort of value"
                  onChange={(e) => set_form(e.target.value)}>
            {VALUE_FORMS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button onClick={add} disabled={!adding.trim()}>
            <Icon name="add" />
          </button>
        </Line>
      </Body>
    </div>
  );
}

/** A value, answered the way its form asks. */
function Value({ field, fallback, disabled, onSet }: {
  field: Field | FieldDef; fallback: string; disabled?: boolean;
  onSet: (value: string) => void;
}) {
  const value = field.value ?? "";
  if (field.form === "flag") {
    return (
      <input type="checkbox" aria-label={field.name} disabled={disabled}
             checked={(value || fallback) === "true"}
             onChange={(e) => onSet(e.target.checked ? "true" : "false")} />
    );
  }
  if (field.form === "choice" && "choices" in field && field.choices?.length) {
    return (
      <select value={value} aria-label={field.name} disabled={disabled}
              onChange={(e) => onSet(e.target.value)}>
        <option value="">{fallback || "—"}</option>
        {field.choices.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    );
  }
  return (
    <Commit value={value} label={field.name} placeholder={fallback} disabled={disabled}
            type={field.form === "number" ? "number" : field.form === "link" ? "url" : "text"}
            onCommit={onSet} />
  );
}

/** A box committed when left or on Enter. */
function Commit({ value, label, placeholder, disabled, type = "text", onCommit }: {
  value: string; label: string; placeholder?: string; disabled?: boolean;
  type?: string; onCommit: (value: string) => void;
}) {
  const [draft, set_draft] = useState<string | null>(null);
  return (
    <input type={type} value={draft ?? value} aria-label={label} placeholder={placeholder}
           disabled={disabled}
           onChange={(e) => set_draft(e.target.value)}
           onBlur={() => {
             if (draft !== null && draft !== value) onCommit(draft.trim());
             set_draft(null);
           }}
           onKeyDown={(e) => {
             if (e.key === "Enter") (e.target as HTMLInputElement).blur();
             if (e.key === "Escape") set_draft(null);
           }} />
  );
}
