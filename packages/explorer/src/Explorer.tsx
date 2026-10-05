/** The workspace explorer: the host's sections, each listing what the pick above holds — a
 *  header, then its rows. **The explorer browses; the canvas is the target**: choosing a row holds
 *  it in its section and puts that section in focus, and opening one (Enter, double-click, →)
 *  is what moves the canvas. The focus is lit strongly, each section's pick more subtly. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { about_of, children, def_named, frozen, headed_group, may_hold, shown_name,
         type Act, type Graph, type Id } from "@mnd/core";
import { Icon, Name, NamingContext, type IconName } from "@mnd/theme";
import { Menu } from "./Menu";
import type { Chain } from "./chain";
import { inside, mark_icon, OPENED, opened, tree_of, type Row } from "./rows";

export type ExplorerProps = {
  graph: Graph;
  /** The layer the canvas draws; null is the overview. */
  open: Id | null;
  /** What an action would act on. Takes the accent, and reads first. */
  picked: readonly Id[];
  /** Which branches are shut. Session state, handed down. */
  folded: readonly Id[];
  /** What a narrowing matched, lit and never hidden. */
  lit?: readonly Id[];
  /** Told `rename` on F2, plus whatever the offered list names. */
  onAct: Act;
  /** A row opened — Enter, a double click, or → — for the canvas to draw. A part names the usage
   *  it was reached through. */
  onOpen?: (row: { at: number; id: Id; via?: Id }) => void;
  /** ← and Backspace: the canvas leaves for the layer above. */
  onLeave?: () => void;
  onFold: (id: Id, shut: boolean) => void;
  onPick: (ids: Id[]) => void;
  /** Whether right-click opens this engine's offered list. */
  menu?: boolean;
  /** Which bar tools to show, each on its own. Defaults preserve mndflow; set false to hide. */
  tools?: {
    filter?: boolean;
    block?: boolean;
    folder?: boolean;
    remove?: boolean;
    /** The bar's fold: every section at once. */
    fold?: boolean;
  };
  /** A host's own tools, drawn after the filter and ahead of the bar's own. */
  extra?: ReactNode;
  /** The host's sections and what each holds. */
  chain: Chain;
  /** Whether the arrows walk the tree: up and down through the rows of the section in focus, left
   *  and right to the section above or below, landing on what it holds. The way to the row walked
   *  to opens, and nothing shuts. A row walked to is chosen as a plain click chooses it. */
  keys?: boolean;
};

/** The keys that walk the tree. */
const WALK = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"];

/** The indent, and where each guide line sits under its mark. */
const STEP = 14;
const MARK_SIZE = 14;
const GUIDE = 8 + MARK_SIZE / 2;

/** How wide the panel may be dragged. */
const WIDTH = { least: 168, most: (seen: number) => seen / 3, first: 168 };


/** Where a drop on a row would land. */
function seam(e: React.DragEvent): "in" | "above" | "below" {
  const box = e.currentTarget.getBoundingClientRect();
  const at = (e.clientY - box.top) / (box.height || 1);
  return at < 0.3 ? "above" : at > 0.7 ? "below" : "in";
}

/** Where a row made under `at` reads: after the last row of its branch, one step in. Rows of the
 *  section in focus answer first, as a block may list in two. */
function after(rows: readonly Row[], at: Id, focus?: number) {
  const of = (r: Row) => r.of === "block" && r.ref === at;
  const focused = rows.findIndex((r) => of(r) && r.at === focus);
  const i = focused >= 0 ? focused : rows.findIndex(of);
  if (i < 0) return { index: rows.length, depth: 0 };
  let j = i + 1;
  while (j < rows.length && rows[j]!.depth > rows[i]!.depth) j++;
  return { index: j, depth: rows[i]!.depth + 1 };
}

/** A row being named before it exists: enter makes it, escape or leaving drops it. */
function Draft({ icon, word, depth, onDone }: {
  icon: IconName; word: string; depth: number; onDone: (label: string | null) => void;
}) {
  /** Settled once, so the blur that follows enter drops nothing. */
  const settled = useRef(false);
  const done = (label: string | null) => {
    if (settled.current) return;
    settled.current = true;
    onDone(label);
  };

  return (
    <li className="draft" style={{ paddingLeft: 8 + depth * STEP }}>
      <span className="mark"><Icon name={icon} size={MARK_SIZE} /></span>
      <input className="label" autoFocus spellCheck={false} placeholder={word}
             aria-label={`name the ${word}`}
             onKeyDown={(e) => {
               e.stopPropagation();
               if (e.key === "Enter") done(e.currentTarget.value.trim() || word);
               else if (e.key === "Escape") done(null);
             }}
             onBlur={() => done(null)} />
    </li>
  );
}

/** The layer a drop would join: the block itself when it lands *in* it, its holder when it lands
 *  beside it. */
function landing(graph: Graph, over: { ref: Id; where: "in" | "above" | "below" } | null) {
  if (!over) return null;
  return over.where === "in" ? over.ref : graph.blocks[over.ref]?.parent ?? graph.root;
}

/** A fold toggle, one look for the bar's and each section's: what it does next, as a tip and
 *  an icon. */
function Fold({ icon, tip, onToggle }: { icon: IconName; tip: string; onToggle: () => void }) {
  return (
    <button className="fold" title={tip} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
      <Icon name={icon} size={MARK_SIZE} />
    </button>
  );
}

export function Explorer(props: ExplorerProps) {
  const { graph, open, picked, folded, lit = [], onAct, onFold, onPick, onOpen, onLeave,
          menu: offered = true, chain, keys = false, tools: bar = {} } = props;
  const show = {
    filter: bar.filter !== false,
    block: bar.block !== false,
    folder: bar.folder !== false,
    remove: bar.remove !== false,
    fold: bar.fold !== false,
  };
  /** What is in hand: the selection when a picked row is dragged. */
  const [dragging, set_dragging] = useState<readonly Id[]>([]);
  /** Where a shift-click range runs from. */
  const [anchor, set_anchor] = useState<Id | null>(null);
  const [over, set_over] = useState<{ id: Id; ref: Id; where: "in" | "above" | "below" } | null>(null);
  /** Whether the drop would land on the panel itself, which is the workspace. */
  const [out, set_out] = useState(false);
  const [menu, set_menu] = useState<{ x: number; y: number } | null>(null);
  /** How wide the panel is, and where a drag of its edge started. */
  const [width, set_width] = useState(WIDTH.first);
  const grip = useRef<{ x: number; w: number } | null>(null);
  /** The row being renamed in place. */
  const [naming, set_naming] = useState<Id | null>(null);
  /** A block or folder being named in place, before it is made. */
  const [draft, set_draft] = useState<{ parent: Id; type?: string } | null>(null);

  /** Each section's own branches, so unfolding its header opens what it heads and nothing else,
   *  and every row as the arrows walk them. Read off the tree fully open, so a shut branch's own
   *  branches still count. */
  const sections = useMemo(() => {
    const all = tree_of(graph, [], chain);
    const out = new Map<Id, Id[]>();
    for (let i = 0; i < all.length; i++) {
      if (all[i]!.depth) continue;
      const kin: Id[] = [];
      for (let j = i + 1; j < all.length && all[j]!.depth > 0; j++) {
        if (all[j]!.kids > 0) kin.push(all[j]!.id);
      }
      out.set(all[i]!.id, kin);
    }
    /** Whether the section in focus lists definitions or packages rather than a structure. */
    const library = chain.slices[chain.at]!.list(graph, chain.held.slice(0, chain.at))
      .under !== "structure";
    return { folds: out, all, library };
  }, [graph, chain?.at, chain?.held.join("|")]);

  /** A match inside a shut branch opens the way to it, past its holders and the heads of the
   *  groups it sits in, for as long as it matches. */
  const refs = new Map(sections.all.map((r) => [r.id, r.ref]));
  const way = new Set(lit.flatMap((id) => [...holders(graph, id)]));
  const shut = folded.filter((id) => !way.has(refs.get(id) ?? id));
  /** Whether a row is shut: a lazy one until it was opened, any other once folded. */
  const is_shut = (r: Row) => (r.lazy ? !opened(folded, r.id) : shut.includes(r.id));
  /** Folding a row: a lazy one remembers that it was opened, never that it was shut. */
  const fold = (r: Row, close: boolean) =>
    (r.lazy ? onFold(`${OPENED}${r.id}`, !close) : onFold(r.id, close));

  /** Folding a section hides everything in it; unfolding it shows everything, every branch open.
   *  A usage's parts stay as they were, listed only once it is opened. */
  const fold_section = (id: Id, close: boolean) => {
    onFold(id, close);
    if (!close) for (const b of sections.folds.get(id) ?? []) if (folded.includes(b)) onFold(b, false);
  };

  /** A new pick inside a shut branch opens the way to it once; folding it again is the user's. */
  const seen = picked.join("|");
  useEffect(() => {
    const up = new Set(picked.flatMap((id) => [...holders(graph, id)]));
    for (const r of sections.all) if (r.kids && up.has(r.ref)) onFold(r.id, false);
  }, [seen]);
  const rows = tree_of(graph, [...shut, ...folded.filter((id) => id.startsWith(OPENED))], chain);
  /** The lowest open layer, under every branch alike: each open branch with no open branch
   *  inside it. The bar's fold shuts them, a layer a click, until only the top rows show; with
   *  none left, it opens every section whole. */
  const open_branch = (r: Row) => r.depth > 0 && r.kids > 0 && !is_shut(r) && !way.has(r.ref);
  const foldable = rows.filter((r, i) => {
    if (!open_branch(r)) return false;
    for (let j = i + 1; j < rows.length && rows[j]!.depth > r.depth; j++) {
      if (open_branch(rows[j]!)) return false;
    }
    return true;
  });
  const fold_all = () => (foldable.length ? foldable.forEach((r) => fold(r, true))
    : [...sections.folds.keys()].forEach((id) => fold_section(id, false)));
  /** A section's own open branches, its top rows apart. */
  const open_in = (head: Row) => rows.filter((r) => r.at === head.at && open_branch(r));
  /** A section's chevron folds its branches and never its top rows: with any open it shuts
   *  them all, else it opens every one — showing the section first where it was hidden. */
  const fold_branches = (head: Row) => {
    const open_now = open_in(head);
    if (open_now.length) { open_now.forEach((r) => fold(r, true)); return; }
    fold_section(head.id, false);
  };
  /** The section in focus, and the one block section the bar's tools answer in. */
  const focus = chain.at;
  const library = sections.library;
  /** The focus is lit strongly: the pick in a section of blocks — a part only where its usage is
   *  what the canvas has open — else what its section holds. */
  const lights = (r: Row) => {
    if (r.at !== focus || r.pick === undefined) return false;
    if (picked.length && !library) {
      return r.of === "block" && picked.includes(r.ref) && (!r.via || r.via === open);
    }
    return chain.held[chain.at] === r.pick && !r.via;
  };
  /** **The one row wearing the accent's edge: what the canvas shows.** A structure shows its open
   *  layer, listed in the structure section; the overview shows what is picked — else the package
   *  held — listed in the sections above it. */
  const structural = (at: number | undefined) => at !== undefined && chain.slices[at]!
    .list(graph, chain.held.slice(0, at)).under === "structure";
  const shown = open ?? picked[0] ?? chain.held[0] ?? null;
  const drawn_row = rows.find((r) => r.of === "block" && r.ref === shown && !r.via
    && structural(r.at) === (open !== null))?.id;
  /** What each other section holds, lit subtly. */
  const holds = (r: Row) => r.at !== undefined && r.at !== focus
    && r.pick !== undefined && chain.held[r.at] === r.pick;
  /** Only blocks answer a block question. */
  const blocks = rows.filter((r) => r.of === "block" && (focus === undefined || r.at === focus));
  /** Where something new goes: what you picked, where it can hold one, else where you are. */
  const about = about_of(graph, open ?? null, picked);
  const target = may_hold(graph, about) ? about : open ?? graph.root;
  /** What the delete would take, which is a pick and never the layer standing in for one. */
  const one = picked.length === 1 ? picked[0]! : null;
  /** The layer a drop would join. */
  const zone = landing(graph, over);
  /** The definition held in focus, which the bar's delete takes on the library. */
  const def = library && chain ? chain.held[chain.at] ?? null : null;
  /** Where a new folder goes: on the library, beside the workspace definition in focus. */
  const shelf = !library ? target
    : def && graph.blocks[def] && !frozen(graph, def) ? graph.blocks[def]!.parent : null;

  /** Which name is open, and where what was typed lands: a block or a definition. */
  const typing = useMemo(() => ({
    id: naming,
    done: (label: string | null) => {
      const row = rows.find((r) => r.id === naming);
      set_naming(null);
      if (!row || label === null) return;
      if (row.of === "block") onAct("rename", { id: row.ref, name: label });
    },
  }), [naming, onAct, rows]);

  /** What a click on a block row means. Plain is *this one, and go there*; with the toggle key it
   *  adds or drops one, and with shift it takes the run between the anchor and here. */
  const clicked = (e: React.MouseEvent, r: Row) => {
    const id = r.ref;
    if (e.shiftKey && anchor) {
      const from = blocks.findIndex((x) => x.ref === anchor);
      const to = blocks.findIndex((x) => x.ref === id);
      if (from >= 0 && to >= 0) {
        const [a, b] = from < to ? [from, to] : [to, from];
        onPick(blocks.slice(a, b + 1).map((x) => x.ref));
        return;
      }
    }
    set_anchor(id);
    if (e.ctrlKey || e.metaKey) {
      onPick(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
      return;
    }
    choose(r);
  };

  /** A row chosen as a plain click chooses it: held in its section. Browsing moves nothing. */
  const choose = (r: Row) => {
    if (r.at === undefined || r.pick === undefined) return;
    if (r.of === "block") set_anchor(r.ref);
    chain.onChoose(r.at, r.pick);
  };

  /** A row opened: chosen, and handed to the host for the canvas to draw. */
  const opening = (r: Row) => {
    if (r.at === undefined || r.pick === undefined) return;
    choose(r);
    onOpen?.({ at: r.at, id: r.pick, ...(r.via ? { via: r.via } : {}) });
  };

  /** The arrows walk the whole tree, shut branches too, from the first row lit: up and down within
   *  the section in focus. → opens what is lit and goes to the section below; ← leaves for the
   *  section above. Enter opens, F2 renames, Backspace leaves. */
  useEffect(() => {
    if (!keys) return;
    const all = sections.all;
    const depth = (i: number) => all[i]!.depth;
    /** A row's holder; -1 where there is none. */
    const up = (i: number) => {
      for (let j = i - 1; j >= 0; j--) if (depth(j) < depth(i)) return j;
      return -1;
    };
    const can = (r: Row) => r.pick !== undefined;
    const key = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement
        && e.target.closest("input, textarea, select, button, [contenteditable='true']");
      const plain = !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
      const own = [...WALK, "Enter", "F2", "Backspace"];
      if (typing || !plain || e.defaultPrevented || !own.includes(e.key)) return;
      e.preventDefault();
      /** What a section holds, as its row. */
      const held_in = (n: number) => all.findIndex((r) => r.at === n && can(r)
        && r.pick === chain.held[n] && !r.via);
      const first_in = (n: number) => all.findIndex((r) => can(r) && r.at === n);
      const lit_at = all.findIndex(lights);
      const at = lit_at >= 0 ? lit_at : held_in(chain.at);
      if (e.key === "Enter") { if (at >= 0) opening(all[at]!); return; }
      if (e.key === "F2") {
        const r = at >= 0 ? all[at]! : null;
        if (r && r.of === "block" && !frozen(graph, r.ref)) set_naming(r.id);
        return;
      }
      if (e.key === "Backspace") { onLeave?.(); return; }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        /** → opens what is lit and steps into the section below; ← steps out and leaves. */
        const n = chain.at + (e.key === "ArrowRight" ? 1 : -1);
        if (e.key === "ArrowRight" && at >= 0) opening(all[at]!);
        if (n < 0 || n >= chain.slices.length) return;
        const land = held_in(n) >= 0 ? held_in(n) : first_in(n);
        if (land >= 0) choose(all[land]!);
        if (e.key === "ArrowLeft") onLeave?.();
        return;
      }
      /** From the row lit; else from what the section in focus holds; else its first row. */
      const first = first_in(chain.at);
      if (at < 0) { if (first >= 0) choose(all[first]!); return; }
      const forward = e.key === "ArrowDown" || e.key === "ArrowRight";
      let to = at;
      do to += forward ? 1 : -1; while (to >= 0 && to < all.length && !can(all[to]!));
      if (to < 0 || to >= all.length) return;
      /** The arrows stay in the section they start in. */
      if (all[to]!.at !== all[at]!.at) return;
      // The way to the row walked to opens; nothing shuts.
      for (let j = up(to); j >= 0; j = up(j)) {
        if (folded.includes(all[j]!.id)) onFold(all[j]!.id, false);
      }
      choose(all[to]!);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  /** Where a drop on a row lands; nothing sits beside the workspace, so its drops land in it. */
  const where_on = (e: React.DragEvent, ref: Id) => (ref === graph.root ? "in" : seam(e));

  /** What a drag off this row carries: the pick, or a head's whole group, or the row. */
  const load = (id: Id): Id[] => {
    if (picked.includes(id)) return blocks.filter((r) => picked.includes(r.ref)).map((r) => r.ref);
    const group = headed_group(graph, id);
    return group ? [group, ...inside(graph, group)] : [id];
  };

  /** What is in hand at a drop, whichever surface started it. */
  const dropped = (e: React.DragEvent): Id[] => {
    const said = e.dataTransfer?.getData("text/mnd-block");
    return (dragging.length ? [...dragging] : said ? [said] : []).filter((id) => !!graph.blocks[id]);
  };

  /** On the library, the bar names a workspace definition or files a folder beside one;
   *  elsewhere a block or folder, drafted in place. */
  const add = (type?: string) => {
    if (library && !type) { add_def(); return; }
    const parent = type === "folder" ? shelf : target;
    if (!parent) return;
    // A draft row opens where it goes, its branch unfolded to show it.
    const row = rows.find((r) => r.of === "block" && r.ref === parent && r.at === focus);
    if (row && folded.includes(row.id)) onFold(row.id, false);
    set_draft({ parent, ...(type ? { type } : {}) });
  };

  /** The draft's slot in the tree, drawn in the rows' own order. */
  const slot = draft ? after(rows, draft.parent, focus) : null;
  const lines: (Row | null)[] = slot ? [...rows.slice(0, slot.index), null,
    ...rows.slice(slot.index)] : rows;

  /** A block definition of the workspace's own, named by prompt. */
  const add_def = () => {
    const label = prompt("name the block definition")?.trim();
    if (!label) return;
    if (def_named(graph, label, "block")) { alert(`${label} already exists`); return; }
    onAct("define", { name: label, domain: "block" });
  };

  /** What the bar's delete would take: a picked block, or the workspace's row in focus. */
  const gone = library ? def : one;
  const drop = gone && graph.blocks[gone] && !frozen(graph, gone) && gone !== graph.root
    ? () => onAct("delete", { ids: [gone] }) : null;

  return (
    /** Everything that is not a row is the workspace, as a drop target. */
    <NamingContext.Provider value={typing}>
    <nav className="explorer" aria-label="workspace"
         style={{ width }}>
      <div className="bar">
        {/* The bar is tools only; the workspace names itself in the tree. */}
        {(props.extra || show.filter || show.block || show.folder || show.remove) ? (
          <span className="tools">
            {show.filter ? (
              <button title="filter the workspace — not built yet" disabled>
                <Icon name="menu" />
              </button>
            ) : null}
            {props.extra}
            {show.block ? (
              <button title={library ? "add a workspace definition" : `add a block in ${shown_name(graph, target)}`}
                      onClick={() => add()}><Icon name="add_block" /></button>
            ) : null}
            {show.folder ? (
              <button title={shelf ? `add a folder in ${shown_name(graph, shelf)}`
                               : "pick a workspace definition to file a folder beside it"}
                      disabled={!shelf}
                      onClick={() => add("folder")}><Icon name="add_folder" /></button>
            ) : null}
            {show.remove ? (
              <button title={library ? "remove the definition in focus" : "delete what is picked"}
                      disabled={!drop} onClick={() => drop?.()}><Icon name="remove" /></button>
            ) : null}
          </span>
        ) : null}
        {/* A layer a click across every section, set where each section's own fold sits. */}
        {show.fold ? (
          <Fold icon={foldable.length ? "fold_branches" : "unfold_all"}
                tip={foldable.length ? "fold the lowest open layer" : "open every section"}
                onToggle={fold_all} />
        ) : null}
      </div>

        <ul className="tree">
          {lines.map((r) => (!r ? (
            <Draft key="draft" icon={draft?.type === "folder" ? "role_folder" : "role_leaf"}
                   word={draft?.type ?? "block"} depth={slot!.depth}
                   onDone={(label) => {
                     set_draft(null);
                     if (label !== null && draft) {
                       onAct("create", { name: label, parent: draft.parent, type: draft.type });
                     }
                   }} />
          ) : (
            <li key={r.id}
                className={[
                  r.depth ? "" : "top",
                  r.named ? "" : "unnamed",
                  r.of === "block" ? "" : r.of,
                  lights(r) ? "picked" : "",
                  holds(r) ? "context" : "",
                  !r.depth && r.at === focus ? "holds" : "",
                  r.via ? "part" : "",
                  lit.includes(r.ref) ? "lit" : "",
                  lit.length && !lit.includes(r.ref) ? "dim" : "",
                  r.id === drawn_row ? "open" : "",
                  /** The layer a drop would join, and where in it. */
                  r.of === "block" && zone && zone !== graph.root && on_path(graph, r.ref, zone) ? "zone" : "",
                  r.of === "block" && r.ref === zone ? "holder" : "",
                  over?.id === r.id && over.where !== "in" ? `to-${over.where}` : "",
                ].filter(Boolean).join(" ")}
                data-mark={r.mark}
                style={{ paddingLeft: 8 + r.depth * STEP }}
                draggable={naming !== r.id && r.of === "block"
                           && graph.blocks[r.ref]?.parent !== null}
                onDragStart={(e) => {
                  /** A definition carries itself to the drawing. */
                  if (graph.blocks[r.ref]?.def) {
                    e.dataTransfer?.setData("text/mnd-block", r.ref);
                    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                    return;
                  }
                  set_dragging(load(r.ref));
                  /** Dropped on the drawing, a block row becomes a reference. */
                  e.dataTransfer?.setData("text/mnd-block", r.ref);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => { set_dragging([]); set_over(null); set_out(false); }}
                onDragOver={(e) => {
                  /** Blocks answer only on blocks. */
                  if (r.of !== "block") return;
                  e.preventDefault();
                  /** The row answers, not the panel behind it. */
                  e.stopPropagation();
                  set_out(false);
                  if (!dragging.includes(r.ref)) {
                    set_over({ id: r.id, ref: r.ref, where: where_on(e, r.ref) });
                  }
                }}
                onDrop={(e) => {
                  if (r.of !== "block") return;
                  e.preventDefault();
                  e.stopPropagation();
                  const where = where_on(e, r.ref);
                  const ids = dropped(e).filter((id) => id !== r.ref);
                  set_over(null);
                  set_dragging([]);
                  if (!ids.length) return;
                  /** On a row is into it; between two rows is beside them. */
                  if (where === "in") { onAct("move", { ids, parent: r.ref }); return; }
                  const parent = graph.blocks[r.ref]?.parent ?? graph.root;
                  /** Siblings without the ones being moved, so `before` is never one of them. */
                  const kin = children(graph, parent).filter((b) => !ids.includes(b.id));
                  const next = kin[kin.findIndex((b) => b.id === r.ref) + 1];
                  const before = where === "above" ? r.ref : next?.id;
                  onAct("move", { ids, parent, ...(before ? { before } : {}) });
                }}
                /** A block is clicked as a pick; a header folds its section; any other row is
                    chosen, or only folds. */
                onClick={(e) => {
                  if (r.of === "block") { clicked(e, r); return; }
                  if (!r.depth) { fold_section(r.id, !folded.includes(r.id)); return; }
                  choose(r);
                }}
                onContextMenu={(e) => {
                  if (r.of !== "block") return;
                  e.preventDefault();
                  if (!picked.includes(r.ref)) choose(r);
                  set_menu({ x: e.clientX, y: e.clientY });
                }}
                onDoubleClick={() => { if (r.of === "block") opening(r); }}>
              {/* One line per indent column, hung under the mark of the row it belongs to. */}
              {r.guides.map((more, i) => (more || i === r.depth - 1 ? (
                <i key={i} aria-hidden className={["guide", i === r.depth - 1 ? "tick" : "",
                                                   more ? "" : "stop"].filter(Boolean).join(" ")}
                   style={{ left: GUIDE + i * STEP }} />
              ) : null))}
              {/* An open branch joins its own guide line. */}
              {r.kids && !is_shut(r) ? (
                <i aria-hidden className="guide down" style={{ left: GUIDE + r.depth * STEP }} />
              ) : null}
              <span className={["mark", r.mark,
                                r.kids ? (is_shut(r) ? "shut" : "on") : r.held ? "held" : ""]
                       .filter(Boolean).join(" ")}
                    title={r.kids ? (is_shut(r) ? `open · ${r.kids} inside` : "fold")
                      : undefined}
                    onClick={(e) => { e.stopPropagation();
                                      if (r.kids) fold(r, !is_shut(r)); }}>
                {/* A row that holds blocks lights its icon, as a card does; a fill would blot a
                    drawn mark like a pilcrow. */}
                <Icon name={r.icon ?? mark_icon(r.mark)} size={MARK_SIZE} />
              </span>
              {r.of === "pack"
                ? <span className="label">{r.label}</span>
                : <Name id={r.id} className="label" text={r.label} />}
              {r.alias ? <span className="alias">{r.alias}</span> : null}
              {r.via ? (
                <span className="from"
                      title={`from ${shown_name(graph, graph.blocks[r.via]?.type ?? r.via)}`}>
                  <Icon name="role_reference" size={MARK_SIZE - 2} />
                </span>
              ) : null}
              {r.depth ? null : (
                <Fold icon={open_in(r).length ? "fold_all" : "unfold_all"}
                      tip={open_in(r).length ? "fold this section's branches"
                        : "open this section's branches"}
                      onToggle={() => fold_branches(r)} />
              )}
            </li>
          )))}
          <li className={`floor${out ? " out" : ""}`}
              onClick={() => onPick([])}
              onContextMenu={(e) => { e.preventDefault(); onPick([]);
                                      set_menu({ x: e.clientX, y: e.clientY }); }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                set_over(null);
                set_out(true);
              }}
              onDragLeave={() => set_out(false)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const ids = dropped(e);
                set_out(false);
                set_dragging([]);
                if (ids.length) onAct("move", { ids, parent: open ?? graph.root });
              }} />
        </ul>

      {/* Drag the edge to resize the panel. */}
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

/** What a block sits under, itself apart: its holders, and the head of each group it is in. */
function holders(graph: Graph, id: Id): Set<Id> {
  const out = new Set<Id>();
  for (let at = graph.blocks[id]?.parent; at && !out.has(at); at = graph.blocks[at]?.parent) out.add(at);
  return out;
}

/** Whether an ancestor of this block is that one. */
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
