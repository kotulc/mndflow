/** Shell: terminal and suggestions at the top, object explorer and graph in the
 *  middle, action log and match scoring at the foot.
 *
 *  There is no server. Everything below runs against a step log in this tab. */

import { useEffect, useState } from "react";

import { useProject } from "./core/project";
import * as store from "./core/store";
import { useEmbeddings } from "./useEmbeddings";
import type { Suggestion } from "./core/suggest";
import { Canvas } from "./Canvas";
import { Chat } from "./Chat";
import { Doc } from "./Doc";
import { Files } from "./Files";
import { Log } from "./Log";
import { Relations } from "./Relations";
import { Scores } from "./Scores";

export function App() {
  const project = useProject();
  const model = useEmbeddings();
  const { graph, scope, view, path, select, question, terms } = project;
  // Held here so the match scoring can watch it being typed.
  const [draft, setDraft] = useState("");
  // How relations are drawn. A view preference, so it is kept apart from the
  // project's own history — toggling it is not an edit.
  const [angular, setAngular] = useState(store.angular);
  useEffect(() => store.setAngular(angular), [angular]);

  /** Run a chip that is a graph operation rather than an answer. */
  function run(chip: Suggestion) {
    switch (chip.kind) {
      case "add":
        return project.create(chip.value, view);
      case "link":
        return scope && project.link(scope, chip.value);
      case "open":
        return select(chip.value);
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
        scope={scope}
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
          selected={scope}
          path={path}
          terms={terms}
          onSelect={select}
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
              scope={scope}
              view={view}
              path={path}
              touched={project.touched}
              onSelect={select}
              onOpen={project.open}
              onUp={project.up}
              onNest={project.nest}
              onPromote={project.promote}
              onCreateAt={project.createAt}
              onSprout={project.sprout}
              onRename={project.rename}
              onLift={project.lift}
              onLink={project.link}
              onRelation={project.relation}
              onFlip={project.flip}
              onPlaceMany={project.placeMany}
              onArrange={project.arrange}
              angular={angular}
              onAngular={setAngular}
              onUnlink={project.unlink}
              onDelete={project.remove}
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
        <Scores text={draft} active={graph.template} />
        <Doc
          graph={graph}
          scope={scope}
          terms={terms}
          onSave={project.write}
          onRetype={project.retype}
        />
      </footer>
    </div>
  );
}
