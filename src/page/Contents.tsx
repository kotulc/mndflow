/** Everything one layer holds, as a table — and the project's own definitions.
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
 *  holds, and its own buttons change it.
 *
 *  Definitions sit behind the types chip rather than in "all": they are the
 *  project's vocabulary, not a layer's contents. Opened out, a type declares
 *  its fields (and their defaults), its body, and how usages draw — never a
 *  package's definitions, which stay read-only elsewhere.
 *
 *  Constraints and rules advise here and never refuse. A model is unfinished
 *  by nature while somebody is still drawing it; a note in the tray and a
 *  line in the strip say what is missing, and every edit still goes through. */

import { useEffect, useMemo, useState } from "react";

import {
  actual, blocksOf, childrenOf, edgesIn, fieldsOf, groupsIn, isContainer, isProxy, membersOf,
  nameOf, notesIn, resolved, typeName, portsOf, tiesOf,
} from "../graph/fold";
import type {
  Definition, Dir, Edge, EdgeForm, Element, ElemForm, Field, Flow, Graph, ValueForm,
} from "../graph/types";
import { field as blankField, refAt } from "../graph/types";
import { LAYOUTS, LABELS, PLAIN, SHAPES, type CardConfig } from "../modules/card";
import { constraintsOf } from "../modules/constraints";
import { among, rulesOf, type Bound } from "../modules/rules";
import { EMPHASES, LABELS as VOICES, SETS, SLOTS, WEIGHTS } from "../modules/style";
import { NameField } from "../NameField";
import { type Grazed } from "../canvas/card";
import { defOf, gather, packs, scoped } from "../workspace";
import { Icon } from "../modules/icons";

/** What a row is, which is also how it is filtered and what it lights. */
type Sort = "block" | "interface" | "group" | "note" | "relationship" | "definition";

/** The graze kinds the canvas already understands. Definitions light nothing. */
const LIT: Record<Exclude<Sort, "definition">, "card" | "port" | "group" | "title" | "edge"> = {
  block: "card", interface: "port", group: "group", note: "title", relationship: "edge",
};

const FILTERS: { sort: Sort | "all"; label: string }[] = [
  { sort: "all", label: "all" },
  { sort: "block", label: "blocks" },
  { sort: "interface", label: "interfaces" },
  { sort: "relationship", label: "relationships" },
  { sort: "group", label: "groups" },
  { sort: "note", label: "notes" },
  { sort: "definition", label: "types" },
];

const DIRS: Dir[] = ["none", "forward", "back", "both"];
const FLOWS: (Flow | null)[] = [null, "in", "out", "both"];
const ARROW: Record<Dir, string> = { none: "—", forward: "→", back: "←", both: "↔" };

const VALUE_FORMS: ValueForm[] = ["text", "number", "flag", "choice", "ref"];
const DEF_FORMS: (ElemForm | EdgeForm)[] = [
  "block", "note", "group", "proxy", "line", "directed",
];
const LINES: NonNullable<Definition["line"]>[] = ["solid", "dashed", "dotted"];
const HEADS: NonNullable<Definition["head"]>[] = ["none", "open", "filled", "hollow"];

/** What `define` accepts beyond name and form — one patch, one step. */
type DefPatch = {
  fields?: Field[];
  body?: string;
  icon?: string;
  line?: Definition["line"];
  head?: Definition["head"];
  size?: Definition["size"];
  components?: Record<string, Record<string, unknown>>;
};

/** A short tray note and the full sentence the strip has room for. */
type Note = { short: string; full: string };

/** One definition a type picker can choose — path, and the package it came from. */
type Offer = {
  path: string;
  /** Human package name, or null when the definition is this project's. */
  pack: string | null;
  name: string;
  form: string;
};

const ELEM: Set<string> = new Set<ElemForm>([
  "block", "note", "group", "proxy",
]);

/** Definitions in scope for the type cell: packages this project imports, then
 *  its own. Two alike names stay two offers — SC.4. */
function offerings(graph: Graph): Offer[] {
  const order = graph.vocabulary;
  const catalog = packs();
  const open = gather(order);
  const out: Offer[] = [];

  for (const row of scoped(order, open)) {
    out.push({
      path: row.path,
      pack: catalog[row.pack]?.name ?? row.pack,
      name: row.def.name,
      form: row.def.form,
    });
  }
  for (const def of Object.values(graph.defs)) {
    out.push({ path: def.id, pack: null, name: def.name, form: def.form });
  }

  return out;
}

/** Label for a picker row: package beside the name only when that name is shared. */
function offerLabel(offer: Offer, counts: Map<string, number>): string {
  if ((counts.get(offer.name) ?? 0) > 1) {
    return `${offer.name} · ${offer.pack ?? "this"}`;
  }

  return offer.name;
}

/** Map what was typed (name, labeled offer, or path) back to the path to store. */
function resolveOffer(typed: string, offers: Offer[], counts: Map<string, number>): string {
  const text = typed.trim();
  if (!text) return "";

  const exact = offers.find((o) => o.path === text || offerLabel(o, counts) === text);
  if (exact) return exact.path;

  // Bare name: the first in import order when several share it.
  const byName = offers.filter((o) => o.name === text);
  if (byName.length) return byName[0]!.path;

  return text;
}

/** What the type cell shows: the definition's name, with its package when shared. */
function shownType(graph: Graph, type: string, counts: Map<string, number>,
                   open: Record<string, Graph>): string {
  if (!type) return "";

  const def = graph.defs[type] ?? defOf(graph, open, type);
  const name = def?.name ?? (typeName(graph, type) || type);
  if ((counts.get(name) ?? 0) <= 1) return name;

  const { project } = refAt(type);
  const pack = project ? (packs()[project]?.name ?? project) : "this";

  return `${name} · ${pack}`;
}

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
  /** Constraint and rule notes. Advise only — never block an edit. */
  notes: Note[];
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
  onAddField: (holder: string, name: string) => void;
  onUpdateField: (holder: string, was: string, patch: Partial<Field>) => void;
  onDropField: (holder: string, name: string) => void;
  onLeaveGroup: (id: string, group: string) => void;
  onReveal: (id: string) => void;
  /** Make or amend a project definition — fields, body, presentation. */
  onDefine: (name: string, id?: string, form?: string, patch?: DefPatch) => void;
  onUndefine: (id: string) => void;
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

/** Whether a usage's definition actually declared this component key.
 *
 *  `rulesOf` / `constraintsOf` fill in none for an absent key, and an empty
 *  `holds` or `ends` list means "nobody" rather than "no rule" — so presence
 *  has to be read off the raw configuration before asking. */
function declared(graph: Graph, type: string, component: string, key: string): boolean {
  const bag = graph.defs[type]?.components?.[component];

  return Boolean(bag && key in bag);
}

/** Fields named required that carry no value yet. */
function lacking(graph: Graph, holder: string, type: string, label: string): Note[] {
  if (!declared(graph, type, "constraints", "required")) return [];

  const wanted = constraintsOf(graph, { type } as Element).required;
  const held = new Map(fieldsOf(graph, holder).map((f) => [f.name, f.value]));

  return wanted.filter((name) => !held.get(name)?.trim()).map((name) => ({
    short: `needs ${name}`,
    full: `"${label}" needs a value for ${name}.`,
  }));
}

/** Whether a count sits outside a [least, most] bound. */
function offside(count: number, bound: Bound | undefined, way: string, label: string): Note | null {
  if (!bound) return null;
  const [lo, hi] = bound;
  if (lo !== null && count < lo) {
    return {
      short: `needs ≥${lo} ${way}`,
      full: `"${label}" needs at least ${lo} ${way} relationship${lo === 1 ? "" : "s"}.`,
    };
  }
  if (hi !== null && count > hi) {
    return {
      short: `at most ${hi} ${way}`,
      full: `"${label}" takes at most ${hi} ${way} relationship${hi === 1 ? "" : "s"}.`,
    };
  }

  return null;
}

/** Who sits at an end for `match`: the wired interface when there is one,
 *  otherwise the card the line lands on. `ends` type checks use the cards
 *  themselves — a port's type is not what a relationship rule names. */
function endOf(graph: Graph, edge: Edge, which: "from" | "to"): Element | undefined {
  const port = which === "from" ? edge.from : edge.to;
  if (port && graph.elements[port]) return graph.elements[port];

  return graph.elements[which === "from" ? edge.source : edge.target];
}

/** Notes for one relationship: its own required fields, who may sit at each
 *  end, and fields that must agree across those ends. */
function edgeNotes(graph: Graph, edge: Edge): Note[] {
  const label = typeName(graph, edge.type ?? "") || "unnamed";
  const notes = lacking(graph, edge.id, edge.type ?? "", label);
  const raw = graph.defs[edge.type]?.components?.rules;
  if (!raw) return notes;

  const rules = rulesOf(graph, { type: edge.type } as Element);
  const fromCard = graph.elements[edge.source];
  const toCard = graph.elements[edge.target];
  const fromEnd = endOf(graph, edge, "from");
  const toEnd = endOf(graph, edge, "to");

  if ("ends" in raw) {
    const { ends } = rules;
    // Empty lists mean nobody: a written ends rule with nobody allowed is
    // itself the advice, rather than "no rule".
    if (ends.from.length === 0) {
      notes.push({ short: "from end", full: `"${label}" allows nobody at its from end.` });
    } else if (fromCard && !among(graph, fromCard.type, ends.from)) {
      notes.push({
        short: "from end",
        full: `"${label}" cannot start from ${typeName(graph, fromCard.type) || "that"}.`,
      });
    }
    if (ends.to.length === 0) {
      notes.push({ short: "to end", full: `"${label}" allows nobody at its to end.` });
    } else if (toCard && !among(graph, toCard.type, ends.to)) {
      notes.push({
        short: "to end",
        full: `"${label}" cannot end at ${typeName(graph, toCard.type) || "that"}.`,
      });
    }
    if (ends.fromPort) {
      const port = edge.from ? graph.elements[edge.from] : undefined;
      if (!port || port.flow !== ends.fromPort) {
        notes.push({
          short: `needs ${ends.fromPort} from`,
          full: `"${label}" needs an ${ends.fromPort} interface at its from end.`,
        });
      }
    }
    if (ends.toPort) {
      const port = edge.to ? graph.elements[edge.to] : undefined;
      if (!port || port.flow !== ends.toPort) {
        notes.push({
          short: `needs ${ends.toPort} to`,
          full: `"${label}" needs an ${ends.toPort} interface at its to end.`,
        });
      }
    }
  }

  if ("match" in raw) {
    for (const field of rules.match) {
      const a = fieldsOf(graph, fromEnd?.id ?? "").find((f) => f.name === field)?.value?.trim() ?? "";
      const b = fieldsOf(graph, toEnd?.id ?? "").find((f) => f.name === field)?.value?.trim() ?? "";
      if (a !== b) {
        notes.push({
          short: `${field} mismatch`,
          full: `"${label}" needs ${field} to agree at both ends.`,
        });
      }
    }
  }

  return notes;
}

/** Notes for one element: required fields, what it may hold, and how many
 *  relationships may meet it. */
function elementNotes(graph: Graph, node: Element): Note[] {
  const label = nameOf(graph, node) || node.form;
  const notes = lacking(graph, node.id, node.type, label);
  const raw = graph.defs[node.type]?.components?.rules;
  if (!raw) return notes;

  const rules = rulesOf(graph, node);

  if ("holds" in raw) {
    for (const child of childrenOf(graph, node.id)) {
      if (!child.type) continue;
      if (rules.holds.length === 0 || !among(graph, child.type, rules.holds)) {
        notes.push({
          short: `won't hold ${typeName(graph, child.type) || child.type}`,
          full: `"${label}" cannot hold ${nameOf(graph, child) || typeName(graph, child.type)}.`,
        });
      }
    }
  }

  if ("degree" in raw) {
    const edges = Object.values(graph.edges);
    const incoming = edges.filter((e) => e.target === node.id).length;
    const outgoing = edges.filter((e) => e.source === node.id).length;
    const inn = offside(incoming, rules.degree.in, "in", label);
    const out = offside(outgoing, rules.degree.out, "out", label);
    if (inn) notes.push(inn);
    if (out) notes.push(out);
  }

  return notes;
}

/** Advise in the strip when a row with notes is selected — full sentences,
 *  once per pick, the way a refused name is said on Enter rather than on
 *  every keystroke. */
function advise(notes: Note[], onSay: (message: string) => void): void {
  if (!notes.length) return;
  onSay(notes.map((n) => n.full).join(" "));
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

/** How many usages name this definition — census beside the type's form. */
function using(graph: Graph, id: string): number {
  let n = 0;
  for (const node of Object.values(graph.elements)) if (node.type === id) n += 1;
  for (const edge of Object.values(graph.edges)) if (edge.type === id) n += 1;
  return n;
}

/** Card configuration as the definition states it, over the plain default. */
function cardOn(def: Definition): CardConfig {
  const raw = def.components?.card;
  return raw ? { ...PLAIN, ...raw } as CardConfig : PLAIN;
}

/** Style set name, or empty when the definition uses portable fields alone. */
function styleOn(def: Definition): string {
  const set = def.components?.style?.set;
  return typeof set === "string" ? set : "";
}

/** The four closed dials `style` carries — a definition picks within the
 *  theme's palette and the theme's weights, and names neither. */
type Dial = "slot" | "emphasis" | "weight" | "label";

/** One `style` dial a definition has set, or "" for the component's default. */
function dialOn(def: Definition, key: Dial): string {
  const held = def.components?.style?.[key];
  return typeof held === "string" ? held : "";
}

/** The declaration a usage's type names for this field, if any.
 *
 *  Form, unit, choices and many live on the definition; the usage holds the
 *  value. An ad-hoc field with no declaration keeps whatever it carries. */
function declaredOf(graph: Graph, holder: string, name: string,
                    open: Record<string, Graph>): Field | undefined {
  const type = graph.elements[holder]?.type ?? graph.edges[holder]?.type ?? "";
  if (!type) return undefined;

  const view = graph.defs[type]
    ? resolved(graph, type)
    : defOf(graph, open, type);

  return view?.fields.find((f) => f.name === name);
}

/** Usage value plus the declaration's form metadata. */
function shaped(graph: Graph, holder: string, held: Field,
                open: Record<string, Graph>): Field {
  const declared = declaredOf(graph, holder, held.name, open);
  if (!declared) return held;

  return {
    ...held,
    form: declared.form,
    unit: declared.unit ?? held.unit,
    choices: declared.choices ?? held.choices,
    many: declared.many ?? held.many,
  };
}

/** Element and definition targets a `ref` field may point at. */
function refTargets(graph: Graph): { path: string; label: string }[] {
  const out: { path: string; label: string }[] = [];

  for (const node of Object.values(graph.elements)) {
    const label = nameOf(graph, node) || node.id;
    out.push({ path: node.id, label });
  }
  for (const def of Object.values(graph.defs)) {
    out.push({ path: def.id, label: `${def.name} · type` });
  }

  return out;
}

/** One entry in a choice list — add and drop, never a comma string. */
function ChoicesList({ choices, onChange }: {
  choices: string[];
  onChange: (next: string[] | undefined) => void;
}) {
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <>
      {choices.map((choice) => (
        <span key={choice}>
          {choice}
          <button
            title="Drop this choice"
            onClick={(event) => {
              stop(event);
              const next = choices.filter((c) => c !== choice);
              onChange(next.length ? next : undefined);
            }}
          ><Icon name="remove" /></button>
        </span>
      ))}
      <input
        className="add-attr"
        placeholder="+ choice"
        onClick={stop}
        onKeyDown={(event) => {
          const text = event.currentTarget.value.trim();
          if (event.key !== "Enter" || !text) return;
          event.stopPropagation();
          if (choices.includes(text)) return;
          onChange([...choices, text]);
          event.currentTarget.value = "";
        }}
      />
    </>
  );
}

/** Tags on a field — shown and editable, one chip each. */
function TagsEdit({ tags, onChange }: {
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <>
      {tags.map((tag) => (
        <span key={tag}>
          {tag}
          <button
            title="Drop this tag"
            onClick={(event) => {
              stop(event);
              onChange(tags.filter((t) => t !== tag));
            }}
          ><Icon name="remove" /></button>
        </span>
      ))}
      <input
        className="add-attr"
        placeholder="+ tag"
        onClick={stop}
        onKeyDown={(event) => {
          const text = event.currentTarget.value.trim();
          if (event.key !== "Enter" || !text) return;
          event.stopPropagation();
          if (tags.includes(text)) return;
          onChange([...tags, text]);
          event.currentTarget.value = "";
        }}
      />
    </>
  );
}

/** Value control for one field form — number with unit, choice with list,
 *  ref with picker; text and flag keep their own. */
function ValueControl({ shape, listId, targets, onCommit }: {
  shape: Field;
  listId: string;
  targets: { path: string; label: string }[];
  onCommit: (patch: Partial<Field>) => void;
}) {
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  if (shape.form === "flag") {
    return (
      <select
        value={shape.value === "true" ? "true" : shape.value === "false" ? "false" : ""}
        title="Flag"
        onClick={stop}
        onChange={(event) => onCommit({ value: event.target.value, form: "flag" })}
      >
        <option value="">—</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (shape.form === "choice") {
    const options = shape.choices ?? [];
    return (
      <select
        value={shape.value}
        title="Choice"
        onClick={stop}
        onChange={(event) => onCommit({
          value: event.target.value,
          form: "choice",
          ...(options.length ? { choices: options } : {}),
        })}
      >
        <option value="">—</option>
        {options.map((choice) => (
          <option key={choice} value={choice}>{choice}</option>
        ))}
      </select>
    );
  }

  if (shape.form === "ref") {
    const shown = (path: string) =>
      targets.find((t) => t.path === path)?.label ?? path;
    const display = shape.many
      ? shape.value.split(",").map((s) => s.trim()).filter(Boolean).map(shown).join(", ")
      : (shape.value ? shown(shape.value) : "");

    return (
      <>
        <input
          key={shape.value}
          list={listId}
          defaultValue={display}
          placeholder={shape.many ? "id, id…" : "target"}
          onClick={stop}
          onBlur={(event) => {
            const typed = event.target.value.trim();
            if (!typed) {
              if (shape.value) onCommit({ value: "", form: "ref" });
              return;
            }
            // Many: keep a comma list; resolve each token to a path when known.
            if (shape.many) {
              const parts = typed.split(",").map((s) => s.trim()).filter(Boolean);
              const paths = parts.map((part) => {
                const hit = targets.find((t) => t.path === part || t.label === part);
                return hit?.path ?? part;
              });
              onCommit({
                value: paths.join(", "),
                form: "ref",
                many: true,
              });
              return;
            }
            const hit = targets.find((t) => t.path === typed || t.label === typed);
            onCommit({
              value: hit?.path ?? typed,
              form: "ref",
            });
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
        <datalist id={listId}>
          {targets.map((t) => (
            <option key={t.path} value={t.label} />
          ))}
        </datalist>
      </>
    );
  }

  if (shape.form === "number") {
    return (
      <>
        <Draft
          value={shape.value}
          placeholder="value"
          onCommit={(value) => onCommit({
            value,
            form: "number",
            ...(shape.unit ? { unit: shape.unit } : {}),
          })}
        />
        {shape.unit
          ? <span title="Unit">{shape.unit}</span>
          : (
            <Draft
              value=""
              placeholder="unit"
              onCommit={(unit) => onCommit({
                value: shape.value,
                form: "number",
                unit: unit.trim() || undefined,
              })}
            />
          )}
      </>
    );
  }

  return (
    <Draft
      value={shape.value}
      placeholder="value"
      onCommit={(value) => onCommit({ value, form: shape.form })}
    />
  );
}

export function Contents(props: Props) {
  const { graph, view, picked, unit, onPick, onHint, onRename, onRetype } = props;
  const { onRelation, onNameTaken, onSay, onDelete, onUnlink, onSave, onSetDir, onFlip } = props;
  const { onMarkPort, onAddField, onUpdateField, onDropField, onLeaveGroup, onReveal } = props;
  const { onDefine, onUndefine } = props;
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
        notes: elementNotes(graph, node),
      });
      for (const port of portsOf(graph, node.id)) {
        out.push({
          id: port.id, sort: "interface", name: nameOf(graph, port),
          detail: `${nameOf(graph, node)} · ${port.side}${port.flow ? ` · ${port.flow}` : ""}`,
          type: null, edge: false, renameable: true, body: said(port.id),
          notes: elementNotes(graph, port),
        });
      }
    }

    // The frame's own interfaces belong to the layer, not to a card in it.
    for (const port of portsOf(graph, view)) {
      out.push({
        id: port.id, sort: "interface", name: nameOf(graph, port),
        detail: `frame · ${port.side}${port.flow ? ` · ${port.flow}` : ""}`,
        type: null, edge: false, renameable: true, body: said(port.id),
        notes: elementNotes(graph, port),
      });
    }

    for (const { attr } of groupsIn(graph, view)) {
      const held = membersOf(graph, attr.id).length;
      out.push({
        id: attr.id, sort: "group", name: nameOf(graph, attr),
        detail: `${held} member${held === 1 ? "" : "s"}`,
        type: attr.type || null, edge: false, renameable: true, body: said(attr.id),
        notes: elementNotes(graph, attr),
      });
    }

    for (const note of notesIn(graph, view)) {
      const tied = tiesOf(graph, note.id).length;
      out.push({
        id: note.id, sort: "note", name: nameOf(graph, note),
        detail: tied ? `tied to ${tied}` : "tied to nothing",
        type: null, edge: false, renameable: false, body: said(note.id),
        notes: elementNotes(graph, note),
      });
    }

    for (const edge of edgesIn(graph, view)) {
      out.push({
        id: edge.id, sort: "relationship", name: typeName(graph, edge.type ?? ""),
        detail: `${nameOf(graph, graph.elements[edge.source])} ${ARROW[edge.dir]} ` +
                `${nameOf(graph, graph.elements[edge.target])}`,
        type: edge.form ?? "line", edge: true, renameable: true, body: "",
        notes: edgeNotes(graph, edge),
      });
    }

    return out;
  }, [graph, view, unit]);

  /** This project's definitions only — packages resist editing. */
  const types = useMemo<Row[]>(() => {
    return Object.values(graph.defs).map((def) => {
      const used = using(graph, def.id);
      const held = def.fields.length;
      const parts = [
        def.form,
        held ? `${held} field${held === 1 ? "" : "s"}` : "",
        used ? `${used} used` : "unused",
      ].filter(Boolean);

      return {
        id: def.id, sort: "definition" as const, name: def.name,
        detail: parts.join(" · "),
        type: def.form, edge: false, renameable: true,
        body: def.body ?? "", notes: [] as Note[],
      };
    });
  }, [graph]);

  /** Element definitions on offer, with name-collision counts for the package suffix. */
  const { typeOffers, typeCounts, typeOpen } = useMemo(() => {
    const all = offerings(graph).filter((o) => ELEM.has(o.form));
    const counts = new Map<string, number>();
    for (const o of all) counts.set(o.name, (counts.get(o.name) ?? 0) + 1);

    return { typeOffers: all, typeCounts: counts, typeOpen: gather(graph.vocabulary) };
  }, [graph]);

  const shown = useMemo(() => {
    // Types are project-level: they never mix into the layer's "all".
    if (only === "definition") {
      const named = (r: Row) => r.name ?? "";
      const sorted = [...types].sort((a, b) => named(a).localeCompare(named(b)));
      return down ? sorted.reverse() : sorted;
    }

    const kept = only === "all" ? rows : rows.filter((r) => r.sort === only);
    const order = ["block", "interface", "relationship", "group", "note"];
    // Defensively: one row with something missing must not take the panel
    // down, which is what an unguarded compare did.
    const named = (r: Row) => r.name ?? "";
    const sorted = [...kept].sort((a, b) => (by === "name"
      ? named(a).localeCompare(named(b))
      : order.indexOf(a.sort) - order.indexOf(b.sort) || named(a).localeCompare(named(b))));

    return down ? sorted.reverse() : sorted;
  }, [rows, types, only, by, down]);

  // Strip on selection change — tray click or canvas pick alike. Not on every
  // graph edit: filling a missing field should not keep restating the rest.
  useEffect(() => {
    if (!picked) return;
    const row = rows.find((r) => r.id === picked.id);
    if (row) advise(row.notes, onSay);
  }, [picked?.id]); // eslint-disable-line react-hooks/exhaustive-deps — id only

  const head = (key: "name" | "sort", label: string) => (
    <th
      className={`sortable ${by === key ? "on" : ""}`}
      onClick={() => (by === key ? setDown(!down) : (setBy(key), setDown(false)))}
    >
      {label}{by === key ? <Icon name={down ? "sort_down" : "sort_up"} /> : null}
    </th>
  );

  const counted = (sort: Sort | "all") => {
    if (sort === "definition") return types.length;
    return sort === "all" ? rows.length : rows.filter((r) => r.sort === sort).length;
  };

  /** Patch a definition in place — name and form stay unless the caller says. */
  function amend(def: Definition, patch: DefPatch) {
    onDefine(def.name, def.id, undefined, patch);
  }

  /** Rewrite one declared field on a definition; the whole list is the patch. */
  function setDeclared(def: Definition, was: string, next: Field | null) {
    const fields = def.fields
      .map((f) => (f.name === was ? next : f))
      .filter((f): f is Field => f !== null);
    amend(def, { fields });
  }

  /** Presentation: merge one component key without dropping the others. */
  function setComponent(def: Definition, key: string, value: Record<string, unknown> | null) {
    const components = { ...(def.components ?? {}) };
    if (value === null) delete components[key];
    else components[key] = value;
    amend(def, { components });
  }

  /** One `style` dial, merged into the key rather than replacing it — `set`,
   *  `slot` and `emphasis` are three answers under one component. */
  function setDial(def: Definition, key: Dial, value: string) {
    const held = { ...(def.components?.style ?? {}) };
    if (value) held[key] = value;
    else delete held[key];
    setComponent(def, "style", Object.keys(held).length ? held : null);
  }

  /** The buttons a row carries: whatever that kind can be told to do. Between
   *  them they cover everything the selection panel used to change. */
  function doing(row: Row) {
    const stop = (run: () => void) => (event: React.MouseEvent) =>
      (event.stopPropagation(), run());

    if (row.sort === "definition") {
      return (
        <>
          <button
            className={opened === row.id ? "on" : ""}
            title="Fields, defaults, and how it draws"
            onClick={stop(() => setOpened(opened === row.id ? null : row.id))}
          ><Icon name="rename" /></button>
          <button title="Drop this type" onClick={stop(() => onUndefine(row.id))}><Icon name="remove" /></button>
        </>
      );
    }

    if (row.edge) {
      const edge = graph.edges[row.id];
      const dir = edge?.dir ?? "none";
      const next = DIRS[(DIRS.indexOf(dir) + 1) % DIRS.length];

      return (
        <>
          <button title={`Direction: ${dir}`}
                  onClick={stop(() => onSetDir(row.id, next))}>{ARROW[dir]}</button>
          <button title="Turn it around" onClick={stop(() => onFlip(row.id))}>
              <Icon name="flip" />
            </button>
          <button title="Remove this relationship" onClick={stop(() => onUnlink(row.id))}><Icon name="remove" /></button>
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
        ><Icon name="rename" /></button>
        <button title="Delete it" onClick={stop(() => onDelete(row.id))}><Icon name="remove" /></button>
      </>
    );
  }

  /** Opened out: a definition's declarations and presentation. */
  function defining(row: Row) {
    const def = graph.defs[row.id];
    if (!def) return null;

    const card = cardOn(def);
    const style = styleOn(def);
    const stop = (event: React.SyntheticEvent) => event.stopPropagation();

    return (
      <tr className="opened" key={`${row.id}-open`}>
        <td colSpan={5}>
          <textarea
            defaultValue={def.body ?? ""}
            placeholder={`What is a "${def.name}"?`}
            onClick={stop}
            onBlur={(e) => {
              const next = e.target.value;
              if (next !== (def.body ?? "")) amend(def, { body: next });
            }}
          />
          <div className="carries">
            {def.fields.map((held) => (
              <span className="held value" key={held.name}>
                <Draft
                  value={held.name}
                  placeholder="name"
                  onCommit={(name) => {
                    const next = name.trim();
                    if (!next || next === held.name) return;
                    if (def.fields.some((f) => f.name === next)) return;
                    setDeclared(def, held.name, { ...held, name: next });
                  }}
                />
                <select
                  value={held.form}
                  title="Field form"
                  onClick={stop}
                  onChange={(event) => {
                    const form = event.target.value as ValueForm;
                    const next: Field = { ...held, form };
                    if (form !== "choice") delete next.choices;
                    if (form !== "number") delete next.unit;
                    if (form !== "ref") delete next.many;
                    setDeclared(def, held.name, next);
                  }}
                >
                  {VALUE_FORMS.map((form) => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
                {held.form === "number" && (
                  <Draft
                    value={held.unit ?? ""}
                    placeholder="unit"
                    onCommit={(unit) => setDeclared(def, held.name, {
                      ...held, unit: unit.trim() || undefined,
                    })}
                  />
                )}
                <Draft
                  value={held.value}
                  placeholder="default"
                  onCommit={(value) => setDeclared(def, held.name, { ...held, value })}
                />
                {held.form === "choice" && (
                  <ChoicesList
                    choices={held.choices ?? []}
                    onChange={(choices) => setDeclared(def, held.name, {
                      ...held, choices,
                    })}
                  />
                )}
                {held.form === "ref" && (
                  <label title="Many targets">
                    <input
                      type="checkbox"
                      checked={Boolean(held.many)}
                      onClick={stop}
                      onChange={(event) => {
                        const next: Field = { ...held };
                        if (event.target.checked) next.many = true;
                        else delete next.many;
                        setDeclared(def, held.name, next);
                      }}
                    />
                    many
                  </label>
                )}
                <TagsEdit
                  tags={held.tags}
                  onChange={(tags) => setDeclared(def, held.name, { ...held, tags })}
                />
                <button title="Remove it"
                        onClick={() => setDeclared(def, held.name, null)}><Icon name="remove" /></button>
              </span>
            ))}
            <input
              className="add-attr"
              placeholder="+ field"
              onClick={stop}
              onKeyDown={(event) => {
                const text = event.currentTarget.value.trim();
                if (event.key !== "Enter" || !text) return;
                event.stopPropagation();
                if (def.fields.some((f) => f.name === text)) return;
                amend(def, { fields: [...def.fields, blankField(text)] });
                event.currentTarget.value = "";
              }}
            />
          </div>
          <div className="carries">
            {/* Two dials rather than a colour (Y.7): the theme owns the
                palette and a definition chooses within it, so there is no
                value here that can look wrong in one theme and right in
                another. */}
            <span className="held value">
              slot
              <select
                value={dialOn(def, "slot")}
                onClick={stop}
                onChange={(event) => setDial(def, "slot", event.target.value)}
              >
                <option value="">—</option>
                {SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
              </select>
            </span>
            <span className="held value">
              emphasis
              <select
                value={dialOn(def, "emphasis")}
                onClick={stop}
                onChange={(event) => setDial(def, "emphasis", event.target.value)}
              >
                <option value="">—</option>
                {EMPHASES.map((how) => <option key={how} value={how}>{how}</option>)}
              </select>
            </span>
            <span className="held value">
              weight
              <select
                value={dialOn(def, "weight")}
                onClick={stop}
                onChange={(event) => setDial(def, "weight", event.target.value)}
              >
                <option value="">—</option>
                {WEIGHTS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </span>
            <span className="held value">
              label
              <select
                value={dialOn(def, "label")}
                onClick={stop}
                onChange={(event) => setDial(def, "label", event.target.value)}
              >
                <option value="">—</option>
                {VOICES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </span>
            <span className="held value">
              line
              <select
                value={def.line ?? ""}
                onClick={stop}
                onChange={(event) => {
                  const line = event.target.value as Definition["line"] | "";
                  amend(def, { line: line || undefined });
                }}
              >
                <option value="">—</option>
                {LINES.map((line) => <option key={line} value={line}>{line}</option>)}
              </select>
            </span>
            <span className="held value">
              head
              <select
                value={def.head ?? ""}
                onClick={stop}
                onChange={(event) => {
                  const head = event.target.value as Definition["head"] | "";
                  amend(def, { head: head || undefined });
                }}
              >
                <option value="">—</option>
                {HEADS.map((head) => <option key={head} value={head}>{head}</option>)}
              </select>
            </span>
            <span className="held value">
              icon
              <Draft
                value={def.icon ?? ""}
                placeholder="name"
                onCommit={(icon) => amend(def, { icon: icon.trim() || undefined })}
              />
            </span>
            <span className="held value">
              style
              <select
                value={style}
                onClick={stop}
                onChange={(event) => {
                  const set = event.target.value;
                  const held = { ...(def.components?.style ?? {}) };
                  if (set) held.set = set;
                  else delete held.set;
                  setComponent(def, "style", Object.keys(held).length ? held : null);
                }}
              >
                <option value="">—</option>
                {SETS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </span>
            <span className="held value">
              layout
              <select
                value={card.layout}
                onClick={stop}
                onChange={(event) => setComponent(def, "card", {
                  ...card, layout: event.target.value,
                })}
              >
                {LAYOUTS.map((layout) => (
                  <option key={layout} value={layout}>{layout}</option>
                ))}
              </select>
            </span>
            <span className="held value">
              shape
              <select
                value={card.shape}
                onClick={stop}
                onChange={(event) => setComponent(def, "card", {
                  ...card, shape: event.target.value,
                })}
              >
                {SHAPES.map((shape) => (
                  <option key={shape} value={shape}>{shape}</option>
                ))}
              </select>
            </span>
            <span className="held value">
              label
              <select
                value={card.label}
                onClick={stop}
                onChange={(event) => setComponent(def, "card", {
                  ...card, label: event.target.value,
                })}
              >
                {LABELS.map((label) => (
                  <option key={label} value={label}>{label}</option>
                ))}
              </select>
            </span>
            <span className="held value">
              shows
              <Draft
                value={card.shows.join(", ")}
                placeholder="fields on card"
                onCommit={(text) => setComponent(def, "card", {
                  ...card,
                  shows: text.split(",").map((s) => s.trim()).filter(Boolean),
                })}
              />
            </span>
          </div>
        </td>
      </tr>
    );
  }

  /** Opened out: what it says, and the values it carries. */
  function detail(row: Row) {
    if (row.sort === "definition") return defining(row);

    const held = fieldsOf(graph, row.id);
    const joined = graph.elements[row.id]?.groups ?? [];
    const targets = refTargets(graph);

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
                        onClick={() => onLeaveGroup(row.id, id)}><Icon name="remove" /></button>
              </span>
            ))}
            {held.map((held) => {
              const shape = shaped(graph, row.id, held, typeOpen);
              return (
                <span className="held value" key={held.name}>
                  {held.name}
                  <ValueControl
                    shape={shape}
                    listId={`ref-${row.id}-${held.name}`}
                    targets={targets}
                    onCommit={(patch) => onUpdateField(row.id, held.name, patch)}
                  />
                  <TagsEdit
                    tags={held.tags}
                    onChange={(tags) => onUpdateField(row.id, held.name, { tags })}
                  />
                  <button title="Remove it" onClick={() => onDropField(row.id, held.name)}><Icon name="remove" /></button>
                </span>
              );
            })}
            <input
              className="add-attr"
              placeholder="+ field"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                const text = event.currentTarget.value.trim();
                if (event.key !== "Enter" || !text) return;
                event.stopPropagation();
                // A name the type already declares takes its form, unit and
                // default — so the control that opens matches what was named.
                const declared = declaredOf(graph, row.id, text, typeOpen);
                if (declared) {
                  onUpdateField(row.id, text, {
                    form: declared.form,
                    value: declared.value,
                    tags: [],
                    ...(declared.unit ? { unit: declared.unit } : {}),
                    ...(declared.choices ? { choices: declared.choices } : {}),
                    ...(declared.many ? { many: true } : {}),
                  });
                } else {
                  onAddField(row.id, text);
                }
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
            disabled={sort !== "definition" && counted(sort) === 0}
            onClick={() => setOnly(sort)}
          >
            {label} <i>{counted(sort)}</i>
          </button>
        ))}
      </div>

      {/* What the selection panel used to say, where the pointer already is.
          Read-only — changing something is what the row's buttons are for.
          Constraint and rule notes sit here too: advise only, never a block. */}
      {over && (over.body || over.notes.length > 0 ||
        (over.sort !== "definition" && fieldsOf(graph, over.id).length > 0) ||
        (over.sort === "definition" && (graph.defs[over.id]?.fields.length ?? 0) > 0)) && (
        <div className="contents-tip">
          <b>{over.name || over.detail}</b>
          {over.body && <p>{over.body}</p>}
          {over.notes.map((note) => (
            // `em`, not `span`: `.contents-tip span` forces muted and would
            // wash out the advise colour that `.error` already carries.
            <em className="error" key={note.full}>{note.short}</em>
          ))}
          {over.sort === "definition"
            ? (graph.defs[over.id]?.fields ?? []).map((f) => (
                <span key={f.name}>
                  {f.name}{f.value ? `: ${f.value}` : ""}{f.form !== "text" ? ` · ${f.form}` : ""}
                </span>
              ))
            : fieldsOf(graph, over.id).map((f) => (
                <span key={f.name}>{f.name}{f.value ? `: ${f.value}` : ""}</span>
              ))}
        </div>
      )}

      {shown.length === 0 && only !== "definition" ? (
        <p className="empty">Nothing in this layer yet</p>
      ) : (
        <table className="contents-table">
          <thead>
            <tr>
              {head("sort", "kind")}
              {head("name", "name")}
              <th>what</th>
              <th>{only === "definition" ? "form" : "type"}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.flatMap((row) => [
              <tr
                key={row.id}
                className={picked?.id === row.id ? "picked" : ""}
                onMouseEnter={() => {
                  if (row.sort === "definition") {
                    onHint(null);
                    setOver(row);
                    return;
                  }
                  onHint({ kind: LIT[row.sort], id: row.id });
                  setOver(row);
                }}
                onClick={() => {
                  if (row.sort === "definition") {
                    onPick(null);
                    return;
                  }
                  onPick({ kind: row.edge ? "edge" : "node", id: row.id });
                }}
              >
                <td className="sort">{row.sort === "definition" ? "type" : row.sort}</td>
                <td
                  className="name"
                  onDoubleClick={(event) =>
                    (event.stopPropagation(), row.renameable && setNaming(row.id))}
                >
                  {naming === row.id ? (
                    <NameField
                      initial={row.name}
                      placeholder={row.sort === "relationship" ? "unnamed"
                        : row.sort === "definition" ? "type" : unit}
                      taken={(name) => {
                        if (row.edge) return false;
                        if (row.sort === "definition") {
                          return Object.values(graph.defs)
                            .some((d) => d.id !== row.id && d.name === name);
                        }
                        return onNameTaken(
                          graph.elements[row.id]?.parent ?? null, name, row.id);
                      }}
                      onSay={onSay}
                      onCommit={(name) => (setNaming(null),
                        row.sort === "definition" ? onDefine(name, row.id)
                          : row.edge ? onRelation(row.id, name)
                          : onRename(row.id, name))}
                      onCancel={() => setNaming(null)}
                    />
                  ) : (
                    <span className={row.name ? "" : "none"}>
                      {row.name || (row.edge ? "unnamed" : "—")}
                    </span>
                  )}
                </td>
                <td className="what">
                  {row.detail}
                  {row.notes.length > 0 && (
                    <span className="error">
                      {row.detail ? " · " : ""}
                      {row.notes.map((n) => n.short).join(", ")}
                    </span>
                  )}
                </td>
                <td
                  className="type"
                  onClick={(event) => (event.stopPropagation(),
                    row.type !== null && !row.edge && setTyping(row.id))}
                >
                  {row.type === null ? (
                    <span className="none">—</span>
                  ) : row.edge ? (
                    <span>{row.type}</span>
                  ) : row.sort === "definition" && typing === row.id ? (
                    <select
                      autoFocus
                      value={row.type}
                      onBlur={() => setTyping(null)}
                      onChange={(event) => {
                        const form = event.target.value;
                        setTyping(null);
                        if (form && form !== row.type) onDefine(row.name, row.id, form);
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {DEF_FORMS.map((form) => (
                        <option key={form} value={form}>{form}</option>
                      ))}
                    </select>
                  ) : typing === row.id ? (
                    <>
                      <input
                        autoFocus
                        list={`type-offers-${row.id}`}
                        defaultValue={row.type
                          ? shownType(graph, row.type, typeCounts, typeOpen)
                          : ""}
                        placeholder={isContainer(graph, row.id) ? `${unit} group` : unit}
                        onBlur={(event) => (setTyping(null),
                          onRetype(row.id,
                            resolveOffer(event.target.value, typeOffers, typeCounts)))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                          if (event.key === "Escape") setTyping(null);
                        }}
                      />
                      <datalist id={`type-offers-${row.id}`}>
                        {typeOffers.map((offer) => (
                          <option
                            key={offer.path}
                            value={offerLabel(offer, typeCounts)}
                          />
                        ))}
                      </datalist>
                    </>
                  ) : row.sort === "definition" ? (
                    <span>{row.type}</span>
                  ) : (
                    <span className={row.type ? "" : "none"}>
                      {row.type
                        ? shownType(graph, row.type, typeCounts, typeOpen)
                        : (isContainer(graph, row.id) ? `${unit} group` : unit)}
                    </span>
                  )}
                </td>
                <td className="doing">{doing(row)}</td>
              </tr>,
              ...(opened === row.id ? [detail(row)] : []),
            ])}
            {only === "definition" && (
              <tr key="add-type" className="opened">
                <td colSpan={5}>
                  <input
                    className="add-attr"
                    placeholder="+ type"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      const text = event.currentTarget.value.trim();
                      if (event.key !== "Enter" || !text) return;
                      event.stopPropagation();
                      onDefine(text, undefined, "block");
                      event.currentTarget.value = "";
                    }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
