/** Object explorer. Folders and documents are the graph's own hierarchy: a
 *  group holds other objects and can be opened, an object cannot.
 *
 *  It behaves the way a file explorer does — new, rename, move, delete — and
 *  selecting is also how the conversation is steered, since the question that
 *  comes back is about whatever is selected. */

import { useMemo, useState } from "react";

import type { Graph, Kind, Node } from "./core/types";
import type { Terms } from "./core/workflows";

const ROOT = "__root__";

/** Child nodes per parent, groups first then by label, keyed by ROOT for the
 *  top level. A node whose parent was undone sits at the top rather than
 *  vanishing from the tree. */
function branches(graph: Graph): Record<string, Node[]> {
  const kids: Record<string, Node[]> = {};

  for (const node of Object.values(graph.nodes)) {
    const parent = node.parent && graph.nodes[node.parent] ? node.parent : ROOT;
    (kids[parent] ??= []).push(node);
  }

  for (const list of Object.values(kids)) {
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "group" ? -1 : 1;

      return a.label.localeCompare(b.label);
    });
  }

  return kids;
}

type Props = {
  graph: Graph;
  selected: string | null;
  /** Groups from the project down to the open one; everything else collapses. */
  path: string[];
  terms: Terms;
  onSelect: (id: string | null) => void;
  onCreate: (label: string, parent: string | null, kind: Kind) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, parent: string | null) => void;
  onRename: (id: string, label: string) => void;
  onRenameProject: (label: string) => void;
};

export function Files(props: Props) {
  const { graph, selected, path, terms, onSelect, onCreate, onDelete, onMove } = props;
  const { onRename, onRenameProject } = props;
  const kids = useMemo(() => branches(graph), [graph]);
  const open = useMemo(() => new Set(path), [path]);
  const [held, setHeld] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState<Kind | null>(null);
  const title = graph.title || "project";

  /** Where a new thing goes: inside the selection when it can hold things,
   *  beside it when it cannot. */
  const target = selected && graph.nodes[selected];
  const parent = target ? (target.kind === "group" ? target.id : target.parent) : null;

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
    if (label.trim() && adding) onCreate(label.trim(), parent, adding);

    setAdding(null);
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

  /** Rows for one level. Depth is indentation rather than drawn connectors —
   *  it keeps long names readable in a narrow pane. */
  function branch(parentId: string, depth: number) {
    const list = kids[parentId] ?? [];

    return list.map((node) => {
      const group = node.kind === "group";

      return (
        <li key={node.id}>
          <div
            className={[
              "item",
              group ? "group" : "object",
              node.id === selected ? "active" : "",
              over === node.id ? "over" : "",
            ].join(" ")}
            draggable={editing !== node.id}
            onDragStart={() => setHeld(node.id)}
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => setEditing(node.id)}
            style={{ paddingLeft: 10 + depth * 14 }}
            {...dropzone(node.id, group ? node.id : node.parent)}
          >
            <span className="glyph">{group ? (open.has(node.id) ? "▾" : "▸") : "·"}</span>
            {editing === node.id
              ? field(node.label, (value) => rename(node.id, value), () => setEditing(null))
              : <span className="label">{node.label}</span>}
          </div>
          {kids[node.id] && (!group || open.has(node.id)) && (
            <ul>{branch(node.id, depth + 1)}</ul>
          )}
        </li>
      );
    });
  }

  return (
    <div className="files">
      <div className="files-bar">
        <span className="title">Explorer</span>
        <span className="actions">
          <button onClick={() => setAdding("object")} title={`New ${terms.node}`}>
            ＋
          </button>
          <button onClick={() => setAdding("group")} title={`New ${terms.group}`}>
            ▤
          </button>
          <button onClick={() => setEditing(selected ?? ROOT)} title="Rename the selection">
            ✎
          </button>
          <button
            onClick={() => selected && onDelete(selected)}
            disabled={!selected}
            title="Delete the selection"
          >
            ✕
          </button>
        </span>
      </div>

      <div
        className={`item root ${selected === null ? "active" : ""} ${over === ROOT ? "over" : ""}`}
        onClick={() => onSelect(null)}
        onDoubleClick={() => setEditing(ROOT)}
        {...dropzone(ROOT, null)}
      >
        <span className="glyph">▾</span>
        {editing === ROOT
          ? field(title, (value) => rename(ROOT, value), () => setEditing(null))
          : <span className="label">{title}</span>}
      </div>

      <ul>{branch(ROOT, 0)}</ul>

      {adding && (
        <div className="item new" style={{ paddingLeft: 24 }}>
          <span className="glyph">{adding === "group" ? "▸" : "·"}</span>
          {field("", create, () => setAdding(null))}
        </div>
      )}

      {Object.keys(graph.nodes).length === 0 && !adding && (
        <p className="empty">Nothing here yet</p>
      )}
    </div>
  );
}
