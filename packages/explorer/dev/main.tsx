/** The explorer, on its own, over a fixture. */

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { session, type Id } from "@mnd/core";
import { seed } from "@mnd/defs";
import { fixture, NAMES } from "@mnd/fixtures";
import { Explorer } from "../src/index";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "@mnd/theme/icons.css";
import "../src/explorer.css";
import "./dev.css";

function Harness() {
  const [name, set_name] = useState<string>(NAMES[1]!);
  const [held] = useState(() => new Map<string, ReturnType<typeof session>>());
  const [, bump] = useState(0);
  const [log, set_log] = useState<string[]>([]);
  const [open, set_open] = useState<Id | null>(null);
  const [picked, set_picked] = useState<Id[]>([]);
  const [folded, set_folded] = useState<Id[]>([]);
  const [picked_def, set_picked_def] = useState<Id | null>(null);

  if (!held.has(name)) {
    const made = session({ defs: seed() });
    for (const step of fixture(name)) made.adjust(step.action, step.mutations);
    held.set(name, made);
  }
  const s = held.get(name)!;
  s.watch(() => bump((n) => n + 1));

  const say = (line: string) => set_log((l) => [line, ...l].slice(0, 14));

  return (
    <div className="harness">
      <header>
        <b>explorer</b>
        <select value={name} onChange={(e) => { set_name(e.target.value); set_picked([]); }}>
          {NAMES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <span className="where">{open ? `open: ${open}` : "open: workspace"}</span>
      </header>
      <div className="split">
        <Explorer
          graph={s.graph()}
          open={open}
          picked={picked}
          folded={folded}
          onAct={(action, args) => {
            say(`${action} ${JSON.stringify(args ?? {})}`);
            if (action === "open") { set_open((args?.["id"] as Id) ?? null); return; }
            const refused = s.go(action, args);
            if (refused) say(`  refused: ${refused}`);
          }}
          onFold={(id, shut) =>
            set_folded((f) => (shut ? [...new Set([...f, id])] : f.filter((x) => x !== id)))}
          onPick={set_picked}
          pickedDef={picked_def}
          onPickDef={set_picked_def}
        />
        <pre className="log">{log.join("\n") || "every action it emits shows here"}</pre>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
