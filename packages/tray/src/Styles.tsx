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
import { ALIGNS, ARROWS, BASE_PACKAGE, BORDERS, CONTRASTS, DISPLAYS, FAMILIES,
         FILLS, FONTS, HUE, INTENSITY, OPACITY, SHOWN, WEIGHTS,
         WIDTHS, alias_of, config_of, DEFAULTS, honours, isa, kind_word, may_retype,
         module_named, module_of, relation_named, role_of, shipped, shown_name,
         type Act, type Definition, type Graph, type Id, type Role } from "@mnd/core";
import { Icon, names, role_icon, type IconName } from "@mnd/theme";
import { Body, Line, Rail } from "./Body";
import { Card } from "./Card";
import { Wire } from "./Wire";
import { held, reading } from "./holder";

/** What the shipped floor calls itself, for the path a base definition sits at. */
const BASE = BASE_PACKAGE;

/** The parts of a drawing, and the questions each part is asked. **The last two
 *  are one question twice**: which mark sits in which corner — what sort of
 *  thing it is, and whatever else its vocabulary wants to flag. */
const GROUPS = ["name", "label", "head", "values", "colour", "fill",
                "border", "icon", "mark"] as const;
export type Group = (typeof GROUPS)[number];

/** What a part is called on a **run**, where the card's word is wrong for it.
 *  A run has no border; what those three keys set is its stroke. */
const AS_RUN: Partial<Record<Group, string>> = { border: "stroke" };

/** **Which component makes each part meaningful**, which is what the rail
 *  filters on. Not where the keys are validated — `style.fill` is a `style` key
 *  and a run has nothing to fill — but what the part is a part *of*.
 *
 *  A module declares the components it honours, so a relationship has no face
 *  and the groups that compose one are simply not listed for it; a run has
 *  `line` instead, and an interface has neither. */
const ASKS: Record<Group, string> = {
  name: "style", label: "card", head: "line", values: "card", colour: "style",
  fill: "card", border: "style", icon: "card", mark: "card",
};

/** The parts whose answers are drawn rather than listed — a pair of sliders, a
 *  grid of marks — so they are offered even though `ROWS` gives them none. */
const HAND: readonly Group[] = ["colour", "icon", "mark"];

type Key = "card" | "style" | "line";

/** One question. **`form` says how it is answered** — a word from a closed set
 *  is chips, and a list of field names is typed, because the names belong to
 *  this one usage and no closed set could hold them.
 *
 *  `omit` is what a **run** is not offered, where an answer that makes sense of
 *  a card makes none of a line. */
type Question = { word: string; key: Key; name: string; tip: string;
                  form?: "words";
                  omit?: readonly string[];
                  of: readonly { value: string; word: string }[] };

const plain = (of: readonly string[]) => of.map((v) => ({ value: v, word: v }));

/** The two questions every identity line is asked, under whichever component
 *  owns it. **One table, two holders** — a card asks them of `card` and a run
 *  of `line`, and the words are the same because the questions are. */
const IDENTITY = (key: Key): Question[] => [
  { word: "shown", key, name: "name",
    tip: "Whether the identity line is drawn at all — the name, or the kind and "
       + "handle that stand in where nobody has named it. Hiding it never makes "
       + "this harder to find: the tree and the tray read the name regardless.",
    of: plain(SHOWN) },
  { word: "handle", key, name: "alias",
    tip: "Whether the handle joins a name somebody did set. What stands in for a "
       + "name always carries one, which is the whole reason it has one.",
    of: plain(SHOWN) },
];

/** Which of a block's values the card writes.
 *
 *  **A card's question and nobody else's.** A run has no values to write — an
 *  edge is a join, and what a connection has to say belongs to the blocks at
 *  its ends — so this is one row rather than the three ends it used to be. */
const WRITTEN: Question[] = [
  { word: "shows", key: "card", name: "shows", form: "words",
    tip: "Which of this usage's fields the card writes under its name, in the "
       + "order it writes them. Names, separated by commas.", of: [] },
];

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
    /** **Both holders' identity questions, and the filter picks.** A block
     *  honours `card` and not `line`; a run honours `line` and not `card` — so
     *  the same two rows serve both and neither panel branches. */
    ...IDENTITY("card"),
    ...IDENTITY("line"),
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
  /** **What draws where a run ends.** Its own part of the rail, because a head
   *  is what a run has in place of a face — and the three border keys below set
   *  its stroke rather than any border, which is what they are called there. */
  head: [
    { word: "from head", key: "line", name: "from_arrow",
      tip: "What draws where the run leaves. A shape, never a direction — which "
         + "ends point is the menu's, and an end that points draws a filled head "
         + "unless told another.", of: plain(ARROWS) },
    { word: "to head", key: "line", name: "to_arrow",
      tip: "What draws where the run arrives.", of: plain(ARROWS) },
  ],
  /** Which of its own values this writes, and where. */
  values: WRITTEN,
  border: [
    { word: "width", key: "style", name: "border_width",
      tip: "How heavy the border is. Three steps, named on the ramp.",
      of: plain(WIDTHS) },
    { word: "contrast", key: "style", name: "border_contrast",
      tip: "How far the border stands out from the card behind it.",
      of: plain(CONTRASTS) },
    /** **`none` is a card's answer and not a run's.** On a card it keeps the box
     *  and drops the line, which is a thing somebody means; on a run it deletes
     *  the run, which is what deleting the run is for. */
    { word: "style", key: "style", name: "border_style",
      tip: "How the border is drawn. `none` keeps the card's box and drops "
         + "only the line.", of: plain(BORDERS), omit: ["none"] },
  ],
  /** **How loudly it is taken**, which is the one part of a drawing every
   *  module honours. A card, a port and a run are all painted from it. */
  colour: [
    { word: "family", key: "style", name: "family",
      tip: "Which family the theme paints this with. A family is a preset over "
         + "the two numbers below, and the theme is what picks it — so retro "
         + "paints primary green where modern paints it teal.",
      of: plain(FAMILIES) },
  ],
  fill: [
    { word: "pattern", key: "style", name: "fill",
      tip: "What fills the card behind its writing. Pattern, never colour — a "
         + "hatch follows whatever family or hue the card was given.",
      of: plain(FILLS) },
  ],
  icon: [],
  mark: [],
};

/** The two rows that are a mark rather than a word, and the corner each sits
 *  in. **One control, twice** — a mark is a picture and a list of names is not
 *  how anybody picks one. */
const MARKS: Record<"icon" | "mark", { name: string; tip: string }> = {
  icon: { name: "icon",
    tip: "The mark drawn in its top corner instead of the one its role would. "
       + "Nothing lit is the role's own mark." },
  mark: { name: "mark",
    tip: "A quiet mark in its bottom corner — whatever this vocabulary wants to "
       + "flag about a usage. It says nothing to the engine." },
};

export type StylesProps = { graph: Graph; id: Id; onAct: Act };

/** One question's answers.
 *
 *  **No *inherit* chip.** What a row inherits is a value like any other, so the
 *  chip it would land on is lit rather than a seventh chip standing in for it —
 *  which is one fewer control per row and says what the thing actually draws.
 *  **Lit two ways**: quietly where the answer came from the chain or from the
 *  app, and brightly where this element set it. Pressing the one it set gives
 *  it back, so nothing has to be written to say *unchanged* — a definition
 *  still holds only what somebody chose.
 *
 *  A run's `style` shows no lit chip where nothing was said, because nothing
 *  stands in: an unstyled run draws from its module, which is not a value from
 *  any of these sets. */
function Options({ q, said, chain, set, off, runs }: {
  q: Question;
  said: (key: string, name: string) => unknown;
  chain: (key: string, name: string) => string;
  set: (key: Key, name: string, value: string) => void;
  off: boolean;
  runs: boolean;
}) {
  const own = said(q.key, q.name);
  /** **A list of names is typed, not picked.** The names belong to this one
   *  usage, so there is no closed set to offer — and an empty box is what it
   *  inherits here the same way a lit chip is on every other row. */
  if (q.form === "words") {
    const value = Array.isArray(own) ? own.join(", ") : String(own ?? "");
    return (
      <Line label={q.word} tip={q.tip} off={off}>
        <input value={value} aria-label={q.name} disabled={off}
               placeholder={chain(q.key, q.name) || "none"}
               onChange={(e) => set(q.key, q.name, e.target.value)} />
      </Line>
    );
  }

  /** What it draws: what it says for itself, then what its chain says, then
   *  what the app draws where nobody has said. */
  const from_app = runs && q.key === "style"
    ? "" : DEFAULTS[`${q.key}.${q.name}` as keyof typeof DEFAULTS] ?? "";
  const at = String(own ?? "") || chain(q.key, q.name) || from_app;
  const mine = own !== undefined;
  const offered = q.of.filter((c) => !(runs && q.omit?.includes(c.value)));

  return (
    <Line label={q.word} tip={q.tip} off={off} className="options">
      {offered.map((c) => {
        const on = at === c.value;
        return (
          <button key={c.value} disabled={off}
                  className={["opt", on ? "on" : "", on && mine ? "set" : ""]
                    .filter(Boolean).join(" ")}
                  title={on && mine ? `${c.word} — set here; press again to give it back`
                    : on ? `${c.word} — inherited`
                    : c.word}
                  onClick={() => set(q.key, q.name, on && mine ? "" : c.value)}>
            {c.word}
          </button>
        );
      })}
    </Line>
  );
}

/** What this is called.
 *
 *  **A block takes it as it is typed; a relationship takes it when you are
 *  done.** Naming a run is filing a relation definition under that name and
 *  pointing the run at it — so a keystroke at a time would mint one definition
 *  per letter and leave four behind for one name. */
function Named({ id, value, placeholder, live, onAct }: {
  id: Id; value: string; placeholder: string; live: boolean; onAct: Act;
}) {
  const [draft, set_draft] = useState<string | null>(null);
  const say = (said: string) => onAct("rename", { id, name: said });
  return (
    <input value={draft ?? value} aria-label="name" placeholder={placeholder}
           onChange={(e) => {
             set_draft(e.target.value);
             if (live) say(e.target.value);
           }}
           onBlur={() => {
             if (!live && draft !== null && draft !== value) say(draft);
             set_draft(null);
           }}
           onKeyDown={(e) => {
             if (e.key === "Enter") (e.target as HTMLInputElement).blur();
             if (e.key === "Escape") set_draft(null);
           }} />
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
  /** A part that is not this thing's — the rail changed under the selection —
   *  falls back to the first one it does have. */
  const [draft, set_draft] = useState("");

  const it = held(graph, id);
  if (!it) return <p className="empty">that is not here any more</p>;
  const { def: d, block: b, edge, borrowed } = it;
  const { said, chain, now } = reading(graph, id, it);

  /** The base kind this is, or the base kind its usages are. */
  const kind = d ? (d.group === "relation" ? relation_named(graph, d.id)
                                           : module_named(graph, d.id))
    : b ? module_of(graph, id) : edge?.module ?? "line";
  /** **What this kind of thing has to say about itself.** A module declares the
   *  components it honours, so a run has no face to compose and an interface
   *  has neither a face nor two ends — and the rail lists what is left rather
   *  than offering rows that would be turned down. */
  const honoured = honours(kind);
  /** Whether what is held is drawn as a run rather than as a card. */
  const runs = honoured.includes("line");
  const asked = (g: Group) => ROWS[g].filter((q) => honoured.includes(q.key));
  /** **A part with nothing left to ask is not a part.** The component says
   *  whether the part exists at all; the rows say whether this holder has any
   *  of them — an interface honours `style` and has no `line` keys, so *values*
   *  goes rather than listing an empty panel. */
  const parts = GROUPS.filter((g) =>
    honoured.includes(ASKS[g]) && (asked(g).length > 0 || HAND.includes(g)));
  const role: Role | null = b ? role_of(graph, id) : null;
  const kind_mark = role_icon(role ?? kind);

  /** **One list, and it is the one the definitions folder shows.** `def_of`
   *  resolves by id globally, so a narrower list was never the truth. */
  const all = Object.values(graph.defs)
    .filter((x) => x.group === (runs ? "relation" : "block"))
    .sort((a, z) => a.name.localeCompare(z.name));
  /** **Only what this could become.** A subtype refines what a thing is like
   *  and never what it is, so the picker offers its own kind — and a block, a
   *  folder and a resource count as one kind between them. */
  const subtypes = all.filter((x) => !shipped(x))
    .filter((x) => !b || may_retype(graph, id, x.id));
  const named = b?.type ?? edge?.type;
  const subtype = named && subtypes.some((x) => x.id === named) ? named : "";
  /** What a definition may extend: anything but itself and anything below it.
   *  **`define` is the authority** — it refuses a cycle whoever asks, so this
   *  is only the list keeping its promise that what does not apply is not
   *  shown. */
  const roots = d
    ? all.filter((x) => x.id !== d.id && !isa(graph, x.id).some((up) => up.id === d.id))
    : [];

  /** **The definition this block made, as against one it merely names.** Only
   *  its own may be unpinned, renamed by the label, or made a default. */
  const own = d ?? (named ? graph.defs[named] : undefined);
  const pinned = !!own && !shipped(own);
  const may_default = !!own && pinned && own.group === "block"
    && module_named(graph, own.id) === kind;

  const shows = config_of(graph, d ? d.id : b ? id : undefined, "card")["shows"];
  const label = d ? d.name : shown_name(graph, id);
  const word = d ? d.name : (named ? graph.defs[named]?.name : undefined) ?? kind;
  /** **What is being drawn, not what is holding it.** *Block · block* said the
   *  same word twice and neither of them was the question — what the rows below
   *  settle is a card, and this says which kind of one.
   *
   *  The tally is how many of that kind the workspace holds; a definition counts
   *  what names it, which is the same question asked of a kind. */
  const holder = runs ? "line type:" : "card type:";
  /** How many of this the workspace holds — of that definition where one is
   *  held, of that kind otherwise. **Counted among its own sort**: a relation
   *  definition counts runs, and a block one counts cards. */
  const of_kind = runs ? Object.values(graph.edges) : Object.values(graph.blocks);
  const tally = d
    ? of_kind.filter((x) => x.type === d.id).length
    : edge ? Object.values(graph.edges).filter((x) => x.module === kind).length
    : Object.values(graph.blocks).filter((x) => module_of(graph, x.id) === kind).length;

  /** Whether this one says anything about its drawing at all, which is what
   *  there would be to give back. */
  const its_own = ["card", "style", "line"].some((key) => Object.keys(
    (d ? d.components?.[key] : (b ?? edge)?.looks?.[key]) ?? {}).length > 0);

  const set = (key: Key, name: string, value: string) =>
    onAct("look", { ids: [id], key, name, value });
  /** **Everything the tray can hold paints.** A relationship carries the same
   *  bag a block does, one layer apart, and the rail above says which parts of
   *  it this kind of thing has. */
  const paints = true;

  /** **A hue is the family question asked finer**, so while one is set the
   *  families are unreachable rather than merely losing: a chip that highlights
   *  and changes nothing is worse than one that is plainly out. */
  const tinted = said("style", "hue") !== undefined;
  /** Which groups this element has answered for itself, so what has been
   *  customised is visible without opening each one. */
  const touched = (g: Group) =>
    asked(g).some((q) => said(q.key, q.name) !== undefined)
    || (g === "colour" && (tinted || said("style", "opacity") !== undefined))
    || (g === "icon" && said("card", "icon") !== undefined)
    || (g === "mark" && said("card", "mark") !== undefined);
  const part = parts.includes(group) ? group : parts[0] ?? "colour";

  return (
    <div className={["styles", d ? "definition" : ""].filter(Boolean).join(" ")}>
      {/* **What it is.** The drawing first, because every answer under it is
          read against the drawing. */}
      <div className="col what">
        <div className="styles-head">
          {/* **A run rather than a card where the thing is a run.** They are two
              drawings because a relationship has no face — see the rail beside
              this one, which lists the parts this kind of thing has. */}
          {runs ? (
            <Wire label={label} alias={edge ? alias_of(graph, id, true) : undefined}
                  said={said} now={now} />
          ) : (
            <Card label={label} alias={b ? alias_of(graph, id) : undefined}
                  kind={word} icon={(now("card", "icon", "") || kind_mark) as IconName}
                  role={role ?? kind} mark={now("card", "mark", "")}
                  fields={it.fields} shows={Array.isArray(shows) && shows.length > 0}
                  said={said} now={now} />
          )}
        </div>

        <Body>
          {/* **A definition's name is read-only.** `def_id` slugs a name into
              the id, so renaming one would mint a second definition and leave
              every usage naming the first. Retiring it is unpinning it. */}
          {/* **The mark it wears is on the card above**, so it does not sit
              beside the box as well and leave this one row's answer shorter
              than the two under it. */}
          <Line label="name" tip="What this is called, as the drawing writes it.">
            {d
              ? <input value={d.name} readOnly aria-label="name" />
              : <Named id={id} onAct={onAct} live={!!b}
                       value={b ? b.name ?? "" : named ? graph.defs[named]?.name ?? "" : ""}
                       placeholder={b ? kind_word(graph, b) : kind} />}
          </Line>

          {/* **Which definition it draws through, by where it sits.** The path
              is the definitions folder's own — `default/note`, `workspace/Pump`,
              `packages/acme/Valve` — so what the picker offers and what the tree
              shows are one list said the same way. */}
          <Line label="definition" className="subtype"
                tip="The definition this draws through. The path is where it sits in the definitions folder.">
            {d ? (
              <select value={d.extends ?? ""} aria-label="extends" disabled={borrowed}
                      onChange={(e) => onAct("define", { name: d.name,
                                                         extends: e.target.value })}>
                <option value="">nothing</option>
                {roots.map((x) => <option key={x.id} value={x.id}>{where(x)}</option>)}
              </select>
            ) : (
              /* **Nothing named means two things, one per holder.** A card falls
                 back to the base definition of its kind; a run has no definition
                 at all, which is what makes it unnamed. */
              <select value={subtype} aria-label="definition" disabled={!subtypes.length}
                      onChange={(e) => onAct("retype", {
                        id, type: e.target.value || (runs ? "" : kind) })}>
                <option value="">{runs ? "unnamed" : `default/${kind}`}</option>
                {subtypes.map((x) => <option key={x.id} value={x.id}>{where(x)}</option>)}
              </select>
            )}
          </Line>

          {/* **The label names the pin.** What the card writes as its type is
              what the definition is called, so one word answers both — and
              ticking *pin* below is what files it under that name. */}
          {/* **For a run these two rows are close together and are not one.**
              *name* is the definition it points at now; *label* is the name a
              new one would be filed under, and pinning is what files it. */}
          {b || edge ? (
            <Line label="label"
                  tip={runs
                    ? "What to call the definition pinning would file. A run is "
                      + "named by the definition it points at, so this becomes its "
                      + "name once it is pinned."
                    : "What sort of thing this is. Pinning files a definition under this name."}>
              <input value={pinned ? own!.name : draft} aria-label="label"
                     placeholder={kind} readOnly={pinned}
                     onChange={(e) => set_draft(e.target.value)} />
            </Line>
          ) : null}

          {/* **Two boxes, and each says something different.** Whether this is
              in the vocabulary, and whether every plain one of its kind follows
              it. Both are about the definition the label names. */}
          {b || edge || pinned ? (
          <Line label="pin" className="marks"
                tip="Whether this is in the vocabulary, and what its kind follows.">
            {/* **A run is pinned exactly as a card is**, and a pinned run is
                offered on the rail's relations group rather than in the tree —
                a relationship is drawn between two ends, so there is nothing to
                drag a row onto. */}
            {b || edge || pinned ? (
              <label className="check" title="Keep this look as a definition anything can name">
                <input type="checkbox" checked={pinned} disabled={borrowed}
                       onChange={(e) => e.target.checked
                         ? onAct("pin", { id, name: draft.trim() || kind })
                         : onAct("unpin", { id: own!.id })} />
                pin {runs ? "line" : "block"}
              </label>
            ) : null}
            {/* **A default is a block's for now.** `Definition.default` names a
                block module, and what a plain run follows is a separate
                question from what a right drag draws. */}
            {!runs ? (
              <label className="check"
                     title={`Every ${kind} that names nothing draws from this one instead of the base`}>
                <input type="checkbox" checked={!!own?.default} disabled={!may_default}
                       onChange={(e) => onAct("default", { id: own!.id,
                                                           on: e.target.checked ? "yes" : "no" })} />
                make default
              </label>
            ) : null}
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
        {/* **What it is, and how much of it there is.** The kind is read rather
            than picked — a subtype refines what a thing is like and never what
            it is — and the count says how many of them this workspace holds,
            which is the one thing about a kind that is not on the card. */}
        <div className="styles-head">
          <div className="kind-line">
            <span className="holder">{holder}</span>
            <span className="base">{kind}<Icon name={kind_mark} size={12} /></span>
            <span className="tally">{tally} {tally === 1 ? "instance" : "instances"}</span>
            {/* **One act, so one undo puts every answer back.** A reset that
                cleared a property at a time would take as many undos to
                unsay as it took clicks to say. */}
            <button className="reset" disabled={borrowed || !its_own}
                    title={its_own ? "give every look back to what it inherits"
                                   : "it says nothing of its own to give back"}
                    onClick={() => onAct("plain", { ids: [id] })}>
              reset style
            </button>
          </div>
          {paints ? (
            <Rail label="style" on={part} onPick={(g) => set_group(g as Group)}
                  of={parts.map((g) => ({ key: g, word: (runs && AS_RUN[g]) || g,
                                          said: touched(g) }))} />
          ) : null}
        </div>

        {paints ? (
        <Body>
          {asked(part).map((q) => (
            <Options key={`${q.key}.${q.name}`} q={q} said={said} chain={chain} set={set}
                     runs={runs} off={q.name === "family" && tinted} />
          ))}

          {/* **A hue sits above the families and takes precedence over them.**
              The theme still owns every lightness, which is what keeps a card
              readable in all three. */}
          {part === "colour" ? (
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
          {part === "colour" ? (
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
          {part === "icon" || part === "mark" ? (
            <Line label={MARKS[part].name} className="marks-grid"
                  tip={MARKS[part].tip}>
              {/* **The one it draws is lit, whether or not this said so.** The
                  mark it inherits reads quietly; the one this element chose
                  reads brightly, and pressing that one gives it back. */}
              {names().map((n) => {
                const own = said("card", part) === n;
                const on = own || (said("card", part) === undefined
                                   && chain("card", part) === n);
                return (
                  <button key={n} title={own ? `${n} — set here; press again to give it back`
                    : on ? `${n} — inherited` : n}
                          className={["opt", "mark", on ? "on" : "", own ? "set" : ""]
                            .filter(Boolean).join(" ")}
                          onClick={() => set("card", part, own ? "" : n)}>
                    <Icon name={n} size={13} />
                  </button>
                );
              })}
            </Line>
          ) : null}
        </Body>
        ) : null}
      </div>
    </div>
  );
}
