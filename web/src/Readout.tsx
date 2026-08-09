/** The readout that shares the terminal rail with the option chips.
 *
 *  Three views of the project that are worth glancing at but never worth the
 *  canvas: the relation kinds it uses, what has been done to it, and how the
 *  templates score against what is being typed. They are tabs rather than
 *  panes because only one is ever being read, and the rail is one slot wide.
 *
 *  It owns which tab is showing and nothing else — each tab is its own
 *  component, unchanged by living here. */

import { useState } from "react";

import type { Graph, Step } from "./core/types";
import { Log } from "./Log";
import { Relations } from "./Relations";
import { Scores } from "./Scores";

const TABS = ["relations", "actions", "matching"] as const;
type Tab = (typeof TABS)[number];

type Props = {
  graph: Graph;
  steps: Step[];
  draft: string;
  onAddRelation: (name: string) => void;
  onRenameRelation: (from: string, to: string) => void;
  onDropRelation: (name: string) => void;
};

export function Readout(props: Props) {
  const { graph, steps, draft } = props;
  const { onAddRelation, onRenameRelation, onDropRelation } = props;
  const [tab, setTab] = useState<Tab>("actions");

  return (
    <section className="readout">
      <div className="tabs" role="tablist">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={tab === name}
            className={tab === name ? "on" : ""}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="readout-body">
        {tab === "relations" && (
          <Relations
            graph={graph}
            onAdd={onAddRelation}
            onRename={onRenameRelation}
            onDrop={onDropRelation}
          />
        )}
        {tab === "actions" && <Log steps={steps} />}
        {tab === "matching" && <Scores text={draft} active={graph.domain} />}
      </div>
    </section>
  );
}
