/** **Diagram and model tools** (docs/tools/): plain commands a person or an agent composes models
 *  with. `draw` writes one diagram file of one kind from a selection; `presentation` lists, drafts
 *  and checks a model file's presentations. Nothing written records who made it. Fact tools are
 *  apps/ts `facts.ts`; the commands are `main.ts`'s. */

import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { parseDocument, stringify } from "yaml";
import { DIAGRAMS, fold, long_form, setting_of, type FileSpec } from "@mnd/core";
import { FLOOR } from "@mnd/defs";

/** The kinds `draw` writes: every diagram kind, and `overview`, a model's tree. */
export const DRAWN = [...DIAGRAMS, "overview"] as const;

/** **The floor** (docs/diagrams/README.md *Sub diagrams*): a diagram holds at least this many
 *  steps, messages, states, rows or parts; below it its owner's chip says it. A default. */
export const FLOOR_OF = 3;

/** A diagram file written: its text, and what it is warned of. */
export type Drawn = { text: string; warnings: string[] };


/** **`draw <kind>`**: a selection — a diagram file's map, as JSON — written as that kind's YAML.
 *  Read back through the file syntax first, so what it writes always reads; warned below the
 *  floor, naming the owner whose chip would say it. */
export function diagram_file(kind: string, selection: Record<string, unknown>): Drawn {
  if (!(DRAWN as readonly string[]).includes(kind)) {
    throw new Error(`no diagram kind ${kind}: ${DRAWN.join(", ")}`);
  }
  const type = kind === "overview" ? "model" : kind;
  const map: Record<string, unknown> = { ...selection, type: selection["type"] ?? type };
  long_form(map, undefined, spec_of(type));
  const counted = count(kind, map);
  const warnings = counted.n < FLOOR_OF ? [
    `${map["name"] ?? "this diagram"} holds ${counted.n} ${counted.of}, below the floor of `
    + `${FLOOR_OF}: ${selection["owner"] ? `${String(selection["owner"])}'s chip` : "its owner's chip"} `
    + "would say it instead"] : [];
  const { owner: _owner, ...kept } = map;
  return { text: stringify(kept, { lineWidth: 0 }), warnings };
}

/** How a kind says its file is written (`diagram.file`), read off base. */
function spec_of(kind: string): FileSpec {
  const graph = fold([], FLOOR);
  return (setting_of(graph, kind, "diagram")["file"] ?? {}) as FileSpec;
}

/** What a kind's floor counts in a selection: messages, rows, or blocks. */
function count(kind: string, map: Record<string, unknown>): { n: number; of: string } {
  const list = (key: string) => (Array.isArray(map[key]) ? (map[key] as unknown[]).length : 0);
  if (kind === "sequence") return { n: list("relations"), of: "messages" };
  if (kind === "mapping") return { n: list("records"), of: "rows" };
  if (kind === "state") return { n: list("blocks"), of: "states" };
  if (kind === "overview" || kind === "context") return { n: list("blocks"), of: "parts" };
  return { n: list("blocks"), of: "steps" };
}

/** A model file's presentations, as its file says them. */
type Said = { name?: string; description?: string; stops?: { title?: string }[] };

/** **`presentation list`**: each presentation of a model file, its stops by title. */
export function presentations(model: string): { name: string; stops: string[] }[] {
  const doc = parseDocument(readFileSync(model, "utf8")).toJS() as { presentations?: Said[] };
  return (doc.presentations ?? []).map((p) => ({
    name: p.name ?? "", stops: (p.stops ?? []).map((s) => s.title ?? "") }));
}

/** **`presentation draft`**: a presentation seeded from a flow or sequence diagram file, one stop
 *  showing it and a step a relation, in its order, each sentence a draft to be rewritten; added
 *  to the model file's `presentations:`. `as` is the diagram's name as the model reaches it. */
export function draft(model: string, diagram: string, as?: string): string {
  const said = parseDocument(readFileSync(diagram, "utf8")).toJS() as Record<string, unknown>;
  const name = String(said["name"] ?? basename(diagram).replace(/^\d+-|\.ya?ml$/g, ""));
  const at = as ?? name;
  const form = long_form(said, undefined, spec_of(String(said["type"] ?? "flow")));
  const steps = form.relations.map((e) => ({
    relation: `${at}.${e.from} -> ${at}.${e.to}`,
    text: `${e.from} ${e.name ? `${e.name} to` : "to"} ${e.to}.` }));
  const doc = parseDocument(existsSync(model) ? readFileSync(model, "utf8") : "");
  const list = (doc.get("presentations") as { toJSON?: () => unknown } | undefined)?.toJSON?.();
  const kept = Array.isArray(list) ? list : [];
  doc.set("presentations", [...kept, {
    name, description: String(said["description"] ?? `${name}, step by step.`),
    stops: [{ title: name, at, show: at, summary: String(said["description"] ?? name),
              steps }] }]);
  return doc.toString({ lineWidth: 0 });
}
