/** The workspace explorer: structure, and only structure. */

import { useMemo, useRef, useState } from "react";
import { alias_of, children, def_named, is_interface, is_named, is_reference, module_named, module_of,
         packages, pinned_defs, relation_named, shelf_of, shelf_tree, shelvable, shipped, shown_name,
         type Act, type Definition, type Graph, type Id, type ShelfNode } from "@mnd/core";
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
  /** What the library sections have hold of; absent, the sections are not drawn. */
  section?: Section | null;
  onSection?: (at: Section) => void;
};

/** Which of the library's folders a section is. */
export type Only = "all" | "pinned" | "default" | "workspace" | "packages";

/** What a library row points the tray at: a narrowing of the definitions, or one of them. */
export type Section =
  | { of: "defs"; only: Only; group?: Group; from?: string; folder?: Id }
  | { of: "def"; id: Id };

type Group = "block" | "relation";

/** Whether two sections name the same thing. */
function same(a: Section | null | undefined, b: Section | undefined): boolean {
  return !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
}

type Row = { id: Id; depth: number; label: string; kids: number; mark: Mark;
             /** What a row is: a block, a definition, a library section, or a folder made for them. */
             of: "block" | "def" | "pack" | "shelf";
             /** The block, definition or folder the row stands for; its id keeps rows apart. */
             ref: Id;
             /** What a library row points the tray at. */
             at?: Section;
             /** On the workspace's shelf: its group, and the folder it sits in. */
             filed?: { group: Group; in?: Id };
             /** Whether the label is a chosen name or the type word. */
             named: boolean;
             /** The handle an unnamed row wears. */
             alias: string;
             /** Per indent column, whether its guide line carries on past this row. */
             guides: boolean[] };
type Mark = "leaf" | "container" | "folder" | "resource" | "interface" | "reference" | "note" | "group" | "grid" | "pin"
  | "locked" | "vocabulary" | "workspace" | "package" | "line" | "tie";

/** A library row before it is laid out: what it says, and what sits under it. */
type Node = Omit<Row, "depth" | "kids" | "guides" | "named" | "alias"> & { under: Node[] };

/** What the tree draws under a block. */
function under(graph: Graph, parent: Id | null) {
  return children(graph, parent).filter((b) => {
    if (is_interface(b) || is_reference(b)) return false;
    const module = module_of(graph, b.id);
    return module !== "group" && module !== "grid" && module !== "note";
  });
}

/** The sections' own ids, which are not anything's. */
const PACKS = "@packs";
const VOCAB = "@defs";

/** Which mark a definition's base kind wears. */
const KIND_MARK: Record<string, Mark> = {
  block: "leaf", folder: "folder", resource: "resource", reference: "reference",
  interface: "interface", group: "group", grid: "grid", note: "note", line: "line", tie: "tie",
};

const GROUPS: readonly { group: Group; label: string }[] = [
  { group: "block", label: "blocks" }, { group: "relation", label: "relations" },
];

/** A definition as a row, wearing its kind's mark. */
function def_node(graph: Graph, d: Definition, within: Id, filed?: Row["filed"]): Node {
  const kind = d.group === "relation" ? relation_named(graph, d.id) : module_named(graph, d.id);
  return { id: `${within}:${d.id}`, ref: d.id, label: d.default ?? d.name,
           mark: KIND_MARK[kind] ?? "leaf", of: "def", at: { of: "def", id: d.id },
           ...(filed ? { filed } : {}), under: [] };
}

/** A section row: its word, its mark, where it points, and what it holds. */
function section(id: Id, label: string, mark: Mark, at: Section, under: Node[]): Node {
  return { id, ref: id, label, mark, of: "pack", at, under };
}

/** One package, its blocks and its relations apart. Frozen, so nothing in it is filed. */
function pack_node(graph: Graph, from: string, defs: Definition[]): Node {
  const id = `${PACKS}:${from}`;
  const at = { of: "defs", only: "packages", from } as const;
  return section(id, from, "folder", at, GROUPS
    .map((g) => section(`${id}:${g.group}`, g.label, "folder", { ...at, group: g.group },
                        defs.filter((d) => d.group === g.group).map((d) => def_node(graph, d, `${id}:${g.group}`))))
    .filter((n) => n.under.length));
}

/** The workspace's shelf for one group: its folders and definitions, as filed. */
function shelf_nodes(graph: Graph, group: Group, nodes: ShelfNode[], within: Id, into?: Id): Node[] {
  return nodes.map((n) => (n.folder
    ? { id: n.id, ref: n.id, label: n.name, mark: "folder" as const, of: "shelf" as const,
        at: { of: "defs", only: "workspace", group, folder: n.id } as const,
        filed: { group, ...(into ? { in: into } : {}) },
        under: shelf_nodes(graph, group, n.kids, within, n.id) }
    : def_node(graph, graph.defs[n.id]!, within, { group, ...(into ? { in: into } : {}) })));
}

/** The library: the packages, then the definitions — pinned, default and the workspace's own. */
function library_of(graph: Graph): Node[] {
  const packs = packages(graph);
  const pinned = pinned_defs(graph, "block").filter((d) => !shipped(d) && !d.from && d.default === undefined);
  const defaults = Object.values(graph.defs).filter((d) => d.default !== undefined)
    .sort((a, z) => a.group.localeCompare(z.group) || a.name.localeCompare(z.name));
  const ws = `${VOCAB}:workspace`;
  return [
    section(PACKS, "packages", "package", { of: "defs", only: "packages" },
            packs.map((p) => pack_node(graph, p.from, p.defs))),
    section(VOCAB, "definitions", "vocabulary", { of: "defs", only: "all" }, [
      section(`${VOCAB}:pinned`, "pinned", "pin", { of: "defs", only: "pinned" },
              pinned.map((d) => def_node(graph, d, `${VOCAB}:pinned`))),
      section(`${VOCAB}:default`, "default", "locked", { of: "defs", only: "default" },
              defaults.map((d) => def_node(graph, d, `${VOCAB}:default`))),
      section(ws, "workspace", "workspace", { of: "defs", only: "workspace" }, GROUPS.map((g) =>
        ({ ...section(`${ws}:${g.group}`, g.label, "folder",
                      { of: "defs", only: "workspace", group: g.group },
                      shelf_nodes(graph, g.group, shelf_tree(graph, g.group), `${ws}:${g.group}`)),
           filed: { group: g.group } }))),
    ]),
  ];
}

/** Library rows laid out: depth, guide columns and what folding hides. */
function lay(nodes: Node[], folded: readonly Id[], depth = 0, held: boolean[] = [],
             out: Row[] = []): Row[] {
  nodes.forEach((n, i) => {
    const { under: kids, ...row } = n;
    const guides = depth ? [...held, i < nodes.length - 1] : [];
    out.push({ ...row, depth, kids: kids.length, named: true, alias: "", guides });
    if (!folded.includes(n.id)) lay(kids, folded, depth + 1, guides, out);
  });
  return out;
}

/** The panel: the library sections — packages, then definitions — above the workspace's blocks. */
function tree_of(graph: Graph, folded: readonly Id[], library = false): Row[] {
  const out: Row[] = library ? lay(library_of(graph), folded) : [];
  /** A row's columns are its holder's, plus one for itself. */
  const walk = (parent: Id | null, depth: number, held: boolean[]) => {
    const kin = under(graph, parent);
    kin.forEach((b, n) => {
      const kids = under(graph, b.id);
      const guides = [...held, n < kin.length - 1];
      out.push({ id: b.id, ref: b.id, depth, label: shown_name(graph, b.id), kids: kids.length,
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
  out.push({ id: graph.root, ref: graph.root, depth: 0, label: shown_name(graph, graph.root), kids: top.length,
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
  workspace: { icon: "workspace" },
  package: { icon: "packages" },
  line: { icon: "relation_plain" },
  tie: { icon: "relation_tie" },
};

export function Explorer(props: ExplorerProps) {
  const { graph, open, picked, folded, lit = [], onAct, onFold, onPick,
          menu: offered = true, section = null, onSection } = props;
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
  /** What is in hand off the workspace's shelf: definitions or folders to file. */
  const [shelving, set_shelving] = useState<readonly Id[]>([]);

  /** A match inside a shut branch opens the way to it. */
  const shut = lit.length
    ? folded.filter((id) => !lit.some((m) => on_path(graph, m, id)))
    : folded;
  const rows = tree_of(graph, shut, !!onSection);
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

  /** Which name is open, and where what was typed lands: a block, a definition or a folder. */
  const typing = useMemo(() => ({
    id: naming,
    done: (label: string | null) => {
      const row = rows.find((r) => r.id === naming);
      set_naming(null);
      if (!row || label === null) return;
      if (row.of === "block") onAct("rename", { id: row.ref, name: label });
      else if (row.of === "def") onAct("rename_def", { id: row.ref, name: label });
      else if (row.of === "shelf") onAct("rename_shelf", { id: row.ref, name: label });
    },
  }), [naming, onAct, rows]);

  /** Where the library is pointed on the shelf: which group, which folder, and what is picked. */
  const at = section?.of === "def" ? graph.defs[section.id] : undefined;
  const filing: { group: Group; into?: Id; def?: Id; folder?: Id } | null =
    section?.of === "defs" && section.only === "workspace" && section.group
      ? { group: section.group, ...(section.folder ? { into: section.folder, folder: section.folder } : {}) }
    : at && shelvable(at)
      ? { group: at.group, def: at.id,
          ...(shelf_of(graph).find((x) => x.id === at.id)?.in ? { into: shelf_of(graph).find((x) => x.id === at.id)!.in! } : {}) }
    : null;
  /** A library section is in hand, so the bar's tools are about definitions. */
  const library = !!section;

  /** Where a drop on a shelf row files what is in hand, or null where it cannot. */
  const filed_at = (r: Row, where: "in" | "above" | "below") => {
    const group = shelf_of(graph).find((x) => x.id === shelving[0])?.group;
    if (!r.filed || r.filed.group !== group || shelving.includes(r.ref)) return null;
    /** A group's top row and a folder take a drop into them; anything else files beside it. */
    if (r.of === "pack") return { into: undefined, before: undefined };
    if (r.of === "shelf" && where === "in") return { into: r.ref, before: undefined };
    const i = rows.indexOf(r);
    const next = rows.slice(i + 1).find((x) => x.depth <= r.depth);
    const before = where === "above" ? r.ref
      : next && next.depth === r.depth && next.filed?.in === r.filed.in ? next.ref : undefined;
    return { into: r.filed.in, before };
  };

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
    if (library) { add_def(type === "folder"); return; }
    const label = prompt(type === "folder" ? "name the folder" : "name the block");
    if (label === null) return;
    onAct("create", { name: label, parent: target, type });
  };

  /** On the shelf, the bar adds a definition or a folder where the library is pointed. */
  const add_def = (folder: boolean) => {
    if (!filing) return;
    const word = filing.group === "relation" ? "relation" : "block";
    const label = prompt(folder ? "name the folder" : `name the ${word} definition`)?.trim();
    if (!label) return;
    const into = filing.into ? { into: filing.into } : {};
    if (folder) { onAct("add_shelf", { name: label, group: filing.group, ...into }); return; }
    if (def_named(graph, label, filing.group)) { alert(`${label} already exists`); return; }
    onAct("define", { name: label, group: filing.group, ...into });
  };

  /** What the bar's delete would take: a picked block, or a definition or folder on the shelf. */
  const drop = library
    ? filing?.def ? () => onAct("remove_def", { id: filing.def! })
      : filing?.folder ? () => onAct("drop_shelf", { id: filing.folder! }) : null
    : one && one !== graph.root ? () => onAct("delete", { id: one }) : null;
  const where_to = filing?.folder ? "this folder" : `${filing?.group ?? "block"} definitions`;

  return (
    /** Everything that is not a row is the workspace, as a drop target. */
    <NamingContext.Provider value={typing}>
    <nav className="explorer" aria-label="workspace"
         style={{ width }}>
      <div className="bar">
        {/* The bar is tools only; the workspace names itself in the tree. */}
        <span className="tools">
          <button title={library ? `add a definition to ${where_to}` : `add a block in ${shown_name(graph, target)}`}
                  disabled={library && !filing}
                  onClick={() => add()}><Icon name="add" /></button>
          <button title={library ? `add a folder to ${where_to}` : `add a folder in ${shown_name(graph, target)}`}
                  disabled={library && !filing}
                  onClick={() => add("folder")}><Icon name="add_folder" /></button>
          <button title={any_open ? "fold everything" : "open everything"}
                  onClick={() => {
                    for (const r of tree_of(graph, [], !!onSection)) {
                      if (r.kids > 0) onFold(r.id, any_open);
                    }
                  }}><Icon name={any_open ? "fold_all" : "unfold_all"} /></button>
          <button title={library ? "remove the picked definition or folder" : "delete what is picked"}
                  disabled={!drop} onClick={() => drop?.()}><Icon name="remove" /></button>
        </span>
      </div>

        <ul className="tree">
          {rows.map((r) => (
            <li key={r.id}
                className={[
                  r.depth ? "" : "top",
                  r.named ? "" : "unnamed",
                  r.of === "block" ? "" : r.of,
                  r.of !== "block" && same(section, r.at) ? "picked" : "",
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
                draggable={naming !== r.id && (r.of === "def" || (r.of === "shelf")
                           || (r.of === "block" && r.id !== graph.root))}
                onDragStart={(e) => {
                  /** A shelf row files; a definition also carries itself to the drawing. */
                  if (r.of === "def" || r.of === "shelf") {
                    if (r.filed) set_shelving([r.ref]);
                    if (r.of === "def") e.dataTransfer?.setData("text/mnd-block", r.ref);
                    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                    return;
                  }
                  set_dragging(load(r.id));
                  /** Dropped on the drawing, a block row becomes a reference. */
                  e.dataTransfer?.setData("text/mnd-block", r.id);
                  if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => { set_dragging([]); set_shelving([]); set_over(null); set_out(false); }}
                onDragOver={(e) => {
                  /** Filing answers only on the shelf, and blocks only on blocks. */
                  if (shelving.length) {
                    const where = r.of === "shelf" ? seam(e) : r.of === "pack" ? "in" : seam(e) === "above" ? "above" : "below";
                    if (!filed_at(r, where)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    set_over({ id: r.id, where });
                    return;
                  }
                  if (r.of !== "block") return;
                  e.preventDefault();
                  /** The row answers, not the panel behind it. */
                  e.stopPropagation();
                  set_out(false);
                  if (!dragging.includes(r.id)) set_over({ id: r.id, where: where_on(e, r.id) });
                }}
                onDrop={(e) => {
                  if (shelving.length) {
                    const where = over?.id === r.id ? over.where : "in";
                    const to = filed_at(r, where);
                    e.preventDefault();
                    e.stopPropagation();
                    set_over(null);
                    set_shelving([]);
                    if (to) onAct("shelve", { ids: [...shelving], ...(to.into ? { into: to.into } : {}),
                                              ...(to.before ? { before: to.before } : {}) });
                    return;
                  }
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
                /** A library row points the tray, a block is picked; marks fold either. */
                onClick={(e) => {
                  if (r.at) { onSection?.(r.at); return; }
                  clicked(e, r.id);
                }}
                onContextMenu={(e) => {
                  if (r.of !== "block") return;
                  e.preventDefault();
                  if (!picked.includes(r.id)) { onAct("reveal", { id: r.id }); onPick([r.id]); }
                  set_menu({ x: e.clientX, y: e.clientY });
                }}
                onDoubleClick={() => {
                  /** A block, the workspace's own definition, or a folder made for them. */
                  if (r.of === "block" || r.of === "shelf" || (r.of === "def" && shelvable(graph.defs[r.ref]))) {
                    set_naming(r.id);
                  }
                }}>
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
              {r.of === "pack"
                ? <span className="label">{r.label}</span>
                : <Name id={r.id} className="label" text={r.label} />}
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
