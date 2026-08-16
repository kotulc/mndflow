/** Fixed-order presentation of the offered-action list on the canvas.
 *
 *  Membership is `offer(ctx)`; order is the actions.md enumeration — the same
 *  rule the explorer uses. The rail will learn its own order (Z.3). */

import { useEffect, useRef } from "react";

import { offer } from "../../../actions/offer";
import type { Action, Arg, Args, Context } from "../../../actions";
import type { Side } from "../../../graph/types";

/** Fixed menu order — the actions.md enumeration. The rail will learn its own. */
export const ORDER = [
  "create", "delete", "rename", "retype", "describe", "move", "refer",
  "open", "up", "reveal",
  "interface", "mark",
  "relate", "unlink", "flip", "direct", "reform",
  "group", "leave", "dissolve", "note", "tie",
  "field", "unfield", "define", "undefine",
  "infer",
  "axis", "arrange", "relax", "vocabulary",
];

export function rank(name: string): number {
  const i = ORDER.indexOf(name);
  return i < 0 ? ORDER.length : i;
}

/** What a canvas right-click named — enough to fill arguments the gesture knows. */
export type OfferTarget = {
  kind: "card" | "frame" | "edge" | "group" | "note" | "name" | "interface"
    | "selection" | "perch";
  id: string;
  /** RF multi-select (and single) member ids — what `group` takes. */
  members?: string[];
  side?: Side;
  at?: number;
  /** Promotion from a derived seat. */
  edge?: string;
  end?: "from" | "to";
};

/** Whether the canvas can supply every required non-text argument. */
export function can_fill(action: Action, ctx: Context, target: OfferTarget): boolean {
  if (action.name === "group") {
    return (target.members?.length ?? 0) > 0
      || Boolean(ctx.picked?.kind === "node" && ctx.picked.id);
  }
  if (action.name === "relate") {
    return (target.members?.length ?? 0) >= 2;
  }
  if (action.name === "infer") return false;
  // Needs a place on the border — only a card/frame/perch click names one.
  if (action.name === "interface") {
    return target.side != null && target.at != null;
  }

  for (const arg of action.args) {
    if (arg.optional) continue;
    if (arg.kind === "spot" || arg.kind === "choice" || arg.kind === "number") {
      return false;
    }
    if (arg.kind === "element") {
      if (ctx.picked) continue;
      if (target.id && target.kind !== "selection") continue;
      if (target.members?.length) continue;
      return false;
    }
  }

  return true;
}

/** Fill what the gesture and selection already know; text left empty is prompted. */
export function fill_args(action: Action, ctx: Context, target: OfferTarget): Args {
  const args: Args = {};
  const members = target.members ?? [];
  const focus = ctx.picked?.id
    ?? (target.kind !== "selection" ? target.id : undefined)
    ?? members[0];

  if (action.name === "group") {
    args.members = members.length ? members : (focus ? [focus] : []);
  }

  if (action.name === "relate" && members.length >= 2) {
    args.from = members[0];
    args.to = members[1];
  }

  if (action.name === "interface") {
    if (target.kind === "perch" && target.edge && target.end) {
      args.owner = target.id;
      args.edge = target.edge;
      args.end = target.end;
    } else if (target.kind === "interface") {
      args.owner = ctx.graph.elements[target.id]?.parent ?? null;
    } else {
      args.owner = target.id || null;
    }
    if (target.side != null) args.side = target.side;
    if (target.at != null) args.at = target.at;
  }

  if (action.name === "create") {
    args.parent = ctx.view;
  }

  for (const arg of action.args) {
    if (arg.kind !== "element") continue;
    if (args[arg.name] != null) continue;
    if (arg.name === "parent" || arg.name === "owner") {
      if (args[arg.name] == null) args[arg.name] = ctx.view;
      continue;
    }
    // Optional `into` means join-or-create: only fill when the named target
    // is already a group. Filling it with a focused card made multi-select
    // → Group refuse ("Can only join a group.").
    if (arg.optional && arg.name === "into") {
      if (target.kind === "group" && target.id) args.into = target.id;
      else if (focus && ctx.graph.elements[focus]?.form === "group") {
        args.into = focus;
      }
      continue;
    }
    if (focus) args[arg.name] = focus;
  }

  if (action.name === "unlink" || action.name === "flip"
      || action.name === "direct" || action.name === "reform") {
    if (ctx.picked?.kind === "edge") args.id = ctx.picked.id;
  }

  return args;
}

/** Sort `offer` into the fixed order for this target. */
export function offered_for(ctx: Context, target: OfferTarget): Action[] {
  return offer(ctx)
    .filter((action) => can_fill(action, ctx, target))
    .sort((a, b) => rank(a.name) - rank(b.name));
}

/** Context menu at a pointer — fixed order, dismiss on outside click. */
export function OfferMenu({
  x, y, items, onTake, onDismiss,
}: {
  x: number;
  y: number;
  items: Action[];
  onTake: (action: Action) => void;
  onDismiss: () => void;
}) {
  const box = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      if (box.current?.contains(event.target as Node)) return;
      onDismiss();
    };

    window.addEventListener("mousedown", dismiss);
    return () => window.removeEventListener("mousedown", dismiss);
  }, [onDismiss]);

  if (!items.length) return null;

  return (
    <ul
      ref={box}
      className="offer"
      style={{ left: x, top: y }}
      role="menu"
    >
      {items.map((action) => (
        <li key={action.name} role="none">
          <button
            type="button"
            role="menuitem"
            onClick={() => onTake(action)}
          >
            {action.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

export type { Action, Arg, Args, Context };
