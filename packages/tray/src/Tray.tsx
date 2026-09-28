/** The context tray: one shell, one context, one tab per question.
 *
 *  Given no `onAct` it is read only: only the tabs that read — workspace, element, fields,
 *  contents, and the library's — are offered, and nothing in them takes input. A host adds tabs
 *  of its own for blocks through `extras`. */

import { useEffect, useState, type ReactNode } from "react";
import { about_of, alias_of, children, def_named, def_of, frame_of, is_interface, new_id,
         owner_of, shown_name, stands_for,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon, TrayFrame } from "@mnd/theme";
import { rows_of, type Row, type Sort } from "./rows";
import { Element } from "./Element";
import { Settings } from "./Settings";
import { Fields } from "./Fields";
import { Definitions, type Shelf } from "./Definitions";
import { Entry } from "./Entry";
import { lit_row, scope_chips, Table, type Column, type Scope } from "./Table";
import { Usages } from "./Usages";
import { Packages, type Offered } from "./Packages";
import { Workspace, type Display } from "./Workspace";
import { aimed, blank, DRAFT, redraft, with_draft, type DraftGroup } from "./draft";
import { NOOP } from "./Body";

/** What the tray holds that the canvas did not give it. */
export type Hold =
  | { of: "id"; id: Id }
  | { of: "draft"; group: DraftGroup }
  /** A library section in the explorer: every definition, or one narrowing of them. */
  | ({ of: "defs" } & Shelf);

export type TrayProps = {
  graph: Graph;
  layer: Id | null;
  open: boolean;
  onOpen: (open: boolean) => void;
  /** What the canvas has, which is what the tray is about. The tray never sets it: a table
   *  lights a row of its own, and *view* is what asks for the selection to move. */
  picked: readonly Id[];
  /** Hovering a row lights that thing on the stage. */
  onHover?: (id: Id | null) => void;
  /** Edits leave as action names. */
  onAct?: Act;
  /** Which tab to show — one of the tray's, or a host's own; left alone, the last that applies. */
  tab?: string;
  onTab?: (tab: string) => void;
  hold?: Hold | null;
  onHold?: (hold: Hold | null) => void;
  /** Go to where a row lives: open its layer and pick it there. */
  onView?: (layer: Id | null, id: Id) => void;
  /** What the package catalogue offers, where the app can read one. */
  offered?: readonly Offered[];
  /** How the shell draws, for the workspace tab to set. Absent leaves that band out. */
  display?: Display;
  /** Where the workspace tab's display answers go; `onAct` where absent. */
  onDisplay?: Act;
  /** The host's own tabs for a block, after the tray's: a name, and what it draws. */
  extras?: readonly Extra[];
};

/** A host's tab: what it is called, and what it shows for the block the tray is about. */
export type Extra = { name: string; draw: (about: Id) => ReactNode };

export type Tab = "element" | "settings" | "type" | "fields" | "contents" | "definitions"
                | "packages" | "usages" | "workspace";

/** What the tray is about. The root is not a block anybody draws, so it is its own context. */
type Context = "root" | "block" | "line" | "definition" | "relation" | "library" | "packages";

/** A slot per context: an element lists its types, a library section every definition, and the
 *  packages section what the workspace draws on — a package's definitions read in the explorer,
 *  so the tray says what is drawn on and nothing else. */
const SLOTS: Record<Context, readonly Tab[]> = {
  /** The root draws nowhere, so it is asked about itself and about what it holds, and no more. */
  root: ["workspace", "contents"],
  /** Usages are a definition's question: an instance is one usage and has none of its own.
   *  **Settings are a definition's too** — how it draws and what it may do — so a usage follows
   *  them rather than carrying its own. */
  block: ["element", "type", "fields", "contents"],
  line: ["element", "type"],
  definition: ["element", "settings", "fields", "usages"],
  relation: ["element", "settings", "usages"],
  library: ["definitions"],
  packages: ["packages"],
};

/** The tabs that only read, per context: what a host that edits nothing offers. */
const READ: Record<Context, readonly Tab[]> = {
  root: ["workspace", "contents"],
  block: ["element", "fields", "contents"],
  line: ["element"],
  definition: ["element", "fields", "usages"],
  relation: ["element", "usages"],
  library: ["definitions"],
  packages: ["packages"],
};

/** Where a context opens when nothing was asked: the root on what the workspace is, anything
 *  else on its last tab. */
const OPENS: Partial<Record<Context, Tab>> = { root: "workspace" };

/** Which contexts share a tab between them: every instance is read the same way, and so is
 *  every definition, so moving from one to the next keeps the question being asked. */
const FAMILY: Record<Context, string> = {
  root: "root", block: "instance", line: "instance",
  definition: "definition", relation: "definition",
  library: "library", packages: "packages",
};

const HEAD: readonly Column[] = [
  { key: "kind", label: "kind" },
  { key: "name", label: "name" },
  { key: "what", label: "what" },
  { key: "type", label: "type" },
];

/** A reference's contents is the one it stands for, so its name column says as much. */
const STANDS: readonly Column[] = HEAD.map((c) =>
  (c.key === "name" ? { ...c, label: "stands for" } : c));

/** What a filter narrows to. */
const FILTERS: { sort: Sort | "all"; label: string }[] = [
  { sort: "all", label: "all" },
  { sort: "block", label: "blocks" },
  { sort: "interface", label: "interfaces" },
  { sort: "relationship", label: "relations" },
  { sort: "group", label: "groups" },
  { sort: "note", label: "notes" },
];

/** The layer a thing is drawn in: a block's parent, an interface's owner's, a line's first end's. */
function home_of(graph: Graph, id: Id): Id | null {
  const e = graph.edges[id];
  const b = graph.blocks[e ? owner_of(graph, e.from) : id];
  if (!b) return null;
  const home = is_interface(b) ? graph.blocks[b.parent ?? ""]?.parent : b.parent;
  /** The root layer is `null`, as the open layer names it. */
  return !home || home === graph.root ? null : home;
}

export function Tray(props: TrayProps) {
  const { graph, layer, open, onOpen, picked, onHover, onAct, onView,
          hold = null, onHold = () => {}, extras = [] } = props;
  /** Whether anything here takes input. */
  const edits = !!onAct;
  /** The tab each family of contexts was last read on. */
  const [seen, set_seen] = useState<Record<string, string>>({});
  /** Full height, as a control of its own. */
  const [big, set_big] = useState(false);
  const [only, set_only] = useState<Sort | "all">("all");
  /** Field columns the reader asked for, in the order they asked. */
  const [columns, set_columns] = useState<string[]>([]);
  const [adding, set_adding] = useState("");
  /** Where the listings reach, shared by every table that asks, so a tab change keeps it. */
  const [scope, set_scope] = useState<Scope>("layer");
  /** The row lit in a table, which is the tray's own and moves nothing. Lit nowhere, a table
   *  lights what the canvas holds, since that is what the tray is about. */
  const [lit, set_lit] = useState<Id | null>(null);
  /** One draft per group, kept until saved. */
  const [drafts, set_drafts] = useState<Record<DraftGroup, Definition>>(
    () => ({ block: blank("block"), relation: blank("relation") }));

  /** What the tray is about: a hold, else the one thing picked, else the open layer. */
  const drafting = hold?.of === "draft" ? hold.group : null;
  /** Which library section the explorer pointed at, which is about no one element. */
  const library = hold?.of === "defs" ? hold : null;
  const view = drafting ? with_draft(graph, drafts[drafting]) : graph;
  const held_id = hold?.of === "id" && (view.defs[hold.id] || view.blocks[hold.id])
    ? hold.id : null;
  const about: Id = drafting ? DRAFT : held_id ?? about_of(graph, layer, picked);

  /** A new selection takes the light back, so no table lights what the tray is not about. */
  const on_canvas = picked.join();
  useEffect(() => set_lit(null), [on_canvas]);

  const context: Context = library
    ? (library.only === "packages" ? "packages" : "library")
    : about === graph.root ? "root"
    : view.edges[about] ? "line"
    : view.defs[about]?.group === "relation" ? "relation"
    : view.defs[about] ? "definition" : "block";
  /** Whether the context is about lines rather than blocks. */
  const lined = context === "line" || context === "relation";

  /** A host's tabs lead a block's, and it opens on the first of them: they say what the block is
   *  in the host's own terms. */
  const hosted = context === "block" ? extras.map((x) => x.name) : [];
  /** What the app asks for, else what this family was last read on, else where it opens. */
  const tabs: string[] = [...hosted, ...(edits ? SLOTS : READ)[context]];
  const family = FAMILY[context];
  const tab: string = [props.tab, seen[family]].find((t) => t && tabs.includes(t))
    ?? OPENS[context] ?? hosted[0] ?? tabs[tabs.length - 1]!;
  const set_tab = (t: string) => { set_seen((s) => ({ ...s, [family]: t })); props.onTab?.(t); };

  /** A draft is edited through the registry, and everything else goes out. */
  const act: Act = (name, args) => {
    if (name === "@name") {
      file_draft(String(args?.["name"] ?? "").trim());
      return;
    }
    if (drafting && aimed(args).includes(DRAFT)) {
      const next = redraft(view, drafts[drafting], name, args ?? {});
      if (typeof next !== "string") set_drafts((d) => ({ ...d, [drafting]: next }));
      return;
    }
    onAct?.(name, args);
  };
  /** What a read-only listing acts with: nothing. */
  const reads = edits ? act : NOOP;

  /** A draft is filed as one step the moment it is named, and the tray holds it. */
  function file_draft(to: string) {
    const draft = drafting ? drafts[drafting] : null;
    if (!draft || !to || def_named(graph, to, draft.group)) return;
    /** Minted here, so the tray can hold what it filed. */
    const id = new_id(draft.group === "relation" ? "rel" : "def");
    onAct?.("define", { id, name: to, group: draft.group, extends: draft.extends ?? "",
                        components: draft.components, fields: draft.fields });
    set_drafts((d) => ({ ...d, [draft.group]: blank(draft.group) }));
    onHold({ of: "id", id });
  }

  /** Whether the definition in context has looks to reset, and whether it is a package's. */
  const bag = view.defs[about]?.components;
  const its_own = ["card", "style", "line"].some((key) => Object.keys(bag?.[key] ?? {}).length > 0);
  const borrowed = !!view.defs[about]?.from;

  /** A reference holds nothing of its own — `of` is the whole of it — so its contents is the one
   *  it stands for, listed as a row like any other and offering the way there. */
  const points_at = graph.blocks[about]?.of;
  const stands = points_at ? stands_for(graph, about) : null;
  /** The one it stands for, read as a row of the layer it really lives in. */
  const stood = stands
    ? rows_of(graph, home_of(graph, stands.id)).find((r) => r.id === stands.id) ?? null : null;

  /** What the table lists: what the context frames, or the whole workspace. */
  const within = frame_of(graph, layer, about);
  const deep = scope === "workspace";
  const rows = rows_of(graph, deep ? null : within, deep);
  const shown = only === "all" ? rows : rows.filter((r) => r.sort === only);

  const counted = (sort: Sort | "all") =>
    sort === "all" ? rows.length : rows.filter((r) => r.sort === sort).length;

  const offered = [...new Set(rows.flatMap((r) => Object.keys(r.fields)))]
    .filter((n) => !columns.includes(n)).sort();

  const cell = (row: Row, key: string) =>
    key in row.fields ? row.fields[key]! : String(row[key as keyof Row] ?? "");

  const chips = {
    key: "sort", on: only, onPick: (k: string) => set_only(k as Sort | "all"),
    of: FILTERS.map((f) => ({ key: f.sort, word: f.label, count: counted(f.sort) })),
  };
  /** A column per field, so one value can be read down a layer. */
  const tools = (
    <>
      {columns.map((n) => (
        <button key={n} className="chip" title={`drop the ${n} column`}
                onClick={() => set_columns(columns.filter((c) => c !== n))}>
          {n}<Icon name="remove" size={10} />
        </button>
      ))}
      {offered.length ? (
        <select value={adding} aria-label="add a column"
                onChange={(e) => {
                  if (!e.target.value) return;
                  set_columns([...columns, e.target.value]);
                  set_adding("");
                }}>
          <option value="">+ column</option>
          {offered.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      ) : null}
    </>
  );

  /** What the definitions tab opens narrowed to; the key re-seeds it when the section changes. */
  const narrowed: Shelf = library
    ? { only: library.only, ...(library.group ? { group: library.group } : {}),
        ...(library.from ? { from: library.from } : {}) }
    : { only: "all" };

  /** The definition a relation context is about. */
  const held_def = graph.defs[about] ? about : def_of(graph, about) ?? null;

  /** What a table asks for: its own lit row, else what the canvas holds. Each table settles it
   *  against its own listing, since one table's row is not another's. */
  const asked_row = lit ? [lit] : picked;
  /** The contents listing, and what a reference stands for, each light one row. */
  const on_row = lit_row(shown, asked_row);
  const on_stood = lit_row(stood ? [stood] : [], asked_row);

  /** What a definition row applies to: the elements picked, of the context's own group — or the
   *  one element the tray is about, where the canvas has not picked it. */
  const picked_here = picked.filter((id) => (lined ? !!graph.edges[id] : !!graph.blocks[id]));
  const instance = !view.defs[about] && about !== graph.root
    && !!(view.blocks[about] ?? view.edges[about]);
  const targets = instance && !picked_here.includes(about) ? [about] : picked_here;
  const target_name = targets.length === 1 ? shown_name(graph, targets[0]!)
    : `${targets.length} ${lined ? "lines" : "blocks"}`;

  /** The head names the context, then says what sort it is: a definition, or a usage of one. */
  const word = library ? "definitions"
    : drafting || view.defs[about] ? "definition"
    : context === "root" ? "workspace" : "usage";
  const name = drafting ? drafts[drafting].name || `new ${drafting}`
    : library ? [library.from ?? (library.only === "all" ? "" : library.only),
                 library.group ? `${library.group}s` : ""].filter(Boolean).join(" · ")
    : view.defs[about] ? view.defs[about]!.name : shown_name(graph, about);

  return (
    <TrayFrame
      open={open}
      onOpen={onOpen}
      big={big}
      onBig={set_big}
      word={word}
      {...(name ? { name } : {})}
      {...(picked.length > 1 && !hold ? { note: `${picked.length} items` } : {})}
      tabs={tabs}
      tab={tab}
      onTab={set_tab}
      {...(open && tab === "contents" && !points_at ? {
        tools: <span className="holds">{shown.length} {shown.length === 1 ? "element" : "elements"}</span>,
      } : {})}
      {...(onAct && tab === "settings" ? {
        tabTools: (
          <button className="reset" disabled={borrowed || !its_own}
                  title={its_own ? "give every look back to what it inherits"
                                    : "it says nothing of its own to give back"}
                  onClick={() => act("none", { ids: [about] })}>
            reset style
          </button>
        ),
      } : {})}
    >
          {tab === "workspace" ? (
            <Workspace graph={graph} {...(edits ? { onAct: act } : {})}
                       onDisplay={props.onDisplay ?? act}
                       {...(props.display ? { display: props.display } : {})} />
          ) : null}
          {tab === "element" ? (
            <Element graph={view} id={about} {...(edits ? { onAct: act } : {})}
                     onOpen={(id) => onHold({ of: "id", id })} />
          ) : null}
          {onAct && tab === "settings" ? (
            <Settings graph={view} id={about} onAct={act} />
          ) : null}
          {/* A definition declares fields and an instance answers them. */}
          {tab === "fields" ? (
            <Fields graph={view} id={about} {...(edits ? { onAct: act } : {})} />
          ) : null}
          {/* A host's own tab, for the block the tray is about. */}
          {extras.find((x) => x.name === tab)?.draw(about) ?? null}
          {/* The workspace's definitions for a library section; what one element may follow. */}
          {tab === "definitions" ? (
            <Definitions key={JSON.stringify(narrowed)} seed={narrowed} graph={graph}
                         follows={null} lines={[]} onAct={reads}
                         onOpen={(id) => onHold({ of: "id", id })} />
          ) : null}
          {/* What the workspace draws on, and how one more gets in. */}
          {tab === "packages" ? (
            <Packages graph={graph} offered={props.offered} onAct={reads} />
          ) : null}
          {onAct && tab === "type" ? (
            <Definitions key={about} about={about} graph={graph} follows={held_def}
                         onAct={act} lines={targets} target={target_name}
                         onOpen={(id) => onHold({ of: "id", id })} />
          ) : null}
          {tab === "usages" ? (
            <Usages graph={graph} group={lined ? "relation" : "block"}
                    scope={scope} onScope={set_scope}
                    layer={layer} about={held_def}
                    lit={asked_row} onLit={set_lit} onHover={onHover} onAct={reads}
                    {...(onView ? { onView: (id: Id) => onView(home_of(graph, id), id) } : {})}
                    home={(id) => home_of(graph, id)} />
          ) : null}

          {tab === "contents" && view.defs[about] ? (
            <p className="empty">pick an instance to see its contents</p>
          ) : tab === "contents" && points_at ? (
            /** A reference holds nothing, so its contents is the one it stands for. */
            <Table
              columns={STANDS} acts="6rem" rows={[]}
              picked={on_stood} onPick={set_lit} onHover={onHover}
              empty={`${alias_of(graph, about, true)} stands for something that is gone`}
              {...(stood ? { lead: {
                id: stood.id,
                titles: Object.fromEntries(STANDS.map((h) => [h.key, cell(stood, h.key)])),
                cells: { kind: stood.kind, name: stood.name, what: stood.what, type: stood.type },
                /** Always offered: where it lives is the whole of what a reference says. */
                actions: onView ? (
                  <button className="chip" title="open the layer this is in"
                          onClick={(e) => { e.stopPropagation();
                                            onView(home_of(graph, stood.id), stood.id); }}>
                    view
                  </button>
                ) : null,
              } } : {})} />
          ) : tab === "contents" ? (
            <Table
              columns={[...HEAD, ...columns.map((n) => ({ key: `@${n}`, label: n }))]}
              chips={[scope_chips(scope, set_scope), chips]} tools={tools} acts="6rem"
              picked={on_row} onPick={set_lit} onHover={onHover}
              empty={deep ? "this workspace holds nothing yet"
                : within === layer ? "this layer holds nothing yet"
                : children(graph, within).length ? "nothing of that sort"
                : "it holds nothing yet"}
              rows={shown.map((row) => {
                const home = home_of(graph, row.id);
                const block = graph.blocks[row.id];
                return {
                  id: row.id,
                  titles: Object.fromEntries([...HEAD.map((h) => [h.key, cell(row, h.key)]),
                                              ...columns.map((n) => [`@${n}`, cell(row, n)])]),
                  cells: {
                    kind: row.kind, what: row.what, type: row.type,
                    /** A block is renamed in its row; a line is named by its type. */
                    name: onAct && block ? (
                      <Entry value={block.name ?? ""} label={`rename ${row.name}`}
                             placeholder={row.name} blank
                             onCommit={(to) => act("rename", { id: row.id, name: to })} />
                    ) : row.name,
                    ...Object.fromEntries(columns.map((n) => [`@${n}`,
                      onAct && block ? (
                        <Entry value={cell(row, n)} label={`${n} of ${row.name}`} blank
                               onCommit={(to) => act("field", { holder: row.id, name: n,
                                                                value: to })} />
                      ) : cell(row, n)])),
                  },
                  /** The lit row's view chip, which is the only way a row moves the context. */
                  actions: onView && on_row.includes(row.id) ? (
                    <button className="chip"
                            title={home === layer ? "make this the context"
                                                  : "open the layer this is in"}
                            onClick={(e) => { e.stopPropagation(); onView(home, row.id); }}>
                      view
                    </button>
                  ) : null,
                  ...(onAct ? { onDrop: () => act("delete", { ids: [row.id] }),
                                drop: `delete ${row.name}` } : {}),
                };
              })} />
          ) : null}
    </TrayFrame>
  );
}
