/** The attributes tab: one table, the same for a definition, a usage and a line. A definition declares —
 *  name, type, key, default, unit, and any other property its attributes say — and a usage
 *  answers. Quiet until a row is lit: only the lit row's cells are controls. What a definition
 *  inherits reads first and faint; it is edited where it is declared. */

import { useState } from "react";
import { all_defs, all_types, attributes_of, def_at, def_of, domain_of, form_of, format_of,
         frozen, links_to, resolved, type_at, type_name, unit_of, FORMS, type Act, type Attribute,
         type Graph, type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { entry_look, tint_attrs } from "@mnd/views";
import { NOOP } from "./Body";
import { Entry } from "./Entry";
import { Table, type Column, type Line } from "./Table";

export type AttributesProps = { graph: Graph; id: Id; onAct?: Act };

/** An attribute's type as the table names it: in its type's colour, its format said on hover. */
function Typed({ graph, attribute, link, children }: { graph: Graph; attribute: Attribute;
                                                       link: boolean; children: string }) {
  const typed = !!type_at(graph, attribute.type);
  const tint = tint_attrs(typed ? entry_look(graph, attribute.type!) : undefined);
  const format = format_of(graph, attribute);
  return (
    <span className={link ? "type link" : typed ? "type typed" : "type"}
          {...tint} title={format ? `written ${format}` : undefined}>{children}</span>
  );
}

/** The list of every type an attribute may name, offered by its type box. */
const TYPES = "mnd-attribute-types";

export function Attributes({ graph, id, onAct = NOOP }: AttributesProps) {
  const [lit, set_lit] = useState<string | null>(null);
  const [adding, set_adding] = useState("");
  const readonly = onAct === NOOP;
  const d = def_at(graph, id);
  const b = graph.blocks[id] ?? graph.edges[id];
  if (!b) return <p className="empty">that is not here any more</p>;
  /** A stand-in reads as what it stands for, as its card does: edited there, never here. */
  const target = graph.blocks[id] ? resolved(graph, id).card : id;
  if (target !== id) return <Attributes graph={graph} id={target} />;
  const fixed = readonly || frozen(graph, id);
  const field = (args: Record<string, unknown>) => onAct("field", { holder: id, ...args });

  const all = attributes_of(graph, def_of(graph, id));
  const values = d ? [] : b.values ?? [];
  const extra = values.filter((v) => !all.some((a) => a.name === v.name));
  const own = d ? (d.def.attributes ?? []).map((a) => a.name) : [];
  const said = [...new Set(all.flatMap((a) => Object.keys(a.extra ?? {})))];
  const columns: Column[] = d
    ? [{ key: "name", label: "name" }, { key: "type", label: "type" }, { key: "key", label: "key" },
       { key: "default", label: "default" }, { key: "unit", label: "unit" },
       ...said.map((k) => ({ key: `@${k}`, label: k }))]
    : [{ key: "name", label: "name" }, { key: "type", label: "type" },
       { key: "value", label: "value" }, { key: "unit", label: "unit" }];

  const typed = (a: Attribute) => type_name(graph, a.type);
  const box = (a: Attribute, key: "unit" | "default" | "note") => (
    <Entry value={a[key] ?? ""} label={`${key} of ${a.name}`} blank
           onCommit={(to) => field({ name: a.name, [key]: to })} />
  );

  /** A declared row: the lit one, the definition's own, is controls. */
  const declared = (a: Attribute & { from: Id }): Line => {
    const mine = a.from === id && !fixed;
    const on = mine && lit === a.name;
    const link = !!links_to(graph, a);
    const at = own.indexOf(a.name);
    return {
      id: a.name,
      className: mine ? "" : "inherited",
      titles: { name: mine ? a.note ?? "" : `from ${graph.blocks[a.from]?.name ?? a.from}` },
      cells: {
        name: on ? <Entry value={a.name} label="name" onCommit={(to) => field({ name: a.name, to })} />
          : a.name,
        type: on ? <Entry value={typed(a)} label={`type of ${a.name}`} list={TYPES} blank
                          onCommit={(to) => field({ name: a.name, type: to })} />
          : <Typed graph={graph} attribute={a} link={!!link}>{typed(a)}</Typed>,
        key: on ? (
          <select title="whether its value names what carries it: the primary key, or unique"
                  value={a.key ?? "none"}
                  onChange={(e) => field({ name: a.name, key: e.target.value })}>
            <option value="none">—</option>
            <option value="primary">PK</option>
            <option value="unique">UK</option>
          </select>
        ) : a.key === "primary" ? "PK" : a.key === "unique" ? "UK" : link ? "FK" : "",
        default: on ? box(a, "default") : a.default ?? "",
        unit: on ? box(a, "unit") : a.unit ?? <span className="faint">{unit_of(graph, a) ?? ""}</span>,
        ...Object.fromEntries(said.map((k) => [`@${k}`, a.extra?.[k] ?? ""])),
      },
      ...(on ? { actions: <Order at={at} last={own.length - 1} onMove={(by) => {
        /** Up goes in front of the one before; down in front of the one after next, or last. */
        const before = own[at + (by < 0 ? -1 : 2)];
        onAct("order_field", { holder: id, name: a.name, ...(before ? { before } : {}) });
      }} /> } : {}),
      ...(mine ? { onDrop: () => onAct("unfield", { holder: id, name: a.name }),
                   drop: `drop ${a.name}` } : {}),
    };
  };

  /** An answered row: a usage answers in its value cell. */
  const answered = (a: Attribute & { from?: Id }): Line => {
    const value = values.find((v) => v.name === a.name)?.value;
    const on = !fixed && lit === a.name;
    return {
      id: a.name,
      cells: {
        name: a.name, type: <Typed graph={graph} attribute={a} link={false}>{typed(a)}</Typed>,
        value: on ? <Answer graph={graph} attribute={a} value={value ?? ""}
                            onSet={(to) => field({ name: a.name, value: to })} />
          : value ?? <span className="faint">{a.default ?? ""}</span>,
        unit: unit_of(graph, a) ?? "",
      },
      ...(value !== undefined && !fixed ? {
        onDrop: () => onAct("unfield", { holder: id, name: a.name }), drop: `clear ${a.name}`,
      } : {}),
    };
  };

  const rows = d ? all.map(declared)
    : [...all.map(answered), ...extra.map((v) => answered({ name: v.name }))];
  const add = () => {
    if (!adding.trim()) return;
    field({ name: adding.trim(), ...(d ? {} : { value: "" }) });
    set_adding("");
  };

  return (
    <div className="attributes">
      <Table columns={columns} rows={rows} picked={lit ? [lit] : []} onPick={set_lit} acts="5rem"
             empty={d ? "it declares nothing yet" : "it answers nothing yet"}
             {...(fixed ? {} : { adding: {
               cells: { name: <input value={adding} aria-label="add an attribute"
                                     placeholder={d ? "declare one" : "answer one"}
                                     onChange={(e) => set_adding(e.target.value)}
                                     onKeyDown={(e) => { if (e.key === "Enter") add(); }} /> },
               ready: !!adding.trim(), onAdd: add, title: "add it" } })} />
      {/* The forms, the libraries' types, then block definitions: links. */}
      <datalist id={TYPES}>
        {FORMS.map((f) => <option key={f} value={f} />)}
        {all_types(graph).map((t) => <option key={t.id} value={t.name} />)}
        {all_defs(graph).filter((x) => domain_of(graph, x.id) === "block")
          .map((x) => <option key={x.id} value={x.name} />)}
      </datalist>
    </div>
  );
}

/** Up and down, on the lit row only. */
function Order({ at, last, onMove }: { at: number; last: number; onMove: (by: -1 | 1) => void }) {
  return (
    <>
      <button className="drop" title="move up" disabled={at <= 0}
              onClick={(e) => { e.stopPropagation(); onMove(-1); }}><Icon name="less" /></button>
      <button className="drop" title="move down" disabled={at < 0 || at >= last}
              onClick={(e) => { e.stopPropagation(); onMove(1); }}><Icon name="more" /></button>
    </>
  );
}

/** A value, answered the way its type asks: a box, a number, a yes or a no, or one of a set. */
function Answer({ graph, attribute, value, onSet }: {
  graph: Graph; attribute: Attribute; value: string; onSet: (value: string) => void;
}) {
  const form = form_of(graph, attribute.type);
  if (form === "flag") {
    return (
      <input type="checkbox" aria-label={attribute.name}
             checked={(value || attribute.default) === "true"}
             onChange={(e) => onSet(e.target.checked ? "true" : "false")} />
    );
  }
  const choices = type_at(graph, attribute.type)?.choices;
  if (form === "choice" && choices?.length) {
    return (
      <select value={value} aria-label={attribute.name} onChange={(e) => onSet(e.target.value)}>
        <option value="">{attribute.default || "—"}</option>
        {choices.map((c) => <option key={String(c)} value={String(c)}>{String(c)}</option>)}
      </select>
    );
  }
  return <Entry value={value} label={attribute.name} blank placeholder={attribute.default ?? ""}
                onCommit={onSet} />;
}
