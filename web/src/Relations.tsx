/** The kinds of relation this project uses, under the explorer.
 *
 *  Seeded from the domain and edited freely. Each kind shows how many edges
 *  carry it, so the list doubles as a census of the graph: a kind used once is
 *  probably a typo, and a kind used nowhere is a suggestion nobody took.
 *
 *  Renaming a kind renames every edge using it. Dropping one leaves those edges
 *  in place, unnamed — deleting a label should not delete the connections it
 *  described. */

import { useMemo, useState } from "react";

import type { Graph } from "./core/types";

type Props = {
  graph: Graph;
  onAdd: (name: string) => void;
  onRename: (from: string, to: string) => void;
  onDrop: (name: string) => void;
};

export function Relations({ graph, onAdd, onRename, onDrop }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  /** Every kind, with how many edges carry it. Kinds used but not listed are
   *  included too, so nothing in the graph is invisible here. */
  const kinds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const name of graph.relations) counts.set(name, 0);
    for (const edge of Object.values(graph.edges)) {
      if (edge.type) counts.set(edge.type, (counts.get(edge.type) ?? 0) + 1);
    }

    return [...counts.entries()];
  }, [graph]);

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

  return (
    <div className="relations">
      <div className="files-bar">
        <span className="title">Relations</span>
        <span className="actions">
          <button onClick={() => setAdding(true)} title="New relation kind">
            ＋
          </button>
        </span>
      </div>

      <ul>
        {kinds.map(([name, count]) => (
          <li key={name} className="kind">
            {editing === name ? (
              field(name, (value) => (onRename(name, value), setEditing(null)),
                    () => setEditing(null))
            ) : (
              <>
                <span className="name" onDoubleClick={() => setEditing(name)} title="double-click to rename">
                  {name}
                </span>
                <span className={`count ${count ? "" : "unused"}`}>{count}</span>
                <button className="drop" onClick={() => onDrop(name)} title="Drop this kind">
                  ✕
                </button>
              </>
            )}
          </li>
        ))}

        {adding && (
          <li className="kind">
            {field("", (value) => (onAdd(value), setAdding(false)), () => setAdding(false))}
          </li>
        )}

        {!kinds.length && !adding && <li className="empty">None yet</li>}
      </ul>
    </div>
  );
}
