/** Every shared shape in one place: the graph, the changes that build it, and
 *  the steps that record them.
 *
 *  The graph is **elements** and **relationships**, and nothing else. An
 *  element is placed and drawn; a relationship joins two of them. Everything
 *  else describes one of the two.
 *
 *  An element *is* a document — its text lives on it, and the object explorer
 *  is the tree of blocks. There is no second representation to fall out of
 *  step. */

/** Which frame edge an interface sits on. */
export type Side = "top" | "right" | "bottom" | "left";
/** Decorative marking on an interface. Constrains nothing. */
export type Flow = "in" | "out" | "both";
/** Which way a relationship reads. Undirected by default. */
export type Dir = "none" | "forward" | "back" | "both";

/** Which of the four an element is — its **form**.
 *
 *  Closed and engine-level: it decides what draws an element and which rules
 *  reach it. `block` is the base and the default — the discrete structural
 *  thing the tree is built from. `note` and `group` describe rather than
 *  structure, and a group is the generic set, meaning whatever its definition
 *  says. `reference` stands in for a block living in another layer. Ornament a
 *  package ships is still a block: its definition carries a shape and a size.
 *
 *  A user's own subtypes go in `type` and subtype **within** one of these,
 *  never across one, so this set stays closed and no rule has to branch on
 *  user data. Container and interface are not here: both are derived, from
 *  what a block holds and from whether it sits on a frame edge. */
export type ElemForm = "block" | "note" | "group" | "proxy";

/** What a relationship's ends are — its **form**. Two, and both are declared.
 *
 *  `line` is the default and says nothing beyond "these two are related": its
 *  ends are plain seats and the layer puts them wherever the path wants.
 *  `directed` says it goes one way, so its ends take the sides the layer's axis
 *  gives them and it biases placement. The form decides the ends; `dir` still
 *  decides which way the arrows point.
 *
 *  **`reference` and `tie` are not among them, because nobody has to say so.** A
 *  relationship is a reference when an end is a reference and a tie when an end is a
 *  note — facts about where its ends live rather than forms it was given. Being
 *  derived does not make either less the engine's business: a tie still draws as
 *  a leader taking no seats. It only means the engine works it out.
 *
 *  A weaker mention drawn lighter is not a form either — that is presentation,
 *  and presentation is a definition's. Anything joining two elements is a
 *  relationship, so there is one way to join things, one cascade when an end is
 *  deleted, and one list to read them from. */
export type EdgeForm = "line" | "directed";

/** Which way a layer reads, and nothing else.
 *
 *  A setting, held per layer, because a pipeline and a hierarchy can sit in one
 *  project. It decides which sides a `flow` relationship attaches to and how
 *  its line is drawn. It says nothing about where cards go — that is what an
 *  arrangement does, and an arrangement is an action rather than a setting. */
export type Axis = "none" | "across" | "down";

/** What one run of an arrangement does. Never stored: picking one lays the
 *  layer out and writes down where everything landed. */
export type Layout = "grid" | "radial" | "across" | "down";

/** The block that holds every other.
 *
 *  A reserved id rather than a shape of its own, so root is an ordinary
 *  element carrying the project's name, axis, body and attributes. `parent:
 *  null` still means "in the root layer" everywhere it is written; root is
 *  told from its own children by this id alone, which is the one place any
 *  listing has to know about it. */
export const ROOT = "root";

/** What a field holds — its **form**.
 *
 *  Closed and permanent, the way a retired op is: a form is written into logs,
 *  so every value here has to outlive every future build. `date` was left out
 *  because a `text` field carries one and nothing reasons about it, and a
 *  general list because `many` on a `link` covers what it was wanted for. Both
 *  can widen later without reinterpreting a value already written, which is
 *  the test a deferral had to pass. */
export type ValueForm = "text" | "number" | "flag" | "choice" | "link";

/** A named, typed value carried by an element or a relationship.
 *
 *  No identity of its own — a field is a name and a value on the thing that
 *  carries it, addressed by that name. Never structural: a field never appears
 *  in the explorer and never changes what contains what. A `link` points at an
 *  element or a definition **without drawing a line**, which is how a part
 *  property or a satisfied requirement is stated. */
export type Field = {
  name: string;
  form: ValueForm;
  value: string;
  tags: string[];
  /** `number` only — what the quantity is measured in. */
  unit?: string;
  /** `choice` only. Normally the definition's to declare; held here where a
   *  field was made without one. */
  choices?: string[];
  /** `link` only — whether it points at more than one thing. */
  many?: boolean;
};

export type Element = {
  id: string;
  /** Which of the four this is. Closed, engine-level, and set at creation. */
  form: ElemForm;
  label: string;
  /** The user's own subtype for this element — a stereotype, and empty until
   *  somebody sets one.
   *
   *  Not the domain's word for a block: that is `terms.node` ("Module",
   *  "Character"), one per project, and it is shown as this field's
   *  placeholder rather than copied onto everything. A `type` is only ever a
   *  distinction somebody drew. */
  type: string;
  parent: string | null;
  body: string;
  /** Set only once the user drags it; null means lay it out automatically. */
  x: number | null;
  y: number | null;
  /** The least room a note was asked for, from the rectangle its drag swept.
   *  A minimum and not a size: the text still grows it, so the box and what it
   *  says can never disagree. Null on everything else. */
  w: number | null;
  h: number | null;
  /** Set when this block sits on its parent's frame edge, which is what makes
   *  it an interface. An interface's x/y mean nothing — side and how far along
   *  the edge take their place, so the port survives the frame resizing.
   *
   *  Set once, at creation. An interface stays an interface: it slides along
   *  the edge and around corners, but never steps off it to become a child
   *  block, and no child block ever steps onto it. */
  side: Side | null;
  at: number | null;
  flow: Flow | null;
  /** This element's number among its siblings of the same kind, fixed when it
   *  is made. Stored rather than counted, so deleting one renames none of the
   *  others: the gap it leaves is simply what the next one takes. */
  num: number | null;
  /** How this element arranges its contents when it is the layer being looked
   *  at. Null reads as `none`. */
  axis: Axis | null;
  /** The groups this element belongs to — its membership.
   *
   *  Held here and nowhere else: a group's member list is derived by asking
   *  who names it, so the two can never disagree. Membership is descriptive,
   *  not structural — a group is never a parent. */
  groups: string[];
  /** What a reference stands in for: `{ project, element }`, both by id.
   *
   *  Written as a path — `proj_a9f/block_1` — via {@link refTo}, and a bare id
   *  means this project, so every reference written before projects could see one
   *  another still reads. Held here rather than as a relationship: a reference is
   *  not two things being joined — it is one thing appearing twice, which is a
   *  property of the appearance. The relationships that *reach* a reference are the
   *  references, and they are ordinary relationships drawn by hand. */
  of: string | null;
  /** Descriptive values, addressed by name. */
  fields: Field[];
};

/** One end of a relationship as it is drawn: the element it lands on, the
 *  interface it landed on where it landed on one, and the wall the gesture
 *  named where it named one. Most ends have neither — where a line meets a card
 *  is worked out by the layer, not stored. */
export type End = { node: string; port?: string; side?: Side };

/** A point on the canvas. */
export type Spot = { x: number; y: number };

export type Edge = {
  id: string;
  source: string;
  target: string;
  /** What this relationship means — its stereotype. Free text, offered from
   *  the project's list and renameable across every edge at once. */
  type: string;
  /** The interface each end is tied to. A relationship has one at each end
   *  always; absent only means it was never placed anywhere in particular,
   *  so it is implied at the side of the card facing the other end rather than
   *  stored. Drawing a relationship by hand places both. */
  from?: string;
  to?: string;
  dir: Dir;
  /** What its ends are. Absent reads as `line`, so an edge that was never
   *  told anything still folds to what it drew. */
  form?: EdgeForm;
  /** The wall an end was drawn through, where the gesture named one.
   *
   *  A choice, so it is kept — the same standing an element's own position has
   *  over automatic layout. Unlike a route it never goes stale: cards move, the
   *  frame is resized, the layer is rearranged, and "this leaves by the north
   *  wall" is still true and still drawable. The seat along that wall stays
   *  derived. `arrange` clears these along with hand placement. */
  fromSide?: Side;
  toSide?: Side;
  /** Where on that wall the from end sits, when somebody dragged it there.
   *  Absent means the layer still chooses along the wall. */
  fromAt?: number;
  /** Same for the to end. */
  toAt?: number;
  /** Descriptive values, addressed by name — a transition's trigger and guard,
   *  a flow's item. Absent rather than empty, so an edge that says nothing
   *  extra writes nothing extra. */
  fields?: Field[];
};

/** A reusable subtype: what a `type` names.
 *
 *  One record serves elements and relationships alike — the `form` it subtypes
 *  decides which it applies to, and a project's relation vocabulary is simply
 *  the definitions of a relationship form. A definition declares the fields its
 *  usages carry and how they draw; a usage holds only the values it gives.
 *
 *  **Referenced by id, never by name.** A pin typed by `Signal`, a flow
 *  carrying `Signal` and a data structure holding another all break the moment
 *  a rename can orphan them, and a name is the one part a user is certain to
 *  change. */
export type Definition = {
  id: string;
  name: string;
  form: ElemForm | EdgeForm;
  /** What its usages carry, declared. A usage's own `fields` hold the values. */
  fields: Field[];
  /** What this kind of thing is, in a sentence — the way an element has one.
   *
   *  Shown where a type is chosen, and matched against whatever somebody types,
   *  which is why a definition needs no list of keywords beside it: the words
   *  are already here and already embedded. */
  body?: string;
  /** How its usages draw. Presentation lives here and never on a usage, which
   *  is what keeps it structurally out of an export rather than filtered from
   *  one on the way.
   *
   *  **No colour among them.** A hue is `components.style.slot` and how loudly
   *  it is taken is `components.style.emphasis`, both closed sets — the theme
   *  owns the palette and a definition chooses within it (Y.7). `color` was the
   *  one free-form value here and the only way a definition could look wrong. */
  icon?: string;
  line?: "solid" | "dashed" | "dotted";
  head?: "none" | "open" | "filled" | "hollow";
  /** How big a usage should sit when layout places it — a fork bar long and
   *  thin, a decision small and square. Absent is the ordinary card. */
  size?: { w: number; h: number };
  /** The definition this one refines, by reference — usually one shipped in a
   *  package, `pkg_sysml/def_requirement`.
   *
   *  **Extension is subtyping, never overriding.** A package's own definitions
   *  are never altered: a standard somebody can silently change in their own
   *  workspace has stopped being a standard, and every file referencing it
   *  becomes unreadable without knowing what else was loaded. So a refinement
   *  is a new definition that *is a* the old one, and the original keeps
   *  meaning what it meant.
   *
   *  Fields union with the subtype's winning by name; `components` merge per
   *  key, and a key it does not mention it inherits whole. **A rule naming a
   *  definition means it or anything below it** — without that, an imported
   *  standard's rules would match only its own definitions and nothing anybody
   *  actually models, which is what makes the chain worth walking rather than
   *  copying. One parent, so there are no diamonds and no merge order to
   *  specify; a missing one degrades rather than throwing. */
  extends?: string;
  /** What other vocabularies call this, keyed by vocabulary —
   *  `{ sysml: "«requirement»" }`.
   *
   *  `name` is what the user reads and types; these are what an export writes,
   *  so nobody has to learn a notation to use one. A map rather than a single
   *  field, so one definition can answer to SysML *and* UML. */
  names?: Record<string, string>;
  /** How each open component behaves for usages of this, keyed by component.
   *
   *  **The one place the schema grows.** A new capability adds a key here
   *  rather than a field beside it, which is what stops every component
   *  costing a schema change — and what makes "unknown configuration is
   *  ignored, never fatal" implementable rather than aspirational.
   *
   *  Each component validates its own key and reads no other's; one absent from
   *  the build validates nothing, so its configuration is unvalidated rather
   *  than wrong. `size` is deliberately not in here: layout reads it for every
   *  element on every pass, and the engine reaching into component
   *  configuration would invert the dependency. */
  components?: Record<string, Record<string, unknown>>;
};

export type Graph = {
  /** The project's own vocabulary: every subtype it has named, for elements
   *  and relationships alike. A third bag beside the other two, and none of it
   *  is an element, so none of it reaches the explorer. */
  defs: Record<string, Definition>;
  elements: Record<string, Element>;
  edges: Record<string, Edge>;
  /** Packages this project draws definitions from, in import order.
   *
   *  Stable `pkg_*` ids — never copied into `defs`. Order decides which of two
   *  like-named definitions a picker offers first. Empty until something is
   *  chosen; a legacy domain string heals to a one-entry list at the door. */
  vocabulary: string[];
};

export type Mutation =
  /** A whole graph, standing in for every step that came before it.
   *
   *  Written by compaction, never by a gesture. It is what keeps history
   *  bounded, and it is also how a project sheds retired ops: whatever the old
   *  steps were spelled in, the snapshot is in the current schema. */
  | { op: "checkpoint"; graph: Graph;
      /** How many steps were taken before this one, so that `meta.steps`
       *  survives compaction discarding them. Absent on checkpoints written
       *  before it was counted. */
      at?: number }
  | { op: "add_element"; element: Element }
  | { op: "update_element"; id: string; label?: string; type?: string }
  | { op: "move_element"; id: string; parent: string | null }
  | { op: "place_element"; id: string; x: number; y: number }
  /** The least room a note was asked for, from the rectangle its drag swept. */
  | { op: "size_element"; id: string; w: number; h: number }
  | { op: "delete_element"; id: string }
  | { op: "set_body"; id: string; body: string }
  /** Slide an interface along its parent's frame edge, and around its corners.
   *  It never comes off: an interface is one for as long as it exists. */
  | { op: "set_port"; id: string; side: Side; at: number }
  | { op: "mark_port"; id: string; flow: Flow | null }
  /** How a layer arranges its contents. Null names the root. */
  | { op: "set_axis"; layer: string | null; axis: Axis }
  /** Hand a layer's blocks back to automatic placement, so a new arrangement
   *  has something to arrange. */
  | { op: "relax_layer"; layer: string | null }
  /** Join or leave a group. Membership is held on the member, and is not a
   *  relationship: a group draws a boundary round its members rather than a
   *  line to each. */
  | { op: "join_group"; id: string; group: string }
  | { op: "leave_group"; id: string; group: string }
  /** Set or drop a descriptive value, addressed by its name. Reaches an
   *  element or a relationship — both carry fields. */
  | { op: "set_field"; id: string; name: string; form?: ValueForm; value?: string;
      tags?: string[]; unit?: string; choices?: string[]; many?: boolean }
  | { op: "drop_field"; id: string; name: string }
  | { op: "link_elements"; edge: Edge }
  /** Tie one end of a relationship to an interface that now exists for it. */
  | { op: "set_end"; id: string; end: "from" | "to"; port: string }
  | { op: "update_edge"; id: string; type: string }
  | { op: "set_dir"; id: string; dir: Dir }
  | { op: "set_form"; id: string; form: EdgeForm }
  /** Pin one end of a relationship to a wall, or hand it back to the layer.
   *  An optional `at` pins the seat along it without making an interface. */
  | { op: "set_side"; id: string; end: "from" | "to"; side: Side | null; at?: number | null }
  /** Turn a relation around; what it says stays the same. */
  | { op: "flip_edge"; id: string }
  | { op: "delete_edge"; id: string }
  /** Make or amend a definition. Everything but the id is a patch. */
  | { op: "set_def"; id: string; name?: string; form?: ElemForm | EdgeForm; fields?: Field[];
      body?: string; icon?: string; line?: Definition["line"];
      head?: Definition["head"]; size?: Definition["size"];
      names?: Record<string, string>; components?: Record<string, Record<string, unknown>>;
      extends?: string }
  /** Drop it; usages survive, their `type` pointing at nothing. */
  | { op: "drop_def"; id: string }
  | { op: "set_vocabulary"; vocabulary: string[] };

/** One user action and everything it changed. Undo flips the status and the
 *  graph is refolded, so no mutation needs an inverse. */
export type Step = {
  id: string;
  /** Id of the workflow question this answered, "" for a direct edit. */
  question: string;
  /** The question as it was asked, so the terminal can show the exchange. */
  prompt: string;
  /** What the user said or did, for the action log. */
  input: string;
  action: string;
  mutations: Mutation[];
  status: "applied" | "reverted";
};

let counter = 0;

/** 64 bits of randomness in base36, for the tail of an id.
 *
 *  `Math.random` is not a source of unique values — it is seeded per context
 *  and gives no collision guarantee at all, which was tolerable while an id
 *  only had to be unique inside one project. It no longer is. The fallback
 *  stays for a host without `crypto`, where a weak id still beats a crash. */
function entropy(): string {
  const bytes = new Uint8Array(8);

  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let at = 0; at < bytes.length; at += 1) bytes[at] = Math.floor(Math.random() * 256);

  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);

  return value.toString(36);
}

/** Short readable id, prefixed with what it points at. **Globally unique.**
 *
 *  The prefix costs nothing and makes every reference legible in a diff — a
 *  `parent` or a `source` says what it reaches without a lookup. A **name** is
 *  never part of one: it would go stale the moment somebody renamed the thing,
 *  or force the id to be rewritten everywhere, which is the whole point of
 *  having one.
 *
 *  Monotonic within a session, which keeps the action log and the canvas stable
 *  across a refold. The counter restarts each session, so the random tail is
 *  what keeps two sessions — and two projects — apart.
 *
 *  **Unique everywhere, not merely inside one project** (B.19). One log for the
 *  whole workspace cannot hold two elements under one id, and a collision does
 *  not fail loudly: it silently fuses two elements into one. So the tail is 64
 *  bits from `crypto` rather than eight characters of `Math.random`, and a
 *  path (`proj_a9f/block_x`) says *where* an element lives without being what
 *  identifies it.
 *
 *  **Definition ids are the deliberate exception**: {@link defIdFor} derives one
 *  from the name so that two people typing "flow" mean one definition, which is
 *  what makes free text become a real type. Those stay project-scoped and are
 *  addressed by path.
 *
 *  Older `n_`/`e_`/`s_` ids stay valid, since an id is opaque and nothing reads
 *  its prefix. */
export function newId(prefix: string): string {
  counter += 1;

  return `${prefix}_${counter.toString(36)}${entropy()}`;
}

/** Where a reference points, when it may point outside this project.
 *
 *  Written as a path — `proj_a9f/def_pump` — and a bare id means "here", so
 *  every reference written before projects could see one another still reads.
 *  One convention for all three places a reference is held: a reference's `of`, an
 *  element's `type`, and a `link` field's value. Ids never contain a slash, so
 *  there is nothing to escape and nothing ambiguous. */
export function refTo(id: string, project?: string | null): string {
  return project ? `${project}/${id}` : id;
}

/** The two halves of one, with `project` absent for anything local. */
export function refAt(ref: string): { project?: string; id: string } {
  const cut = ref.indexOf("/");
  if (cut < 0) return { id: ref };

  return { project: ref.slice(0, cut), id: ref.slice(cut + 1) };
}

/** A reference's target: the block, and the project it lives in when that is not
 *  this one. The same path as every other cross-project ref, named for how a
 *  reference reads it. */
export type ReferenceTarget = { project?: string; element: string };

/** {@link refAt} as a reference target — `id` is the element half. */
export function asTarget(of: string): ReferenceTarget {
  const { project, id: element } = refAt(of);

  return { project, element };
}

/** An element with the defaults filled in, so callers only state what differs. */
export function element(label: string, extra: Partial<Element> = {}): Element {
  // Minted from the form it is actually being made as, so a note is never
  // handed a `block_` id. `extra` still wins, for a caller naming its own.
  const form = extra.form ?? "block";

  return {
    id: newId(form),
    form,
    label,
    type: "",
    parent: null,
    body: "",
    x: null,
    y: null,
    w: null,
    h: null,
    side: null,
    at: null,
    flow: null,
    num: null,
    axis: null,
    groups: [],
    of: null,
    fields: [],
    ...extra,
  };
}

/** The root block: the one element every project starts with. */
export function rootElement(title = ""): Element {
  return element(title, { id: ROOT, axis: "none" });
}

/** Package ids from a stored vocabulary — a list as written, or one id healed
 *  from a legacy domain stem so old logs and files still fold. */
export function asVocabulary(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string")
      .map((v) => packRef(v.trim()))
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [packRef(value.trim())];

  return [];
}

/** Domain stem still used for terms and prompts — first package's name.
 *
 *  Z owns reworking that coupling; until then the stem is recovered from the
 *  import list rather than stored beside it. */
export function stemOf(vocabulary: string[]): string {
  const first = vocabulary[0];
  if (!first) return "";
  if (first.startsWith("pkg_")) return first.slice(4);

  return first;
}

/** A package id: leave `pkg_…` alone; mint one from a legacy domain stem. */
function packRef(stem: string): string {
  if (!stem) return "";
  if (stem.startsWith("pkg_")) return stem;

  return `pkg_${stem.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

export const EMPTY: Graph = {
  defs: {}, elements: { [ROOT]: rootElement() }, edges: {}, vocabulary: [],
};

/** A definition's id where it was minted from a bare name — a relation typed
 *  into the canvas, or a log written before definitions existed.
 *
 *  Derived from the name so that folding the same log twice mints the same id:
 *  a random one would change on every render and the graph would never settle.
 *  Only this bridge is derived; a definition made deliberately gets an id of
 *  its own, so renaming it orphans nothing. */
export function defIdFor(name: string): string {
  return `def_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

/** A definition with the defaults filled in. */
export function definition(name: string, extra: Partial<Definition> = {}): Definition {
  return { id: newId("def"), name, form: "line", fields: [], ...extra };
}

/** A relationship with the defaults filled in. Undirected unless said. */
export function edge(source: string, target: string, extra: Partial<Edge> = {}): Edge {
  return { id: newId("edge"), source, target, type: "", dir: "none", ...extra };
}

/** A field with the defaults filled in. Text unless said otherwise, which is
 *  what an untyped attribute from an older log becomes. */
export function field(name: string, extra: Partial<Field> = {}): Field {
  return { name, form: "text", value: "", tags: [], ...extra };
}

export function step(input: string, action: string, mutations: Mutation[],
                     question = "", prompt = ""): Step {
  return { id: newId("step"), question, prompt, input, action, mutations, status: "applied" };
}
