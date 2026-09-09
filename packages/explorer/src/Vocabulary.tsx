/** The workspace's vocabulary: every block definition it can reach.
 *
 *  **A rendering of `graph.defs`, not a folder of blocks.** Nothing here has an
 *  id of its own and nothing is realised until a row is dragged out — which is
 *  why it needs no reserved block, no seed change and no door migration, and
 *  why it works in every workspace already written.
 *
 *  **A row is a block in the explorer with a pin mark.** Its own at the top,
 *  each package a branch below, the base kinds among them. One row per base
 *  kind: a `ws.<kind>` override stands in the base row's place rather than
 *  beside it.
 *
 *  Pure like every other surface here — it holds which branches are shut, and
 *  every gesture leaves as an action name or a selection. */

import { useState } from "react";
import { is_own_id, module_named, vocabulary,
         type Act, type Definition, type Graph, type Id } from "@mnd/core";
import { Icon, type IconName } from "@mnd/theme";

/** What a row is being dragged as. **Its own payload**, because a definition
 *  dropped on the drawing makes a block naming it and a block dropped there
 *  makes a reference — one target, two gestures, and the payload is what tells
 *  them apart. */
export const DRAGGED_DEF = "text/mnd-def";

/** The mark each base kind wears. **The explorer's own copy**, the way the
 *  tree keeps one: a surface may not reach another surface for them. */
const MARK: Record<string, IconName> = {
  block: "role_leaf", folder: "role_folder", resource: "role_resource",
  reference: "role_reference", interface: "role_interface",
  group: "role_group", grid: "role_table", note: "role_note",
};

export type VocabularyProps = {
  graph: Graph;
  /** Which row is being described in the tray. **Beside the block selection,
   *  never among it** — a definition is not a block, so it could not ride in
   *  `picked` without pretending to be one. */
  picked: Id | null;
  onPick: (id: Id | null) => void;
  onAct: Act;
};

/** What a package is called in the listing. */
const titled = (from: string | null) => from ?? "this workspace";

export function Vocabulary({ graph, picked, onPick, onAct }: VocabularyProps) {
  const [shut, set_shut] = useState<readonly string[]>([]);
  const groups = vocabulary(graph);

  /** **The workspace's own row, whichever group it is listed in.** An override
   *  is filed under the base kind it replaces, so *is this mine to edit* is a
   *  question about the record and never about the branch it is drawn in. */
  const mine = (d: Definition) => !d.from;

  return (
    <section className="vocabulary" aria-label="vocabulary">
      <div className="head">
        <Icon name="pin" size={12} />
        <span>vocabulary</span>
      </div>
      {groups.map((g) => {
        const key = g.from ?? "";
        const folded = shut.includes(key);
        return (
          <div key={key} className="pack">
            <div className="pack-head"
                 onClick={() => set_shut((was) =>
                   folded ? was.filter((x) => x !== key) : [...was, key])}>
              <Icon name={folded ? "more" : "less"} size={11} />
              <span className="from">{titled(g.from)}</span>
              <span className="count">{g.defs.length}</span>
            </div>
            {folded ? null : (
              <ul>
                {g.defs.map((d) => {
                  const kind = module_named(graph, d.id);
                  const own = is_own_id(d.id);
                  return (
                    <li key={d.id}
                        className={[picked === d.id ? "picked" : "",
                                    own ? "overridden" : ""].filter(Boolean).join(" ")}
                        draggable
                        title={own ? `${d.name} — this workspace's own`
                                   : mine(d) ? d.name : `${d.name} — from ${titled(g.from)}`}
                        onDragStart={(e) => {
                          e.dataTransfer?.setData(DRAGGED_DEF, d.id);
                          if (e.dataTransfer) e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => onPick(picked === d.id ? null : d.id)}>
                      <span className="mark">
                        <Icon name={MARK[kind] ?? "role_leaf"} size={13} />
                      </span>
                      <span className="label">{d.name}</span>
                      {mine(d) ? <Icon name="pin" size={10} /> : null}
                      {/* **Adopt, or give it back.** A base kind with no
                          override is made the workspace's own; one that has an
                          override — or a definition this workspace pinned — is
                          dissolved back into whatever named it. */}
                      {mine(d) ? (
                        <button className="act" title={`unpin ${d.name}`}
                                onClick={(e) => { e.stopPropagation();
                                                  if (picked === d.id) onPick(null);
                                                  onAct("unpin", { id: d.id }); }}>
                          <Icon name="remove" size={11} />
                        </button>
                      ) : MARK[d.id] ? (
                        <button className="act" title={`make ${d.name} this workspace's own`}
                                onClick={(e) => { e.stopPropagation();
                                                  onAct("adopt", { kind: d.id }); }}>
                          <Icon name="pin" size={11} />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}
