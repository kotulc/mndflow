/** Shell: terminal and suggestions at the top, object explorer and graph in the
 *  middle, action log and attributes at the foot.
 *
 *  There is no server. Everything below runs against a step log in this tab. */

import { useEffect, useState } from "react";

import { useProject } from "./core/project";
import * as store from "./core/store";
import { useEmbeddings } from "./useEmbeddings";
import type { Suggestion } from "./core/suggest";
import { Canvas } from "./Canvas";
import { Chat } from "./Chat";
import { Files } from "./Files";
import { Log } from "./Log";
import { Panel } from "./Panel";
import { Relations } from "./Relations";

export function App() {
  const project = useProject();
  const model = useEmbeddings();
  const { graph, view, picked, path, question, terms } = project;
  // Held here so the match scoring can watch it being typed.
  const [draft, setDraft] = useState("");

  // Display preferences: global to the app, kept apart from the project's own
  // history because how something is drawn is not a change to it.
  const [angular, setAngular] = useState(store.angular.initial);
  const [ports, setPorts] = useState(store.ports.initial);
  const [treePorts, setTreePorts] = useState(store.treePorts.initial);
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
        {graph.template && <span className="domain">{graph.template}</span>}
        <span className={`model ${model.ready ? "on" : model.problem ? "bad" : ""}`}>
          {model.problem ? "embeddings unavailable" : model.ready ? "minilm" : "loading minilm…"}
        </span>

        <span className="tools">
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
            path={path}
            terms={terms}
            showPorts={treePorts}
            onShowPorts={setTreePorts}
            onOpen={project.open}
            onCreate={project.create}
            onDelete={project.remove}
            onMove={project.move}
            onRename={project.rename}
            onRenameProject={project.renameProject}
          />
          <Relations
            graph={graph}
            onAdd={project.addRelation}
            onRename={project.renameRelation}
            onDrop={project.dropRelation}
          />
        </div>

        <section className="work">
          <div className="canvas">
            <Canvas
              graph={graph}
              view={view}
              picked={picked}
              path={path}
              touched={project.touched}
              showPorts={ports}
              onShowPorts={setPorts}
              angular={angular}
              onAngular={setAngular}
              onPick={project.pick}
              onOpen={project.open}
              onUp={project.up}
              onNest={project.nest}
              onPromote={project.promote}
              onCreate={project.create}
              onCreateAt={project.createAt}
              onSprout={project.sprout}
              onRename={project.rename}
              onLift={project.lift}
              onLink={project.link}
              onWire={project.wire}
              onAddPort={project.addPort}
              onSlidePort={project.setPort}
              onDemotePort={project.demotePort}
              onPromotePort={project.promotePort}
              onDropAttr={project.dropAttr}
              onPlaceGhost={project.placeGhost}
              onRelation={project.relation}
              onPlaceMany={project.placeMany}
              onUnlink={project.unlink}
              onDelete={project.remove}
              onGroup={project.group}
              onNameGroup={(id, label) => project.updateAttr(id, { name: label })}
            />
          </div>
        </section>
      </main>

      <footer>
        <Log
          steps={project.steps}
          undoable={project.undoable}
          redoable={project.redoable}
          onUndo={project.undo}
          onRedo={project.redo}
        />
        <Panel
          graph={graph}
          view={view}
          picked={picked}
          terms={terms}
          onSave={project.write}
          onRetype={project.retype}
          onMarkPort={project.markPort}
          onAddAttr={project.addAttr}
          onUpdateAttr={project.updateAttr}
          onDetachAttr={project.detachAttr}
          onDropAttr={project.dropAttr}
          onRelation={project.relation}
          onSetDir={project.setDir}
          onFlip={project.flip}
        />
      </footer>
    </div>
  );
}
