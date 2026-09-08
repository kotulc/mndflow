/** How one element draws, one question at a time.
 *
 *  **A tab is a question, not a category.** Seven pickers of closed-set words
 *  asked seven at once, and `slot`, `emphasis`, `weight` and `voice` are four
 *  words for *how loud* that nobody can rank from their names. One tab, one
 *  group of options — except where two answers are the same question asked
 *  coarsely and finely, which is what `colour` and its two sliders are.
 *
 *  **The options are words; the card is the picture.** Drawing each option as
 *  what it does put two pictures on the panel — a swatch and the card it was
 *  previewing — and the swatch was the worse of the two, since it showed one
 *  trait on a shape that is not the thing being edited. The card has a column
 *  of its own now, so every tab is read against the same drawing.
 *
 *  Pure, like every other surface here: it holds which tab is open and nothing
 *  else, and every change leaves as an action name. */

import { useState } from "react";
import { ALIGNS, CONTRASTS, DECORS, FILLS, HUE, INTENSITY, OPACITY, PLACES,
         SLOTS, VOICES, WEIGHTS, type Act, type Id } from "@mnd/core";
import { names, type IconName } from "@mnd/theme";

/** Which question a tab asks, in the one word for it. */
const TABS = ["color", "fill", "border", "text", "marked",
              "icon", "name", "label", "aligned"] as const;
export type Part = (typeof TABS)[number];

/** One question, and where its answer lives. **The word reads as the left
 *  column's do** — a fixed gutter, so the options in every tab start on the
 *  same line the name and the tags do. A tab holding one question repeats its
 *  own name there, which is the price of the two that hold two. */
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
  /** **Two writings, two tabs.** `name` is what somebody called it; `label` is
   *  what sort of thing it is. They used to be one answer, which is why putting
   *  a type on a card took the name off it. */
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

/** Tabs that ask a second question, because the two are one answer.
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
  /** What this one element has been told, as against what its chain says. */
  said: (key: string, name: string) => unknown;
  /** What the chain says, for the answer it has not overridden. */
  chain: (key: string, name: string) => string;
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
    <div className="question" title={q.tip} aria-disabled={off || undefined}>
      <span className="q-word">{q.word}</span>
      <div className="options">
        <button className={on(undefined) ? "opt on" : "opt"} disabled={off}
                title={`inherit — ${chain(q.key, q.name) || "the app’s own default"}`}
                onClick={() => set(q.key, q.name, "")}>inherit</button>
        {q.of.map((c) => (
          <button key={c.value} title={c.word} disabled={off}
                  className={on(c.value) ? "opt on" : "opt"}
                  onClick={() => set(q.key, q.name, c.value)}>{c.word}</button>
        ))}
      </div>
    </div>
  );
}

export function Looks({ id, said, now, chain, onAct }: LooksProps) {
  const [part, set_part] = useState<Part>("color");

  const set = (key: "card" | "style", name: string, value: string) =>
    onAct("look", { ids: [id], key, name, value });

  return (
    <div className="looks">
      <div className="parts" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={part === t}
                  className={part === t ? "on" : ""} onClick={() => set_part(t)}>{t}</button>
        ))}
      </div>

      <div className="choices">
        {/* **A hue is the family question asked finer**, so it sits above the
            families and takes precedence over them. While one is set the
            families are unreachable rather than merely losing — a chip that
            highlights and changes nothing is worse than one that is out. */}
        {part === "color" ? (
          <div className="question"
               title="the angle this paints itself at, and how far it is taken. The theme
 still owns every lightness, which is what keeps a card readable in all three.">
            <span className="q-word">hue</span>
            <div className="sliders">
              <input type="range" aria-label="hue" min={HUE.min} max={HUE.max} step={1}
                     className="hue" value={Number(now("style", "hue", "200"))}
                     onChange={(e) => set("style", "hue", e.target.value)} />
              <input type="range" aria-label="intensity" min={INTENSITY.min}
                     max={INTENSITY.max} step={0.05} className="intensity"
                     value={Number(now("style", "intensity", "0.65"))}
                     onChange={(e) => set("style", "intensity", e.target.value)} />
              <button className="opt" title="give the hue back to the named family"
                      disabled={said("style", "hue") === undefined}
                      onClick={() => set("style", "hue", "")}>clear</button>
            </div>
          </div>
        ) : null}

        {/* **Transparency is a quantity**, so it is a slider. Three named
            steps were three invented words for a number everybody already has
            one for — and the value that mattered most was a 6% wash no name
            would ever have suggested. */}
        {part === "fill" ? (
          <div className="question"
               title="How opaque the fill is. The fill alone, so the writing on a card
 stays readable however far the ground shows through.">
            <span className="q-word">opacity</span>
            <div className="sliders">
              <input type="range" aria-label="opacity" min={OPACITY.min}
                     max={OPACITY.max} step={0.02} className="opacity"
                     value={Number(now("style", "opacity", "1"))}
                     onChange={(e) => set("style", "opacity", e.target.value)} />
              <button className="opt" title="give it back to whatever it inherits"
                      disabled={said("style", "opacity") === undefined}
                      onClick={() => set("style", "opacity", "")}>clear</button>
            </div>
          </div>
        ) : null}

        {[QUESTIONS[part], ALSO[part]].filter(Boolean).map((q) => (
          <Options key={q!.name} q={q!} said={said} chain={chain} set={set}
                   off={part === "color" && q!.name === "slot"
                       && said("style", "hue") !== undefined} />
        ))}
      </div>
    </div>
  );
}
