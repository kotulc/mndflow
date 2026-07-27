/** Shell: terminal and suggestions at the top, object explorer and graph in the
 *  middle, action log and match scoring at the foot.
 *
 *  There is no server. Everything below runs against a step log in this tab. */

import { useState } from "react";

import { useProject } from "./core/project";
import type { Suggestion } from "./core/suggest";
import { Canvas } from "./Canvas";
import { Chat } from "./Chat";
import { Doc } from "./Doc";
import { Files } from "./Files";
import { Log } from "./Log";
import { Scores } from "./Scores";

export function App() {
  const project = useProject();
  const { graph, scope, view, path, select, question, terms } = project;
  // Held here so the match scoring can watch it being typed.
  const [draft, setDraft] = useState("");

  /** Run a chip that is a graph operation rather than an answer. */
  function run(chip: Suggestion) {
    switch (chip.kind) {
      case "add":
        return project.create(chip.value, view, "object");
      case "group":
        return project.create(chip.value, view, "group");
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
                if (file && !project.open(await file.text())) {
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

        <section className="work">
          <div className="canvas">
            <Canvas
              graph={graph}
              scope={scope}
              view={view}
              path={path}
              touched={project.touched}
              onSelect={select}
              onUp={project.up}
              onPlace={project.place}
              onNest={project.nest}
              onCreateAt={project.createAt}
              onSprout={project.sprout}
              onLink={project.link}
              onRelation={project.relation}
              onUnlink={project.unlink}
              onDelete={project.remove}
            />
          </div>
          <Doc
            graph={graph}
            scope={scope}
            terms={terms}
            onSave={project.write}
            onRetype={project.retype}
            onRegroup={project.regroup}
          />
        </section>
      </main>

      <footer>
        <Log steps={project.steps} undoable={project.undoable} onUndo={project.undo} />
        <Scores text={draft} active={graph.template} />
      </footer>
    </div>
  );
}
