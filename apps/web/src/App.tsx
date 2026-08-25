/** The app, assembled.
 *
 *  Bind ports, hold the log, fold, project, render — and every gesture returns
 *  an action name, which it runs, which returns mutations, which it appends.
 *  That loop is the whole app.
 *
 *  **If this file turns out to be interesting, a seam is in the wrong place.** */

import { useEffect, useRef, useState } from "react";
import { adjustments, matches, offer, session, type Id, type Reading } from "@mnd/core";
import { snap } from "@mnd/layout";
import { seed } from "@mnd/defs";
import { reseat, rewall, view } from "@mnd/views";
import { Explorer } from "@mnd/explorer";
import { Stage } from "@mnd/stage";
import type { Drag } from "@mnd/render";
import { Options, groups_of } from "@mnd/options";
import { Tray } from "@mnd/tray";
import { Terminal, type Match } from "@mnd/terminal";
import { ENTRY, domain, domain_of, next, turn } from "@mnd/terminal/loop";
import { wordings } from "./workflows";
import { browser_files, browser_net, browser_storage } from "./ports";
import { browser_score } from "./score";

const THEMES = ["retro", "modern", "light"] as const;

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
  const offered = Object.values(graph.defs).filter((d) => d.group === "view");
  const named = graph.defs[showing]?.components?.["view"] ?? {};

  /** **A result is a table, on the stage.** What matched is handed to the real
   *  table view as its contents — the same seam a view block hands it what it
   *  holds — so there is never a second listing anywhere. */
  const lit = narrowed ? matches(graph, narrowed) : pointed;
  const module = view(narrowed ? "table" : String(named["module"] ?? "block"))!;
  const scene = module.project(graph, narrowed ? null : layer, {
    holds: narrowed ? lit : undefined,
    reading: named["reading"] as Reading,
    interfaces: shown.interfaces,
  });

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
   *  else. Where it lands is the Scene's to say — the app only writes it. */
  const adjust = (drag: Drag) => {
    if (drag.kind === "seat") {
      const seat = reseat(scene, drag.on, drag.to);
      if (seat) s.adjust("seat", adjustments.seat(drag.on, seat.side, seat.at));
      return;
    }
    if (drag.kind === "wall") {
      const side = rewall(scene, drag.on, drag.end, drag.to);
      if (side) s.adjust("wall", adjustments.wall(drag.on, drag.end, side));
      return;
    }
    /** A card dropped where nothing was is a **place**. The layer snaps it to
     *  the grid, so what is stored is where it came to rest rather than where
     *  the pointer was. */
    if (drag.kind !== "move") return;
    const box = scene.boxes.find((b) => b.id === drag.on);
    if (!box) return;
    const at = { x: box.x + (drag.to.x - drag.from.x),
                 y: box.y + (drag.to.y - drag.from.y) };
    s.adjust("place", adjustments.place([{ id: drag.on, x: snap(at.x), y: snap(at.y) }]));
  };

  /** The rail's controls are display state or ordinary actions — it writes
   *  nothing itself, so this is where each one lands. */
  const chrome = (name: string, args?: Record<string, unknown>) => {
    if (name === "interfaces") { set_shown((c) => ({ ...c, interfaces: !!args!["show"] })); return; }
    if (name === "lines") { set_shown((c) => ({ ...c, angles: !!args!["angles"] })); return; }
    if (name === "arrange") { act("arrange", { layer, ...args }); return; }
    if (name === "export") { void s.save(); return; }
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
        <span className="name">mndflow</span>
        <span className="where" title="the working session">
          {Object.keys(graph.blocks).length - 1} blocks · {s.log().length} steps
        </span>
        <span className="tools">
          <select title="which view" value={showing}
                  onChange={(e) => set_showing(e.target.value)}>
            {offered.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button title="undo" onClick={() => s.undo()}>↤</button>
          <button title="redo" onClick={() => s.redo()}>↦</button>
          <button title="export the workspace" onClick={() => void s.save()}>⤒</button>
          <button title="import a workspace" onClick={() => void load()}>⤓</button>
          {narrowed ? (
            <button title={`stop narrowing to “${narrowed}”`}
                    onClick={() => { set_narrowed(""); s.say(""); }}>
              ⌫ {narrowed}
            </button>
          ) : null}
          <button title="the terminal" aria-pressed={terminal}
                  onClick={() => set_terminal((t) => !t)}>&gt;_</button>
          <button title={`theme: ${theme}`}
                  onClick={() => set_theme(THEMES[(THEMES.indexOf(theme as never) + 1)
                                                  % THEMES.length]!)}>◐</button>
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
          picked={s.picked()}
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
                                   interfaces: shown.interfaces, angles: shown.angles },
                                 chrome)} />
    </div>
  );
}
