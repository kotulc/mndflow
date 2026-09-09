/** How one element draws: **a rail of questions, the card, then the answers.**
 *
 *  **The rail is a filter, not navigation.** Nine questions is too many to read
 *  at once — that much was always true — but the fix is the tray's own filter
 *  chip rail, the one the contents tab already has, rather than a second tab
 *  strip inside a tab. A chip narrows what is listed below it; it does not take
 *  you somewhere else.
 *
 *  **The rail and the card share the top; the answers run under both.** The
 *  drawing is what every answer is read against, so it sits top right where it
 *  does not move, with the questions beside it and whichever one is lit
 *  answered below — one band of chrome, then one run of rows.
 *
 *  Pure: it holds which chip is lit and nothing else, and every change leaves
 *  as an action name. */

import { useState, type ReactNode } from "react";
import { ALIGNS, CONTRASTS, DECORS, FILLS, HUE, INTENSITY, OPACITY, PLACES,
         SLOTS, VOICES, WEIGHTS, type Act, type Id } from "@mnd/core";
import { names, type IconName } from "@mnd/theme";
import { Body, Line } from "./Body";

/** Which question each chip asks, in the one word for it.
 *
 *  **The grouping is provisional.** These are the nine a definition may say,
 *  named one word each; which of them belong together is a question for the
 *  vocabulary and not for the panel. */
const TABS = ["color", "fill", "border", "text", "marked",
              "icon", "name", "label", "aligned"] as const;
export type Part = (typeof TABS)[number];

/** One question, and where its answer lives. **The word reads as the left
 *  column's do** — a fixed gutter, so the options on every row start on the
 *  same line the name and the tags do. */
type Question = { name: string; key: "card" | "style"; word: string; tip: string;
                  of: readonly { value: string; word: string }[] };

const plain = (of: readonly string[]) => of.map((v) => ({ value: v, word: v }));

const QUESTIONS: Record<Part, Question> = {
  color: { name: "slot", key: "style", word: "family",
    tip: "Which family the theme paints this with. A family is a preset over "
       + "the two numbers below, and the theme is what picks it — so retro "
       + "paints primary green where modern paints it teal.",
    of: plain(SLOTS) },
  fill: { name: "fill", key: "style", word: "pattern",
    tip: "What fills the card behind its writing. Pattern, never colour — a "
       + "hatch follows whatever family or hue the card was given.",
    of: plain(FILLS) },
  border: { name: "weight", key: "style", word: "width",
    tip: "How heavy the border is. Three steps, named on the ramp.",
    of: plain(WEIGHTS) },
  text: { name: "voice", key: "style", word: "weight",
    tip: "How heavily the name is set.", of: plain(VOICES) },
  marked: { name: "decor", key: "style", word: "marked",
    tip: "How the name is marked. One at a time — italic and struck through at "
       + "once is not sayable, and nothing has wanted it.",
    of: plain(DECORS) },
  icon: { name: "icon", key: "card", word: "mark",
    tip: "The mark drawn in its corner. A name from the set, never a drawing — "
       + "one this build does not know falls back to its role's.",
    of: names().filter((n: IconName) => n.startsWith("role_"))
      .map((n: IconName) => ({ value: n, word: n.slice(5) })) },
  /** **Two writings, two questions.** `name` is what somebody called it;
   *  `label` is what sort of thing it is. They used to be one answer, which is
   *  why putting a type on a card took the name off it. */
  name: { name: "name", key: "card", word: "sits",
    tip: "Where the block's own name sits — inside the card, under it, or "
       + "nowhere.",
    of: plain(PLACES) },
  label: { name: "label", key: "card", word: "sits",
    tip: "Where the type sits: the subtype where one is named, the base kind "
       + "otherwise. Inside, it reads to the right of the name.",
    of: plain(PLACES) },
  aligned: { name: "align", key: "card", word: "reads",
    tip: "Which end of the card its writing reads from.", of: plain(ALIGNS) },
};

/** The second question two of them ask, because the two are one answer.
 *
 *  **A rung overrules `contrast`.** `emphasis` is a shorthand over the border
 *  and the writing together; where a rung is named outright it wins, which is
 *  what lets a card sit somewhere the three pairings have no word for. */
const ALSO: Partial<Record<Part, Question>> = {
  border: { name: "line", key: "style", word: "contrast",
    tip: "How far the border stands out from the card behind it.",
    of: plain(CONTRASTS) },
  text: { name: "ink", key: "style", word: "contrast",
    tip: "How far the writing stands out from the card behind it.",
    of: plain(CONTRASTS) },
};

export type LooksProps = {
  id: Id;
  /** What it draws as now, for the two answers that are ranges rather than
   *  sets — a slider with no position is not a control. */
  now: (key: string, name: string, fallback: string) => string;
  /** What this one has been told, as against what its chain says. */
  said: (key: string, name: string) => unknown;
  /** What the chain says, for the answer it has not overridden. */
  chain: (key: string, name: string) => string;
  /** The drawing, slotted between the rail and the rows. **Given rather than
   *  built**: what a card looks like is the element panel's to render, and
   *  where it sits is this one's, because the rail is what it is read against. */
  card?: ReactNode;
  onAct: Act;
};

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

export function Looks({ id, said, now, chain, card, onAct }: LooksProps) {
  const [part, set_part] = useState<Part>("color");

  const set = (key: "card" | "style", name: string, value: string) =>
    onAct("look", { ids: [id], key, name, value });
  /** **A hue is the family question asked finer**, so while one is set the
   *  families are unreachable rather than merely losing: a chip that highlights
   *  and changes nothing is worse than one that is plainly out. */
  const tinted = said("style", "hue") !== undefined;
  /** Which chips this element has answered for itself, so what has been
   *  customised is visible without opening each one. */
  const touched = (t: Part) =>
    said(QUESTIONS[t].key, QUESTIONS[t].name) !== undefined
    || (ALSO[t] ? said(ALSO[t]!.key, ALSO[t]!.name) !== undefined : false)
    || (t === "color" && tinted)
    || (t === "fill" && said("style", "opacity") !== undefined);

  return (
    <div className="looks">
      {/* **The questions, and the thing they are asked of.** One band: the rail
          takes the room it needs and the drawing keeps the corner, so neither
          moves as the answers below them change. */}
      <div className="looks-top">
        {/* **The rail narrows; it does not navigate.** The same chips the
            contents tab filters with, asking the same sort of question. */}
        <div className="filters looks-rail">
          {TABS.map((t) => (
            <button key={t} className={[part === t ? "on" : "", touched(t) ? "said" : ""]
                      .filter(Boolean).join(" ")}
                    title={QUESTIONS[t].tip}
                    onClick={() => set_part(t)}>{t}</button>
          ))}
        </div>
        {card}
      </div>

      <Body>
        {/* **A hue sits above the families and takes precedence over them.**
            The theme still owns every lightness, which is what keeps a card
            readable in all three. */}
        {part === "color" ? (
          <Line label="hue" className="sliders"
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

        <Options q={QUESTIONS[part]} said={said} chain={chain} set={set}
                 off={part === "color" && tinted} />
        {ALSO[part]
          ? <Options q={ALSO[part]!} said={said} chain={chain} set={set} off={false} />
          : null}

        {/* **Transparency is a quantity**, so it is a slider. Three named steps
            were three invented words for a number everybody already has one
            for — and the value that mattered most was a 6% wash no name would
            ever have suggested. */}
        {part === "fill" ? (
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
      </Body>
    </div>
  );
}
