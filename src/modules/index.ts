/** What an open module publishes: the components a definition configures.
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
 *  The dependency runs one way. The door knows the shape of a log and nothing
 *  about what any component means, so a component's validator is registered
 *  *with* it rather than reached for by it. */

import { validating } from "../graph/check";

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

/** A module: engine code, publishing components. It gains a vocabulary, a
 *  layout law and a gesture map as the streams that own those land. */
export type Module = {
  name: string;
  components: Component[];
};

const held = new Map<string, Component>();

/** Publish a module's components, at load and before any log is read — a
 *  validator arriving later simply leaves what is already in the graph
 *  unvalidated, which is the same position as not being in the build.
 *
 *  Publishing one name twice is the later one winning, so a build can replace a
 *  component without a second registry to keep in step. */
export function publish(...modules: Module[]): void {
  for (const module of modules) {
    for (const component of module.components) {
      held.set(component.name, component);
      validating(component.name, component.check);
    }
  }
}

/** Everything this build publishes — what a preset is drawn from. */
export function components(): Component[] {
  return [...held.values()];
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
