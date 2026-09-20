/** The app, assembled. */

import { useEffect, useMemo, useRef, useState } from "react";
import { block_base, offer, session,
         type Args, type Storage, type Dir, type Graph, type Id, type Point } from "@mnd/core";
import { seed } from "@mnd/defs";
import { box_of, clear_of, holds, project, set_card as apply_card, tidy,
         BLOCK, CARD, UNITS } from "@mnd/views";
import { Explorer, Menu, type Section } from "@mnd/explorer";
import { Icon } from "@mnd/theme";
import { Stage, type Corner, type Move } from "@mnd/stage";
import { Options, groups_of } from "@mnd/options";
import { Tray, type Hold, type Offered, type Tab } from "@mnd/tray";
import { Terminal, type Match } from "@mnd/terminal";
import { browser_files, browser_net } from "./ports";
import { browser_score } from "./score";

/** The three looks, each with the mark it wears. */
const THEMES = [
  { name: "retro", icon: "theme_retro" },
  { name: "modern", icon: "theme_modern" },
  { name: "light", icon: "theme_light" },
] as const;

/** One scorer for the app, since it holds a cache. */
const scoring = browser_score();

/** Where this host keeps its definition packages. */
const CATALOGUE = "/packages/index.json";

export function App({ storage }: { storage: Storage }) {
  /** The session, made once. */
  const held = useRef<ReturnType<typeof session> | null>(null);
  held.current ??= session({ storage, files: browser_files(),
                             net: browser_net(), catalogue: CATALOGUE, defs: seed() });
  const s = held.current;
  const [, bump] = useState(0);
  const [folded, set_folded] = useState<Id[]>([]);
  /** What the catalogue offers, read once. An unbound `net` leaves it empty. */
  const [offered, set_offered] = useState<readonly Offered[]>([]);
  useEffect(() => { void s.listing().then(set_offered); }, [s]);
  const [theme, set_theme] = useState<string>(
    () => localStorage.getItem("mnd.theme") ?? "retro");
  const look = THEMES.find((t) => t.name === theme) ?? THEMES[0];
  const next_look = THEMES[(THEMES.indexOf(look) + 1) % THEMES.length]!;
  /** Chrome the shell holds and the log never sees. */
  const [tray, set_tray] = useState(false);
  /** Which tray tab is open. */
  const [tab, set_tab] = useState<Tab>("contents");
  /** Whether the terminal is shown, and whether it is expanded. */
  const [terminal, set_terminal] = useState(false);
  const [wide, set_wide] = useState(false);
  /** The mirror muted. */
  const [quiet, set_quiet] = useState(false);
  const [shown, set_shown] = useState({ interfaces: true, lattice: true, frame: true });
  /** Whether a layer draws the key to itself: what the workspace says, and the layers that have
   *  said otherwise. **A layer holding no answer follows the workspace**, so changing the default
   *  moves every layer that never disagreed. Display, so the log never sees it and no file
   *  carries it. */
  const [legends, set_legends] = useState(false);
  const [keyed, set_keyed] = useState<Record<Id, boolean>>({});
  /** Which right-hand corner the key keeps to. */
  const [corner, set_corner] = useState<Corner>("top");
  /** The default card, in units. Display, so it is the session's and no file carries it. */
  const [card, set_card] = useState(() => ({ ...UNITS.block }));
  /** What a right drag draws, as the rail left it. */
  const [drawing, set_drawing] = useState<{ module: Id; dir?: Dir }>({ module: "line" });
  /** What help is pointing at. */
  const [pointed, set_pointed] = useState<readonly Id[]>([]);
  /** The tray row under the pointer, lit on the canvas where it is drawn. */
  const [hovered, set_hovered] = useState<Id | null>(null);
  /** What the tray holds that the canvas did not give it; any other selection drops it. */
  const [hold, set_hold] = useState<Hold | null>(null);
  /** Which library row the explorer lights: whatever the tray has hold of. */
  const section: Section | null =
    hold?.of === "defs" ? hold
    : hold?.of === "id" && hold.id !== s.graph().root ? { of: "def", id: hold.id } : null;
  /** A selection made anywhere but the tray gives the context back to the canvas. */
  const pick = (ids: Id[]) => { s.pick(ids); set_hold(null); };

  useEffect(() => { s.watch(() => bump((n) => n + 1)); }, [s]);
  useEffect(() => {
    const full = () => s.say("storage is full — export to keep this work", "note");
    window.addEventListener("mnd:full", full);
    return () => window.removeEventListener("mnd:full", full);
  }, [s]);
  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    localStorage.setItem("mnd.theme", theme);
  }, [theme]);

  const graph = s.graph();
  const layer = s.layer();
  const said = s.said();
  const arranged = graph.blocks[layer ?? graph.root]?.arrangement ?? "free";
  /** The root stands in for the workspace layer, which has no id of its own. */
  const here = layer ?? graph.root;
  const legend = keyed[here] ?? legends;

  /** The drawing's proportions are the views module's, so the session's card is applied before
   *  anything is placed. */
  apply_card(card.w, card.h);

  /** Projected once per graph, layer or proportion change. */
  const scene = useMemo(
    () => project(graph, layer, { interfaces: shown.interfaces }),
    [graph, layer, shown.interfaces, card]);

  /** What the open layer draws, by id. */
  const drawn = useMemo(() => new Set([...scene.nodes.map((n) => n.id),
                                       ...scene.edges.map((e) => e.id)]), [scene]);

  /** What is offered here, read off the registry for help. */
  const offered_here = offer({ graph, layer, picked: s.picked(), cells: s.cells() }).map((a) => ({
    name: a.name,
    about: a.about,
    asks: a.args.filter((g) => g.required).map((g) => g.name).join(", "),
    on: a.on.some((scope) => scope === "layer") && !s.picked().length
      ? (layer ? [layer] : [])
      : s.picked(),
  }));

  const act = (name: string, args?: Record<string, unknown>) => {
    /** Undo and redo arrive through the same channel as actions. */
    if (name === "undo") { s.undo(); return; }
    if (name === "redo") { s.redo(); return; }
    s.go(name, args ?? {});
  };

  /** One gesture, one step: every write an adjustment comes to. */
  const adjust = (moves: readonly Move[]) => s.batch(() => {
    for (const m of moves) {
      if ("act" in m) s.go(m.act, m.args);
      else s.adjust(m.adjust, m.mutations);
    }
  });

  /** The rail's controls: display state here, everything else an action. */
  const chrome = (name: string, args?: Record<string, unknown>) => {
    if (name === "interfaces") { set_shown((c) => ({ ...c, interfaces: !!args!["show"] })); return; }
    if (name === "lattice") { set_shown((c) => ({ ...c, lattice: !!args!["show"] })); return; }
    if (name === "frame") { set_shown((c) => ({ ...c, frame: !!args!["show"] })); return; }
    /** An answer that agrees with the workspace is dropped rather than stored, so the layer goes
     *  back to following the default instead of pinning today's value. */
    if (name === "legend") {
      const show = !!args!["show"];
      set_keyed(({ [here]: _was, ...rest }) =>
        show === legends ? rest : { ...rest, [here]: show });
      return;
    }
    if (name === "legends") { set_legends(!!args!["show"]); return; }
    if (name === "legend_corner") { set_corner(args!["at"] as Corner); return; }
    /** Applied where the proportions live, and kept as the range there allowed. */
    if (name === "card") {
      set_card(apply_card(Number(args!["w"]), Number(args!["h"])));
      return;
    }
    if (name === "relate_with") {
      const dir = args!["dir"] ? String(args!["dir"]) as Dir : undefined;
      set_drawing({ module: args!["module"] as Id,
                    ...(dir && dir !== "none" ? { dir } : {}) });
      return;
    }
    /** Leaving `grid` writes the grid's positions so `free` keeps them. */
    if (name === "arrange") {
      const how = args!["arrangement"];
      const leaving = arranged === "grid" && how === "free";
      act("arrange", { layer, ...args,
                       ...(leaving ? { at: tidy(graph, layer) } : {}) });
      return;
    }
    /** A package by name, fetched from the catalogue and grafted through the door. */
    if (name === "@package") { void s.search(String(args!["name"])); return; }
    /** Where the tray is pointed; writes nothing. */
    if (name === "about") {
      const want = String(args!["scope"]);
      if (want === "canvas") { set_hold(null); return; }
      s.pick([]);
      set_hold(want === "workspace" ? { of: "id", id: graph.root }
               : { of: "draft", group: want === "relation" ? "relation" : "block" });
      set_tray(true);
      set_tab(want === "workspace" ? "workspace" : "element");
      return;
    }
    act(name, args);
  };

  /** The terminal's commands; help is the fallback. */
  const command = (match: Match) => {
    if (match.command === "add") { act("create", { name: match.rest }); return; }
    if (match.command === "search") { void s.search(match.rest); return; }
    s.say(`${match.command} is not built yet — “${match.rest}”`);
  };

  const load = async () => {
    const text = await browser_files().open();
    if (text !== null) s.load(text);
  };

  return (
    <div className="app">
      <header>
        {/* Identity, and the size of what is under it. */}
        <span className="identity">
          <h1>mndflow</h1>
          <button className="where" title="This session is kept in the browser. Export a snapshot to keep a copy elsewhere."
                  onClick={() => void s.save()}>
            {Object.keys(graph.blocks).length - 1} blocks · {s.log().length} steps
          </button>
        </span>

        <span className="tools">
          <button title="undo" onClick={() => s.undo()}><Icon name="undo" /></button>
          <button title="redo" onClick={() => s.redo()}><Icon name="redo" /></button>
          <button title="export the workspace" onClick={() => void s.save()}>
            <Icon name="export_workspace" />
          </button>
          <button title="import a workspace" onClick={() => void load()}>
            <Icon name="import_file" />
          </button>
          {/* The one control that cannot be undone, so it asks first. */}
          <button title="start a new workspace" onClick={() => {
            if (confirm("Start a new workspace? This session is replaced, and it cannot be undone. Export first to keep a copy.")) s.reset();
          }}><Icon name="remove" /></button>
          <button title="the terminal" aria-pressed={terminal}
                  onClick={() => set_terminal((t) => !t)}><Icon name="terminal" /></button>
          <button title={`theme: ${theme} — click for ${next_look.name}`}
                  onClick={() => set_theme(next_look.name)}>
            <Icon name={look.icon} />
          </button>
        </span>
      </header>

      {terminal ? (
        <Terminal
          offered={offered_here}
          said={quiet && said?.kind === "mirror" ? null : said?.text ?? null}
          context={layer ? `in ${graph.blocks[layer]?.name ?? "a layer"}` : "the workspace"}
          expanded={wide}
          onExpand={set_wide}
          onAct={(name) => act(name)}
          onCommand={command}
          score={scoring}
          quiet={quiet}
          onQuiet={set_quiet}
          onPoint={(o) => set_pointed((was) => {
            const now = o?.on ?? [];
            return was.length === now.length && was.every((id, n) => id === now[n]) ? was : now;
          })}
        />
      ) : null}

      <Explorer
        graph={graph}
        open={layer}
        picked={s.picked()}
        folded={folded}
        lit={pointed}
        onAct={act}
        onFold={(id, shut) =>
          set_folded((f) => (shut ? [...new Set([...f, id])] : f.filter((x) => x !== id)))}
        onPick={pick}
        section={section}
        /** A library row points the tray: a definition at its element tab, a folder at its list. */
        onSection={(at) => {
          s.pick([]);
          set_tray(true);
          if (at.of === "def") { set_hold({ of: "id", id: at.id }); set_tab("element"); return; }
          set_hold(at);
          /** The packages section opens on what the workspace draws on. */
          set_tab(at.of === "defs" && at.only === "packages" ? "packages" : "definitions");
        }}
      />

      <main>
        <Stage
          scene={scene}
          graph={graph}
          /** The shared menu; a right-click inside the selection is about the selection. */
          menu={(at, on, shut, spot, only, given) => (
            <Menu ctx={{ graph, layer, cells: s.cells(),
                         picked: !on ? [...s.picked()]
                               : s.picked().includes(on) ? [...s.picked()] : [on] }}
                  at={at} spot={spot} only={only} given={given}
                  onAct={act} onShut={shut} />
          )}
          /** A block dropped on the drawing arrives as a reference; a definition retypes what it
           *  lands on, or makes one where nothing is. */
          onDrop={(id, spot, land) => {
            /** Where the pointer was, clear of what is already there. */
            const at = clear_of(
              scene.nodes.filter((n) => n.id !== id && !holds(n) && !n.data.on)
                         .map(box_of),
              { x: spot.x - BLOCK.w / 2, y: spot.y - BLOCK.h / 2 }, BLOCK);
            if (!graph.blocks[id] && graph.defs[id]) {
              const made = dropped(graph, id, land.line ?? land.over, at, layer);
              if (typeof made === "string") s.say(made, "note"); else s.go(...made);
              return;
            }
            s.go("refer", { target: id, spot: at });
          }}
          picked={s.picked()}
          cells={s.cells()}
          onPickCells={(cells) => {
            /** A click lets go of what the canvas cannot show. */
            if (!cells.length) s.pick(s.picked().filter((id) => drawn.has(id)));
            s.pick_cells(cells); set_hold(null);
          }}
          lattice={shown.lattice}
          frame={shown.frame}
          legend={legend}
          corner={corner}
          module={drawing.module}
          {...(drawing.dir ? { dir: drawing.dir } : {})}
          said={said?.text ?? null}
          onSaid={() => s.say("")}
          lit={hovered && drawn.has(hovered) ? [hovered] : []}
          /** An echo of a pick the canvas cannot draw is not a gesture. */
          onPick={(ids) => {
            const shown = s.picked().filter((id) => drawn.has(id));
            const echo = shown.length < s.picked().length && ids.length === shown.length
              && ids.every((id) => shown.includes(id));
            if (!echo) pick(ids);
          }}
          onAct={act}
          onAdjust={adjust}
        />
        <Tray
          graph={graph}
          layer={layer}
          open={tray}
          onOpen={set_tray}
          tab={tab}
          onTab={set_tab}
          picked={s.picked()}
          /** The tray's tables select without dropping its hold. */
          onPick={(ids) => s.pick(ids)}
          onHover={set_hovered}
          hold={hold}
          onHold={set_hold}
          onView={(home, id) => { s.look(home); s.pick([id]); set_hold(null); }}
          offered={offered}
          display={{ card, range: CARD, legend: legends, corner }}
          onAct={chrome}
        />
      </main>

      <Options groups={groups_of({ slots: scene.slots, arrangement: arranged,
                                   interfaces: shown.interfaces,
                                   lattice: shown.lattice, frame: shown.frame,
                                   legend,
                                   /** Which settings toggle is lit. */
                                   held: hold?.of === "draft" ? hold.group
                                     : hold?.of === "id" ? (hold.id === graph.root ? "workspace" : null)
                                     : layer === null && s.picked().length !== 1 ? "workspace" : null,
                                   module: drawing.module,
                                   ...(drawing.dir ? { dir: drawing.dir } : {}) },
                                 chrome)} />
    </div>
  );
}

/** A grid dragged out arrives two by two. */
const GRID = { rows: 2, cols: 2 };

/** What a kind needs that the empty drawing cannot give it, in words. */
const NEEDS: Record<string, string> = {
  interface: "an interface sits on a block — add one to a block, then drop this onto it",
  note: "a note is about a block — add one to a block, then drop this onto it",
  reference: "a reference stands for a block — drag that block from the tree instead",
};

/** What a dragged definition does: retypes the element it lands on, or makes one on the empty
 *  drawing. Refused in words where neither can be. The retype says its own refusal. */
function dropped(graph: Graph, type: Id, on: Id | null, at: Point,
                 layer: Id | null): [string, Args] | string {
  if (on) return ["retype", { ids: [on], type }];
  if (graph.defs[type]?.group === "relation") return "lines must connect existing blocks — draw one from a block to another";
  const kind = block_base(graph, type);
  if (NEEDS[kind]) return NEEDS[kind]!;
  if (kind === "grid") return ["group", { ...GRID, type, spot: at }];
  return ["create", { name: "", type, parent: layer ?? graph.root, spot: at }];
}
