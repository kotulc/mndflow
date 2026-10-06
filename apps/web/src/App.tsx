/** The app, assembled. */

import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { drop_of, held_at, layout_of, session, EDITOR, type ViewKind, type Storage,
         type Dir, type Id } from "@mnd/core";
import { FLOOR } from "@mnd/defs";
import { box_of, clear_of, holds, project, set_card as apply_card, tidy, BLOCK,
         CARD, UNITS } from "@mnd/views";
import { Explorer, Menu, editor_slices, useChain } from "@mnd/explorer";
import { Icon, WorkspaceHeader } from "@mnd/theme";
import { Stage, type Move } from "@mnd/stage";
import { Options, groups_of } from "@mnd/options";
import { Tray, useDisplay, useTray, type Offered } from "@mnd/tray";
import { browser_files, browser_net } from "./ports";

/** The three looks, each with the mark it wears. */
const THEMES = [
  { name: "retro", icon: "theme_retro" },
  { name: "modern", icon: "theme_modern" },
  { name: "light", icon: "theme_light" },
] as const;

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
  /** What a reveal inside a layer asked the canvas to pan to, until the next pick. */
  const [aim, set_aim] = useState<Id | null>(null);
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
  const [shown, set_shown] = useState({ interfaces: true, frame: true });
  /** The layers that have said otherwise about drawing their key. **A layer holding no answer
   *  follows the workspace**, so changing the default moves every layer that never disagreed. */
  const [keyed, set_keyed] = useState<Record<Id, boolean>>({});
  const { card, legend: legends, corner, lattice } = display;
  /** What a right drag draws, as the rail left it. */
  const [drawing, set_drawing] = useState<{ module: Id; dir?: Dir }>({ module: "line" });
  /** The tray row under the pointer, lit on the canvas where it is drawn. */
  const [hovered, set_hovered] = useState<Id | null>(null);
  const { hold } = t;
  /** The explorer's sections — a package, a definition, its structure — and what each holds. */
  const chain = useChain(s.graph(), SLICES, EDITOR.top, s.view());
  /** A pick on the canvas gives the context back to the canvas, and the sections follow it. */
  const pick = (ids: Id[]) => {
    set_aim(null);
    /** One card picked on a whole section is brought into sight there: the canvas's own anchor. */
    if (ids.length === 1 && s.view().kind !== "internal") { act("reveal", { id: ids[0] }); return; }
    s.pick(ids);
    t.release();
    if (ids.length === 1) follow();
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
  const view = s.view();
  /** The layer seen from inside, where the canvas looks into one; a whole section has none, and
   *  is read only. */
  const whole = view.kind !== "internal";
  const layer = whole ? null : view.layer;
  const said = s.said();
  const laid_out = layout_of(graph, layer);
  /** What the canvas has open: a layer, or a whole section in one view. */
  const here = whole ? `@${SLICES[view.at]!.id}:${view.kind}` : layer ?? "";
  const legend = keyed[here] ?? legends;

  /** The drawing's proportions are the views module's, so the session's card is applied before
   *  anything is placed. */
  apply_card(card.w, card.h);

  /** How many cards the overview's rows hold: as many as the canvas is wide. */
  const [canvas, set_canvas] = useState<HTMLElement | null>(null);
  const room = useWidth(canvas);
  const across = Math.max(2, Math.floor(room / ((card.w + UNITS.gap) * UNITS.unit * READ)) );

  /** What a profile cuts through: what the canvas brought into sight — browsing never moves it. */
  const target = view.kind !== "profile" ? null : view.pick ?? view.layer;

  /** Projected once per graph, view, layer or proportion change — and, for a profile, per pick. */
  const scene = useMemo(
    () => project(graph, view.layer, { interfaces: shown.interfaces, across,
                                       look: { kind: view.kind, cut: SLICES[view.at]!.cut,
                                               tiers: EDITOR, target } }),
    [graph, view.layer, view.kind, view.at, target, shown.interfaces, card, across]);

  /** **The sections follow the canvas** — one rule (`held_at`), whatever moved it: the layer opened,
   *  or a pick on the overview. Browsing the explorer moves neither. */
  const follow = () => {
    const held = held_at(s.graph(), EDITOR, s.view());
    if (held) chain.onTrace(held.path, held.at);
  };
  useEffect(follow, [view.layer, view.kind, view.at]);

  /** What the open layer draws, by id. */
  const drawn = useMemo(() => new Set([...scene.nodes.map((n) => n.id),
                                       ...scene.edges.map((e) => e.id)]), [scene]);

  const act = (name: string, args?: Record<string, unknown>) => {
    /** Undo and redo arrive through the same channel as actions. */
    if (name === "undo") { s.undo(); return; }
    if (name === "redo") { s.redo(); return; }
    s.go(name, args ?? {});
    /** Opening, leaving and revealing are navigation's: the sections follow where it went, and
     *  the canvas pans to what it revealed inside a layer. */
    if (name === "open" || name === "reveal") {
      t.release();
      follow();
      /** Cleared first, so revealing the same block again pans again; leaving aims at nothing. */
      flushSync(() => set_aim(null));
      if (args?.["id"] && s.view().kind === "internal") set_aim(s.picked()[0] ?? null);
    }
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
    /** The canvas's section shown another way, keeping in sight what it holds. */
    if (name === "view") {
      s.see(args!["kind"] as ViewKind, chain.held[view.at] ?? null);
      follow();
      return;
    }
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
    /** The workspace written out, whole or as a package of its own; each reaches the files port. */
    if (name === "@export") { void s.save(); return; }
    if (name === "@export_package") {
      const named = prompt("name the package", graph.blocks[graph.root]?.name ?? "")?.trim();
      if (named) void s.save_package(named);
      return;
    }
    /** Where the tray is pointed; writes nothing. */
    act(name, args);
  };

  /** **The explorer browses**: a row chosen is held in its section and shown in the tray, and the
   *  canvas stays where it is. A package points the tray at its definitions. */
  const choose = (at: number, id: Id | null) => {
    chain.onChoose(at, id);
    if (id && graph.blocks[id]?.parent === null) {
      t.onSection({ of: "defs", only: "packages", from: graph.blocks[id]!.name ?? id });
      return;
    }
    t.release();
    if (id && s.graph().blocks[id]) s.pick([id]);
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
          <button title={`theme: ${theme} — click for ${next_look.name}`}
                  onClick={() => set_theme(next_look.name)}>
            <Icon name={look.icon} />
          </button>
      </WorkspaceHeader>

      <Explorer
        graph={graph}
        view={view}
        picked={s.picked()}
        folded={folded}
        onAct={act}
        onFold={(id, shut) =>
          set_folded((f) => (shut ? [...new Set([...f, id])] : f.filter((x) => x !== id)))}
        onPick={pick}
        onOpen={({ id, via }) => act(via ? "reveal" : "open", { id })}
        onLeave={() => act("open")}
        chain={{ ...chain, onChoose: choose }}
        keys
      />

      <main ref={set_canvas}>
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
          /** What a drop comes to is core's: a block arrives as a reference, a definition retypes
           *  what it lands on or makes one. Onto a cell is seated there. */
          onDrop={(id, spot, land) => {
            /** Where the pointer was, clear of what is already there. */
            const at = clear_of(
              scene.nodes.filter((n) => n.id !== id && !holds(n) && !n.data.on)
                         .map(box_of),
              { x: spot.x - BLOCK.w / 2, y: spot.y - BLOCK.h / 2 }, BLOCK);
            if (whole) return;
            const cell = land.cell && land.into ? land.into : null;
            const made = drop_of(graph, {
              ids: [id], onto: "drawing", parent: cell ?? layer ?? graph.root,
              on: land.line ?? land.over, spot: at,
              ...(cell ? { cell: `${land.cell!.r},${land.cell!.c}` } : {}) });
            if (made) s.go(made.act, made.args);
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
            const shown = s.picked().filter((id) => drawn.has(id));
            const echo = shown.length < s.picked().length && ids.length === shown.length
              && ids.every((id) => shown.includes(id));
            if (!echo) pick(ids);
          }}
          onAct={act}
          /** The overview is read only, and read down the page. */
          onAdjust={whole ? () => undefined : adjust}
          scroll={whole}
          focus={whole ? view.pick : aim}
          most={1}
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
          onView={(_home, id) => { s.go("reveal", { id }); t.release(); }}
          offered={offered}
          display={display}
          onAct={chrome}
        />
      </main>

      <Options groups={groups_of({ slots: scene.slots, layout: laid_out,
                                   views: SLICES[view.at]!.views, view: view.kind,
                                   interfaces: shown.interfaces,
                                   lattice: lattice ?? true, frame: shown.frame,
                                   legend,
                                   module: drawing.module,
                                   ...(drawing.dir ? { dir: drawing.dir } : {}) },
                                 chrome)} />
    </div>
  );
}

/** The editor's sections, made once. */
const SLICES = editor_slices();

/** How large the overview draws a card: its own size. */
const READ = 1;

/** How wide an element is, in pixels, as it is resized; nothing until there is one. */
function useWidth(element: HTMLElement | null): number {
  const [width, set_width] = useState(0);
  useEffect(() => {
    if (!element) return;
    const watch = new ResizeObserver(([entry]) => set_width(entry?.contentRect.width ?? 0));
    watch.observe(element);
    return () => watch.disconnect();
  }, [element]);
  return width;
}
