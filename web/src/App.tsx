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

  // Ctrl/Cmd+Z and Ctrl/Cmd+Y (or Shift+Z) anywhere outside a text field —
  // inside one, the field's own native undo should win instead.
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
              onPick={project.pick}
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
              onReanchor={project.reanchor}
              onFlip={project.flip}
              onPlaceMany={project.placeMany}
              onArrange={project.arrange}
              angular={angular}
              onAngular={setAngular}
              onUnlink={project.unlink}
              onDelete={project.remove}
              onRegion={project.region}
              onRenameRegion={project.renameRegion}
              onResizeRegion={project.resizeRegion}
              onDropRegion={project.dropRegion}
              pickedRegion={project.pickedRegion}
              onPickRegion={project.pickRegion}
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
          region={project.pickedRegion ? graph.regions[project.pickedRegion] ?? null : null}
          terms={terms}
          onSave={project.write}
          onRetype={project.retype}
          onRecolorRegion={project.recolorRegion}
        />
      </footer>
    </div>
  );
}
