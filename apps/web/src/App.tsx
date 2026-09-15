/** The app, assembled.
 *
 *  Bind ports, hold the log, fold, project, render — and every gesture returns
 *  an action name, which it runs, which returns mutations, which it appends.
 *  That loop is the whole app.
 *
 *  **If this file turns out to be interesting, a seam is in the wrong place.** */

import { useEffect, useMemo, useRef, useState } from "react";
import { adjustments, can_hold, module_named, module_of, offer, pinned_defs,
         relation_named, session,
         type Args, type Storage, type Dir, type Graph, type Id, type Point,
         type RelationModule } from "@mnd/core";
import { seed } from "@mnd/defs";
import { box_of, clear_of, extent_of, holds, nearest_seat, project, snap, tidy,
         BLOCK, PORT } from "@mnd/views";
import { Explorer, Menu } from "@mnd/explorer";
import { Icon } from "@mnd/theme";
import { Stage } from "@mnd/stage";
import type { Adjust } from "@mnd/stage";
import { Options, groups_of } from "@mnd/options";
import { Tray, type Hold, type Tab } from "@mnd/tray";
import { Terminal, type Match } from "@mnd/terminal";
import { browser_files, browser_net } from "./ports";
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

export function App({ storage }: { storage: Storage }) {
  /** Lazily, and once. `useRef(session(...))` evaluates its argument on every
   *  render — the ref keeps the first, but each of the others still opens
   *  storage and can write to it. */
  const held = useRef<ReturnType<typeof session> | null>(null);
  held.current ??= session({ storage, files: browser_files(),
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
  const [shown, set_shown] = useState({ interfaces: true, lattice: true, frame: true });
  /** Which way a right drag draws a line. Display state until it is drawn, and
   *  then it is what the relationship was made as. */
  /** **What a right drag draws**, as the rail left it: a module always, and a
   *  pinned definition where one was picked. One piece of state, because
   *  picking a pinned line picks its module too. */
  const [drawing, set_drawing] =
    useState<{ module: RelationModule; dir?: Dir; type?: string }>({ module: "line" });
  /** What help is pointing at, as the one lit-target look every surface uses. */
  const [pointed, set_pointed] = useState<readonly Id[]>([]);
  /** The tray row under the pointer, lit on the canvas where it is drawn. */
  const [hovered, set_hovered] = useState<Id | null>(null);
  /** **What the tray holds that the canvas did not give it** — the workspace, a
   *  definition, or a blank one being written. Shell state beside the session's
   *  selection and never among it, since none of these is a block or a
   *  relationship. **Given up by any canvas or explorer selection**, so it never
   *  has to be arbitrated against one. */
  const [hold, set_hold] = useState<Hold | null>(null);
  const picked_def = hold?.of === "id" && hold.id !== s.graph().root ? hold.id : null;
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

  /** What the open layer draws, by id. */
  const drawn = useMemo(() => new Set([...scene.nodes.map((n) => n.id),
                                       ...scene.edges.map((e) => e.id)]), [scene]);

  /** **The shortlist the rail offers, in the order the workspace put them.**
   *  Not every relation definition — those are reached and edited in the tray,
   *  which is where a vocabulary with forty stereotypes in it can be read. */
  const offered_lines = useMemo(
    () => pinned_defs(graph, "relation")
      .filter((d) => relation_named(graph, d.id) === "line")
      .map((d) => ({ id: d.id, name: d.name, module: "line" as const })),
    [graph]);

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

  /** Which group a drop joins, read from where the block came to rest — not
   *  from the band's bounds at the start of the drag, which follow their
   *  members and would otherwise make leaving a nested group impossible. */
  const land_group = (to: { x: number; y: number },
                      size: { w: number; h: number },
                      held: Id | null): Id | null => {
    const cx = to.x + size.w / 2;
    const cy = to.y + size.h / 2;
    if (held) {
      const band = scene.nodes.find((n) => n.id === held);
      if (band) {
        const b = box_of(band);
        if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) return held;
      }
    }
    const groups = scene.nodes
      .filter((n) => n.type === "group" && n.id !== held)
      .filter((n) => {
        const b = box_of(n);
        return cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h;
      })
      .sort((a, b) => (b.data.nest ?? 0) - (a.data.nest ?? 0));
    return groups[0]?.id ?? null;
  };

  /** One gesture, one step. Moving anything by hand on a `grid` layer hands the
   *  layer to `free`, keeping where the grid had put everything. */
  const adjust = (a: Adjust) => s.batch(() => {
    if (arranged === "grid" && ["place", "move", "wall-seat"].includes(a.kind)) {
      act("arrange", { layer, arrangement: "free", at: tidy(graph, layer) });
    }
    adjust_now(a);
  });

  /** An adjustment, as the canvas worked it out: the app only writes it. */
  const adjust_now = (a: Adjust) => {
    /** A corner dragged writes the two fields a block has always carried, plus
     *  where it now sits: a resize from a left or top handle moves the card as
     *  well as sizes it. */
    if (a.kind === "size") {
      /** **A grid is sized in cells, never in pixels.** Its extent is what it
       *  is, so a corner dragged says how many rows and columns — and shrinking
       *  frees whatever falls outside rather than hiding it. */
      const on = graph.blocks[a.on];
      if (on && module_of(graph, a.on) === "grid") {
        s.go("group", { into: a.on, ...extent_of(a.w, a.h), spot: put(a.on, a.to) });
        return;
      }
      s.adjust("size", adjustments.size(a.on, a.w, a.h));
      s.adjust("place", adjustments.place([{ id: a.on, x: snap(a.to.x), y: snap(a.to.y) }]));
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
    /** **Several cards put down at once.** A sweep dragged, or a group whose
     *  corner moved — members follow from layout, not from their own stored
     *  places. One step, so one undo puts the lot back. */
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
    const block = graph.blocks[a.on];
    const landed = drawn ? box_of(drawn) : BLOCK;
    const held = block?.group ?? null;
    const here = a.cell ? a.into : land_group(a.to, landed, held);
    const mod = block ? module_of(graph, a.on) : null;

    /** **A group is placed by its members**, not by a layer address. */
    if (mod === "group") {
      if (a.cell && here) {
        s.go("seat", { id: a.on, group: here, at: `${a.cell.r},${a.cell.c}` });
        return;
      }
      if (here && here !== a.on && can_hold(graph, here, a.on)) {
        if (held !== here) s.go("group", { members: [a.on], into: here });
        return;
      }
      if (held && held === here) return;
      if (held && !here) {
        s.go("leave", { ids: [a.on] });
        s.adjust("place", adjustments.place([{ id: a.on, ...put(a.on, a.to) }]));
        return;
      }
      s.adjust("place", adjustments.place([{ id: a.on, ...put(a.on, a.to) }]));
      return;
    }

    /** **Where it came to rest says which group it is in.** A boundary is its
     *  members' bounds, so being inside one and belonging to one were two
     *  different facts that could disagree — a card dragged into a band stayed
     *  out of it, and one dragged clear of a band stayed in. Placed first,
     *  because the band is worked out from where its members are.
     *
     *  **A grid is the same drop resolving to an address.** The canvas read the
     *  lattice; seating is what says so, and it joins the group on the way. */
    s.adjust("place", adjustments.place([{ id: a.on, ...put(a.on, a.to) }]));
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
    if (name === "lattice") { set_shown((c) => ({ ...c, lattice: !!args!["show"] })); return; }
    if (name === "frame") { set_shown((c) => ({ ...c, frame: !!args!["show"] })); return; }
    if (name === "relate_with") {
      const type = args!["type"] ? String(args!["type"]) : undefined;
      const dir = args!["dir"] ? String(args!["dir"]) as Dir : undefined;
      set_drawing({ module: args!["module"] as RelationModule,
                    ...(dir && dir !== "none" ? { dir } : {}),
                    ...(type ? { type } : {}) });
      return;
    }
    /** **The picture is written on the way out, not the way in.** `grid` lays
     *  out from the model and ignores stored places, so the layout only has to
     *  be written down when the layer stops doing that — which is what lets
     *  `free` carry on from where `grid` left off. Writing it on the way *in*
     *  spent a placement per block on every switch, for a picture the mode was
     *  about to ignore. */
    if (name === "arrange") {
      const how = args!["arrangement"];
      const leaving = arranged === "grid" && how === "free";
      act("arrange", { layer, ...args,
                       ...(leaving ? { at: tidy(graph, layer) } : {}) });
      return;
    }
    /** **Where the tray is pointed.** Not an action: it writes nothing. The
     *  workspace is held without leaving the layer, and a block or relation
     *  scope is a blank definition — so the canvas selection is let go, and
     *  `canvas` hands the context back. */
    if (name === "about") {
      const want = String(args!["scope"]);
      if (want === "canvas") { set_hold(null); return; }
      s.pick([]);
      set_hold(want === "workspace" ? { of: "id", id: graph.root }
               : { of: "draft", group: want === "relation" ? "relation" : "block" });
      set_tray(true);
      set_tab("settings");
      return;
    }
    act(name, args);
  };

  /** One of the terminal's four. **Help is the fallback**, so only the three
   *  that write anything are answered here. */
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
        pickedDef={picked_def}
        /** **Picking a definition describes it**, which is the settings tab
         *  and nothing else — so the tray opens on it. */
        onPickDef={(id) => {
          set_hold(id ? { of: "id", id } : null);
          if (id) { s.pick([]); set_tab("settings"); set_tray(true); }
        }}
      />

      <main>
        <Stage
          scene={scene}
          graph={graph}
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
          onDrop={(id, spot, land) => {
            /** **Where the pointer was, clear of what is already there.** A row
             *  is dropped by its middle, and a card is placed by its corner. */
            const at = clear_of(
              scene.nodes.filter((n) => n.id !== id && !holds(n) && !n.data.on)
                         .map(box_of),
              { x: spot.x - BLOCK.w / 2, y: spot.y - BLOCK.h / 2 }, BLOCK);
            /** **A definition dragged out makes a block naming it.** No new
             *  action and no second payload: what the vocabulary drags is a row
             *  of `graph.defs` rather than anything that exists on a layer — so
             *  the graph is asked which it was. A block wins the tie, being the
             *  thing you can point at. */
            if (!graph.blocks[id] && graph.defs[id]) {
              s.go(...dropped(graph, id, land.over, at, layer));
              return;
            }
            s.go("refer", { target: id, spot: at });
          }}
          picked={s.picked()}
          cells={s.cells()}
          onPickCells={(cells) => {
            /** **A click lets go of what the canvas cannot show.** A row picked
             *  from another layer is not drawn here, so nothing else would. */
            if (!cells.length) s.pick(s.picked().filter((id) => drawn.has(id)));
            s.pick_cells(cells); set_hold(null);
          }}
          lattice={shown.lattice}
          frame={shown.frame}
          module={drawing.module}
          {...(drawing.dir ? { dir: drawing.dir } : {})}
          {...(drawing.type ? { type: drawing.type } : {})}
          said={said?.text ?? null}
          onSaid={() => s.say("")}
          lit={hovered && drawn.has(hovered) ? [hovered] : []}
          /** **The canvas reporting what it can draw is not a gesture.** A pick
           *  it cannot show comes back as that pick minus the part it cannot,
           *  and taking that as a selection let go of the tray's hold. */
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
          /** **The tray's own tables hold its context**, so a row picked there
           *  selects without the hold being let go — the tray says which. */
          onPick={(ids) => s.pick(ids)}
          onHover={set_hovered}
          hold={hold}
          onHold={set_hold}
          onView={(home, id) => { s.look(home); s.pick([id]); set_hold(null); }}
          onAct={act}
        />
      </main>

      <Options groups={groups_of({ slots: scene.slots, arrangement: arranged,
                                   interfaces: shown.interfaces,
                                   lattice: shown.lattice, frame: shown.frame,
                                   /** **The workspace is lit whenever it is the
                                    *  context**: held, or the root layer with
                                    *  nothing single picked on it. */
                                   held: hold?.of === "draft" ? hold.group
                                     : hold?.of === "id" ? (hold.id === graph.root ? "workspace" : null)
                                     : layer === null && s.picked().length !== 1 ? "workspace" : null,
                                   module: drawing.module,
                                   ...(drawing.dir ? { dir: drawing.dir } : {}),
                                   ...(drawing.type ? { type: drawing.type } : {}),
                                   /** **Where a relation vocabulary lives.** The
                                    *  tree keeps blocks; a pinned line is drawn
                                    *  between two ends, so it is offered here. */
                                   relations: offered_lines },
                                 chrome)} />
    </div>
  );
}

/** **What a dragged definition makes, by what it is a definition of.**
 *
 *  Two of the eight kinds are made *of* something: a port goes on a block and a
 *  stand-in stands for one. Each has an action that says what it needs, so this
 *  picks the action and the actions keep the rules — a drop on empty ground
 *  falls through to `create`, which refuses the two in the words the user
 *  should read. **A group dropped on a block wraps it, and on empty ground is an
 *  empty group.**
 *
 *  **A grid is made with an extent.** An empty grid is a real thing only
 *  because it owns its corner, and one with no rows and no columns would have
 *  nothing to draw — so a dropped grid arrives as a small one you can seat
 *  something in. */
const GRID = { rows: 2, cols: 2 };

function dropped(graph: Graph, type: Id, on: Id | null, at: Point,
                 layer: Id | null): [string, Args] {
  const kind = module_named(graph, type);
  if (on && kind === "interface") return ["interface", { owner: on, type }];
  if (on && kind === "group") return ["group", { members: [on], type }];
  /** **Beside a block, never on it.** A grid is a region of the lattice and a
   *  card dropped onto one is seated; a grid dropped onto a card is neither. */
  if (kind === "grid") return ["group", { ...GRID, type, spot: at }];
  return ["create", { name: "", type, parent: layer ?? graph.root, spot: at }];
}
