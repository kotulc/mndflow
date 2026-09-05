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

import { useMemo, useRef, useState } from "react";
import { alias_of, children, is_interface, is_named, is_reference, module_of,
         shown_name, type Act, type Graph, type Id } from "@mnd/core";
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

type Row = { id: Id; depth: number; label: string; kids: number; mark: Mark;
             /** Whether that label is a name somebody chose, or the type the
              *  block reads as until they do. Drawn quietly when it is not. */
             named: boolean;
             /** The mark it wears beside its type while nobody has named it, so
              *  two rows both reading `Block` are still told apart. */
             alias: string;
             /** One flag per indent column, saying whether the line hanging
              *  down that column carries on past this row — which is the one
              *  thing a flat list cannot read off itself. Column *j* hangs from
              *  the ancestor at depth *j*, so what continues it is whether the
              *  ancestor at depth *j+1* has a sibling still to come; the last
              *  column is the row's own. */
             guides: boolean[] };
type Mark = "leaf" | "container" | "folder" | "interface" | "reference" | "note" | "group" | "grid";

/** What the tree draws under a block. A boundary, a note, a field and a
 *  reference are never listed — a reference is a second appearance of
 *  something already there. **Asked in one place**, so what a row says it
 *  holds and what the tree then lists under it cannot disagree. */
function under(graph: Graph, parent: Id | null) {
  return children(graph, parent).filter((b) => {
    if (is_interface(b) || is_reference(b)) return false;
    const module = module_of(graph, b.id);
    return module !== "group" && module !== "grid" && module !== "note";
  });
}

/** The tree is blocks. */
function tree_of(graph: Graph, folded: readonly Id[]): Row[] {
  const out: Row[] = [];
  /** **A row's columns are its holder's, plus one for itself.** Every column
   *  but the last says what the holder's own row already said, so it is handed
   *  down rather than worked out again — read off the ancestors instead, a
   *  column asked whether *that ancestor* had a sibling coming, which is a
   *  different question one level up and drew lines under the wrong branches. */
  const walk = (parent: Id | null, depth: number, held: boolean[]) => {
    const kin = under(graph, parent);
    kin.forEach((b, n) => {
      const kids = under(graph, b.id);
      const guides = depth ? [...held, n < kin.length - 1] : [];
      out.push({ id: b.id, depth, label: shown_name(graph, b.id), kids: kids.length,
                 named: is_named(graph, b.id), alias: alias_of(graph, b.id),
                 mark: module_of(graph, b.id) === "folder" ? "folder"
                     : kids.length ? "container" : "leaf",
                 guides });
      if (!folded.includes(b.id)) walk(b.id, depth + 1, guides);
    });
  };
  walk(graph.root, 0, []);
  return out;
}

/** The indent, and where the line down each column of it sits: under the
 *  middle of the mark that column hangs from. Read by the rows' padding and by
 *  the guides both, so they are stated once and cannot drift apart. */
const STEP = 14;
const MARK_SIZE = 14;
const GUIDE = 8 + MARK_SIZE / 2;

/** How wide the panel may be dragged. Narrow enough to be a margin, and never
 *  past a third of the window — the drawing is what the app is for, so it keeps
 *  two thirds of it whatever the panel is dragged to. */
const WIDTH = { least: 168, most: (seen: number) => seen / 3, first: 168 };

/** Where a drop on a row would land. **The edges of a row are the gaps between
 *  rows**: aiming *between* two things puts the pointer at the top or the
 *  bottom of one of them, and aiming *at* one puts it in the middle. */
function seam(e: React.DragEvent): "in" | "above" | "below" {
  const box = e.currentTarget.getBoundingClientRect();
  const at = (e.clientY - box.top) / (box.height || 1);
  return at < 0.3 ? "above" : at > 0.7 ? "below" : "in";
}

/** The layer a drop would join: the row itself when it lands *in* it, its
 *  holder when it lands beside it. **A place, not a line** — so the tree draws
 *  the whole layer taking the block, the way a file explorer does. */
function landing(graph: Graph, over: { id: Id; where: "in" | "above" | "below" } | null) {
  if (!over) return null;
  return over.where === "in" ? over.id : graph.blocks[over.id]?.parent ?? graph.root;
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
  grid: { icon: "role_table" },
};

export function Explorer(props: ExplorerProps) {
  const { graph, open, picked, folded, lit = [], onAct, onFold, onPick,
          menu: offered = true } = props;
  /** What is in hand. **A selection, not a row** — dragging one of several
   *  picked rows moved that one and quietly left the rest where they were. */
  const [dragging, set_dragging] = useState<readonly Id[]>([]);
  /** Where a range runs from. The last row a plain or toggling click landed on,
   *  the way every list with a shift-click behaves. */
  const [anchor, set_anchor] = useState<Id | null>(null);
  const [over, set_over] = useState<{ id: Id; where: "in" | "above" | "below" } | null>(null);
  /** Whether the drop would land on the panel itself, which is the workspace.
   *  **The whole panel, not the strip under the last row** — dragging a block
   *  out to the top level meant hitting a band a few rows tall, and everything
   *  around the tree meant nothing at all. */
  const [out, set_out] = useState(false);
  const [menu, set_menu] = useState<{ x: number; y: number } | null>(null);
  /** How wide the panel is, and where a drag of its edge started. **The panel
   *  bounds itself**, so the shell is not asked to hold a number that only
   *  means something here. */
  const [width, set_width] = useState(WIDTH.first);
  const grip = useRef<{ x: number; w: number } | null>(null);
  /** The row being renamed. **A name is edited where it is read** — the row
   *  itself takes the typing, the same way a card's name does on the drawing,
   *  so the two surfaces are one gesture and not two. */
  const [naming, set_naming] = useState<Id | null>(null);

  /** A match inside a shut branch cannot be lit, so narrowing opens the way to
   *  what it found. Derived, never a fold anybody has to undo afterwards. */
  const shut = lit.length
    ? folded.filter((id) => !lit.some((m) => on_path(graph, m, id)))
    : folded;
  const rows = tree_of(graph, shut);
  const one = picked.length === 1 ? picked[0]! : null;
  /** **Where something new goes: what you picked, or where you are.** The
   *  workspace was neither — so a block added from the tree while you stood
   *  inside a layer landed at the top of the workspace, out of sight of the
   *  drawing you were looking at, which is the canvas and the tree disagreeing
   *  about *here*. A relationship, a boundary and a note can all be picked and
   *  none of them is somewhere a block can live, so none of them answers. */
  const holder = one && graph.blocks[one]
    && !["group", "grid", "note"].includes(module_of(graph, one)) ? one : null;
  const target = holder ?? open ?? graph.root;
  const any_open = rows.some((r) => r.kids > 0 && !folded.includes(r.id));
  /** The layer a drop would join, and every row already in it. Empty unless
   *  something is being dragged over a row. */
  const zone = landing(graph, over);

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

  /** **What a click on a row means.** Plain is *this one, and go there*; with
   *  the toggle key it adds or drops one, and with shift it takes the run
   *  between the anchor and here. **Only a plain click reveals** — building a
   *  selection is not asking to be taken somewhere else. */
  const clicked = (e: React.MouseEvent, id: Id) => {
    if (e.shiftKey && anchor) {
      const from = rows.findIndex((x) => x.id === anchor);
      const to = rows.findIndex((x) => x.id === id);
      if (from >= 0 && to >= 0) {
        const [a, b] = from < to ? [from, to] : [to, from];
        onPick(rows.slice(a, b + 1).map((x) => x.id));
        return;
      }
    }
    set_anchor(id);
    if (e.ctrlKey || e.metaKey) {
      onPick(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
      return;
    }
    onAct("reveal", { id });
    onPick([id]);
  };

  /** What a drag off this row carries. **A picked row brings the selection**;
   *  an unpicked one is only itself, so dragging something you had not chosen
   *  never sweeps up what you had. */
  const load = (id: Id): Id[] =>
    picked.includes(id) ? rows.filter((r) => picked.includes(r.id)).map((r) => r.id) : [id];

  /** What is in hand at a drop, whichever surface started it. */
  const dropped = (e: React.DragEvent): Id[] => {
    const said = e.dataTransfer?.getData("text/mnd-block");
    return dragging.length ? [...dragging] : said ? [said] : [];
  };

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
    <NamingContext.Provider value={typing}>
    <nav className={`explorer${out || zone === graph.root ? " out" : ""}`} aria-label="workspace"
         style={{ width }}
         onDragOver={(e) => { e.preventDefault(); set_over(null); set_out(true); }}
         onDragLeave={() => set_out(false)}
         onDrop={(e) => {
           e.preventDefault();
           const ids = dropped(e);
           set_out(false);
           set_dragging([]);
           if (ids.length) onAct("move", { ids, parent: graph.root });
         }}>
      <div className="bar">
        {/* **The workspace, as [WS].** One fixed mark for the root the tree
            names — a click opens the top level, like every other chip. */}
        <span className="chip" title="the workspace"
              onClick={() => { onAct("open", { id: graph.root }); onPick([]); }}>
          <span className="label">[WS]</span>
        </span>
        <span className="tools">
          <button title={`add a block in ${shown_name(graph, target)}`}
                  onClick={() => add()}><Icon name="add" /></button>
          <button title={`add a folder in ${shown_name(graph, target)}`}
                  onClick={() => add("folder")}><Icon name="add_folder" /></button>
          <button title={any_open ? "fold everything" : "open everything"}
                  onClick={() => {
                    for (const r of tree_of(graph, [])) {
                      if (r.kids > 0) onFold(r.id, any_open);
                    }
                  }}><Icon name={any_open ? "fold_all" : "unfold_all"} /></button>
          <button title="delete what is picked" disabled={!one}
                  onClick={() => one && onAct("delete", { id: one })}><Icon name="remove" /></button>
        </span>
      </div>

        <ul className="tree">
          {rows.map((r) => (
            <li key={r.id}
                className={[
                  r.depth ? "" : "top",
                  r.named ? "" : "unnamed",
                  picked.includes(r.id) ? "picked" : "",
                  lit.includes(r.id) ? "lit" : "",
                  lit.length && !lit.includes(r.id) ? "dim" : "",
                  open === r.id ? "open" : "",
                  /** **The whole layer, and the seam within it.** The wash says
                   *  where the block ends up; the line says where in the order,
                   *  and only the row under the pointer draws that. */
                  zone && zone !== graph.root && on_path(graph, r.id, zone) ? "zone" : "",
                  r.id === zone ? "holder" : "",
                  over?.id === r.id && over.where !== "in" ? `to-${over.where}` : "",
                ].filter(Boolean).join(" ")}
                data-mark={r.mark}
                style={{ paddingLeft: 8 + r.depth * STEP }}
                draggable={naming !== r.id}
                onDragStart={(e) => {
                  set_dragging(load(r.id));
                  /** **The same drag, one target further.** A row dropped on
                   *  another row re-parents; dropped on the drawing it is placed
                   *  there, and the canvas reads this to know which it got —
                   *  one block, because a drop on the drawing is one place. */
                  e.dataTransfer?.setData("text/mnd-block", r.id);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => { set_dragging([]); set_over(null); set_out(false); }}
                onDragOver={(e) => {
                  e.preventDefault();
                  /** The row answers for itself, so the panel behind it does
                   *  not also answer *the workspace*. */
                  e.stopPropagation();
                  set_out(false);
                  if (!dragging.includes(r.id)) set_over({ id: r.id, where: seam(e) });
                }}
                onDragLeave={() => set_over((o) => (o?.id === r.id ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const where = seam(e);
                  const ids = dropped(e).filter((id) => id !== r.id);
                  set_over(null);
                  set_dragging([]);
                  if (!ids.length) return;
                  /** **On a row is into it; between two rows is beside them.**
                   *  One gesture files something away and the other says where
                   *  it sits, and which you meant is where you let go. */
                  if (where === "in") { onAct("move", { ids, parent: r.id }); return; }
                  const parent = graph.blocks[r.id]?.parent ?? graph.root;
                  /** **Without the ones being moved.** Below a row whose next
                   *  sibling *is* something in hand, that block would be asked
                   *  to go in front of itself — which is nowhere, so it went to
                   *  the end of the list instead of one place down. */
                  const kin = children(graph, parent).filter((b) => !ids.includes(b.id));
                  const next = kin[kin.findIndex((b) => b.id === r.id) + 1];
                  const before = where === "above" ? r.id : next?.id;
                  onAct("move", { ids, parent, ...(before ? { before } : {}) });
                }}
                onClick={(e) => clicked(e, r.id)}
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
              {/* One line per indent column, hung under the mark of the row it
                  belongs to. The last carries the tick across to this one. */}
              {r.guides.map((more, i) => (more || i === r.depth - 1 ? (
                <i key={i} aria-hidden className={["guide", i === r.depth - 1 ? "tick" : "",
                                                   more ? "" : "stop"].filter(Boolean).join(" ")}
                   style={{ left: GUIDE + i * STEP }} />
              ) : null))}
              {/* **A branch joins its own line.** Every other segment runs from
                  the top of a row, so the line under an open branch began at
                  the first child and left the mark it hangs from floating clear
                  of it. This is the half-row that closes that gap. */}
              {r.kids && !shut.includes(r.id) ? (
                <i aria-hidden className="guide down" style={{ left: GUIDE + r.depth * STEP }} />
              ) : null}
              <span className={["mark", r.mark,
                                r.kids ? (shut.includes(r.id) ? "shut" : "on") : ""]
                       .filter(Boolean).join(" ")}
                    title={r.kids ? (shut.includes(r.id) ? "open" : "fold") : undefined}
                    onClick={(e) => { e.stopPropagation();
                                      if (r.kids) onFold(r.id, !shut.includes(r.id)); }}>
                <Icon name={MARK[r.mark].icon} solid={MARK[r.mark].solid} size={MARK_SIZE} />
              </span>
              <Name id={r.id} className="label" text={r.label} />
              {r.alias ? <span className="alias">{r.alias}</span> : null}
            </li>
          ))}
          <li className="floor"
              onClick={() => onPick([])}
              onContextMenu={(e) => { e.preventDefault(); onPick([]);
                                      set_menu({ x: e.clientX, y: e.clientY }); }} />
        </ul>

      {/* **The edge is the control.** A panel whose width is a taste is
          dragged to it rather than argued with, and the pointer is captured so
          the drag survives crossing onto the drawing. */}
      <div className="grip" role="separator" aria-orientation="vertical"
           aria-label="how wide the explorer is"
           onPointerDown={(e) => { grip.current = { x: e.clientX, w: width };
                                   e.currentTarget.setPointerCapture(e.pointerId); }}
           onPointerMove={(e) => {
             if (!grip.current) return;
             const want = grip.current.w + e.clientX - grip.current.x;
             const most = Math.max(WIDTH.least, WIDTH.most(window.innerWidth));
             set_width(Math.min(most, Math.max(WIDTH.least, want)));
           }}
           onPointerUp={() => { grip.current = null; }}
           onPointerCancel={() => { grip.current = null; }} />

      {menu && offered ? (
        <Menu ctx={{ graph, layer: open, picked: [...picked] }} at={menu}
              onAct={onAct} onShut={() => set_menu(null)} />
      ) : null}
    </nav>
    </NamingContext.Provider>
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
