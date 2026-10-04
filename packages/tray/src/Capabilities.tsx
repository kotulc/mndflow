/** What a block may do: a definition's traits and capabilities, a section of their own on its
 *  element tab. **Stated on the definition**, so every block following it answers the same; a
 *  block shows none of its own. */

import { useState } from "react";
import { all_defs, allows_split, block_base, def_at, domain_of, is_tag, traits_of, type Act,
         type Allowed, type Graph, type Id } from "@mnd/core";
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
    tip: "What it may hold as a group or grid, drawn inline: anything, nothing, or only these definitions." },
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
  const set = (name: string, value: string) =>
    onAct("look", { ids: [target.id], key: "allows", name, value });
  const base = block_base(graph, target.id);
  const holder = base === "group" || base === "grid";

  return (
    <div className="col abilities">
      <Band label="capabilities" />
      <Body>
        <Traits graph={graph} id={target.id} onAct={onAct} />
        {ROWS.filter((r) => !r.holders || holder).map((r) => (
          <Setting key={r.key} graph={graph} name={`${r.key}-${target.id}`} word={r.word}
                   tip={r.tip} own={own[r.key]} inherited={inherited[r.key]}
                   onSet={(value) => set(r.key, value)} />
        ))}
      </Body>
    </div>
  );
}

/** A definition's traits: chips for the set in force — faint while it is the chain's — a picker
 *  for another, and *reset* to give the set back to the chain. Stating one states the whole set. */
function Traits({ graph, id, onAct }: { graph: Graph; id: Id; onAct: Act }) {
  const own = graph.blocks[id]?.traits;
  const held = traits_of(graph, id);
  const offered = all_defs(graph)
    .filter((d) => is_tag(graph, d.id) && d.settings && !held.includes(d.id))
    .sort((a, z) => a.name.localeCompare(z.name));
  const write = (ids: Id[] | null) => onAct("trait", { ids: [id], traits: ids });

  return (
    <Line label="traits" className="spread"
          tip="Capability tags: each one carries settings. Inherited until this definition states its own set.">
      <span className={["picks", own ? "" : "read"].filter(Boolean).join(" ")}>
        {held.map((t) => (
          <button key={t} className="opt tag" title={own ? `let go of ${graph.blocks[t]?.name ?? t}` : "inherited"}
                  onClick={() => write(held.filter((x) => x !== t))}>
            {graph.blocks[t]?.name ?? t}{own ? <Icon name="remove" size={9} /> : null}
          </button>
        ))}
        <select value="" aria-label="add a trait" onChange={(e) => write([...held, e.target.value])}>
          <option value="">add…</option>
          {offered.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {own ? (
          <button className="opt" title="give the traits back to what it extends"
                  onClick={() => write(null)}>reset</button>
        ) : null}
      </span>
    </Line>
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
