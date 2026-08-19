/** Shell: optional terminal rail at the top, object explorer and graph below.
 *
 *  The canvas takes everything left over. The attributes of whatever is
 *  selected ride at the foot of the canvas itself.
 *
 *  The rail is one optional mount: when `terminal/` is in the build its Chat
 *  appears; when it is not, the page still runs. Nothing below imports the
 *  rail.
 *
 *  There is no server. Everything below runs against a step log in this tab.
 *  Which log is which project's is decided by the explorer: the selected row's
 *  project is the context. */

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";

import {
  axisOf, compact, fold, isCheckpoint, nameFree, nameOf, nextNum, stepsIn, titleOf,
} from "../graph/fold";
import { entering } from "../graph/check";
import * as file from "../graph/file";
import { useProject } from "../project";
import * as store from "../graph/store";
import { lookup } from "../actions";
import {
  ROOT, defIdFor, element as makeElement, refAt, refTo, step as makeStep,
  type EdgeForm, type Element, type Graph, type Layout, type Mutation, type Step,
} from "../graph/types";
import { Canvas } from "../canvas/Canvas";
import { type Grazed } from "../canvas/card";
import { createsFor, viewOf, views, named, type ViewName } from "../modules/view";
import { asViewKind, layerKind } from "./kind";
import { Rail, groupsFor } from "./Rail";
import { Activity } from "../modules/view/activity";
import { Sequence } from "../modules/view/sequence";
import { State } from "../modules/view/state";
import { lookNow, svgOf } from "../modules/view/diagram";
import { Matrix } from "../modules/view/matrix";
// No component of its own since W.1 — the view toggle fills the tray with
// Contents instead of a second listing; the import also registers the module.
import { fieldsIn } from "../modules/view/table";
import * as workspace from "../workspace";
import { Files, type Chosen } from "./Files";
import { Icon } from "../modules/icons";
import { Panel } from "./Panel";

type ChatProps = {
  graph: Graph;
  view: string | null;
  picked: { kind: "node" | "edge" | "attr"; id: string } | null;
  project: string;
  open: Record<string, Graph>;
  chosen: string[];
  locked?: boolean;
  draft: string;
  onDraft: (text: string) => void;
  onAct: (name: string, args?: Record<string, unknown>) => boolean;
};

/** Rail UI when `terminal/` is present. Eager so Chat's side-effect imports
 *  (currently just per-domain terms — see `terminal/terms.ts`) register before
 *  the first render; an empty glob is a build without the rail. */
const railMods = import.meta.glob("../terminal/*.tsx", { eager: true }) as Record<
  string,
  { Chat?: ComponentType<ChatProps> }
>;

const Chat = (() => {
  for (const mod of Object.values(railMods)) {
    if (mod.Chat) return mod.Chat;
  }
  return undefined;
})();

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

/** Shell colour themes — chrome only; never the `style` component's sets.
 *
 *  Three named looks, in Nextra's order: light, dark, then the slot a *system*
 *  toggle would hold. `retro` sits there and is the default, but it does not
 *  read `prefers-color-scheme` — following the operating system would need a
 *  fourth state, and three concrete looks is what was wanted.
 *
 *  **The order is the cycle**, since one icon steps through them rather than
 *  three sitting side by side. */
const THEMES = [
  { name: "light", word: "light", icon: "theme_light", tip: "Light" },
  { name: "modern", word: "modern", icon: "theme_modern", tip: "Modern — blues" },
  { name: "retro", word: "retro", icon: "theme_retro", tip: "Retro — green on black" },
] as const;
type Theme = (typeof THEMES)[number]["name"];

const THEME_KEY = "mndflow.theme.v1";

function readTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "modern" || raw === "light" || raw === "retro") return raw;
    // `current` was this look's name before it was called retro; a session
    // that stored it must not land themeless.
    if (raw === "current") return "retro";
  } catch {
    // Preference unread; stay on the default.
  }

  return "retro";
}

function writeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Preference lost, nothing more.
  }
}

/** Which view module is showing — sticky per project, never in the log. */
const VIEW_KEY = "mndflow.view.v1";

function readViews(): Record<string, ViewName> {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, ViewName> = {};
    for (const [id, name] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof name === "string" && named(name)) out[id] = name as ViewName;
    }
    return out;
  } catch {
    return {};
  }
}

function writeViews(map: Record<string, ViewName>) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(map));
  } catch {
    // Preference lost, nothing more.
  }
}

/** The three modules the *open layer* offers — kind derived from that
 *  layer's own children (`kind.ts`, settled stream P), never from the root's
 *  definition. A fresh, childless layer defaults to structure, and a set
 *  (mixed children) is viewed as one too — `ViewKind` stays two. */
function offered(graph: Graph, layer: string | null, open: Record<string, Graph> = {}): ViewName[] {
  const kind = asViewKind(layerKind(graph, layer, open));

  return views().filter((m) => m.kind === kind).map((m) => m.name);
}

/** What is on screen for a project: sticky pick when it still belongs to the
 *  kind, else how the open layer's definition opens. Writes nothing. */
function moduleOf(
  prefs: Record<string, ViewName>,
  projectId: string,
  graph: Graph,
  layer: string | null,
  open: Record<string, Graph> = {},
): ViewName {
  const options = offered(graph, layer, open);
  const fallback = options[0] ?? "block";
  const sticky = prefs[projectId];
  if (sticky && options.includes(sticky)) return sticky;

  const el = graph.elements[layer ?? ROOT];
  const opens = el ? viewOf(graph, el).module : fallback;
  return options.includes(opens) ? opens : fallback;
}

/** The two families a definition's form falls into — what the strip's two
 *  halves are gathered by. Both are the closed form sets, read here rather
 *  than restated as a rule. */
const EDGE_FORMS = new Set(["line", "directed"]);
const ELEM_FORMS = new Set(["block", "note", "group", "proxy"]);

/** Definitions of these forms in scope — packages this project imports in
 *  order, then its own, each once. Only the page can gather it: `actions/`
 *  reads `graph` and `geometry` and never the workspace, so the strip is
 *  handed the vocabulary rather than reaching for it (`X.2`). */
function kindsInScope(graph: Graph, forms: Set<string>) {
  const open = workspace.gather(graph.vocabulary);
  const out: { name: string; path: string; form: string }[] = [];
  const drawn = new Set<string>();

  for (const row of workspace.scoped(graph.vocabulary, open)) {
    if (!forms.has(row.def.form) || drawn.has(row.path)) continue;
    drawn.add(row.path);
    out.push({ name: row.def.name, path: row.path, form: row.def.form });
  }
  for (const def of Object.values(graph.defs)) {
    if (!forms.has(def.form) || drawn.has(def.id)) continue;
    drawn.add(def.id);
    out.push({ name: def.name, path: def.id, form: def.form });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The type a fresh behavior block gets — `creates`' word under the one
 *  shipped package whose definitions read as behavior. Reads the same source
 *  of truth `kind.ts` derives from, rather than naming a definition here. */
function behaviorType(): string {
  const word = createsFor("behavior");

  return word ? refTo(defIdFor(word), workspace.packId("behavior")) : "";
}

/** Mutations that add one behavior-typed child, importing the package it
 *  names first when this graph does not already — a package is additive,
 *  never a replacement (`extraction`'s own rule). Shared by `newProject`'s
 *  fresh root and `createBehavior`'s child under an existing selection. */
function seedBehavior(graph: Graph, type: string, fresh: Element): Mutation[] {
  const pack = workspace.packId("behavior");
  const vocabulary = graph.vocabulary.includes(pack) ? null : [...graph.vocabulary, pack];

  return [
    ...(vocabulary ? [{ op: "set_vocabulary" as const, vocabulary }] : []),
    { op: "add_element" as const, element: fresh },
  ];
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
  if (held.projects.includes(projectId)) return held;

  const { graph, steps } = graphOf(held.id);

  // Already proxied in the shell but missing from the list — a log written
  // before this call, or an effect that ran twice. Adopt it; admitting again
  // would draw the project a second time.
  if (workspace.holds(graph, projectId)) {
    const next = { ...held, projects: [...held.projects, projectId] };
    workspace.save(next);

    return next;
  }

  const out = workspace.admit(held, graph, projectId);
  if ("refuse" in out) return held;

  workspace.save(out.held);
  store.saveProject(held.id, compact([
    ...steps,
    makeStep("opened", "admit", out.mutations),
  ]));

  return out.held;
}

/** Forget every project storage has no log for.
 *
 *  **A project earns its place in the workspace the way it earns a key: on the
 *  first change.** Admitting on *open* instead put a row in the explorer for
 *  every session that was started and never used — each one untitled, so each
 *  drew as the bare word `project`, and nothing ever took them out again. */
function prune(held: workspace.Held): workspace.Held {
  const gone = held.projects.filter((id) => !store.isKeyed(id));
  if (!gone.length) return held;

  const { graph, steps } = graphOf(held.id);
  let next = held;
  const mutations: Mutation[] = [];

  for (const id of gone) {
    const out = workspace.forget(next, graph, id);
    next = out.held;
    mutations.push(...out.mutations);
  }

  workspace.save(next);
  if (mutations.length) {
    store.saveProject(held.id, compact([
      ...steps,
      makeStep("closed", "forget", mutations),
    ]));
  }

  return next;
}

/** Tooltip for an open project: id, how much work, and which copy. */
function tipOf(id: string, graph: Graph, steps: Step[]): string {
  const written = file.write(graph, id, stepsIn(steps));

  return `${id} · ${stepsIn(steps)} steps · ${file.hash(written)}`;
}

export function App() {
  // The session project is *not* admitted here. It joins the workspace when it
  // first holds something (below), so a fresh session shows no rows at all.
  const [held, setHeld] = useState(() => prune(workspace.load()));
  /** Which project's log the page writes to — the selected explorer row's. */
  // `""` until a project is named. Storage no longer invents one: a project
  // comes into being by being named, so nothing can be added before that.
  const [contextId, setContextId] = useState(() => store.currentProject());
  /** Layer to open once useProject has rebound after a context switch. */
  const pendingView = useRef<{ project: string; layer: string | null } | null>(null);

  // A registry effect that mints a project (`infer`'s fresh behavior project)
  // reaches the workspace through the same door a dropped block or the bar's
  // control does — `openIn`, not a copy of what it does (P.3).
  const project = useProject(
    contextId,
    workspace.isLocked(held, contextId),
    (id) => setHeld((current) => openIn(current, id)),
  );

  // A project that got into the list without a name cannot be told from any
  // other — the rule is enforced on the way in, so this is only a safety net.
  useEffect(() => {
    if (!contextId || held.projects.includes(contextId)) return;
    if (!project.steps.length) return;

    setHeld(openIn(held, contextId));
  }, [contextId, held, project.steps.length]);
  const { graph, view, picked, path, terms } = project;

  /** Every open project's name, for the uniqueness rule. */
  const takenNames = useMemo(
    () => workspace.names(Object.fromEntries(
      held.projects.map((id) => [id, id === contextId ? graph : graphOf(id).graph]),
    )),
    [held.projects, contextId, graph],
  );

  /** The `new` page action: name it, and that naming is its first step.
   *
   *  Naming is what brings a project into being — it earns a key, a place in
   *  the workspace and the context, all from having been called something.
   *  `kind` (P) is which of the bar's two create buttons asked: a behavior
   *  root reads as one only once it holds a behavior child, since kind is
   *  derived from what a layer holds and an empty root always defaults to
   *  structure — so this seeds one, typed the same way `createBehavior`
   *  types a child under an existing selection. */
  function newProject(name: string, kind: "structure" | "behavior" = "structure"): string | null {
    // `begin` is the one door: it names, mints the id, writes the first step
    // and admits the project to the shell in one go. App used to do all four
    // itself, which is how `begin` sat unwired with the page's own copy of the
    // name check beside it (U.14 ◐).
    const { graph: shell, steps } = graphOf(held.id);
    const out = workspace.begin(held, shell, name, takenNames);
    if ("refuse" in out) {
      say(out.refuse);

      return null;
    }

    const type = kind === "behavior" ? behaviorType() : "";
    const projectSteps = type ? [...out.steps, makeStep("new: behavior", "create",
      seedBehavior(fold(out.steps), type, makeElement("", { parent: null, type, num: 1 })))]
      : out.steps;

    store.saveProject(out.id, projectSteps);
    store.adoptId(out.id);
    workspace.save(out.held);
    store.saveProject(held.id, compact([
      ...steps,
      makeStep("opened", "admit", out.mutations),
    ]));
    setHeld(out.held);
    pendingView.current = { project: out.id, layer: null };
    setContextId(out.id);

    return out.id;
  }

  /** The bar's other create button (P): the same door as `project.create`
   *  and the same selection rule the tree already follows, but the block it
   *  makes is typed to what the behavior modules `create` — one atomic write,
   *  since folding a package-qualified type needs no separate `define`. */
  function createBehavior(label: string, parent: string | null): void {
    const text = label.trim();
    const type = behaviorType();
    if (!text || !type || !nameFree(graph, parent, text)) return;

    const fresh = makeElement(text, { parent, type, num: nextNum(graph, parent, "block") });
    project.home(
      contextId,
      seedBehavior(graph, type, fresh),
      { say: `new: ${text}`, action: "create" },
      workspace.isLocked(held, contextId),
    );
  }

  // Held here so the rail can watch it being typed.
  const [draft, setDraft] = useState("");
  /** The tray, so the canvas can keep its own controls above it. Nothing else
   *  reads it: the tab and the view toggle are the only doors, and its height
   *  is a share of the stage rather than something to measure (`W.1a`). */
  const tray = useRef<HTMLElement>(null);
  /** Plain-file fallback when File System Access is absent. */
  const importInput = useRef<HTMLInputElement>(null);

  // Display preferences: global to the app, kept apart from the project's own
  // history because how something is drawn is not a change to it.
  const [angular, setAngular] = useState(store.angular.initial);
  const [ports, setPorts] = useState(store.ports.initial);
  /** Page chrome palette — not a style set, not in the log. */
  const [theme, setTheme] = useState<Theme>(() => {
    const next = readTheme();
    document.documentElement.dataset.theme = next;
    return next;
  });
  /** Where the look sits in the cycle, and where a press sends it. */
  const themeAt = Math.max(0, THEMES.findIndex((t) => t.name === theme));
  const themeNext = (themeAt + 1) % THEMES.length;
  /** Which view module is showing, per project — display preference, like ports. */
  const [viewPrefs, setViewPrefs] = useState<Record<string, ViewName>>(readViews);
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
  /** Which relationship type the next right drag draws. A display preference
   *  beside `form` and `angular`, held here rather than in the canvas because
   *  the rail that picks it is page-level (Y.1). */
  const [kind, setKind] = useState<{ path: string; form: string } | null>(null);
  /** Which type the listing views are narrowed to. Page state for the same
   *  reason `form` is: the rail owns the control and table and matrix stopped
   *  drawing one of their own (Y.4). */
  const [shownType, setShownType] = useState<string | null>(null);
  /** Which fields the table gives a column of their own (P.8). The table's
   *  state, never a definition's — beside `shownType` for the same reason,
   *  since the rail is what picks both. */
  const [shownColumns, setShownColumns] = useState<string[]>([]);
  /** What the next export renders in. Page state beside `form` and `angular`
   *  for the same reason: the tool in hand, not a per-project preference
   *  (Y.6a). `shown` — the default — follows whatever `theme` is. */
  /** The one verb the page cannot work out for itself: arranging needs the
   *  laid-out geometry only the canvas has, so the canvas publishes it here
   *  rather than the page reaching in. Dependencies still run one way. */
  const arranging = useRef<((shape: Layout) => void) | null>(null);
  /** Explorer multi-select — cross-project refs `infer` will take. Held here
   *  so the action can read it without the tree owning the session. */
  const [chosen, setChosen] = useState<Chosen[]>([]);
  /** Bumped after a write that lands in another open project's log without
   *  touching this hook's own state — an extraction between two projects
   *  neither of which is bound here writes storage directly (P.1's
   *  `workspace.writeInto`), so `graphs` would otherwise not reread that slot
   *  until something else changed `contextId` or `graph`. A drop should look
   *  moved the instant it lands, not on the next unrelated re-render (P.15). */
  const [refoldAt, setRefoldAt] = useState(0);
  useEffect(() => store.angular.set(angular), [angular]);
  useEffect(() => store.ports.set(ports), [ports]);
  useEffect(() => store.treePorts.set(treePorts), [treePorts]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    writeTheme(theme);
  }, [theme]);
  useEffect(() => writeViews(viewPrefs), [viewPrefs]);

  // After switching project, open the layer the click asked for — but only once
  // the hook has folded *that* project's log.
  //
  // `project.open` is a fresh closure every render, so this effect runs on every
  // render too. Waiting for the layer to actually be in the graph is what tells
  // a rebind apart from an ordinary re-render; consuming it eagerly opened the
  // id against the project we were leaving, which said "Nothing to open."
  useEffect(() => {
    const want = pendingView.current;
    if (!want || want.project !== contextId) return;
    if (want.layer !== null && !graph.elements[want.layer]) return;

    pendingView.current = null;
    project.open(want.layer);
  }, [graph, contextId, project.open]);

  /** Bring a project into context and open a layer inside it. */
  function navigate(projectId: string, layer: string | null) {
    // A second click arriving before the first has landed is the same gesture —
    // a double-click, which the tree reads as rename. The rows may have moved
    // under the pointer by then, so that click's id is not to be trusted; the
    // intent already queued wins. Cleared within a render of the graph folding,
    // so this suppresses nothing a person could aim.
    if (pendingView.current) return;

    if (projectId !== contextId) {
      pendingView.current = { project: projectId, layer };
      setContextId(projectId);
      return;
    }
    pendingView.current = null;
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

  /** Take a block out of one project and into another — or into none, which
   *  makes it a project of its own (P.1).
   *
   *  **Two steps in two logs**, because a project is a log and nothing spans
   *  both: the subtree is written into the destination through `writeInto`, and
   *  the source deletes it through the door like any other edit.
   *
   *  **Promotion goes through `newProject`'s own door.** A block dropped on
   *  nowhere is named into the workspace by `workspace.begin` exactly as the
   *  bar's control does, and the subtree is written in after — so there is one
   *  way to make a project and not two (P.3).
   *
   *  **Relationships crossing the boundary are lost**, which is deliberate —
   *  nothing stands in for the block it left — so the strip says how many. */
  function extract(from: string, id: string, into: string | null, parent: string | null) {
    const source = graphs[from];
    if (!source) return;

    // **Refuse before either write, never between them.** The two logs are
    // written one after the other, so a source that turns out to be unwritable
    // *after* the destination has taken the subtree would leave the block in
    // both projects at once.
    if (workspace.isLocked(held, from)) {
      say("This package is locked.");
      return;
    }

    const taken = workspace.extraction(
      source, id, into ? parent : null, into ? "child" : "root",
      into ? graphs[into] : undefined,
    );
    if ("refuse" in taken) {
      say(taken.refuse);
      return;
    }

    const name = nameOf(source, source.elements[id]) || UNIT;
    const target = into ?? newProject(name);
    if (!target) return;

    const landed = workspace.writeInto(target, taken.mutations, {
      say: `took in: ${name}`, action: "move",
    });
    if ("refuse" in landed) {
      say(landed.refuse);
      return;
    }

    // The source loses it through the ordinary door, so the cascade and the
    // partings `delete` already has do the work rather than a second copy.
    const gone = workspace.writeInto(from, [{ op: "delete_element", id }], {
      say: `sent out: ${name}`, action: "delete",
    });
    if ("refuse" in gone) {
      say(gone.refuse);
      return;
    }

    // The drop already showed the move happening — a fluid gesture needs no
    // receipt (Clay's call), so the strip goes quiet rather than keeping
    // whatever it last said. A relationship left behind is the one part the
    // gesture cannot show, so that alone is still said (P.15).
    if (taken.lost) {
      say(`${name} — ${taken.lost} relationship${taken.lost === 1 ? "" : "s"} left behind`);
    } else {
      setNotice(null);
    }

    // Neither write above touched this hook's own state when `from` or the
    // target is a project other than the one bound here — force the source
    // (and destination) tree to reread storage now, not on the next
    // unrelated re-render.
    setRefoldAt((n) => n + 1);
  }

  /** Export the project in context, bundling what it depends on, and offer a
   *  rendered SVG of the open layer beside that source (F.3). */
  async function exportProject(): Promise<void> {
    const wrote = await project.save(companions(graph, contextId));
    if (!wrote) return;
    // The picture leaves in the ramp the screen is actually in (Y.6), so an
    // export never stamps a theme nobody chose. A caller with no page still
    // gets `PAPER`. The look is not a per-project setting and has no control
    // of its own — the theme toggle in the header is the only door.
    store.downloadSvg(svgOf(graph, view, lookNow()), titleOf(graph) || "mndflow");
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

  const graphs = useMemo(() => {
    const next: Record<string, Graph> = {};
    for (const id of held.projects) {
      next[id] = id === contextId ? graph : graphOf(id).graph;
    }

    return next;
  }, [held.projects, contextId, graph, refoldAt]);

  // Drop picks whose project closed or whose block was undone.
  useEffect(() => {
    setChosen((prior) => {
      const next = prior.filter((ref) => {
        const { project, id } = refAt(ref);
        if (!project || !held.projects.includes(project)) return false;
        const g = graphs[project];
        return id === ROOT || Boolean(g?.elements[id]);
      });

      return next.length === prior.length && next.every((k, i) => k === prior[i])
        ? prior
        : next;
    });
  }, [held.projects, graphs]);

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

  /** Drop every open project and the workspace with them — a fresh session.
   *
   *  Storage clears the keyed slots and the session pointer; the page takes a
   *  blank Held and no context. Bigger than discarding one project, so the
   *  header asks first and names the act in words. */
  function clearWorkspace() {
    store.clearSession();
    for (const id of Object.keys(stash)) delete stash[id];

    const next = workspace.blank();
    workspace.save(next);
    setHeld(next);
    setContextId("");
    setChosen([]);
    setHinted(null);
    setDraft("");
    setNotice(null);
    setViewPrefs({});
  }

  /** Drop a project from the workspace, log and all.
   *
   *  A workspace operation the way `begin`, unlock and fork are, not a registry
   *  action — the closed set is untouched. `forget` takes the proxy out of the
   *  shell; the keyed log has to go too, or a reload brings the project back.
   *
   *  Asked first (V.13). Deleting a block is one undoable step; this is not in
   *  the log at all, so undo cannot bring it back and a confirm is the only
   *  thing standing in front of it. */
  function dropProject(projectId: string) {
    const title = titleOf(graphs[projectId] ?? graph) || "this project";

    say(`Delete "${title}"? Its history goes with it and undo will not bring it back.`, {
      label: "delete",
      run: () => {
        // `held` is read here rather than captured at prompt time: the confirm
        // is deferred, and a project imported or named while it sat open would
        // otherwise be dropped by writing back a stale list.
        setHeld((current) => {
          const shell = graphOf(current.id);
          const out = workspace.forget(current, shell.graph, projectId);

          workspace.save(out.held);
          store.saveProject(current.id, compact([
            ...shell.steps,
            makeStep("deleted", "forget", out.mutations),
          ]));
          // Clears the session pointer too when it named this project.
          store.dropProject(projectId);
          delete stash[projectId];

          const next = out.held.projects.find((id) => id !== projectId) ?? "";
          if (next) store.adoptId(next);

          return out.held;
        });

        setChosen((was) => was.filter((ref) => !ref.startsWith(`${projectId}/`)));
        if (projectId === contextId) {
          setContextId(held.projects.find((id) => id !== projectId) ?? "");
        }
      },
    });
  }

  /** Relationship kinds the project can draw: the ones its packages bring,
   *  then its own.
   *
   *  Each carries the **path** it is addressed by, not just a name — a bare
   *  name would be minted as a local twin under a derived id, and where that id
   *  matches the package's own it would shadow it. Two packages may ship the
   *  same name, and both stay on offer (SC.4). */
  const relationKinds = useMemo(() => kindsInScope(graph, EDGE_FORMS), [graph]);

  /** The element half of the same vocabulary, for the strip (`X.2`). Only the
   *  page can see past this project, so what a block, a group or a note could
   *  become is gathered here and handed down beside the relation kinds — the
   *  gap that left `R.9` offering the project's own definitions alone. */
  const elementKinds = useMemo(() => kindsInScope(graph, ELEM_FORMS), [graph]);
  const vocabulary = useMemo(
    () => ({ relations: relationKinds, elements: elementKinds }),
    [relationKinds, elementKinds],
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

  /** Strip message: page notice, then trouble (with unlock/fork), then pressure. */
  const said = notice ?? (project.trouble ? {
    text: project.trouble,
    acts: project.offer?.map((way) => ({
      label: way,
      run: way === "unlock" ? unlockPackage : forkPackage,
    })),
  } : project.pressure ? { text: project.pressure } : null);

  /** Which view module draws the open layer — sticky preference when it still
   *  fits the project kind; otherwise how the layer's definition opens. */
  const module = contextId
    ? moduleOf(viewPrefs, contextId, graph, view, graphs)
    : "block";

  /** What the open view's `types` group lists — the module's answer, since a
   *  table filters by definition names and a matrix by relationship marks. A
   *  pick that is no longer on the layer reads as *everything* rather than as
   *  a filter that hides all of it, so nothing has to be reset on navigation. */
  const layerTypes = useMemo(
    () => named(module)?.types?.of(graph, view) ?? [],
    [module, graph, view],
  );
  const narrowed = shownType && layerTypes.includes(shownType) ? shownType : null;

  /** Fields the open layer's rows carry — what a column can be made of, and
   *  the list the rail offers (P.8). A pick that is no longer on the layer
   *  simply draws no column, the way a stale type reads as *everything*. */
  const layerFields = useMemo(() => fieldsIn(graph, view), [graph, view]);
  const columned = useMemo(
    () => shownColumns.filter((name) => layerFields.includes(name)),
    [shownColumns, layerFields],
  );

  /** Resolved shown module per open project — what the explorer marks as on. */
  const shownViews = useMemo(() => {
    const next: Record<string, ViewName> = {};
    for (const id of held.projects) {
      const g = graphs[id];
      if (!g) continue;
      next[id] = moduleOf(
        viewPrefs,
        id,
        g,
        id === contextId ? view : null,
        graphs,
      );
    }
    return next;
  }, [held.projects, graphs, viewPrefs, contextId, view]);

  /** Last thing somebody did in this project's log — a checkpoint is not one. */
  const lastAction = useMemo(() => {
    for (let i = project.steps.length - 1; i >= 0; i--) {
      const step = project.steps[i]!;
      if (step.status !== "applied" || isCheckpoint(step)) continue;
      return lookup(step.action)?.label ?? step.action;
    }
    return null;
  }, [project.steps]);

  return (
    <div className="app">
      <header>
        {/* Identity yields under pressure; the tools never do. A long project
            name truncates here rather than shoving export off the row. */}
        <span className="identity">
          <h1>mndflow</h1>
          {/* Whose project this is, where the domain used to sit — the domain is
              a setting, and a name is what tells one project from another. */}
          <span className="domain">
            {titleOf(graph) || "untitled"}
          </span>
        </span>

        {/* Where the work actually lives, said all the time rather than only
            when it breaks. One control, three states: normally it names the
            working copy; when the browser stops accepting it, or when a bound
            file has changed underneath, the same control becomes the warning
            and the way out. Storage failure wins — data only in this tab. */}
        <button
          className={`where${project.saving && !project.drifted ? "" : " unsaved"}`}
          data-where={!project.saving ? "unsaved" : project.drifted ? "drifted" : "session"}
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
          <button
            onClick={() => void exportWorkspace()}
            disabled={!held.projects.length && !project.steps.length}
            title="Export the workspace"
          >
            <Icon name="export_workspace" />
          </button>
          <button
            type="button"
            className="import"
            title="Open a snapshot, replacing what is here"
            onClick={async () => {
              if (store.canBind()) {
                const text = await store.pickIn();
                // Cancelled — leave the session alone. Failed — plain input.
                if (text === false) return;
                if (text !== null) {
                  if (!takeIn(text)) {
                    store.release();
                    say("That file is not a mndflow project.");
                  }
                  return;
                }
              }
              // No live handle, or the Chromium picker failed: plain file input.
              importInput.current?.click();
            }}
          >
            <Icon name="import_file" />
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
            type="button"
            onClick={() => say(
              "Discard this workspace? Export it first if you want it back.",
              { label: "discard", run: clearWorkspace },
            )}
            disabled={!held.projects.length && !contextId && !project.steps.length}
            title="Clear the session and start a new workspace"
          >
            <Icon name="discard" />
          </button>

          {/* One icon that cycles, as the project's view toggle does. The mark
              it wears is the look that is on, so nothing is hidden behind the
              press; the tooltip names where the next one goes. */}
          <span className="themes compact" role="group" aria-label="Theme">
            <button
              type="button"
              className="on"
              title={`${THEMES[themeAt]!.tip} — click for ${THEMES[themeNext]!.word}`}
              onClick={() => setTheme(THEMES[themeNext]!.name)}
            >
              <Icon name={THEMES[themeAt]!.icon} />
            </button>
          </span>
        </span>
      </header>

      {Chat && (
        <Chat
          graph={graph}
          view={view}
          picked={picked}
          project={contextId}
          open={graphs}
          chosen={chosen}
          locked={workspace.isLocked(held, contextId)}
          draft={draft}
          onDraft={setDraft}
          onAct={project.go}
        />
      )}

      <main>
        <div className="side">
          <Files
            shell={shellGraph}
            graphs={graphs}
            projects={listed}
            context={contextId}
            view={view}
            chosen={chosen}
            onChoose={setChosen}
            terms={terms}
            showPorts={treePorts}
            onShowPorts={setTreePorts}
            onOpen={navigate}
            onCreate={project.create}
            onCreateBehavior={createBehavior}
            onNewProject={(name, kind) => Boolean(newProject(name, kind))}
            onNameProject={(name, except) => workspace.mayName(takenNames, name, except)}
            onNameTaken={project.nameTaken}
            onSay={say}
            unit={UNIT}
            onDelete={project.remove}
            onDropProject={dropProject}
            onMove={project.move}
            onExtract={extract}
            onRename={project.rename}
            onRenameProject={project.renameProject}
            onAct={project.go}
            onUndo={project.undo}
            onRedo={project.redo}
            undoable={project.undoable}
            redoable={project.redoable}
            lastAction={lastAction}
            // P.10: the workspace opens the same door every other row does —
            // `navigate` already knows how to switch context and land on root.
            workspaceOpen={contextId === held.id}
            onOpenWorkspace={() => navigate(held.id, null)}
          />
        </div>

        <section className="work">
          <div className="canvas">
            {module === "table" ? (
              // Nothing draws here: the toggle fills the tray with Contents
              // at full stage size instead (W.1).
              null
            ) : module === "matrix" ? (
              <Matrix
                graph={graph}
                layer={view}
                picked={picked?.kind === "node" ? picked.id : null}
                onPick={(id) => project.pick({ kind: "node", id })}
                onOpen={project.open}
                path={path}
                onUp={project.up}
                shown={narrowed}
                onRefer={project.refer}
              />
            ) : module === "activity" ? (
              <Activity
                graph={graph}
                layer={view}
                picked={picked?.kind === "node" ? picked.id : null}
                onPick={(id) => project.pick({ kind: "node", id })}
                onOpen={project.open}
              />
            ) : module === "sequence" ? (
              <Sequence
                graph={graph}
                layer={view}
                picked={picked?.kind === "node" ? picked.id : null}
                onPick={(id) => project.pick({ kind: "node", id })}
                onOpen={project.open}
              />
            ) : module === "state" ? (
              <State
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
              onHeard={() => (setNotice(null), project.clearTrouble(), project.clearPressure())}
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
              scope={vocabulary}
              kind={kind}
              arranging={arranging}
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
              onAct={project.go}
            />
            )}

            <Panel
              graph={graph}
              view={view}
              picked={picked}
              unit={UNIT}
              onPick={project.pick}
              onOpen={project.open}
              path={path}
              onUp={project.up}
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
              full={module === "table"}
              onRefer={project.refer}
              columns={columned}
            />
          </div>

          <Rail
            groups={groupsFor({
              offers: named(module)?.chrome ?? [],
              views: offered(graph, view, graphs).map((name) => ({
                name,
                icon: (named(name)?.icon ?? "view_block") as never,
                on: name === module,
                run: () => setViewPrefs((prior) => ({ ...prior, [contextId]: name })),
              })),
              showPorts: ports, onShowPorts: setPorts,
              angular, onAngular: setAngular,
              form, onForm: setForm,
              types: layerTypes, typeIcon: (named(module)?.types?.icon ?? "role_leaf") as never,
              shownType: narrowed, onShownType: setShownType,
              columns: layerFields,
              shownColumns: columned,
              onColumn: (name) => setShownColumns((prior) => (prior.includes(name)
                ? prior.filter((held) => held !== name)
                : [...prior, name])),
              kind, onKind: setKind, kinds: relationKinds,
              axis: axisOf(graph, view), onAxis: project.setAxis,
              onArrange: (shape) => arranging.current?.(shape),
              onRelax: project.relax,
              onExport: () => void exportProject(),
            })}
          />
        </section>
      </main>
    </div>
  );
}
