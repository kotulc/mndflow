/** The bottom tray: a way in and out of the contents table.
 *
 *  The shell and nothing else. There used to be a second view here — the
 *  selection on its own — but a table that lists everything already contains
 *  whatever is selected, so the two said the same thing in different shapes.
 *  What that view could *edit* now lives on the rows; see `Contents`.
 *
 *  Joining an existing group is the exception that stays on the shell: the
 *  table already lists membership and can take a block out, but picking which
 *  group to join needs the layer's groups and the selection together — one
 *  control on the bar, not another column.
 *
 *  It stays shut until asked for. The table covers the drawing it describes,
 *  so it opens on the tab and closes on a click anywhere else. */

import { useEffect, useMemo, useState, type Ref } from "react";

import { Contents } from "./Contents";
import { Guard } from "./Guard";
import { Icon } from "../modules/icons";
import type { Picked } from "../project";
import type { Dir, Definition, Field, Flow, Graph } from "../graph/types";
import { childrenOf, nameOf, titleOf } from "../graph/fold";
import { type Grazed } from "../canvas/card";

type DefPatch = {
  fields?: Field[];
  body?: string;
  icon?: string;
  line?: Definition["line"];
  head?: Definition["head"];
  size?: Definition["size"];
  components?: Record<string, Record<string, unknown>>;
};

type Props = {
  graph: Graph;
  view: string | null;
  picked: Picked;
  onSave: (id: string, body: string) => void;
  onRetype: (id: string, type: string) => void;
  onMarkPort: (id: string, flow: Flow | null) => void;
  onAddField: (holder: string, name: string) => void;
  onUpdateField: (holder: string, was: string, patch: Partial<Field>) => void;
  onDropField: (holder: string, name: string) => void;
  /** Take a member out of a group. */
  onLeaveGroup: (id: string, group: string) => void;
  /** Put a block into a group that is already there. */
  onJoinGroup: (id: string, group: string) => void;
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
  /** Make or amend a project definition. */
  onDefine: (name: string, id?: string, form?: string, patch?: DefPatch) => void;
  onUndefine: (id: string) => void;
  /** So the canvas can measure the tray and keep its own controls above it. */
  hostRef?: Ref<HTMLElement>;
};

export function Panel(props: Props) {
  const { graph, view, picked, onJoinGroup, hostRef } = props;
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
  // At the top of a project the scope is the project itself, which is named.
  const where = view ? nameOf(graph, graph.elements[view]) : titleOf(graph);

  /** A selected block that can still join at least one group on this layer.
   *  Groups and edges are out: joining is `group` with `into`, and only a
   *  block names membership. */
  const joining = useMemo(() => {
    if (!picked || picked.kind !== "node") return null;
    const node = graph.elements[picked.id];
    if (!node || node.form !== "block" || node.side != null) return null;

    const into = childrenOf(graph, view)
      .filter((n) => n.form === "group" && !node.groups.includes(n.id));
    if (!into.length) return null;

    return { id: node.id, into };
  }, [graph, view, picked]);

  return (
    <section className={`tray ${open ? "open" : ""}`} ref={hostRef}>
      <div className="tray-bar">
        <span className="name">{where}</span>

        {joining && (
          <select
            className="add-attr"
            aria-label="Add to an existing group"
            title="Add to an existing group"
            value=""
            onChange={(event) => {
              const group = event.target.value;
              if (group) onJoinGroup(joining.id, group);
            }}
          >
            <option value="" disabled>+ group</option>
            {joining.into.map((group) => (
              <option key={group.id} value={group.id}>
                {nameOf(graph, group) || "group"}
              </option>
            ))}
          </select>
        )}

        <button
          className={`tray-tab ${open ? "on" : ""}`}
          aria-expanded={open}
          title={open ? "Hide what this layer holds" : "Everything this layer holds"}
          onClick={() => setOpen(!open)}
        >
          contents <Icon name={open ? "more" : "less"} />
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
