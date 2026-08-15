/** Object explorer. Structure, and only structure: nodes nested to any depth.
 *
 *  Groups, annotations and every other attribute are non-structural and never
 *  appear here. Interfaces are child nodes and so belong, but stay hidden
 *  behind a toggle — one port per relationship would bury the tree it is meant
 *  to make legible.
 *
 *  Every open project is a root in the same tree, filed under the folders the
 *  workspace keeps. A click here is a navigation: it picks which project is in
 *  context and sets the layer the canvas draws. Parent branches are marked by
 *  their role icon; clicking that icon folds. */

import { useEffect, useMemo, useRef, useState } from "react";

import { isContainer, isPort, isProxy, nameOf, titleOf } from "../graph/fold";
import { NameField } from "../NameField";
import { ROOT as ROOT_ID, asTarget, type Graph, type Element } from "../graph/types";
import { REFERRED } from "../canvas/card";
import type { Terms } from "../terminal/workflows";

const ROOT = "__root__";
const SHELL = "__shell__";

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

/** The mark for a node's role, which it takes from what it holds and where it
 *  sits rather than from anything declared. Blocks are a closed square,
 *  interfaces an open one, containers a compound grid. */
function icon(graph: Graph, node: Element): string {
  if (isPort(node)) return "□";
  if (isContainer(graph, node.id)) return "▦";

  return "■";
}

export type OpenProject = {
  id: string;
  /** Id, step count and hash — what tells two copies apart. */
  tip: string;
};

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
};

export function Files(props: Props) {
  const { shell, graphs, projects, context, view, showPorts, onShowPorts } = props;
  const { onOpen, onCreate, onNameTaken, onSay, unit } = props;
  const { onDelete, onMove, onRename, onRenameProject } = props;
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
  const scroller = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);

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

  /** A new thing goes inside whatever layer is open in the context project. */
  const parent = view && graph.elements[view] ? view : null;

  /** Commit a rename. The project renames through its own action — the tree's
   *  root is not a node. */
  function rename(key: string, label: string) {
    const wanted = label.trim();
    if (key.startsWith("proj:")) {
      const projectId = key.slice(5);
      const current = titleOf(graphs[projectId] ?? graph) || "project";
      if (wanted && wanted !== current && projectId === context) onRenameProject(wanted);
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
      const active = context === projectId && node.id === view;

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
            // should show you what is inside it.
            onClick={() => (setOpen((prior) => new Set(prior).add(foldKey)), onOpen(projectId, node.id))}
            onDoubleClick={() => context === projectId && setEditing(node.id)}
            onContextMenu={(event) => {
              // A row is all name, the way a note is: an icon that folds and a
              // label, with nothing else to aim at. So it takes the rule every
              // name takes rather than carving out a few pixels for a second
              // gesture. Making things happens on the empty space below.
              event.preventDefault();
              event.stopPropagation();
              if (context === projectId) setEditing(node.id);
              else onOpen(projectId, node.id);
            }}
            {...(context === projectId ? dropzone(foldKey, node.id) : {})}
          >
            <span
              ref={active ? marker : undefined}
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
              {icon(hereGraph, node)}
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

    const title = titleOf(here) || "project";
    const editKey = `proj:${projectId}`;
    const active = context === projectId && view === null;
    const tip = tips.get(projectId);

    return (
      <li key={projectId}>
        <div
          className={`item root ${active ? "active" : ""} ${over === editKey ? "over" : ""}`}
          title={tip}
          onClick={() => onOpen(projectId, null)}
          onDoubleClick={() => context === projectId && setEditing(editKey)}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (context === projectId) setEditing(editKey);
            else onOpen(projectId, null);
          }}
          {...(context === projectId ? dropzone(editKey, null) : {})}
        >
          <span ref={active ? marker : undefined} className="icon">▣</span>
          {editing === editKey && context === projectId
            ? field(title, (value) => rename(editKey, value), () => setEditing(null))
            : <span className="label">{title}</span>}
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
                  ▦
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
   *  own selection, so the key has to be caught where the focus actually is. */
  function press(event: React.KeyboardEvent) {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    // Never while naming something — Backspace is just a character there.
    if (editing || adding || (event.target as HTMLElement).closest("input")) return;
    if (!view) return;

    event.preventDefault();
    onDelete(view);
  }

  const empty = projects.length === 0 && shelved(shell, null).length === 0;

  return (
    // Focusable so that clicking a row puts the key handler in reach.
    <div className="files" tabIndex={0} onKeyDown={press}>
      <div className="files-bar">
        <span className="title">Explorer</span>
        <span className="actions">
          <button onClick={() => setAdding({ parent })} title={`New ${unit}`}>
            ＋
          </button>
          <button
            onClick={() => setEditing(view ?? `proj:${context}`)}
            title="Rename what is open"
          >
            ✎
          </button>
          <button onClick={foldAll} title={open.size ? "Fold everything" : "Expand everything"}>
            {open.size ? "⊟" : "⊞"}
          </button>
          <button
            className={showPorts ? "on" : ""}
            onClick={() => onShowPorts(!showPorts)}
            title={showPorts ? "Hide interfaces" : "Show interfaces"}
          >
            {showPorts ? "▣" : "□"}
          </button>
          <button onClick={() => view && onDelete(view)} disabled={!view} title="Delete">
            ✕
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

        {empty && !adding && (
          <p className="empty">Nothing here yet</p>
        )}
      </div>
    </div>
  );
}
