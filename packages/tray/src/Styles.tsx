/** How one thing draws: **what it is on the left, how it is painted on the
 *  right, and the drawing at the head of the column that decides it.**
 *
 *  Left: the card itself, then the four answers that say what it *is* — its
 *  name, the type it names, the label that names its definition, and the three
 *  boxes that put it in the vocabulary, fix it where it sits, or make it what
 *  every plain block of its kind follows.
 *
 *  Right: five groups, and every row in one is a question about the same part
 *  of the card — the name, the label, the border, the fill, the mark. **The rail
 *  narrows what is listed; it does not navigate.** Nine questions at once was
 *  always too many to read; five named parts is how many parts a card has.
 *
 *  A pure function of its props: it holds which group is lit and a draft name,
 *  and every change leaves as an action name. */

import { useState } from "react";
import { ALIGNS, BLOCK_MODULES, BORDERS, CONTRASTS, DISPLAYS, FAMILIES, FILLS,
         FONTS, HUE, INTENSITY, OPACITY, WEIGHTS, WIDTHS, alias_of, config_of,
         isa, kind_word, may_retype, module_named, module_of, role_of,
         shown_name, type Act, type Definition, type Graph, type Id,
         type Role } from "@mnd/core";
import { Icon, names, type IconName } from "@mnd/theme";
import { Body, Line } from "./Body";
import { Card } from "./Card";
import { held, reading } from "./holder";

/** Every id the base packages ship, block kinds and relations alike. A
 *  definition carrying one of these **is** a base kind rather than something
 *  refining one. */
const BASE_IDS: readonly string[] = [...BLOCK_MODULES, "line", "directed"];

/** What the shipped floor calls itself, for the path a base definition sits at. */
const BASE = "base";

/** The mark a role wears while nobody has picked one. **The tray's own copy**:
 *  the same nine the stage draws, restated here because a surface may not reach
 *  another surface for them. */
const ROLE: Record<Role, IconName> = {
  block: "role_leaf", container: "role_container", folder: "role_folder",
  resource: "role_resource", reference: "role_reference", interface: "role_interface",
  group: "role_group", grid: "role_table", note: "role_note",
};

/** The parts of a card, and the questions each part is asked. **The last two
 *  are one question twice**: which mark sits in which corner — what sort of
 *  thing it is, and whatever else its vocabulary wants to flag. */
const GROUPS = ["name", "label", "border", "fill", "icon", "mark"] as const;
export type Group = (typeof GROUPS)[number];

type Question = { word: string; key: "card" | "style"; name: string; tip: string;
                  of: readonly { value: string; word: string }[] };

const plain = (of: readonly string[]) => of.map((v) => ({ value: v, word: v }));

const ROWS: Record<Group, Question[]> = {
  name: [
    { word: "font", key: "style", name: "name_font",
      tip: "How the name is faced. One at a time — italic and struck through at "
         + "once is not sayable, and nothing has wanted it.", of: plain(FONTS) },
    { word: "weight", key: "style", name: "name_weight",
      tip: "How heavily the name is set.", of: plain(WEIGHTS) },
    { word: "contrast", key: "style", name: "name_contrast",
      tip: "How far the name stands out from the card behind it.",
      of: plain(CONTRASTS) },
    { word: "align", key: "card", name: "align",
      tip: "Which end of the card its writing reads from.", of: plain(ALIGNS) },
  ],
  label: [
    { word: "font", key: "style", name: "label_font",
      tip: "How the label is faced.", of: plain(FONTS) },
    { word: "weight", key: "style", name: "label_weight",
      tip: "How heavily the label is set.", of: plain(WEIGHTS) },
    { word: "contrast", key: "style", name: "label_contrast",
      tip: "How far the label stands out from the card behind it.",
      of: plain(CONTRASTS) },
    { word: "display", key: "card", name: "label",
      tip: "Where the label sits: over the card, in it, under it, or nowhere. "
         + "The label is the subtype where one is named, the base kind otherwise.",
      of: plain(DISPLAYS) },
  ],
  border: [
    { word: "width", key: "style", name: "border_width",
      tip: "How heavy the border is. Three steps, named on the ramp.",
      of: plain(WIDTHS) },
    { word: "contrast", key: "style", name: "border_contrast",
      tip: "How far the border stands out from the card behind it.",
      of: plain(CONTRASTS) },
    { word: "style", key: "style", name: "border_style",
      tip: "How the border is drawn. `none` keeps the card's box and drops "
         + "only the line.", of: plain(BORDERS) },
  ],
  fill: [
    { word: "pattern", key: "style", name: "fill",
      tip: "What fills the card behind its writing. Pattern, never colour — a "
         + "hatch follows whatever family or hue the card was given.",
      of: plain(FILLS) },
    { word: "family", key: "style", name: "family",
      tip: "Which family the theme paints this with. A family is a preset over "
         + "the two numbers below, and the theme is what picks it — so retro "
         + "paints primary green where modern paints it teal.",
      of: plain(FAMILIES) },
  ],
  icon: [],
  mark: [],
};

/** The two rows that are a mark rather than a word, and the corner each sits
 *  in. **One control, twice** — a mark is a picture and a list of names is not
 *  how anybody picks one. */
const MARKS: Record<"icon" | "mark", { name: string; tip: string; inherit: string }> = {
  icon: { name: "icon",
    tip: "The mark drawn in its top corner instead of the one its role would.",
    inherit: "its role’s own mark" },
  mark: { name: "mark",
    tip: "A quiet mark in its bottom corner — whatever this vocabulary wants to "
       + "flag about a usage. It says nothing to the engine.",
    inherit: "no mark at all" },
};

export type StylesProps = { graph: Graph; id: Id; onAct: Act };

/** One question's answers. **Inherit is a choice, not an empty box** — it is
 *  what most elements are, so it is offered first and its tip says what it
 *  takes. */
function Options({ q, said, chain, set, off }: {
  q: Question;
  said: (key: string, name: string) => unknown;
  chain: (key: string, name: string) => string;
  set: (key: "card" | "style", name: string, value: string) => void;
  off: boolean;
}) {
  const on = (v: string | undefined) => said(q.key, q.name) === v;
  return (
    <Line label={q.word} tip={q.tip} off={off} className="options">
      <button className={on(undefined) ? "opt on" : "opt"} disabled={off}
              title={`inherit — ${chain(q.key, q.name) || "the app’s own default"}`}
              onClick={() => set(q.key, q.name, "")}>inherit</button>
      {q.of.map((c) => (
        <button key={c.value} title={c.word} disabled={off}
                className={on(c.value) ? "opt on" : "opt"}
                onClick={() => set(q.key, q.name, c.value)}>{c.word}</button>
      ))}
    </Line>
  );
}

/** Where a definition sits in the definitions folder, as a path. **The tree's
 *  own three sections**, so the picker and the folder say one thing. */
function where(d: Definition): string {
  return d.from === BASE ? `default/${d.name}`
    : d.from ? `packages/${d.from}/${d.name}`
    : `workspace/${d.name}`;
}

export function Styles({ graph, id, onAct }: StylesProps) {
  const [group, set_group] = useState<Group>("name");
  const [draft, set_draft] = useState("");

  const it = held(graph, id);
  if (!it) return <p className="empty">that is not here any more</p>;
  const { def: d, block: b, edge, borrowed } = it;
  const { said, chain, now } = reading(graph, id, it);

  /** The base kind this is, or the base kind its usages are. */
  const kind = d ? module_named(graph, d.id)
    : b ? module_of(graph, id) : edge?.module ?? "relation";
  const role: Role | null = b ? role_of(graph, id) : null;
  const kind_mark = (role ? ROLE[role] : ROLE[kind as Role] ?? "role_leaf") as IconName;

  /** **One list, and it is the one the definitions folder shows.** `def_of`
   *  resolves by id globally, so a narrower list was never the truth. */
  const all = Object.values(graph.defs)
    .filter((x) => x.group === (edge ? "relation" : "block"))
    .sort((a, z) => a.name.localeCompare(z.name));
  /** **Only what this could become.** A subtype refines what a thing is like
   *  and never what it is, so the picker offers its own kind — and a block, a
   *  folder and a resource count as one kind between them. */
  const subtypes = all.filter((x) => !BASE_IDS.includes(x.id))
    .filter((x) => !b || may_retype(graph, id, x.id));
  const named = b?.type ?? edge?.type;
  const subtype = named && subtypes.some((x) => x.id === named) ? named : "";
  /** What a definition may extend: anything but itself and anything below it,
   *  so a chain cannot be pointed back at its own head. */
  const roots = d
    ? all.filter((x) => x.id !== d.id && !isa(graph, x.id).some((up) => up.id === d.id))
    : [];

  /** **The definition this block made, as against one it merely names.** Only
   *  its own may be unpinned, renamed by the label, or made a default. */
  const own = d ?? (named ? graph.defs[named] : undefined);
  const pinned = !!own && !own.from && !BASE_IDS.includes(own.id);
  const may_default = !!own && pinned && own.group === "block"
    && module_named(graph, own.id) === kind;

  const shows = config_of(graph, d ? d.id : b ? id : undefined, "card")["shows"];
  const label = d ? d.name : shown_name(graph, id);
  const word = d ? d.name : (named ? graph.defs[named]?.name : undefined) ?? kind;
  const set = (key: "card" | "style", name: string, value: string) =>
    onAct("look", { ids: [id], key, name, value });
  /** **A relationship carries a definition exactly as a block does, and there is
   *  nowhere to say so yet** — ST.15. Said plainly rather than left as a column
   *  of controls that would be turned down. */
  const paints = !!(b || d);

  /** **A hue is the family question asked finer**, so while one is set the
   *  families are unreachable rather than merely losing: a chip that highlights
   *  and changes nothing is worse than one that is plainly out. */
  const tinted = said("style", "hue") !== undefined;
  /** Which groups this element has answered for itself, so what has been
   *  customised is visible without opening each one. */
  const touched = (g: Group) =>
    ROWS[g].some((q) => said(q.key, q.name) !== undefined)
    || (g === "fill" && (tinted || said("style", "opacity") !== undefined))
    || (g === "icon" && said("card", "icon") !== undefined)
    || (g === "mark" && said("card", "mark") !== undefined);

  return (
    <div className={["styles", d ? "definition" : ""].filter(Boolean).join(" ")}>
      {/* **What it is.** The drawing first, because every answer under it is
          read against the drawing. */}
      <div className="col what">
        <div className="styles-head">
          {paints ? (
            <Card label={label} alias={b ? alias_of(graph, id) : undefined}
                  kind={word} icon={(now("card", "icon", "") || kind_mark) as IconName}
                  role={role ?? kind} mark={now("card", "mark", "")}
                  fields={it.fields} shows={Array.isArray(shows) && shows.length > 0}
                  said={said} now={now} />
          ) : null}
        </div>

        <Body>
          {/* **A definition's name is read-only.** `def_id` slugs a name into
              the id, so renaming one would mint a second definition and leave
              every usage naming the first. Retiring it is unpinning it. */}
          <Line label="name" tip="What this is called, as the card writes it.">
            {d
              ? <><input value={d.name} readOnly aria-label="name" />
                  <span className="alias">{d.id}</span></>
              : <><input value={b?.label ?? ""} aria-label="name"
                         placeholder={b ? kind_word(graph, b) : "unnamed"}
                         onChange={(e) => onAct("rename", { id, label: e.target.value })} />
                  <span className="alias">{alias_of(graph, id)}</span></>}
          </Line>

          {/* **What it is, and it is not a choice.** A subtype refines what a
              thing is like and never what it is, so the base kind is read
              rather than picked — and it wears the mark every surface draws
              it with. */}
          <Line label="type" className="type"
                tip="The base kind this rests on. A subtype refines it; nothing changes it.">
            <span className="base"><Icon name={kind_mark} size={12} />{kind}</span>
          </Line>

          {/* **Which definition refines it, by where it sits.** The path is the
              definitions folder's own — `default/note`, `workspace/Pump`,
              `packages/acme/Valve` — so what the picker offers and what the
              tree shows are one list said the same way. */}
          <Line label="subtype" className="subtype"
                tip="The definition this draws through. The path is where it sits in the definitions folder.">
            {d ? (
              <select value={d.extends ?? ""} aria-label="extends" disabled={borrowed}
                      onChange={(e) => onAct("define", { name: d.name,
                                                         extends: e.target.value })}>
                <option value="">nothing</option>
                {roots.map((x) => <option key={x.id} value={x.id}>{where(x)}</option>)}
              </select>
            ) : (
              <select value={subtype} aria-label="subtype" disabled={!subtypes.length}
                      onChange={(e) => onAct("retype", { id, type: e.target.value || kind })}>
                <option value="">default/{kind}</option>
                {subtypes.map((x) => <option key={x.id} value={x.id}>{where(x)}</option>)}
              </select>
            )}
          </Line>

          {/* **The label names the pin.** What the card writes as its type is
              what the definition is called, so one word answers both — and
              ticking *pin* below is what files it under that name. */}
          {b ? (
            <Line label="label"
                  tip="What sort of thing this is. Pinning files a definition under this name.">
              <input value={pinned ? own!.name : draft} aria-label="label"
                     placeholder={kind} readOnly={pinned}
                     onChange={(e) => set_draft(e.target.value)} />
            </Line>
          ) : null}

          {/* **Two boxes, and each says something different.** Whether this is
              in the vocabulary, and whether every plain one of its kind follows
              it. Both are about the definition the label names. */}
          {b || pinned ? (
          <Line label="pin" className="marks"
                tip="Whether this is in the vocabulary, and what its kind follows.">
            {b || pinned ? (
              <label className="check" title="Keep this look as a definition anything can name">
                <input type="checkbox" checked={pinned} disabled={borrowed}
                       onChange={(e) => e.target.checked
                         ? onAct("pin", { id, name: draft.trim() || kind })
                         : onAct("unpin", { id: own!.id })} />
                pin block
              </label>
            ) : null}
            <label className="check"
                   title={`Every ${kind} that names nothing draws from this one instead of the base`}>
              <input type="checkbox" checked={!!own?.default} disabled={!may_default}
                     onChange={(e) => onAct("default", { id: own!.id,
                                                         on: e.target.checked ? "yes" : "no" })} />
              make default
            </label>
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

      {/* **How it draws.** The rail sits level with the card, and the answers to
          whichever part is lit run under both. */}
      <div className="col draws">
        <div className="styles-head">
          {/* **The rail says what it is a rail of.** Beside a column of what
              the thing *is*, five words on their own read as five more
              answers rather than as the parts of one picture. */}
          <h4 className="rail-said">style</h4>
          <div className="filters styles-rail">
            {paints ? GROUPS.map((g) => (
              <button key={g} className={[group === g ? "on" : "", touched(g) ? "said" : ""]
                        .filter(Boolean).join(" ")}
                      onClick={() => set_group(g)}>{g}</button>
            )) : null}
          </div>
        </div>

        {!paints ? (
          <p className="not-yet">a relationship draws from its module and its
            definition. Customising one is not built yet.</p>
        ) : null}

        {paints ? (
        <Body>
          {ROWS[group].map((q) => (
            <Options key={q.name} q={q} said={said} chain={chain} set={set}
                     off={group === "fill" && q.name === "family" && tinted} />
          ))}

          {/* **A hue sits above the families and takes precedence over them.**
              The theme still owns every lightness, which is what keeps a card
              readable in all three. */}
          {group === "fill" ? (
            <Line label="color" className="sliders"
                  tip="The angle this paints itself at, and how far it is taken. The theme still owns every lightness.">
              <input type="range" aria-label="hue" min={HUE.min} max={HUE.max} step={1}
                     className="hue" value={Number(now("style", "hue", "200"))}
                     onChange={(e) => set("style", "hue", e.target.value)} />
              <input type="range" aria-label="intensity" min={INTENSITY.min}
                     max={INTENSITY.max} step={0.05} className="intensity"
                     value={Number(now("style", "intensity", "0.65"))}
                     onChange={(e) => set("style", "intensity", e.target.value)} />
              <button className="opt" title="give the hue back to the named family"
                      disabled={!tinted} onClick={() => set("style", "hue", "")}>clear</button>
            </Line>
          ) : null}

          {/* **Transparency is a quantity**, so it is a slider. Three named steps
              were three invented words for a number everybody already has one
              for — and the value that mattered most was a 6% wash no name would
              ever have suggested. */}
          {group === "fill" ? (
            <Line label="opacity" className="sliders"
                  tip="How opaque the fill is. The fill alone, so the writing stays readable however far the ground shows through.">
              <input type="range" aria-label="opacity" min={OPACITY.min}
                     max={OPACITY.max} step={0.02} className="opacity"
                     value={Number(now("style", "opacity", "1"))}
                     onChange={(e) => set("style", "opacity", e.target.value)} />
              <button className="opt" title="give it back to whatever it inherits"
                      disabled={said("style", "opacity") === undefined}
                      onClick={() => set("style", "opacity", "")}>clear</button>
            </Line>
          ) : null}

          {/* **Every mark this build ships**, rather than the nine a role wears.
              A name, never a drawing: one this build does not know falls back. */}
          {group === "icon" || group === "mark" ? (
            <Line label={MARKS[group].name} className="marks-grid"
                  tip={MARKS[group].tip}>
              <button className={said("card", group) === undefined ? "opt on" : "opt"}
                      title={`inherit — ${chain("card", group) || MARKS[group].inherit}`}
                      onClick={() => set("card", group, "")}>inherit</button>
              {names().map((n) => (
                <button key={n} title={n}
                        className={said("card", group) === n ? "opt mark on" : "opt mark"}
                        onClick={() => set("card", group, n)}>
                  <Icon name={n} size={13} />
                </button>
              ))}
            </Line>
          ) : null}
        </Body>
        ) : null}
      </div>
    </div>
  );
}
