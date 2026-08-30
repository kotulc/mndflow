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
  /** Where on the drawing this was opened, when it was opened on a drawing.
   *  **A position can only come from a gesture**, and a menu raised by one can
   *  pass the gesture's on — so a block made from the canvas lands under the
   *  pointer, and one made from the tree is placed by the layout. */
  spot?: { x: number; y: number };
  /** What the gesture that raised this already knows. **A menu on a
   *  relationship's end knows which end, and whose border it meets** — nothing
   *  here could work either out, and an action needing them is offered only
   *  where they are given. */
  given?: Record<string, unknown>;
  onAct: (name: string, args?: Record<string, unknown>) => void;
  onShut: () => void;
};

/** What a menu can fill on its own. Without a place to point at, an action
 *  that needs one is not offered. */
function askable(a: Action, spot: boolean): boolean {
  return spot || !a.args.some((arg) => arg.form === "spot" && arg.required);
}

/** How close to the window's edge a menu may come before it is moved. */
const EDGE = 8;

export function Menu({ ctx, at, spot, given, onAct, onShut }: MenuProps) {
  const box = useRef<HTMLDivElement>(null);
  const [asking, set_asking] = useState<Action | null>(null);
  const [typed, set_typed] = useState("");
  /** Where it actually fits. **A menu opens at the pointer until it cannot** —
   *  a long list opened near the foot of the window runs off the bottom, and
   *  the entries nobody can reach are the ones at the end of the alphabet. It
   *  is measured rather than guessed, because how long it is depends on what
   *  is offered here. */
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

  /** What the context can fill without asking. Anything left over is the one
   *  thing the menu asks for. */
  const known = (): Record<string, unknown> => ({
    id: one, holder: one, owner: one, of: [...ctx.picked],
    members: [...ctx.picked], target: one, layer: ctx.layer,
    ...(spot ? { spot } : {}),
    ...given,
  });

  /** What the menu stops to ask for: everything the action requires, and the
   *  name of anything it makes. **Something being made is always worth
   *  naming** — the derived name is a fallback, not an answer, and typing one
   *  here is the difference between “pump” and “block 4”. */
  const held = ["id", "holder", "owner", "of", "members", "target"];
  const wanted = (a: Action) =>
    a.args.filter((arg) => (arg.required || arg.asks)
      && !held.includes(arg.name) && !(given && arg.name in given));

  /** **Offered when this menu could actually finish it.** It stops for one
   *  thing and no more, so an action still missing two of them would be run
   *  half-filled — which is how an entry that cannot work gets into a list
   *  whose whole rule is that what does not apply is not shown. */
  const fillable = (a: Action) => wanted(a).filter((arg) => arg.required).length <= 1;

  const entries = offer(ctx)
    .filter((a) => askable(a, spot !== undefined) && fillable(a));

  const take = (a: Action) => {
    const need = wanted(a);
    if (need.length === 0) { onAct(a.name, known()); onShut(); return; }
    set_asking(a);
    set_typed("");
  };

  const answer = () => {
    if (!asking) return;
    const need = wanted(asking)[0]!;
    /** **Left blank is left out**, not sent as an empty string. An optional
     *  name nobody typed is the action deriving one, which is what it does
     *  when nobody was asked at all. */
    const said = typed.trim();
    onAct(asking.name, said || need.required
      ? { ...known(), [need.name]: said }
      : known());
    onShut();
  };

  return (
    <div className="menu" ref={box} style={{ left: sits.x, top: sits.y }} role="menu">
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
