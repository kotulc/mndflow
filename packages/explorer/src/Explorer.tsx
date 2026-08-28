/** The workspace explorer: structure, and only structure.
 *
 *  A pure function of its props. It holds no state, reaches for nothing, and
 *  emits an action name — which is what lets it be handed a fixture and run on
 *  its own.
 *
 *  **One click sets context, two edit what it is on.** A click reveals: it
 *  goes to the layer holding the row and picks it there, so selecting always
 *  shows a thing among its siblings and never lands you inside it. Walking in
 *  is clicking a child. A double click renames — the Stage reads the same
 *  pair, and edits the name there too. */

import { useState } from "react";
import { children, is_interface, is_reference, module_of, shown_name,
         type Act, type Graph, type Id } from "@mnd/core";
import { Menu } from "./Menu";

export type ExplorerProps = {
  graph: Graph;
  /** The layer the stage is pointed at. Draws as a wash. */
  open: Id | null;
  /** What an action would act on. Takes the accent, and reads first. */
  picked: readonly Id[];
  /** Which branches are shut. Session state, handed down. */
  folded: readonly Id[];
  /** What a narrowing matched. **Lit, never hidden** — the tree is the one
   *  place you can still see where a match sits, so hiding the rest would take
   *  away the answer along with the noise. Empty is nothing narrowed. */
  lit?: readonly Id[];
  /** Told `reveal` on a click and `rename` on a double click, plus whatever
   *  the offered list names. Never a mutation. */
  onAct: Act;
  onFold: (id: Id, shut: boolean) => void;
  onPick: (ids: Id[]) => void;
  /** Whether right-click opens **this engine's** offered list. A host with a
   *  vocabulary of its own turns it off and keeps the tree: `onAct` is a name
   *  and arguments, so what the rows mean was never the explorer's to decide. */
  menu?: boolean;
};

type Row = { id: Id; depth: number; label: string; kids: number; mark: Mark };
type Mark = "leaf" | "container" | "folder" | "interface" | "reference" | "note" | "group";

/** The tree is blocks. A boundary, a note, a field and a reference are never
 *  listed — a reference is a second appearance of something already there. */
function tree_of(graph: Graph, folded: readonly Id[], empties: boolean): Row[] {
  const out: Row[] = [];
  const walk = (parent: Id | null, depth: number) => {
    for (const b of children(graph, parent)) {
      if (is_interface(b) || is_reference(b)) continue;
      const module = module_of(graph, b.id);
      if (module === "group" || module === "note") continue;
      const kids = children(graph, b.id)
        .filter((k) => !is_interface(k) && !is_reference(k)).length;
      if (!empties && kids === 0 && parent !== graph.root) continue;
      out.push({ id: b.id, depth, label: shown_name(graph, b.id), kids,
                 mark: module === "folder" ? "folder" : kids ? "container" : "leaf" });
      if (!folded.includes(b.id)) walk(b.id, depth + 1);
    }
  };
  walk(graph.root, 0);
  return out;
}

const GLYPH: Record<Mark, string> = {
  leaf: "▫", container: "▪", folder: "▤", interface: "◦",
  reference: "↗", note: "≡", group: "⌗",
};

export function Explorer(props: ExplorerProps) {
  const { graph, open, picked, folded, lit = [], onAct, onFold, onPick,
          menu: offered = true } = props;
  const [empties, set_empties] = useState(true);
  const [dragging, set_dragging] = useState<Id | null>(null);
  const [over, set_over] = useState<Id | null>(null);
  const [menu, set_menu] = useState<{ x: number; y: number } | null>(null);

  /** A match inside a shut branch cannot be lit, so narrowing opens the way to
   *  what it found. Derived, never a fold anybody has to undo afterwards. */
  const shut = lit.length
    ? folded.filter((id) => !lit.some((m) => on_path(graph, m, id)))
    : folded;
  const rows = tree_of(graph, shut, empties);
  const one = picked.length === 1 ? picked[0]! : null;
  const target = one ?? graph.root;
  const any_open = rows.some((r) => r.kids > 0 && !folded.includes(r.id));

  const add = (type?: string) => {
    const label = prompt(type === "folder" ? "name the folder" : "name the block");
    if (label === null) return;
    onAct("create", { label, parent: target, type });
  };

  return (
    <nav className="explorer" aria-label="workspace">
      <div className="bar">
        <span className="chip" title="the workspace"
              onClick={() => { onAct("open", { id: graph.root }); onPick([]); }}>
          ▤ workspace
        </span>
        <span className="tools">
          <button title={`add a block in ${shown_name(graph, target)}`}
                  onClick={() => add()}>＋</button>
          <button title={`add a folder in ${shown_name(graph, target)}`}
                  onClick={() => add("folder")}>▤</button>
          <button title={any_open ? "fold everything" : "open everything"}
                  onClick={() => {
                    for (const r of tree_of(graph, [], true)) {
                      if (r.kids > 0) onFold(r.id, any_open);
                    }
                  }}>{any_open ? "▾" : "▸"}</button>
          <button title={empties ? "hide what holds nothing" : "show everything"}
                  onClick={() => set_empties(!empties)}>{empties ? "◉" : "○"}</button>
          <button title="delete what is picked" disabled={!one}
                  onClick={() => one && onAct("delete", { id: one })}>✕</button>
        </span>
      </div>

      <ul className="tree">
        {rows.map((r) => (
          <li key={r.id}
              className={[
                picked.includes(r.id) ? "picked" : "",
                lit.includes(r.id) ? "lit" : "",
                lit.length && !lit.includes(r.id) ? "dim" : "",
                open === r.id ? "open" : "",
                over === r.id ? "over" : "",
              ].filter(Boolean).join(" ")}
              style={{ paddingLeft: 8 + r.depth * 14 }}
              draggable
              onDragStart={() => set_dragging(r.id)}
              onDragEnd={() => { set_dragging(null); set_over(null); }}
              onDragOver={(e) => { e.preventDefault(); if (dragging !== r.id) set_over(r.id); }}
              onDragLeave={() => set_over((o) => (o === r.id ? null : o))}
              onDrop={(e) => {
                e.preventDefault();
                set_over(null);
                if (dragging && dragging !== r.id) onAct("move", { id: dragging, parent: r.id });
                set_dragging(null);
              }}
              onClick={() => { onAct("reveal", { id: r.id }); onPick([r.id]); }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!picked.includes(r.id)) { onAct("reveal", { id: r.id }); onPick([r.id]); }
                set_menu({ x: e.clientX, y: e.clientY });
              }}
              onDoubleClick={() => {
                const label = prompt("rename", r.label);
                if (label !== null) onAct("rename", { id: r.id, label });
              }}>
            <span className="mark"
                  onClick={(e) => { e.stopPropagation();
                                    if (r.kids) onFold(r.id, !shut.includes(r.id)); }}>
              {GLYPH[r.mark]}
            </span>
            <span className="label">{r.label}</span>
          </li>
        ))}
        <li className="floor"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging) onAct("move", { id: dragging, parent: graph.root });
              set_dragging(null);
            }}
            onClick={() => onPick([])}
            onContextMenu={(e) => { e.preventDefault(); onPick([]);
                                    set_menu({ x: e.clientX, y: e.clientY }); }} />
      </ul>

      {menu && offered ? (
        <Menu ctx={{ graph, layer: open, picked: [...picked] }} at={menu}
              onAct={onAct} onShut={() => set_menu(null)} />
      ) : null}
    </nav>
  );
}

/** Whether an ancestor of this block is that one. What lighting a match has to
 *  know to open its way down. */
function on_path(graph: Graph, id: Id, ancestor: Id): boolean {
  let at: Id | null = id;
  const seen = new Set<Id>();
  while (at && !seen.has(at)) {
    if (at === ancestor) return true;
    seen.add(at);
    at = graph.blocks[at]?.parent ?? null;
  }
  return false;
}

export { tree_of };
