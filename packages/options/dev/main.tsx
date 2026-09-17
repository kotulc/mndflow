/** The options rail, on its own, over static chrome. */

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Options, groups_of, type Chrome } from "../src/index";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "@mnd/theme/icons.css";
import "../src/options.css";
import "./dev.css";

/** What a projection offers, as it would arrive from a Scene. */
const SLOTS: Record<string, string[]> = {
  block: ["layer", "display", "relations"],
  "block, a grid picked": ["layer", "display", "relations"],
};

function Harness() {
  const [module, set_module] = useState("block");
  const [log, set_log] = useState<string[]>([]);
  const [chrome, set_chrome] = useState<Chrome>({
    slots: SLOTS["block"]!, arrangement: "free", interfaces: true,
    lattice: true, module: "line",
    relations: [{ id: "flow_line", name: "flow", module: "line" },
                { id: "note_tie", name: "annotates", module: "tie" }],
  });

  const act = (name: string, args?: Record<string, unknown>) => {
    set_log((l) => [`${name} ${JSON.stringify(args ?? {})}`, ...l].slice(0, 14));
    if (name === "arrange") set_chrome((c) => ({ ...c, arrangement: args!["arrangement"] as never }));
    if (name === "interfaces") set_chrome((c) => ({ ...c, interfaces: args!["show"] as boolean }));
    if (name === "relate_with") {
      set_chrome((c) => ({ ...c, module: args!["module"] as never }));
    }
    if (name === "lattice") set_chrome((c) => ({ ...c, lattice: args!["show"] as boolean }));
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
