/** Object explorer. Structure, and only structure: nodes nested to any depth.
 *
 *  Groups, annotations and every other attribute are non-structural and never
 *  appear here. Interfaces are child nodes and so belong, but stay hidden
 *  behind a toggle — one port per relationship would bury the tree it is meant
 *  to make legible.
 *
 *  Every click here is a navigation: it sets the layer the canvas draws.
 *  Parent branches are marked by their role icon; clicking that icon folds. */

import { useEffect, useMemo, useRef, useState } from "react";

import { isContainer, isPort, isRef, nameOf } from "./core/fold";
import type { Graph, Node } from "./core/types";
import { REFERRED } from "./NodeCard";
import type { Terms } from "./core/workflows";

const ROOT = "__root__";

/** Child nodes per parent, containers first then by label, keyed by ROOT for
 *  the top level. A node whose parent was undone sits at the top rather than
 *  vanishing from the tree. */
function branches(graph: Graph): Record<string, Node[]> {
  const kids: Record<string, Node[]> = {};

  for (const node of Object.values(graph.nodes)) {
    if (isRef(node)) continue;

    const parent = node.parent && graph.nodes[node.parent] ? node.parent : ROOT;
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

/** The mark for a node's role, which it takes from what it holds and where it
 *  sits rather than from anything declared. Blocks are a closed square,
 *  interfaces an open one, containers a compound grid. */
function icon(graph: Graph, node: Node): string {
  if (isPort(node)) return "□";
  if (isContainer(graph, node.id)) return "▦";

  return "■";
}

type Props = {
  graph: Graph;
  /** The layer the canvas is on — what the tree marks as where you are. */
  view: string | null;
  /** Nodes from the project down to the open one; those stay expanded. */
  path: string[];
  terms: Terms;
  showPorts: boolean;
  onShowPorts: (on: boolean) => void;
  onOpen: (id: string | null) => void;
  onCreate: (label: string, parent: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, parent: string | null) => void;
  onRename: (id: string, label: string) => void;
  onRenameProject: (label: string) => void;
};

export function Files(props: Props) {
  const { graph, view, path, terms, showPorts, onShowPorts, onOpen, onCreate } = props;
  const { onDelete, onMove, onRename, onRenameProject } = props;
  const kids = useMemo(() => branches(graph), [graph]);
  /** Nodes the user has opened by hand. Any number may be open at once — a
   *  tree that collapses everything else is only useful when there is one
   *  thing to look at. */
  const [unfolded, setUnfolded] = useState<Set<string>>(new Set());
  /** Explicit closes win over the canvas path, so a branch on the way to the
   *  open layer can still be folded shut. */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const open = useMemo(() => {
    const next = new Set(unfolded);
    for (const id of path) {
      if (!collapsed.has(id)) next.add(id);
    }
    return next;
  }, [unfolded, path, collapsed]);
  const [held, setHeld] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const title = graph.title || "project";

  function fold(id: string) {
    if (open.has(id)) {
      setUnfolded((prior) => {
        const next = new Set(prior);
        next.delete(id);
        return next;
      });
      setCollapsed((prior) => new Set(prior).add(id));
    } else {
      setCollapsed((prior) => {
        const next = new Set(prior);
        next.delete(id);
        return next;
      });
      setUnfolded((prior) => new Set(prior).add(id));
    }
  }

  // Entering a layer re-opens its trail; folding along the current path is
  // left alone until the open layer itself changes.
  useEffect(() => {
    setCollapsed((prior) => {
      let changed = false;
      const next = new Set(prior);
      for (const id of path) {
        if (next.delete(id)) changed = true;
      }
      return changed ? next : prior;
    });
  }, [view]);

  // Deep branches indent past the sidebar rather than wrapping, so the scroll
  // follows the selection: whatever level it is on comes to the middle, with
  // the levels either side of it still in view.
  useEffect(() => {
    const box = scroller.current;
    const row = marker.current;
    if (!box || !row) return;

    box.scrollTo({ left: Math.max(0, row.offsetLeft - box.clientWidth / 2), behavior: "smooth" });
  }, [view]);

  /** A new thing goes inside whatever layer is open. */
  const parent = view && graph.nodes[view] ? view : null;

  /** Commit a rename. The project renames through its own action — the tree's
   *  root is not a node. */
  function rename(id: string, label: string) {
    const wanted = label.trim();
    const current = id === ROOT ? title : graph.nodes[id]?.label;

    if (wanted && wanted !== current) {
      id === ROOT ? onRenameProject(wanted) : onRename(id, wanted);
    }

    setEditing(null);
  }

  function create(label: string) {
    if (label.trim()) onCreate(label.trim(), parent);

    setAdding(false);
  }

  /** Finish a drag, ignoring drops that would leave the node where it is. */
  function drop(into: string | null) {
    const moved = held && held !== into && (graph.nodes[held]?.parent ?? null) !== into;
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

  /** Text field shared by renaming and naming something new. */
  function field(initial: string, commit: (value: string) => void, cancel: () => void) {
    return (
      <input
        className="rename"
        autoFocus
        defaultValue={initial}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(event.currentTarget.value);
          if (event.key === "Escape") cancel();
        }}
      />
    );
  }

  /** Rows for one level. Indentation comes from the nesting of `<ul className
   *  ="branch">` itself, so the guide line drawn on that element and the row's
   *  own position always agree — there is no separate depth number to keep in
   *  step with it. Guides only exist while the branch is open: a collapsed
   *  parent omits this list entirely. */
  function branch(parentId: string) {
    // Interfaces are children like any other, listed alongside the blocks and
    // told apart by their icon; `branches` has already sorted them last.
    const here = (kids[parentId] ?? []).filter((n) => showPorts || !isPort(n));

    const row = (node: Node) => {
      const holds = Boolean(kids[node.id]?.some((n) => showPorts || !isPort(n)));

      return (
        <li key={node.id}>
          <div
            className={[
              "item",
              isContainer(graph, node.id) ? "group" : "object",
              isPort(node) ? "port" : "",
              node.id === view ? "active" : "",
              over === node.id ? "over" : "",
            ].join(" ")}
            ref={node.id === view ? marker : undefined}
            draggable={editing !== node.id}
            onDragStart={(event) => {
              setHeld(node.id);
              // Dropped on another layer's canvas this becomes a reference,
              // which is a mention of the node rather than a move of it.
              event.dataTransfer.setData(REFERRED, node.id);
              event.dataTransfer.effectAllowed = "all";
            }}
            onClick={() => onOpen(node.id)}
            onDoubleClick={() => setEditing(node.id)}
            {...dropzone(node.id, node.id)}
          >
            <span
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
                fold(node.id);
              }}
            >
              {icon(graph, node)}
            </span>
            {editing === node.id
              ? field(node.label, (value) => rename(node.id, value), () => setEditing(null))
              : <span className="label">{nameOf(graph, node)}</span>}
          </div>
          {holds && open.has(node.id) && <ul className="branch">{branch(node.id)}</ul>}
        </li>
      );
    };

    return <>{here.map(row)}</>;
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

  return (
    // Focusable so that clicking a row puts the key handler in reach.
    <div className="files" tabIndex={0} onKeyDown={press}>
      <div className="files-bar">
        <span className="title">Explorer</span>
        <span className="actions">
          <button onClick={() => setAdding(true)} title={`New ${terms.node}`}>
            ＋
          </button>
          <button onClick={() => setEditing(view ?? ROOT)} title="Rename what is open">
            ✎
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

      <div className="tree" ref={scroller}>
        <div
          className={`item root ${view === null ? "active" : ""} ${over === ROOT ? "over" : ""}`}
          onClick={() => onOpen(null)}
          onDoubleClick={() => setEditing(ROOT)}
          {...dropzone(ROOT, null)}
        >
          {editing === ROOT
            ? field(title, (value) => rename(ROOT, value), () => setEditing(null))
            : <span className="label">{title}</span>}
        </div>

        {/* Same indent step as a nested branch, without its guide line — the
            root row isn't a foldable node for a line to hang from. */}
        <ul className="roots">{branch(ROOT)}</ul>

        {adding && (
          <div className="item new">
            {field("", create, () => setAdding(false))}
          </div>
        )}

        {Object.keys(graph.nodes).length === 0 && !adding && (
          <p className="empty">Nothing here yet</p>
        )}
      </div>
    </div>
  );
}
