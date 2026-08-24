/** The working area, and the one thing that never yields.
 *
 *  It hosts one view at a time and turns a gesture into an action name. Like
 *  the explorer it is a pure function of its props: it holds nothing, and every
 *  gesture leaves as a name somebody else runs.
 *
 *  The left button works what is already there; the right button makes
 *  something new. Within the right button, a click makes the thing that sits at
 *  a point and a drag makes the thing that has extent. */

import { useEffect } from "react";
import type { Act } from "@mnd/core";
import { SceneView, type Drag, type Gesture } from "@mnd/render";
import type { Scene } from "@mnd/views";

/** An adjustment: positional, unsayable, gesture-only. Never named or ranked,
 *  and it writes and undoes like everything else. */
export type Adjust = (drag: Drag) => void;

export type StageProps = {
  scene: Scene;
  picked: readonly string[];
  onAct: Act;
  onAdjust?: Adjust;
  onPick: (ids: string[]) => void;
  /** What the app is saying, if anything. One channel, one place to look. */
  said?: string | null;
  onSaid?: () => void;
};

export function Stage({ scene, picked, onAct, onAdjust, onPick, said, onSaid }: StageProps) {
  /** The shell owns the global keys; a view module owns the rest. */
  useEffect(() => {
    const on_key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.tagName === "INPUT";
      if (typing) return;
      const one = picked.length === 1 ? picked[0]! : null;
      if (e.key === "Escape") { onPick([]); onSaid?.(); }
      else if (e.key === "Enter" && one) {
        const label = prompt("rename");
        if (label !== null) onAct("rename", { id: one, label });
      }
      else if ((e.key === "Delete" || e.key === "Backspace") && one) {
        onAct(scene.routes.some((r) => r.id === one) ? "unlink" : "delete", { id: one });
      }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && picked.length) {
        e.preventDefault();
        onAct("group", { members: [...picked] });
      }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        onPick(scene.boxes.map((b) => b.id));
      }
      else return;
    };
    window.addEventListener("keydown", on_key);
    return () => window.removeEventListener("keydown", on_key);
  }, [scene, picked, onAct, onPick, onSaid]);

  const gesture = (g: Gesture) => {
    if (g.button === "left") {
      if (g.count === 2) {
        if (g.on && g.kind === "box") onAct("open", { id: g.on });
        else if (!g.on) onAct("up");
        return;
      }
      onPick(g.on ? [g.on] : []);
      return;
    }
    // The right button makes something new where there is nothing.
    if (!g.on) {
      const label = prompt("name it");
      if (label !== null) onAct("create", { label, spot: { x: g.at.x, y: g.at.y } });
    }
  };

  return (
    <section className="stage">
      <Crumbs trail={scene.trail} onAct={onAct} />
      <SceneView
        scene={scene}
        picked={picked}
        onGesture={gesture}
        onDragTo={(from, to) => {
          if (to) onAct("relate", { from, to });
        }}
        onDrag={(drag) => {
          /** A sweep is a selection, which is not an adjustment — nothing is
           *  written and there is nothing to undo. */
          if (drag.kind === "sweep") { onPick(drag.caught); return; }
          /** Dropping one card on another is a **move**, which is sayable;
           *  dropping it anywhere else is a **place**, which is not. */
          if (drag.kind === "move" && drag.over && drag.over !== drag.on) {
            onAct("move", { id: drag.on, parent: drag.over });
            return;
          }
          onAdjust?.(drag);
        }}
      />
      {said ? (
        <div className="strip" role="status">
          <span>{said}</span>
          <button onClick={onSaid} title="dismiss">×</button>
        </div>
      ) : null}
    </section>
  );
}

function Crumbs({ trail, onAct }: { trail: Scene["trail"]; onAct: Act }) {
  const shown = trail.length > 4 ? [trail[0]!, { id: "…", label: "…" }, ...trail.slice(-2)] : trail;
  return (
    <nav className="crumbs">
      {shown.map((t, i) => (
        <span key={t.id + i}>
          {i > 0 ? <b> / </b> : null}
          {t.id === "…"
            ? <span className="elided" title={trail.map((x) => x.label).join(" / ")}>…</span>
            : <button onClick={() => onAct("open", { id: t.id })}>{t.label}</button>}
        </span>
      ))}
      {trail.length > 1 ? <button className="up" title="up one layer"
                                  onClick={() => onAct("up")}>↑</button> : null}
    </nav>
  );
}
