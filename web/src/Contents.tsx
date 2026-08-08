/** Everything one layer holds, as a table.
 *
 *  The canvas shows where things are; this shows *what is there*. It is the
 *  only place a relationship or an interface can be found without hunting for
 *  it on the drawing, which is why it lists both alongside the blocks rather
 *  than being a second explorer.
 *
 *  It is also the only panel. There is no separate view of "the selection",
 *  because a table listing everything already includes whatever is selected —
 *  a second surface would have shown the same row twice. What a selection
 *  panel used to *edit* lives on the row instead: hovering says what a thing
 *  holds, and its own buttons change it. */

import { useEffect, useMemo, useState } from "react";

import {
  actual, attrsOf, blocksOf, edgesIn, groupsIn, isContainer, isProxy, membersOf, nameOf, notesIn,
  portsOf, tiesOf,
} from "./core/fold";
import type { Dir, Flow, Graph } from "./core/types";
import { NameField } from "./NameField";
import type { Grazed } from "./NodeCard";

/** What a row is, which is also how it is filtered and what it lights. */
type Sort = "block" | "interface" | "group" | "note" | "relationship";

/** The graze kinds the canvas already understands, per sort. */
const LIT: Record<Sort, "card" | "port" | "group" | "title" | "edge"> = {
  block: "card", interface: "port", group: "group", note: "title", relationship: "edge",
};

const FILTERS: { sort: Sort | "all"; label: string }[] = [
  { sort: "all", label: "all" },
  { sort: "block", label: "blocks" },
  { sort: "interface", label: "interfaces" },
  { sort: "relationship", label: "relationships" },
  { sort: "group", label: "groups" },
  { sort: "note", label: "notes" },
];

const DIRS: Dir[] = ["none", "forward", "back", "both"];
const FLOWS: (Flow | null)[] = [null, "in", "out", "both"];
const ARROW: Record<Dir, string> = { none: "—", forward: "→", back: "←", both: "↔" };

type Row = {
  id: string;
  sort: Sort;
  name: string;
  /** What is worth knowing about this one, in a word or two. */
  detail: string;
  /** The subtype, or null where the thing has no meaningful one. */
  type: string | null;
  edge: boolean;
  renameable: boolean;
  /** What it says. Shown on hover, edited from the row. */
  body: string;
};

type Props = {
  graph: Graph;
  view: string | null;
  picked: { kind: string; id: string } | null;
  unit: string;
  onPick: (next: { kind: "node" | "edge"; id: string } | null) => void;
  onHint: (next: Grazed) => void;
  onRename: (id: string, label: string) => void;
  onRetype: (id: string, type: string) => void;
  onRelation: (id: string, relation: string) => void;
  onNameTaken: (parent: string | null, label: string, except: string | null) => boolean;
  onSay: (message: string) => void;
  onDelete: (id: string) => void;
  onUnlink: (id: string) => void;
  onSave: (id: string, body: string) => void;
  onSetDir: (id: string, dir: Dir) => void;
  onFlip: (id: string) => void;
  onMarkPort: (id: string, flow: Flow | null) => void;
  onAddAttr: (holder: string, name: string) => void;
  onUpdateAttr: (holder: string, was: string, patch: { name?: string; value?: string }) => void;
  onDropAttr: (holder: string, name: string) => void;
  onLeaveGroup: (id: string, group: string) => void;
  onReveal: (id: string) => void;
};

/** What a block's row says about it: what it holds, and what it is wired to. */
function blockDetail(graph: Graph, id: string, unit: string): string {
  const node = graph.elements[id];
  if (!node) return "";
  if (isProxy(node)) return `stands for ${nameOf(graph, actual(graph, id)) || "something gone"}`;

  const kids = blocksOf(graph, id).length;
  const ports = portsOf(graph, id).length;
  const parts = [kids ? `${kids} inside` : "",
                 ports ? `${ports} interface${ports === 1 ? "" : "s"}` : ""].filter(Boolean);

  return parts.join(", ") || `plain ${unit}`;
}

/** A field that writes once, when editing ends — one edit is one step. */
function Draft({ value, onCommit, placeholder }: {
  value: string;
  onCommit: (next: string) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  return (
    <input
      value={draft}
      placeholder={placeholder}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setDraft(value);
      }}
    />
  );
}

export function Contents(props: Props) {
  const { graph, view, picked, unit, onPick, onHint, onRename, onRetype } = props;
  const { onRelation, onNameTaken, onSay, onDelete, onUnlink, onSave, onSetDir, onFlip } = props;
  const { onMarkPort, onAddAttr, onUpdateAttr, onDropAttr, onLeaveGroup, onReveal } = props;
  const [only, setOnly] = useState<Sort | "all">("all");
  const [by, setBy] = useState<"name" | "sort">("sort");
  const [down, setDown] = useState(false);
  /** Fields open rather than sitting there: a column of live inputs cannot be
   *  clicked to select the row behind it. */
  const [naming, setNaming] = useState<string | null>(null);
  const [typing, setTyping] = useState<string | null>(null);
  /** The row opened out to show what it says and what it carries. */
  const [opened, setOpened] = useState<string | null>(null);
  const [over, setOver] = useState<Row | null>(null);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const said = (id: string) => graph.elements[id]?.body ?? "";

    for (const node of blocksOf(graph, view)) {
      out.push({
        id: node.id, sort: "block", name: nameOf(graph, node),
        detail: blockDetail(graph, node.id, unit),
        type: isProxy(node) ? null : node.type,
        edge: false, renameable: !isProxy(node), body: said(node.id),
      });
      for (const port of portsOf(graph, node.id)) {
        out.push({
          id: port.id, sort: "interface", name: nameOf(graph, port),
          detail: `${nameOf(graph, node)} · ${port.side}${port.flow ? ` · ${port.flow}` : ""}`,
          type: null, edge: false, renameable: true, body: said(port.id),
        });
      }
    }

    // The frame's own interfaces belong to the layer, not to a card in it.
    for (const port of portsOf(graph, view)) {
      out.push({
        id: port.id, sort: "interface", name: nameOf(graph, port),
        detail: `frame · ${port.side}${port.flow ? ` · ${port.flow}` : ""}`,
        type: null, edge: false, renameable: true, body: said(port.id),
      });
    }

    for (const { attr } of groupsIn(graph, view)) {
      const held = membersOf(graph, attr.id).length;
      out.push({
        id: attr.id, sort: "group", name: nameOf(graph, attr),
        detail: `${held} member${held === 1 ? "" : "s"}`,
        type: attr.type, edge: false, renameable: true, body: said(attr.id),
      });
    }

    for (const note of notesIn(graph, view)) {
      const tied = tiesOf(graph, note.id).length;
      out.push({
        id: note.id, sort: "note", name: nameOf(graph, note),
        detail: tied ? `tied to ${tied}` : "tied to nothing",
        type: null, edge: false, renameable: false, body: said(note.id),
      });
    }

    for (const edge of edgesIn(graph, view)) {
      out.push({
        id: edge.id, sort: "relationship", name: edge.type ?? "",
        detail: `${nameOf(graph, graph.elements[edge.source])} ${ARROW[edge.dir]} ` +
                `${nameOf(graph, graph.elements[edge.target])}`,
        type: edge.kind ?? "untyped", edge: true, renameable: true, body: "",
      });
    }

    return out;
  }, [graph, view, unit]);

  const shown = useMemo(() => {
    const kept = only === "all" ? rows : rows.filter((r) => r.sort === only);
    const order = ["block", "interface", "relationship", "group", "note"];
    // Defensively: one row with something missing must not take the panel
    // down, which is what an unguarded compare did.
    const named = (r: Row) => r.name ?? "";
    const sorted = [...kept].sort((a, b) => (by === "name"
      ? named(a).localeCompare(named(b))
      : order.indexOf(a.sort) - order.indexOf(b.sort) || named(a).localeCompare(named(b))));

    return down ? sorted.reverse() : sorted;
  }, [rows, only, by, down]);

  const head = (key: "name" | "sort", label: string) => (
    <th
      className={`sortable ${by === key ? "on" : ""}`}
      onClick={() => (by === key ? setDown(!down) : (setBy(key), setDown(false)))}
    >
      {label}{by === key ? (down ? " ▾" : " ▴") : ""}
    </th>
  );

  const counted = (sort: Sort | "all") =>
    sort === "all" ? rows.length : rows.filter((r) => r.sort === sort).length;

  /** The buttons a row carries: whatever that kind can be told to do. Between
   *  them they cover everything the selection panel used to change. */
  function doing(row: Row) {
    const stop = (run: () => void) => (event: React.MouseEvent) =>
      (event.stopPropagation(), run());

    if (row.edge) {
      const edge = graph.edges[row.id];
      const dir = edge?.dir ?? "none";
      const next = DIRS[(DIRS.indexOf(dir) + 1) % DIRS.length];

      return (
        <>
          <button title={`Direction: ${dir}`}
                  onClick={stop(() => onSetDir(row.id, next))}>{ARROW[dir]}</button>
          <button title="Turn it around" onClick={stop(() => onFlip(row.id))}>⇄</button>
          <button title="Remove this relationship" onClick={stop(() => onUnlink(row.id))}>✕</button>
        </>
      );
    }

    const node = graph.elements[row.id];

    return (
      <>
        {row.sort === "interface" && (
          <button
            title={`Marking: ${node?.flow ?? "none"}`}
            onClick={stop(() => onMarkPort(
              row.id, FLOWS[(FLOWS.indexOf(node?.flow ?? null) + 1) % FLOWS.length]))}
          >
            {node?.flow ? node.flow[0] : "·"}
          </button>
        )}
        {isProxy(node) && (
          <button title="Go to where it lives"
                  onClick={stop(() => onReveal(actual(graph, row.id)?.id ?? row.id))}>↗</button>
        )}
        <button
          className={opened === row.id ? "on" : ""}
          title="What it says, and what it carries"
          onClick={stop(() => setOpened(opened === row.id ? null : row.id))}
        >
          ✎
        </button>
        <button title="Delete it" onClick={stop(() => onDelete(row.id))}>✕</button>
      </>
    );
  }

  /** Opened out: what it says, and the values it carries. */
  function detail(row: Row) {
    const held = attrsOf(graph, row.id);
    const joined = graph.elements[row.id]?.groups ?? [];

    return (
      <tr className="opened" key={`${row.id}-open`}>
        <td colSpan={5}>
          <textarea
            defaultValue={row.body}
            placeholder={`What is "${row.name}" for?`}
            onClick={(event) => event.stopPropagation()}
            onBlur={(e) => e.target.value !== row.body && onSave(row.id, e.target.value)}
          />
          <div className="carries">
            {joined.map((id) => (
              <span className="held" key={id}>
                {nameOf(graph, graph.elements[id])}
                <button title="Out of the group"
                        onClick={() => onLeaveGroup(row.id, id)}>✕</button>
              </span>
            ))}
            {held.map((attr) => (
              <span className="held value" key={attr.name}>
                {attr.name}
                <Draft
                  value={attr.value}
                  placeholder="value"
                  onCommit={(next) => onUpdateAttr(row.id, attr.name, { value: next })}
                />
                <button title="Remove it" onClick={() => onDropAttr(row.id, attr.name)}>✕</button>
              </span>
            ))}
            <input
              className="add-attr"
              placeholder="+ attribute"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                const text = event.currentTarget.value.trim();
                if (event.key !== "Enter" || !text) return;
                event.stopPropagation();
                onAddAttr(row.id, text);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="contents" onMouseLeave={() => (onHint(null), setOver(null))}>
      <div className="contents-tabs">
        {FILTERS.map(({ sort, label }) => (
          <button
            key={sort}
            className={only === sort ? "on" : ""}
            disabled={counted(sort) === 0}
            onClick={() => setOnly(sort)}
          >
            {label} <i>{counted(sort)}</i>
          </button>
        ))}
      </div>

      {/* What the selection panel used to say, where the pointer already is.
          Read-only — changing something is what the row's buttons are for. */}
      {over && (over.body || attrsOf(graph, over.id).length > 0) && (
        <div className="contents-tip">
          <b>{over.name || over.detail}</b>
          {over.body && <p>{over.body}</p>}
          {attrsOf(graph, over.id).map((a) => (
            <span key={a.name}>{a.name}{a.value ? `: ${a.value}` : ""}</span>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="empty">Nothing in this layer yet</p>
      ) : (
        <table className="contents-table">
          <thead>
            <tr>
              {head("sort", "kind")}
              {head("name", "name")}
              <th>what</th>
              <th>type</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.flatMap((row) => [
              <tr
                key={row.id}
                className={picked?.id === row.id ? "picked" : ""}
                onMouseEnter={() => (onHint({ kind: LIT[row.sort], id: row.id }), setOver(row))}
                onClick={() => onPick({ kind: row.edge ? "edge" : "node", id: row.id })}
              >
                <td className="sort">{row.sort}</td>
                <td
                  className="name"
                  onDoubleClick={(event) =>
                    (event.stopPropagation(), row.renameable && setNaming(row.id))}
                >
                  {naming === row.id ? (
                    <NameField
                      initial={row.name}
                      placeholder={row.sort === "relationship" ? "unnamed" : unit}
                      taken={(name) => !row.edge &&
                        onNameTaken(graph.elements[row.id]?.parent ?? null, name, row.id)}
                      onSay={onSay}
                      onCommit={(name) => (setNaming(null),
                        row.edge ? onRelation(row.id, name) : onRename(row.id, name))}
                      onCancel={() => setNaming(null)}
                    />
                  ) : (
                    <span className={row.name ? "" : "none"}>
                      {row.name || (row.edge ? "unnamed" : "—")}
                    </span>
                  )}
                </td>
                <td className="what">{row.detail}</td>
                <td
                  className="type"
                  onClick={(event) => (event.stopPropagation(),
                    row.type !== null && !row.edge && setTyping(row.id))}
                >
                  {row.type === null ? (
                    <span className="none">—</span>
                  ) : row.edge ? (
                    <span>{row.type}</span>
                  ) : typing === row.id ? (
                    <input
                      autoFocus
                      defaultValue={row.type}
                      placeholder={isContainer(graph, row.id) ? `${unit} group` : unit}
                      onBlur={(event) => (setTyping(null), onRetype(row.id, event.target.value))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                        if (event.key === "Escape") setTyping(null);
                      }}
                    />
                  ) : (
                    <span className={row.type ? "" : "none"}>
                      {row.type || (isContainer(graph, row.id) ? `${unit} group` : unit)}
                    </span>
                  )}
                </td>
                <td className="doing">{doing(row)}</td>
              </tr>,
              ...(opened === row.id ? [detail(row)] : []),
            ])}
          </tbody>
        </table>
      )}
    </div>
  );
}
