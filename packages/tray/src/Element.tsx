/** One thing, described — a block, a relationship, or a definition.
 *
 *  **One panel, because there is one set of questions.** What it *is*, how it
 *  *draws*, what it *asks* and what it *carries*. A definition answers every
 *  one of those and so does a usage, one layer apart: `Block.looks` and
 *  `Definition.components` are the same bag, and `look` writes into whichever
 *  it is handed. So this asks the graph which it has and swaps three rows.
 *
 *  **It was two panels.** They had the same three columns, the same rules and
 *  fields sections and the same pickers, and picking a definition opened a
 *  second surface asking the questions the first one already asked.
 *
 *  **Two columns.** What it *is* on the left. How it *draws* on the right — a
 *  rail of questions, the card, then the answers to whichever question is lit,
 *  because the card is what every answer is read against and it belongs beside
 *  the chip that selected them rather than off in a column of its own.
 *
 *  A pure function of its props: it holds a draft and nothing else, and every
 *  change leaves as an action name. */

import { type CSSProperties, useState } from "react";
import { BLOCK_MODULES, VALUE_FORMS, alias_of, config_of, def_of, isa,
         kind_word, may_retype, module_named, module_of, role_of, shown_name,
         type Act, type Field, type FieldDef,
         type Graph, type Id, type Role } from "@mnd/core";
import { Icon, type IconName } from "@mnd/theme";
import { Looks } from "./Looks";
import { Body, Line } from "./Body";
import { Rules } from "./Rules";

/** Every id the base packages ship, block kinds and relations alike. A
 *  definition carrying one of these **is** a base kind rather than something
 *  refining one. */
const BASE_IDS: readonly string[] = [...BLOCK_MODULES, "line", "directed"];

/** The mark a role wears while nobody has picked one. **The tray's own copy**:
 *  the same nine the stage draws, restated here because a surface may not
 *  reach another surface for them. */
const ROLE: Record<Role, IconName> = {
  block: "role_leaf", container: "role_container", folder: "role_folder",
  resource: "role_resource", reference: "role_reference", interface: "role_interface",
  group: "role_group", grid: "role_table", note: "role_note",
};

export type ElementProps = {
  graph: Graph;
  /** The one thing being described. **A block, a relationship or a definition**
   *  — the id says which, so nothing above has to tell this which panel to open. */
  id: Id;
  onAct: Act;
};

/** What is being described, and what it carries. **Fields are asked once**, so
 *  no reader below has to know which of the three it got. */
function held(graph: Graph, id: Id) {
  const def = graph.defs[id];
  if (def) return { def, block: null, edge: null, fields: def.fields ?? [] };
  const b = graph.blocks[id];
  if (b) return { def: null, block: b, edge: null, fields: b.fields ?? [] };
  const e = graph.edges[id];
  if (e) return { def: null, block: null, edge: e, fields: e.fields ?? [] };
  return null;
}

export function Element({ graph, id, onAct }: ElementProps) {
  const [adding, set_adding] = useState("");
  const [form, set_form] = useState<string>("text");
  const [tagging, set_tagging] = useState("");

  const it = held(graph, id);
  if (!it) return <p className="empty">that is not here any more</p>;
  const { def: d, block: b, edge } = it;

  /** **A package resists editing.** A definition carrying a `from` is somebody
   *  else's vocabulary and every action refuses to write it, so the panel says
   *  so rather than offering controls that will be turned down. */
  const borrowed = !!d?.from;
  /** The base kind this is, or the base kind its usages are. */
  const kind = d ? module_named(graph, d.id)
    : b ? module_of(graph, id) : edge?.module ?? "relation";
  const role: Role | null = b ? role_of(graph, id) : null;
  const kind_mark = (role ? ROLE[role] : ROLE[(kind as Role)] ?? "role_leaf") as IconName;

  /** **What this one says, as against what its chain says.** The same two
   *  readers for both holders — a definition's own statement is its
   *  `components`, a usage's is its `looks`, and they are the same bag. */
  const said = (key: string, name: string) =>
    d ? d.components?.[key]?.[name] : b?.looks?.[key]?.[name];
  /** What it inherits, for the answers it has not overridden. **Shown in the
   *  picker rather than left blank**: an empty one used to read as the trait's
   *  own name, so a card drawing itself green offered a box saying *slot*. */
  const chain = (key: string, name: string) => {
    const from = config_of(graph, d ? d.extends : def_of(graph, id), key)[name];
    return from === undefined || from === null ? "" : String(from);
  };
  /** What it actually draws as. **This is what the card is painted from**, so
   *  the preview and the drawing cannot disagree about what a trait resolves to. */
  const now = (key: string, name: string, fallback: string) =>
    String(said(key, name) ?? chain(key, name) ?? "") || fallback;

  /** **One list, and it is the one the vocabulary folder shows.** The picker
   *  used to read a home-scoped list while the folder read all of `graph.defs`,
   *  which is two answers to *which definitions can I use* — and `def_of`
   *  resolves by id globally, so the narrower one was never the truth. */
  const all = Object.values(graph.defs)
    .filter((x) => x.group === (edge ? "relation" : "block"))
    .sort((a, b2) => a.name.localeCompare(b2.name));
  /** **Only what this could become.** A subtype refines what a thing is like
   *  and never what it is, so the picker offers its own kind — and a block, a
   *  folder and a resource count as one kind between them. **The base kinds are
   *  not subtypes of themselves**: what one is, the mark beside it already says. */
  const subtypes = all.filter((x) => !BASE_IDS.includes(x.id))
    .filter((x) => !b || may_retype(graph, id, x.id));
  const named = b?.type ?? edge?.type;
  const subtype = named && subtypes.some((x) => x.id === named) ? named : "";
  /** What a definition may extend: anything but itself and anything below it,
   *  so a chain cannot be pointed back at its own head. */
  const roots = d
    ? all.filter((x) => x.id !== d.id && !isa(graph, x.id).some((up) => up.id === d.id))
    : [];

  const tags = b?.tags ?? [];
  const retag = (next: string[]) => onAct("tag", { ids: [id], tags: next });
  /** How many blocks name this definition, so unpinning says what it reaches. */
  const uses = d ? Object.values(graph.blocks).filter((x) => x.type === d.id).length : 0;
  const used = uses === 1 ? "1 block" : `${uses} blocks`;
  const mark = (now("card", "icon", "") || kind_mark) as IconName;
  /** **The subtype where one is named, the base kind otherwise.** Always a
   *  word, because `label` is what decides whether it is written. */
  const word = d ? d.name
    : (named ? graph.defs[named]?.name : undefined) ?? kind;
  const shows = config_of(graph, d ? d.id : def_of(graph, id), "card")["shows"];
  const shows_fields = Array.isArray(shows) && shows.length > 0;
  const label = d ? d.name : shown_name(graph, id);

  /** **A definition declares a schema; a usage answers it.** One control,
   *  because `field` already takes whichever holder it is given. */
  const add_field = () => {
    if (!adding.trim()) return;
    onAct("field", d ? { holder: id, name: adding.trim(), form }
                     : { holder: id, name: adding.trim(), value: "" });
    set_adding("");
  };

  /** **The drawing, and only the drawing.** The one thing on the panel that is
   *  a picture rather than an answer, so it is never a table. Built here and
   *  placed by `Looks`, which owns what it is being read against. */
  const drawing = b || d ? (
    <div className="preview">
      <div className="preview-card"
           data-slot={said("style", "hue") === undefined
             ? now("style", "slot", "neutral") : "tint"}
           style={{
             ...(said("style", "hue") === undefined ? {} : {
               "--card-h": now("style", "hue", "200"),
               "--card-c": `calc(var(--tint-ceiling) * ${now("style", "intensity", "0.65")})`,
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
        <span className="preview-role" data-role={role ?? kind}>
          <Icon name={mark} size={11} />
        </span>
        {b?.locked
          ? <span className="preview-locked"><Icon name="locked" size={11} /></span>
          : null}
        {now("card", "label", "inside") !== "none" ? (
          <div className="preview-head">
            <span className="preview-named">
              <span className="preview-label">{label}</span>
              {b && alias_of(graph, id)
                ? <span className="preview-alias">{alias_of(graph, id)}</span> : null}
            </span>
            {/* **The subtype, and never the word the mark already says.** A
                folder wearing the folder mark beside the word *folder* says it
                twice. */}
            {word && word !== (role ?? kind)
              ? <span className="preview-kind">{word}</span> : null}
          </div>
        ) : null}
        {shows_fields && it.fields.length ? (
          <dl className="preview-fields">
            {it.fields.slice(0, 2).map((f) => (
              <div key={f.name}><dt>{f.name}</dt>
                <dd>{(f as Field).value ?? ""}</dd></div>
            ))}
          </dl>
        ) : null}
      </div>
      {now("card", "label", "inside") === "below" ? (
        <span className="preview-below">{label}</span>
      ) : null}
    </div>
  ) : null;

  return (
    <div className={["element", d ? "definition" : ""].filter(Boolean).join(" ")}>
      <div className="element-cols">
        {/* **What it is**, top to bottom in the order somebody answers it. */}
        <div className="col what">
          <Body>
            {/* **One line, because base and subtype are one answer.** The kind
                it rests on is fixed and wears its own mark; what refines it is
                the only part anybody picks. **No "untyped"** — nothing refining
                it means it *is* its base kind, which the empty option says. */}
            <Line label={d ? "kind" : "type"} className="type">
              <span className="base"
                    title={d ? "the base kind its usages are" : "the base kind this rests on"}>
                <Icon name={kind_mark} size={12} />{kind}
              </span>
              <span className="into">›</span>
              {d ? (
                <select value={d.extends ?? ""} title="what it refines" aria-label="extends"
                        disabled={borrowed}
                        onChange={(e) => onAct("define", { name: d.name,
                                                           extends: e.target.value })}>
                  <option value="">nothing</option>
                  {roots.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              ) : (
                <select value={subtype} title="what refines it" aria-label="subtype"
                        disabled={!subtypes.length}
                        onChange={(e) => onAct("retype", { id, type: e.target.value || kind })}>
                  <option value="">base</option>
                  {subtypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              )}
            </Line>

            {/* **A definition's name is read-only.** `def_id` slugs a name into
                the id, so renaming one would mint a second definition and leave
                every usage naming the first. Retiring it is `unpin`.
                **A relationship has no label of its own** — what it is called is
                its definition's name. */}
            <Line label="name" className="identity">
              {d
                ? <><input value={d.name} readOnly aria-label="name" />
                    <span className="alias">{d.id}</span></>
                : <><input value={b?.label ?? (edge?.type ? graph.defs[edge.type]?.name ?? "" : "")}
                           placeholder={b ? kind_word(graph, b) : "unnamed"} aria-label="name"
                           onChange={(e) => onAct("rename", { id, label: e.target.value })} />
                    <span className="alias">{alias_of(graph, id)}</span></>}
            </Line>

            {/* Which vocabulary it belongs to. Read-only: `from` is declared by
                whoever wrote the package, never stamped on the way in. */}
            {d ? (
              <Line label="from"
                    tip="Which vocabulary this belongs to. Only your own may be edited.">
                <span className="chip from">{d.from ?? "this workspace"}</span>
              </Line>
            ) : null}

            {/* **The box.** A definition already says how a thing reads, so
                standing in for a base kind is one more thing it may say — not a
                system, and not a second vocabulary. Its own row, because it is
                the one control here that changes something other than the thing
                being described. Only its own kind, and never a package's. */}
            {d && !borrowed && d.group === "block" && !BASE_IDS.includes(d.id) ? (
              <Line label="default"
                    tip={`Every ${kind} that names nothing draws from this one instead of the base.`}>
                <label className="check">
                  <input type="checkbox" checked={!!d.default}
                         onChange={(e) => onAct("default", { id,
                                                             on: e.target.checked ? "yes" : "no" })} />
                  every plain {kind} follows this
                </label>
              </Line>
            ) : null}

            {/* **Unpin is here because there is nowhere else to reach it.** One
                act and lossless: what this says goes back into every block that
                names it, and only then is it dropped. */}
            {d && !borrowed && !BASE_IDS.includes(d.id) ? (
              <Line label="pin"
                    tip="Dissolve this back into everything that names it, then drop it. Nothing about how they draw changes.">
                <button className="undo-pin" onClick={() => onAct("unpin", { id })}>
                  <Icon name="remove" size={12} /> unpin
                </button>
                <span className="says">gives it back to the {used} that name it</span>
              </Line>
            ) : null}

            {/* **Words, carrying nothing.** A tag says what a thing is like; a
                definition says what it is made of. Two different jobs, so a tag
                has no fields, no style and no chain. */}
            {b ? (
              <Line label="tags" className="tags">
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
              </Line>
            ) : null}

            {/* **What has been done to it**, as against what it is. Model data
                on the element, so each travels and each undoes. */}
            {b ? (
              <Line label="shows" className="toggles">
                <button className={b.labelled === false ? "" : "on"}
                        onClick={() => onAct("label", { ids: [id],
                                                        shown: b.labelled === false ? "yes" : "no" })}>
                  <Icon name={b.labelled === false ? "label_off" : "label_on"} size={12} /> name
                </button>
                <button className={b.locked ? "on" : ""}
                        onClick={() => onAct("lock", { ids: [id], fixed: b.locked ? "no" : "yes" })}>
                  <Icon name={b.locked ? "locked" : "unlocked"} size={12} /> lock
                </button>
              </Line>
            ) : null}
          </Body>

          {borrowed ? (
            <p className="not-yet">
              This comes from {d!.from}, and a package resists editing. Extend it
              with a subtype instead — the subtype is yours to change.
            </p>
          ) : null}
        </div>

        {/* **How it draws.** A rail of questions, the drawing, and the answers
            to whichever is lit — every one of them this element's own last word
            over whatever its chain said. */}
        <div className="col looks-col">
          {b || d ? (
            <Looks id={id} said={said} now={now} chain={chain} onAct={onAct} card={drawing} />
          ) : (
            /** A relationship carries a definition exactly as a block does and
             *  there is nowhere to say so yet — ST.15. Said plainly rather than
             *  left as an empty half. */
            <p className="not-yet">a relationship draws from its module and its
              definition. Customising one is not built yet.</p>
          )}
        </div>
      </div>

      {/* **What must be true**, before what it happens to carry. */}
      <Body head="rules"
            note={d ? "what it asks of every usage" : b ? "what it is held to" : "from the chain"}>
        {b || d ? <Rules graph={graph} holder={id} />
                : <p className="empty">a relationship states its rules on its definition — ST.15</p>}
      </Body>

      {/* **What it carries.** Last, because a value is the detail and everything
          above it is what the thing is. **A definition declares the schema and a
          usage answers it**, which is the one row that differs. */}
      <Body head="fields" note={it.fields.length ? `${it.fields.length}` : ""}>
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
                 onKeyDown={(e) => { if (e.key === "Enter") add_field(); }} />
          <select value={form} title="what sort of value" disabled={borrowed}
                  onChange={(e) => set_form(e.target.value)}>
            {VALUE_FORMS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <button onClick={add_field} disabled={borrowed || !adding.trim()}>
            <Icon name="add" />
          </button>
        </Line>
      </Body>
    </div>
  );
}
