/** Shell: terminal and suggestions at the top, object explorer and graph
 *  below.
 *
 *  The canvas takes everything left over. What used to sit under it — the
 *  action log, the relation kinds, the match scoring — is a tabbed readout
 *  behind the rail's toggle, and the attributes of whatever is selected ride
 *  at the foot of the canvas itself.
 *
 *  There is no server. Everything below runs against a step log in this tab.
 *  Which log is which project's is decided by the explorer: the selected row's
 *  project is the context. */

import { useEffect, useMemo, useRef, useState } from "react";

import { compact, fold, stepsIn, titleOf } from "../graph/fold";
import { entering } from "../graph/check";
import * as file from "../graph/file";
import { useProject } from "../project";
import * as store from "../graph/store";
import { ROOT, step as makeStep, type EdgeForm, type Graph, type Step } from "../graph/types";
import type { Suggestion } from "../terminal/suggest";
import { Canvas } from "../canvas/Canvas";
import { type Grazed } from "../canvas/card";
import { viewOf } from "../modules/view";
import { Matrix } from "../modules/view/matrix";
import { Table } from "../modules/view/table";
import { Chat } from "../terminal/Chat";
import * as workspace from "../workspace";
import { Files } from "./Files";
import { Panel } from "./Panel";
import { Readout } from "./Readout";

/** What this diagram calls its elementary unit.
 *
 *  A property of the **diagram type**, not of what the project is about: a
 *  block diagram is built from blocks whether it describes software or a
 *  story. It becomes part of a module's declaration once modules exist. */
const UNIT = "block";

/** Untouched imports earn no storage key (S4.7); keep their logs in the tab
 *  so companions still draw until somebody edits them. */
const stash: Record<string, Step[]> = {};

/** Fold one keyed slot for the explorer — read-only for projects not in
 *  context. Falls back to a same-tab stash when the slot is still pristine. */
function graphOf(id: string): { graph: Graph; steps: Step[] } {
  const raw = store.loadProject(id);
  const empty = !raw || (Array.isArray(raw) && raw.length === 0);
  const came = entering(empty && stash[id] ? stash[id] : raw);
  const steps = came ? compact(came.steps) : [];

  return { graph: fold(steps), steps };
}

/** Remember checkpoint logs the store declined to key, and drop ones that now
 *  have a real slot. */
function remember(logs: Record<string, Step[]>) {
  for (const [id, steps] of Object.entries(logs)) {
    const raw = store.loadProject(id);
    if (Array.isArray(raw) && raw.length > 0) delete stash[id];
    else stash[id] = steps;
  }
}

/** Projects this graph depends on, transitively, excluding itself and shipped
 *  packages (those travel with the app). */
function companions(
  root: Graph,
  self: string,
): Record<string, { graph: Graph; steps: number }> {
  const out: Record<string, { graph: Graph; steps: number }> = {};
  const queue = [...file.needs(root)];

  while (queue.length) {
    const id = queue.shift()!;
    if (!id || id === self || id.startsWith("pkg_") || out[id]) continue;

    const { graph: g, steps } = graphOf(id);
    out[id] = { graph: g, steps: stepsIn(steps) };
    for (const next of file.needs(g)) {
      if (next && next !== self && !next.startsWith("pkg_") && !out[next]) {
        queue.push(next);
      }
    }
  }

  return out;
}

/** Admit a project into the workspace list and place its root proxy. Already
 *  open is a no-op. */
function openIn(held: workspace.Held, projectId: string): workspace.Held {
  const { graph, steps } = graphOf(held.id);
  const out = workspace.admit(held, graph, projectId);
  if ("refuse" in out) return held;

  workspace.save(out.held);
  store.saveProject(held.id, compact([
    ...steps,
    makeStep("opened", "admit", out.mutations),
  ]));

  return out.held;
}

/** Tooltip for an open project: id, how much work, and which copy. */
function tipOf(id: string, graph: Graph, steps: Step[]): string {
  const written = file.write(graph, id, stepsIn(steps));

  return `${id} · ${stepsIn(steps)} steps · ${file.hash(written)}`;
}

export function App() {
  const [held, setHeld] = useState(() => openIn(workspace.load(), store.projectId()));
  /** Which project's log the page writes to — the selected explorer row's. */
  const [contextId, setContextId] = useState(() => store.projectId());
  /** Layer to open once useProject has rebound after a context switch. */
  const pendingView = useRef<string | null | undefined>(undefined);

  const project = useProject(contextId, workspace.isLocked(held, contextId));
  const { graph, view, picked, path, question, terms } = project;
  // Held here so the match scoring can watch it being typed.
  const [draft, setDraft] = useState("");
  /** Whether the readout drawer is out. */
  const [shelved, setShelved] = useState(false);
  /** The tray, so a click outside it can put it away. Its height no longer
   *  needs measuring: it takes half the canvas and the drawing takes the rest,
   *  rather than covering it. */
  const tray = useRef<HTMLElement>(null);
  /** Plain-file fallback when File System Access is absent. */
  const importInput = useRef<HTMLInputElement>(null);

  // Display preferences: global to the app, kept apart from the project's own
  // history because how something is drawn is not a change to it.
  const [angular, setAngular] = useState(store.angular.initial);
  const [ports, setPorts] = useState(store.ports.initial);
  /** Something the contents table is pointing at, lit on the canvas without
   *  being selected. The canvas's own hover still wins where they disagree. */
  const [hinted, setHinted] = useState<Grazed>(null);
  /** Anything the app has to say, in one place. The door's report on a troubled
   *  log arrives the same way a refused name does. */
  const [notice, setNotice] =
    useState<{ text: string; act?: { label: string; run: () => void } } | null>(null);
  /** Everything that used to be an `alert` or a `confirm`. */
  const say = (text: string, act?: { label: string; run: () => void }) => setNotice({ text, act });
  const [treePorts, setTreePorts] = useState(store.treePorts.initial);
  /** What a right drag makes. A choice about the next thing created rather than
   *  about how anything is drawn, but it lives here for the same reason: it is
   *  the tool in hand, not part of the project. */
  const [form, setForm] = useState<EdgeForm>("line");
  useEffect(() => store.angular.set(angular), [angular]);
  useEffect(() => store.ports.set(ports), [ports]);
  useEffect(() => store.treePorts.set(treePorts), [treePorts]);

  // After switching project, open the layer the click asked for — once the
  // hook has folded the new log (`graph` changes), not on the stale closure.
  useEffect(() => {
    if (pendingView.current === undefined) return;
    const layer = pendingView.current;
    pendingView.current = undefined;
    project.open(layer);
  }, [graph, project.open]);

  /** Bring a project into context and open a layer inside it. */
  function navigate(projectId: string, layer: string | null) {
    if (projectId !== contextId) {
      pendingView.current = layer;
      setContextId(projectId);
      return;
    }
    pendingView.current = undefined;
    project.open(layer);
  }

  /** Import replaces the working copy; adopt its id as context and list it.
   *  A workspace file restores the filing list; a project bundle admits each
   *  companion. Admit stays outside setState — Strict Mode must not double it. */
  function takeIn(text: string): boolean {
    const got = project.load(text);
    if (!got) return false;

    remember(got.logs);

    if (got.workspace) {
      const next: workspace.Held = { id: got.id, projects: [...got.bundled], locked: [] };
      workspace.save(next);
      setHeld(next);
      setContextId(got.bundled[0] ?? got.id);
      return true;
    }

    setContextId(got.id);
    let next = openIn(held, got.id);
    for (const id of got.bundled) next = openIn(next, id);
    setHeld(next);
    return true;
  }

  /** Reopen from the bound file — same admit path as import when the id moves. */
  async function reopen(): Promise<void> {
    const got = await project.reopen();
    if (!got) return;

    remember(got.logs);

    if (got.workspace) {
      const next: workspace.Held = { id: got.id, projects: [...got.bundled], locked: [] };
      workspace.save(next);
      setHeld(next);
      setContextId(got.bundled[0] ?? got.id);
      return;
    }

    setContextId(got.id);
    let next = openIn(held, got.id);
    for (const id of got.bundled) next = openIn(next, id);
    setHeld(next);
  }

  /** Export every open project beside the workspace graph — the everyday file. */
  async function exportWorkspace(): Promise<void> {
    const shell = graphOf(held.id);
    const open: Record<string, { graph: Graph; steps: number }> = {};

    for (const id of held.projects) {
      const { graph: g, steps } = id === contextId
        ? { graph, steps: project.steps }
        : graphOf(id);
      open[id] = { graph: g, steps: stepsIn(steps) };
    }

    const text = file.writeWorkspace(
      { id: held.id, graph: shell.graph, steps: stepsIn(shell.steps) },
      open,
    );
    await store.writeOut(text, titleOf(shell.graph) || "workspace");
  }

  /** Export the project in context, bundling what it depends on. */
  function exportProject(): Promise<void> {
    return project.save(companions(graph, contextId));
  }

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

  const graphs = useMemo(() => {
    const next: Record<string, Graph> = {};
    for (const id of held.projects) {
      next[id] = id === contextId ? graph : graphOf(id).graph;
    }

    return next;
  }, [held.projects, contextId, graph]);

  const listed = useMemo(() => (
    held.projects.map((id) => {
      const { graph: g, steps } = id === contextId
        ? { graph, steps: project.steps }
        : graphOf(id);

      return { id, tip: tipOf(id, g, steps) };
    })
  ), [held.projects, contextId, graph, project.steps]);

  // Re-read after admit writes the workspace log (`held.projects` is the token).
  const shellGraph = useMemo(
    () => graphOf(held.id).graph,
    [held.id, held.projects],
  );

  /** Unlock the project in context — workspace word only; file unchanged. */
  function unlockPackage() {
    const next = workspace.unlock(held, contextId);
    if ("refuse" in next) {
      say(next.refuse);
      return;
    }
    workspace.save(next);
    setHeld(next);
  }

  /** Fork the locked project: new id, deep copy, switch context to the copy. */
  function forkPackage() {
    const shell = graphOf(held.id);
    // A shipped package may never have earned a store key — its graph lives
    // in the catalogue; ordinary projects fold from their log.
    const source = workspace.pack(contextId)?.graph ?? graph;
    const out = workspace.fork(held, shell.graph, contextId, source);
    if ("refuse" in out) {
      say(out.refuse);
      return;
    }

    // Caller owns the new key — workspace.fork never touches a project slot.
    store.saveProject(out.id, [makeStep("opened", "checkpoint",
      [{ op: "checkpoint", graph: out.graph, at: stepsIn(project.steps) }])]);
    store.saveProject(held.id, compact([
      ...shell.steps,
      makeStep("opened", "admit", out.mutations),
    ]));
    workspace.save(out.held);
    setHeld(out.held);
    setContextId(out.id);
  }

  /** Strip message: page notice wins; else project trouble with unlock/fork acts. */
  const said = notice ?? (project.trouble ? {
    text: project.trouble,
    acts: project.offer?.map((way) => ({
      label: way,
      run: way === "unlock" ? unlockPackage : forkPackage,
    })),
  } : null);

  /** Which view module draws the open layer — the layer's definition, never
   *  a page setting. Root when nothing is open. */
  const open = graph.elements[view ?? ROOT];
  const module = open ? viewOf(graph, open).module : "block";

  return (
    <div className="app">
      <header>
        <h1>mndflow</h1>
        {/* Whose project this is, where the domain used to sit — the domain is
            a setting, and a name is what tells one project from another. */}
        <span className="domain">
          {titleOf(graph) || "untitled"}
        </span>

        {/* Where the work actually lives, said all the time rather than only
            when it breaks. One control, three states: normally it names the
            working copy; when the browser stops accepting it, or when a bound
            file has changed underneath, the same control becomes the warning
            and the way out. Storage failure wins — data only in this tab. */}
        <button
          className={`where${project.saving && !project.drifted ? "" : " unsaved"}`}
          onClick={() => {
            if (project.saving && project.drifted) void reopen();
            else void exportProject();
          }}
          title={!project.saving
            ? "This browser will not store any more of this project. Export it to keep it."
            : project.drifted
              ? "The file on disk has changed since this session last wrote or read it. Reopen to take the disk copy."
              : "This session is kept in the browser. Export a snapshot to keep a copy elsewhere."}
        >
          {!project.saving
            ? "⚠ not being saved — export"
            : project.drifted
              ? "⚠ file changed — reopen"
              : "working session"}
        </button>

        <span className="tools">
          <button onClick={project.undo} disabled={!project.undoable} title="Undo">↤</button>
          <button onClick={project.redo} disabled={!project.redoable} title="Redo">↦</button>
          <button
            onClick={() => void exportWorkspace()}
            disabled={!held.projects.length && !project.steps.length}
            title="Export the workspace"
          >
            ⤓
          </button>
          <button
            onClick={() => void exportProject()}
            disabled={!project.steps.length}
            title="Export this project (bundles what it depends on)"
          >
            ↧
          </button>
          <button
            type="button"
            className="import"
            title="Open a snapshot, replacing what is here"
            onClick={async () => {
              if (store.canBind()) {
                const text = await store.pickIn();
                if (text === null) return;
                if (!takeIn(text)) {
                  store.release();
                  say("That file is not a mndflow project.");
                }
                return;
              }
              // No live handle: the plain file input is the whole path.
              importInput.current?.click();
            }}
          >
            ⤒
            <input
              ref={importInput}
              type="file"
              accept=".json"
              hidden
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                store.release();
                if (file && !takeIn(await file.text())) {
                  say("That file is not a mndflow project.");
                }
              }}
            />
          </button>
          <button
            onClick={() => say("Discard this project? Export it first if you want it back.",
                              { label: "discard", run: project.reset })}
            disabled={!project.steps.length}
            title="Start a new, empty project"
          >
            ＋
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
            shell={shellGraph}
            graphs={graphs}
            projects={listed}
            context={contextId}
            view={view}
            terms={terms}
            showPorts={treePorts}
            onShowPorts={setTreePorts}
            onOpen={navigate}
            onCreate={project.create}
            onNameTaken={project.nameTaken}
            onSay={say}
            unit={UNIT}
            onDelete={project.remove}
            onMove={project.move}
            onRename={project.rename}
            onRenameProject={project.renameProject}
          />
        </div>

        <section className="work">
          <div className="canvas">
            {module === "table" ? (
              <Table
                graph={graph}
                layer={view}
                picked={picked?.kind === "node" ? picked.id : null}
                onPick={(id) => project.pick({ kind: "node", id })}
                onOpen={project.open}
              />
            ) : module === "matrix" ? (
              <Matrix
                graph={graph}
                layer={view}
                picked={picked?.kind === "node" ? picked.id : null}
                onPick={(id) => project.pick({ kind: "node", id })}
                onOpen={project.open}
              />
            ) : (
            <Canvas
              graph={graph}
              unit={UNIT}
              hinted={hinted}
              said={said}
              onSay={say}
              onHeard={() => (setNotice(null), project.clearTrouble())}
              view={view}
              picked={picked}
              path={path}
              showPorts={ports}
              onShowPorts={setPorts}
              angular={angular}
              onAngular={setAngular}
              form={form}
              onForm={setForm}
              onArrangeLayer={project.arrange}
              onRelax={project.relax}
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
              onSize={project.size}
              onTie={project.tie}
            />
            )}

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
              onAddField={project.addField}
              onUpdateField={project.updateField}
              onDropField={project.dropField}
              onLeaveGroup={project.leaveGroup}
              onJoinGroup={project.joinGroup}
              onRename={project.rename}
              onNameTaken={project.nameTaken}
              onSay={say}
              onRelation={project.relation}
              onSetDir={project.setDir}
              onFlip={project.flip}
              onReveal={project.reveal}
              onDefine={project.define}
              onUndefine={project.undefine}
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
