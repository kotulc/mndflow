/** The workspace explorer: structure, and only structure. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { about_of, alias_of, children, config_of, def_named, def_of, is_group, is_interface,
         is_named, may_hold, block_base, base_of,
         packages, pinned_defs, relation_base, shape_of, shelf_of, shelvable, shipped, shown_name,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon, Name, NamingContext, known, type IconName } from "@mnd/theme";
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
  /** Which bar tools to show, each on its own. Defaults preserve mndflow; set false to hide. */
  tools?: {
    filter?: boolean;
    block?: boolean;
    folder?: boolean;
    remove?: boolean;
    fold?: boolean;
  };
  /** A host's own tools, drawn after the filter and ahead of the bar's own. */
  extra?: ReactNode;
  /** What the library sections have hold of; absent, the sections are not drawn. */
  section?: Section | null;
  onSection?: (at: Section) => void;
  /** Whether the arrows walk the tree: up and down a row's siblings — up past the first to its
   *  holder, down past the last out to the next branch, or into its own where there is none; right
   *  on to the next row in reading order; left out to the row's holder, or to the section before
   *  at the top. The way to the row walked to opens, and each branch left shuts — unless the bar
   *  holds the folds, when what is open stays open. A row walked to is chosen as a plain click
   *  chooses it. */
  keys?: boolean;
};

/** Which of the library's folders a section is. */
export type Only = "all" | "pinned" | "workspace" | "packages";

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
             /** The icon its definition names with `card.icon`, worn over its mark's. */
             icon?: IconName;
             /** What a row is: a block, a definition, or a library section. */
             of: "block" | "def" | "pack";
             /** The block or definition the row stands for; its id keeps rows apart. */
             ref: Id;
             /** What a library row points the tray at. */
             at?: Section;
             /** On the workspace's shelf: its group, and the shelf group it sits in. */
             filed?: { group: Group; in?: Id };
             /** Whether the label is a chosen name or the type word. */
             named: boolean;
             /** The handle an unnamed row wears. */
             alias: string;
             /** Per indent column, whether its guide line carries on past this row. */
             guides: boolean[] };
type Mark = "leaf" | "folder" | "interface" | "reference" | "note" | "group" | "grid" | "pin"
  | "locked" | "vocabulary" | "usages" | "root" | "package" | "line" | "tie";

/** A library row before it is laid out: what it says, and what sits under it. */
type Node = Omit<Row, "depth" | "kids" | "guides" | "named" | "alias"> & { under: Node[] };

/** A branch in a section, and whether it holds branches of its own. */
type Branch = { id: Id; inner: boolean };

/** What the tree draws under a block: every block it holds, in order. A seat on its wall is part
 *  of the block, not something it holds, and a group that is no layer only boxes its members on
 *  the layer they share, so it is no row: its members read in their own order. */
function under(graph: Graph, parent: Id | null) {
  return children(graph, parent).filter((b) => !is_interface(b)
    && !(is_group(graph, b.id) && !children(graph, b.id).length));
}

/** The kinds a row wears its base's mark for; any other block is a leaf. */
const MARKED: readonly string[] = ["folder", "reference", "note"];

/** The sections' own ids, which are not anything's. */
const PACKS = "@packs";
const VOCAB = "@defs";
const USES = "@uses";

/** The keys that walk the tree. */
const WALK = ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"];

/** Which mark a definition's base kind wears. */
const KIND_MARK: Record<string, Mark> = {
  block: "leaf", folder: "folder", reference: "reference", interface: "interface",
  group: "group", grid: "grid", note: "note", line: "line", tie: "tie",
};

const GROUPS: readonly { group: Group; label: string }[] = [
  { group: "block", label: "blocks" }, { group: "relation", label: "relations" },
];

/** A definition as a row, wearing its kind's mark. */
function def_node(graph: Graph, d: Definition, within: Id, filed?: Row["filed"]): Node {
  const kind = d.group === "relation" ? relation_base(graph, d.id) : block_base(graph, d.id);
  const icon = card_icon(graph, d.id);
  return { id: `${within}:${d.id}`, ref: d.id, label: d.name, ...(icon ? { icon } : {}),
           mark: KIND_MARK[kind] ?? "leaf", of: "def", at: { of: "def", id: d.id },
           ...(filed ? { filed } : {}), under: [] };
}

/** The icon a block or definition names with `card.icon`, where this set draws it: the block's
 *  own word first, then its definition's chain. */
function card_icon(graph: Graph, id: Id): IconName | undefined {
  const own = graph.blocks[id]?.looks?.["card"]?.["icon"];
  const said = own ?? config_of(graph, graph.defs[id] ? id : def_of(graph, id), "card")["icon"];
  return typeof said === "string" && known(said) ? said : undefined;
}

/** A section row: its word, its mark, where it points, and what it holds. */
function section(id: Id, label: string, mark: Mark, at: Section, under: Node[]): Node {
  return { id, ref: id, label, mark, of: "pack", at, under };
}

/** A shelf's definitions, flat and in its order — blocks, then relations — each with the group it
 *  is filed in: the workspace's, or with `pack` named, that package's. A shelf's groups box its
 *  definitions on its layer; they are not rows. */
function filed_defs(graph: Graph, pack?: Id): { d: Definition; filed: NonNullable<Row["filed"]> }[] {
  const shelf = shelf_of(graph, pack).filter((s) => s.name === undefined && graph.defs[s.id]);
  return GROUPS.flatMap((g) => shelf.filter((s) => s.group === g.group).map((s) => ({
    d: graph.defs[s.id]!, filed: { group: g.group, ...(s.in ? { in: s.in } : {}) },
  })));
}

/** One package, its definitions flat, as it files them. Frozen, so nothing in it is filed here,
 *  and it wears a lock: a package is never written into, only extended. */
function pack_node(graph: Graph, pack: Id): Node {
  const name = graph.packages[pack]?.name ?? pack;
  const id = `${PACKS}:${name}`;
  const at = { of: "defs", only: "packages", from: name } as const;
  return section(id, name, "locked", at,
                 filed_defs(graph, pack).map(({ d }) => def_node(graph, d, id)));
}

/** The library: the packages, each its own row — one another extends too — then the definitions:
 *  pinned, and the workspace's own, flat. **There is no workspace collection here**: everything
 *  in this section is the workspace's already, so a row saying so held nothing but one more
 *  indent. **And no `default` collection**: the base kinds read under `packages`, and the
 *  workspace's own word about one is a definition like any other, filed with the rest. */
function library_of(graph: Graph): Node[] {
  /** **Both groups, in pin order.** A pinned relation used to read on the options rail instead,
   *  which made `pinned` two places meaning one thing. Nothing pinned, no section. */
  const pinned = pinned_defs(graph).filter((d) => !shipped(d) && !d.from && d.default === undefined);
  return [
    section(PACKS, "packages", "package", { of: "defs", only: "packages" },
            packages(graph).map((p) => pack_node(graph, p.from))),
    section(VOCAB, "definitions", "vocabulary", { of: "defs", only: "all" }, [
      ...(pinned.length ? [section(`${VOCAB}:pinned`, "pinned", "pin", { of: "defs", only: "pinned" },
                                   pinned.map((d) => def_node(graph, d, `${VOCAB}:pinned`)))] : []),
      ...filed_defs(graph).map(({ d, filed }) => def_node(graph, d, VOCAB, filed)),
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

/** The panel: the library sections — packages, then definitions — above the usages, the one
 *  tree of the workspace's blocks. Without the library the root heads the panel on its own. */
function tree_of(graph: Graph, folded: readonly Id[], library = false): Row[] {
  const out: Row[] = library ? lay(library_of(graph), folded) : [];
  const at = library ? 1 : 0;
  if (library) {
    out.push({ id: USES, ref: USES, depth: 0, label: "usages", kids: 1, named: true, alias: "",
               of: "pack", mark: "usages", guides: [] });
    if (folded.includes(USES)) return out;
  }
  /** A row's columns are its holder's, plus one for itself. */
  const walk = (parent: Id | null, depth: number, held: boolean[]) => {
    const kin = under(graph, parent);
    kin.forEach((b, n) => {
      const kids = under(graph, b.id);
      const guides = [...held, n < kin.length - 1];
      const icon = card_icon(graph, b.id);
      out.push({ ...(icon ? { icon } : {}), id: b.id, ref: b.id, depth, label: shown_name(graph, b.id), kids: kids.length,
                 named: is_named(graph, b.id), alias: alias_of(graph, b.id), of: "block",
                 mark: shape_of(graph, b.id)
                   ?? (MARKED.includes(base_of(graph, b.id)) ? base_of(graph, b.id) as Mark : "leaf"),
                 guides });
      if (!folded.includes(b.id)) walk(b.id, depth + 1, guides);
    });
  };
  /** The workspace is the one root; every top-level block is a branch under it. */
  const top = under(graph, graph.root);
  const held = at ? [false] : [];
  out.push({ id: graph.root, ref: graph.root, depth: at, label: shown_name(graph, graph.root), kids: top.length,
             named: is_named(graph, graph.root), alias: "", of: "block", mark: "root",
             guides: held });
  if (!folded.includes(graph.root)) walk(graph.root, at + 1, held);
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

/** Where a row made under `at` reads: after the last row of its branch, one step in. */
function after(rows: readonly Row[], at: Id) {
  const i = rows.findIndex((r) => r.id === at);
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

/** The layer a drop would join: the row itself when it lands *in* it, its holder when it lands
 *  beside it. */
function landing(graph: Graph, over: { id: Id; where: "in" | "above" | "below" } | null) {
  if (!over) return null;
  return over.where === "in" ? over.id : graph.blocks[over.id]?.parent ?? graph.root;
}

/** What a row reads as, as a mark. A `word` is three letters rather than a drawing, and is never
 *  filled: a fill closes its counters and leaves a blot. */
const MARK: Record<Mark, { icon: IconName; word?: true }> = {
  leaf: { icon: "role_leaf" },
  folder: { icon: "role_folder" },
  interface: { icon: "role_interface" },
  reference: { icon: "role_reference" },
  note: { icon: "role_note" },
  group: { icon: "role_group" },
  grid: { icon: "role_table" },
  pin: { icon: "pin" },
  locked: { icon: "locked" },
  vocabulary: { icon: "word_def", word: true },
  usages: { icon: "word_use", word: true },
  root: { icon: "role_root" },
  package: { icon: "word_pkg", word: true },
  line: { icon: "relation_plain" },
  tie: { icon: "relation_tie" },
};

/** A section's own fold, at its root and set to the right: every branch it holds shut in one go,
 *  or opened down to the last — a branch holding only rows stays shut, so the section reads as
 *  its structure. The section itself stays open either way; its mark hides it. */
function Fold({ self, kin, folded, onFold }: {
  self: Id; kin: readonly Branch[]; folded: readonly Id[];
  onFold: (id: Id, shut: boolean) => void;
}) {
  if (!kin.length) return null;
  const open = kin.some((b) => !folded.includes(b.id));
  const upper = kin.some((b) => b.inner) ? kin.filter((b) => b.inner) : kin;
  const toggle = () => {
    for (const b of kin) onFold(b.id, open || !upper.includes(b));
    if (folded.includes(self)) onFold(self, false);
  };
  return (
    <button className="fold" title={open ? "fold this section" : "open this section"}
            onClick={(e) => { e.stopPropagation(); toggle(); }}>
      <Icon name={open ? "fold_all" : "unfold_all"} size={MARK_SIZE} />
    </button>
  );
}

export function Explorer(props: ExplorerProps) {
  const { graph, open, picked, folded, lit = [], onAct, onFold, onPick,
          menu: offered = true, section = null, onSection, keys = false,
          tools: bar = {} } = props;
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
  const [over, set_over] = useState<{ id: Id; where: "in" | "above" | "below" } | null>(null);
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
  /** Whether the folds are held: the arrows still open the way they walk, and shut nothing. */
  const [held, set_held] = useState(false);
  /** What is in hand off the workspace's shelf: definitions or folders to file. */
  const [shelving, set_shelving] = useState<readonly Id[]>([]);

  /** Each section's own branches — the packages, the definitions, the workspace — so its root
   *  folds what it heads and nothing else. Read off the tree fully open, so a shut branch's own
   *  branches still count. */
  const sections = useMemo(() => {
    const all = tree_of(graph, [], !!onSection);
    const out = new Map<Id, Branch[]>();
    const held = new Map<Id, Row[]>();
    /** Whether a row holds a branch: a row one deeper, before its own end, holding anything. */
    const inner = (j: number) => {
      for (let k = j + 1; k < all.length && all[k]!.depth > all[j]!.depth; k++) {
        if (all[k]!.depth === all[j]!.depth + 1 && all[k]!.kids > 0) return true;
      }
      return false;
    };
    for (let i = 0; i < all.length; i++) {
      if (all[i]!.depth) continue;
      const kin: Branch[] = [];
      const rows: Row[] = [];
      for (let j = i; j < all.length && (j === i || all[j]!.depth > 0); j++) {
        if (j > i && all[j]!.kids > 0) kin.push({ id: all[j]!.id, inner: inner(j) });
        rows.push(all[j]!);
      }
      out.set(all[i]!.id, kin);
      held.set(all[i]!.id, rows);
    }
    return { folds: out, held, all };
  }, [graph, onSection]);

  /** A match inside a shut branch opens the way to it. */
  const shut = lit.length
    ? folded.filter((id) => !lit.some((m) => on_path(graph, m, id)))
    : folded;
  const rows = tree_of(graph, shut, !!onSection);
  /** Nothing picked on the root layer, and no library row in hand, is the workspace picked: it is
   *  what the tray is about, so its row says so — the usages, where the library is drawn. */
  const rooted = !picked.length && !section && (open === null || open === graph.root)
    ? onSection ? USES : graph.root : null;
  /** A row is lit by the pick, whatever it stands for — a definition by the one it names — or,
   *  off the tree, by the library row in hand. */
  const lights = (r: Row) => r.id === rooted || (r.of === "block" ? picked.includes(r.id)
    : (r.of === "def" && picked.includes(r.ref)) || same(section, r.at));
  /** Which section holds what is lit, told on its root even while it is folded. */
  const holds = (r: Row) => !r.depth && !!sections.held.get(r.id)?.some(lights);
  /** Only blocks answer a block question. */
  const blocks = rows.filter((r) => r.of === "block");
  /** Where something new goes: what you picked, where it can hold one, else where you are. */
  const about = about_of(graph, open ?? null, picked);
  const target = may_hold(graph, about) ? about : open ?? graph.root;
  /** What the delete would take, which is a pick and never the layer standing in for one. */
  const one = picked.length === 1 ? picked[0]! : null;
  /** The layer a drop would join, and every row already in it. */
  const zone = landing(graph, over);

  /** Which name is open, and where what was typed lands: a block or a definition. */
  const typing = useMemo(() => ({
    id: naming,
    done: (label: string | null) => {
      const row = rows.find((r) => r.id === naming);
      set_naming(null);
      if (!row || label === null) return;
      if (row.of === "block") onAct("rename", { id: row.ref, name: label });
      else if (row.of === "def") onAct("rename_def", { id: row.ref, name: label });
    },
  }), [naming, onAct, rows]);

  /** Where the library is pointed on the shelf: the definitions as a whole files a block
   *  definition, and one of the workspace's own files beside it, in its shelf group. */
  const at = section?.of === "def" ? graph.defs[section.id] : undefined;
  const shelved = at ? shelf_of(graph).find((x) => x.id === at.id)?.in : undefined;
  const filing: { group: Group; into?: Id; def?: Id } | null =
    section?.of === "defs" && section.only === "all" ? { group: "block" }
    : at && shelvable(at) ? { group: at.group, def: at.id, ...(shelved ? { into: shelved } : {}) }
    : null;
  /** A library section is in hand, so the bar's tools are about definitions. */
  const library = !!section;

  /** Where a drop on a definition's row files what is in hand — beside it, in its shelf group —
   *  or null where it cannot. */
  const filed_at = (r: Row, where: "above" | "below") => {
    const group = shelf_of(graph).find((x) => x.id === shelving[0])?.group;
    if (!r.filed || r.filed.group !== group || shelving.includes(r.ref)) return null;
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

  /** A row chosen as a plain click chooses it: a library row points the tray, the usages are the
   *  workspace itself, and a block is revealed and picked. */
  const choose = (r: Row) => {
    if (r.at) { onSection?.(r.at); return; }
    if (r.id === USES) { onPick([]); return; }
    if (r.of !== "block") return;
    set_anchor(r.id);
    onAct("reveal", { id: r.id });
    onPick([r.id]);
  };

  /** The arrows walk the whole tree, shut branches too, from the first row lit. */
  useEffect(() => {
    if (!keys) return;
    const all = sections.all;
    const depth = (i: number) => all[i]!.depth;
    /** A row's holder, and its next or previous sibling; -1 where there is none. */
    const up = (i: number) => {
      for (let j = i - 1; j >= 0; j--) if (depth(j) < depth(i)) return j;
      return -1;
    };
    const kin = (i: number, by: 1 | -1) => {
      for (let j = i + by; j >= 0 && j < all.length && depth(j) >= depth(i); j += by) {
        if (depth(j) === depth(i)) return j;
      }
      return -1;
    };
    /** The next sibling; past a branch's end, its holder's, and so on out. */
    const beside = (i: number): number => {
      for (let at = i; at >= 0; at = up(at)) {
        const next = kin(at, 1);
        if (next >= 0) return next;
      }
      return -1;
    };
    const key = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement
        && e.target.closest("input, textarea, select, [contenteditable='true']");
      const plain = !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey;
      if (typing || !plain || e.defaultPrevented || !WALK.includes(e.key)) return;
      e.preventDefault();
      const at = all.findIndex(lights);
      if (at < 0) { if (all[0]) choose(all[0]); return; }
      const out = up(at);
      const inner = all[at + 1] && depth(at + 1) > depth(at) ? at + 1 : -1;
      const next = at + 1 < all.length ? at + 1 : -1;
      const to = e.key === "ArrowDown" ? (beside(at) >= 0 ? beside(at) : inner)
        : e.key === "ArrowUp" ? (kin(at, -1) >= 0 ? kin(at, -1) : out)
        : e.key === "ArrowRight" ? next
        : out >= 0 ? out : kin(at, -1);
      if (to < 0) return;
      // The way to the row walked to opens. Unless the folds are held, each branch left shuts,
      // and stepping out shuts the one stepped out of.
      const way = new Set<number>();
      for (let j = to; j >= 0; j = up(j)) way.add(j);
      for (const j of way) {
        if (j !== to && folded.includes(all[j]!.id)) onFold(all[j]!.id, false);
      }
      if (!held) {
        for (let j = at; j >= 0; j = up(j)) {
          if (!way.has(j) && all[j]!.kids) onFold(all[j]!.id, true);
        }
        if (e.key === "ArrowLeft" && to === out) onFold(all[to]!.id, true);
      }
      choose(all[to]!);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

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
    if (library) { add_def(); return; }
    // A draft row opens where it goes, its branch unfolded to show it.
    if (folded.includes(target)) onFold(target, false);
    set_draft({ parent: target, ...(type ? { type } : {}) });
  };

  /** The draft's slot in the tree, drawn in the rows' own order. */
  const slot = draft ? after(rows, draft.parent) : null;
  const lines: (Row | null)[] = slot ? [...rows.slice(0, slot.index), null,
    ...rows.slice(slot.index)] : rows;

  /** On the shelf, the bar adds a definition where the library is pointed. */
  const add_def = () => {
    if (!filing) return;
    const word = filing.group === "relation" ? "relation" : "block";
    const label = prompt(`name the ${word} definition`)?.trim();
    if (!label) return;
    const into = filing.into ? { into: filing.into } : {};
    if (def_named(graph, label, filing.group)) { alert(`${label} already exists`); return; }
    onAct("define", { name: label, group: filing.group, ...into });
  };

  /** What the bar's delete would take: a picked block, or a definition on the shelf. */
  const drop = library
    ? filing?.def ? () => onAct("remove_def", { id: filing.def! }) : null
    : one && one !== graph.root ? () => onAct("delete", { id: one }) : null;
  const where_to = `${filing?.group ?? "block"} definitions`;

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
              <button title={library ? `add a definition to ${where_to}` : `add a block in ${shown_name(graph, target)}`}
                      disabled={library && !filing}
                      onClick={() => add()}><Icon name="add_block" /></button>
            ) : null}
            {show.folder ? (
              <button title={library ? "groups are filed by their package" : `add a folder in ${shown_name(graph, target)}`}
                      disabled={library}
                      onClick={() => add("folder")}><Icon name="add_folder" /></button>
            ) : null}
            {show.remove ? (
              <button title={library ? "remove the picked definition" : "delete what is picked"}
                      disabled={!drop} onClick={() => drop?.()}><Icon name="remove" /></button>
            ) : null}
          </span>
        ) : null}
        {/* Whether the arrows fold as they walk, set where each collection's own fold sits. */}
        {show.fold ? (
          <button className="fold" aria-pressed={held}
                  title={held ? "folds held: what the arrows open stays open — click to let them fold"
                    : "folds follow the arrows, shutting what they leave — click to hold them"}
                  onClick={() => set_held(!held)}>
            <Icon name={held ? "folds_held" : "folds_follow"} size={MARK_SIZE} />
          </button>
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
                  holds(r) ? "holds" : "",
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
                draggable={naming !== r.id && (r.of === "def"
                           || (r.of === "block" && r.id !== graph.root))}
                onDragStart={(e) => {
                  /** A definition files, and carries itself to the drawing. */
                  if (r.of === "def") {
                    if (r.filed) set_shelving([r.ref]);
                    e.dataTransfer?.setData("text/mnd-block", r.ref);
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
                    const where = seam(e) === "above" ? "above" : "below";
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
                    const where = over?.id === r.id && over.where !== "in" ? over.where : "below";
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
                  if (r.at || r.id === USES) { choose(r); return; }
                  if (r.of === "pack") return;
                  clicked(e, r.id);
                }}
                onContextMenu={(e) => {
                  if (r.of !== "block") return;
                  e.preventDefault();
                  if (!picked.includes(r.id)) { onAct("reveal", { id: r.id }); onPick([r.id]); }
                  set_menu({ x: e.clientX, y: e.clientY });
                }}
                onDoubleClick={() => {
                  /** A block, or the workspace's own definition. */
                  if (r.of === "block" || (r.of === "def" && shelvable(graph.defs[r.ref]))) {
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
                    title={r.kids ? (shut.includes(r.id) ? `open · ${r.kids} inside` : "fold")
                      : undefined}
                    onClick={(e) => { e.stopPropagation();
                                      if (r.kids) onFold(r.id, !shut.includes(r.id)); }}>
                {/* A row that holds blocks lights its icon, as a card does; a fill would blot a
                    drawn mark like a pilcrow. */}
                <Icon name={r.icon ?? MARK[r.mark].icon} size={MARK_SIZE} />
              </span>
              {r.of === "pack"
                ? <span className="label">{r.label}</span>
                : <Name id={r.id} className="label" text={r.label} />}
              {r.alias ? <span className="alias">{r.alias}</span> : null}
              {r.depth ? null : (
                <Fold self={r.id} kin={sections.folds.get(r.id) ?? []} folded={folded} onFold={onFold} />
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
