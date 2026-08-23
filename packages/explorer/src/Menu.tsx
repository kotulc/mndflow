/** The offered-action list.
 *
 *  Membership only, in a fixed order — the list has no ordering of its own, and
 *  a menu has no positions to learn, so **what does not apply is not shown**
 *  rather than greyed out.
 *
 *  It asks for what it needs and then names an action. It never writes. */

import { useEffect, useRef, useState } from "react";
import { offer, type Action, type Context } from "@mnd/core";

export type MenuProps = {
  ctx: Context;
  at: { x: number; y: number };
  onAct: (name: string, args?: Record<string, unknown>) => void;
  onShut: () => void;
};

/** What a menu can fill on its own. A position can only come from a gesture,
 *  so an action needing one is not offered here. */
function askable(a: Action): boolean {
  return !a.args.some((arg) => arg.form === "spot" && arg.required);
}

export function Menu({ ctx, at, onAct, onShut }: MenuProps) {
  const box = useRef<HTMLDivElement>(null);
  const [asking, set_asking] = useState<Action | null>(null);
  const [typed, set_typed] = useState("");

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
  const entries = offer(ctx).filter(askable);

  /** What the context can fill without asking. Anything left over is the one
   *  thing the menu asks for. */
  const known = (): Record<string, unknown> => ({
    id: one, holder: one, owner: one, of: [...ctx.picked],
    members: [...ctx.picked], target: one, layer: ctx.layer,
  });

  const wanted = (a: Action) =>
    a.args.filter((arg) => arg.required && !["id", "holder", "owner", "of", "members", "target"]
      .includes(arg.name));

  const take = (a: Action) => {
    const need = wanted(a);
    if (need.length === 0) { onAct(a.name, known()); onShut(); return; }
    set_asking(a);
    set_typed("");
  };

  const answer = () => {
    if (!asking) return;
    const need = wanted(asking)[0]!;
    onAct(asking.name, { ...known(), [need.name]: typed });
    onShut();
  };

  return (
    <div className="menu" ref={box} style={{ left: at.x, top: at.y }} role="menu">
      {asking ? (
        <div className="asking">
          <label>{wanted(asking)[0]!.name}</label>
          {wanted(asking)[0]!.choices ? (
            <div className="choices">
              {wanted(asking)[0]!.choices!.map((c) => (
                <button key={c} onClick={() => {
                  onAct(asking.name, { ...known(), [wanted(asking)[0]!.name]: c });
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
        entries.map((a) => (
          <button key={a.name} className="entry" title={a.about} onClick={() => take(a)}>
            {a.name}
          </button>
        ))
      )}
    </div>
  );
}
