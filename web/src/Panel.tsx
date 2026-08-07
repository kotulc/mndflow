/** Attribute tray: everything about whatever is selected, at the foot of the
 *  canvas rather than beside it.
 *
 *  It costs no canvas when there is nothing to say. With nothing selected on
 *  the canvas it describes the layer itself — the frame you are inside — so
 *  the explorer is a way to inspect a node as well as to walk into one.
 *  Selecting a block, an interface, a relationship or a group boundary
 *  replaces that with its own.
 *
 *  It opens itself when the selection carries attributes, since that is the
 *  moment there is something to read; otherwise it stays a bar with the field
 *  for adding one, which is the other reason to reach for it. Either way the
 *  chevron overrides the guess for as long as the selection lasts.
 *
 *  An object and its document are the same thing, so the body text is edited
 *  here too; there is no separate document pane. */

import { useEffect, useState, type Ref } from "react";

import {
  actual, attrsOf, isContainer, isPort, isProxy, membersOf, nameOf, refOf, tiesOf,
} from "./core/fold";
import type { Dir, Element, Flow, Graph } from "./core/types";
import type { Picked } from "./core/project";
import type { Terms } from "./core/workflows";

const FLOWS: (Flow | null)[] = [null, "in", "out", "both"];
const DIRS: Dir[] = ["none", "forward", "back", "both"];

type Props = {
  graph: Graph;
  view: string | null;
  picked: Picked;
  terms: Terms;
  onSave: (id: string, body: string) => void;
  onRetype: (id: string, type: string) => void;
  onMarkPort: (id: string, flow: Flow | null) => void;
  onAddAttr: (holder: string, name: string) => void;
  onUpdateAttr: (holder: string, was: string,
                 patch: { name?: string; value?: string }) => void;
  onDropAttr: (holder: string, name: string) => void;
  /** Take a member out of a group, or untie a note from what it describes. */
  onLeaveGroup: (id: string, group: string) => void;
  onTie: (note: string, holder: string) => void;
  onRename: (id: string, label: string) => void;
  onRelation: (id: string, relation: string) => void;
  onSetDir: (id: string, dir: Dir) => void;
  onFlip: (id: string) => void;
  /** Go to where a referenced node actually lives. */
  onReveal: (id: string) => void;
  /** So the canvas can measure the tray and keep its own controls above it. */
  hostRef?: Ref<HTMLElement>;
};

/** The field for giving the selection an attribute. Present in the bar itself,
 *  open or shut — adding one is the commonest reason to come here, and it
 *  should never take a click to reach.
 *
 *  It stays in place with nothing selected, disabled rather than absent: the
 *  project root is not a node and has nothing to carry an attribute, but a bar
 *  that changes shape as you click around is harder to aim at than one that
 *  does not. */
function AddAttr({ holder, onAdd }: { holder: string; onAdd: (h: string, n: string) => void }) {
  return (
    <input
      className="add-attr"
      disabled={!holder}
      placeholder="+ attribute"
      onKeyDown={(event) => {
        const text = event.currentTarget.value.trim();
        if (event.key !== "Enter" || !text) return;
        event.stopPropagation();
        onAdd(holder, text);
        event.currentTarget.value = "";
      }}
    />
  );
}

/** What an annotation is called where it has no name of its own — the same
 *  fallback the canvas draws, so the panel and the canvas agree. */
function roleOf(node: Element | null | undefined): string {
  return node?.element === "group" || node?.element === "note" ? node.element : "";
}

/** The descriptive values an element holds, and the groups it belongs to.
 *
 *  An attribute has no identity of its own, so it is addressed by its name on
 *  this element. Membership is listed alongside because it *is* an attribute —
 *  what it is not is a relationship, since a group draws a boundary round its
 *  members rather than a line to each. */
function Attrs({ graph, holder, onUpdate, onDrop, onLeaveGroup }: {
  graph: Graph;
  holder: string;
  onUpdate: (holder: string, was: string, patch: { value?: string }) => void;
  onDrop: (holder: string, name: string) => void;
  onLeaveGroup: (id: string, group: string) => void;
}) {
  const mine = attrsOf(graph, holder);
  const joined = graph.elements[holder]?.groups ?? [];
  if (!mine.length && !joined.length) return null;

  return (
    <div className="attrs">
      {joined.map((id) => (
        <div className="attr shared" key={id}>
          <span className="key">{nameOf(graph, graph.elements[id])}</span>
          <span className="held">{membersOf(graph, id).length} members</span>
          <button onClick={() => onLeaveGroup(holder, id)} title="Out of the group">✕</button>
        </div>
      ))}
      {mine.map((attr) => (
        <div className="attr" key={attr.name}>
          <span className="key">{attr.name}</span>
          <input
            value={attr.value}
            placeholder="value"
            onChange={(event) => onUpdate(holder, attr.name, { value: event.target.value })}
          />
          <button onClick={() => onDrop(holder, attr.name)} title="Remove from this object">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function Panel(props: Props) {
  const { graph, view, picked, terms, onSave, onRetype, onMarkPort } = props;
  const { onAddAttr, onUpdateAttr, onDropAttr, onLeaveGroup, onTie, onRename } = props;
  const { onRelation, onSetDir, onFlip, onReveal, hostRef } = props;

  // With nothing picked on the canvas the layer itself is the subject.
  const subject = picked?.kind === "node" ? picked.id : picked ? null : view;
  const holder = picked?.id ?? subject ?? "";
  const carries = holder ? attrsOf(graph, holder).length > 0 : false;
  /** null while the tray is following the selection; a boolean once the user
   *  has said otherwise, until the selection changes under them. */
  const [held, setHeld] = useState<boolean | null>(null);
  const open = held ?? carries;

  useEffect(() => setHeld(null), [holder]);

  const node = subject ? graph.elements[subject] : null;
  const body = node?.body ?? "";
  const [draft, setDraft] = useState(body);

  // Follow the selection, and whatever a turn just wrote into it.
  useEffect(() => setDraft(body), [subject, body]);

  const edge = picked?.kind === "edge" ? graph.edges[picked.id] : null;
  // A group or a note is an element like any other, so it arrives as a node
  // pick; what it needs on top is its members or its ties.
  const annotation = roleOf(node) ? node : null;
  const port = node ? isPort(node) : false;

  /** One edit is one step. Saving per keystroke would bury the action log and
   *  make undo walk back through a document character by character. */
  function save() {
    if (subject && draft !== body) onSave(subject, draft);
  }

  const title = edge
    ? `${nameOf(graph, graph.elements[edge.source])} — ${nameOf(graph, graph.elements[edge.target])}`
    : annotation
      ? nameOf(graph, annotation)
      : node
        ? nameOf(graph, node)
        : "nothing selected";
  const role = edge ? terms.relation.toLowerCase()
    : annotation ? roleOf(annotation)
    : node ? (isProxy(node) ? "proxy"
              : port ? "interface"
              : isContainer(graph, subject!) ? "container" : "block")
    : "";

  return (
    <section className={`tray ${open ? "open" : ""}`} ref={hostRef}>
      <div className="tray-bar" onDoubleClick={() => setHeld(!open)}>
        <span className="name">{title}</span>
        {role && <span className="holds">{role}</span>}

        <AddAttr holder={holder} onAdd={onAddAttr} />

        <button
          className="chevron"
          aria-expanded={open}
          title={open ? "Collapse" : "Expand"}
          onClick={() => setHeld(!open)}
        >
          {open ? "▾" : "▴"}
        </button>
      </div>

      <div className="tray-body">
        {edge && (
          <div className="tray-row">
            <input
              className="type"
              value={edge.type}
              placeholder={terms.relation}
              list="relation-kinds"
              onChange={(event) => onRelation(edge.id, event.target.value)}
            />
            <select value={edge.dir} onChange={(e) => onSetDir(edge.id, e.target.value as Dir)}>
              {DIRS.map((dir) => <option key={dir} value={dir}>{dir}</option>)}
            </select>
            <button onClick={() => onFlip(edge.id)} title="Turn it around">⇄</button>
          </div>
        )}

        {annotation && (
          <>
            <div className="tray-row">
              <input
                className="name-field"
                value={annotation.label}
                placeholder={roleOf(annotation)}
                onChange={(event) => onRename(annotation.id, event.target.value)}
              />
              {/* No colour picker: every boundary and every note is drawn the
                  same way for now, so there is nothing here to set. Colour and
                  the rest of their appearance come later. */}
              <span className="held">
                {annotation.element === "group"
                  ? `${membersOf(graph, annotation.id).length} members`
                  : `${tiesOf(graph, annotation.id).length} tied`}
              </span>
            </div>
            <ul className="members">
              {(annotation.element === "group"
                ? membersOf(graph, annotation.id).map((m) => m.id)
                : tiesOf(graph, annotation.id)).map((id) => (
                <li key={id}>
                  <span>{nameOf(graph, graph.elements[id]) || id}</span>
                  <button
                    onClick={() => annotation.element === "group"
                      ? onLeaveGroup(id, annotation.id)
                      : onTie(annotation.id, id)}
                    title={annotation.element === "group" ? "Out of the group" : "Untie it"}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {node && subject && (
          <>
            {isProxy(node) && refOf(graph, node.id) && (
              <div className="tray-row">
                <span className="held">stands in for a block in another layer</span>
                <button onClick={() => onReveal(refOf(graph, node.id)!)} title="Go to it">
                  go to {nameOf(graph, actual(graph, node.id))} ↗
                </button>
              </div>
            )}

            <div className="tray-row">
              <input
                className="type"
                value={node.type}
                placeholder={terms.node}
                onChange={(event) => onRetype(subject, event.target.value)}
              />
              {port && (
                <select
                  value={node.flow ?? ""}
                  title="Decorative marking only"
                  onChange={(e) => onMarkPort(subject, (e.target.value || null) as Flow | null)}
                >
                  {FLOWS.map((f) => (
                    <option key={f ?? "none"} value={f ?? ""}>{f ?? "unmarked"}</option>
                  ))}
                </select>
              )}
              <span className="state">{draft === body ? "saved" : "editing…"}</span>
            </div>

            <textarea
              value={draft}
              placeholder="Nothing written here yet…"
              onChange={(event) => setDraft(event.target.value)}
              onBlur={save}
            />
          </>
        )}

        {holder && (
          <Attrs
            graph={graph} holder={holder}
            onUpdate={onUpdateAttr} onDrop={onDropAttr} onLeaveGroup={onLeaveGroup}
          />
        )}
      </div>
    </section>
  );
}
