/** The terminal, on its own, over a static offered list.
 *
 *  The list below is what `offer(ctx)` would hand back for a block on the
 *  stage — membership only, no ordering of its own. Type to filter, arrow to
 *  move the highlight, Enter to confirm it. */

import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Terminal, COMMANDS, type Match, type Offer } from "../src/index";
import "@mnd/theme/ramp.css";
import "@mnd/theme/base.css";
import "@mnd/theme/icons.css";
import "../src/terminal.css";
import "./dev.css";

/** Membership for one context, in the fixed order a menu would draw it. */
const OFFERED: Record<string, Offer[]> = {
  "a block is picked": [
    { name: "rename", about: "changes what a block is called" },
    { name: "open", about: "looks inside this block" },
    { name: "move", about: "puts a block under a different parent" },
    { name: "refer", about: "puts a reference to this somewhere else" },
    { name: "group", about: "draws a boundary round these" },
    { name: "interface", about: "puts an interface on an edge" },
    { name: "infer", about: "turns this selection into one behavior block" },
    { name: "delete", about: "removes a block and everything it owns" },
  ],
  "a layer is open": [
    { name: "create", about: "makes a block here and names it" },
    { name: "note", about: "puts a note here saying what you typed" },
    { name: "arrange", about: "lays the layer out, reading one way" },
    { name: "vocabulary", about: "which packages this layer draws on" },
    { name: "up", about: "leaves the open layer for the one containing it" },
  ],
  "a relationship is picked": [
    { name: "reform", about: "changes what kind of line this is" },
    { name: "flip", about: "turns the relationship round" },
    { name: "unlink", about: "removes the relationship" },
  ],
};

const SAID: Record<string, string> = {
  "a block is picked": "Pump — structure, holds 2",
  "a layer is open": "Coolant Loop — 4 blocks, 3 relationships",
  "a relationship is picked": "Pump → Heat Exchanger — directed",
};

function Harness() {
  const [where, set_where] = useState("a block is picked");
  const [expanded, set_expanded] = useState(true);
  const [log, set_log] = useState<string[]>([]);
  const [said, set_said] = useState<string | null>(null);

  const act = (name: string) => {
    set_log((l) => [`act ${name}`, ...l].slice(0, 14));
    set_said(`${name} — ran from the terminal, like any other surface`);
  };

  /** One of the four. The app would run each; the harness only says so. */
  const command = (match: Match) => {
    set_log((l) => [`${match.command} “${match.rest}”`, ...l].slice(0, 14));
    set_said(`${COMMANDS[match.command].about} — “${match.rest}”`);
  };

  return (
    <div className="harness">
      <header>
        <b>terminal</b>
        <select value={where} onChange={(e) => { set_where(e.target.value); set_said(null); }}>
          {Object.keys(OFFERED).map((n) => <option key={n}>{n}</option>)}
        </select>
        <span className="where">{OFFERED[where]!.length} offered</span>
      </header>
      <div className="down">
        <Terminal
          offered={OFFERED[where]!}
          said={said}
          context={SAID[where]}
          expanded={expanded}
          onExpand={set_expanded}
          onAct={act}
          onCommand={command}
        />
        <div className="stand">
          <p><b>Four commands, and the verbs are flexible.</b> Try <code>+ heat_exchanger</code>, <code>: pump</code>, <code>* sysml</code> or <code>? how do I relate two blocks</code> — or type a word nobody listed and watch it land in help, which is the fallback and carries every action there is.</p>
          <p>It <b>reads context and never changes it</b>, and it reaches actions rather than writing a mutation of its own. Everything offered here is reachable without it — that is what keeps it optional.</p>
        </div>
        <pre className="log">{log.join("\n") || "every action it names shows here"}</pre>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Harness />);
