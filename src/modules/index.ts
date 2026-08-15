/** What an open module publishes: the components a definition configures,
 *  the presets that name tested combinations of them, and an optional
 *  `validate` hook for what the five kinds cannot say.
 *
 *  A **package is data and a module is code**. A package ships definitions and
 *  costs nobody anything; a module is engine code, and an open one publishes
 *  the components a definition's `components` bag configures — `card`, `style`,
 *  `view`, and the rules. See design.md under *Packages and modules*.
 *
 *  A component owns one key and reads no other's. They share one element and
 *  one log, so separate files are not separate state: the key is the boundary,
 *  and this is where it is enforced. A component absent from the build
 *  validates nothing, which is how an older build opens a newer package —
 *  unrecognised configuration is unvalidated rather than wrong.
 *
 *  **Components ship as presets.** They configure independently, which
 *  multiplies quickly; a diagram names a coherent set rather than recombining
 *  freely. Presets are open — extended by a code change, additively.
 *
 *  **What the five cannot say is `validate`.** `required`, `ends`, `holds`,
 *  `degree` and `match` are lookups, counts and one fixed comparison; anything
 *  beyond that is code a module supplies. The hook advises while modelling and
 *  refuses only at translation — never a door fault, and never a rule language.
 *  It is local: one usage at a time. A whole-model walk (every requirement
 *  satisfied?) is a translator's to make.
 *
 *  The dependency runs one way. The door knows the shape of a log and nothing
 *  about what any component means, so a component's validator is registered
 *  *with* it rather than reached for by it. */

import { validating } from "../graph/check";
import type { Graph } from "../graph/types";

/** What a definition holds under one component's key. Free-form: the component
 *  says what its own shape is, and nothing else may read it. */
export type Config = Record<string, unknown>;

/** One published component.
 *
 *  `check` answers the same question an action's does — why this would not
 *  work, in words, or null. Words rather than a boolean, because the door says
 *  what it repaired and "invalid" is not something anybody can act on. */
export type Component = {
  /** The key it owns under a definition's `components`. */
  name: string;
  check: (config: Config) => string | null;
};

/** A coherent set of component choices, shipped and tested together.
 *
 *  Keys under `components` are published component names; values are that
 *  component's config. Arbitrary recombination stays possible in data and
 *  unsupported — a diagram is meant to name one of these instead. */
export type Preset = {
  name: string;
  components: Record<string, Config>;
};

/** A module's own check on one usage — element or relationship, by id.
 *
 *  Returns words somebody can act on, or nothing. Empty is the common case:
 *  most modules have nothing beyond the five to say about a given usage. */
export type Validate = (graph: Graph, id: string) => string[];

/** A module: engine code, publishing components. It gains a vocabulary, a
 *  layout law and a gesture map as the streams that own those land. */
export type Module = {
  name: string;
  components: Component[];
  /** Escape hatch for what the five kinds cannot express. Optional. */
  validate?: Validate;
};

const held = new Map<string, Component>();
const shipped = new Map<string, Preset>();
const hooks = new Map<string, Validate>();

/** Publish a module's components and optional validate hook, at load and
 *  before any log is read — a validator arriving later simply leaves what is
 *  already in the graph unvalidated, which is the same position as not being
 *  in the build.
 *
 *  Publishing one name twice is the later one winning, so a build can replace a
 *  component or a hook without a second registry to keep in step. A republish
 *  without `validate` clears the earlier hook for that module. */
export function publish(...modules: Module[]): void {
  for (const module of modules) {
    for (const component of module.components) {
      held.set(component.name, component);
      validating(component.name, component.check);
    }
    if (module.validate) hooks.set(module.name, module.validate);
    else hooks.delete(module.name);
  }
}

/** Ship presets. Later ones of the same name win, so a build can replace a
 *  combination without a second list to keep in step. */
export function ship(...presets: Preset[]): void {
  for (const next of presets) shipped.set(next.name, next);
}

/** Everything this build publishes — what a preset is drawn from. */
export function components(): Component[] {
  return [...held.values()];
}

/** Every preset this build ships. */
export function presets(): Preset[] {
  return [...shipped.values()];
}

/** The preset of this name, or null. */
export function preset(name: string): Preset | null {
  return shipped.get(name) ?? null;
}

/** Every finding every published module has about this usage.
 *
 *  Advise only — the caller puts the words in the tray or declines to emit.
 *  Nothing here refuses a change. */
export function findings(graph: Graph, id: string): string[] {
  const out: string[] = [];
  for (const validate of hooks.values()) out.push(...validate(graph, id));
  return out;
}

/** What one definition says to one component, or null where it says nothing.
 *
 *  The one way a component reads its configuration, so reading somebody else's
 *  means naming them and is visible in review. What comes back is what the door
 *  let through: a key it could not validate is already gone. */
export function configOf(
  def: { components?: Record<string, Config> } | undefined, name: string,
): Config | null {
  return def?.components?.[name] ?? null;
}
