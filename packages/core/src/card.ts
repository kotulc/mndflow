/** A card as markdown: frontmatter for what it is and what it answers, then its body.
 *
 *  **The graph is the truth.** `card_text` writes a block or a definition as its card source;
 *  `read_card` splits one back into frontmatter and body, for the `markdown` and `attach` actions to
 *  turn into ordinary changes. The frontmatter is YAML. */

import { parse, stringify } from "yaml";
import { def_at, remap } from "./defs";
import type { Block, Graph, Id } from "./types";

/** The keys a usage's frontmatter says itself with; any other is a value. */
export const USAGE_KEYS = ["name", "type", "tags", "source"] as const;

/** The keys a definition's frontmatter says itself with; any other is an attribute's default. */
export const DEFINITION_KEYS = ["name", "extends", "tags"] as const;

/** Frontmatter: a fence of dashes, YAML, a fence of dashes. */
const FRONT = /^---\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)/;

/** A card source read: what its frontmatter says, and the body after it. */
export type Card = { front: Record<string, unknown>; body: string };


/** A block or a definition as its card source. */
export function card_text(graph: Graph, id: Id): string {
  const b = graph.blocks[id];
  if (!b) return "";
  const front = b.def ? defined(graph, b) : used(graph, b);
  const body = b.body ?? "";
  /** A body that opens with a fence of dashes is fenced off, so it is never read as frontmatter. */
  const said = Object.keys(front).length
    ? `---\n${stringify(front, { lineWidth: 0 }).trimEnd()}\n---\n`
    : /^---\r?\n/.test(body) ? "---\n---\n" : "";
  return said + body;
}

/** A card source split into its frontmatter and its body. Frontmatter that is not a YAML map is a
 *  fault, thrown with what the reader said. */
export function read_card(text: string): Card {
  const match = FRONT.exec(text);
  if (!match) return { front: {}, body: text };
  const front: unknown = parse(match[1] ?? "") ?? {};
  if (typeof front !== "object" || Array.isArray(front)) {
    throw new Error("the frontmatter has to be a map of keys");
  }
  return { front: front as Record<string, unknown>, body: text.slice(match[0].length) };
}

/** A frontmatter answer as the text a value holds: a list joined by commas, a map as YAML. */
export function said_as(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(said_as).join(", ");
  if (typeof value === "object") return stringify(value, { lineWidth: 0 }).trim();
  return String(value);
}

/** Names from a frontmatter list, or one said with commas. */
export function names_in(value: unknown): string[] {
  const all = Array.isArray(value) ? value.map(said_as) : said_as(value).split(",");
  return all.map((n) => n.trim()).filter(Boolean);
}


/** A usage's frontmatter: its name, what it is, its tags, its source, then its answers. */
function used(graph: Graph, b: Block): Record<string, unknown> {
  const front: Record<string, unknown> = {};
  if (b.name) front["name"] = b.name;
  const type = def_at(graph, b.type);
  if (type) front["type"] = type.name;
  if (b.tags?.length) front["tags"] = named(graph, b.tags);
  if (b.source) front["source"] = b.source;
  for (const v of b.values ?? []) {
    if (!(USAGE_KEYS as readonly string[]).includes(v.name)) front[v.name] = scalar(v.value);
  }
  return front;
}

/** A definition's frontmatter: its name, what it extends, what it carries, then its attributes'
 *  defaults. */
function defined(graph: Graph, b: Block): Record<string, unknown> {
  const front: Record<string, unknown> = { name: b.name ?? "" };
  const up = def_at(graph, b.type);
  if (up) front["extends"] = up.name;
  if (b.tags?.length) front["tags"] = named(graph, b.tags);
  for (const a of b.def?.attributes ?? []) {
    if (a.default !== undefined && !(DEFINITION_KEYS as readonly string[]).includes(a.name)) {
      front[a.name] = scalar(a.default);
    }
  }
  return front;
}

/** A `tags` list by name, a drop kept a drop. */
function named(graph: Graph, tags: string[]): string[] {
  return tags.map((t) => remap(t, (id) => graph.blocks[id]?.name ?? id));
}

/** A value as YAML says it: a number or a yes and a no unquoted where it reads back the same,
 *  anything else as written. */
function scalar(value: string): unknown {
  if (/^-?\d/.test(value) && String(Number(value)) === value) return Number(value);
  if (value === "true" || value === "false") return value === "true";
  return value;
}
