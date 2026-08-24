/** The tray, on its own, over a fixture.
 *
 *  It holds the state the component refuses to and logs what it emits. Pick a
 *  fixture and a layer above: the rows are the layer read straight from the
 *  graph, which is the whole of what this surface does. */

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { children, fold, shown_name, type Id } from "@mnd/core";
import { fixture, NAMES } from "@mnd/fixtures";
import { Tray } from "../src/index";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "../src/tray.css";
import "./dev.css";

/** The layer with the most in it, so the harness opens on something worth
 *  looking at rather than on a workspace holding one block. */
function richest(graph: ReturnType<typeof fold>): Id | null {
  const layers = Object.keys(graph.blocks);
  let best: Id | null = null;
  let most = children(graph, null).length;
  for (const id of layers) {
    const n = children(graph, id).length;
    if (n > most) { most = n; best = id; }
  }
  return best;
}

function Harness() {
  const [name, set_name] = useState<string>("related");
  const [layer, set_layer] = useState<Id | null>(() => richest(fold(fixture("related"))));
  const [open, set_open] = useState(true);
  const [picked, set_picked] = useState<Id[]>([]);
  const [log, set_log] = useState<string[]>([]);

  const graph = fold(fixture(name));
  const layers: (Id | null)[] = [null, ...Object.keys(graph.blocks).filter((id) =>
    children(graph, id).length > 0)];
  const here = layer && graph.blocks[layer] ? layer : null;

  const say = (line: string) => set_log((l) => [line, ...l].slice(0, 14));

  return (
    <div className="harness">
      <header>
        <b>tray</b>
        <select value={name} onChange={(e) => {
          set_name(e.target.value);
          set_layer(richest(fold(fixture(e.target.value))));
          set_picked([]);
        }}>
          {NAMES.map((n) => <option key={n}>{n}</option>)}
        </select>
        <select value={here ?? ""} onChange={(e) => set_layer(e.target.value || null)}>
          {layers.map((id) => (
            <option key={id ?? "root"} value={id ?? ""}>
              {id ? shown_name(graph, id) : "workspace"}
            </option>
          ))}
        </select>
        <span className="where">{picked.length ? `picked ${picked[0]}` : "nothing picked"}</span>
      </header>
      <div className="down">
        <div className="stand">
          <p>The tray is <b>the only place a relationship or an interface is found without hunting for it on the drawing</b>. Hovering a row would light that thing on the stage; clicking selects it.</p>
        </div>
        <Tray
          graph={graph}
          layer={here}
          label={here ? shown_name(graph, here) : "workspace"}
          open={open}
          onOpen={(next) => { say(`open ${next}`); set_open(next); }}
          picked={picked}
          onPick={(ids) => { say(`pick ${ids.join(", ")}`); set_picked(ids); }}
          onHover={(id) => id && say(`hover ${id}`)}
        />
        <pre className="log">{log.join("\n") || "every gesture it emits shows here"}</pre>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
