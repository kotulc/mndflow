/** The components tab: everything an element carries, one band per kind — its attributes, its
 *  ports, its tags — each port and tag in its definition's colour. Attributes edit here as they
 *  did on their own tab; a port is added and dropped here, and edited on its own keys. */

import { constraint_at, constraints_stated, expects_of, frozen, interface_at, may_seat, part_id,
         ports_on, shown_name, tag_at, tags_stated, type Act, type Graph,
         type Id } from "@mnd/core";
import { entry_look, tint_attrs } from "@mnd/views";
import { Attributes } from "./Attributes";
import { Band } from "./Body";
import { Table, type Column } from "./Table";

export type CarriedProps = { graph: Graph; id: Id; onAct?: Act };

const PORTS: readonly Column[] = [
  { key: "name", label: "name" }, { key: "type", label: "interface" },
  { key: "flow", label: "flow" }, { key: "seat", label: "seat" }, { key: "on", label: "declared" },
];


export function Carried({ graph, id, onAct }: CarriedProps) {
  const block = graph.blocks[id];
  const fixed = frozen(graph, id);
  const ports = block ? ports_on(graph, id) : [];
  const walled = !!block && may_seat(graph, id);
  const tags = tags_stated(graph, id);
  const held = constraints_stated(graph, id);
  const rules = expects_of(graph, id);
  return (
    <div className="components">
      <Band label="attributes" />
      <Attributes key={id} graph={graph} id={id} {...(onAct ? { onAct } : {})} />
      {walled || ports.length ? (
        <>
          <Band label="ports" />
          <Table columns={[...PORTS]} acts="5rem"
                 empty="it has no ports yet"
                 tools={onAct && walled && !fixed ? (
                   <button className="chip" title="put a port on its wall"
                           onClick={() => onAct("interface", { owner: id })}>add port</button>
                 ) : undefined}
                 rows={ports.map((p) => {
                   const at = part_id(id, p.id);
                   const mine = p.holder === id;
                   return {
                     id: at,
                     ...(mine ? {} : { className: "inherited" }),
                     cells: {
                       name: shown_name(graph, at),
                       type: <Painted graph={graph} entry={p.type}
                                      word={interface_at(graph, p.type)?.name ?? "interface"} />,
                       flow: p.flow ?? "both",
                       seat: p.side ? `${p.side} ${p.at ?? 0.5}` : "auto",
                       on: mine ? "here" : shown_name(graph, p.holder),
                     },
                     ...(onAct && mine && !fixed ? {
                       onDrop: () => onAct("delete", { ids: [at] }), drop: `drop ${shown_name(graph, at)}`,
                     } : {}),
                   };
                 })} />
        </>
      ) : null}
      <Band label="tags" />
      <div className="carried">
        {tags.ids.length ? tags.ids.map((t) => (
          <Painted key={t} graph={graph} entry={t} word={tag_at(graph, t)?.name ?? t} chip />
        )) : <span className="faint">it carries no tags; the card tab sets them</span>}
        {tags.ids.length && tags.from && tags.from !== id ? (
          <span className="faint">from {shown_name(graph, tags.from)}</span>
        ) : null}
      </div>
      <Band label="constraints" />
      <div className="carried">
        {held.ids.length ? held.ids.map((c) => (
          <Painted key={c} graph={graph} entry={c} word={constraint_at(graph, c)?.name ?? c} chip />
        )) : <span className="faint">it is held to no constraints; the card tab sets them</span>}
        {rules.required?.length ? (
          <span className="faint">must answer {rules.required.join(", ")}</span>
        ) : null}
      </div>
    </div>
  );
}

/** A component's name in its definition's colour: a library entry's look, read down its chain. */
export function Painted({ graph, entry, word, chip = false }: { graph: Graph; entry: Id | undefined;
                                                         word: string; chip?: boolean }) {
  const tint = tint_attrs(entry ? entry_look(graph, entry) : undefined);
  return <span className={chip ? "painted chip-like" : "painted"} {...tint}>{word}</span>;
}
