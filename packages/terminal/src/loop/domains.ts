/** What a domain says, and **nothing about when to say it**.
 *
 *  Three kinds of file, all data. `entry` is the catalogue of domains a first
 *  answer routes into. `operations` is the global list of things the
 *  conversation can ask for — **no domain may invent one**, so the loop only
 *  ever fills the slots of a known operation. A domain file supplies wording
 *  and the words it calls things by.
 *
 *  **Control flow is deliberately absent.** Which operation to ask about is
 *  decided in `router`, from the graph itself, so a new domain is wording only
 *  and a YAML file can never branch.
 *
 *  Nothing here reads a file. A surface may not, and a host already knows how —
 *  the web compiles the YAML in at build time and the CLI parses it. What
 *  arrives is whatever that produced, read defensively. */

/** What a domain calls things. Chips, mirrors and anywhere a count is said. */
export type Terms = { group: string; node: string; relation: string };

export type Wording = {
  /** One is chosen per asking, so the loop does not read as a form. */
  prompt: string[];
  hint: string;
  choices: string[];
};

export type Domain = {
  name: string;
  /** Which operation this domain leads with, when more than one is eligible. */
  lead: string;
  terms: Terms;
  prompts: Record<string, Wording>;
};

export type Template = {
  id: string;
  chip: string;
  about: string;
  /** Short phrases naming what somebody might be making. **Each is scored
   *  separately**, so they are phrases rather than keywords: a single word is
   *  too ambiguous and a paragraph averages out into vagueness. */
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
  /** The action a turn runs for it. Named here, so the loop reaches the same
   *  registry every other surface does and can write nothing of its own. */
  action: string;
  chip: string;
  /** The condition under which there is anything to ask. Named, never
   *  evaluated — what it means is the router's, which is code. */
  when: string;
};

const GENERIC: Terms = { group: "Group", node: "Object", relation: "Relation" };

const say = (v: unknown, fallback = ""): string => (v === undefined || v === null
  ? fallback : String(v));

const lines = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];

const bag = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};

function read_wording(raw: unknown): Wording {
  const w = bag(raw);
  return { prompt: lines(w["prompt"]), hint: say(w["hint"]), choices: lines(w["choices"]) };
}

function read_terms(raw: unknown): Terms {
  const t = bag(raw);
  return {
    group: say(t["group"], GENERIC.group),
    node: say(t["node"], GENERIC.node),
    relation: say(t["relation"], GENERIC.relation),
  };
}

export function read_domain(raw: unknown): Domain {
  const d = bag(raw);
  const prompts: Record<string, Wording> = {};
  for (const [key, value] of Object.entries(bag(d["prompts"]))) {
    prompts[key] = read_wording(value);
  }
  return {
    name: say(d["name"], "freeform"),
    lead: say(d["lead"]),
    terms: read_terms(d["terms"]),
    prompts,
  };
}

export function read_entry(raw: unknown): Entry {
  const e = bag(raw);
  const templates = Array.isArray(e["templates"]) ? e["templates"] : [];
  return {
    welcome: lines(e["welcome"]),
    placeholder: say(e["placeholder"]),
    hint: say(e["hint"]),
    templates: templates.map((t: unknown) => {
      const raw_t = bag(t);
      return { id: say(raw_t["id"]), chip: say(raw_t["chip"]),
               about: say(raw_t["about"]), tags: lines(raw_t["tags"]) };
    }),
  };
}

export function read_operations(raw: unknown): Operation[] {
  const list = bag(raw)["operations"];
  if (!Array.isArray(list)) return [];
  return list.map((o: unknown) => {
    const op = bag(o);
    const id = say(op["id"]);
    return { id, action: say(op["action"], id), chip: say(op["chip"], id),
             when: say(op["when"], "always") };
  });
}

/** Everything a loop needs said to it. The host gathers it; the router and the
 *  turn read it and never fetch it. */
export type Wordings = {
  entry: Entry;
  operations: readonly Operation[];
  domains: Record<string, Domain>;
};

/** One domain's wording, falling back to the catch-all when it has no file —
 *  which is why `freeform` has to exist. */
export function domain(said: Wordings, name: string): Domain {
  return said.domains[name] ?? said.domains["freeform"]
    ?? { name: "freeform", lead: "", terms: GENERIC, prompts: {} };
}

/** Wording for an operation, preferring the `_root` variant when the layer is
 *  the workspace itself and there is no block to name. */
export function wording(of: Domain, operation: string, root: boolean): Wording | null {
  const keys = root ? [`${operation}_root`, operation] : [operation];
  return keys.map((key) => of.prompts[key]).find(Boolean) ?? null;
}
