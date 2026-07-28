/** Workflow definitions, read from YAML at build time.
 *
 *  Three kinds of file. `entry` is the catalogue of domains a first answer
 *  routes into. `operations` is the global list of things the conversation can
 *  ask for — no domain may invent one. A domain file supplies wording and
 *  vocabulary, and nothing else.
 *
 *  Control flow is deliberately absent: which operation to ask about is
 *  decided in `router`, from the graph itself. A new domain is wording only. */

import entryFile from "../../../workflows/entry.yaml";
import operationsFile from "../../../workflows/operations.yaml";

export type Template = {
  id: string;
  chip: string;
  about: string;
  /** Short phrases naming what someone might be making. Each is scored
   *  separately, so they are phrases rather than keywords. */
  tags: string[];
};

export type Entry = {
  welcome: string[];
  placeholder: string;
  hint: string;
  templates: Template[];
};

export type Operation = {
  id: string;
  chip: string;
  /** Condition under which there is anything to ask; see router.eligible. */
  when: string;
};

/** What a domain calls things, used for chips and the object explorer. */
export type Terms = { group: string; node: string; relation: string };

export type Wording = {
  /** One is chosen at random per asking, so the loop does not read as a form. */
  prompt: string[];
  hint: string;
  choices: string[];
};

export type Domain = {
  name: string;
  lead: string;
  terms: Terms;
  /** Relation kinds a new project in this domain starts with. */
  relations: string[];
  prompts: Record<string, Wording>;
};

const GENERIC: Terms = { group: "Group", node: "Object", relation: "Relation" };

/** Every domain file in the folder, minus the two that are not domains. */
const files = import.meta.glob("../../../workflows/*.yaml", {
  eager: true,
  import: "default",
}) as Record<string, any>;

function lines(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);

  return value ? [String(value)] : [];
}

function wording(raw: any): Wording {
  return {
    prompt: lines(raw?.prompt),
    hint: raw?.hint ? String(raw.hint) : "",
    choices: Array.isArray(raw?.choices) ? raw.choices.map(String) : [],
  };
}

function domain(raw: any): Domain {
  const prompts: Record<string, Wording> = {};
  for (const [key, value] of Object.entries(raw?.prompts ?? {})) {
    prompts[key] = wording(value);
  }

  return {
    name: String(raw?.name ?? "freeform"),
    lead: String(raw?.lead ?? ""),
    terms: { ...GENERIC, ...(raw?.terms ?? {}) },
    relations: lines(raw?.relations),
    prompts,
  };
}

const DOMAINS: Record<string, Domain> = Object.fromEntries(
  Object.entries(files)
    .filter(([path]) => !/(entry|operations)\.yaml$/.test(path))
    .map(([, raw]) => [String(raw.name), domain(raw)]),
);

export const entry: Entry = {
  welcome: lines(entryFile.welcome),
  placeholder: String(entryFile.placeholder ?? ""),
  hint: String(entryFile.hint ?? ""),
  templates: (entryFile.templates ?? []).map((t: any) => ({
    id: String(t.id),
    chip: String(t.chip),
    about: String(t.about ?? ""),
    tags: lines(t.tags),
  })),
};

export const operations: Operation[] = (operationsFile.operations ?? []).map((o: any) => ({
  id: String(o.id),
  chip: String(o.chip ?? o.id),
  when: String(o.when ?? "always"),
}));

/** One domain's wording, falling back to the catch-all if it has no file. */
export function getDomain(name: string): Domain {
  return DOMAINS[name] ?? DOMAINS.freeform;
}

/** Wording for an operation, preferring the `_root` variant when the project
 *  itself is selected and there is no object to name. */
export function getWording(domain: Domain, operation: string, root: boolean): Wording | null {
  const keys = root ? [`${operation}_root`, operation] : [operation];

  return keys.map((key) => domain.prompts[key]).find(Boolean) ?? null;
}

/** The chip wording for a template id, for naming what the user just chose. */
export function chipFor(id: string): string {
  return entry.templates.find((t) => t.id === id)?.chip ?? id;
}
