/** The options rail, on its own, over static chrome.
 *
 *  It holds the state the component refuses to and logs every control it
 *  emits. The slots below are what a projection would have declared. */

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Options, groups_of, type Chrome } from "../src/index";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "@mnd/theme/icons.css";
import "../src/options.css";
import "./dev.css";

/** What each of the three modules offers, as it would arrive from a Scene. */
const SLOTS: Record<string, string[]> = {
  block: ["arrange", "interfaces", "lines", "relations"],
  "block · sequence": ["columns", "lines", "relations"],
  table: ["columns", "types"],
  matrix: ["types", "relations"],
};

const TYPES = ["flow", "satisfies", "depends on"];
const COLUMNS = ["name", "duty", "owner"];

function Harness() {
  const [module, set_module] = useState("block");
  const [log, set_log] = useState<string[]>([]);
  const [chrome, set_chrome] = useState<Chrome>({
    slots: SLOTS["block"]!, arrangement: "right", interfaces: true, angles: true,
    types: TYPES, columns: COLUMNS, picked: null, sorted: "name",
  });

  const act = (name: string, args?: Record<string, unknown>) => {
    set_log((l) => [`${name} ${JSON.stringify(args ?? {})}`, ...l].slice(0, 14));
    if (name === "arrange") set_chrome((c) => ({ ...c, arrangement: args!["arrangement"] as never }));
    if (name === "interfaces") set_chrome((c) => ({ ...c, interfaces: args!["show"] as boolean }));
    if (name === "lines") set_chrome((c) => ({ ...c, angles: args!["angles"] as boolean }));
    if (name === "sort") set_chrome((c) => ({ ...c, sorted: args!["column"] as string }));
    if (name === "filter" || name === "relate_with") {
      set_chrome((c) => ({ ...c, picked: (args!["type"] as string) ?? null }));
    }
  };

  const groups = groups_of(chrome, act);

  return (
    <div className="harness">
      <header>
        <b>options</b>
        <select value={module} onChange={(e) => {
          set_module(e.target.value);
          set_chrome((c) => ({ ...c, slots: SLOTS[e.target.value]! }));
        }}>
          {Object.keys(SLOTS).map((n) => <option key={n}>{n}</option>)}
        </select>
        <span className="where">
          {groups.length} groups · {groups.reduce((n, g) => n + g.controls.length, 0)} controls
        </span>
      </header>
      <div className="split">
        <div className="stand">
          <p>A module declares its slots and the rail draws them in a fixed order. Switch the module above: <b>a matrix has no interfaces toggle because it declares none</b>, never because one was greyed out.</p>
        </div>
        <Options groups={groups} />
        <pre className="log">{log.join("\n") || "every control it emits shows here"}</pre>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
