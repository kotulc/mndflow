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
 *  **Three sizes and two doors (W.1a).** Shut is a bar; partial is a quarter
 *  of the stage; full is the project's view toggle set to `table`. The tab
 *  and the toggle are the only doors — it no longer shuts on a click
 *  elsewhere, because picking the block you wanted to inspect was that click.
 *  The chosen size sticks across a reload, so a working tray is chosen once.
 *
 *  **`full` is the table view at full stage size (W.1).** Setting the
 *  project's view toggle to `table` is the door — App reads no diagram in
 *  that mode, so this is what fills the space it would have drawn in,
 *  instead of the module drawing a second listing of the same layer. The tab
 *  is withheld there rather than left bound to nothing: the toggle that
 *  opened it is the way back. */

import { useEffect, useMemo, useState, type Ref } from "react";

import { Contents } from "./Contents";
import { Guard } from "./Guard";
import { Icon } from "../modules/icons";
import type { Picked } from "../project";
import type { Dir, Definition, Field, Flow, Graph } from "../graph/types";
import { childrenOf, nameOf, titleOf } from "../graph/fold";
import { type Grazed } from "../canvas/card";

/** The chosen size, kept out of the log: it is how somebody is looking, not
 *  anything about the model. */
const SIZE = "mndflow.tray.open.v1";

function stuck(): boolean {
  try {
    return localStorage.getItem(SIZE) === "open";
  } catch {
    return false;
  }
}

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
  /** Descend into a row, or navigate the crumb trail (null = project) — the
   *  crumbs only draw at full stage size (W.1), but the door is the same one
   *  either way. */
  onOpen: (id: string | null) => void;
  /** Trail for the crumbs. Derived from the graph when the page omits it. */
  path?: string[];
  /** One layer up. Defaults to opening the open layer's parent. */
  onUp?: () => void;
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
  /** The table view at full stage size — the project's view toggle set to
   *  `table` (W.1). Forces the tray open regardless of its own state. */
  full?: boolean;
  /** Passed to `Contents`: a row dragged out of the explorer lands here as a
   *  reference (P.7). Only the stage-sized table takes it. */
  onRefer?: (target: string) => void;
  /** Passed to `Contents`: fields the table gives a column of their own (P.8). */
  columns?: string[];
};

export function Panel(props: Props) {
  const { graph, view, picked, onJoinGroup, hostRef, full = false } = props;
  const [open, setOpen] = useState(stuck);
  const stage = full || open;

  /** The size sticks, so a working tray is chosen once rather than on every
   *  reload. Full is the toggle's and is not a size anybody chose here. */
  useEffect(() => {
    try {
      localStorage.setItem(SIZE, open ? "open" : "shut");
    } catch {
      // The size is lost on reload, nothing more.
    }
  }, [open]);

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
    <section className={`tray ${stage ? "open" : ""} ${full ? "full" : ""}`} ref={hostRef}>
      <div className="tray-bar">
        {/* At full size the table names the layer itself, in its crumb — so the
            bar's chip would be the same word twice on one screen. */}
        {!full && <span className="name">{where}</span>}

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

        {!full && (
          <button
            className={`tray-tab ${open ? "on" : ""}`}
            aria-expanded={open}
            title={open ? "Hide what this layer holds" : "Everything this layer holds"}
            onClick={() => setOpen(!open)}
          >
            contents <Icon name={open ? "more" : "less"} />
          </button>
        )}
      </div>

      <div className="tray-body">
        {stage && (
          <Guard what="This layer's contents">
            <Contents {...props} />
          </Guard>
        )}
      </div>
    </section>
  );
}
