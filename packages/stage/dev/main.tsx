/** The stage, on its own, over a fixture.
 *
 *  Same shape as the explorer's harness: it holds the state the component
 *  refuses to, and logs every action name the stage emits. */

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { session, type Arrangement, type Id } from "@mnd/core";
import { fixture, NAMES } from "@mnd/fixtures";
import { project } from "@mnd/views";
import { Stage } from "../src/index";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "@mnd/theme/icons.css";
import "@mnd/stage/src/scene.css";
import "../src/stage.css";
import "./dev.css";

const HOWS: Arrangement[] = ["free", "grid"];

function Harness() {
  const [name, set_name] = useState<string>(NAMES[2]!);
  const [held] = useState(() => new Map<string, ReturnType<typeof session>>());
  const [, bump] = useState(0);
  const [log, set_log] = useState<string[]>([]);
  const [layer, set_layer] = useState<Id | null>(null);
  const [picked, set_picked] = useState<Id[]>([]);
  const [said, set_said] = useState<string | null>(null);

  if (!held.has(name)) {
    const made = session();
    for (const step of fixture(name)) made.adjust(step.action, step.mutations);
    held.set(name, made);
  }
  const s = held.get(name)!;
  s.watch(() => bump((n) => n + 1));

  const say = (line: string) => set_log((l) => [line, ...l].slice(0, 14));
  const scene = project(s.graph(), layer);
  const how = (layer && s.graph().blocks[layer]?.arrangement) || "free";

  const act = (action: string, args?: Record<string, unknown>) => {
    say(`${action} ${JSON.stringify(args ?? {})}`);
    if (action === "open") { set_layer((args?.["id"] as Id) ?? null); set_picked([]); return; }
    if (action === "up") {
      set_layer(layer ? (s.graph().blocks[layer]?.parent ?? null) : null);
      set_picked([]);
      return;
    }
    s.look(layer);
    s.pick(picked);
    const refused = s.go(action, args);
    if (refused) { say(`  refused: ${refused}`); set_said(refused); }
  };

  return (
    <div className="harness">
      <header>
        <b>stage</b>
        <select value={name} onChange={(e) => { set_name(e.target.value); set_layer(null);
                                                set_picked([]); }}>
          {NAMES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select value={how} disabled={!layer}
                onChange={(e) => act("arrange", { layer, arrangement: e.target.value })}>
          {HOWS.map((h) => <option key={h}>{h}</option>)}
        </select>
        <span className="where">
          {scene.nodes.length} nodes · {scene.edges.length} edges
        </span>
      </header>
      <div className="split">
        <Stage
          scene={scene}
          graph={s.graph()}
          picked={picked}
          said={said}
          onSaid={() => set_said(null)}
          onPick={set_picked}
          onAct={act}
        />
        <pre className="log">{log.join("\n") || "every action it emits shows here"}</pre>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
