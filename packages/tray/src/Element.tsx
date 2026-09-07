/** One element's definition, and everything it says about itself.
 *
 *  **Three sections, because there are three questions.** What it *is* — its
 *  base kind, the definition it names, what it is called and what has been done
 *  to it. How it *draws* — a card standing beside the pickers that set it, so
 *  an answer is seen rather than imagined. And what it *carries* — the rules in
 *  force over it, then its own values, each under its own head.
 *
 *  **The look column is a card and the swatches that paint it.** What each
 *  answer does is drawn rather than named, one part of the card at a time —
 *  see `Looks`.
 *
 *  A pure function of its props, like every other surface here: it holds a
 *  draft and nothing else, and every change leaves as an action name. */

import { type CSSProperties, useState } from "react";
import { BLOCK_MODULES, VALUE_FORMS, alias_of, config_of, defs_in_scope, def_of,
         kind_word, may_retype, module_of, role_of, rules_of, shown_name,
         type Act, type Field, type Graph, type Id, type Role } from "@mnd/core";
import { Icon, type IconName } from "@mnd/theme";
import { Looks } from "./Looks";

/** Every id the base packages ship, block kinds and relations alike. A
 *  definition carrying one of these **is** a base kind rather than something
 *  refining one. */
const BASE_IDS: readonly string[] = [...BLOCK_MODULES, "line", "directed"];

/** The mark a role wears while nobody has picked one. **The tray's own copy**:
 *  the same eight the stage draws, restated here because a surface may not
 *  reach another surface for them. */
const ROLE: Record<Role, IconName> = {
  block: "role_leaf", container: "role_container", folder: "role_folder",
  reference: "role_reference", interface: "role_interface",
  group: "role_group", grid: "role_table", note: "role_note",
};

export type ElementProps = {
  graph: Graph;
  /** The one thing being described: a block or a relationship. */
  id: Id;
  onAct: Act;
};

/** What carries fields, whichever of the two this is. A relationship carries
 *  them too, so neither panel asks which it is looking at. */
function held(graph: Graph, id: Id) {
  const b = graph.blocks[id];
  if (b) return { fields: b.fields ?? [], type: b.type, block: b };
  const e = graph.edges[id];
  if (e) return { fields: e.fields ?? [], type: e.type, block: null };
  return null;
}

export function Element({ graph, id, onAct }: ElementProps) {
  const [adding, set_adding] = useState("");
  const [form, set_form] = useState<string>("text");
  const [tagging, set_tagging] = useState("");

  const it = held(graph, id);
  if (!it) return null;
  const b = it.block;
  const edge = graph.edges[id];
  /** **Only what this could become.** A subtype refines what a thing is like
   *  and never what it is, so the picker offers its own kind — and a block, a
   *  folder and a resource count as one kind between them. */
  const scope = defs_in_scope(graph, b ? id : edge?.from ?? graph.root)
    .filter((d) => d.group === (edge ? "relation" : "block"))
    .filter((d) => !b || may_retype(graph, id, d.id));
  /** **The base kinds are not subtypes of themselves.** A definition shipped as
   *  one of the base kinds is what the mark beside the picker already says, so
   *  offering it there would ask the same question twice — which is what made
   *  *base* and *type* read as two rows saying `block`. */
  const base_id = b ? module_of(graph, id) : edge?.module ?? "line";
  const subtypes = scope.filter((d) => !BASE_IDS.includes(d.id));
  const named = b?.type ?? edge?.type;
  const subtype = named && subtypes.some((d) => d.id === named) ? named : "";
  /** What it has been told about itself, as against what its chain says. */
  const said = (key: string, name: string) => b?.looks?.[key]?.[name];
  /** What its chain says, for the answers it has not overridden. **Shown in the
   *  picker rather than left blank**: an empty one used to read as the trait's
   *  own name, so a card drawing itself green offered a box saying *slot* —
   *  which names the question and hides the answer. */
  const chain = (key: string, name: string) => {
    const from = config_of(graph, def_of(graph, id), key)[name];
    return from === undefined || from === null ? "" : String(from);
  };
  /** What it actually draws as: its own word where it has one, else its
   *  chain's. **This is what the card is painted from**, so the preview and the
   *  drawing cannot disagree about what a trait resolves to. */
  const now = (key: string, name: string, fallback: string) => {
    const own = said(key, name);
    return String(own ?? chain(key, name) ?? "") || fallback;
  };

  const tags = b?.tags ?? [];
  const retag = (next: string[]) => onAct("tag", { ids: [id], tags: next });

  const add_value = () => {
    if (!adding.trim()) return;
    onAct("field", { holder: id, name: adding.trim(), value: "" });
    set_adding("");
  };

  /** The rules in force, from the chain. **Derived and read-only here**: a rule
   *  is a definition's to state, and nothing writes one yet. */
  const rules = rules_of(graph, def_of(graph, id));
  const stated = rule_rows(graph, rules);

  const mark = (now("card", "icon", "") || ROLE[b ? role_of(graph, id) : "block"]) as IconName;
  /** **What somebody named it, not what it resolves to.** Every card resolves
   *  to a base definition, so reading that here put the word `block` on the
   *  chip of every block on the drawing — which the mark beside it already
   *  said. The chip is for a subtype somebody chose. */
  /** **The subtype where one is named, the base kind otherwise.** Always a
   *  word, because `label` is what decides whether it is written. */
  const kind = (named ? graph.defs[named]?.name : undefined)
    ?? (b ? module_of(graph, id) : edge?.module ?? "relation");
  /** **What a card carries is `shows`, not a layout.** The layout key offered
   *  five compositions and no renderer read any of them. */
  const shows = config_of(graph, def_of(graph, id), "card")["shows"];
  const shows_fields = Array.isArray(shows) && shows.length > 0;

  return (
    <div className="element">
      <div className="element-cols">
        {/* **What it is**, top to bottom in the order somebody answers it: the
            kind it rests on, the definition it names, what it is called, what
            it is like, and what has been done to it. */}
        <div className="col what">
          {/* **One line, because base and subtype are one answer.** The kind it
              rests on is fixed and wears its own mark; what refines that is the
              only part anybody picks. **No "untyped"** — nothing refining it
              means it *is* its base kind, which is what the empty option says. */}
          <div className="row type">
            <label>type</label>
            <span className="base" title="the base kind this rests on">
              <Icon name={ROLE[b ? role_of(graph, id) : "block"]} size={12} />
              {b ? module_of(graph, id) : edge?.module ?? "relation"}
            </span>
            <span className="into">›</span>
            <select value={subtype} title="what refines it" aria-label="subtype"
                    disabled={!subtypes.length}
                    onChange={(e) => onAct("retype", { id, type: e.target.value || base_id })}>
              <option value="">base</option>
              {subtypes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="row identity">
            <label>name</label>
            {/* **A relationship has no label of its own** — what it is called
                is its definition's name, which is why renaming one mints a
                definition rather than writing a field. */}
            <input value={b?.label ?? (edge?.type ? graph.defs[edge.type]?.name ?? "" : "")}
                   placeholder={b ? kind_word(graph, b) : "unnamed"} aria-label="name"
                   onChange={(e) => onAct("rename", { id, label: e.target.value })} />
            <span className="alias">{alias_of(graph, id)}</span>
          </div>

          {/* **Words, carrying nothing.** A tag says what a thing is like; a
              definition says what it is made of. Two different jobs, so a tag
              has no fields, no style and no chain. */}
          {b ? (
            <div className="row tags">
              <label>tags</label>
              <span className="chips">
                {tags.map((t) => (
                  <button key={t} className="chip" title={`drop “${t}”`}
                          onClick={() => retag(tags.filter((x) => x !== t))}>
                    {t}<Icon name="remove" size={10} />
                  </button>
                ))}
                <input value={tagging} placeholder="add a tag" aria-label="add a tag"
                       onChange={(e) => set_tagging(e.target.value)}
                       onKeyDown={(e) => {
                         if (e.key !== "Enter" || !tagging.trim()) return;
                         retag([...tags, tagging.trim()]);
                         set_tagging("");
                       }} />
              </span>
            </div>
          ) : null}

          {/* **What has been done to it**, as against what it is. Model data on
              the element, so each travels and each undoes. */}
          {b ? (
            <div className="row toggles">
              <label>shows</label>
              <span className="chips">
                <button className={b.labelled === false ? "" : "on"}
                        onClick={() => onAct("label", { ids: [id],
                                                        shown: b.labelled === false ? "yes" : "no" })}>
                  <Icon name={b.labelled === false ? "label_off" : "label_on"} size={12} /> name
                </button>
                <button className={b.locked ? "on" : ""}
                        onClick={() => onAct("lock", { ids: [id], fixed: b.locked ? "no" : "yes" })}>
                  <Icon name={b.locked ? "locked" : "unlocked"} size={12} /> lock
                </button>
              </span>
            </div>
          ) : null}
        </div>

        {/* **How it draws.** Every answer here is the element's own last word
            over whatever its chain said, and the column beside it shows what
            each one did. */}
        <div className="col looks-col">
          {b ? (
            <Looks id={id} said={said} now={now} chain={chain} onAct={onAct} />
          ) : (
            /** A relationship carries a definition exactly as a block does and
             *  there is nowhere to say so yet — ST.15. Said plainly rather than
             *  left as an empty half. */
            <p className="not-yet">a relationship draws from its module and its
              definition. Customising one is not built yet.</p>
          )}
        </div>

        {/* **The drawing, and only the drawing.** Its own column so that every
            tab is read against the same card rather than against one that moves
            when the options above it change height. */}
        <div className="col shown">
          {b ? (
          <div className="preview">
              <div className="preview-card"
                   data-slot={said("style", "hue") === undefined
                     ? now("style", "slot", "neutral") : "tint"}
                   style={said("style", "hue") === undefined ? undefined : {
                     "--card-h": now("style", "hue", "200"),
                     "--card-c": `calc(var(--tint-ceiling) * ${now("style", "intensity", "0.65")})`,
                   } as CSSProperties}
                   data-emphasis={now("style", "emphasis", "normal")}
                   data-weight={now("style", "weight", "thin")}
                   data-voice={now("style", "voice", "normal")}
                   data-decor={now("style", "decor", "none")}
                   data-fill={now("style", "fill", "solid")}
                   data-sheer={now("style", "sheer", "opaque")}
                   data-name={now("card", "name", "inside")}
                   data-label={now("card", "label", "none")}
                   data-align={now("card", "align", "left")}>
                <span className="preview-role" data-role={role_of(graph, id)}>
                  <Icon name={mark} size={11} />
                </span>
                {b.locked
                  ? <span className="preview-locked"><Icon name="locked" size={11} /></span>
                  : null}
                {now("card", "label", "inside") !== "none" ? (
                  <div className="preview-head">
                    <span className="preview-named">
                      <span className="preview-label">{shown_name(graph, id)}</span>
                      {alias_of(graph, id)
                        ? <span className="preview-alias">{alias_of(graph, id)}</span> : null}
                    </span>
                    {/* **The subtype, and never the word the mark already
                        says.** A folder wearing the folder mark beside the
                        word *folder* says it twice — which is what every card
                        did while this read the resolved definition rather
                        than the one somebody actually named. */}
                    {kind && kind !== role_of(graph, id)
                      ? <span className="preview-kind">{kind}</span> : null}
                  </div>
                ) : null}
                {shows_fields && it.fields.length ? (
                  <dl className="preview-fields">
                    {it.fields.slice(0, 2).map((f) => (
                      <div key={f.name}><dt>{f.name}</dt><dd>{f.value}</dd></div>
                    ))}
                  </dl>
                ) : null}
              </div>
              {now("card", "label", "inside") === "below" ? (
                <span className="preview-below">{shown_name(graph, id)}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* **What must be true**, before what it happens to carry. Derived from
          the chain and read-only: a rule is a definition's to state, and
          nothing writes one from here yet. */}
      <section className="part rules">
        <h4>rules<span className="from">{stated.length ? "in force, from the chain" : ""}</span></h4>
        {stated.length ? (
          <table className="stated">
            <tbody>
              {stated.map((r) => (
                <tr key={r.kind}>
                  <td className="key">{r.kind}</td>
                  <td>{r.says}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="empty">its definitions ask nothing of it</p>}
      </section>

      {/* **What it carries.** Last, because a value is the detail and
          everything above it is what the thing is. */}
      <section className="part fields">
        <h4>fields<span className="from">{it.fields.length ? `${it.fields.length}` : ""}</span></h4>
        <table className="values">
          <tbody>
            {it.fields.map((f: Field) => (
              <tr key={f.name}>
                <td className="key" title={f.form}>{f.name}</td>
                <td className="form">{f.form}</td>
                <td>
                  <input value={f.value ?? ""}
                         onChange={(e) => onAct("field", { holder: id, name: f.name,
                                                           value: e.target.value })} />
                </td>
                <td className="drop">
                  <button title={`drop ${f.name}`}
                          onClick={() => onAct("unfield", { holder: id, name: f.name })}>
                    <Icon name="remove" />
                  </button>
                </td>
              </tr>
            ))}
            {it.fields.length === 0 ? (
              <tr className="empty"><td colSpan={4}>it carries no values yet</td></tr>
            ) : null}
          </tbody>
        </table>

        <div className="add">
          <input value={adding} placeholder="add a field" aria-label="add a field"
                 onChange={(e) => set_adding(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") add_value(); }} />
          <select value={form} title="what sort of value"
                  onChange={(e) => set_form(e.target.value)}>
            {VALUE_FORMS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button onClick={add_value} disabled={!adding.trim()}><Icon name="add" /></button>
        </div>
      </section>
    </div>
  );
}

/** The rules in force, as one line each. **Names, not ids** — a rule naming a
 *  definition means it or anything below it, and the id is no use to a reader. */
function rule_rows(graph: Graph, rules: ReturnType<typeof rules_of>) {
  const named = (ids: readonly Id[]) =>
    ids.map((d) => graph.defs[d]?.name ?? d).join(", ");
  const span = (r?: { min?: number; max?: number }) =>
    !r ? "" : r.min !== undefined && r.max !== undefined ? `${r.min}–${r.max}`
      : r.min !== undefined ? `${r.min} or more` : `up to ${r.max}`;

  const out: { kind: string; says: string }[] = [];
  if (rules.required?.length) {
    out.push({ kind: "required", says: `must carry ${rules.required.join(", ")}` });
  }
  if (rules.holds?.length) out.push({ kind: "holds", says: `may hold ${named(rules.holds)}` });
  if (rules.ends) {
    const from = rules.ends.from?.length ? named(rules.ends.from) : "anything";
    const to = rules.ends.to?.length ? named(rules.ends.to) : "anything";
    out.push({ kind: "ends", says: `${from} → ${to}` });
  }
  if (rules.degree) {
    const bits = [rules.degree.in ? `in ${span(rules.degree.in)}` : "",
                  rules.degree.out ? `out ${span(rules.degree.out)}` : ""].filter(Boolean);
    if (bits.length) out.push({ kind: "degree", says: bits.join(", ") });
  }
  if (rules.match?.length) {
    out.push({ kind: "match", says: `${rules.match.join(", ")} must agree across it` });
  }
  return out;
}
