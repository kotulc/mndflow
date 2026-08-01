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

import { attrsOf, isContainer, isPort, isRef, nameOf } from "./core/fold";
import type { Attr, Dir, Flow, Graph } from "./core/types";
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
  onUpdateAttr: (id: string, patch: { name?: string; value?: string; color?: string }) => void;
  onDetachAttr: (id: string, holder: string) => void;
  onDropAttr: (id: string) => void;
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

/** The attributes an object holds. Groups are in here too — a group is one
 *  shared attribute and nothing more, so it is listed as what it is rather
 *  than as a separate kind of thing. */
function Attrs({ graph, holder, onUpdate, onDetach }: {
  graph: Graph;
  holder: string;
  onUpdate: (id: string, patch: { value?: string }) => void;
  onDetach: (id: string, holder: string) => void;
}) {
  const mine = attrsOf(graph, holder);
  if (!mine.length) return null;

  return (
    <div className="attrs">
      {mine.map((attr) => (
        <div className={`attr ${attr.group ? "shared" : ""}`} key={attr.id}>
          <span className="key" title={attr.group ? `group of ${attr.holders.length}` : ""}>
            {attr.group ? attr.name || "group" : attr.name}
          </span>
          {attr.group ? (
            <span className="held">{attr.holders.length} members</span>
          ) : (
            <input
              value={attr.value}
              placeholder="value"
              onChange={(event) => onUpdate(attr.id, { value: event.target.value })}
            />
          )}
          <button onClick={() => onDetach(attr.id, holder)} title="Remove from this object">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function Panel(props: Props) {
  const { graph, view, picked, terms, onSave, onRetype, onMarkPort } = props;
  const { onAddAttr, onUpdateAttr, onDetachAttr, onDropAttr } = props;
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

  const node = subject ? graph.nodes[subject] : null;
  const body = node?.body ?? "";
  const [draft, setDraft] = useState(body);

  // Follow the selection, and whatever a turn just wrote into it.
  useEffect(() => setDraft(body), [subject, body]);

  const edge = picked?.kind === "edge" ? graph.edges[picked.id] : null;
  const attr: Attr | null = picked?.kind === "attr" ? graph.attrs[picked.id] ?? null : null;
  const port = node ? isPort(node) : false;

  /** One edit is one step. Saving per keystroke would bury the action log and
   *  make undo walk back through a document character by character. */
  function save() {
    if (subject && draft !== body) onSave(subject, draft);
  }

  const title = edge
    ? `${nameOf(graph, graph.nodes[edge.source])} — ${nameOf(graph, graph.nodes[edge.target])}`
    : attr
      ? attr.name || "group"
      : node
        ? nameOf(graph, node)
        : "nothing selected";
  const role = edge ? terms.relation.toLowerCase()
    : attr ? "group"
    : node ? (isRef(node) ? "reference"
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
              value={edge.relation}
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

        {attr && (
          <>
            <div className="tray-row">
              <input
                className="name-field"
                value={attr.name}
                placeholder="group"
                onChange={(event) => onUpdateAttr(attr.id, { name: event.target.value })}
              />
              {/* No colour picker: every boundary is drawn the same way for
                  now, so there is nothing here to set. Colour and the rest of
                  a group's appearance come later. */}
              <span className="held">{attr.holders.length} members</span>
              <button onClick={() => onDropAttr(attr.id)} title="Ungroup">✕</button>
            </div>
            <ul className="members">
              {attr.holders.map((id) => (
                <li key={id}>
                  <span>{nameOf(graph, graph.nodes[id]) || graph.edges[id]?.relation || id}</span>
                  <button onClick={() => onDetachAttr(attr.id, id)} title="Out of the group">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {node && subject && (
          <>
            {isRef(node) && node.ref && (
              <div className="tray-row">
                <span className="held">stands in for a node in another layer</span>
                <button onClick={() => onReveal(node.ref!)} title="Go to it">
                  go to {nameOf(graph, graph.nodes[node.ref])} ↗
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
            onUpdate={onUpdateAttr} onDetach={onDetachAttr}
          />
        )}
      </div>
    </section>
  );
}
