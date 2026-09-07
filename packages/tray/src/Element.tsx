/** One element, and everything it says about itself.
 *
 *  **The first tab, and the only place a thing is described rather than
 *  listed.** What it is called, what it names, what it is like, how it draws,
 *  and what it carries — read top to bottom in that order, because that is the
 *  order somebody answers them in.
 *
 *  A pure function of its props, like every other surface here: it holds a
 *  draft and nothing else, and every change leaves as an action name. */

import { useState } from "react";
import { EMPHASES, SLOTS, VALUE_FORMS, VOICES, WEIGHTS, alias_of, config_of,
         defs_in_scope, def_of, isa, kind_word, may_retype, module_of,
         type Act, type Field, type Graph, type Id } from "@mnd/core";
import { Icon, names, type IconName } from "@mnd/theme";

/** What one element may be told about how it draws, and where each answer
 *  lives. **`card` is what it is made of and `style` is what it looks like** —
 *  the same two keys a definition speaks in, so the element's answers layer
 *  over the chain's without translating. */
const TRAITS: { key: "card" | "style"; name: string; word: string; tip: string;
                of: readonly string[] }[] = [
  { key: "style", name: "slot", word: "colour", of: SLOTS,
    tip: "Which of six hue families the theme colours this with. What each one "
       + "looks like is the theme's to decide, so a definition never names a "
       + "colour — retro paints primary green, modern paints it teal." },
  { key: "style", name: "emphasis", word: "emphasis", of: EMPHASES,
    tip: "How loudly that family is taken: quiet steps the line and the ink "
       + "back, strong takes the family one step further out." },
  { key: "style", name: "weight", word: "border", of: WEIGHTS,
    tip: "How heavy the border is." },
  { key: "style", name: "voice", word: "name", of: VOICES,
    tip: "How the name itself is set — light, ordinary or bold." },
];

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
  /** **Only what this could become.** A subtype refines what a thing is like
   *  and never what it is, so the picker offers its own kind — and a block, a
   *  folder and a resource count as one kind between them. */
  const scope = defs_in_scope(graph, b ? id : graph.edges[id]?.from ?? graph.root)
    .filter((d) => d.group === (graph.edges[id] ? "relation" : "block"))
    .filter((d) => !b || may_retype(graph, id, d.id));
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

  const tags = b?.tags ?? [];
  const retag = (next: string[]) => onAct("tag", { ids: [id], tags: next });

  const add_value = () => {
    if (!adding.trim()) return;
    onAct("field", { holder: id, name: adding.trim(), value: "" });
    set_adding("");
  };

  return (
    <div className="element">
      {/* **What it is called, and what it names.** The alias rides beside the
          name here as it does everywhere else, so the row you are editing is
          the row you picked. */}
      <div className="row identity">
        <label>name</label>
        <input value={b?.label ?? ""} placeholder={b ? kind_word(graph, b) : ""}
               aria-label="name"
               onChange={(e) => onAct("rename", { id, label: e.target.value })} />
        <span className="alias">{alias_of(graph, id)}</span>
      </div>

      <div className="row">
        <label>type</label>
        {/* **No "untyped".** `block` is the base kind and a block that names
            nothing is one, so what it resolves through is what is shown — the
            field being absent is how a file stays small, never a second sort of
            thing to pick. */}
        <select value={def_of(graph, id) ?? ""} title="which definition this names"
                onChange={(e) => onAct("retype", { id, type: e.target.value })}>
          {scope.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {/* What it resolves through, nearest last — the base it came from, then
            whatever refines it. Read-only until pinning writes into it. */}
        <span className="chain" title="what it resolves through, base first">
          {[...isa(graph, def_of(graph, id)).map((d) => d.name).reverse(), "this"]
            .join(" › ")}
        </span>
      </div>

      {/* **Words, carrying nothing.** A tag says what a thing is like; a
          definition says what it is made of. Two different jobs, so a tag has
          no fields, no style and no chain. */}
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

      {/* **What has been done to it**, as against what it is. Each one is model
          data on the element, so it travels and it undoes. */}
      {b ? (
        <div className="row toggles">
          <label>shows</label>
          <span className="chips">
            <button className={b.labelled === false ? "" : "on"}
                    onClick={() => onAct("label", { ids: [id],
                                                    shown: b.labelled === false ? "yes" : "no" })}>
              <Icon name={b.labelled === false ? "label_off" : "label_on"} size={12} /> label
            </button>
            <button className={b.locked ? "on" : ""}
                    onClick={() => onAct("lock", { ids: [id], fixed: b.locked ? "no" : "yes" })}>
              <Icon name="locked" size={12} /> lock
            </button>
          </span>
        </div>
      ) : null}

      {/* **How it draws, over what its chain said.** Every one of these is the
          element's own last word — set here it changes this block and nothing
          else, and pinning is what turns the set of them into something other
          blocks can name. A trait it has not been told falls back, and the
          picker says so by showing nothing chosen. */}
      {b ? (
        <div className="row look">
          <label>look</label>
          <span className="chips">
            {/* **Every picker says what it is.** Unlabelled, five boxes reading
                `slot`, `emphasis`, `weight`, `voice`, `shape` are five words
                nobody can act on: they name the questions where the answers
                should be, and the one that decides a card's colour is the one
                whose name says least. So the word sits over the box, and the
                box says what is inherited while nothing has been chosen. */}
            <label className="trait" title={`mark — ${module_of(graph, id)} unless said otherwise`}>
              <span className="trait-word">mark</span>
              <select value={String(said("card", "icon") ?? "")} aria-label="mark"
                      onChange={(e) => onAct("look", { ids: [id], key: "card",
                                                       name: "icon", value: e.target.value })}>
                <option value="">inherit</option>
                {names().filter((n: IconName) => n.startsWith("role_"))
                  .map((n: IconName) => <option key={n} value={n}>{n.slice(5)}</option>)}
              </select>
            </label>
            {TRAITS.map((t) => (
              <label key={t.name} className="trait"
                     title={`${t.word} — ${t.tip}`
                          + `

inherited: ${chain(t.key, t.name) || "the app’s own default"}`}>
                <span className="trait-word">{t.word}</span>
                <select value={String(said(t.key, t.name) ?? "")} aria-label={t.word}
                        onChange={(e) => onAct("look", { ids: [id], key: t.key,
                                                         name: t.name, value: e.target.value })}>
                  {/* **Empty is *inherit*, and that is the whole of it.** One
                      word, the same word in every picker: what it resolves to
                      belongs in the tip, not in the option, and spelling it out
                      per picker made each one read as a different sort of
                      control. */}
                  <option value="">inherit</option>
                  {t.of.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            ))}
          </span>
        </div>
      ) : null}

      {/* **What it carries.** Last, because a value is the detail and the rest
          of this panel is what the thing is. */}
      <div className="fields">
        <table className="values">
          <tbody>
            {it.fields.map((f: Field) => (
              <tr key={f.name}>
                <td className="key" title={f.form}>{f.name}</td>
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
              <tr className="empty"><td colSpan={3}>it carries no values yet</td></tr>
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
      </div>
    </div>
  );
}
