/** The app, assembled.
 *
 *  Bind ports, hold the log, fold, project, render — and every gesture returns
 *  an action name, which it runs, which returns mutations, which it appends.
 *  That loop is the whole app.
 *
 *  **If this file turns out to be interesting, a seam is in the wrong place.** */

import { useEffect, useMemo, useRef, useState } from "react";
import { adjustments, matches, offer, session, type Id, type Reading } from "@mnd/core";
import { nearest_seat, snap } from "@mnd/views";
import { seed } from "@mnd/defs";
import { box_of, view } from "@mnd/views";
import { Explorer, Menu } from "@mnd/explorer";
import { Icon } from "@mnd/theme";
import { Stage } from "@mnd/stage";
import type { Adjust } from "@mnd/stage";
import { Options, groups_of } from "@mnd/options";
import { Tray } from "@mnd/tray";
import { Terminal, type Match } from "@mnd/terminal";
import { ENTRY, domain, domain_of, next, turn } from "@mnd/terminal/loop";
import { wordings } from "./workflows";
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

/** The wording the question loop speaks. Data, gathered once. */
const said_in = wordings();

/** Where this host keeps its definition packages. A host fact — nothing above
 *  an app may assume where *outside the workspace* is. */
const CATALOGUE = "/packages/index.json";

/** The chip that starts the conversation. **Not a fifth command** — it is one
 *  more thing offered, and everything it reaches is reachable by gesture. */
const GUIDE = { name: "guide me", about: "answer questions and it builds the model for you" };

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
  /** Which view is showing is **display state**: it changes what you see and
   *  nothing about the project, so it never enters the log. */
  const [showing, set_showing] = useState("view.block");
  /** Chrome the shell holds and the log never sees. */
  const [tray, set_tray] = useState(false);
  /** Shown at all, and open rather than shut — two states, two controls: the
   *  header says whether it is there, its own toggle says how big. */
  const [terminal, set_terminal] = useState(false);
  const [wide, set_wide] = useState(false);
  /** The mirror off. **Not the strip collapsed** — two questions, two controls. */
  const [quiet, set_quiet] = useState(false);
  const [shown, set_shown] = useState({ interfaces: true, angles: true });
  /** The conversation. **Off is the whole app working**, which is what keeps it
   *  optional; a fresh workspace has nothing to look at, so it starts on. */
  const [asking, set_asking] = useState(true);
  const [last, set_last] = useState<string | undefined>(undefined);
  /** What the workspace is narrowed to. Display state: it changes what you are
   *  looking at and nothing about the project, so it never enters the log. */
  const [narrowed, set_narrowed] = useState("");
  /** What help is pointing at. **The same lit-target look a narrowing uses** —
   *  one mechanism, two callers, never a third. */
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

  /** The definition supplies which module draws and how it is read, so three
   *  of the six offered here are the same module read differently. */
  const offered = useMemo(
    () => Object.values(graph.defs).filter((d) => d.group === "view"), [graph]);
  const named = graph.defs[showing]?.components?.["view"];
  /** Read out as values rather than kept as a bag: the bag is a fresh object
   *  whenever a definition names no view, and nothing below may depend on
   *  something that is new every time. */
  const drawn_by = narrowed ? "table" : String(named?.["module"] ?? "block");
  const reading = named?.["reading"] as Reading | undefined;

  /** **A result is a table, on the stage.** What matched is handed to the real
   *  table view as its contents — the same seam a view block hands it what it
   *  holds — so there is never a second listing anywhere. */
  /** **What a narrowing found and what help is pointing at are two things.**
   *  Only the first reaches a projection, so only the first is keyed on the
   *  graph — pointing at a control while nothing is narrowed must not send the
   *  whole layer round again. */
  const found = useMemo(
    () => (narrowed ? matches(graph, narrowed) : null), [graph, narrowed]);
  const lit = found ?? pointed;
  const holds = found ?? undefined;
  const module = view(drawn_by)!;

  /** **Projected once per change, not once per render.**
   *
   *  A projection is a pure function of the graph, the open layer and how it is
   *  being read — and every one of those is a value the shell already holds. It
   *  is not cheap: it lays out a layer, resolves a look for every card and
   *  derives what each container holds. Run in the render body it ran again on
   *  every keystroke in the terminal and every theme toggle, and handed the
   *  canvas, the tree and the rail a whole new set of objects each time.
   *
   *  **`graph` is a sound key because a graph is never edited in place** — every
   *  change to the log refolds it from empty and hands back a new one, so its
   *  identity changing is exactly what "the model changed" means. */
  const scene = useMemo(
    () => module.project(graph, narrowed ? null : layer, {
      holds, reading, interfaces: shown.interfaces,
    }),
    [module, graph, layer, narrowed, holds, reading, shown.interfaces]);

  /** What the conversation is about: the block in focus, or the open layer when
   *  nothing is. It **reads context and never changes it**. */
  const about = s.picked()[0] ?? layer;
  const question = asking ? next(said_in, graph, about, last) : null;

  /** What is offered here, with what each needs and what it would act on —
   *  both read off the registry, so **help teaches whatever the app currently
   *  is** rather than a second copy of it written down somewhere. */
  const offered_here = offer({ graph, layer, picked: s.picked() }).map((a) => ({
    name: a.name,
    about: a.about,
    asks: a.args.filter((g) => g.required).map((g) => g.name).join(", "),
    on: a.on.some((scope) => scope === "layer") && !s.picked().length
      ? (layer ? [layer] : [])
      : s.picked(),
  }));

  const act = (name: string, args?: Record<string, unknown>) => {
    if (name === GUIDE.name) { set_asking(true); return; }
    /** **Not actions, and they arrive here anyway.** Undoing writes no
     *  mutation — it moves the log — so it is not on the registry; but every
     *  surface reaches the app through one channel, and a second one just for
     *  these would be a second thing for every panel to learn. */
    if (name === "undo") { s.undo(); return; }
    if (name === "redo") { s.redo(); return; }
    s.go(name, args ?? {});
  };

  /** One answer, as the actions it means — run here, appended here, undoable
   *  like anything else. **The loop writes no mutation of its own.** */
  const answer = (text: string | null) => {
    if (text === null || !question) { set_asking(false); return; }
    const doing = turn(question, text, { graph, layer: about, said: said_in, score: scoring });
    for (const d of doing) s.go(d.action, d.args);
    set_last(question.operation);
    /** The mirror says what the answer did, in the words the domain uses —
     *  which is the one place `terms` is load-bearing rather than decorative. */
    const words = domain(said_in, domain_of(graph, about)).terms;
    if (!doing.length) s.say(`nothing here is called “${text}” yet`);
    else if (question.operation === "relate") {
      s.say(`one ${words.relation.toLowerCase()} drawn`);
    }
    else if (question.operation !== ENTRY) {
      s.say(`${doing.length} ${words.node.toLowerCase()}${doing.length > 1 ? "s" : ""}`);
    }
  };

  /** An adjustment is positional and unsayable, and undoable like anything
   *  else. **The canvas already worked out where it landed** — it snaps to the
   *  grid and constrains a seated interface to its own card — so the app only
   *  writes what it was handed. */
  const adjust = (a: Adjust) => {
    /** A corner dragged writes the two fields a block has always carried, plus
     *  where it now sits: a resize from a left or top handle moves the card as
     *  well as sizes it. */
    if (a.kind === "size") {
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
    /** A line's end slid round the border it meets. **Pinning is what this
     *  writes** — a perch is worked out from where the two cards ended up, so
     *  the only way to say *there* is to say it. */
    if (a.kind === "anchor") {
      s.adjust("anchor", adjustments.wall(a.on, a.end, a.side, a.at));
      return;
    }
    /** A seated interface slides along the card it sits on: what changed is
     *  which wall and how far, and both are read off where it came to rest. */
    const drawn = scene.nodes.find((n) => n.id === a.on);
    const on = drawn?.data.on ? scene.nodes.find((n) => n.id === drawn.data.on) : null;
    if (on) {
      const seat = nearest_seat(box_of(on), a.to);
      s.adjust("seat", adjustments.seat(a.on, seat.side, seat.at));
      return;
    }
    s.adjust("place", adjustments.place([{ id: a.on, x: snap(a.to.x), y: snap(a.to.y) }]));
  };

  /** The rail's controls are display state or ordinary actions — it writes
   *  nothing itself, so this is where each one lands. */
  const chrome = (name: string, args?: Record<string, unknown>) => {
    if (name === "interfaces") { set_shown((c) => ({ ...c, interfaces: !!args!["show"] })); return; }
    if (name === "lines") { set_shown((c) => ({ ...c, angles: !!args!["angles"] })); return; }
    if (name === "arrange") { act("arrange", { layer, ...args }); return; }
    if (name === "export") { void s.save(); return; }
    if (name === "view") { set_showing(String(args!["id"])); return; }
  };

  /** One of the terminal's four. **Help is the fallback**, so only the three
   *  that write anything are answered here. */
  const command = (match: Match) => {
    if (match.command === "add") { act("create", { label: match.rest }); return; }
    if (match.command === "filter") {
      set_narrowed(match.rest);
      const found = match.rest ? matches(graph, match.rest).length : 0;
      s.say(!match.rest ? "" : found
        ? `${found} matched “${match.rest}”`
        : `nothing matched “${match.rest}”`);
      return;
    }
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
        {/* Identity yields under pressure; the tools never do. A long workspace
            name truncates here rather than shoving export off the row. */}
        <span className="identity">
          <h1>mndflow</h1>
          <span className="domain">
            {graph.blocks[graph.root]?.label || "untitled"}
          </span>
        </span>

        {/* Where the work lives, said all the time rather than only when it
            breaks. One control: it names the working copy, and clicking it
            takes a snapshot out. */}
        <button className="where" title="This session is kept in the browser. Export a snapshot to keep a copy elsewhere."
                onClick={() => void s.save()}>
          working session · {Object.keys(graph.blocks).length - 1} blocks · {s.log().length} steps
        </button>

        <span className="tools">
          <button title="undo" onClick={() => s.undo()}><Icon name="undo" /></button>
          <button title="redo" onClick={() => s.redo()}><Icon name="redo" /></button>
          <button title="export the workspace" onClick={() => void s.save()}>
            <Icon name="export_workspace" />
          </button>
          <button title="import a workspace" onClick={() => void load()}>
            <Icon name="import_file" />
          </button>
          {/* A narrowing you are standing in reads as a word — the term it is
              holding is the whole point, and a mark would hide it. */}
          {narrowed ? (
            <button className="word" title={`stop narrowing to “${narrowed}”`}
                    onClick={() => { set_narrowed(""); s.say(""); }}>
              <Icon name="clear" /> {narrowed}
            </button>
          ) : null}
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
          offered={[...(asking ? [] : [GUIDE]), ...offered_here]}
          said={quiet && said?.kind === "mirror" ? null : said?.text ?? null}
          context={layer ? `in ${graph.blocks[layer]?.label ?? "a layer"}` : "the workspace"}
          expanded={wide}
          onExpand={set_wide}
          onAct={(name) => act(name)}
          onCommand={command}
          score={scoring}
          question={question}
          onAnswer={answer}
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
        lit={lit}
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
            <Menu ctx={{ graph, layer,
                         picked: !on ? [...s.picked()]
                               : s.picked().includes(on) ? [...s.picked()] : [on] }}
                  at={at} spot={spot} only={only} given={given}
                  onAct={act} onShut={shut} />
          )}
          /** A row dragged out of the tree lands where it was dropped. */
          onDrop={(id, spot) => s.adjust("place",
            adjustments.place([{ id, x: snap(spot.x), y: snap(spot.y) }]))}
          picked={s.picked()}
          curved={shown.angles === false}
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
          picked={s.picked()}
          onPick={(ids) => s.pick(ids)}
          onAct={act}
        />
      </main>

      <Options groups={groups_of({ slots: scene.slots, arrangement: arranged,
                                   interfaces: shown.interfaces, angles: shown.angles,
                                   views: offered.map((d) => ({ id: d.id, name: d.name })),
                                   showing },
                                 chrome)} />
    </div>
  );
}
