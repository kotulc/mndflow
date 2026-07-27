/** Shell: chat at the top, file tree and graph in the middle, action log at
 *  the foot. The selected document scopes the graph and decides which question
 *  is asked next, so changing it refetches. Every turn applies on arrival —
 *  the log's undo is the way back. */

import { useCallback, useEffect, useState } from "react";

import { api, type State } from "./api";
import { Canvas } from "./Canvas";
import { Chat } from "./Chat";
import { Doc } from "./Doc";
import { Files } from "./Files";
import { Log } from "./Log";

export function App() {
  const [state, setState] = useState<State | null>(null);
  const [scope, setScope] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async (action: () => Promise<State>) => {
    setBusy(true);
    setError("");
    try {
      const next = await action();
      setState(next);
      setScope(next.scope);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    run(() => api.state(scope));
  }, [run, scope]);

  if (!state) return <div className="loading">{error || "Connecting…"}</div>;

  return (
    <div className="app">
      <header>
        <h1>mndflow</h1>
        {state.graph.template && <span className="domain">{state.graph.template}</span>}
        {error && <span className="error">{error}</span>}
      </header>

      <Chat
        question={state.workflow_step}
        busy={busy}
        onTurn={(input) => run(() => api.turn(input, scope))}
      />

      <main>
        <Files
          graph={state.graph}
          selected={scope}
          busy={busy}
          onSelect={setScope}
          onCreate={(label, parent) => run(() => api.create(label, parent, scope))}
          onDelete={(id) => run(() => api.remove(id, scope))}
          onMove={(id, parent) => run(() => api.move(id, parent, scope))}
          onRename={(id, label) => run(() => api.rename(id, label, scope))}
          onRenameProject={(label) => run(() => api.renameProject(label, scope))}
        />

        <section className="work">
          <div className="canvas">
            <Canvas
              graph={state.graph}
              scope={scope}
              touched={state.touched}
              busy={busy}
              onSelect={setScope}
              onPlace={(id, x, y) => run(() => api.place(id, x, y, scope))}
              onLink={(source, target) => run(() => api.link(source, target, scope))}
              onRelation={(id, relation) => run(() => api.relation(id, relation, scope))}
              onUnlink={(id) => run(() => api.unlink(id, scope))}
              onDelete={(id) => run(() => api.remove(id, scope))}
            />
          </div>
          <Doc
            graph={state.graph}
            scope={scope}
            busy={busy}
            onSave={(id, body) => run(() => api.save(id, body, scope))}
          />
        </section>
      </main>

      <Log history={state.history} busy={busy} onUndo={() => run(() => api.undo(scope))} />
    </div>
  );
}
