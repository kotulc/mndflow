/** The offered-action list. */

import { useEffect, useRef, useState } from "react";
import { offer, type Action, type Args, type Context } from "@mnd/core";

export type MenuProps = {
  ctx: Context;
  at: { x: number; y: number };
  /** Where on the drawing this was opened, when it was opened on a drawing. */
  spot?: { x: number; y: number };
  /** What the gesture that raised this already knows. */
  given?: Record<string, unknown>;
  /** The actions this context offers, in the order they are drawn. */
  only?: readonly (string | Entry)[];
  onAct: (name: string, args?: Record<string, unknown>) => void;
  onShut: () => void;
};

/** One named entry: an action, optionally with arguments filled and a label. */
export type Entry = { name: string; label?: string; args?: Args };

const entry_of = (e: string | Entry): Entry => (typeof e === "string" ? { name: e } : e);

/** What a menu can fill on its own. */
function askable(a: Action, spot: boolean): boolean {
  return spot || !a.args.some((arg) => arg.form === "spot" && arg.required);
}

/** How close to the window's edge a menu may come before it is moved. */
const EDGE = 8;

export function Menu({ ctx, at, spot, given, only, onAct, onShut }: MenuProps) {
  const box = useRef<HTMLDivElement>(null);
  const [asking, set_asking] = useState<(Action & { filled?: Args }) | null>(null);
  const [typed, set_typed] = useState("");
  /** Where the menu fits inside the window. */
  const [sits, set_sits] = useState(at);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    set_sits({
      x: Math.max(EDGE, Math.min(at.x, innerWidth - width - EDGE)),
      y: Math.max(EDGE, Math.min(at.y, innerHeight - height - EDGE)),
    });
  }, [at, asking]);

  useEffect(() => {
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) onShut();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onShut(); };
    window.addEventListener("mousedown", away);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("mousedown", away);
      window.removeEventListener("keydown", key);
    };
  }, [onShut]);

  const one = ctx.picked.length === 1 ? ctx.picked[0]! : null;

  /** What the context fills without asking. */
  const known = (): Record<string, unknown> => ({
    id: one, holder: one, owner: one, of: [...ctx.picked], about: one,
    group: ctx.cells?.[0]?.group ?? one,
    members: [...ctx.picked], ids: [...ctx.picked], target: one, layer: ctx.layer,
    ...(spot ? { spot } : {}),
    ...given,
  });

  /** What the menu stops to ask for: required arguments and the name of anything made. */
  const held = ["id", "ids", "holder", "owner", "of", "members", "target", "about", "group"];
  const wanted = (a: Action, filled?: Args) =>
    a.args.filter((arg) => (arg.required || arg.asks)
      && !held.includes(arg.name) && !(given && arg.name in given)
      && !(filled && arg.name in filled));

  /** Offered only when the menu can finish it with one question. */
  const fillable = (a: Action, filled?: Args) =>
    wanted(a, filled).filter((arg) => arg.required).length <= 1;

  const offered = offer(ctx).filter((a) => askable(a, spot !== undefined));
  /** Entries in the agreed order. */
  const entries: { action: Action; label: string; args?: Args }[] = (
    only
      ? only.map(entry_of)
          .map((e) => ({ e, action: offered.find((a) => a.name === e.name) }))
          .filter((x): x is { e: Entry; action: Action } => !!x.action)
          .map(({ e, action }) => ({ action, label: e.label ?? action.name, args: e.args }))
      : offered.map((action) => ({ action, label: action.name, args: undefined }))
  ).filter((x) => fillable(x.action, x.args));

  const take = (x: { action: Action; args?: Args }) => {
    const need = wanted(x.action, x.args);
    if (need.length === 0) { onAct(x.action.name, { ...known(), ...x.args }); onShut(); return; }
    set_asking({ ...x.action, args: need, filled: x.args });
    set_typed("");
  };

  const answer = () => {
    if (!asking) return;
    const need = asking.args[0]!;
    /** Left blank is left out, not sent as an empty string. */
    const said = typed.trim();
    onAct(asking.name, said || need.required
      ? { ...known(), ...asking.filled, [need.name]: said }
      : { ...known(), ...asking.filled });
    onShut();
  };

  return (
    <div className="menu" ref={box} style={{ left: sits.x, top: sits.y }} role="menu">
      {asking ? (
        <div className="asking">
          <label>{asking.args[0]!.name}</label>
          {asking.args[0]!.choices ? (
            <div className="choices">
              {asking.args[0]!.choices!.map((c) => (
                <button key={c} onClick={() => {
                  onAct(asking.name, { ...known(), ...asking.filled, [asking.args[0]!.name]: c });
                  onShut();
                }}>{c}</button>
              ))}
            </div>
          ) : (
            <input autoFocus value={typed}
                   onChange={(e) => set_typed(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === "Enter") answer();
                     if (e.key === "Escape") set_asking(null);
                   }} />
          )}
          <p className="about">{asking.about}</p>
        </div>
      ) : (
        entries.map((x, n) => (
          <button key={`${x.action.name}-${n}`} className="entry" title={x.action.about}
                  onClick={() => take(x)}>
            {x.label}
          </button>
        ))
      )}
    </div>
  );
}
