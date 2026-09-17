/** The options rail: every control the thing on the stage has, in one column. */

import { Icon } from "@mnd/theme";
import type { Group } from "./groups";

export type OptionsProps = {
  groups: readonly Group[];
};

/** Drawn in this order whatever order a module lists them. */
const ORDER = ["elements", "layer", "views", "flow", "display", "relations", "grid"];

const at = (key: string) => {
  const n = ORDER.indexOf(key);
  return n < 0 ? ORDER.length : n;
};

export function Options({ groups }: OptionsProps) {
  const shown = [...groups].filter((g) => g.controls.length).sort((a, b) => at(a.key) - at(b.key));
  if (!shown.length) return null;

  return (
    <aside className="opts" aria-label="Options">
      <div className="bar" title="Options">
        <span className="mark" aria-hidden="true"><Icon name="menu" /></span>
      </div>
      <div className="body">
        {shown.map((group) => {
          /** Where a group's verbs begin, ruled apart from its settings. */
          const first = group.controls.findIndex((c) => c.verb);
          /** A control may ask for its own rule. */
          const ruled = (n: number) => (n === first && n > 0) || !!group.controls[n]?.ruled;
          return (
            <div key={group.key} className="opts-group" role="group" aria-label={group.label}>
              <span className="opts-label">{group.label}</span>
              {group.controls.map((control, n) => (
                <button key={control.key} type="button"
                        className={[control.on ? "on" : "",
                                    control.verb ? "verb" : "",
                                    ruled(n) ? "ruled" : ""].filter(Boolean).join(" ")}
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
      </div>
    </aside>
  );
}
