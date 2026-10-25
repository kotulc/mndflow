/** How a definition is painted, one part at a time: the questions of one part of its drawing —
 *  name, label, face, head, colour, border or icon — each answered by its form. The card tab's
 *  choices column draws the part whose key is lit. */

import { DEFAULTS, honours, is_named, type Act, type Graph, type Id } from "@mnd/core";
import { Icon, names } from "@mnd/theme";
import { Body, Line } from "./Body";
import { held, kind_of, reading } from "./holder";
import { ROWS, type Group, type Key, type Question } from "./questions";

export type PartProps = { graph: Graph; id: Id; group: Group; onAct: Act };

type Reading = ReturnType<typeof reading>;

export function Part({ graph, id, group, onAct }: PartProps) {
  const it = held(graph, id);
  if (!it) return null;
  const { said, chain, now } = reading(graph, id, it);
  const { kind, runs } = kind_of(graph, id, it);
  const asked = ROWS[group].filter((q) => honours(kind).includes(q.key));

  const set = (key: Key, name: string, value: string) =>
    onAct("look", { ids: [id], key, name, value });
  /** While a hue is set, the families are unreachable. */
  const tinted = said("style", "hue") !== undefined;
  /** An unset handle shows while a card is unnamed, so that answer is lit. */
  const unnamed = !!graph.blocks[id] && !is_named(graph, id);

  return (
    <Body>
      {asked.map((q) => (
        <Answer key={`${q.key}.${q.name}`} q={q} read={{ said, chain, now }} set={set}
                runs={runs} off={q.name === "family" && tinted}
                app={unnamed && q.key === "card" && q.name === "alias" ? "show" : undefined} />
      ))}
    </Body>
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
