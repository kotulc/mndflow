/** The app, assembled.
 *
 *  Bind ports, hold the log, fold, project, render — and every gesture returns
 *  an action name, which it runs, which returns mutations, which it appends.
 *  That loop is the whole app.
 *
 *  **If this file turns out to be interesting, a seam is in the wrong place.** */

import { useEffect, useMemo, useRef, useState } from "react";
import { adjustments, module_of, offer, session,
         type Id, type RelationModule } from "@mnd/core";
import { seed } from "@mnd/defs";
import { box_of, clear_of, extent_of, nearest_seat, project, snap, tidy,
         BLOCK, PORT } from "@mnd/views";
import { Explorer, Menu } from "@mnd/explorer";
import { Icon } from "@mnd/theme";
import { Stage } from "@mnd/stage";
import type { Adjust } from "@mnd/stage";
import { Options, groups_of } from "@mnd/options";
import { Tray, type Tab } from "@mnd/tray";
import { Terminal, type Match } from "@mnd/terminal";
import { browser_files, browser_net, browser_storage } from "./ports";
import { browser_score } from "./score";

/** The three looks, each with the mark it wears. One control that cycles: the
 *  icon shown is the look that is on, so nothing hides behind the press. */
const THEMES = [
  { name: "retro", icon: "theme_retro" },
  { name: "modern", icon: "theme_modern" },
  { name: "light", icon: "theme_light" },
] as const;

/** One scorer for the app. It holds a cache, so a second would pay for the
 *  weights twice and answer worse for it. */
const scoring = browser_score();

/** Where this host keeps its definition packages. A host fact — nothing above
 *  an app may assume where *outside the workspace* is. */
const CATALOGUE = "/packages/index.json";

export function App() {
  /** Lazily, and once. `useRef(session(...))` evaluates its argument on every
   *  render — the ref keeps the first, but each of the others still opens
   *  storage and can write to it. */
  const held = useRef<ReturnType<typeof session> | null>(null);
  held.current ??= session({ storage: browser_storage(), files: browser_files(),
                             net: browser_net(), catalogue: CATALOGUE, defs: seed() });
  const s = held.current;
  const [, bump] = useState(0);
  const [folded, set_folded] = useState<Id[]>([]);
  const [theme, set_theme] = useState<string>(
    () => localStorage.getItem("mnd.theme") ?? "retro");
  const look = THEMES.find((t) => t.name === theme) ?? THEMES[0];
  const next_look = THEMES[(THEMES.indexOf(look) + 1) % THEMES.length]!;
  /** Chrome the shell holds and the log never sees. */
  const [tray, set_tray] = useState(false);
  /** Which of the tray's two questions is open. The rail's cog asks for the
   *  first; otherwise the tray keeps whichever was last read. */
  const [tab, set_tab] = useState<Tab>("contents");
  /** Shown at all, and open rather than shut — two states, two controls: the
   *  header says whether it is there, its own toggle says how big. */
  const [terminal, set_terminal] = useState(false);
  const [wide, set_wide] = useState(false);
  /** The mirror off. **Not the strip collapsed** — two questions, two controls. */
  const [quiet, set_quiet] = useState(false);
  const [shown, set_shown] = useState({ interfaces: true, angles: true, lattice: true });
  /** Which way a right drag draws a line. Display state until it is drawn, and
   *  then it is what the relationship was made as. */
  const [module, set_module] = useState<RelationModule>("line");
  /** **The rail asking for every line to be pulled straight.** It counts up
   *  rather than calling: the geometry is the canvas's, so the app says *again*
   *  and the canvas answers with the runs. */
  const [straighten, set_straighten] = useState(0);
  /** What help is pointing at, as the one lit-target look every surface uses. */
  const [pointed, set_pointed] = useState<readonly Id[]>([]);

  useEffect(() => { s.watch(() => bump((n) => n + 1)); }, [s]);
  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    localStorage.setItem("mnd.theme", theme);
  }, [theme]);

  const graph = s.graph();
  const layer = s.layer();
  const said = s.said();
  const arranged = graph.blocks[layer ?? graph.root]?.arrangement ?? "free";

  /** **Projected once per change, not once per render.**
   *
   *  A projection is a pure function of the graph and the open layer, and both
   *  are values the shell already holds. It is not cheap: it lays out a layer,
   *  resolves a look for every card and derives what each container holds. Run
   *  in the render body it ran again on every keystroke in the terminal and
   *  every theme toggle, and handed the canvas, the tree and the rail a whole
   *  new set of objects each time.
   *
   *  **`graph` is a sound key because a graph is never edited in place** — every
   *  change to the log refolds it from empty and hands back a new one, so its
   *  identity changing is exactly what "the model changed" means. */
  const scene = useMemo(
    () => project(graph, layer, { interfaces: shown.interfaces }),
    [graph, layer, shown.interfaces]);

  /** **The one picked thing, so the rail can offer what only it can be told.**
   *  Picking a cell picks the grid it is in, so pointing at a cell is enough to
   *  reach these. Several picked is nothing picked here: the rail says what one
   *  element is, and the answer for four of them is four answers. */
  const only = s.picked().length === 1 ? s.picked()[0] : s.cells()[0]?.group;
  const on = only ? graph.blocks[only] : undefined;
  const gridded = on && on.rows !== undefined && on.cols !== undefined
    ? { id: on.id, headers: on.headers ?? "none" as const } : null;
  /** **Only a group is framed.** Its name sits on a band drawn round other
   *  things, so taking it away leaves something that still reads; every other
   *  card *is* its name. */
  const element = on
    ? { id: on.id, labelled: on.labelled !== false, locked: !!on.locked,
        framed: module_of(graph, on.id) === "group" } : null;

  /** What is offered here, with what each needs and what it would act on —
   *  both read off the registry, so **help teaches whatever the app currently
   *  is** rather than a second copy of it written down somewhere. */
  const offered_here = offer({ graph, layer, picked: s.picked(), cells: s.cells() }).map((a) => ({
    name: a.name,
    about: a.about,
    asks: a.args.filter((g) => g.required).map((g) => g.name).join(", "),
    on: a.on.some((scope) => scope === "layer") && !s.picked().length
      ? (layer ? [layer] : [])
      : s.picked(),
  }));

  const act = (name: string, args?: Record<string, unknown>) => {
    /** **Not actions, and they arrive here anyway.** Undoing writes no
     *  mutation — it moves the log — so it is not on the registry; but every
     *  surface reaches the app through one channel, and a second one just for
     *  these would be a second thing for every panel to learn. */
    if (name === "undo") { s.undo(); return; }
    if (name === "redo") { s.redo(); return; }
    s.go(name, args ?? {});
  };

  /** Where a thing put down by hand comes to rest: **on the lattice**, which
   *  is the only measure there is. What the layout does with it afterwards —
   *  pushing it a gap clear of its neighbours on a layer set to `grid` — is the
   *  layout's, and it works in the same units. */
  const put = (_id: Id, to: { x: number; y: number }) => ({ x: snap(to.x), y: snap(to.y) });

  /** An adjustment is positional and unsayable, and undoable like anything
   *  else. **The canvas already worked out where it landed** — it snaps to the
   *  grid and constrains a seated interface to its own card — so the app only
   *  writes what it was handed. */
  const adjust = (a: Adjust) => {
    /** A corner dragged writes the two fields a block has always carried, plus
     *  where it now sits: a resize from a left or top handle moves the card as
     *  well as sizes it. */
    if (a.kind === "size") {
      /** **A grid is sized in cells, never in pixels.** Its extent is what it
       *  is, so a corner dragged says how many rows and columns — and shrinking
       *  frees whatever falls outside rather than hiding it. */
      const on = graph.blocks[a.on];
      if (on?.rows !== undefined && on.cols !== undefined) {
        /** **A grid's corner lands on the layer's lattice**, not on the
         *  backdrop dots — its cells are that lattice, so a corner rounded to
         *  the nearest dot put every cell in it a few pixels off every line the
         *  canvas draws. */
        s.go("group", { into: a.on, ...extent_of(a.w, a.h), spot: put(a.on, a.to) });
        return;
      }
      s.adjust("size", adjustments.size(a.on, a.w, a.h));
      s.adjust("place", adjustments.place([{ id: a.on, x: snap(a.to.x), y: snap(a.to.y) }]));
      return;
    }
    /** **One step, however many lines it let go of.** One gesture is one step,
     *  and the rail's verb is one gesture over the whole layer. */
    if (a.kind === "free-ends") {
      s.adjust("align", adjustments.free_ends(a.edges));
      return;
    }
    if (a.kind === "wall-seat") {
      s.adjust("seat", adjustments.seat(a.on, a.side, a.at));
      return;
    }
    if (a.kind === "wall") {
      const end = graph.blocks[a.to] ? a.to : null;
      if (end) s.go("relink", { id: a.on, end: a.end, to: end });
      return;
    }
    /** A line's end dropped on another card is a relink. Seat along a wall is
     *  routing's to work out — nothing here writes a fraction. */
    if (a.kind === "anchor") return;
    /** **Several cards put down at once.** A sweep dragged, and a boundary
     *  dragged — the band is its members' bounds, so what moved is them. One
     *  step, so one undo puts the lot back. */
    if (a.kind === "place") {
      s.adjust("place", adjustments.place(
        a.at.map((p) => ({ id: p.id, ...put(p.id, p.to) }))));
      return;
    }
    /** A seated interface slides along the card it sits on: what changed is
     *  which wall and how far, and both are read off where it came to rest. */
    const drawn = scene.nodes.find((n) => n.id === a.on);
    const on = drawn?.data.on ? scene.nodes.find((n) => n.id === drawn.data.on) : null;
    if (on) {
      /** **Its middle, not its corner.** A port straddles the border it is set
       *  into, so reading the corner puts the answer half a port off it. */
      const seat = nearest_seat(box_of(on),
                                { x: a.to.x + PORT.w / 2, y: a.to.y + PORT.h / 2 });
      s.adjust("seat", adjustments.seat(a.on, seat.side, seat.at));
      return;
    }
    s.adjust("place", adjustments.place([{ id: a.on, ...put(a.on, a.to) }]));

    /** **Where it came to rest says which group it is in.** A boundary is its
     *  members' bounds, so being inside one and belonging to one were two
     *  different facts that could disagree — a card dragged into a band stayed
     *  out of it, and one dragged clear of a band stayed in. Placed first,
     *  because the band is worked out from where its members are.
     *
     *  **A grid is the same drop resolving to an address.** The canvas read the
     *  lattice; seating is what says so, and it joins the group on the way. */
    if (a.kind !== "move") return;
    const held = graph.blocks[a.on]?.group ?? null;
    const here = a.into;
    if (a.cell && here) {
      s.go("seat", { id: a.on, group: here, at: `${a.cell.r},${a.cell.c}` });
      return;
    }
    if (held === here) return;
    if (here) s.go("group", { members: [a.on], into: here });
    else s.go("leave", { ids: [a.on] });
  };

  /** The rail's controls are display state or ordinary actions — it writes
   *  nothing itself, so this is where each one lands. **What is not display
   *  state is an action**, and it goes the same way every other surface's does
   *  rather than being listed here a second time. */
  const chrome = (name: string, args?: Record<string, unknown>) => {
    if (name === "interfaces") { set_shown((c) => ({ ...c, interfaces: !!args!["show"] })); return; }
    if (name === "lines") { set_shown((c) => ({ ...c, angles: !!args!["angles"] })); return; }
    if (name === "lattice") { set_shown((c) => ({ ...c, lattice: !!args!["show"] })); return; }
    if (name === "relate_with") { set_module(args!["module"] as RelationModule); return; }
    /** **The canvas knows which lines are on this layer, so the canvas
     *  answers.** The rail says the verb was asked for and nothing about any
     *  line. */
    if (name === "straighten") {
      /** **On a grid layer, align is laydown.** Straight runs come from cards
       *  sharing an axis, so re-tidying is what pulls the bends out — not a
       *  second pass over the edges alone. */
      if (arranged === "grid") {
        act("arrange", { layer, arrangement: "grid", at: tidy(graph, layer) });
        return;
      }
      set_straighten((n) => n + 1);
      return;
    }
    /** **Nothing behind it yet.** It says so rather than doing nothing, which
     *  is the one failure that looks exactly like the app having missed the
     *  press. */
    if (name === "settings") { s.say("project settings are not built yet"); return; }
    /** **Asking for `grid` tidies the layer**, and the tidy is geometry — so it
     *  is worked out here, where the projection is, and handed to the action
     *  as ordinary placements. From then on the arrangement only says what a
     *  drop rounds to. */
    if (name === "arrange") {
      const how = args!["arrangement"];
      act("arrange", { layer, ...args,
                       ...(how === "grid" ? { at: tidy(graph, layer) } : {}) });
      return;
    }
    /** **Not an action** — it writes nothing and asks for nothing. Describing
     *  a thing is opening the panel that already describes it. */
    if (name === "define") { set_tab("this"); set_tray(true); return; }
    if (name === "export") { void s.save(); return; }
    act(name, args);
  };

  /** One of the terminal's four. **Help is the fallback**, so only the three
   *  that write anything are answered here. */
  const command = (match: Match) => {
    if (match.command === "add") { act("create", { label: match.rest }); return; }
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
        {/* Identity, and the size of what is under it. **The session says how
            much it holds, not what it is called** — the name sits on the
            explorer's own header, where the tree it names begins. */}
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
          {/* **Asked before it is done, and only here.** Everything else in the
              header is undoable; this is the one control that is not, because
              what it throws away is the history undo would have walked. */}
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
          context={layer ? `in ${graph.blocks[layer]?.label ?? "a layer"}` : "the workspace"}
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
        onPick={(ids) => s.pick(ids)}
      />

      <main>
        <Stage
          scene={scene}
          /** **The same offered list the tree hangs off a row.** One menu, two
           *  callers — the app mounts it, so neither package has to know the
           *  other exists. */
          /** **A right-click inside the selection is about the selection.** It
           *  is about the one thing only when that thing was not already
           *  picked — otherwise grouping four cards acted on whichever of them
           *  the pointer happened to be over. */
          menu={(at, on, shut, spot, only, given) => (
            <Menu ctx={{ graph, layer, cells: s.cells(),
                         picked: !on ? [...s.picked()]
                               : s.picked().includes(on) ? [...s.picked()] : [on] }}
                  at={at} spot={spot} only={only} given={given}
                  onAct={act} onShut={shut} />
          )}
          /** **A block dropped onto the drawing arrives as a reference.** One
           *  rule, with no exception the shell has to know: where the block
           *  came from, what holds it and how deep it sits change nothing. A
           *  block already in this layer is the one thing a drop cannot say, and
           *  `refer` is what says so — it is the action's to refuse, not the
           *  app's to guess at. */
          onDrop={(id, spot) => {
            /** **Where the pointer was, clear of what is already there.** A row
             *  is dropped by its middle, and a card is placed by its corner. */
            const at = clear_of(
              scene.nodes.filter((n) => n.id !== id && n.type !== "group" && !n.data.on)
                         .map(box_of),
              { x: spot.x - BLOCK.w / 2, y: spot.y - BLOCK.h / 2 }, BLOCK);
            s.go("refer", { target: id, spot: at });
          }}
          picked={s.picked()}
          cells={s.cells()}
          onPickCells={(cells) => s.pick_cells(cells)}
          curved={shown.angles === false}
          lattice={shown.lattice}
          straighten={straighten}
          module={module}
          said={said?.text ?? null}
          onSaid={() => s.say("")}
          onPick={(ids) => s.pick(ids)}
          onAct={act}
          onAdjust={adjust}
        />
        <Tray
          graph={graph}
          layer={layer}
          label={layer ? graph.blocks[layer]?.label ?? "layer" : "workspace"}
          open={tray}
          onOpen={set_tray}
          tab={tab}
          onTab={set_tab}
          picked={s.picked()}
          onPick={(ids) => s.pick(ids)}
          onAct={act}
        />
      </main>

      <Options groups={groups_of({ slots: scene.slots, arrangement: arranged,
                                   interfaces: shown.interfaces, angles: shown.angles,
                                   lattice: shown.lattice, module,
                                   ...(element ? { element } : {}),
                                   ...(gridded ? { grid: gridded } : {}) },
                                 chrome)} />
    </div>
  );
}
