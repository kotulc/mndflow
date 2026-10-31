/** **The components tab, read first**: the card on the left, and on the right every section the
 *  element has at once — attributes, ports, behaviours, tags, constraints — each list opening on
 *  its band, a row each on shared columns. A section it lacks is absent; nothing is added here.
 *  Hovering a row lights it on the card. */

import { useState } from "react";
import { attributes_of, behaviours_of, constraint_at, constraints_stated, def_of, definition_uses,
         interface_at, part_id, ports_on, resolved, shown_name, signature_of, tag_at,
         tags_stated, type_name, type Attribute, type Graph, type Id } from "@mnd/core";
import { entry_look, tint_attrs } from "@mnd/views";
import { Empty, Lead, List, Section, type Item } from "./Lists";

export type CarriedProps = { graph: Graph; id: Id };

export function Carried({ graph, id }: CarriedProps) {
  const [lit, set_lit] = useState<string | null>(null);
  /** A stand-in reads as what it stands for, as its card does. */
  const at = graph.blocks[id] ? resolved(graph, id).card : id;
  const sections = [attributes(graph, at), ports(graph, at), behaviours(graph, at),
                    tags(graph, at), constraints(graph, at)].filter((s) => s.lists.length);
  return (
    <div className="reads">
      <Lead graph={graph} id={id} lit={lit} />
      <div className="lists">
        {sections.length ? sections.map((s) => (
          <Section key={s.name} name={s.name} about={s.about}>
            {s.lists.map((l) => <List key={l.label} label={l.label} items={l.items}
                                      onLight={set_lit} />)}
          </Section>
        )) : (
          <Section name="components" about="What it carries: attributes, ports, behaviours, tags">
            <Empty>
              {shown_name(graph, id)} carries nothing yet. Attributes and ports come from its
              definition, which it does not have; typing it gives it them.
            </Empty>
          </Section>
        )}
      </div>
    </div>
  );
}

type Part = { name: string; about: string; lists: { label: string; items: Item[] }[] };

/** Rows grouped under bands, in the order their bands first appear. */
function banded(rows: readonly { band: string; item: Item }[]): Part["lists"] {
  const out = new Map<string, Item[]>();
  for (const r of rows) out.set(r.band, [...(out.get(r.band) ?? []), r.item]);
  return [...out].map(([label, items]) => ({ label, items }));
}

/** **Attributes, banded by where they are declared**: a definition's as declarations, how many of
 *  its uses answer each; a use's as answers, unanswered ones quiet. */
function attributes(graph: Graph, id: Id): Part {
  const b = graph.blocks[id];
  const def = b?.def ? id : def_of(graph, id);
  const all = attributes_of(graph, def);
  const uses = b?.def ? definition_uses(graph, id).flatMap((u) => graph.blocks[u.id] ?? []) : [];
  /** A line answers as a block does. */
  const values = (b ?? graph.edges[id])?.values;
  const answer = (a: Attribute) => values?.find((v) => v.name === a.name)?.value;
  const rows = all.map((a) => {
    const value = b?.def ? undefined : answer(a);
    const answered = uses.filter((u) => u.values?.some((v) => v.name === a.name && v.value));
    const says = b?.def ? (uses.length ? `answered by ${answered.length} of ${uses.length}` : "")
      : value ?? a.default ?? "not answered";
    return { band: a.from === id ? "declared here" : `from ${shown_name(graph, a.from)}`,
             item: { id: a.name, mark: <span className="dash">–</span>, name: a.name,
                     kind: type_name(graph, a.type), says,
                     ...(!b?.def && value === undefined ? { quiet: true } : {}) } };
  });
  return { name: b?.def ? "declares" : "attributes",
           about: "Its attributes: what a definition declares, and what a use answers",
           lists: banded(rows) };
}

/** **Ports, banded by in and out**, each in its interface's colour. */
function ports(graph: Graph, id: Id): Part {
  const rows = (graph.blocks[id] ? ports_on(graph, id) : []).map((p) => {
    const flow = p.flow ?? "both";
    const name = shown_name(graph, part_id(id, p.id));
    return { band: flow === "both" ? "both ways" : flow,
             item: { id: name, mark: <span className={`seat-mark ${flow}`} />, name,
                     kind: <span className="painted" {...tint_attrs(entry_look(graph, p.type ?? ""))}>
                       {interface_at(graph, p.type)?.name ?? "interface"}</span>,
                     says: [p.side ? `${p.side} seat` : "auto seat",
                            p.holder === id ? "" : `from ${shown_name(graph, p.holder)}`]
                       .filter(Boolean).join(" · ") } };
  });
  return { name: "ports", about: "Where lines meet it: in, out, or both ways",
           lists: banded(rows) };
}

/** **Behaviours, by signature**: its own, then each it gets from what it extends. */
function behaviours(graph: Graph, id: Id): Part {
  const rows = behaviours_of(graph, id).map((x) => ({
    band: x.parent === id ? "own" : `from ${shown_name(graph, x.parent ?? "")}`,
    item: { id: x.id, mark: <span className="fn">ƒ</span>, name: shown_name(graph, x.id),
            kind: signature_of(graph, x.id).slice(shown_name(graph, x.id).length),
            says: x.description ?? "" } }));
  return { name: "behaviours", about: "What it does, by signature; one with steps is a diagram",
           lists: banded(rows) };
}

/** **Tags, banded by family**: what each extends, as solid dots in their colours. */
function tags(graph: Graph, id: Id): Part {
  const said = tags_stated(graph, id);
  const rows = said.ids.map((t) => {
    const tag = tag_at(graph, t);
    return { band: tag?.type ? tag_at(graph, tag.type)?.name ?? "tags" : "tags",
             item: { id: t, mark: <span className="dot" {...tint_attrs(entry_look(graph, t))} />,
                     name: tag?.name ?? t, kind: "tag",
                     says: [tag?.description ?? "",
                            said.from && said.from !== id ? `from ${shown_name(graph, said.from)}`
                              : ""].filter(Boolean).join(" · ") } };
  });
  return { name: "tags", about: "What it is marked with; the legend says what each colour means",
           lists: banded(rows) };
}

/** **Constraints** it is held to. */
function constraints(graph: Graph, id: Id): Part {
  const held = constraints_stated(graph, id);
  const rows = held.ids.map((c) => ({
    band: held.from && held.from !== id ? `from ${shown_name(graph, held.from)}` : "held to",
    item: { id: c, mark: <span className="dash">§</span>, name: constraint_at(graph, c)?.name ?? c,
            kind: "constraint", says: constraint_at(graph, c)?.description ?? "" } }));
  return { name: "constraints", about: "The rules it is held to: the values it must answer",
           lists: banded(rows) };
}
