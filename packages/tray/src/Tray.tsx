/** The context tray: one shell, one context, one tab per question. */

import { useState, type MouseEvent } from "react";
import { children, def_named, def_of, is_container, is_interface, new_id,
         module_of, owner_of, shipped, shown_name,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { rows_of, type Row, type Sort } from "./rows";
import { Element } from "./Element";
import { Style } from "./Style";
import { Fields } from "./Fields";
import { Definitions, type Shelf } from "./Definitions";
import { Entry } from "./Entry";
import { scope_chips, Table, type Column, type Scope } from "./Table";
import { Usages } from "./Usages";
import { aimed, blank, DRAFT, redraft, with_draft, type DraftGroup } from "./draft";

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
  picked: readonly Id[];
  onPick: (ids: Id[]) => void;
  /** Hovering a row lights that thing on the stage. */
  onHover?: (id: Id | null) => void;
  /** Edits leave as action names. */
  onAct?: Act;
  /** Which tab to show; left alone, the last one that still applies. */
  tab?: Tab;
  onTab?: (tab: Tab) => void;
  hold?: Hold | null;
  onHold?: (hold: Hold | null) => void;
  /** Go to where a row lives: open its layer and pick it there. */
  onView?: (layer: Id | null, id: Id) => void;
};

export type Tab = "element" | "style" | "types" | "fields" | "contents" | "definitions" | "usages";

/** What the tray is about. The workspace is a block like any other. */
type Context = "block" | "line" | "definition" | "relation" | "library";

/** A slot per context: an element lists its types, a library section every definition. */
const SLOTS: Record<Context, readonly Tab[]> = {
  block: ["element", "style", "types", "fields", "contents", "usages"],
  line: ["element", "style", "types", "usages"],
  definition: ["element", "style", "fields", "usages"],
  relation: ["element", "style", "usages"],
  library: ["definitions"],
};

const HEAD: readonly Column[] = [
  { key: "kind", label: "kind" },
  { key: "name", label: "name" },
  { key: "what", label: "what" },
  { key: "type", label: "type" },
];

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
  const { graph, layer, open, onOpen, picked, onPick, onHover, onAct, onView,
          hold = null, onHold = () => {} } = props;
  const [held_tab, set_held_tab] = useState<Tab>("contents");
  /** Full height, as a control of its own. */
  const [big, set_big] = useState(false);
  const [only, set_only] = useState<Sort | "all">("all");
  /** Field columns the reader asked for, in the order they asked. */
  const [columns, set_columns] = useState<string[]>([]);
  const [adding, set_adding] = useState("");
  /** Where the listings reach, shared by every table that asks, so a tab change keeps it. */
  const [scope, set_scope] = useState<Scope>("layer");
  /** The listing a table row was picked from, kept while that row is the pick. */
  const [browse, set_browse] = useState<{ id: Id; within: Id | null } | null>(null);
  /** The definition row lit while something on the canvas is picked. */
  const [lit_def, set_lit_def] = useState<Id | null>(null);
  /** One draft per group, kept until saved. */
  const [drafts, set_drafts] = useState<Record<DraftGroup, Definition>>(
    () => ({ block: blank("block"), relation: blank("relation") }));

  /** What the tray is about: a hold, else the one thing picked, else the open layer. */
  const drafting = hold?.of === "draft" ? hold.group : null;
  /** Which library section the explorer pointed at, which is about no one element. */
  const library = hold?.of === "defs" ? hold : null;
  const view = drafting ? with_draft(graph, drafts[drafting]) : graph;
  const one = picked.length === 1 ? picked[0]! : null;
  const held_id = hold?.of === "id" && (view.defs[hold.id] || view.blocks[hold.id])
    ? hold.id : null;
  const here = layer ?? graph.root;
  const about: Id = drafting ? DRAFT : held_id ?? one ?? here;

  const context: Context = library ? "library"
    : view.edges[about] ? "line"
    : view.defs[about]?.group === "relation" ? "relation"
    : view.defs[about] ? "definition" : "block";
  /** Whether the context is about lines rather than blocks. */
  const lined = context === "line" || context === "relation";

  const tabs = SLOTS[context];
  const asked = props.tab ?? held_tab;
  const tab: Tab = tabs.includes(asked) ? asked : tabs[tabs.length - 1]!;
  const set_tab = (t: Tab) => { set_held_tab(t); props.onTab?.(t); };

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

  /** Whether an element has looks of its own, which make a working definition. */
  const drawn_looks = (it: { looks?: Record<string, object> } | undefined) =>
    ["card", "style", "line"].some((key) => Object.keys(it?.looks?.[key] ?? {}).length > 0);
  const instance = view.blocks[about] ?? view.edges[about];

  /** A draft is filed as one step the moment it is named, and the tray holds it. */
  function file_draft(to: string) {
    const draft = drafting ? drafts[drafting] : null;
    if (!draft || !to || def_named(graph, to, draft.group)) return;
    /** Minted here, so the tray can hold what it filed. */
    const id = new_id(draft.group === "relation" ? "rel" : "def");
    onAct?.("define", { id, name: to, group: draft.group, extends: draft.extends ?? "",
                        ...(draft.label ? { label: draft.label } : {}),
                        components: draft.components, fields: draft.fields });
    set_drafts((d) => ({ ...d, [draft.group]: blank(draft.group) }));
    onHold({ of: "id", id });
  }

  const working_look = !!instance && drawn_looks(instance);

  /** What styling writes: a workspace definition the element names, else the element's own look. */
  const typed = instance?.type ? view.defs[instance.type] : undefined;
  const styled: Id = instance && typed && !shipped(typed) && !typed.from && !working_look
    ? typed.id : about;

  /** Whether the context has looks to reset, and whether it is a package's. */
  const holder = view.defs[styled] ?? view.blocks[styled] ?? view.edges[styled];
  const bag = holder && ("components" in holder ? holder.components : "looks" in holder ? holder.looks : undefined);
  const its_own = ["card", "style", "line"].some((key) => Object.keys(bag?.[key] ?? {}).length > 0);
  const borrowed = !!view.defs[styled]?.from;

  /** What the table lists: a picked container's contents, the open layer, or everything. */
  const within = browse && one === browse.id ? browse.within
    : graph.blocks[about] && about !== graph.root
      && (is_container(graph, about) || module_of(graph, about) === "folder") ? about : layer;
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

  /** A row picked here becomes the context and drops any hold. */
  const pick_row = (id: Id) => {
    set_browse({ id, within });
    onPick([id]);
    onHold(null);
  };

  /** With canvas picks, a definition row only lights and offers to apply; otherwise it is held. */
  const targets = picked.filter((id) => (lined ? !!graph.edges[id] : !!graph.blocks[id]));
  const pick_def = (id: Id) => {
    if (targets.length && !hold) { set_lit_def(id); return; }
    onHold({ of: "id", id });
  };
  const target_name = targets.length === 1 ? shown_name(graph, targets[0]!)
    : `${targets.length} ${lined ? "lines" : "blocks"}`;

  /** The head names the context. */
  const word = drafting ? `new ${drafting} definition`
    : library ? "definitions"
    : view.defs[about] ? `${view.defs[about]!.group} definition`
    : context === "line" ? "relation" : "block";
  const name = drafting ? drafts[drafting].name
    : library ? [library.from ?? (library.only === "all" ? "" : library.only),
                 library.group ? `${library.group}s` : ""].filter(Boolean).join(" · ")
    : view.defs[about] ? view.defs[about]!.name : shown_name(graph, about);

  const on_bar = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onOpen(!open);
  };

  return (
    <section className={["tray", open ? "open" : "shut", open && big ? "big" : ""]
               .filter(Boolean).join(" ")} aria-label="Context">
      <div className="tray-bar" onClick={on_bar}
           title={open ? "shut the tray" : "open the tray"}>
        <span className="tray-chevron"><Icon name={open ? "less" : "more"} /></span>
        <span className="tray-context">
          <span className="word">{word}</span>
          {name ? <span className="name">{name}</span> : null}
          {picked.length > 1 && !hold ? <span className="note">{`${picked.length} items`}</span> : null}
        </span>

        <span className="tray-tools">
          {open && tab === "contents" ? <span className="holds">{shown.length} {shown.length === 1 ? "element" : "elements"}</span> : null}
          {open ? (
            <button className={big ? "on" : ""}
                    title={big ? "give the stage its room back" : "take the full height"}
                    onClick={() => set_big(!big)}>
              <Icon name={big ? "collapse" : "expand"} />
            </button>
          ) : null}
        </span>
      </div>

      {open ? (
        <div className="tray-body">
          <div className="tray-tabs">
            {tabs.map((t) => (
              <button key={t} className={tab === t ? "on" : ""} onClick={() => set_tab(t)}>
                {t}
              </button>
            ))}
            {/* Reset acts on the whole style tab. */}
            {onAct && tab === "style" ? (
              <span className="tab-tools">
                <button className="reset" disabled={borrowed || !its_own}
                        title={its_own ? "give every look back to what it inherits"
                                          : "it says nothing of its own to give back"}
                        onClick={() => act("none", { ids: [styled] })}>
                  reset style
                </button>
              </span>
            ) : null}
          </div>

          {onAct && tab === "element" ? <Element graph={view} id={about} onAct={act} /> : null}
          {onAct && tab === "style" ? (
            <Style graph={view} id={about} styled={styled} onAct={act} />
          ) : null}
          {/* A definition declares fields and an instance answers them. */}
          {onAct && tab === "fields" ? <Fields graph={view} id={about} onAct={act} /> : null}
          {/* The workspace's definitions for a library section; what one element may follow. */}
          {onAct && tab === "definitions" ? (
            <Definitions key={JSON.stringify(narrowed)} seed={narrowed} graph={graph}
                         held={null} lines={[]} onAct={act}
                         onPick={(id) => onHold({ of: "id", id })} />
          ) : null}
          {onAct && tab === "types" ? (
            <Definitions key={about} about={about} graph={graph}
                         held={targets.length && !hold ? lit_def ?? held_def : held_def}
                         onAct={act} lines={targets} target={target_name} onPick={pick_def} />
          ) : null}
          {onAct && tab === "usages" ? (
            <Usages graph={graph} group={lined ? "relation" : "block"}
                    scope={scope} onScope={set_scope}
                    layer={layer} about={held_def}
                    picked={picked} onPick={pick_row} onHover={onHover} onAct={act}
                    {...(onView ? { onView: (id: Id) => onView(home_of(graph, id), id) } : {})}
                    home={(id) => home_of(graph, id)} />
          ) : null}

          {tab === "contents" && view.defs[about] ? (
            <p className="empty">pick an instance to see its contents</p>
          ) : tab === "contents" ? (
            <Table
              columns={[...HEAD, ...columns.map((n) => ({ key: `@${n}`, label: n }))]}
              chips={[scope_chips(scope, set_scope), chips]} tools={tools} acts="5rem"
              picked={picked} onPick={pick_row} onHover={onHover}
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
                  /** A view chip on the picked row, only when it lives elsewhere. */
                  actions: onView && picked.includes(row.id) && home !== layer ? (
                    <button className="chip" title="open the layer this is in"
                            onClick={(e) => { e.stopPropagation(); onView(home, row.id); }}>
                      view
                    </button>
                  ) : null,
                  ...(onAct ? { onDrop: () => act("delete", { ids: [row.id] }),
                                drop: `delete ${row.name}` } : {}),
                };
              })} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
