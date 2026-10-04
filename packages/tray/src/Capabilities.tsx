/** What a block may do: a definition's capabilities, a section of their own on its element tab.
 *  **Stated on the definition**, so every block following it answers the same; a block shows
 *  none of its own. */

import { useState } from "react";
import { all_defs, allows_split, def_at, domain_of, type Act, type Allowed, type Graph,
         type Id } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Band, Body, Line, Pick } from "./Body";
import { def_path } from "./holder";

export type CapabilitiesProps = { graph: Graph; id: Id; onAct: Act };

/** The capabilities that take a flag or a list of definitions. */
type Listed = "ports" | "holds" | "members";

/** Each list row: its capability, its word, and what it asks. */
const ROWS: { key: Listed; word: string; tip: string; holders?: boolean }[] = [
  { key: "holds", word: "children",
    tip: "What it may own as children, inside it: anything, nothing, or only these definitions." },
  { key: "members", word: "members", holders: true,
    tip: "What it may gather as a group or grid, on its own layer: anything, nothing, or only these definitions." },
  { key: "ports", word: "ports",
    tip: "Whether interfaces may sit on its walls: any, none, or only these definitions." },
];

/** The answer that says nothing here, so the chain answers instead. */
const INHERIT = "";

/** The answer that limits a capability to the definitions picked. */
const LIMIT = "limit";

export function Capabilities({ graph, id, onAct }: CapabilitiesProps) {
  const target = def_at(graph, id);
  if (!target || domain_of(graph, id) !== "block") return null;
  const { own, inherited } = allows_split(graph, target.id);
  /** A package's definition is never written: the look action writes the workspace's word. */
  const set = (name: string, value: string) =>
    onAct("look", { ids: [target.id], key: "allows", name, value });
  const shape = own.holder ?? inherited.holder;

  return (
    <div className="col abilities">
      <Band label="capabilities" />
      <Body>
        <Line label="holder" className="spread"
              tip={`Whether it gathers blocks on its own layer — as a boundary round them, or as a grid of cells. Everything following ${target.name} answers the same.`}>
          <Pick name={`holder-${target.id}`} on={own.holder ?? INHERIT}
                of={[{ value: INHERIT, word: "inherit" }, { value: "none", word: "none" },
                     { value: "group", word: "group" }, { value: "grid", word: "grid" }]}
                onPick={(v) => set("holder", v)} />
        </Line>
        {ROWS.filter((r) => !r.holders || (shape && shape !== "none")).map((r) => (
          <Setting key={r.key} graph={graph} name={`${r.key}-${target.id}`} word={r.word}
                   tip={r.tip} own={own[r.key]} inherited={inherited[r.key]}
                   onSet={(value) => set(r.key, value)} />
        ))}
      </Body>
    </div>
  );
}

/** One list capability: inherit, yes, no, or limited to the definitions picked. **The picklist
 *  is always drawn**, and only takes input while limiting — otherwise it reads what the chain
 *  gives where that is a list, and is empty where it is not. */
function Setting({ graph, name, word, tip, own, inherited, onSet }: {
  graph: Graph; name: string; word: string; tip: string;
  own: Allowed | undefined; inherited: Allowed | undefined; onSet: (value: string) => void;
}) {
  /** Picking the limit opens the picker before anything is written. */
  const [picking, set_picking] = useState(false);
  const listed = Array.isArray(own) ? own : null;
  const on = picking || listed ? LIMIT : own === undefined ? INHERIT : String(own);
  const limiting = on === LIMIT;
  const shown = limiting ? listed ?? [] : on === INHERIT && Array.isArray(inherited) ? inherited : [];
  const offered = all_defs(graph)
    .filter((d) => domain_of(graph, d.id) === "block" && !listed?.includes(d.id))
    .sort((a, z) => def_path(graph, a).localeCompare(def_path(graph, z)));
  const called = (d: Id) => (def_at(graph, d) ? def_path(graph, def_at(graph, d)!) : d);
  /** Letting go of the last one gives the capability back to the chain. */
  const write = (ids: Id[]) => { set_picking(false); onSet(ids.join(",")); };

  return (
    <Line label={word} tip={tip} className="spread">
      <Pick name={name} on={on}
            of={[{ value: INHERIT, word: "inherit" }, { value: "true", word: "yes" },
                 { value: "false", word: "no" }, { value: LIMIT, word: "limit to:" }]}
            onPick={(v) => {
              set_picking(v === LIMIT);
              if (v !== LIMIT) onSet(v);
            }} />
      <span className={["picks", limiting ? "" : "read"].filter(Boolean).join(" ")}>
        {shown.map((d) => limiting ? (
          <button key={d} className="opt tag" title={`let go of ${graph.blocks[d]?.name ?? d}`}
                  onClick={() => write(listed!.filter((x) => x !== d))}>
            {called(d)}<Icon name="remove" size={9} />
          </button>
        ) : <span key={d} className="opt tag" title="inherited">{called(d)}</span>)}
        <select value="" aria-label={`${word} definitions`} disabled={!limiting}
                onChange={(e) => write([...(listed ?? []), e.target.value])}>
          <option value="">{limiting ? "add…" : ""}</option>
          {offered.map((d) => <option key={d.id} value={d.id}>{def_path(graph, d)}</option>)}
        </select>
      </span>
    </Line>
  );
}
