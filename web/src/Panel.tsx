/** The bottom tray: a way in and out of the contents table.
 *
 *  The shell and nothing else. There used to be a second view here — the
 *  selection on its own — but a table that lists everything already contains
 *  whatever is selected, so the two said the same thing in different shapes.
 *  What that view could *edit* now lives on the rows; see `Contents`.
 *
 *  It stays shut until asked for. The table covers the drawing it describes,
 *  so it opens on the tab and closes on a click anywhere else. */

import { useEffect, useState, type Ref } from "react";

import { Contents } from "./Contents";
import { Guard } from "./Guard";
import type { Picked } from "./core/project";
import type { Dir, Flow, Graph } from "./core/types";
import { nameOf } from "./core/fold";
import type { Grazed } from "./NodeCard";

type Props = {
  graph: Graph;
  view: string | null;
  picked: Picked;
  onSave: (id: string, body: string) => void;
  onRetype: (id: string, type: string) => void;
  onMarkPort: (id: string, flow: Flow | null) => void;
  onAddAttr: (holder: string, name: string) => void;
  onUpdateAttr: (holder: string, was: string,
                 patch: { name?: string; value?: string }) => void;
  onDropAttr: (holder: string, name: string) => void;
  /** Take a member out of a group. */
  onLeaveGroup: (id: string, group: string) => void;
  onRename: (id: string, label: string) => void;
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  onSay: (message: string) => void;
  /** What this diagram calls its elementary unit. */
  unit: string;
  onPick: (next: { kind: "node" | "edge"; id: string } | null) => void;
  onHint: (next: Grazed) => void;
  onDelete: (id: string) => void;
  onUnlink: (id: string) => void;
  onRelation: (id: string, relation: string) => void;
  onSetDir: (id: string, dir: Dir) => void;
  onFlip: (id: string) => void;
  /** Go to where a proxy's block actually lives. */
  onReveal: (id: string) => void;
  /** So the canvas can measure the tray and keep its own controls above it. */
  hostRef?: Ref<HTMLElement>;
};

export function Panel(props: Props) {
  const { graph, view, hostRef } = props;
  const [open, setOpen] = useState(false);

  /** A click anywhere outside puts it away. The table covers the drawing it is
   *  describing, so getting back to the canvas should not need aiming at a
   *  chevron first — and the tab is one click either way. */
  useEffect(() => {
    if (!open) return undefined;

    const away = (event: PointerEvent) => {
      const host = (hostRef as { current?: HTMLElement | null })?.current;
      if (host && !host.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("pointerdown", away);

    return () => document.removeEventListener("pointerdown", away);
  }, [open, hostRef]);

  // Where you are, so the table's scope is never in doubt.
  const where = view ? nameOf(graph, graph.elements[view]) : "project";

  return (
    <section className={`tray ${open ? "open" : ""}`} ref={hostRef}>
      <div className="tray-bar">
        <span className="name">{where}</span>

        <button
          className={`tray-tab ${open ? "on" : ""}`}
          aria-expanded={open}
          title={open ? "Hide what this layer holds" : "Everything this layer holds"}
          onClick={() => setOpen(!open)}
        >
          contents {open ? "▾" : "▴"}
        </button>
      </div>

      <div className="tray-body">
        {open && (
          <Guard what="This layer's contents">
            <Contents {...props} />
          </Guard>
        )}
      </div>
    </section>
  );
}
