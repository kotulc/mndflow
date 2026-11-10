/** The app, assembled. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { appearances_of, collect, drop_of, touches_of,
         held_at, in_section, is_inside, is_layer_view, is_model, lit as lit_by,
         model_path, object_of, path, path_of, path_owner, sub_model, registry_at,
         registry_id, registry_of,
         seen_through, session, shown_name, trace, way_of, DIAGRAM_VIEWS, EDITOR, type Boot, type ViewKind, type Storage, type Dir,
         type Hop, type Id } from "@mnd/core";
import { FLOOR } from "@mnd/defs";
import { area_of, boxed_place, box_of, clear_of, empty_of, holds, layer_scene, map_focus, project,
         section_map, set_aspect, set_card as apply_card, BLOCK, CARD, EMPTY,
         laid_ahead, model_tree, on_map, row_look, UNITS, trail_of, type Area,
         type Scene } from "@mnd/views";
import { Explorer, Menu, editor_slices, useChain } from "@mnd/explorer";
import { Icon, useZone, WorkspaceHeader } from "@mnd/theme";
import { Stage, still, type Move, type Shot } from "@mnd/stage";
import { Tray, useDisplay, useTray, type Offered } from "@mnd/tray";
import { shot_of, type Camera } from "./camera";
import { browser_files, browser_net } from "./ports";

/** The three looks, each with the mark it wears. */
const THEMES = [
  { name: "retro", icon: "theme_retro" },
  { name: "modern", icon: "theme_modern" },
  { name: "light", icon: "theme_light" },
] as const;

/** Where this host keeps its definition packages. */
const CATALOGUE = "/packages/index.json";

export function App({ storage, boot, opening }: {
  storage: Storage; boot?: Boot; opening?: string;
}) {
  /** The session, made once. */
  const held = useRef<ReturnType<typeof session> | null>(null);
  const catalogue = boot?.catalogue ?? CATALOGUE;
  held.current ??= session({ storage, files: browser_files(),
                             net: browser_net(), catalogue, floor: FLOOR, opening,
                             ...(boot?.view ? { start: boot.view as ViewKind } : {}) });
  const s = held.current;
  /** A bootstrap saying what this build does not read is told once, and still opens. */
  useEffect(() => {
    if (boot?.stray?.length) s.say(`mndflow.yaml: not read — ${boot.stray.join(", ")}`, "note");
  }, [s, boot]);
  const [, bump] = useState(0);
  const [folded, set_folded] = useState<Id[]>([]);
  /** Which region has the keys: the one last pressed or focused in. */
  const zones = useZone();
  /** What a reveal inside a layer asked the canvas to pan to, until the next pick. */
  const [aim, set_aim] = useState<Id | null>(null);
  /** What the catalogue offers, read once. An unbound `net` leaves it empty. */
  const [offered, set_offered] = useState<readonly Offered[]>([]);
  useEffect(() => { void s.listing().then(set_offered); }, [s]);
  const [theme, set_theme] = useState<string>(
    () => localStorage.getItem("mnd.theme") ?? boot?.theme ?? "retro");
  const look = THEMES.find((t) => t.name === theme) ?? THEMES[0];
  const next_look = THEMES[(THEMES.indexOf(look) + 1) % THEMES.length]!;
  /** The tray — open, its tab, what it holds — and how the drawing looks: chrome the shell
   *  holds and the log never sees, kept where every host keeps it. */
  const t = useTray(boot?.tray ?? true);
  const { display, onDisplay } = useDisplay({
    card: { ...UNITS.block }, range: CARD,
    ...(boot?.display?.lattice !== undefined ? { lattice: boot.display.lattice } : {}),
    ...(boot?.display?.legend !== undefined ? { legend: boot.display.legend } : {}),
    ...(boot?.display?.corner ? { corner: boot.display.corner } : {}),
  });
  /** **One display for every room and view**, set on the workspace tab. */
  const { card, legend, corner, lattice } = display;
  const shown = { interfaces: display.ports !== false, frame: display.frame !== false };
  /** What a right drag draws, as the rail left it. */
  const [drawing, set_drawing] = useState<{ module: Id; dir?: Dir; type?: Id }>(
    { module: "line" });
  /** The tray row under the pointer, lit on the canvas where it is drawn. */
  const [hovered, set_hovered] = useState<Id | null>(null);
  const { hold } = t;
  /** The explorer's sections — a package, a definition, its structure — and what each holds. */
  const chain = useChain(s.graph(), SLICES, EDITOR.top, s.view());
  /** A pick on the canvas gives the context back to the canvas, and the sections follow it. A
   *  pick made on a map (`stay`) is already in sight: **picking never jumps**. */
  const pick = (given: Id[], stay = false) => {
    /** A place's box picks its place: what it stands for is what the tray is about. */
    const ids = given.map((id) => boxed_place(s.graph(), id) ?? id);
    set_aim(null);
    /** One card picked on a whole section is brought into sight there: the canvas's own anchor. */
    if (ids.length === 1 && !stay && !is_layer_view(s.view().kind)) {
      act("reveal", { id: ids[0] });
      return;
    }
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
  /** A row's colour and count, read again only when the graph changes. */
  const rowLook = useCallback((id: Id) => row_look(graph, id), [graph]);
  /** The models' tree, which the map lays and the explorer lists: one tree for both. */
  const models = useMemo(() => model_tree(graph), [graph]);
  /** The layer seen from inside, where the canvas looks into one. A whole section has none, and
   *  is not built on. */
  const whole = !is_inside(view.kind);
  const system = !is_layer_view(view.kind);
  /** A diagram is read, never built in: its room hugs what it draws, as a page's does. */
  const diagram = (DIAGRAM_VIEWS as readonly string[]).includes(view.kind);
  const layer = whole ? null : view.layer;
  const said = s.said();

  /** The drawing's proportions are the views module's, so the session's card is applied before
   *  anything is placed. */
  apply_card(card.w, card.h);
  /** Rooms fill toward the window's shape: steady while the tray opens and shuts. */
  const aspect = set_aspect(Math.round((window.innerWidth / Math.max(1, window.innerHeight)) * 10) / 10);

  /** **The map, the models' and the library's**: one treemap of the side the explorer lists,
   *  worked out on every graph change. A component registry draws its own view; a definition's
   *  is entered from the library's map, which stays behind it. */
  const lists = SLICES[view.at]!.lists;
  /** The way to the open layer, through the uses a definition's part is seen through. */
  const way = view.layer && graph.blocks[view.layer] ? way_of(graph, view.layer, view.via) : [];
  const pkg = way[0]?.id ?? null;
  const component = view.kind === "registry" && !graph.blocks[view.layer ?? ""];
  const map = useMemo(() => (!lists || component ? null : section_map(graph, lists, models)),
    [graph, lists, component, card, aspect]);
  /** What the map is gone to: the layer looked into, else the pick on the whole map. */
  const focus_id = is_layer_view(view.kind) ? view.layer : view.pick;
  /** Counted up by every open, entry and leaving, so going to the focus again flies back to it. */
  const [opened, set_opened] = useState(0);
  /** **The block entered from the map**: its own view, drawn alone, held while the open layer is
   *  it or inside it. Opening anything above it returns to the map, as Escape does. */
  const [entry, set_entry] = useState<Id | null>(null);
  const entered = !!entry && way.some((b) => b.id === entry);
  useEffect(() => { if (entry && !entered) set_entry(null); }, [entry, entered]);
  const mapped = !!map && !entered;
  /** **Entering a chip**: flown into while the drawing it is on — a map, or a treemap entered
   *  from it — stays drawn, the entered view laid meanwhile; it takes over when the camera lands.
   *  `inside` where the entry stays. Going anywhere else lets it go. */
  const [entering, set_entering] = useState<{ area: Area; layer: Id; inside: boolean } | null>(
    null);
  useEffect(() => {
    if (entering && view.layer !== entering.layer) set_entering(null);
  }, [entering, view.layer]);
  /** The layer just gone up from, which the camera flies out of where the drawing gone to draws
   *  it as a chip, for that going's count only. */
  const [left, set_left] = useState<{ layer: Id; seq: number } | null>(null);

  /** **A layer laid out ahead answers later** (ELK, in its worker): whatever was drawn last — the
   *  map, another layer, this one before an edit — stays, read only, until it answers. One being
   *  entered is laid while the camera flies into its chip. */
  const ahead = (!mapped || !!entering) && !!view.layer && laid_ahead(view.kind);
  const shape = [view.layer, view.kind, lists, shown.interfaces].join("|");
  const [laid, set_laid] = useState<{ shape: string; scene: Scene } | null>(null);
  useEffect(() => {
    if (!ahead) return;
    let live = true;
    void layer_scene(graph, view.layer!, view.kind, { interfaces: shown.interfaces,
                                                      ...(lists ? { lists } : {}) })
      .then((next) => { if (live) set_laid({ shape, scene: next }); });
    return () => { live = false; };
  }, [graph, ahead, shape, card, aspect]);

  const waiting = ahead && laid?.shape !== shape;
  const last = useRef<Scene | null>(null);

  /** The open layer as its own view draws it: laid ahead, or null until it answers. */
  const own = useMemo((): Scene | null => {
    if (mapped && !entering) return null;
    if (ahead) return waiting ? null : laid!.scene;
    return project(graph, view.layer, { interfaces: shown.interfaces,
                                        look: { kind: view.kind, cut: SLICES[view.at]!.cut,
                                                ...(lists ? { lists } : {}) } });
  }, [graph, mapped, entering, ahead, waiting, laid, view.layer, view.kind, view.at,
      shown.interfaces, card]);
  /** Projected once per graph, view, layer or proportion change; a treemap being flown through
   *  held as it was. */
  const scene = useMemo((): Scene => {
    if (mapped) return map_focus(graph, map!, focus_id);
    if (entering && last.current) return last.current;
    return own ?? last.current ?? { ...EMPTY, layer: view.layer };
  }, [graph, map, mapped, entering, own, focus_id, view.layer]);
  /** A part seen through a use is trailed through it, as it was reached. */
  const trailed = useMemo(() => (view.via?.length && !scene.areas
    ? { ...scene, trail: trail_of(graph, view.layer, view.via) } : scene), [scene, view.via]);

  last.current = scene;

  /** **The canvas edits in every entered view but a registry**: what a view cannot hold, core
   *  refuses and says why. A map — a treemap diagram is one — and a registry are read, never
   *  built on. */
  const treemap = !mapped && !waiting && !!scene.areas;
  const editable = !mapped && !treemap && view.kind !== "registry";
  const arranging = editable && !waiting && scene.slots.includes("layer");

  /** **The sections follow the canvas** — one rule (`held_at`), whatever moved it: the layer opened,
   *  or a pick on the overhead view. Browsing outside the open structure moves neither. */
  const follow = () => {
    const held = held_at(s.graph(), EDITOR, s.view());
    if (held) chain.onTrace(held.path, held.at);
  };
  useEffect(follow, [view.layer, view.kind, view.at]);

  /** What the open layer draws, by id. */
  const drawn = useMemo(() => new Set([...scene.nodes.map((n) => n.id),
                                       ...scene.edges.map((e) => e.id)]), [scene]);

  /** What is lit: the tray row under the pointer, and **every other appearance** of what is
   *  picked — one object, wherever it is drawn. */
  const lit = useMemo(() => [...new Set([
    ...(hovered ? appearances_of(graph, hovered) : []),
    ...[...drawn].filter((id) => !s.picked().includes(id)
      && lit_by(graph, s.picked(), s.route(), id, seen_through(graph, view.layer, id))),
  ])].filter((id) => drawn.has(id)), [graph, hovered, drawn, s.picked(), s.route()]);

  /** The row a table in the tray lights, told by the tray. */
  const [listed, set_listed] = useState<Id | null>(null);

  /** **What lights as picked is what the tray is about**: the pick where it is drawn, else, on a
   *  map, the block the tray falls back to — the area gone to — where the map draws it. One
   *  subject, so the canvas never disagrees with the tray and the explorer. */
  /** **A path walked** (2026-11-04): picking a block that owns a path offers its walk; walking
   *  it lights one hop a step, said in words, the camera fitting both its ends. Picking anything
   *  else lets it go. */
  const one = s.picked().length === 1 ? s.picked()[0]! : null;
  const owner = one && graph.blocks[one] ? path_owner(graph, one) : null;
  const steps = useMemo<Hop[]>(() => (owner ? path_of(graph, owner) : [])
    .map((x) => ({ from: x.from, to: x.to, names: x.name ? [x.name] : [] })), [graph, owner]);
  const [walk_at, set_walk_at] = useState<number | null>(null);
  useEffect(() => set_walk_at(null), [owner]);
  /** **A model walked** (2026-11-08): entering a model with a path puts it on the stack the
   *  tray's overview draws; *into* pushes the sub model a step reaches, *out* pops back to the step it was
   *  entered from. Entering one not on the stack starts it afresh. */
  const [frames, set_frames] = useState<{ model: Id; at: number | null }[]>([]);
  const at_model = layer && is_model(graph, layer) && model_path(graph, layer).length
    ? layer : null;
  useEffect(() => set_frames((f) => {
    if (!at_model) return [];
    const i = f.findIndex((x) => x.model === at_model);
    return i >= 0 ? f.slice(0, i + 1) : [{ model: at_model, at: null }];
  }), [at_model]);
  const told = frames[frames.length - 1]?.model === at_model ? frames[frames.length - 1]! : null;
  const story = useMemo(() => (told ? model_path(graph, told.model) : []), [graph, told?.model]);
  const step_to = (at: number | null) =>
    set_frames((f) => f.map((x, i) => (i === f.length - 1 ? { ...x, at } : x)));
  /** Back to the frame at `depth`, re-entering its model. */
  const back_to = (depth: number) => {
    const f = frames[depth];
    if (!f) return;
    set_frames(frames.slice(0, depth + 1));
    act("read", { id: f.model, at: view.at });
  };
  const hop_said = (h: Hop) => {
    const [from, to] = [shown_name(graph, h.from), shown_name(graph, h.to)];
    const names = h.names.filter((n) => n !== to);
    return `${from} calls ${to}${names.length ? `: ${names.join(", ")}` : ""}`;
  };
  const walked = told ? (told.at === null ? null : story[told.at] ?? null)
    : walk_at === null ? null : steps[walk_at] ?? null;
  /** **The step read** in the tray: the hop's ends, what crosses it, the sub model its far end
   *  is, and what comes next. */
  const step_read = told && walked ? {
    at: told.at!, of: story.length, from: shown_name(graph, walked.from),
    to: shown_name(graph, walked.to), carries: walked.names, next: story[told.at! + 1] ? hop_said(story[told.at! + 1]!) : null,
    into: sub_model(graph, walked.to) ? shown_name(graph, sub_model(graph, walked.to)!) : null,
  } : null;
  const walk = told ? { steps: story, at: told.at, onStep: step_to, said: hop_said, outside: true }
    : steps.length ? { steps, at: walk_at, onStep: set_walk_at, said: hop_said } : null;

  /** **Which camera a drawing has**: a map; a treemap diagram, as an entered model is; read down
   *  the page — a whole section or a diagram; entered and fitted; any other layer whole; or, while
   *  the next drawing is laid, the last one held. */
  const camera_of = (at: Scene, map_on: boolean): Camera => (map_on ? "map"
    : at.areas ? "treemap" : whole || diagram ? "page" : entered || entering ? "fitted" : "layer");
  const as: Camera = waiting ? "held" : camera_of(scene, mapped);
  /** **Where the camera looks** (`camera.ts`): one shot from where the app is. A whole section's
   *  page follows its own pick. */
  const shot = useMemo(() => shot_of({
    graph, scene, seq: opened, map, focus: focus_id, one, walked, as,
    reveal: as === "page" && system ? view.pick : aim,
    left: left?.seq === opened && scene.areas ? area_of(graph, scene, left.layer) : null,
    into: entering ? { area: entering.area, scene: own,
                              as: own ? camera_of(own, false) : "held" } : null,
  }), [graph, scene, opened, map, focus_id, one, walked, as, entered, entering, own, system,
       view.pick, whole, diagram, aim, left]);
  /** **The entered view takes over where the camera lands** in the chip it flew into. */
  const landed = (at: Shot) => {
    if (!at.into || !entering) return;
    set_entering(null);
    if (!entering.inside) set_entry(entering.layer);
  };

  const subject = useMemo(() => {
    const shown = s.picked().filter((id) => lit_by(graph, s.picked(), s.route(), id,
                                                   seen_through(graph, view.layer, id)));
    if (s.picked().length) return scene.areas ? on_map(graph, scene, shown) : shown;
    /** A list in the tray is about its lit row. */
    if (listed && drawn.has(listed)) return [listed];
    if (!mapped || system) return shown;
    return view.layer && drawn.has(view.layer) ? [view.layer] : [];
  }, [graph, scene, drawn, s.picked(), s.route(), mapped, system, view.layer, listed]);

  /** **What the selection touches** elsewhere — its lines' far ends, its stand-ins — lit wherever
   *  drawn; nothing dims. */
  const touched = useMemo(() => [...new Set(s.picked().flatMap((id) => touches_of(graph, id)))]
    .filter((id) => drawn.has(id) && !s.picked().includes(id)), [graph, drawn, s.picked()]);

  /** **Reading**: core says what a subject enters (`Session.read`). From a chip — on the map or
   *  a treemap entered from it — the camera flies into it, only as far as the entered view will
   *  stand, and the view takes over where it lands, fading in (2026-11-08); without a chip, or
   *  with reduced motion, at once. Inside an
   *  entered view the entry stays, unless reading went somewhere outside it — a use read from a
   *  definition's registry — whose layer becomes the entry before it draws, so the map never
   *  shows between. What enters nothing is opened instead: focused on its map, or picked where
   *  it is. */
  const enter = (id: Id, at?: unknown, inner = false, via?: unknown) => {
    if (!id) return;
    const from = typeof at === "number" ? { from: at } : {};
    const to = s.read(id, { ...from, ...(inner ? { inner } : {}),
                            ...(typeof via === "string" ? { via } : {}) });
    /** A box only a drawing has — a model's box in a registry — is a place, not a block. */
    if (!to) {
      if (s.graph().blocks[id]) act("open", { id, ...(at === undefined ? {} : { at }) });
      return;
    }
    set_opened((n) => n + 1);
    t.release();
    follow();
    const layer = to.layer!;
    const inside = entered && way_of(s.graph(), layer, to.via).some((b) => b.id === entry);
    /** Flown into from the map, or from a treemap whose entry holds what is read: one read
     *  outside the entry takes over at once, so the map never shows between. */
    const area = scene.areas && (mapped || inside) && !still()
      ? area_of(s.graph(), scene, inner ? layer : id) : null;
    if (area && area.depth > 0) { set_entering({ area, layer, inside }); return; }
    if (!inside) flushSync(() => set_entry(layer));
  };

  /** **Going up**: the camera flies out of the chip left, set where the view stood, wherever
   *  the drawing gone to draws it as one. */
  const went_up = (from: Id | null) => {
    if (from) set_left({ layer: from, seq: opened + 1 });
    set_opened((n) => n + 1);
  };

  /** **Leaving**: the map takes over, flown out to from the chip left. The chip left is picked,
   *  as a click on it would: what was picked inside it the map does not draw, and the tray
   *  follows the pick. */
  const leave = () => {
    const area = map ? area_of(s.graph(), map, s.view().layer) : null;
    set_entry(null);
    if (area && area.depth > 0) s.pick([area.id]);
    went_up(s.view().layer);
  };

  const act = (name: string, given?: Record<string, unknown>) => {
    const args = given;
    /** Undo and redo arrive through the same channel as actions. */
    if (name === "undo") { s.undo(); return; }
    if (name === "redo") { s.redo(); return; }
    /** Entering and leaving a room are not steps. */
    if (name === "read") {
      enter(String(args?.["id"] ?? s.view().pick ?? s.view().layer ?? ""), args?.["at"],
            args?.["inner"] === true, args?.["via"]);
      return;
    }
    if (name === "widen") { leave(); return; }
    const was = s.view().layer;
    s.go(name, args ?? {});
    /** Opening what holds the layer open is going up out of it. */
    const now = s.view().layer;
    if (name === "open") went_up(was && was !== now && (!now || path(s.graph(), was)
      .some((b) => b.id === now)) ? was : null);
    /** Opening, leaving and revealing are navigation's: the sections follow where it went, and
     *  the canvas pans to what it revealed inside a layer. */
    if (name === "open" || name === "reveal") {
      t.release();
      follow();
      /** Revealing aims the camera at the block revealed; opening aims at nothing, the camera
       *  fits the room. */
      set_aim(name === "reveal" && args?.["id"] && is_inside(s.view().kind)
        ? s.picked()[0] ?? null : null);
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
    /** The workspace's display answers, kept where every host keeps them. */
    if (["lattice", "legends", "legend_corner", "card", "frame", "ports"]
          .includes(name)) {
      onDisplay(name, args);
      return;
    }
    if (name === "relate_with") {
      const dir = args!["dir"] ? String(args!["dir"]) as Dir : undefined;
      set_drawing({ module: args!["module"] as Id,
                    ...(dir && dir !== "none" ? { dir } : {}),
                    ...(args!["type"] ? { type: String(args!["type"]) } : {}) });
      return;
    }
    /** The rail's palette: notation for the focus, made in it. A group gathers what is picked;
     *  a region starts empty across the room. */
    if (name === "@notation") {
      const type = String(args!["type"]);
      const here = room_id();
      if (type === "group") { act("group", { members: [...s.picked()] }); return; }
      if (type === "region") { act("group", { type, members: [], layer: here }); return; }
      const named = type === "note" || type === "label" ? prompt(`the ${type} says`) : "";
      if (named !== null) act("create", { name: named, type, parent: here });
      return;
    }
    /** **Crossing sections is asked for**: the tray's *view model* enters a model in the models,
     *  its *uses* a definition's registry in the library. */
    if (name === "@view_model" || name === "@uses") {
      const side = name === "@view_model" ? "structure" : "domain";
      enter(String(args!["id"]), SLICES.findIndex((x) => x.lists === side));
      return;
    }
    /** The rail's quick editor: the workspace and the open package, in the tray. */
    if (name === "@workspace") {
      t.onHold({ of: "id", id: graph.root });
      t.onTab("overview");
      return;
    }
    if (name === "@package_info" && pkg) {
      t.onHold({ of: "id", id: pkg });
      t.onTab("overview");
      return;
    }
    /** A new usage is typed by the definition picked, where one is. */
    if (name === "@new_usage") {
      const named = prompt("name the new block");
      const def = s.picked().find((id) => graph.blocks[id]?.def);
      if (named !== null) {
        act("create", { name: named, parent: room_id(), ...(def ? { type: def } : {}) });
      }
      return;
    }
    if (name === "@new_definition") {
      const named = prompt("name the new definition")?.trim();
      if (named) act("define", { name: named });
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
    /** A markdown file copied onto a card, and where it came from: attached again, refreshed. */
    if (name === "@attach") {
      void browser_files().text?.([".md", ".mdx", "text/markdown"]).then((got) => {
        if (got) act("attach", { id: args!["id"], text: got.text, source: got.path });
      });
      return;
    }
    /** Where the tray is pointed; writes nothing. */
    act(name, args);
  };

  /** A folder of markdown usages and the definitions they name, brought in as one package. */
  const gather = async () => {
    const got = await browser_files().folder?.();
    if (!got) return;
    const { text, made, clashes } = collect(got.name, got.files, s.graph());
    const faults = s.bring(text);
    if (faults.length) return;
    const said = [made.length ? `made ${made.join(", ")}` : "",
                  clashes.length ? `refused ${clashes.join(", ")}, said twice` : ""].filter(Boolean);
    if (said.length) s.say(`brought in ${got.name} — ${said.join("; ")}`, "note");
  };

  /** A section's header: the canvas draws it whole from its top, nothing held or picked; the tray
   *  shows the section — every definition, or the workspace. */
  const section = (at: number) => {
    s.see("map", null, at);
    chain.onClear?.(at);
    if (SLICES[at]!.lists === "domain") {
      t.onHold({ of: "defs", only: "all" });
      t.onTab("contents");
    }
    else t.release();
  };

  /** **The explorer browses**: a row chosen is held in its section and shown in the tray. Inside
   *  the structure the canvas draws, the canvas follows: on the map a block is gone to, its area
   *  flown to, as a click on it is; in an entered layer it is gone to where it is drawn and
   *  picked there — the open layer's own row stays where it is. Anywhere else it stays. A package points the
   *  tray at its definitions, and is picked as any row is. */
  const choose = (at: number, id: Id | null, via?: Id) => {
    chain.onChoose(at, id, via);
    const b = id ? s.graph().blocks[id] : undefined;
    if (b && b.id === view.layer) s.pick([]);
    else if (b) {
      /** A part read through a usage is its definition's, never the structure's: picked as is. */
      const slice = SLICES[at]!;
      const inside = slice.cut === null && view.at === at
        && in_section(s.graph(), b.id, chain.roots[at] ?? null, slice.cut, slice.lists)
        && trace(s.graph(), EDITOR, b.id).roots[at] === chain.roots[at];
      if (inside && mapped) { act("open", { id: b.id }); s.pick([b.id]); }
      else if (inside) act("reveal", { id: b.id });
      else s.pick([b.id], via);
    }
    // The tray last, as revealing lets go of what it held.
    if (b?.parent === null) { t.onHold({ of: "id", id: b.id }); t.onTab("contents"); }
    else t.release();
  };

  /** The layer in focus, where the shell's makers make what they make. */
  const room_id = (): Id => layer ?? graph.root;

  const load = async () => {
    const text = await browser_files().open();
    if (text !== null) s.load(text);
  };

  return (
    <div className="app" {...zones.bind}>
      <WorkspaceHeader brand="mndflow"
        where={
          <button className="where" title="This session is kept in the browser. Export a snapshot to keep a copy elsewhere."
                  onClick={() => void s.save()}>
            {graph.blocks[graph.root]?.name ?? graph.root} · {Object.values(graph.blocks)
              .filter((b) => !b.def && b.parent).length} blocks · {s.log().length} steps
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
          <button title="import a source folder: a folder of markdown cards and the definitions they name"
                  onClick={() => void gather()}>
            <Icon name="add_folder" />
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
        drawn={scene.areas ? undefined : drawn}
        route={s.route()}
        folded={folded}
        onAct={act}
        onFold={(id, shut) =>
          set_folded((f) => (shut ? [...new Set([...f, id])] : f.filter((x) => x !== id)))}
        onPick={pick}
        /** **Opening a row reads it**, as a double-click on its card does. A part seen through a
         *  usage is entered through it, else picked on the usage's layer: never in its
         *  definition. */
        onOpen={({ at, id, via }) => {
          act("read", { id, at, ...(via ? { via } : {}) });
        }}
        onLeave={() => act("open")}
        onSection={section}
        onNamed={(id) => t.onHold({ of: "id", id })}
        holding={hold?.of === "id" ? hold.id : null}
        /** A registry opens on the canvas as its treemap, and the tray holds its entries. */
        onRegistry={(registry) => {
          act("open", { id: registry_id(registry) });
          t.onHold({ of: "registry", registry });
          t.onTab("components");
        }}
        registry={hold?.of === "registry" ? hold.registry
          : registry_at(graph, view.layer) ?? registry_of(graph, view.layer)}
        chain={{ ...chain, onChoose: choose }}
        rowLook={rowLook}
        models={models}
        keys={zones.zone === "explorer"}
      />

      {/** **The tray sits by the canvas's shape** (2026-11-08): right of a landscape canvas, below
        *  a portrait one, so the canvas keeps a steadier shape. */}
      <main className={t.open && aspect > 1 ? "side" : undefined}>
        <Stage
          scene={trailed}
          graph={graph}
          /** The path starts from the section the canvas looks at; a click draws it whole. */
          head={{ label: SLICES[view.at]!.label, onOpen: () => section(view.at) }}
          empty={!whole && layer && !scene.nodes.length
            ? empty_of(graph, layer) : null}
          /** The shared menu; a right-click inside the selection is about the selection. */
          menu={(at, on, shut, spot, only, given) => (
            <Menu ctx={{ graph, layer, cells: s.cells(),
                         picked: !on ? [...s.picked()]
                               : s.picked().includes(on) ? [...s.picked()] : [on] }}
                  at={at} spot={spot} only={only} given={given}
                  onAct={act} onShut={shut} />
          )}
          /** What a drop comes to is core's: a block arrives as a reference, a definition retypes
           *  what it lands on or makes one. Onto a cell is seated there; a whole section's ground
           *  is the workspace's. */
          onDrop={(id, spot, land) => {
            /** Where the pointer was, clear of what is already there. */
            const at = clear_of(
              scene.nodes.filter((n) => n.id !== id && !holds(n) && !n.data.on)
                         .map(box_of),
              { x: spot.x - BLOCK.w / 2, y: spot.y - BLOCK.h / 2 }, BLOCK);
            const cell = land.cell && land.into ? land.into : null;
            const made = drop_of(graph, {
              ids: [id], onto: "drawing", parent: cell ?? layer ?? graph.root,
              on: land.line ?? land.over, spot: at,
              ...(cell ? { cell: `${land.cell!.r},${land.cell!.c}` } : {}) });
            if (made) s.go(made.act, made.args);
          }}
          picked={subject}
          walk={walk}
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
          {...(drawing.type ? { type: drawing.type } : {})}
          said={said?.text ?? null}
          onSaid={() => s.say("")}
          lit={lit}
          touched={touched}
          /** An echo of a pick the canvas cannot draw is not a gesture. */
          onPick={(ids) => {
            const shown = s.picked().filter((id) => drawn.has(id));
            const echo = shown.length < s.picked().length && ids.length === shown.length
              && ids.every((id) => shown.includes(id));
            if (!echo) pick(ids, !!scene.areas);
          }}
          onAct={act}
          /** A whole section, a definition drawn with what describes it, or a diagram, is not
           *  moved about. Outside the world, those and a folder are read down the page, fitted to
           *  their width: a section from its anchor. */
          onAdjust={arranging && !whole ? adjust : () => undefined}
          editable={editable}
          shot={shot}
          onLand={landed}
          entered={entered && !!map}
          onClear={() => s.clear(mapped)}
          keys={zones.zone === "canvas"}
        />
        <Tray
          graph={graph}
          /** A block drawn as what it means is what the tray is about. */
          layer={system ? null : view.layer}
          {...(lists ? { lists } : {})}
          open={t.open}
          onOpen={t.onOpen}
          {...(t.tab ? { tab: t.tab } : {})}
          onTab={t.onTab}
          /** **One object**: a plain stand-in picked is its block, described and edited as one. */
          picked={s.picked().map((id) => (graph.blocks[id]?.settings ? id : object_of(graph, id)))}
          onHover={set_hovered}
          onLit={set_listed}
          hold={hold}
          onHold={t.onHold}
          onView={(_home, id) => { s.go("reveal", { id }); t.release(); }}
          offered={offered}
          display={display}
          onAct={chrome}
          walk={told ? {
            frames: frames.map((f) => ({
              model: shown_name(graph, f.model), at: f.at,
              steps: model_path(graph, f.model).map((h) => ({
                to: shown_name(graph, h.to), from: shown_name(graph, h.from),
                tint: row_look(graph, h.to).tint, into: !!sub_model(graph, h.to) })) })),
            step: step_read,
            onStep: step_to,
            onInto: () => {
              const sub = walked ? sub_model(graph, walked.to) : null;
              if (!sub) return;
              set_frames([...frames, { model: sub, at: null }]);
              act("read", { id: sub, at: view.at });
            },
            onOut: () => back_to(frames.length - 2),
            onFrame: back_to,
          } : null}
        />
      </main>
    </div>
  );
}

/** The editor's sections, made once. */
const SLICES = editor_slices();
