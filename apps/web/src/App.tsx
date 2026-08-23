/** The app, assembled.
 *
 *  Bind ports, hold the log, fold, project, render — and every gesture returns
 *  an action name, which it runs, which returns mutations, which it appends.
 *  That loop is the whole app.
 *
 *  **If this file turns out to be interesting, a seam is in the wrong place.** */

import { useEffect, useRef, useState } from "react";
import { adjustments, session, type Id, type Reading } from "@mnd/core";
import { snap } from "@mnd/layout";
import { seed } from "@mnd/defs";
import { reseat, rewall, view } from "@mnd/views";
import { Explorer } from "@mnd/explorer";
import { Stage } from "@mnd/stage";
import type { Drag } from "@mnd/render";
import { browser_files, browser_storage } from "./ports";

const THEMES = ["retro", "modern", "light"] as const;

export function App() {
  /** Lazily, and once. `useRef(session(...))` evaluates its argument on every
   *  render — the ref keeps the first, but each of the others still opens
   *  storage and can write to it. */
  const held = useRef<ReturnType<typeof session> | null>(null);
  held.current ??= session({ storage: browser_storage(), files: browser_files(),
                             defs: seed() });
  const s = held.current;
  const [, bump] = useState(0);
  const [folded, set_folded] = useState<Id[]>([]);
  const [theme, set_theme] = useState<string>(
    () => localStorage.getItem("mnd.theme") ?? "retro");
  /** Which view is showing is **display state**: it changes what you see and
   *  nothing about the project, so it never enters the log. */
  const [showing, set_showing] = useState("view.block");

  useEffect(() => { s.watch(() => bump((n) => n + 1)); }, [s]);
  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    localStorage.setItem("mnd.theme", theme);
  }, [theme]);

  const graph = s.graph();
  const layer = s.layer();
  const said = s.said();

  /** The definition supplies which module draws and how it is read, so three
   *  of the six offered here are the same module read differently. */
  const offered = Object.values(graph.defs).filter((d) => d.group === "view");
  const named = graph.defs[showing]?.components?.["view"] ?? {};
  const module = view(String(named["module"] ?? "block"))!;
  const scene = module.project(graph, layer, { reading: named["reading"] as Reading });

  const act = (name: string, args?: Record<string, unknown>) => {
    s.go(name, args ?? {});
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
          <button title={`theme: ${theme}`}
                  onClick={() => set_theme(THEMES[(THEMES.indexOf(theme as never) + 1)
                                                  % THEMES.length]!)}>◐</button>
        </span>
      </header>

      <Explorer
        graph={graph}
        open={layer}
        picked={s.picked()}
        folded={folded}
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
      </main>
    </div>
  );
}
