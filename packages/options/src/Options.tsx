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

/** Drawn in this order whatever order a module lists them. **The three that
 *  come and go with the selection are last on purpose**: they are the ones to
 *  push off the bottom of a column that scrolls, and everything above them is
 *  about what you are looking at rather than what you have hold of. */
const ORDER = ["project", "layer", "views", "flow", "display", "relations",
               "element", "anchors", "grid"];

const at = (key: string) => {
  const n = ORDER.indexOf(key);
  return n < 0 ? ORDER.length : n;
};

export function Options({ groups }: OptionsProps) {
  const shown = [...groups].filter((g) => g.controls.length).sort((a, b) => at(a.key) - at(b.key));
  if (!shown.length) return null;

  return (
    <aside className="opts" aria-label="Options">
      {shown.map((group) => {
        /** **Where the verbs begin.** A group is about one subject and some
         *  subjects have both a setting and something you do to them, so the
         *  two are ruled apart inside the group rather than split across two
         *  labels. No rule where the group is verbs all the way down — there is
         *  nothing above to divide it from. */
        const first = group.controls.findIndex((c) => c.verb);
        return (
          <div key={group.key} className="opts-group" role="group" aria-label={group.label}>
            <span className="opts-label">{group.label}</span>
            {group.controls.map((control, n) => (
              <button key={control.key} type="button"
                      className={[control.on ? "on" : "",
                                  control.verb ? "verb" : "",
                                  n === first && n > 0 ? "ruled" : ""].filter(Boolean).join(" ")}
                      {...(control.on === undefined ? {} : { "aria-pressed": control.on })}
                      title={control.tip}
                      onClick={control.run}>
                <Icon name={control.icon} />
                <span className="word">{control.word}</span>
              </button>
            ))}
          </div>
        );
      })}
    </aside>
  );
}
