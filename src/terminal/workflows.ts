/** Workflow definitions, read from YAML at build time.
 *
 *  Four kinds of file. `entry` is the catalogue of domains a first answer
 *  routes into. `operations` is the global list of things the conversation can
 *  ask for — no domain may invent one. A domain file supplies wording only.
 *  Starting relations live in `packages/core/<name>.yaml` and are bridged into
 *  `Domain.relations` here until seeding reads packages directly.
 *  What each domain calls things lives in `packages/terms/<name>.yaml` — a
 *  general need, not the rail's — and is merged into `Domain.terms` here so
 *  the question loop can still speak the same words the explorer does.
 *
 *  Control flow is deliberately absent: which operation to ask about is
 *  decided in `router`, from the graph itself. A new domain is wording only. */

import entryFile from "../../workflows/entry.yaml";
import operationsFile from "../../workflows/operations.yaml";

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
const files = import.meta.glob("../../workflows/*.yaml", {
  eager: true,
  import: "default",
}) as Record<string, any>;

/** Words keyed by domain name — stem matches `name` in the domain file. */
const termFiles = import.meta.glob("../../packages/terms/*.yaml", {
  eager: true,
  import: "default",
}) as Record<string, any>;

/** Relation seeds from packages/core — stem matches domain `name`. Bridge only. */
const coreFiles = import.meta.glob("../../packages/core/*.yaml", {
  eager: true,
  import: "default",
}) as Record<string, any>;

function stem(path: string): string {
  return path.match(/([^/\\]+)\.yaml$/)?.[1] ?? "";
}

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

const TERMS: Record<string, Terms> = Object.fromEntries(
  Object.entries(termFiles).map(([path, raw]) => [
    stem(path),
    {
      group: String(raw?.group ?? GENERIC.group),
      node: String(raw?.node ?? GENERIC.node),
      relation: String(raw?.relation ?? GENERIC.relation),
    },
  ]),
);

/** Definition names only — entry still mints `set_def` with form `line`. */
const RELATIONS: Record<string, string[]> = Object.fromEntries(
  Object.entries(coreFiles).map(([path, raw]) => [
    stem(path),
    Array.isArray(raw?.definitions)
      ? raw.definitions
          .map((d: any) => String(d?.name ?? "").trim())
          .filter(Boolean)
      : [],
  ]),
);

function domain(raw: any): Domain {
  const name = String(raw?.name ?? "freeform");
  const prompts: Record<string, Wording> = {};
  for (const [key, value] of Object.entries(raw?.prompts ?? {})) {
    prompts[key] = wording(value);
  }

  return {
    name,
    lead: String(raw?.lead ?? ""),
    terms: TERMS[name] ?? GENERIC,
    relations: RELATIONS[name] ?? [],
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
