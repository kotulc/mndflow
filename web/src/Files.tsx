/** Project tree. Folders and documents are the graph's own hierarchy: every
 *  node is a document, and every node with children is also a folder.
 *
 *  It behaves the way a file explorer does — new, rename, move, delete — and
 *  selecting a document is also how the conversation is steered, since the
 *  question that comes back is about whatever is selected. */

import { useMemo, useState } from "react";

import type { Graph, Node } from "./api";

const ROOT = "__root__";

/** Child nodes per parent, label-ordered, keyed by ROOT for the top level. */
function branches(graph: Graph): Record<string, Node[]> {
  const kids: Record<string, Node[]> = {};

  for (const node of Object.values(graph.nodes)) {
    const parent = node.parent && graph.nodes[node.parent] ? node.parent : ROOT;
    (kids[parent] ??= []).push(node);
  }

  for (const list of Object.values(kids)) list.sort((a, b) => a.label.localeCompare(b.label));

  return kids;
}

type Props = {
  graph: Graph;
  selected: string | null;
  busy: boolean;
  onSelect: (id: string | null) => void;
  onCreate: (label: string, parent: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, parent: string | null) => void;
  onRename: (id: string, label: string) => void;
  onRenameProject: (label: string) => void;
};

export function Files(props: Props) {
  const { graph, selected, busy, onSelect, onCreate, onDelete, onMove } = props;
  const { onRename, onRenameProject } = props;
  const kids = useMemo(() => branches(graph), [graph]);
  const [held, setHeld] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const title = graph.title || "project";

  /** Commit a rename, ignoring an unchanged or emptied label. The project
   *  itself renames through its own call — the root is not a node. */
  function rename(id: string, label: string) {
    const wanted = label.trim();
    const current = id === ROOT ? title : graph.nodes[id]?.label;

    if (wanted && wanted !== current) {
      id === ROOT ? onRenameProject(wanted) : onRename(id, wanted);
    }

    setEditing(null);
  }

  /** Commit a new document under the selection, ignoring an empty name. */
  function create(label: string) {
    const wanted = label.trim();
    if (wanted && !busy) onCreate(wanted, selected);

    setAdding(false);
  }

  /** Finish a drag, ignoring drops that would leave the node where it is. */
  function drop(parent: string | null) {
    const moved = held && held !== parent && (graph.nodes[held]?.parent ?? null) !== parent;
    if (moved && !busy) onMove(held!, parent);

    setHeld(null);
    setOver(null);
  }

  /** Drop-target wiring shared by the root row and every node row. */
  function target(id: string, parent: string | null) {
    return {
      onDragOver: (event: React.DragEvent) => (event.preventDefault(), setOver(id)),
      onDragLeave: () => setOver(null),
      onDrop: (event: React.DragEvent) => (event.preventDefault(), drop(parent)),
    };
  }

  /** Text field shared by renaming a document and naming a new one. */
  function field(initial: string, commit: (value: string) => void, cancel: () => void) {
    return (
      <input
        className="rename"
        autoFocus
        defaultValue={initial}
        disabled={busy}
        onBlur={(event) => commit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(event.currentTarget.value);
          if (event.key === "Escape") cancel();
        }}
      />
    );
  }

  /** Rows for one level, drawn with the connectors a terminal tree uses. */
  function branch(parent: string, prefix: string) {
    const list = kids[parent] ?? [];

    return list.map((node, index) => {
      const last = index === list.length - 1;

      return (
        <li key={node.id}>
          <div
            className={`item ${node.id === selected ? "active" : ""} ${over === node.id ? "over" : ""}`}
            draggable={editing !== node.id}
            onDragStart={() => setHeld(node.id)}
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => setEditing(node.id)}
            {...target(node.id, node.id)}
          >
            <span className="rule">{prefix + (last ? "└── " : "├── ")}</span>
            {editing === node.id
              ? field(node.label, (value) => rename(node.id, value), () => setEditing(null))
              : `${node.label}${kids[node.id] ? "/" : ".md"}`}
          </div>
          {kids[node.id] && <ul>{branch(node.id, prefix + (last ? "    " : "│   "))}</ul>}
        </li>
      );
    });
  }

  return (
    <div className="files">
      <div className="files-bar">
        <span>files</span>
        <span className="actions">
          <button onClick={() => setAdding(true)} disabled={busy} title="New document">
            + new
          </button>
          <button
            onClick={() => setEditing(selected ?? ROOT)}
            disabled={busy}
            title="Rename the selection"
          >
            rename
          </button>
          <button
            onClick={() => selected && onDelete(selected)}
            disabled={busy || !selected}
            title="Delete the selection"
          >
            delete
          </button>
        </span>
      </div>

      <div
        className={`item root ${selected === null ? "active" : ""} ${over === ROOT ? "over" : ""}`}
        onClick={() => onSelect(null)}
        onDoubleClick={() => setEditing(ROOT)}
        {...target(ROOT, null)}
      >
        {editing === ROOT
          ? field(title, (value) => rename(ROOT, value), () => setEditing(null))
          : `${title}/`}
      </div>

      <ul>{branch(ROOT, "")}</ul>

      {adding && (
        <div className="item new">
          <span className="rule">└── </span>
          {field("", create, () => setAdding(false))}
        </div>
      )}

      {Object.keys(graph.nodes).length === 0 && !adding && (
        <p className="empty">No documents yet</p>
      )}
    </div>
  );
}
