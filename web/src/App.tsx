/** Shell: terminal and suggestions at the top, object explorer and graph
 *  below.
 *
 *  The canvas takes everything left over. What used to sit under it — the
 *  action log, the relation kinds, the match scoring — is a tabbed readout
 *  behind the rail's toggle, and the attributes of whatever is selected ride
 *  at the foot of the canvas itself.
 *
 *  There is no server. Everything below runs against a step log in this tab. */

import { useEffect, useRef, useState } from "react";

import { useProject } from "./core/project";
import * as store from "./core/store";
import type { Suggestion } from "./core/suggest";
import type { Kind } from "./core/types";
import { Canvas } from "./Canvas";
import type { Grazed } from "./NodeCard";
import { Chat } from "./Chat";
import { Files } from "./Files";
import { Panel } from "./Panel";
import { Readout } from "./Readout";

/** What this diagram calls its elementary unit.
 *
 *  A property of the **diagram type**, not of what the project is about: a
 *  block diagram is built from blocks whether it describes software or a
 *  story. It becomes part of a module's declaration once modules exist. */
const UNIT = "block";

export function App() {
  const project = useProject();
  const { graph, view, picked, path, question, terms } = project;
  // Held here so the match scoring can watch it being typed.
  const [draft, setDraft] = useState("");
  /** Whether the readout drawer is out. */
  const [shelved, setShelved] = useState(false);
  /** The tray, so a click outside it can put it away. Its height no longer
   *  needs measuring: it takes half the canvas and the drawing takes the rest,
   *  rather than covering it. */
  const tray = useRef<HTMLElement>(null);

  // Display preferences: global to the app, kept apart from the project's own
  // history because how something is drawn is not a change to it.
  const [angular, setAngular] = useState(store.angular.initial);
  const [ports, setPorts] = useState(store.ports.initial);
  /** Something the contents table is pointing at, lit on the canvas without
   *  being selected. The canvas's own hover still wins where they disagree. */
  const [hinted, setHinted] = useState<Grazed>(null);
  /** Anything the app has to say, in one place. The door's report on a troubled
   *  log arrives the same way a refused name does. */
  const [notice, setNotice] = useState<string | null>(null);
  const [treePorts, setTreePorts] = useState(store.treePorts.initial);
  /** What a right drag makes. A choice about the next thing created rather than
   *  about how anything is drawn, but it lives here for the same reason: it is
   *  the tool in hand, not part of the project. */
  const [kind, setKind] = useState<Kind>("untyped");
  useEffect(() => store.angular.set(angular), [angular]);
  useEffect(() => store.ports.set(ports), [ports]);
  useEffect(() => store.treePorts.set(treePorts), [treePorts]);

  // Shortcuts that belong to the whole app rather than to one panel. Inside a
  // text field the field's own editing should win instead.
  useEffect(() => {
    function press(event: KeyboardEvent) {
      if ((event.target as HTMLElement).closest("input, textarea")) return;
      if (!(event.ctrlKey || event.metaKey)) return;

      // Shift turns "z" into "Z", so the letter is compared case-insensitively.
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        project.undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        project.redo();
      }
    }

    window.addEventListener("keydown", press);
    return () => window.removeEventListener("keydown", press);
  }, [project.undo, project.redo]);

  /** Run a chip that is a graph operation rather than an answer. */
  function run(chip: Suggestion) {
    switch (chip.kind) {
      case "add":
        return project.create(chip.value, view);
      case "link":
        return project.scope && project.link(project.scope, chip.value);
      case "open":
        return project.open(chip.value);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>mndflow</h1>
        {graph.domain && <span className="domain">{graph.domain}</span>}

        {/* The log has outgrown what the browser will keep. Said here rather
            than swallowed: the session is fine until the tab closes, and then
            everything since this appeared is gone. Export is the way out, so
            the warning is the button. */}
        {!project.saving && (
          <button
            className="unsaved"
            onClick={project.save}
            title="This browser will not store any more of this project. Export it to keep it."
          >
            ⚠ not being saved — export
          </button>
        )}

        <span className="tools">
          <button onClick={project.undo} disabled={!project.undoable} title="Undo">
            undo
          </button>
          <button onClick={project.redo} disabled={!project.redoable} title="Redo">
            redo
          </button>
          <button onClick={project.save} disabled={!project.steps.length}>
            export
          </button>
          <label className="import">
            import
            <input
              type="file"
              accept=".json"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file && !project.load(await file.text())) {
                  window.alert("That file is not a mndflow project.");
                }
              }}
            />
          </label>
          <button
            onClick={() => window.confirm("Discard this project?") && project.reset()}
            disabled={!project.steps.length}
          >
            new
          </button>

          <button
            type="button"
            className={`readout-toggle ${shelved ? "on" : ""}`}
            aria-pressed={shelved}
            aria-label={shelved ? "Hide the readout" : "Show the readout"}
            title={shelved ? "Hide the readout" : "Show relations, actions and matching"}
            onClick={() => setShelved((out) => !out)}
          >
            <span className="match-icon" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>
        </span>
      </header>

      <Chat
        graph={graph}
        steps={project.steps}
        question={question}
        view={view}
        scope={project.scope}
        terms={terms}
        draft={draft}
        onDraft={setDraft}
        onTurn={project.turn}
        onRun={run}
      />

      <main>
        <div className="side">
          <Files
            graph={graph}
            view={view}
            terms={terms}
            showPorts={treePorts}
            onShowPorts={setTreePorts}
            onOpen={project.open}
            onCreate={project.create}
            onNameTaken={project.nameTaken}
            onSay={setNotice}
            unit={UNIT}
            onDelete={project.remove}
            onMove={project.move}
            onRename={project.rename}
            onRenameProject={project.renameProject}
          />
        </div>

        <section className="work">
          <div className="canvas">
            <Canvas
              graph={graph}
              unit={UNIT}
              hinted={hinted}
              said={notice ?? project.trouble}
              onHeard={() => (setNotice(null), project.clearTrouble())}
              view={view}
              picked={picked}
              path={path}
              showPorts={ports}
              onShowPorts={setPorts}
              angular={angular}
              onAngular={setAngular}
              kind={kind}
              onKind={setKind}
              onArrangeLayer={project.arrange}
              onAxis={project.setAxis}
              onPick={project.pick}
              onOpen={project.open}
              onUp={project.up}
              onNest={project.nest}
              onPromote={project.promote}
              onCreateAt={project.createAt}
              onSprout={project.sprout}
              onRename={project.rename}
              onNameTaken={project.nameTaken}
              onLift={project.lift}
              onWire={project.wire}
              onAddPort={project.addPort}
              onPromotePort={project.promotePort}
              onSlidePort={project.setPort}
              onDropAttr={project.remove}
              onRefer={project.refer}
              onReveal={project.reveal}
              onRelation={project.relation}
              onPlaceMany={project.placeMany}
              onUnlink={project.unlink}
              onDelete={project.remove}
              onGroup={project.group}
              onNameAttr={project.rename}
              onNote={project.note}
              onPlaceNote={project.placeNote}
              onTie={project.tie}
            />

            <Panel
              graph={graph}
              view={view}
              picked={picked}
              unit={UNIT}
              onPick={project.pick}
              onHint={setHinted}
              onDelete={project.remove}
              onUnlink={project.unlink}
              onSave={project.write}
              onRetype={project.retype}
              onMarkPort={project.markPort}
              onAddAttr={project.addAttr}
              onUpdateAttr={project.updateAttr}
              onDropAttr={project.dropAttr}
              onLeaveGroup={project.leaveGroup}
              onRename={project.rename}
              onNameTaken={project.nameTaken}
              onSay={setNotice}
              onRelation={project.relation}
              onSetDir={project.setDir}
              onFlip={project.flip}
              onReveal={project.reveal}
              hostRef={tray}
            />
          </div>
        </section>

        <aside className={`drawer ${shelved ? "open" : ""}`} aria-hidden={!shelved}>
          <Readout
            graph={graph}
            steps={project.steps}
            draft={draft}
            onAddRelation={project.addRelation}
            onRenameRelation={project.renameRelation}
            onDropRelation={project.dropRelation}
          />
        </aside>
      </main>
    </div>
  );
}
