/** Object explorer. Structure, and only structure: nodes nested to any depth.
 *
 *  Groups, annotations and every other attribute are non-structural and never
 *  appear here. Interfaces are child nodes and so belong, but stay hidden
 *  behind a toggle — one port per relationship would bury the tree it is meant
 *  to make legible.
 *
 *  Every open project is a root in the same tree, filed under the folders the
 *  workspace keeps. A plain click here is a navigation: it picks which project
 *  is in context and sets the layer the canvas draws. Shift or Cmd click adds
 *  to a cross-project selection — blocks, branches and whole projects — without
 *  moving the scope; that set is what `infer` will take. Parent branches are
 *  marked by their role icon; clicking that icon folds.
 *
 *  Beside each project root sits a labelled view toggle: the three modules that
 *  kind offers, glyphs from the registry. Sticky per project and write-free —
 *  a display preference, not a log step. The definition's view.module still
 *  says how a layer opens; this says what is on screen now.
 *
 *  The pane bounds itself: a width cap under pressure, and a collapse that
 *  leaves only a strip so the stage keeps the room.
 *
 *  Undo and redo sit as words at the foot, with one line naming the last
 *  executed action — always in reach while the explorer is open.
 *
 *  The bar's add button follows the selection (G.9d — the target decides): a project
 *  or nothing selected names a new project into the workspace; a block
 *  selected makes a block under it. The tooltip says which. Right-click still
 *  offers create (block) regardless, and empty space below the rows creates at
 *  the root. Rename stays on double-click and the rename button. */

import { useEffect, useMemo, useRef, useState } from "react";

import { offer } from "../actions/offer";
import { fill, fillable, rank, type Supply } from "../actions/fill";
import type { Action, Arg, Args, Context } from "../actions";
import { isContainer, isPort, isProxy, nameOf, titleOf } from "../graph/fold";
import { NameField } from "../NameField";
import {
  ROOT as ROOT_ID, asTarget, refAt, refTo, type Graph, type Element,
} from "../graph/types";
import { kindOf, viewOf, views, type ViewName } from "../modules/view";
import { REFERRED } from "../canvas/card";
import { Icon, type IconName } from "../modules/icons";

const ROOT = "__root__";
const SHELL = "__shell__";

/** Same-project element ids from a cross-project selection (roots excluded). */
function local_ids(refs: string[], projectId: string): string[] {
  const out: string[] = [];
  for (const ref of refs) {
    const { project, id } = refAt(ref);
    if (id === ROOT_ID) continue;
    if ((project ?? projectId) !== projectId) continue;
    out.push(id);
  }
  return out;
}

/** What this diagram calls a group, a block, a relationship. */
type Terms = { group: string; node: string; relation: string };

/** Child nodes per parent inside one project, containers first then by label,
 *  keyed by ROOT for the top level. A node whose parent was undone sits at the
 *  top rather than vanishing from the tree. */
function branches(graph: Graph): Record<string, Element[]> {
  const kids: Record<string, Element[]> = {};

  for (const node of Object.values(graph.elements)) {
    // The explorer is the tree, and the tree is blocks. A proxy is a second
    // appearance of one; a note or a group describes rather than structures;
    // root is the tree itself and has its own row above these.
    if (node.id === ROOT_ID || isProxy(node) || node.form !== "block") continue;

    const parent = node.parent && graph.elements[node.parent] ? node.parent : ROOT;
    (kids[parent] ??= []).push(node);
  }

  // Whatever holds something sorts first; interfaces sort last, since they are
  // the frame's furniture rather than the branch's contents.
  for (const list of Object.values(kids)) {
    list.sort((a, b) => {
      const ported = Number(isPort(a)) - Number(isPort(b));
      const held = Number(Boolean(kids[b.id])) - Number(Boolean(kids[a.id]));

      return ported || held || a.label.localeCompare(b.label);
    });
  }

  return kids;
}

/** Children of a workspace layer: folders (blocks) and root-proxies, in label
 *  order. Proxies stay — they are how open projects appear in the filing tree. */
function shelved(shell: Graph, parent: string | null): Element[] {
  const out: Element[] = [];

  for (const node of Object.values(shell.elements)) {
    if (node.id === ROOT_ID) continue;
    const held = node.parent && shell.elements[node.parent] ? node.parent : null;
    if (held !== parent) continue;
    if (node.form === "proxy" && node.of) {
      const { project, element } = asTarget(node.of);
      if (project && element === ROOT_ID) out.push(node);
    } else if (node.form === "block") {
      out.push(node);
    }
  }

  return out.sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
}

/** A node's role, taken from what it holds and where it sits rather than from
 *  anything declared. One meaning each — the set's own rule. */
function role_of(graph: Graph, node: Element): IconName {
  if (isPort(node)) return "role_interface";
  if (isContainer(graph, node.id)) return "role_container";

  return "role_leaf";
}

export type OpenProject = {
  id: string;
  /** Id, step count and hash — what tells two copies apart. */
  tip: string;
};

/** One explorer pick as a cross-project ref — `proj/block` or `proj/root`
 *  for a whole project. Order in the list is click order; `infer` must not
 *  depend on it. */
export type Chosen = string;

type Props = {
  /** Workspace graph: folders and proxies of open projects' roots. */
  shell: Graph;
  /** Every open project's graph, keyed by id. */
  graphs: Record<string, Graph>;
  /** Open projects in filing order — fallback when a proxy is missing. */
  projects: OpenProject[];
  /** Which project's log the page is writing to. */
  context: string;
  /** The layer the canvas is on within the context project. */
  view: string | null;
  /** Cross-project selection the tree holds for `infer`. */
  chosen: Chosen[];
  onChoose: (next: Chosen[]) => void;
  terms: Terms;
  showPorts: boolean;
  onShowPorts: (on: boolean) => void;
  /** Open a layer in a project — sets context, then the canvas layer. */
  onOpen: (projectId: string, id: string | null) => void;
  onCreate: (label: string, parent: string | null) => void;
  /** Whether a name is already spoken for in a layer, so a field can say so. */
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  /** Say something in full, where there is room for it. */
  onSay: (message: string) => void;
  /** What this diagram calls its elementary unit. */
  unit: string;
  onDelete: (id: string) => void;
  onMove: (id: string, parent: string | null) => void;
  onRename: (id: string, label: string) => void;
  onRenameProject: (label: string) => void;
  /** The `new` page action — name a project into being. Returns false when the
   *  name was refused, so the field can stay open. */
  onNewProject: (name: string) => boolean;
  /** Why this project may not be called that, or null. */
  onNameProject: (name: string, except: string) => string | null;
  /** Run a registry action — the offered list reaches `infer` through here. */
  onAct: (name: string, args?: Args) => boolean;
  /** Undo / redo for the project in context — words at the foot, always in reach. */
  onUndo: () => void;
  onRedo: () => void;
  undoable: boolean;
  redoable: boolean;
  /** Last applied action's name, or null when nothing has been done yet. */
  lastAction: string | null;
  /** Which view module is showing per open project — display preference only. */
  shownViews: Record<string, ViewName>;
  /** Pick what is shown for a project; writes nothing to its log. */
  onShowView: (projectId: string, module: ViewName) => void;
};

export function Files(props: Props) {
  const { shell, graphs, projects, context, view, chosen, onChoose } = props;
  const { showPorts, onShowPorts } = props;
  const { onOpen, onCreate, onNameTaken, onSay, unit } = props;
  const {
    onDelete, onMove, onRename, onRenameProject, onNewProject, onNameProject,
    onAct, onUndo, onRedo, undoable, redoable, lastAction, shownViews, onShowView,
  } = props;
  const graph = graphs[context] ?? graphs[projects[0]?.id ?? ""] ?? shell;
  const kidsBy = useMemo(() => {
    const next: Record<string, Record<string, Element[]>> = {};
    for (const id of Object.keys(graphs)) next[id] = branches(graphs[id]!);

    return next;
  }, [graphs]);
  /** Nodes the user has opened. Nothing else opens them — walking into a layer
   *  on the canvas leaves the tree exactly as it was found. A tree that
   *  rearranges itself under you is a tree you cannot keep your place in, and
   *  which branches are worth having open is not something the canvas knows. */
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [held, setHeld] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  /** Null when nothing is being named; otherwise the layer the new element
   *  lands in. Held rather than read from the scope, because the two creation
   *  gestures mean different places: the bar's button acts on what is open,
   *  and the clear space below the rows is the root's own background. */
  const [adding, setAdding] = useState<{ parent: string | null } | null>(null);
  /** Naming a new project — the first step, before anything can go in it. */
  const [naming, setNaming] = useState(false);
  /** Shut to a strip so the stage keeps the width — chrome yields, stage does not. */
  const [collapsed, setCollapsed] = useState(false);
  /** Offered-action menu at a pointer — membership from `offer`, order fixed. */
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    items: Action[];
    ctx: Context;
    of: string[];
  } | null>(null);
  /** A required text argument the menu could not fill from the selection. */
  const [prompt, setPrompt] = useState<{
    action: Action;
    args: Args;
    arg: Arg;
  } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  const menuBox = useRef<HTMLUListElement>(null);

  const tips = useMemo(() => new Map(projects.map((p) => [p.id, p.tip])), [projects]);

  /** Project ids the shell already shows as root-proxies. */
  const placed = useMemo(() => {
    const ids = new Set<string>();
    for (const node of Object.values(shell.elements)) {
      if (node.form !== "proxy" || !node.of) continue;
      const { project, element } = asTarget(node.of);
      if (project && element === ROOT_ID) ids.add(project);
    }

    return ids;
  }, [shell]);

  /** Open projects the shell has not filed yet — still listed, at the top. */
  const loose = projects.filter((p) => !placed.has(p.id));

  /** Keys currently picked — a Set so toggle is O(1) and membership reads clean. */
  const picked = useMemo(() => new Set(chosen), [chosen]);

  /** Shift or Cmd adds without navigating — same modifiers the canvas uses. */
  function multi(event: { shiftKey: boolean; metaKey: boolean }) {
    return event.shiftKey || event.metaKey;
  }

  /** Toggle or replace the cross-project selection. A whole project is
   *  `refTo(root, project)`; a branch is the container's own ref. The first
   *  modifier click seeds from the open layer so the set starts from focus. */
  function choose(projectId: string, elementId: string, event: { shiftKey: boolean; metaKey: boolean }) {
    const key = refTo(elementId, projectId);

    if (multi(event)) {
      const base = chosen.length ? chosen : [refTo(view ?? ROOT_ID, context)];
      const held = new Set(base);
      if (held.has(key)) held.delete(key);
      else held.add(key);
      onChoose([...held]);
      return;
    }

    onChoose([key]);
  }

  /** Context the menu asks `offer` against — the project in context, with the
   *  row as `picked` when it belongs there. Cross-project refs ride in `of`. */
  function menu_ctx(projectId: string, elementId: string): Context {
    const here = projectId === context && elementId !== ROOT_ID;

    return {
      graph,
      view,
      picked: here ? { kind: "node", id: elementId } : null,
      project: context,
      open: graphs,
    };
  }

  /** Candidates the tree can name: what is picked, then the rest of the
   *  selection that lives in this project. The explorer prompts for a name,
   *  so a missing word never withholds an action. */
  function supply_of(ctx: Context, refs: string[]): Supply {
    const ids = [ctx.picked?.id, ...local_ids(refs, context)]
      .filter((id): id is string => Boolean(id));
    return { ids: [...new Set(ids)], view, prompts: true };
  }

  /** What only the tree knows — a cross-project selection, and the graphs it
   *  spans, which `infer` reads and no argument declares. */
  function seed_of(action: Action, refs: string[]): Args {
    const locals = local_ids(refs, context);
    if (action.name === "infer") return { of: refs, open: graphs };
    if (action.name === "group") return { members: locals };
    if (action.name === "relate" && locals.length >= 2) {
      return { from: locals[0], to: locals[1] };
    }
    return {};
  }

  /** Whether the explorer can supply every required argument. */
  function can_fill(action: Action, ctx: Context, refs: string[]): boolean {
    if (action.name === "infer") return refs.length > 0;
    if (action.name === "group") return local_ids(refs, context).length > 0;
    if (action.name === "relate") return local_ids(refs, context).length >= 2;
    // Needs a place on the border, and the tree names no side or offset.
    if (action.name === "interface") return false;

    return fillable(action, ctx, supply_of(ctx, refs), seed_of(action, refs));
  }

  /** Fill what the tree already knows; text left empty is prompted next. */
  function fill_args(action: Action, ctx: Context, refs: string[]): Args {
    if (action.name === "infer") return seed_of(action, refs);
    return fill(action, ctx, supply_of(ctx, refs), seed_of(action, refs));
  }

  /** Sort `offer` into the fixed order and open the menu at the pointer. */
  function show_offer(
    event: { clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void },
    projectId: string,
    elementId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const key = refTo(elementId, projectId);
    const refs = picked.has(key) && chosen.length ? chosen : [key];
    if (refs !== chosen) onChoose(refs);

    const ctx = menu_ctx(projectId, elementId);
    const items = offer(ctx)
      .filter((action) => can_fill(action, ctx, refs))
      .sort((a, b) => rank(a.name) - rank(b.name));

    setPrompt(null);
    if (!items.length) {
      setMenu(null);
      return;
    }
    setMenu({ x: event.clientX, y: event.clientY, items, ctx, of: refs });
  }

  /** Run a menu pick, prompting when a required name is still missing. */
  function take(action: Action, ctx: Context, refs: string[]) {
    setMenu(null);
    const args = fill_args(action, ctx, refs);
    const missing = action.args.find(
      (arg) => !arg.optional && arg.kind === "text" && args[arg.name] == null,
    );
    if (missing) {
      setPrompt({ action, args, arg: missing });
      return;
    }
    onAct(action.name, args);
  }

  /** Highlight: the multi-selection when there is one, otherwise the open layer. */
  function lit(projectId: string, elementId: string) {
    const key = refTo(elementId, projectId);
    if (chosen.length) return picked.has(key);

    return scoped(projectId, elementId);
  }

  /** The open layer — scroll follows this, not the multi-selection. */
  function scoped(projectId: string, elementId: string) {
    return context === projectId && (elementId === ROOT_ID ? view === null : elementId === view);
  }

  function fold(id: string) {
    setOpen((prior) => {
      const next = new Set(prior);
      next.has(id) ? next.delete(id) : next.add(id);

      return next;
    });
  }

  /** Every branch at once, or none of them. Which way it goes depends on
   *  whether anything is open, so the one control is always the one you
   *  want. */
  function foldAll() {
    setOpen((prior) => {
      if (prior.size) return new Set();

      const ids: string[] = [];
      for (const [projectId, kids] of Object.entries(kidsBy)) {
        for (const node of Object.values(graphs[projectId]?.elements ?? {})) {
          if ((kids[node.id] ?? []).some((n) => showPorts || !isPort(n))) ids.push(`${projectId}:${node.id}`);
        }
      }
      for (const node of Object.values(shell.elements)) {
        if (node.form === "block" && shelved(shell, node.id).length) ids.push(`${SHELL}:${node.id}`);
      }

      return new Set(ids);
    });
  }

  // Deep branches indent past the sidebar rather than wrapping, so the scroll
  // follows the selection: whatever level it is on comes to the middle, with
  // the levels either side of it still in view.
  //
  // Waits a frame and runs on the tree's shape as well as the selection. A
  // branch opened by the same click that made it has not been laid out when
  // the effect first fires, so measuring the row then reads where it used to
  // be — or nothing at all, if it is not on screen yet.
  useEffect(() => {
    let frame = 0;

    const centre = (tries: number) => {
      const box = scroller.current;
      const row = marker.current;

      if (!box || !row) {
        if (tries > 0) frame = requestAnimationFrame(() => centre(tries - 1));

        return;
      }

      // Measured against the scroller, not `offsetLeft` — a row's offset
      // parent is its own `<li>`, so that number said almost nothing about
      // where the row sits in the tree and the scroll never moved.
      const panel = box.getBoundingClientRect();
      const mark = row.getBoundingClientRect();
      const middle = box.scrollLeft + (mark.left - panel.left) - box.clientWidth / 2;

      box.scrollTo({ left: Math.max(0, middle), behavior: "smooth" });
    };

    frame = requestAnimationFrame(() => centre(3));

    return () => cancelAnimationFrame(frame);
  }, [view, context, open, graphs, shell]);

  /** What the bar's add button will make — selection decides, never a hidden mode.
   *
   *  A project root or an empty pick names a project (workspace op). A block
   *  in the context project makes a block under it. Cross-project picks fall
   *  through to a project: create writes only the log in context. */
  function plus_target():
    | { kind: "project" }
    | { kind: "block"; parent: string } {
    if (!chosen.length) return { kind: "project" };

    const key = chosen[chosen.length - 1]!;
    const { project, id } = refAt(key);
    const projectId = project ?? context;
    if (id === ROOT_ID || projectId !== context) return { kind: "project" };

    const node = graph.elements[id];
    if (!node || node.form !== "block" || isPort(node)) return { kind: "project" };

    return { kind: "block", parent: id };
  }

  const plus = plus_target();
  const plus_title = plus.kind === "project"
    ? "New project — name it first"
    : `New ${unit}`;

  /** Commit a rename. The project renames through its own action — the tree's
   *  root is not a node. */
  function rename(key: string, label: string) {
    const wanted = label.trim();
    if (key.startsWith("proj:")) {
      const projectId = key.slice(5);
      const current = titleOf(graphs[projectId] ?? graph);
      if (wanted && wanted !== current && projectId === context) {
        // Projects are siblings in the workspace, so the same rule a layer has
        // applies here: a name is required, and no two share one.
        const why = onNameProject(wanted, projectId);
        if (why) {
          onSay(why);

          return;
        }
        onRenameProject(wanted);
      }
      setEditing(null);

      return;
    }

    const current = graph.elements[key]?.label;
    if (wanted && wanted !== current) onRename(key, wanted);

    setEditing(null);
  }

  function create(label: string) {
    if (label.trim() && adding) onCreate(label.trim(), adding.parent);

    setAdding(null);
  }

  /** Bar add — open the name prompt for a project, or a block field under the pick. */
  function add() {
    if (plus.kind === "project") {
      setAdding(null);
      setNaming(true);
      return;
    }

    setNaming(false);
    setAdding({ parent: plus.parent });
  }

  /** Finish a drag, ignoring drops that would leave the node where it is.
   *  Moves stay inside the context project — cross-project filing is later. */
  function drop(into: string | null) {
    const moved = held && held !== into && (graph.elements[held]?.parent ?? null) !== into;
    if (moved) onMove(held!, into);

    setHeld(null);
    setOver(null);
  }

  /** Drop-target wiring shared by the root row and every node row. */
  function dropzone(id: string, into: string | null) {
    return {
      onDragOver: (event: React.DragEvent) => (event.preventDefault(), setOver(id)),
      onDragLeave: () => setOver(null),
      onDrop: (event: React.DragEvent) => (event.preventDefault(), drop(into)),
    };
  }

  /** Text field shared by renaming and naming something new. `within` is the
   *  layer the name has to be free in, and `except` the element already
   *  holding it when this is a rename. */
  function field(initial: string, commit: (value: string) => void, cancel: () => void,
                 within: string | null = null, except: string | null = null) {
    return (
      <NameField
        initial={initial}
        className="rename"
        taken={(name) => onNameTaken(within, name, except)}
        onSay={onSay}
        onCommit={commit}
        onCancel={cancel}
      />
    );
  }

  /** The layer a prompted name must be unique within. Names are unique per
   *  layer, so a rename is checked against the element's own siblings — not,
   *  as it was, against the root, which let a real clash through. */
  function clash_within(action: Action, args: Args): string | null {
    const here = graphs[context];
    if (action.name === "create") {
      return (args.parent as string | null) ?? view ?? null;
    }
    const id = typeof args.id === "string" ? args.id : null;
    if (action.name === "rename" && id) return here?.elements[id]?.parent ?? null;
    return null;
  }

  /** The element being renamed — it does not clash with the name it already has. */
  function clash_except(action: Action, args: Args): string | null {
    if (action.name !== "rename") return null;
    return typeof args.id === "string" ? args.id : null;
  }

  /** Rows for one layer of one project. */
  function branch(projectId: string, parentId: string) {
    const kids = kidsBy[projectId] ?? {};
    const hereGraph = graphs[projectId];
    if (!hereGraph) return null;

    // Interfaces are children like any other, listed alongside the blocks and
    // told apart by their icon; `branches` has already sorted them last.
    const here = (kids[parentId] ?? []).filter((n) => showPorts || !isPort(n));

    const row = (node: Element) => {
      const holds = Boolean(kids[node.id]?.some((n) => showPorts || !isPort(n)));
      const foldKey = `${projectId}:${node.id}`;
      const active = lit(projectId, node.id);
      const mark = scoped(projectId, node.id);

      return (
        <li key={`${projectId}:${node.id}`}>
          <div
            className={[
              "item",
              isContainer(hereGraph, node.id) ? "group" : "object",
              isPort(node) ? "port" : "",
              active ? "active" : "",
              over === foldKey ? "over" : "",
            ].join(" ")}
            draggable={editing !== node.id && context === projectId}
            onDragStart={(event) => {
              setHeld(node.id);
              // Dropped on another layer's canvas this becomes a reference,
              // which is a mention of the node rather than a move of it.
              event.dataTransfer.setData(REFERRED, node.id);
              event.dataTransfer.effectAllowed = "all";
            }}
            // Entering a layer opens it: what you asked to look inside of
            // should show you what is inside it. A modifier click only adds
            // to the selection — the scope stays put so a cross-project set
            // can be built without thrashing the canvas.
            onClick={(event) => {
              // Interfaces are furniture, not structure `infer` takes.
              if (multi(event) && isPort(node)) return;
              choose(projectId, node.id, event);
              if (multi(event)) return;
              setOpen((prior) => new Set(prior).add(foldKey));
              onOpen(projectId, node.id);
            }}
            onDoubleClick={() => context === projectId && setEditing(node.id)}
            onContextMenu={(event) => show_offer(event, projectId, node.id)}
            {...(context === projectId ? dropzone(foldKey, node.id) : {})}
          >
            <span
              ref={mark ? marker : undefined}
              className={`icon ${holds ? "fold" : ""}`}
              onMouseDown={(event) => {
                // Keep the row's drag from swallowing the fold click.
                if (!holds) return;
                event.preventDefault();
                event.stopPropagation();
              }}
              onClick={(event) => {
                if (!holds) return;
                event.stopPropagation();
                fold(foldKey);
              }}
            >
              <Icon name={role_of(hereGraph, node)} solid={role_of(hereGraph, node) === "role_leaf"} />
            </span>
            {editing === node.id && context === projectId
              ? field(node.label, (value) => rename(node.id, value), () => setEditing(null),
                      node.parent ?? null, node.id)
              : <span className="label">{nameOf(hereGraph, node)}</span>}
          </div>
          {holds && open.has(foldKey) && <ul className="branch">{branch(projectId, node.id)}</ul>}
        </li>
      );
    };

    return <>{here.map(row)}</>;
  }

  /** One open project's root row, and the blocks it holds. */
  function projectRoot(projectId: string) {
    const here = graphs[projectId];
    if (!here) return null;

    // No fallback: a project is named on the way in, so a blank here is a bug
    // worth seeing rather than papering over with the word "project".
    const title = titleOf(here);
    const editKey = `proj:${projectId}`;
    const active = lit(projectId, ROOT_ID);
    const hereScoped = scoped(projectId, ROOT_ID);
    const tip = tips.get(projectId);
    // Kind from the root's definition — three offers, never six.
    const root = here.elements[ROOT_ID];
    const kind = root ? kindOf(viewOf(here, root).module) : "structure";
    const offers = views().filter((m) => m.kind === kind);
    const shown = shownViews[projectId];

    return (
      <li key={projectId} className="project">
        <div
          className={`item root ${active ? "active" : ""} ${over === editKey ? "over" : ""}`}
          title={tip}
          onClick={(event) => {
            choose(projectId, ROOT_ID, event);
            if (multi(event)) return;
            onOpen(projectId, null);
          }}
          onDoubleClick={() => context === projectId && setEditing(editKey)}
          onContextMenu={(event) => show_offer(event, projectId, ROOT_ID)}
          {...(context === projectId ? dropzone(editKey, null) : {})}
        >
          <span ref={hereScoped ? marker : undefined} className="icon"><Icon name="project" /></span>
          {editing === editKey && context === projectId
            ? field(title, (value) => rename(editKey, value), () => setEditing(null))
            : <span className="label">{title}</span>}
          {offers.length > 0 && editing !== editKey && (
            <span
              className="themes"
              role="group"
              aria-label="View"
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={(event) => event.stopPropagation()}
              onContextMenu={(event) => event.stopPropagation()}
            >
              {offers.map((mod) => (
                <button
                  key={mod.name}
                  type="button"
                  className={shown === mod.name ? "on" : ""}
                  aria-pressed={shown === mod.name}
                  title={`View: ${mod.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onShowView(projectId, mod.name);
                    if (projectId !== context) onOpen(projectId, null);
                  }}
                >
                  <Icon className="view-icon" name={mod.icon as IconName} />
                  {" "}
                  {mod.name}
                </button>
              ))}
            </span>
          )}
        </div>
        <ul className="branch">{branch(projectId, ROOT)}</ul>
      </li>
    );
  }

  /** Workspace folders and the projects filed into them. */
  function shellBranch(parent: string | null) {
    const here = shelved(shell, parent);

    return (
      <>
        {here.map((node) => {
          if (node.form === "proxy" && node.of) {
            const { project } = asTarget(node.of);

            return project ? projectRoot(project) : null;
          }

          const foldKey = `${SHELL}:${node.id}`;
          const holds = shelved(shell, node.id).length > 0;

          return (
            <li key={foldKey}>
              <div
                className={["item", "group", over === foldKey ? "over" : ""].join(" ")}
                onClick={() => holds && fold(foldKey)}
              >
                <span
                  className={`icon ${holds ? "fold" : ""}`}
                  onClick={(event) => {
                    if (!holds) return;
                    event.stopPropagation();
                    fold(foldKey);
                  }}
                >
                  <Icon name="role_container" />
                </span>
                <span className="label">{nameOf(shell, node) || "folder"}</span>
              </div>
              {holds && open.has(foldKey) && (
                <ul className="branch">{shellBranch(node.id)}</ul>
              )}
            </li>
          );
        })}
      </>
    );
  }

  /** Delete what the tree has open. The canvas has its own handling for its
   *  own selection, so the key has to be caught where the focus actually is.
   *  Esc clears the cross-project pick back to "nothing beyond the scope", and
   *  dismisses an open offer menu. */
  function press(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      if (menu) {
        event.preventDefault();
        setMenu(null);
        return;
      }
      if (prompt) {
        event.preventDefault();
        setPrompt(null);
        return;
      }
      if (editing || adding || naming || (event.target as HTMLElement).closest("input")) return;
      if (!chosen.length) return;
      event.preventDefault();
      onChoose([]);
      return;
    }

    if (event.key !== "Delete" && event.key !== "Backspace") return;
    // Never while naming something — Backspace is just a character there.
    if (editing || adding || naming || prompt || (event.target as HTMLElement).closest("input")) return;
    if (!view) return;

    event.preventDefault();
    onDelete(view);
  }

  // A click outside the menu puts it away — same as Escape.
  useEffect(() => {
    if (!menu) return;

    const dismiss = (event: MouseEvent) => {
      if (menuBox.current?.contains(event.target as Node)) return;
      setMenu(null);
    };

    window.addEventListener("mousedown", dismiss);
    return () => window.removeEventListener("mousedown", dismiss);
  }, [menu]);

  const empty = projects.length === 0 && shelved(shell, null).length === 0;

  return (
    // Focusable so that clicking a row puts the key handler in reach.
    <div
      className={`files${collapsed ? " collapsed" : ""}`}
      tabIndex={0}
      onKeyDown={press}
    >
      <div className="files-bar">
        <span className="title">Explorer</span>
        <span className="actions">
          <button onClick={add} title={plus_title}>
            <Icon name="add" />
          </button>
          <button
            onClick={() => setEditing(view ?? `proj:${context}`)}
            title="Rename what is open"
          >
            <Icon name="rename" />
          </button>
          <button onClick={foldAll} title={open.size ? "Fold everything" : "Expand everything"}>
            <Icon name={open.size ? "fold_all" : "unfold_all"} />
          </button>
          <button
            className={showPorts ? "on" : ""}
            onClick={() => onShowPorts(!showPorts)}
            title={showPorts ? "Hide interfaces" : "Show interfaces"}
          >
            <Icon name={showPorts ? "ports_on" : "ports_off"} />
          </button>
          <button onClick={() => view && onDelete(view)} disabled={!view} title="Delete">
            <Icon name="remove" />
          </button>
          <button
            className="bound"
            aria-expanded={!collapsed}
            title={collapsed ? "Show explorer" : "Hide explorer"}
            onClick={() => (setCollapsed((was) => !was), setMenu(null))}
          >
            <Icon name={collapsed ? "pane_show" : "pane_hide"} />
          </button>
        </span>
      </div>

      <div
        className="tree"
        ref={scroller}
        // The clear space below the rows is the *context project's* background,
        // not a shared workspace floor — making something here writes to the
        // project in context, wherever you happen to be scoped.
        onContextMenu={(event) => {
          event.preventDefault();
          setNaming(false);
          setAdding({ parent: null });
        }}
      >
        <ul className="roots">
          {loose.map((p) => projectRoot(p.id))}
          {shellBranch(null)}
        </ul>

        {adding && (
          <div className="item new">
            {field("", create, () => setAdding(null), adding.parent)}
          </div>
        )}

        {naming && (
          <div className="item new">
            <NameField
              initial=""
              className="rename"
              // Clash mark while typing; strip text is the project rule on commit
              // (NameField's own sentence is about layers and must not fire here).
              taken={(name) => Boolean(name.trim()) && onNameProject(name, "") !== null}
              onCommit={(name) => {
                if (onNewProject(name)) setNaming(false);
              }}
              onCancel={() => setNaming(false)}
            />
          </div>
        )}

        {prompt && (
          <div className="item new">
            {field(
              "",
              (value) => {
                const wanted = value.trim();
                if (!wanted) return;
                onAct(prompt.action.name, { ...prompt.args, [prompt.arg.name]: wanted });
                setPrompt(null);
              },
              () => setPrompt(null),
              clash_within(prompt.action, prompt.args),
              clash_except(prompt.action, prompt.args),
            )}
          </div>
        )}

        {empty && !adding && !naming && !prompt && (
          <p className="empty">
            No project yet — <button className="link" onClick={() => setNaming(true)}>
              name one
            </button> to start.
          </p>
        )}
      </div>

      {/* Always visible while the explorer is open — reaching undo never means
          opening a drawer first. Words, not glyphs: the same move as the header's
          rare destructive control. */}
      <div className="files-foot">
        <span className="last" title={lastAction ?? undefined}>
          {lastAction ?? "—"}
        </span>
        <span className="history">
          <button
            type="button"
            className="word"
            onClick={onUndo}
            disabled={!undoable}
            title="Undo"
          >
            Undo
          </button>
          <button
            type="button"
            className="word"
            onClick={onRedo}
            disabled={!redoable}
            title="Redo"
          >
            Redo
          </button>
        </span>
      </div>

      {menu && menu.items.length > 0 && (
        <ul
          ref={menuBox}
          className="offer"
          style={{ left: menu.x, top: menu.y }}
          role="menu"
        >
          {menu.items.map((action) => (
            <li key={action.name} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => take(action, menu.ctx, menu.of)}
              >
                {action.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
