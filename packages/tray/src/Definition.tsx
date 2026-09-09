/** One definition, described the way an element is.
 *
 *  **A third branch beside blocks and relations.** What a definition *is* — the
 *  kind it rests on and what it extends. How its usages *draw* — the same nine
 *  questions, against the same card. And what it *asks* and what it *carries* —
 *  which is where rules and fields are authored, as against read.
 *
 *  **Nothing here is a second mechanism.** `look` takes a holder, so the same
 *  pickers that set one block's last word set a definition's statement; `field`
 *  already did. What changes is which id they are handed.
 *
 *  A pure function of its props, like every other surface here. */

import { type CSSProperties, useState } from "react";
import { VALUE_FORMS, config_of, is_own_id, isa, module_named,
         type Act, type FieldDef, type Graph, type Id } from "@mnd/core";
import { Icon, type IconName } from "@mnd/theme";
import { Looks } from "./Looks";
import { Rules } from "./Rules";

/** The mark each base kind wears. **The tray's own copy**, the way `Element`
 *  keeps one — a surface may not reach another surface for them. */
const MARK: Record<string, IconName> = {
  block: "role_leaf", folder: "role_folder", resource: "role_resource",
  reference: "role_reference", interface: "role_interface",
  group: "role_group", grid: "role_table", note: "role_note",
};

export type DefinitionProps = {
  graph: Graph;
  id: Id;
  onAct: Act;
};

export function Definition({ graph, id, onAct }: DefinitionProps) {
  const [adding, set_adding] = useState("");
  const [form, set_form] = useState<string>("text");

  const d = graph.defs[id];
  if (!d) return <p className="empty">that definition is not here any more</p>;

  /** **A package resists editing.** A definition carrying a `from` is somebody
   *  else's vocabulary; every action refuses to write one, so the panel says so
   *  rather than offering controls that will be turned down. */
  const borrowed = !!d.from;
  const kind = module_named(graph, d.id);
  const own = is_own_id(d.id);

  /** What this definition says, as against what its chain says. The same three
   *  readers `Element` hands `Looks`, one layer further along. */
  const said = (key: string, name: string) => d.components?.[key]?.[name];
  const chain = (key: string, name: string) => {
    const from = config_of(graph, d.extends, key)[name];
    return from === undefined || from === null ? "" : String(from);
  };
  const now = (key: string, name: string, fallback: string) =>
    String(said(key, name) ?? chain(key, name) ?? "") || fallback;

  /** What it may extend: any block definition but itself and anything below it,
   *  so a chain cannot be pointed back at its own head.
   *
   *  **Read off `graph.defs`, not off the section.** The section substitutes a
   *  `ws.<kind>` override for the base row it replaces, which is right for a
   *  listing and wrong for a picker: it took `block` out of the options while a
   *  definition was still extending it, and the control fell back to reading
   *  *nothing*. A subtype may root at the pristine base whatever the workspace
   *  has adopted. */
  const roots = Object.values(graph.defs)
    .filter((x) => x.group === "block" && x.id !== d.id
                && !isa(graph, x.id).some((up) => up.id === d.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const mark = (now("card", "icon", "") || MARK[kind] || "role_leaf") as IconName;
  const fields = d.fields ?? [];

  const add_field = () => {
    if (!adding.trim()) return;
    onAct("field", { holder: id, name: adding.trim(), form });
    set_adding("");
  };

  return (
    <div className="element definition">
      <div className="element-cols">
        <div className="col what">
          {/* **The kind it rests on, and what it refines.** The same one line
              the element panel reads, asked of a definition rather than of a
              usage. */}
          <div className="row type">
            <label>kind</label>
            <span className="base" title="the base kind its usages are">
              <Icon name={MARK[kind] ?? "role_leaf"} size={12} />
              {kind}
            </span>
            <span className="into">›</span>
            <select value={d.extends ?? ""} title="what it refines" aria-label="extends"
                    disabled={borrowed}
                    onChange={(e) => onAct("define", { name: d.name,
                                                       extends: e.target.value })}>
              <option value="">nothing</option>
              {roots.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>

          <div className="row identity">
            <label>name</label>
            {/* **Read-only.** `def_id` slugs a name into the id, so renaming one
                would mint a second definition and leave every usage naming the
                first. Retiring it is `unpin`, which is lossless. */}
            <input value={d.name} readOnly aria-label="name" />
            <span className="alias">{d.id}</span>
          </div>

          <div className="row toggles">
            <label>from</label>
            <span className="chips">
              <span className="chip from">{d.from ?? "this workspace"}</span>
              {own ? <span className="chip from">its own {kind}</span> : null}
            </span>
          </div>

          {borrowed ? (
            <p className="not-yet">
              This comes from {d.from}, and a package resists editing. Extend it
              with a subtype instead — the subtype is yours to change.
            </p>
          ) : null}
        </div>

        <div className="col looks-col">
          {borrowed
            ? <p className="not-yet">what a package draws is the package's to say.</p>
            : <Looks id={id} said={said} now={now} chain={chain} onAct={onAct} />}
        </div>

        {/* The drawing, and only the drawing — a card as a usage of this would
            be drawn, so every tab is read against the same picture. */}
        <div className="col shown">
          <div className="preview">
            <div className="preview-card"
                 data-slot={said("style", "hue") === undefined
                   ? now("style", "slot", "neutral") : "tint"}
                 style={{
                   ...(said("style", "hue") === undefined ? {} : {
                     "--card-h": now("style", "hue", "200"),
                     "--card-c":
                       `calc(var(--tint-ceiling) * ${now("style", "intensity", "0.65")})`,
                   }),
                   ...(Number(now("style", "opacity", "1")) < 1
                     ? { "--card-opacity": now("style", "opacity", "1") } : {}),
                 } as CSSProperties}
                 data-weight={now("style", "weight", "thin")}
                 data-voice={now("style", "voice", "normal")}
                 data-decor={now("style", "decor", "none")}
                 data-fill={now("style", "fill", "solid")}
                 data-line={now("style", "line", "") || undefined}
                 data-ink={now("style", "ink", "") || undefined}
                 data-sheer={Number(now("style", "opacity", "1")) < 1 ? "" : undefined}
                 data-name={now("card", "name", "inside")}
                 data-label={now("card", "label", "none")}
                 data-align={now("card", "align", "left")}>
              <span className="preview-role" data-role={kind}>
                <Icon name={mark} size={11} />
              </span>
              {now("card", "label", "inside") !== "none" ? (
                <div className="preview-head">
                  <span className="preview-named">
                    <span className="preview-label">a {d.name}</span>
                  </span>
                  <span className="preview-kind">{d.name}</span>
                </div>
              ) : null}
              {fields.length ? (
                <dl className="preview-fields">
                  {fields.slice(0, 2).map((f) => (
                    <div key={f.name}><dt>{f.name}</dt><dd>{f.value ?? ""}</dd></div>
                  ))}
                </dl>
              ) : null}
            </div>
            {now("card", "label", "inside") === "below" ? (
              <span className="preview-below">a {d.name}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* **What it asks of every usage.** Authored here, which is the whole
          difference between this panel and the element's. */}
      <section className="part rules">
        <h4>rules<span className="from">asked of everything naming it</span></h4>
        {borrowed
          ? <p className="empty">a package states its own rules</p>
          : <Rules graph={graph} holder={id} onAct={onAct} />}
      </section>

      {/* **The schema, not the values.** A field declared here is one every
          usage carries; a value on this record is what pinning a template
          captured. */}
      <section className="part fields">
        <h4>fields<span className="from">{fields.length ? `${fields.length}` : ""}</span></h4>
        <table className="values">
          <tbody>
            {fields.map((f: FieldDef) => (
              <tr key={f.name}>
                <td className="key" title={f.form}>{f.name}</td>
                <td className="form">{f.form}</td>
                <td>
                  <input value={f.value ?? ""} placeholder="default" disabled={borrowed}
                         onChange={(e) => onAct("field", { holder: id, name: f.name,
                                                           form: f.form,
                                                           value: e.target.value })} />
                </td>
                <td className="drop">
                  <button title={`drop ${f.name}`} disabled={borrowed}
                          onClick={() => onAct("unfield", { holder: id, name: f.name })}>
                    <Icon name="remove" />
                  </button>
                </td>
              </tr>
            ))}
            {fields.length === 0 ? (
              <tr className="empty"><td colSpan={4}>it declares no fields yet</td></tr>
            ) : null}
          </tbody>
        </table>

        {borrowed ? null : (
          <div className="add">
            <input value={adding} placeholder="declare a field" aria-label="declare a field"
                   onChange={(e) => set_adding(e.target.value)}
                   onKeyDown={(e) => { if (e.key === "Enter") add_field(); }} />
            <select value={form} title="what sort of value"
                    onChange={(e) => set_form(e.target.value)}>
              {VALUE_FORMS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={add_field} disabled={!adding.trim()}><Icon name="add" /></button>
          </div>
        )}
      </section>
    </div>
  );
}
