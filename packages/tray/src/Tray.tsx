/** The context tray: one shell, **one tab set for every element** — overview, card, settings,
 *  components, usages, contents, always in that order — a tab that does not apply drawn faint and
 *  inert, never hidden. The workspace and a package are elements too, each scoped to what it
 *  holds; a library section shows the workspace, a package row its package.
 *
 *  Given no `onAct` it is read only: the same tabs, and nothing in them takes input. A host adds
 *  tabs of its own for blocks through `extras`. */

import { useEffect, useState, type ReactNode } from "react";
import { about_of, alias_name, constraint_at, def_at, domain_of, entry_at, frozen, interface_at,
         is_definition, is_interface, may_seat, of_ref, owner_of, registry_at, resolved,
         shown_name, stored_of, tag_at, type_at, type Act, type Graph, type Id,
         type Registry as Of } from "@mnd/core";
import { Facts, TrayFrame } from "@mnd/theme";
import { colour_of, facts_of, kind_of, tint_attrs, wire_of, wire_tint } from "@mnd/views";
import { Attributes } from "./Attributes";
import { Band, NOOP } from "./Body";
import { Carried } from "./Carried";
import { Contents, DEFINITIONS, holds_any } from "./Contents";
import { type Shelf } from "./Definitions";
import { Element } from "./Element";
import { Json } from "./Json";
import { ALL, Lead } from "./Lists";
import { Overview } from "./Overview";
import { Packages, type Offered } from "./Packages";
import { Registries } from "./Registry";
import { Usages } from "./Usages";
import { type WalkProps } from "./Walk";
import { DisplaySettings, type Display } from "./Workspace";

/** What the tray holds that the canvas did not give it. */
export type Hold =
  | { of: "id"; id: Id }
  /** A library section in the explorer: the workspace's definitions, or a package's. */
  | ({ of: "defs" } & Shelf)
  /** A package's registry of types or tags: its package, on that kind. */
  | { of: "registry"; registry: Of };

export type TrayProps = {
  graph: Graph;
  layer: Id | null;
  /** The side the canvas looks at: what reading offers there, and the way across. */
  lists?: "domain" | "structure";
  open: boolean;
  onOpen: (open: boolean) => void;
  /** What the canvas has, which is what the tray is about. The tray never sets it: a table
   *  lights a row of its own, and *view* is what asks for the selection to move. */
  picked: readonly Id[];
  /** Hovering a row lights that thing on the stage. */
  onHover?: (id: Id | null) => void;
  /** **What a table lights**, told so the canvas lights it too: what the tray is about, when it
   *  shows a list rather than one element. */
  onLit?: (id: Id | null) => void;
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
  /** How the shell draws, for the workspace's settings to set. Absent leaves them faint. */
  display?: Display;
  /** Where the workspace's display answers go; `onAct` where absent. */
  onDisplay?: Act;
  /** The host's own tabs for a block, after the tray's: a name, and what it draws. */
  extras?: readonly Extra[];
  /** A walked model's stack and step, leading the overview. */
  walk?: WalkProps | null;
};

/** A host's tab: what it is called, and what it shows for the block the tray is about. */
export type Extra = { name: string; draw: (about: Id) => ReactNode };

/** **The one tab set**, in its one order. */
const TABS = ["overview", "card", "settings", "components", "usages", "contents"] as const;
export type Tab = (typeof TABS)[number];

/** What the tray is about: an element — a block, a line, a definition of either — the workspace,
 *  a package, or a library entry (an interface, a tag, a type, a constraint). */
type Context = "block" | "line" | "definition" | "relation" | "workspace" | "package" | "entry";

/** The contexts about one element, which carry a json chip. */
const ELEMENTS: readonly Context[] = ["block", "line", "definition", "relation"];

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

/** **Which tabs apply**: every element is asked the same questions; a use draws as its
 *  definition says, so it has no settings, and is not used, so it has no usages; contents applies
 *  to whatever holds anything. */
function applies(graph: Graph, context: Context, about: Id, display: boolean): Set<Tab> {
  const holds: Tab[] = holds_any(graph, about) ? ["contents"] : [];
  const on: Record<Context, readonly Tab[]> = {
    block: ["overview", "card", "components", ...holds],
    line: ["overview", "card", "components"],
    definition: ["overview", "card", "settings", "components", "usages", ...holds],
    relation: ["overview", "card", "settings", "components", "usages"],
    workspace: ["overview", ...(display ? ["settings" as const] : []), "components", "contents"],
    package: ["overview", "components", "contents"],
    entry: ["card"],
  };
  return new Set(on[context]);
}

export function Tray(props: TrayProps) {
  const { graph, layer, open, onOpen, picked, onHover, onLit, onAct, onView,
          hold = null, onHold = () => {}, extras = [] } = props;
  /** Whether anything here takes input. */
  const edits = !!onAct;
  /** The tab each context was last read on. */
  const [seen, set_seen] = useState<Record<string, string>>({});
  /** Full height, as a control of its own. */
  const [big, set_big] = useState(false);
  /** Whether the body reads as the JSON it follows, kept as the context moves. */
  const [raw, set_raw] = useState(false);
  /** The row lit in a table, which is the tray's own and moves nothing. */
  const [lit, set_lit] = useState<Id | null>(null);

  /** What the explorer pointed at: a library section, a registry. */
  const shelf = hold?.of === "defs" ? hold : null;
  const registry = hold?.of === "registry" ? hold.registry
    : !hold && !picked.length ? registry_at(graph, layer) : null;
  const held_id = hold?.of === "id" && (def_at(graph, hold.id) || graph.blocks[hold.id]
    || entry_at(graph, hold.id)) ? hold.id : null;
  /** An interface picked on the canvas is about itself, though it is no block. */
  const port = picked.length === 1 && is_interface(graph, stored_of(graph, picked[0]!))
    ? picked[0]! : null;
  /** A registry's tile picked on the canvas is about its entry. */
  const entry = picked.length === 1 && entry_at(graph, picked[0]) ? picked[0]! : null;
  /** What the tray is about: a hold — a library section is the workspace, a registry its
   *  package — else the one thing picked, else the open layer. */
  const about: Id = held_id ?? registry?.pkg ?? (shelf ? graph.root : null)
    ?? port ?? entry ?? about_of(graph, layer, picked);

  /** A new selection takes the light back, so no table lights what the tray is not about. */
  const on_canvas = picked.join();
  useEffect(() => set_lit(null), [on_canvas]);

  const context: Context = about === graph.root ? "workspace"
    : graph.blocks[about]?.parent === null ? "package"
    : is_interface(graph, stored_of(graph, about)) || interface_at(graph, about)
      || tag_at(graph, about) || constraint_at(graph, about) || type_at(graph, about) ? "entry"
    : graph.edges[about] ? "line"
    : def_at(graph, about) && domain_of(graph, about) === "relation" ? "relation"
    : def_at(graph, about) ? "definition" : "block";
  const on = applies(graph, context, about, !!props.display);

  /** **Each tab's filter**, kept while the element stays and reset to *all* when it changes. A
   *  library section and a package open on their definitions; a registry, on its kind. */
  const [chosen, set_chosen] = useState<{ about: Id; by: Record<string, string> }>(
    { about, by: {} });
  const by = chosen.about === about ? chosen.by : {};
  const filter = (t: Tab) => by[t] ?? (t === "contents" && (shelf || context === "package")
    ? DEFINITIONS
    : t === "components" && registry ? registry.kind : ALL);
  const choose = (t: Tab) => (key: string) => set_chosen({ about, by: { ...by, [t]: key } });

  /** A host's tabs lead a block's, and it opens on the first of them: they say what the block is
   *  in the host's own terms. */
  const hosted = context === "block" ? extras.map((x) => x.name) : [];
  const tabs: string[] = [...hosted, ...TABS];
  const off = TABS.filter((t) => !on.has(t));
  /** What the host asks for, else what this context was last read on, else the first that
   *  applies. */
  const tab: string = [props.tab, seen[context]]
    .find((t) => !!t && (hosted.includes(t) || on.has(t as Tab)))
    ?? hosted[0] ?? TABS.find((t) => on.has(t))!;
  /** Picking a tab, even the one shown, turns the json off. */
  const set_tab = (t: string) => {
    set_raw(false);
    set_seen((s) => ({ ...s, [context]: t }));
    props.onTab?.(t);
  };

  /** Everything the panels do goes out. */
  const act: Act = (name, args) => onAct?.(name, args);
  const open_id = (id: Id) => onHold({ of: "id", id });
  const view = onView ? (id: Id) => onView(home_of(graph, id), id) : undefined;

  /** The head names the context: an element by its identity row, the rest by a word. */
  const lined = context === "line" || context === "relation";
  const word = what_of(graph, about);
  const name = def_at(graph, about)?.name ?? tag_at(graph, about)?.name
    ?? type_at(graph, about)?.name ?? port_name(graph, about) ?? shown_name(graph, about);
  const element = ELEMENTS.includes(context);
  const identity = element ? {
    kind: kind_of(graph, about),
    role: (is_definition(graph, about) ? "definition" : "use") as "definition" | "use",
    tint: lined && graph.edges[about] ? wire_tint(wire_of(graph, about))
      : tint_attrs(colour_of(graph, about)),
    ...(graph.blocks[about] ? {
      facts: <Facts facts={facts_of(graph, about, !!graph.blocks[about]!.def)} named />,
    } : {}),
  } : {};

  /** **The json chip**: a definition's record, read as filed; faint on a use, which has none. */
  const record = element && !!def_at(graph, about);
  const shows = raw && record ? "json" : tab;
  /** The lit row of the table shown, told to the host: a pick in a list, the tray's own. */
  const told = shows === "contents" || (shows === "components" && context === "package")
    ? lit : null;
  useEffect(() => onLit?.(told), [told]);

  return (
    <TrayFrame
      open={open}
      onOpen={onOpen}
      big={big}
      onBig={set_big}
      word={word}
      {...(name ? { name } : {})}
      {...identity}
      {...(picked.length > 1 && !hold ? { note: `${picked.length} items` } : {})}
      tabs={tabs}
      off={off}
      tab={tab}
      onTab={set_tab}
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
          {element ? (
            <button className={raw && record ? "reset on" : "reset"} aria-pressed={raw && record}
                    disabled={!record}
                    title={record ? "read the definition as filed" : "a use has no record of its own"}
                    onClick={() => set_raw(!raw)}>
              json
            </button>
          ) : null}
        </>
      )}
    >
      {shows === "json" ? <Json graph={graph} id={about} /> : null}
      {shows === "overview" ? (
        <Overview key={about} graph={graph} id={about} {...(edits ? { onAct: act } : {})}
                  {...(props.lists ? { lists: props.lists } : {})}
                  {...(props.walk ? { walk: props.walk } : {})} />
      ) : null}
      {/* What it is: a card's keys, a line's keys and ends, an entry's. Edits come second, here:
          declaring and answering attributes, and a port put on its wall. */}
      {shows === "card" ? (
        <Element graph={graph} id={about} {...(edits ? { onAct: act } : {})} onOpen={open_id}>
          {edits && graph.blocks[about] ? (
            <div className="card-edits">
              <Band label="attributes" />
              <Attributes key={about} graph={graph} id={about} onAct={act} />
              {may_seat(graph, about) && !frozen(graph, about) ? (
                <button className="chip" title="put a port on its wall"
                        onClick={() => act("interface", { owner: about })}>add port</button>
              ) : null}
            </div>
          ) : null}
        </Element>
      ) : null}
      {/* How it draws: a definition's keys; the workspace's display. */}
      {shows === "settings" && context === "workspace" && props.display ? (
        <div className="reads">
          <Lead graph={graph} id={about} />
          <div className="lists">
            <DisplaySettings display={props.display} onAct={props.onDisplay ?? act} />
          </div>
        </div>
      ) : shows === "settings" ? (
        <Element graph={graph} id={about} keys="settings" {...(edits ? { onAct: act } : {})}
                 onOpen={open_id} />
      ) : null}
      {/* What it carries: an element's members; what the workspace draws on; a package's
          library. */}
      {shows === "components" && context === "workspace" ? (
        <Packages graph={graph} offered={props.offered} on={filter("components")}
                  onPick={choose("components")} onAct={edits ? act : NOOP} />
      ) : shows === "components" && context === "package" ? (
        <Registries graph={graph} pkg={about} on={filter("components")}
                    onPick={choose("components")} lit={lit} onLit={set_lit} onOpen={open_id}
                    {...(onHover ? { onHover } : {})} {...(view ? { onView: view } : {})} />
      ) : shows === "components" ? (
        <Carried key={about} graph={graph} id={about} on={filter("components")}
                 onPick={choose("components")} />
      ) : null}
      {shows === "usages" ? (
        <Usages key={about} graph={graph} id={about} on={filter("usages")}
                onPick={choose("usages")} {...(onHover ? { onHover } : {})}
                {...(view ? { onView: view } : {})} />
      ) : null}
      {shows === "contents" ? (
        <Contents key={about} graph={graph} id={about} picked={picked} on={filter("contents")}
                  onPick={choose("contents")} lit={lit} onLit={set_lit} onOpen={open_id}
                  {...(shelf ? { shelf } : {})} {...(onHover ? { onHover } : {})}
                  {...(view ? { onView: view } : {})} {...(edits ? { onAct: act } : {})} />
      ) : null}
      {/* A host's own tab, for the block the tray is about. */}
      {extras.find((x) => x.name === shows)?.draw(about) ?? null}
    </TrayFrame>
  );
}

/** What an interface is called: its name, else its handle. */
function port_name(graph: Graph, id: Id): string | undefined {
  const port = graph.blocks[stored_of(graph, id)];
  if (!port || !is_interface(graph, port.id)) return undefined;
  return port.name ?? (port.alias ? alias_name("interface", port.alias) : "interface");
}
