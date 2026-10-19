/** The context tray: one shell, one context, one tab per question.
 *
 *  Given no `onAct` it is read only: the same tabs, and nothing in them takes input. A host adds
 *  tabs of its own for blocks through `extras`. */

import { useEffect, useState, type ReactNode } from "react";
import { about_of, alias_name, alias_of, children, def_at, def_of, domain_of, entry_at, frame_of,
         constraint_at, frozen, interface_at,
         is_interface, of_ref, owner_of, registry_at, stored_of, shown_name, stands_for, tag_at,
         type_at, type Act, type Graph, type Id, type Registry as Of } from "@mnd/core";
import { Icon, TrayFrame } from "@mnd/theme";
import { resolved } from "@mnd/views";
import { rows_of, type Row, type Sort } from "./rows";
import { Carried } from "./Carried";
import { Element } from "./Element";
import { Json } from "./Json";
import { Content } from "./Content";
import { Definitions, type Shelf } from "./Definitions";
import { Entry } from "./Entry";
import { lit_row, scope_chips, Table, type Column, type Scope } from "./Table";
import { Overview } from "./Overview";
import { Usages } from "./Usages";
import { Packages, type Offered } from "./Packages";
import { Registry } from "./Registry";
import { Workspace, type Display } from "./Workspace";
import { NOOP } from "./Body";

/** What the tray holds that the canvas did not give it. */
export type Hold =
  | { of: "id"; id: Id }
  /** A library section in the explorer: every definition, or one narrowing of them. */
  | ({ of: "defs" } & Shelf)
  /** A package's registry of types or tags: its entries and where each is used. */
  | { of: "registry"; registry: Of };

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
  /** The host's drawing of a block's layer at a glance, for the overview's left side. */
  thumb?: (id: Id) => ReactNode;
};

/** A host's tab: what it is called, and what it shows for the block the tray is about. */
export type Extra = { name: string; draw: (about: Id) => ReactNode };

export type Tab = "overview" | "card" | "line" | "settings" | "components" | "contents" | "definitions"
                | "packages" | "usages" | "workspace" | "interface" | "tag" | "type" | "entries";

/** What the tray is about. The root is not a block anybody draws, so it is its own context; a
 *  component — an interface, a tag, a type — is asked its own questions. */
type Context = "root" | "block" | "line" | "definition" | "relation" | "library" | "packages"
  | "interface" | "tag" | "type" | "registry";

/** A slot per context: an element lists its types, a library section every definition, and the
 *  packages section what the workspace draws on — a package's definitions read in the explorer,
 *  so the tray says what is drawn on and nothing else. */
const SLOTS: Record<Context, readonly Tab[]> = {
  /** The root draws nowhere, so it is asked about itself and about what it holds, and no more. */
  root: ["workspace", "contents"],
  /** **Every element asks the same questions, in the same order**: a block first what it is for
   *  at a glance; then what it is — named for what is drawn, a card or a line — on a definition
   *  how it draws, what it carries, and what it lists: a usage its contents, a definition its
   *  usages. A usage lists no settings, since it cannot change them. */
  block: ["overview", "card", "components", "contents"],
  line: ["line", "components"],
  definition: ["overview", "card", "settings", "components", "usages"],
  relation: ["line", "settings", "components", "usages"],
  library: ["definitions"],
  packages: ["packages"],
  interface: ["interface"],
  tag: ["tag"],
  type: ["type"],
  registry: ["entries"],
};

/** The contexts about one element, which carry a json chip. */
const ELEMENTS: readonly Context[] = ["block", "line", "definition", "relation"];

/** Where a context opens when nothing was asked: the root on what the workspace is, a block on
 *  its overview, anything else on its last tab. */
const OPENS: Partial<Record<Context, Tab>> = { root: "workspace", block: "overview",
                                               definition: "overview" };

/** Which contexts share a tab between them: every instance is read the same way, and so is
 *  every definition, so moving from one to the next keeps the question being asked. */
const FAMILY: Record<Context, string> = {
  root: "root", block: "instance", line: "instance",
  definition: "definition", relation: "definition",
  library: "library", packages: "packages",
  interface: "interface", tag: "tag", type: "type", registry: "registry",
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

/** The layer a thing is drawn in: a block's parent, a line's first end's. */
function home_of(graph: Graph, id: Id): Id | null {
  const e = graph.edges[id];
  const b = graph.blocks[e ? owner_of(graph, e.from) : id];
  if (!b) return null;
  const home = b.parent;
  /** The root layer is `null`, as the open layer names it. */
  return !home || home === graph.root ? null : home;
}

/** Whether a definition says anything of its own about how it draws. */
function own_looks(graph: Graph, id: Id): boolean {
  const bag = def_at(graph, id)?.settings;
  return ["card", "style", "line"].some((key) => Object.keys(bag?.[key] ?? {}).length > 0);
}

/** What sort of thing the tray is about, in a word. */
function what_of(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  if (graph.edges[id]) return "relation";
  if (is_interface(graph, stored_of(graph, id))) return "interface";
  if (interface_at(graph, id)) return "interface definition";
  if (constraint_at(graph, id)) return "constraint";
  if (tag_at(graph, id)) return "tag";
  if (type_at(graph, id)) return "type";
  if (!b) return "";
  if (id === graph.root) return "workspace";
  if (b.parent === null) return "package";
  if (b.def) return "definition";
  return resolved(graph, id).stands_in ? "stand-in" : of_ref(graph, id) ? "reference" : "usage";
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
  /** Whether the body reads as the JSON it follows, kept as the context moves. */
  const [raw, set_raw] = useState(false);
  const [only, set_only] = useState<Sort | "all">("all");
  /** Field columns the reader asked for, in the order they asked. */
  const [columns, set_columns] = useState<string[]>([]);
  const [adding, set_adding] = useState("");
  /** Where the listings reach, shared by every table that asks, so a tab change keeps it. */
  const [scope, set_scope] = useState<Scope>("layer");
  /** The row lit in a table, which is the tray's own and moves nothing. Lit nowhere, a table
   *  lights what the canvas holds, since that is what the tray is about. */
  const [lit, set_lit] = useState<Id | null>(null);
  /** What the tray is about: a hold, else the one thing picked, else the open layer. */
  /** Which library section the explorer pointed at, which is about no one element. */
  const library = hold?.of === "defs" ? hold : null;
  /** A registry held from the explorer, or opened on the canvas with nothing picked. */
  const registry = hold?.of === "registry" ? hold.registry
    : !hold && !picked.length ? registry_at(graph, layer) : null;
  const held_id = hold?.of === "id" && (def_at(graph, hold.id) || graph.blocks[hold.id]
    || entry_at(graph, hold.id)) ? hold.id : null;
  /** An interface picked on the canvas is about itself, though it is no block. */
  const port = picked.length === 1 && is_interface(graph, stored_of(graph, picked[0]!))
    ? picked[0]! : null;
  /** A registry's tile picked on the canvas is about its entry. */
  const entry = picked.length === 1 && entry_at(graph, picked[0]) ? picked[0]! : null;
  const about: Id = held_id ?? port ?? entry ?? about_of(graph, layer, picked);

  /** A new selection takes the light back, so no table lights what the tray is not about. */
  const on_canvas = picked.join();
  useEffect(() => set_lit(null), [on_canvas]);

  const context: Context = registry ? "registry" : library
    ? (library.only === "packages" ? "packages" : "library")
    : about === graph.root ? "root"
    : is_interface(graph, stored_of(graph, about)) || interface_at(graph, about) ? "interface"
    : tag_at(graph, about) || constraint_at(graph, about) ? "tag"
    : type_at(graph, about) ? "type"
    : graph.edges[about] ? "line"
    : def_at(graph, about) && domain_of(graph, about) === "relation" ? "relation"
    : def_at(graph, about) ? "definition" : "block";
  /** Whether the context is about lines rather than blocks. */
  const lined = context === "line" || context === "relation";

  /** A host's tabs lead a block's, and it opens on the first of them: they say what the block is
   *  in the host's own terms. */
  const hosted = context === "block" ? extras.map((x) => x.name) : [];
  /** What the app asks for, else what this family was last read on, else where it opens. */
  const tabs: string[] = [...hosted, ...SLOTS[context]];
  const family = FAMILY[context];
  /** A card's first tab and a line's are the same tab, named for what is drawn. */
  const alike = (t?: string) => (t === "card" || t === "line"
    ? tabs.find((x) => x === "card" || x === "line") : t);
  const tab: string = [props.tab, seen[family]].map(alike).find((t) => t && tabs.includes(t))
    ?? hosted[0] ?? OPENS[context] ?? tabs[tabs.length - 1]!;
  /** Picking a tab, even the one shown, turns the json off. */
  const set_tab = (t: string) => {
    set_raw(false);
    set_seen((s) => ({ ...s, [family]: t }));
    props.onTab?.(t);
  };

  /** Everything the panels do goes out. */
  const act: Act = (name, args) => onAct?.(name, args);
  /** What a read-only listing acts with: nothing. */
  const reads = edits ? act : NOOP;

  /** A reference holds nothing of its own — `of` is the whole of it — so its contents is the one
   *  it stands for, listed as a row like any other and offering the way there. */
  const points_at = of_ref(graph, about);
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
  const held_def = def_at(graph, about) ? about : def_of(graph, about) ?? null;

  /** What a table asks for: its own lit row, else what the canvas holds. Each table settles it
   *  against its own listing, since one table's row is not another's. */
  const asked_row = lit ? [lit] : picked;
  /** The contents listing, and what a reference stands for, each light one row. */
  const on_row = lit_row(shown, asked_row);
  const on_stood = lit_row(stood ? [stood] : [], asked_row);

  /** The head names the context, then says what sort it is: a definition — a tag or type
   *  among them — a package, a stand-in for a definition, a reference, a relation, or a usage. */
  const word = registry ? "registry" : library ? "definitions" : what_of(graph, about);
  const name = registry ? `${shown_name(graph, registry.pkg)} · ${registry.kind}`
    : library ? [library.from ?? (library.only === "all" ? "" : library.only),
                 library.group ? `${library.group}s` : ""].filter(Boolean).join(" · ")
    : def_at(graph, about) ? def_at(graph, about)!.name
    : tag_at(graph, about)?.name ?? type_at(graph, about)?.name ?? port_name(graph, about)
    ?? shown_name(graph, about);

  /** The definition an element follows, or itself, which the json chip reads as filed. */
  const filed = ELEMENTS.includes(context) ? held_def : null;
  /** What the body draws: the json, while the chip is on, else the tab. */
  const shows = raw && filed ? "json" : tab;

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
      tabTools={(
        <>
          {/* A usage may take a markdown file's card source; again, to refresh it. */}
          {edits && tab === "card" && graph.blocks[about] && !def_at(graph, about) ? (
            <button className="reset" title="copy a markdown file onto this card; again, to refresh"
                    onClick={() => act("@attach", { id: about })}>
              attach
            </button>
          ) : null}
          {onAct && tab === "settings" && def_at(graph, about) && !frozen(graph, about) ? (
            <button className="reset" disabled={!own_looks(graph, about)}
                    title="give every part of how it draws back to what it inherits"
                    onClick={() => act("none", { ids: [about] })}>
              reset style
            </button>
          ) : null}
          {filed ? (
            <button className={raw ? "reset on" : "reset"} aria-pressed={raw}
                    title="read the definition it follows as filed"
                    onClick={() => set_raw(!raw)}>
              json
            </button>
          ) : null}
        </>
      )}
    >
          {shows === "overview" ? (
            <Overview key={about} graph={graph} id={about}
                      {...(props.thumb ? { thumb: props.thumb } : {})}
                      {...(edits ? { onAct: act } : {})} />
          ) : null}
          {shows === "workspace" ? (
            <Workspace graph={graph} {...(edits ? { onAct: act } : {})}
                       onDisplay={props.onDisplay ?? act}
                       {...(props.display ? { display: props.display } : {})} />
          ) : null}
          {shows === "card" || shows === "line" || shows === "interface" || shows === "tag"
            || shows === "type" ? (
            <Element graph={graph} id={about} {...(edits ? { onAct: act } : {})}
                     onOpen={(id) => onHold({ of: "id", id })} />
          ) : null}
          {shows === "json" ? <Json graph={graph} id={about} /> : null}
          {/* How a definition draws, laid out as its card tab. */}
          {shows === "settings" ? (
            <Element graph={graph} id={about} keys="settings" {...(edits ? { onAct: act } : {})}
                     onOpen={(id) => onHold({ of: "id", id })} />
          ) : null}
          {/* Everything it carries: attributes a definition declares and a usage answers, its ports,
              its tags. */}
          {shows === "components" ? (
            <Carried key={about} graph={graph} id={about} {...(edits ? { onAct: act } : {})} />
          ) : null}
          {/* A host's own tab, for the block the tray is about. */}
          {extras.find((x) => x.name === shows)?.draw(about) ?? null}
          {/* The workspace's definitions for a library section; what one element may follow. */}
          {shows === "definitions" ? (
            <Definitions key={JSON.stringify(narrowed)} seed={narrowed} graph={graph}
                         follows={null} lines={[]} onAct={reads}
                         onOpen={(id) => onHold({ of: "id", id })} />
          ) : null}
          {/* A registry's entries, and where each is used. */}
          {shows === "entries" && registry ? (
            <Registry key={`${registry.pkg}/${registry.kind}`} graph={graph} registry={registry}
                      lit={lit} onLit={set_lit}
                      onHover={onHover} onOpen={(id) => onHold({ of: "id", id })}
                      {...(onView ? { onView: (id: Id) => onView(home_of(graph, id), id) } : {})} />
          ) : null}
          {/* What the workspace draws on, and how one more gets in. */}
          {shows === "packages" ? (
            <Packages graph={graph} offered={props.offered} onAct={reads} />
          ) : null}
          {shows === "usages" ? (
            <Usages graph={graph} group={lined ? "relation" : "block"}
                    scope={scope} onScope={set_scope}
                    layer={layer} about={held_def}
                    lit={asked_row} onLit={set_lit} onHover={onHover} onAct={reads}
                    {...(onView ? { onView: (id: Id) => onView(home_of(graph, id), id) } : {})}
                    home={(id) => home_of(graph, id)} />
          ) : null}

          {shows === "contents" && points_at ? (
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
          ) : shows === "contents" ? (
            <>
            {/* What it holds as text, over what it holds as blocks. */}
            <Content key={about} graph={graph} id={about} {...(edits ? { onAct: act } : {})} />
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
            </>
          ) : null}
    </TrayFrame>
  );
}

/** What an interface is called: its name, else its handle. */
function port_name(graph: Graph, id: Id): string | undefined {
  const port = graph.blocks[stored_of(graph, id)];
  if (!port || !is_interface(graph, port.id)) return undefined;
  return port.name ?? (port.alias ? alias_name("interface", port.alias) : "interface");
}
