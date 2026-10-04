/** The app, assembled. */

import { useEffect, useMemo, useRef, useState } from "react";
import { block_base, def_at, domain_of, layer_of, layout_of, offer, package_of, setting_of,
         session, tree_of, type Args, type Storage, type Dir, type Graph, type Id,
         type Point } from "@mnd/core";
import { FLOOR } from "@mnd/defs";
import { box_of, clear_of, forest_graph, holds, project, set_card as apply_card, tidy, BLOCK,
         CARD, FOREST, UNITS } from "@mnd/views";
import { Explorer, Menu, editor_slices, listed, useChain } from "@mnd/explorer";
import { Icon, WorkspaceHeader } from "@mnd/theme";
import { Stage, type Move } from "@mnd/stage";
import { Options, groups_of } from "@mnd/options";
import { Tray, useDisplay, useTray, type Offered } from "@mnd/tray";
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
                             net: browser_net(), catalogue: CATALOGUE, floor: FLOOR });
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
  /** The tray — open, its tab, what it holds — and how the drawing looks: chrome the shell
   *  holds and the log never sees, kept where every host keeps it. */
  const t = useTray();
  const { display, onDisplay } = useDisplay({ card: { ...UNITS.block }, range: CARD });
  /** Whether the terminal is shown, and whether it is expanded. */
  const [terminal, set_terminal] = useState(false);
  const [wide, set_wide] = useState(false);
  /** The mirror muted. */
  const [quiet, set_quiet] = useState(false);
  const [shown, set_shown] = useState({ interfaces: true, frame: true });
  /** The layers that have said otherwise about drawing their key. **A layer holding no answer
   *  follows the workspace**, so changing the default moves every layer that never disagreed. */
  const [keyed, set_keyed] = useState<Record<Id, boolean>>({});
  const { card, legend: legends, corner, lattice } = display;
  /** What a right drag draws, as the rail left it. */
  const [drawing, set_drawing] = useState<{ module: Id; dir?: Dir }>({ module: "line" });
  /** What help is pointing at. */
  const [pointed, set_pointed] = useState<readonly Id[]>([]);
  /** The tray row under the pointer, lit on the canvas where it is drawn. */
  const [hovered, set_hovered] = useState<Id | null>(null);
  const { hold } = t;
  /** The explorer's sections — a package, a definition, its structure — and what each holds. */
  const chain = useChain(s.graph(), SLICES);
  /** A selection made anywhere but the tray gives the context back to the canvas; a block picked
   *  is held in the section listing it — the one in focus first — and nothing above it moves. */
  const pick = (ids: Id[]) => {
    s.pick(ids);
    t.release();
    const one = ids.length === 1 ? ids[0]! : null;
    if (!one || !s.graph().blocks[one]) return;
    const order = [chain.at, ...SLICES.keys()];
    const at = order.find((n) => listed(s.graph(), SLICES[n]!, chain.held.slice(0, n), one));
    if (at !== undefined) chain.onChoose(at, one);
  };

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
  const laid_out = layout_of(graph, layer);
  /** What the canvas has open: a layer, or the forest above every package. */
  const here = layer ?? FOREST;
  const legend = keyed[here] ?? legends;

  /** The drawing's proportions are the views module's, so the session's card is applied before
   *  anything is placed. */
  apply_card(card.w, card.h);

  /** Projected once per graph, layer or proportion change. */
  const scene = useMemo(
    () => project(graph, layer, { interfaces: shown.interfaces }),
    [graph, layer, shown.interfaces, card]);

  /** **The canvas draws what was opened; the sections follow it.** Whatever opened a layer — a
   *  row, a double-click, the trail — the chain is traced to it: the forest to the packages, a
   *  package's domain to its definitions, a tree's structure to the structure. */
  useEffect(() => {
    if (layer === null) { chain.onTrace([chain.held[0] ?? graph.root], 0); return; }
    if (!graph.blocks[layer]) return;
    const pkg = package_of(graph, layer);
    const tree = tree_of(graph, layer);
    if (tree) chain.onTrace([pkg, tree], 2);
    else chain.onTrace([pkg, chain.held[1] ?? null], 1);
  }, [layer]);

  /** The forest, drawn while nothing is open: every package a box of its domain, folders
   *  flattened. Read only: picking a definition goes to its package's domain, picked there. */
  const forest = useMemo(() => (layer === null ? { graph: forest_graph(graph), scene } : null),
    [graph, layer, scene]);
  const forest_pick = (ids: Id[]) => {
    const one = ids[0];
    if (!one || !graph.blocks[one]) return;
    if (graph.blocks[one]!.parent === null) { open_layer(one); return; }
    s.look(layer_of(graph, one));
    s.pick([one]);
    chain.onTrace([package_of(graph, one), tree_of(graph, one) ?? one], 1);
  };
  const forest_act = (name: string, args?: Record<string, unknown>) => {
    const id = String(args?.["id"] ?? "");
    if (name === "open" && graph.blocks[id]) open_layer(id);
  };

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
    if (name === "frame") { set_shown((c) => ({ ...c, frame: !!args!["show"] })); return; }
    /** An answer that agrees with the workspace is dropped rather than stored, so the layer goes
     *  back to following the default instead of pinning today's value. */
    if (name === "legend") {
      const show = !!args!["show"];
      set_keyed(({ [here]: _was, ...rest }) =>
        show === legends ? rest : { ...rest, [here]: show });
      return;
    }
    /** The workspace's display answers, kept where every host keeps them. */
    if (["lattice", "legends", "legend_corner", "card"].includes(name)) {
      onDisplay(name, args);
      return;
    }
    if (name === "relate_with") {
      const dir = args!["dir"] ? String(args!["dir"]) as Dir : undefined;
      set_drawing({ module: args!["module"] as Id,
                    ...(dir && dir !== "none" ? { dir } : {}) });
      return;
    }
    /** Leaving a computed layout writes its positions so `free` keeps them. */
    if (name === "layout") {
      const leaving = laid_out !== "free" && args!["kind"] === "free";
      act("layout", { layer, ...args, ...(leaving ? { at: tidy(graph, layer) } : {}) });
      return;
    }
    /** A package by name, fetched from the catalogue and brought in beside the workspace, frozen. */
    if (name === "@package") { void s.search(String(args!["name"])); return; }
    /** Where the tray is pointed; writes nothing. */
    if (name === "about") {
      const want = String(args!["scope"]);
      if (want === "canvas") { t.release(); return; }
      s.pick([]);
      t.onHold(want === "workspace" ? { of: "id", id: graph.root }
               : { of: "draft", group: want === "relation" ? "relation" : "block" });
      t.onOpen(true);
      t.onTab(want === "workspace" ? "workspace" : "element");
      return;
    }
    act(name, args);
  };

  /** **The explorer browses**: a row chosen is held in its section and shown in the tray, and the
   *  canvas stays where it is. A package points the tray at its definitions. */
  const choose = (at: number, id: Id | null) => {
    chain.onChoose(at, id);
    if (at === 0) {
      const pack = id ? graph.blocks[id]?.name ?? id : undefined;
      t.onSection({ of: "defs", only: "packages", ...(pack ? { from: pack } : {}) });
      return;
    }
    t.release();
    if (id && graph.blocks[id]) s.pick([id]);
  };

  /** A layer opened, with nothing picked on it. */
  const open_layer = (id: Id | null) => { s.look(id); t.release(); };

  /** A row opened — Enter, a double click, → — moves the canvas: a package to its domain, a holder
   *  or a tree onto itself, and a part of a definition seen through a usage to that definition,
   *  the part picked there. */
  const opened = ({ id, via }: { at: number; id: Id; via?: Id }) => {
    if (via) { s.look(layer_of(graph, id)); s.pick([id]); t.release(); return; }
    open_layer(id);
  };

  /** ← and Backspace: the canvas leaves for the layer the open one is drawn on, the forest above a
   *  package. */
  const leave = () => { s.go("open", {}); t.release(); };

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
      <WorkspaceHeader brand="mndflow"
        where={
          <button className="where" title="This session is kept in the browser. Export a snapshot to keep a copy elsewhere."
                  onClick={() => void s.save()}>
            {Object.values(graph.blocks).filter((b) => !b.def && b.parent).length} blocks · {s.log().length} steps
          </button>
        }>
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
      </WorkspaceHeader>

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
        onOpen={opened}
        onLeave={leave}
        chain={{ ...chain, onChoose: choose }}
        keys
      />

      <main>
        <Stage
          scene={forest?.scene ?? scene}
          graph={forest?.graph ?? graph}
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
            if (forest) return;
            if (graph.blocks[id]?.def) {
              const made = dropped(graph, id, land.line ?? land.over, at, layer);
              if (typeof made === "string") s.say(made, "note"); else s.go(...made);
              return;
            }
            /** Onto a cell, the stand-in is seated there — which is how a header heads a block. */
            const cell = land.cell && land.into
              ? { parent: land.into, at: `${land.cell.r},${land.cell.c}` } : {};
            s.go("refer", { target: id, spot: at, ...cell });
          }}
          picked={s.picked()}
          cells={s.cells()}
          onPickCells={(cells) => {
            /** A click lets go of what the canvas cannot show. */
            if (!cells.length) s.pick(s.picked().filter((id) => drawn.has(id)));
            s.pick_cells(cells); t.release();
          }}
          lattice={lattice ?? true}
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
            if (forest) { forest_pick(ids); return; }
            const shown = s.picked().filter((id) => drawn.has(id));
            const echo = shown.length < s.picked().length && ids.length === shown.length
              && ids.every((id) => shown.includes(id));
            if (!echo) pick(ids);
          }}
          onAct={forest ? forest_act : act}
          onAdjust={forest ? () => undefined : adjust}
        />
        <Tray
          graph={graph}
          layer={layer}
          open={t.open}
          onOpen={t.onOpen}
          {...(t.tab ? { tab: t.tab } : {})}
          onTab={t.onTab}
          picked={s.picked()}
          onHover={set_hovered}
          hold={hold}
          onHold={t.onHold}
          onView={(home, id) => { s.look(home); s.pick([id]); t.release(); }}
          offered={offered}
          display={display}
          onAct={chrome}
        />
      </main>

      <Options groups={groups_of({ slots: scene.slots, layout: laid_out,
                                   interfaces: shown.interfaces,
                                   lattice: lattice ?? true, frame: shown.frame,
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

/** The editor's sections, made once. */
const SLICES = editor_slices();

/** What a kind needs that the empty drawing cannot give it, in words. */
const NEEDS: Record<string, string> = {
  interface: "an interface sits on a block — add one to a block, then drop this onto it",
  reference: "a reference stands for a block — drag that block from the tree instead",
  tag: "a tag is carried, not placed — type it into a block's tags in the tray",
};

/** What a dragged definition does: one carrying a tie is made and tied to the block it lands on;
 *  any other retypes what it lands on, or makes one on the empty drawing. Refused in words where
 *  none can be. */
function dropped(graph: Graph, type: Id, on: Id | null, at: Point,
                 layer: Id | null): [string, Args] | string {
  const ties = typeof setting_of(graph, type, "tie")["type"] === "string";
  if (on && ties && graph.blocks[on]) {
    return ["create", { name: "", type, parent: layer ?? graph.root, spot: at, from: on }];
  }
  if (on) return ["retype", { ids: [on], type }];
  if (def_at(graph, type) && domain_of(graph, type) === "relation") {
    return "lines must connect existing blocks — draw one from a block to another";
  }
  const kind = block_base(graph, type);
  if (NEEDS[kind]) return NEEDS[kind]!;
  return ["create", { name: "", type, parent: layer ?? graph.root, spot: at }];
}
