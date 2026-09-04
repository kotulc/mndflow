/** The options rail: one column, fixed to the right, holding every control the
 *  thing on the stage has.
 *
 *  **One surface whose contents vary, not one per view.** A view module says
 *  which groups it offers and this draws them in a fixed order, whatever order
 *  it was handed. A matrix has no interfaces toggle because it declares none,
 *  never because one was greyed out.
 *
 *  Like every other surface it is a pure function of its props: it holds
 *  nothing and every control leaves as an action name somebody else runs. */

import { Icon } from "@mnd/theme";
import type { Group } from "./groups";

export type OptionsProps = {
  groups: readonly Group[];
};

/** Drawn in this order whatever order a module lists them. **`relations` and
 *  `grid` are last on purpose**: one grows with the vocabulary and the other
 *  comes and goes with the selection, so those are the two to push off the
 *  bottom of a column that scrolls. */
const ORDER = ["project", "arrange", "flow", "interfaces",
               "lines", "relations", "grid"];

const at = (key: string) => {
  const n = ORDER.indexOf(key);
  return n < 0 ? ORDER.length : n;
};

export function Options({ groups }: OptionsProps) {
  const shown = [...groups].filter((g) => g.controls.length).sort((a, b) => at(a.key) - at(b.key));
  if (!shown.length) return null;

  return (
    <aside className="opts" aria-label="Options">
      {shown.map((group) => (
        <div key={group.key} className={["opts-group", group.verbs ? "verbs" : ""]
               .filter(Boolean).join(" ")} role="group" aria-label={group.label}>
          <span className="opts-label">{group.label}</span>
          {group.controls.map((control) => (
            <button key={control.key} type="button"
                    className={control.on ? "on" : ""}
                    {...(control.on === undefined ? {} : { "aria-pressed": control.on })}
                    title={control.tip}
                    onClick={control.run}>
              <Icon name={control.icon} />
              <span className="word">{control.word}</span>
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}
