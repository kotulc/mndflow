/** Object explorer. Folders and documents are the graph's own hierarchy: a
 *  group holds other objects and can be opened, an object cannot.
 *
 *  It behaves the way a file explorer does — new, rename, move, delete — and
 *  selecting is also how the conversation is steered, since the question that
 *  comes back is about whatever is selected. */

import { useMemo, useState } from "react";

import type { Graph, Node } from "./core/types";
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

  // Whatever holds something sorts first; a group is nothing more than that.
  for (const list of Object.values(kids)) {
    list.sort((a, b) => {
      const held = Number(Boolean(kids[b.id])) - Number(Boolean(kids[a.id]));

      return held || a.label.localeCompare(b.label);
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
  onCreate: (label: string, parent: string | null) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, parent: string | null) => void;
  onRename: (id: string, label: string) => void;
  onRenameProject: (label: string) => void;
};

export function Files(props: Props) {
  const { graph, selected, path, terms, onSelect, onCreate, onDelete, onMove } = props;
  const { onRename, onRenameProject } = props;
  const kids = useMemo(() => branches(graph), [graph]);
  /** Groups the user has opened by hand. Any number may be open at once —
   *  a tree that collapses everything else is only useful when there is one
   *  thing to look at. */
  const [unfolded, setUnfolded] = useState<Set<string>>(new Set());
  // Whatever layer the canvas is on stays open regardless.
  const open = useMemo(() => new Set([...unfolded, ...path]), [unfolded, path]);

  function fold(id: string) {
    setUnfolded((prior) => {
      const next = new Set(prior);
      next.has(id) ? next.delete(id) : next.add(id);

      return next;
    });
  }
  const [held, setHeld] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const title = graph.title || "project";

  /** A new thing goes inside whatever is selected — which is what makes that
   *  thing a group, if it was not one already. */
  const parent = selected && graph.nodes[selected] ? selected : null;

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
   *  ="branch">` itself, so the guide line drawn on that element and the
   *  row's own position always agree — there is no separate depth number to
   *  keep in step with it. */
  function branch(parentId: string) {
    const list = kids[parentId] ?? [];

    return list.map((node) => {
      const group = Boolean(kids[node.id]);

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
            {...dropzone(node.id, node.id)}
          >
            <span
              className="glyph"
              onClick={(event) => group && (event.stopPropagation(), fold(node.id))}
            >
              {group ? (open.has(node.id) ? "▾" : "▸") : "·"}
            </span>
            {editing === node.id
              ? field(node.label, (value) => rename(node.id, value), () => setEditing(null))
              : <span className="label">{node.label}</span>}
          </div>
          {kids[node.id] && (!group || open.has(node.id)) && (
            <ul className="branch">{branch(node.id)}</ul>
          )}
        </li>
      );
    });
  }

  /** Delete what is selected. The canvas has its own handling for its own
   *  selection; this is the tree's, and the two are separate now, so the key
   *  has to be caught where the focus actually is. */
  function press(event: React.KeyboardEvent) {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    // Never while naming something — Backspace is just a character there.
    if (editing || adding || (event.target as HTMLElement).closest("input")) return;
    if (!selected) return;

    event.preventDefault();
    onDelete(selected);
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

      {/* Same indent step as a nested branch, without its guide line — the
          root row isn't a foldable group for a line to hang from. */}
      <ul style={{ paddingLeft: 14 }}>{branch(ROOT)}</ul>

      {adding && (
        <div className="item new" style={{ paddingLeft: 38 }}>
          <span className="glyph">·</span>
          {field("", create, () => setAdding(false))}
        </div>
      )}

      {Object.keys(graph.nodes).length === 0 && !adding && (
        <p className="empty">Nothing here yet</p>
      )}
    </div>
  );
}
