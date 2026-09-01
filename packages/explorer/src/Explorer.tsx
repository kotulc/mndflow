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

import { useMemo, useState } from "react";
import { children, is_interface, is_reference, module_of, shown_name,
         type Act, type Graph, type Id } from "@mnd/core";
import { Icon, Name, NamingContext, type IconName } from "@mnd/theme";
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

type Row = { id: Id; depth: number; label: string; kids: number; holds: number; mark: Mark };
type Mark = "leaf" | "container" | "folder" | "interface" | "reference" | "note" | "group";

/** What the tree draws under a block. A boundary, a note, a field and a
 *  reference are never listed — a reference is a second appearance of
 *  something already there. **Asked in one place**, so what a row says it
 *  holds and what the tree then lists under it cannot disagree. */
function under(graph: Graph, parent: Id | null) {
  return children(graph, parent).filter((b) => {
    if (is_interface(b) || is_reference(b)) return false;
    const module = module_of(graph, b.id);
    return module !== "group" && module !== "note";
  });
}

/** The tree is blocks. */
function tree_of(graph: Graph, folded: readonly Id[], empties: boolean): Row[] {
  const out: Row[] = [];
  const walk = (parent: Id | null, depth: number) => {
    for (const b of under(graph, parent)) {
      const kids = under(graph, b.id);
      if (!empties && !kids.length && parent !== graph.root) continue;
      /** **The fold is about the list, not the block.** With what holds
       *  nothing hidden, a container full of leaves lists none of them — so a
       *  row that offered to unfold opened onto nothing at all. What can be
       *  unfolded is what would actually be drawn. */
      const holds = empties ? kids.length
        : kids.filter((k) => under(graph, k.id).length).length;
      out.push({ id: b.id, depth, label: shown_name(graph, b.id),
                 kids: kids.length, holds,
                 mark: module_of(graph, b.id) === "folder" ? "folder"
                     : kids.length ? "container" : "leaf" });
      if (!folded.includes(b.id)) walk(b.id, depth + 1);
    }
  };
  walk(graph.root, 0);
  return out;
}

/** Where a drop on a row would land. **The edges of a row are the gaps between
 *  rows**: aiming *between* two things puts the pointer at the top or the
 *  bottom of one of them, and aiming *at* one puts it in the middle. */
function seam(e: React.DragEvent): "in" | "above" | "below" {
  const box = e.currentTarget.getBoundingClientRect();
  const at = (e.clientY - box.top) / (box.height || 1);
  return at < 0.3 ? "above" : at > 0.7 ? "below" : "in";
}

/** What a row reads as, as a mark. A container is solid because it holds
 *  something — an outline would read as the empty leaf beside it. */
const MARK: Record<Mark, { icon: IconName; solid?: boolean }> = {
  leaf: { icon: "role_leaf" },
  container: { icon: "role_container", solid: true },
  folder: { icon: "role_folder" },
  interface: { icon: "role_interface" },
  reference: { icon: "role_reference" },
  note: { icon: "role_note" },
  group: { icon: "role_group" },
};

export function Explorer(props: ExplorerProps) {
  const { graph, open, picked, folded, lit = [], onAct, onFold, onPick,
          menu: offered = true } = props;
  const [empties, set_empties] = useState(true);
  const [dragging, set_dragging] = useState<Id | null>(null);
  const [over, set_over] = useState<{ id: Id; where: "in" | "above" | "below" } | null>(null);
  /** Whether the drop would land on the panel itself, which is the workspace.
   *  **The whole panel, not the strip under the last row** — dragging a block
   *  out to the top level meant hitting a band a few rows tall, and everything
   *  around the tree meant nothing at all. */
  const [out, set_out] = useState(false);
  const [menu, set_menu] = useState<{ x: number; y: number } | null>(null);
  /** The row being renamed. **A name is edited where it is read** — the row
   *  itself takes the typing, the same way a card's name does on the drawing,
   *  so the two surfaces are one gesture and not two. */
  const [naming, set_naming] = useState<Id | null>(null);

  /** A match inside a shut branch cannot be lit, so narrowing opens the way to
   *  what it found. Derived, never a fold anybody has to undo afterwards. */
  const shut = lit.length
    ? folded.filter((id) => !lit.some((m) => on_path(graph, m, id)))
    : folded;
  const rows = tree_of(graph, shut, empties);
  const one = picked.length === 1 ? picked[0]! : null;
  /** **Where something new goes: what you picked, or where you are.** The
   *  workspace was neither — so a block added from the tree while you stood
   *  inside a layer landed at the top of the workspace, out of sight of the
   *  drawing you were looking at, which is the canvas and the tree disagreeing
   *  about *here*. A relationship, a boundary and a note can all be picked and
   *  none of them is somewhere a block can live, so none of them answers. */
  const holder = one && graph.blocks[one]
    && !["group", "note"].includes(module_of(graph, one)) ? one : null;
  const target = holder ?? open ?? graph.root;
  const any_open = rows.some((r) => r.holds > 0 && !folded.includes(r.id));

  /** Which name is open, and where what was typed lands. **The tree never
   *  writes**: it says `rename` like it says everything else. */
  const typing = useMemo(() => ({
    id: naming,
    done: (label: string | null) => {
      const id = naming;
      set_naming(null);
      if (id && label !== null) onAct("rename", { id, label });
    },
  }), [naming, onAct]);

  const add = (type?: string) => {
    const label = prompt(type === "folder" ? "name the folder" : "name the block");
    if (label === null) return;
    onAct("create", { label, parent: target, type });
  };

  return (
    /** **Everything that is not a row is the workspace.** A block is dragged
     *  out of what holds it by dropping it clear of the tree, and that used to
     *  mean the strip under the last row — a band a few rows tall, in a panel
     *  that is mostly clear space. Now the clear space is the target. */
    <nav className={`explorer${out ? " out" : ""}`} aria-label="workspace"
         onDragOver={(e) => { e.preventDefault(); set_over(null); set_out(true); }}
         onDragLeave={() => set_out(false)}
         onDrop={(e) => {
           e.preventDefault();
           const id = e.dataTransfer?.getData("text/mnd-block") || dragging;
           set_out(false);
           set_dragging(null);
           if (id) onAct("move", { id, parent: graph.root });
         }}>
      <div className="bar">
        <span className="chip" title="the workspace"
              onClick={() => { onAct("open", { id: graph.root }); onPick([]); }}>
          <Icon name="role_folder" /> workspace
        </span>
        <span className="tools">
          <button title={`add a block in ${shown_name(graph, target)}`}
                  onClick={() => add()}><Icon name="add" /></button>
          <button title={`add a folder in ${shown_name(graph, target)}`}
                  onClick={() => add("folder")}><Icon name="add_folder" /></button>
          <button title={any_open ? "fold everything" : "open everything"}
                  onClick={() => {
                    for (const r of tree_of(graph, [], empties)) {
                      if (r.holds > 0) onFold(r.id, any_open);
                    }
                  }}><Icon name={any_open ? "fold_all" : "unfold_all"} /></button>
          <button title={empties ? "hide what holds nothing" : "show everything"}
                  onClick={() => set_empties(!empties)}>
            <Icon name={empties ? "show_empty" : "hide_empty"} />
          </button>
          <button title="delete what is picked" disabled={!one}
                  onClick={() => one && onAct("delete", { id: one })}><Icon name="remove" /></button>
        </span>
      </div>

      <NamingContext.Provider value={typing}>
        <ul className="tree">
          {rows.map((r) => (
            <li key={r.id}
                className={[
                  picked.includes(r.id) ? "picked" : "",
                  lit.includes(r.id) ? "lit" : "",
                  lit.length && !lit.includes(r.id) ? "dim" : "",
                  open === r.id ? "open" : "",
                  over?.id === r.id ? `to-${over.where}` : "",
                ].filter(Boolean).join(" ")}
                data-mark={r.mark}
                style={{ paddingLeft: 8 + r.depth * 14 }}
                draggable={naming !== r.id}
                onDragStart={(e) => {
                  set_dragging(r.id);
                  /** **The same drag, one target further.** A row dropped on
                   *  another row re-parents; dropped on the drawing it is placed
                   *  there, and the canvas reads this to know which it got. */
                  e.dataTransfer?.setData("text/mnd-block", r.id);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => { set_dragging(null); set_over(null); set_out(false); }}
                onDragOver={(e) => {
                  e.preventDefault();
                  /** The row answers for itself, so the panel behind it does
                   *  not also answer *the workspace*. */
                  e.stopPropagation();
                  set_out(false);
                  if (dragging !== r.id) set_over({ id: r.id, where: seam(e) });
                }}
                onDragLeave={() => set_over((o) => (o?.id === r.id ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const where = seam(e);
                  const id = e.dataTransfer?.getData("text/mnd-block") || dragging;
                  set_over(null);
                  set_dragging(null);
                  if (!id || id === r.id) return;
                  /** **On a row is into it; between two rows is beside them.**
                   *  One gesture files something away and the other says where
                   *  it sits, and which you meant is where you let go. */
                  if (where === "in") { onAct("move", { id, parent: r.id }); return; }
                  const parent = graph.blocks[r.id]?.parent ?? graph.root;
                  /** **Without the one being moved.** Below a row whose next
                   *  sibling *is* the block in hand, the block would be asked
                   *  to go in front of itself — which is nowhere, so it went to
                   *  the end of the list instead of one place down. */
                  const kin = children(graph, parent).filter((b) => b.id !== id);
                  const next = kin[kin.findIndex((b) => b.id === r.id) + 1];
                  const before = where === "above" ? r.id : next?.id;
                  onAct("move", { id, parent, ...(before ? { before } : {}) });
                }}
                onClick={() => { onAct("reveal", { id: r.id }); onPick([r.id]); }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!picked.includes(r.id)) { onAct("reveal", { id: r.id }); onPick([r.id]); }
                  set_menu({ x: e.clientX, y: e.clientY });
                }}
                onDoubleClick={() => set_naming(r.id)}>
              {/* **The mark is the fold, and it says which way it is set.** A
                  branch that is listing what it holds takes the accent; shut,
                  it stands down with the rest of the row — so one icon is both
                  what the row is and whether you are seeing all of it. */}
              <span className={["mark", r.mark,
                                r.holds ? (shut.includes(r.id) ? "shut" : "on") : ""]
                       .filter(Boolean).join(" ")}
                    title={r.holds ? (shut.includes(r.id) ? "open" : "fold") : undefined}
                    onClick={(e) => { e.stopPropagation();
                                      if (r.holds) onFold(r.id, !shut.includes(r.id)); }}>
                <Icon name={MARK[r.mark].icon} solid={MARK[r.mark].solid} size={13} />
              </span>
              <Name id={r.id} className="label" text={r.label} />
            </li>
          ))}
          <li className="floor"
              onClick={() => onPick([])}
              onContextMenu={(e) => { e.preventDefault(); onPick([]);
                                      set_menu({ x: e.clientX, y: e.clientY }); }} />
        </ul>
      </NamingContext.Provider>

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
