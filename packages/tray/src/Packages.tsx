/** What the workspace draws on: the packages it holds, and how one more gets in. */

import { useState } from "react";
import { BASE_PACKAGE, packages, type Act, type Graph } from "@mnd/core";
import { Icon } from "@mnd/theme";
import { Body, Line } from "./Body";

/** One row of the catalogue, as the session reads it. */
export type Offered = { name: string; about: string };

export type PackagesProps = {
  graph: Graph;
  /** What the catalogue offers, so a name can be picked rather than remembered. */
  offered?: readonly Offered[];
  onAct: Act;
};

export function Packages({ graph, offered = [], onAct }: PackagesProps) {
  const [adding, set_adding] = useState("");

  const held = packages(graph);
  const names = new Set(held.map((p) => p.name.toLowerCase()));
  /** Only what is not already here; a package comes in once. */
  const spare = offered.filter((o) => !names.has(o.name.toLowerCase()));

  const add = (name: string) => {
    const want = name.trim();
    if (!want) return;
    onAct("@package", { name: want });
    set_adding("");
  };

  return (
    <div className="fields">
      <Body head="drawing on" note={`${held.length}`}>
        {held.map((p) => {
          const shipped = p.from === BASE_PACKAGE;
          const blocks = p.defs.filter((d) => d.group === "block").length;
          const runs = p.defs.length - blocks;
          return (
            <Line key={p.from} label={p.name} className="value"
                  tip={shipped ? "the floor every workspace stands on" : undefined}>
              <span className="form">
                {blocks} block{blocks === 1 ? "" : "s"}
                {runs ? ` · ${runs} relation${runs === 1 ? "" : "s"}` : ""}
              </span>
              {shipped ? <span className="from">shipped</span> : null}
              <button className="drop" disabled={shipped}
                      title={shipped ? "the floor stays" : `drop ${p.name}`}
                      onClick={() => onAct("remove_package", { id: p.from })}>
                <Icon name="remove" />
              </button>
            </Line>
          );
        })}
        {held.length === 0 ? <p className="empty">it draws on nothing</p> : null}
      </Body>

      {spare.length ? (
        <Body head="out there" note={`${spare.length}`}>
          {spare.map((o) => (
            <Line key={o.name} label={o.name} className="value">
              <span className="form">{o.about}</span>
              <button className="drop" title={`bring in ${o.name}`}
                      onClick={() => add(o.name)}>
                <Icon name="add" />
              </button>
            </Line>
          ))}
        </Body>
      ) : null}

      <Body head="">
        <Line label="add" className="add">
          <input value={adding} placeholder="a package by name"
                 aria-label="add a package"
                 onChange={(e) => set_adding(e.target.value)}
                 onKeyDown={(e) => { if (e.key === "Enter") add(adding); }} />
          <button onClick={() => add(adding)} disabled={!adding.trim()}>
            <Icon name="add" />
          </button>
        </Line>
      </Body>
    </div>
  );
}
