/** Attribute panel: everything about whatever is selected.
 *
 *  One state per row of the spec's table. With nothing selected on the canvas
 *  it shows the layer itself — the frame you are inside — so the explorer is a
 *  way to inspect a node as well as to walk into one. Selecting a block, an
 *  interface, a relationship or a group boundary replaces that with its own.
 *
 *  An object and its document are the same thing, so the body text is edited
 *  here too; there is no separate document pane. */

import { useEffect, useState } from "react";

import { attrsOf, isContainer, isPort } from "./core/fold";
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
};

/** The attributes an object holds, and a field for adding another. Groups are
 *  in here too — a group is one shared attribute and nothing more, so it is
 *  listed as what it is rather than as a separate kind of thing. */
function Attrs({ graph, holder, onAdd, onUpdate, onDetach }: {
  graph: Graph;
  holder: string;
  onAdd: (holder: string, name: string) => void;
  onUpdate: (id: string, patch: { value?: string }) => void;
  onDetach: (id: string, holder: string) => void;
}) {
  const mine = attrsOf(graph, holder);

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

      <input
        className="add-attr"
        placeholder="+ attribute"
        onKeyDown={(event) => {
          const text = event.currentTarget.value.trim();
          if (event.key !== "Enter" || !text) return;
          onAdd(holder, text);
          event.currentTarget.value = "";
        }}
      />
    </div>
  );
}

export function Panel(props: Props) {
  const { graph, view, picked, terms, onSave, onRetype, onMarkPort } = props;
  const { onAddAttr, onUpdateAttr, onDetachAttr, onDropAttr } = props;
  const { onRelation, onSetDir, onFlip } = props;

  // With nothing picked on the canvas the layer itself is the subject.
  const subject = picked?.kind === "node" ? picked.id : picked ? null : view;
  const node = subject ? graph.nodes[subject] : null;
  const body = node?.body ?? "";
  const [draft, setDraft] = useState(body);

  // Follow the selection, and whatever a turn just wrote into it.
  useEffect(() => setDraft(body), [subject, body]);

  if (picked?.kind === "edge") {
    const edge = graph.edges[picked.id];
    if (!edge) return <Empty />;

    return (
      <section className="doc">
        <div className="doc-bar">
          <span className="name">
            {graph.nodes[edge.source]?.label} — {graph.nodes[edge.target]?.label}
          </span>
          <span className="meta">
            <select value={edge.dir} onChange={(e) => onSetDir(edge.id, e.target.value as Dir)}>
              {DIRS.map((dir) => <option key={dir} value={dir}>{dir}</option>)}
            </select>
            <button onClick={() => onFlip(edge.id)} title="Turn it around">⇄</button>
          </span>
        </div>

        <input
          className="type"
          value={edge.relation}
          placeholder={terms.relation}
          list="relation-kinds"
          onChange={(event) => onRelation(edge.id, event.target.value)}
        />
        <Attrs
          graph={graph} holder={edge.id}
          onAdd={onAddAttr} onUpdate={onUpdateAttr} onDetach={onDetachAttr}
        />
      </section>
    );
  }

  if (picked?.kind === "attr") {
    const attr: Attr | undefined = graph.attrs[picked.id];
    if (!attr) return <Empty />;

    return (
      <section className="doc">
        <div className="doc-bar">
          <input
            className="name-field"
            value={attr.name}
            placeholder="group"
            onChange={(event) => onUpdateAttr(attr.id, { name: event.target.value })}
          />
          <span className="meta">
            <input
              type="color"
              value={attr.color}
              title="Boundary colour"
              onChange={(event) => onUpdateAttr(attr.id, { color: event.target.value })}
            />
            <span className="holds">{attr.holders.length} members</span>
            <button onClick={() => onDropAttr(attr.id)} title="Ungroup">✕</button>
          </span>
        </div>

        <ul className="members">
          {attr.holders.map((id) => (
            <li key={id}>
              <span>{graph.nodes[id]?.label ?? graph.edges[id]?.relation ?? id}</span>
              <button onClick={() => onDetachAttr(attr.id, id)} title="Out of the group">✕</button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (!node || !subject) return <Empty />;

  /** One edit is one step. Saving per keystroke would bury the action log and
   *  make undo walk back through a document character by character. */
  function save() {
    if (draft !== body) onSave(subject!, draft);
  }

  const port = isPort(node);
  const role = port ? "interface" : isContainer(graph, subject) ? terms.group : terms.node;

  return (
    <section className="doc">
      <div className="doc-bar">
        <span className="name"># {node.label || (port ? "interface" : "untitled")}</span>

        <span className="meta">
          <input
            className="type"
            value={node.type}
            placeholder={terms.node}
            onChange={(event) => onRetype(subject!, event.target.value)}
          />
          {port && (
            <select
              value={node.flow ?? ""}
              title="Decorative marking only"
              onChange={(e) => onMarkPort(subject!, (e.target.value || null) as Flow | null)}
            >
              {FLOWS.map((f) => <option key={f ?? "none"} value={f ?? ""}>{f ?? "unmarked"}</option>)}
            </select>
          )}
          <span className="holds">{role.toLowerCase()}</span>
          <span className="state">{draft === body ? "saved" : "editing…"}</span>
        </span>
      </div>

      <textarea
        value={draft}
        placeholder="Nothing written here yet…"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
      />

      <Attrs
        graph={graph} holder={subject}
        onAdd={onAddAttr} onUpdate={onUpdateAttr} onDetach={onDetachAttr}
      />
    </section>
  );
}

function Empty() {
  return (
    <section className="doc">
      <div className="doc-bar">
        <span className="name">context</span>
      </div>
      <p className="nothing">Nothing selected. Pick something to see and edit it.</p>
    </section>
  );
}
