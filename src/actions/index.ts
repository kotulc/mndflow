/** Everything that changes a project, published as data.
 *
 *  An action is a record rather than a function somebody has to already know
 *  about, so a gesture, a menu and a sentence can all reach the same one. What
 *  each is and why is in spec.md under *Action surface*; the full list is in
 *  actions.md.
 *
 *  Running one returns mutations and never applies them. Where they land is the
 *  caller's — which is what lets undo stay a refold and lets an input method be
 *  told apart from a mouse by nothing at all. */

import type { ElemForm, Graph, Mutation } from "../graph/types";

/** What the canvas or the explorer has selected. The layer itself is never in
 *  here — an empty selection is what shows the layer's own properties. */
export type Picked = { kind: "node" | "edge" | "attr"; id: string } | null;

/** What an action is offered against: the same question a gesture asks of
 *  whatever is under the pointer, asked of a selection instead.
 *
 *  `form` narrows it where only one will do — dissolving applies to a group,
 *  tying to a note, marking to an interface. Interface is not a form: it is
 *  derived from sitting on a frame edge, and named here because scope is about
 *  what a thing reads as rather than what it is stored as. */
export type Scope =
  | { on: "layer" }
  | { on: "element"; form?: ElemForm | "interface" }
  | { on: "edge" }
  | { on: "project" };

/** Where an action is being run. Read, never changed: an action that wants the
 *  view or the selection moved says so in its {@link Effect}. */
export type Context = {
  graph: Graph;
  /** The layer being drawn. Null is the project itself. */
  view: string | null;
  picked: Picked;
  /** True when the project in context is locked in the workspace. Writing
   *  actions then refuse and offer unlock or fork — looking still works. */
  locked?: boolean;
  /** This project's id when known — bare refs in a selection resolve here. */
  project?: string;
  /** Open projects (and packages) by id — cross-project `of[]` resolution. */
  open?: Record<string, Graph>;
};

/** What an action needs, typed so that whoever is asking knows what it can
 *  supply. A `spot` cannot come from a sentence, so an action that requires one
 *  is reachable only by gesture — which is how eligibility stays derived rather
 *  than declared beside the action and left to drift. */
export type Arg =
  | { kind: "text"; name: string; prompt?: string; optional?: boolean }
  | { kind: "element"; name: string; form?: ElemForm; optional?: boolean }
  | { kind: "spot"; name: string; optional?: boolean }
  | { kind: "choice"; name: string; options: string[]; optional?: boolean }
  | { kind: "number"; name: string; optional?: boolean };

export type Args = Record<string, unknown>;

/** Mutations that land in another project's log — writing home. Applied after
 *  the primary {@link Effect.mutations} via `project.home` → `writeInto`. */
export type HomeBatch = {
  into: string;
  mutations: Mutation[];
  say?: string;
};

/** What running one comes to.
 *
 *  `open` and `focus` are how the ten actions that used to close over the
 *  page's state stay pure. **Undo restores the graph and never the context**,
 *  so neither is replayed: where somebody is looking is theirs.
 *
 *  `into` is which project's log the primary mutations land in — a matrix
 *  cell, a rename through a proxy, an inferred behavior project. Absent means
 *  the project in context. One primary log per effect; {@link home} batches
 *  are extra writes into structure projects, still through the same door. */
export type Effect = {
  mutations: Mutation[];
  /** Open this layer. Null is the project itself. */
  open?: string | null;
  focus?: Picked;
  /** One line for the strip. */
  say?: string;
  /** Project id primary mutations land in. Absent is the project in context. */
  into?: string;
  /** Structure writes implied by the primary work — tier-1 flow interfaces. */
  home?: HomeBatch[];
};

/** A refusal: why it did not run, and — when the project is locked — the ways
 *  through. Unlock and fork are workspace operations, not registry actions. */
export type Refusal = {
  refused: string;
  offer?: ("unlock" | "fork")[];
};

export type Action = {
  /** Stable, and what the log and a text interface both key on. Never shown. */
  name: string;
  /** What a menu says. A module's vocabulary may override it. */
  label: string;
  /** What it does, in a sentence — long enough to be scored against, which a
   *  name never is. "lay the layer out again" is what finds `arrange`. */
  about: string;
  scope: Scope;
  args: Arg[];
  /** Whether it is worth offering here at all. Absent is always. */
  when?: (ctx: Context) => boolean;
  /** Why it would refuse, in words, or null if it would not. Answerable only
   *  once the arguments are in hand, so it never decides what is *shown*. */
  check?: (ctx: Context, args: Args) => string | null;
  run: (ctx: Context, args: Args) => Effect;
};

const held = new Map<string, Action>();

/** Add actions to the registry. Called once per module at load. */
export function register(...actions: Action[]): void {
  for (const action of actions) held.set(action.name, action);
}

export function lookup(name: string): Action | undefined {
  return held.get(name);
}

export function all(): Action[] {
  return [...held.values()];
}

/** Whether a scope matches what is selected. One test, so a gesture map, a tray
 *  and a ranked list never disagree about where something applies. */
export function inScope(scope: Scope, ctx: Context): boolean {
  if (scope.on === "layer" || scope.on === "project") return true;

  const picked = ctx.picked;
  if (!picked) return false;
  if (scope.on === "edge") return picked.kind === "edge";
  if (picked.kind === "edge") return false;

  const node = ctx.graph.elements[picked.id];
  if (!node) return false;
  if (!scope.form) return true;
  // An interface is derived from sitting on a frame edge, never stored as one.
  if (scope.form === "interface") return node.side != null;

  return node.form === scope.form;
}

/** Everything worth showing here, in registration order. `check` is deliberately
 *  not consulted: it needs arguments nobody has filled yet, and an action hidden
 *  for a reason it cannot state is worse than one that refuses out loud. */
export function offered(ctx: Context): Action[] {
  return all().filter((action) => inScope(action.scope, ctx) && (action.when?.(ctx) ?? true));
}

/** What an input method can offer, which is whatever it can fill from words.
 *  Derived from the argument types, so nothing has to be marked — and an action
 *  that changes nothing is navigation, which a text interface never offers. */
export function sayable(action: Action): boolean {
  return !action.args.some((arg) => arg.kind === "spot" && !arg.optional);
}

/** Run one. A refusal comes back as its reason so the caller can say it rather
 *  than guess, which is the difference between a no-op and an answer.
 *
 *  A locked project refuses any writing outcome and offers unlock or fork —
 *  before a more specific check, so the lock is the answer. Navigation still
 *  runs: looking is not editing. */
export function run(name: string, ctx: Context, args: Args = {}): Effect | Refusal {
  const action = held.get(name);
  if (!action) return { refused: `No action called "${name}".` };

  if (ctx.locked) {
    // run is pure — trial tells us whether this would write without applying.
    const effect = action.run(ctx, args);
    if (writes(effect)) {
      return { refused: "This package is locked.", offer: ["unlock", "fork"] };
    }
    const wrong = action.check?.(ctx, args) ?? null;
    if (wrong) return { refused: wrong };
    return effect;
  }

  const wrong = action.check?.(ctx, args) ?? null;
  if (wrong) return { refused: wrong };

  return action.run(ctx, args);
}

/** Whether an effect is worth a step. An action that wrote no mutations changed
 *  nothing about the project — going somewhere and looking at something are not
 *  history, and putting them in the log would give undo two kinds of work.
 *  Home batches count too: writing into a structure is still editing. */
export function writes(effect: Effect): boolean {
  return effect.mutations.length > 0
    || Boolean(effect.home?.some((batch) => batch.mutations.length > 0));
}
