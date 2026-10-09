/** How one thing is painted: the style rows of the style tab. */

import { useState } from "react";
import { DEFAULTS, honours, is_named, type Act, type Graph, type Id } from "@mnd/core";
import { Icon, names } from "@mnd/theme";
import { Body, Line, Rail } from "./Body";
import { held, kind_of, reading } from "./holder";
import { AS_RUN, ASKS, parts_in_order, ROWS, type Group, type Key,
         type Question } from "./questions";

export type LooksProps = {
  graph: Graph; id: Id; onAct: Act;
  /** The element in context, where the look written is its definition's. */
  about?: Id;
};

type Reading = ReturnType<typeof reading>;

export function Looks({ graph, id, about = id, onAct }: LooksProps) {
  const [group, set_group] = useState<Group>("name");

  const it = held(graph, id);
  if (!it) return null;
  const { said, chain, now } = reading(graph, id, it);
  const { kind, runs } = kind_of(graph, id, it);

  /** A part with nothing left to ask is not a part. */
  const honoured = honours(kind);
  const asked = (g: Group) => ROWS[g].filter((q) => honoured.includes(q.key));
  const parts = parts_in_order().filter((g) => honoured.includes(ASKS[g]) && asked(g).length > 0);
  const part = parts.includes(group) ? group : parts[0] ?? "colour";
  const touched = (g: Group) => asked(g).some((q) => said(q.key, q.name) !== undefined);

  const set = (key: Key, name: string, value: string) =>
    onAct("look", { ids: [id], key, name, value });
  /** While a hue is set, the families are unreachable. */
  const tinted = said("style", "hue") !== undefined;
  /** An unset handle shows while a card is unnamed, so that answer is lit. */
  const unnamed = !!graph.blocks[about] && !is_named(graph, about);

  return (
    <div className="col draws">
      <Rail label="style" on={part} onPick={(g) => set_group(g as Group)}
            of={parts.map((g) => ({ key: g, word: (runs && AS_RUN[g]) || g,
                                    said: touched(g) }))} />

      <Body>
        {asked(part).map((q) => (
          <Answer key={`${q.key}.${q.name}`} q={q} read={{ said, chain, now }} set={set}
                  runs={runs} off={q.name === "family" && tinted}
                  app={unnamed && q.key === "card" && q.name === "alias" ? "show" : undefined} />
        ))}
      </Body>
    </div>
  );
}

/** One question's answers, drawn by its form. */
function Answer({ q, read, set, off, runs, app }: {
  q: Question; read: Reading; off: boolean; runs: boolean;
  /** What the app draws here when nothing is said, where it is not the table's. */
  app?: string;
  set: (key: Key, name: string, value: string) => void;
}) {
  const { said, chain, now } = read;
  const own = said(q.key, q.name);
  const mine = own !== undefined;

  /** A quantity is a slider, with a way back to whatever it inherits. */
  if (q.form === "range") {
    const r = q.range!;
    return (
      <Line label={q.word} tip={q.tip} off={off} className="sliders">
        <input type="range" aria-label={q.name} className={q.name}
               min={r.min} max={r.max} step={r.step}
               value={Number(now(q.key, q.name, r.fallback))}
               onChange={(e) => set(q.key, q.name, e.target.value)} />
        <button className="opt" title="give it back to whatever it inherits"
                disabled={!mine} onClick={() => set(q.key, q.name, "")}>clear</button>
      </Line>
    );
  }

  /** Several of a set, in the order picked: pressing one adds it last, or takes it away. */
  if (q.form === "parts") {
    const at = (mine ? own as string[] : (chain(q.key, q.name) || "").split(",")).filter(Boolean);
    return (
      <Line label={q.word} tip={q.tip} className="options">
        {(q.of ?? []).map((c) => {
          const on = at.includes(c.value);
          const next = on ? at.filter((x) => x !== c.value) : [...at, c.value];
          return (
            <button key={c.value} className={["opt", on ? "on" : "", on && mine ? "set" : ""]
                      .filter(Boolean).join(" ")}
                    title={on ? `${c.word} — shown ${at.indexOf(c.value) + 1}` : c.word}
                    onClick={() => set(q.key, q.name, next.join(","))}>
              {c.word}
            </button>
          );
        })}
        <button className="opt" title="give it back to whatever it inherits" disabled={!mine}
                onClick={() => set(q.key, q.name, "")}>clear</button>
      </Line>
    );
  }

  /** A width and a height, in units. */
  if (q.form === "size") {
    const read = (mine ? own : JSON.parse(chain(q.key, q.name) || "null")) as
      { w: number; h: number } | null;
    const was = read ?? { w: 12, h: 8 };
    const side = (axis: "w" | "h") => (
      <input type="number" min={1} step={1} aria-label={axis === "w" ? "width" : "height"}
             value={was[axis]}
             onChange={(e) => set(q.key, q.name, axis === "w" ? `${e.target.value}x${was.h}`
                                                              : `${was.w}x${e.target.value}`)} />
    );
    return (
      <Line label={q.word} tip={q.tip} className="card">
        {side("w")}<span className="into">×</span>{side("h")}<span className="alias">units</span>
        <button className="opt" title="give it back to whatever it inherits" disabled={!mine}
                onClick={() => set(q.key, q.name, "")}>clear</button>
      </Line>
    );
  }

  /** Every mark this build ships, rather than the nine a role wears. */
  if (q.form === "marks") {
    return (
      <Line label={q.word} tip={q.tip} className="marks-grid">
        {names().map((n) => {
          const set_here = own === n;
          const on = set_here || (!mine && chain(q.key, q.name) === n);
          return (
            <button key={n} title={set_here ? `${n} — set here; press again to give it back`
                                            : on ? `${n} — inherited` : n}
                    className={["opt", "mark", on ? "on" : "", set_here ? "set" : ""]
                      .filter(Boolean).join(" ")}
                    onClick={() => set(q.key, q.name, set_here ? "" : n)}>
              <Icon name={n} size={13} />
            </button>
          );
        })}
      </Line>
    );
  }

  /** What it draws: what it says for itself, then its chain, then the app. */
  const from_app = app ?? (runs && q.key === "style"
    ? "" : DEFAULTS[`${q.key}.${q.name}` as keyof typeof DEFAULTS] ?? "");
  const at = String(own ?? "") || chain(q.key, q.name) || from_app;
  const offered = (q.of ?? []).filter((c) => !(runs && q.omit?.includes(c.value)));

  return (
    <Line label={q.word} tip={q.tip} off={off} className="options">
      {offered.map((c) => {
        const on = at === c.value;
        return (
          <button key={c.value} disabled={off}
                  className={["opt", on ? "on" : "", on && mine ? "set" : ""]
                    .filter(Boolean).join(" ")}
                  title={on && mine ? `${c.word} — set here; press again to give it back`
                    : on ? `${c.word} — inherited` : c.word}
                  onClick={() => set(q.key, q.name, on && mine ? "" : c.value)}>
            {c.word}
          </button>
        );
      })}
    </Line>
  );
}
