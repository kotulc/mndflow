/** The workspace explorer: structure, and only structure. */

import { useMemo, useRef, useState } from "react";
import { alias_of, children, is_interface, is_named, is_reference,
         module_named, module_of, pinned_defs, shipped, shown_name, vocabulary,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon, Name, NamingContext, type IconName } from "@mnd/theme";
import { Menu } from "./Menu";

export type ExplorerProps = {
  graph: Graph;
  /** The layer the stage is pointed at. */
  open: Id | null;
  /** What an action would act on. Takes the accent, and reads first. */
  picked: readonly Id[];
  /** Which branches are shut. Session state, handed down. */
  folded: readonly Id[];
  /** What a narrowing matched, lit and never hidden. */
  lit?: readonly Id[];
  /** Told `reveal` on a click and `rename` on a double click, plus whatever the offered list names. */
  onAct: Act;
  onFold: (id: Id, shut: boolean) => void;
  onPick: (ids: Id[]) => void;
  /** Whether right-click opens this engine's offered list. */
  menu?: boolean;
  /** Which definition the vocabulary section has hold of. */
  pickedDef?: Id | null;
  onPickDef?: (id: Id | null) => void;
};

type Row = { id: Id; depth: number; label: string; kids: number; mark: Mark;
             /** What a row is: a block, a definition, or a folder of definitions. */
             of: "block" | "def" | "pack";
             /** Whether the label is a chosen name or the type word. */
             named: boolean;
             /** The handle an unnamed row wears. */
             alias: string;
             /** Per indent column, whether its guide line carries on past this row. */
             guides: boolean[] };
type Mark = "leaf" | "container" | "folder" | "resource" | "interface" | "reference" | "note" | "group" | "grid" | "pin"
  | "locked" | "vocabulary" | "workspace";

/** What the tree draws under a block. */
function under(graph: Graph, parent: Id | null) {
  return children(graph, parent).filter((b) => {
    if (is_interface(b) || is_reference(b)) return false;
    const module = module_of(graph, b.id);
    return module !== "group" && module !== "grid" && module !== "note";
  });
}

/** The folder's own ids, which are not anything's. */
const VOCAB = "@defs";
const sect_id = (name: string) => `${VOCAB}:${name}`;


/** Which mark a definition's base kind wears. */
const KIND_MARK: Record<string, Mark> = {
  block: "leaf", folder: "folder", resource: "resource", reference: "reference",
  interface: "interface", group: "group", grid: "grid", note: "note",
};

/** The definition folders: defaults, pinned, and packages. */
function vocab_of(graph: Graph, folded: readonly Id[]): Row[] {
  const groups = vocabulary(graph);
  if (!groups.length) return [];
  const listed = groups.flatMap((g) => g.defs);
  const base = listed.filter((d) => d.default !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));
  /** The pinned folder lists what the workspace pinned, in pin order. */
  const own = pinned_defs(graph, "block")
    .filter((d) => !shipped(d) && !d.from && d.default === undefined);
  const packs = groups.map((g) => ({ ...g, defs: g.defs.filter((d) => !shipped(d)) }))
    .filter((g) => g.from !== null && g.defs.length);

  /** Each folder wears its mark. */
  const sections: { id: Id; label: string; mark: Mark; defs: typeof base; packs: typeof packs }[] = [
    { id: sect_id("default"), label: "default", mark: "locked", defs: base, packs: [] },
    { id: sect_id("pinned"), label: "pinned", mark: "pin", defs: own, packs: [] },
    ...(packs.length
      ? [{ id: sect_id("packages"), label: "packages", mark: "folder" as Mark, defs: [], packs }] : []),
  ];

  const out: Row[] = [{ id: VOCAB, depth: 0, label: "definitions", kids: sections.length,
                        mark: "vocabulary", named: true, alias: "", of: "pack", guides: [] }];
  if (folded.includes(VOCAB)) return out;

  /** One definition, wherever it sits. */
  const def_row = (d: Definition, depth: number, guides: boolean[]): Row => ({
    id: d.id, depth, label: d.default ?? d.name, kids: 0,
    mark: KIND_MARK[module_named(graph, d.id)] ?? "leaf",
    named: true, alias: "", of: "def", guides,
  });

  sections.forEach((sec, n) => {
    const more = n < sections.length - 1;
    const kids = sec.packs.length || sec.defs.length;
    out.push({ id: sec.id, depth: 1, label: sec.label, kids,
               mark: sec.mark, named: true, alias: "", of: "pack", guides: [more] });
    if (folded.includes(sec.id)) return;
    sec.defs.forEach((d, i) => out.push(def_row(d, 2, [more, i < sec.defs.length - 1])));
    sec.packs.forEach((g, i) => {
      const id = sect_id(`pack:${g.from}`);
      const after = i < sec.packs.length - 1;
      out.push({ id, depth: 2, label: g.from!, kids: g.defs.length,
                 mark: "folder", named: true, alias: "", of: "pack",
                 guides: [more, after] });
      if (folded.includes(id)) return;
      g.defs.forEach((d, j) =>
        out.push(def_row(d, 3, [more, after, j < g.defs.length - 1])));
    });
  });
  return out;
}

/** The tree is blocks, under the definitions that type them. */
function tree_of(graph: Graph, folded: readonly Id[], vocab = false): Row[] {
  const out: Row[] = vocab ? vocab_of(graph, folded) : [];
  /** A row's columns are its holder's, plus one for itself. */
  const walk = (parent: Id | null, depth: number, held: boolean[]) => {
    const kin = under(graph, parent);
    kin.forEach((b, n) => {
      const kids = under(graph, b.id);
      const guides = [...held, n < kin.length - 1];
      out.push({ id: b.id, depth, label: shown_name(graph, b.id), kids: kids.length,
                 named: is_named(graph, b.id), alias: alias_of(graph, b.id), of: "block",
                 mark: module_of(graph, b.id) === "folder" ? "folder"
                     : module_of(graph, b.id) === "resource" ? "resource"
                     : kids.length ? "container" : "leaf",
                 guides });
      if (!folded.includes(b.id)) walk(b.id, depth + 1, guides);
    });
  };
  /** The workspace is the one root; every top-level block is a branch under it. */
  const top = under(graph, graph.root);
  out.push({ id: graph.root, depth: 0, label: shown_name(graph, graph.root), kids: top.length,
             named: is_named(graph, graph.root), alias: "", of: "block", mark: "workspace",
             guides: [] });
  if (!folded.includes(graph.root)) walk(graph.root, 1, []);
  return out;
}

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

/** The layer a drop would join: the row itself when it lands *in* it, its holder when it lands
 *  beside it. */
function landing(graph: Graph, over: { id: Id; where: "in" | "above" | "below" } | null) {
  if (!over) return null;
  return over.where === "in" ? over.id : graph.blocks[over.id]?.parent ?? graph.root;
}

/** What a row reads as, as a mark. */
const MARK: Record<Mark, { icon: IconName; solid?: boolean }> = {
  leaf: { icon: "role_leaf" },
  container: { icon: "role_container", solid: true },
  folder: { icon: "role_folder" },
  resource: { icon: "role_resource" },
  interface: { icon: "role_interface" },
  reference: { icon: "role_reference" },
  note: { icon: "role_note" },
  group: { icon: "role_group" },
  grid: { icon: "role_table" },
  pin: { icon: "pin" },
  locked: { icon: "locked" },
  vocabulary: { icon: "vocabulary" },
  workspace: { icon: "files" },
};

export function Explorer(props: ExplorerProps) {
  const { graph, open, picked, folded, lit = [], onAct, onFold, onPick,
          menu: offered = true, pickedDef = null, onPickDef } = props;
  /** What is in hand: the selection when a picked row is dragged. */
  const [dragging, set_dragging] = useState<readonly Id[]>([]);
  /** Where a shift-click range runs from. */
  const [anchor, set_anchor] = useState<Id | null>(null);
  const [over, set_over] = useState<{ id: Id; where: "in" | "above" | "below" } | null>(null);
  /** Whether the drop would land on the panel itself, which is the workspace. */
  const [out, set_out] = useState(false);
  const [menu, set_menu] = useState<{ x: number; y: number } | null>(null);
  /** How wide the panel is, and where a drag of its edge started. */
  const [width, set_width] = useState(WIDTH.first);
  const grip = useRef<{ x: number; w: number } | null>(null);
  /** The row being renamed in place. */
  const [naming, set_naming] = useState<Id | null>(null);

  /** A match inside a shut branch opens the way to it. */
  const shut = lit.length
    ? folded.filter((id) => !lit.some((m) => on_path(graph, m, id)))
    : folded;
  const rows = tree_of(graph, shut, !!onPickDef);
  /** Only blocks answer a block question. */
  const blocks = rows.filter((r) => r.of === "block");
  const one = picked.length === 1 ? picked[0]! : null;
  /** Where something new goes: what you picked, or where you are. */
  const holder = one && graph.blocks[one]
    && !["group", "grid", "note"].includes(module_of(graph, one)) ? one : null;
  const target = holder ?? open ?? graph.root;
  const any_open = rows.some((r) => r.kids > 0 && !folded.includes(r.id));
  /** The layer a drop would join, and every row already in it. */
  const zone = landing(graph, over);

  /** Which name is open, and where what was typed lands. */
  const typing = useMemo(() => ({
    id: naming,
    done: (label: string | null) => {
      const id = naming;
      set_naming(null);
      if (id && label !== null) onAct("rename", { id, name: label });
    },
  }), [naming, onAct]);

  /** What a click on a row means. Plain is *this one, and go there*; with the toggle key it adds or
   *  drops one, and with shift it takes the run between the anchor and here. */
  const clicked = (e: React.MouseEvent, id: Id) => {
    if (e.shiftKey && anchor) {
      const from = blocks.findIndex((x) => x.id === anchor);
      const to = blocks.findIndex((x) => x.id === id);
      if (from >= 0 && to >= 0) {
        const [a, b] = from < to ? [from, to] : [to, from];
        onPick(blocks.slice(a, b + 1).map((x) => x.id));
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

  /** Where a drop on a row lands; nothing sits beside the workspace, so its drops land in it. */
  const where_on = (e: React.DragEvent, id: Id) => (id === graph.root ? "in" : seam(e));

  /** What a drag off this row carries. */
  const load = (id: Id): Id[] =>
    picked.includes(id) ? blocks.filter((r) => picked.includes(r.id)).map((r) => r.id) : [id];

  /** What is in hand at a drop, whichever surface started it. */
  const dropped = (e: React.DragEvent): Id[] => {
    const said = e.dataTransfer?.getData("text/mnd-block");
    return (dragging.length ? [...dragging] : said ? [said] : []).filter((id) => !!graph.blocks[id]);
  };

  const add = (type?: string) => {
    const label = prompt(type === "folder" ? "name the folder" : "name the block");
    if (label === null) return;
    onAct("create", { name: label, parent: target, type });
  };

  return (
    /** Everything that is not a row is the workspace, as a drop target. */
    <NamingContext.Provider value={typing}>
    <nav className="explorer" aria-label="workspace"
         style={{ width }}>
      <div className="bar">
        {/* The workspace, as a stack of files. */}
        <span className="chip" title="the workspace"
              onClick={() => { onAct("open", { id: graph.root }); onPick([]); }}>
          <Icon name="files" />
        </span>
        <span className="tools">
          <button title={`add a block in ${shown_name(graph, target)}`}
                  onClick={() => add()}><Icon name="add" /></button>
          <button title={`add a folder in ${shown_name(graph, target)}`}
                  onClick={() => add("folder")}><Icon name="add_folder" /></button>
          <button title={any_open ? "fold everything" : "open everything"}
                  onClick={() => {
                    for (const r of tree_of(graph, [], !!onPickDef)) {
                      if (r.kids > 0) onFold(r.id, any_open);
                    }
                  }}><Icon name={any_open ? "fold_all" : "unfold_all"} /></button>
          <button title="delete what is picked" disabled={!one || one === graph.root}
                  onClick={() => one && onAct("delete", { id: one })}><Icon name="remove" /></button>
        </span>
      </div>

        <ul className="tree">
          {rows.map((r, n) => (
            <li key={r.id}
                className={[
                  r.depth ? "" : "top",
                  r.named ? "" : "unnamed",
                  r.of === "block" ? "" : r.of,
                  /** A rule between the definitions and the tree. */
                  r.of === "block" && rows[n - 1] && rows[n - 1]!.of !== "block" ? "sep" : "",
                  r.of === "def" && pickedDef === r.id ? "picked" : "",
                  r.of === "block" && picked.includes(r.id) ? "picked" : "",
                  lit.includes(r.id) ? "lit" : "",
                  lit.length && !lit.includes(r.id) ? "dim" : "",
                  open === r.id ? "open" : "",
                  /** The layer a drop would join, and where in it. */
                  zone && zone !== graph.root && on_path(graph, r.id, zone) ? "zone" : "",
                  r.id === zone ? "holder" : "",
                  over?.id === r.id && over.where !== "in" ? `to-${over.where}` : "",
                ].filter(Boolean).join(" ")}
                data-mark={r.mark}
                style={{ paddingLeft: 8 + r.depth * STEP }}
                draggable={r.of === "def"
                           || (r.of === "block" && r.id !== graph.root && naming !== r.id)}
                onDragStart={(e) => {
                  /** One payload for both sorts of row; the receiver asks which. */
                  if (r.of === "def") {
                    e.dataTransfer?.setData("text/mnd-block", r.id);
                    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                    return;
                  }
                  set_dragging(load(r.id));
                  /** Dropped on the drawing, a block row becomes a reference. */
                  e.dataTransfer?.setData("text/mnd-block", r.id);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => { set_dragging([]); set_over(null); set_out(false); }}
                onDragOver={(e) => {
                  if (r.of !== "block") return;
                  e.preventDefault();
                  /** The row answers, not the panel behind it. */
                  e.stopPropagation();
                  set_out(false);
                  if (!dragging.includes(r.id)) set_over({ id: r.id, where: where_on(e, r.id) });
                }}
                onDrop={(e) => {
                  if (r.of !== "block") return;
                  e.preventDefault();
                  e.stopPropagation();
                  const where = where_on(e, r.id);
                  const ids = dropped(e).filter((id) => id !== r.id);
                  set_over(null);
                  set_dragging([]);
                  if (!ids.length) return;
                  /** On a row is into it; between two rows is beside them. */
                  if (where === "in") { onAct("move", { ids, parent: r.id }); return; }
                  const parent = graph.blocks[r.id]?.parent ?? graph.root;
                  /** Siblings without the ones being moved, so `before` is never one of them. */
                  const kin = children(graph, parent).filter((b) => !ids.includes(b.id));
                  const next = kin[kin.findIndex((b) => b.id === r.id) + 1];
                  const before = where === "above" ? r.id : next?.id;
                  onAct("move", { ids, parent, ...(before ? { before } : {}) });
                }}
                /** A pack folds, a definition is described, a block is picked. */
                onClick={(e) => {
                  if (r.of === "pack") { onFold(r.id, !shut.includes(r.id)); return; }
                  if (r.of === "def") { onPickDef?.(pickedDef === r.id ? null : r.id); return; }
                  clicked(e, r.id);
                }}
                onContextMenu={(e) => {
                  if (r.of !== "block") return;
                  e.preventDefault();
                  if (!picked.includes(r.id)) { onAct("reveal", { id: r.id }); onPick([r.id]); }
                  set_menu({ x: e.clientX, y: e.clientY });
                }}
                onDoubleClick={() => { if (r.of === "block") set_naming(r.id); }}>
              {/* One line per indent column, hung under the mark of the row it belongs to. */}
              {r.guides.map((more, i) => (more || i === r.depth - 1 ? (
                <i key={i} aria-hidden className={["guide", i === r.depth - 1 ? "tick" : "",
                                                   more ? "" : "stop"].filter(Boolean).join(" ")}
                   style={{ left: GUIDE + i * STEP }} />
              ) : null))}
              {/* An open branch joins its own guide line. */}
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
              {r.of === "block"
                ? <Name id={r.id} className="label" text={r.label} />
                : <span className="label">{r.label}</span>}
              {r.alias ? <span className="alias">{r.alias}</span> : null}
            </li>
          ))}
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
                if (ids.length) onAct("move", { ids, parent: graph.root });
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

export { tree_of };
