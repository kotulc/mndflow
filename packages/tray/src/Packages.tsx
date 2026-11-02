/** What the workspace draws on, on its components tab: the packages it holds and those the
 *  catalogue offers as filter rows under its card, each a list beside them; how one more gets in. */

import { useState } from "react";
import { all_defs, BASE_PACKAGE, domain_of, package_of, packages, type Act,
         type Graph } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { NOOP } from "./Body";
import { ALL, Filters, Lead, List, Section, type Item } from "./Lists";

/** One row of the catalogue, as the session reads it. */
export type Offered = { name: string; about: string };

export type PackagesProps = {
  graph: Graph;
  /** What the catalogue offers, so a name can be picked rather than remembered. */
  offered?: readonly Offered[];
  /** The filter row chosen, and the way to choose another. */
  on: string;
  onPick: (key: string) => void;
  onAct: Act;
};

export function Packages({ graph, offered = [], on, onPick, onAct }: PackagesProps) {
  const [adding, set_adding] = useState("");

  /** The packages it draws on: every one but its own. */
  const held = packages(graph).filter((p) => p.id !== graph.root);
  const names = new Set(held.map((p) => (p.name ?? p.id).toLowerCase()));
  const defs = all_defs(graph);
  /** Only what is not already here; a package comes in once. */
  const spare = offered.filter((o) => !names.has(o.name.toLowerCase()));
  const edits = onAct !== NOOP;

  const add = (name: string) => {
    const want = name.trim();
    if (!want) return;
    onAct("@package", { name: want });
    set_adding("");
  };

  const drawing: Item[] = held.map((p) => {
    const shipped = p.id === BASE_PACKAGE;
    const own = defs.filter((d) => package_of(graph, d.id) === p.id);
    const blocks = own.filter((d) => domain_of(graph, d.id) === "block").length;
    const runs = own.length - blocks;
    return {
      id: p.id, name: p.name ?? p.id,
      kind: shipped ? "shipped" : "",
      says: (
        <>
          <span className="txt">
            {blocks} block{blocks === 1 ? "" : "s"}{runs ? ` · ${runs} relation${runs === 1 ? "" : "s"}` : ""}
          </span>
          <button className="drop" disabled={shipped}
                  title={shipped ? "the floor stays" : `drop ${p.name}`}
                  onClick={() => onAct("delete", { ids: [p.id] })}>
            <Icon name="remove" />
          </button>
        </>
      ),
    };
  });
  const out: Item[] = spare.map((o) => ({
    id: o.name, name: o.name, quiet: true,
    says: (
      <>
        <span className="txt">{o.about}</span>
        <button className="drop" title={`bring in ${o.name}`} onClick={() => add(o.name)}>
          <Icon name="add" />
        </button>
      </>
    ),
  }));
  /** The row chosen, or all where it has gone (the last offered one brought in). */
  const at = on === "offered" && !out.length ? ALL : on;
  const shows = (key: string) => at === ALL || at === key;

  return (
    <div className="reads">
      <Lead graph={graph} id={graph.root}>
        <Filters on={at} onPick={onPick} groups={[{ label: "packages", rows: [
          { key: ALL, name: "all", count: drawing.length + out.length },
          { key: "held", name: "drawing on", count: drawing.length },
          ...(out.length ? [{ key: "offered", name: "offered", count: out.length }] : []),
        ] }]} />
      </Lead>
      <div className="lists">
        {shows("held") ? (
          <Section name="drawing on" about="The packages this workspace holds and draws on">
            <List label="packages" items={drawing} />
          </Section>
        ) : null}
        {shows("offered") && out.length ? (
          <Section name="offered" about="Packages the catalogue offers that are not here yet">
            <List label="catalogue" items={out} />
          </Section>
        ) : null}
        {edits ? (
          <Section name="add" about="Bring a package in by its name">
            <div className="add-row">
              <input value={adding} placeholder="a package by name" aria-label="add a package"
                     onChange={(e) => set_adding(e.target.value)}
                     onKeyDown={(e) => { if (e.key === "Enter") add(adding); }} />
              <button className="drop" onClick={() => add(adding)} disabled={!adding.trim()}>
                <Icon name="add" />
              </button>
            </div>
          </Section>
        ) : null}
      </div>
    </div>
  );
}
