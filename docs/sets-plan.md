# Model sets

**Agreed in shape (the user, 2026-11-23); first pass built 2026-11-23, uncommitted** (docs/tools/set.md is the spec of what is built; rounds 7–10 below). A model is made by a short pipeline: the agent writes a brief, the tools do the rest from facts by a set (a recipe of diagrams), the agent writes the words. Sets are the simplification pass (iteration plan 3a retired): most single-purpose tools become internal. Everything lives in the CLI app until mature, then spins out with the tools to a separate project (working name *Mndscape*). Delete this plan once sets are built and the decisions are in design.md and presentations.md.


## Why

| Need | Because |
|---|---|
| **few agent decisions** | the agent should only say what a model is about; scope, diagrams, parts and order follow from that |
| **consistent results** | two agents on one codebase invent two different sets of models (rounds 1–5); a set fixes the diagrams |
| **high-level first** | round 6a's tours went into the weeds (a plugin family, middleware) where the user wanted the big picture |
| **fewer commands** | many tools are special cases; one pipeline replaces them |


## The pipeline

| Step | Who | Does |
|---|---|---|
| 1. **brief** | agent | per model: what the system or part is, what the model illustrates, how it fits the big picture; written in the model file (its description, why and fit) |
| 2. **scope** | agent, from the brief | the units of code the model covers |
| 3. **facts** | tools | a generic translator per language (Python, TypeScript) gives a graph of facts; a level is chosen by density (*Depth by density*); no per-framework or per-codebase code |
| 4. **set** | default, or the agent's pick | a recipe of diagrams, each fed by one fact family; a diagram without facts is skipped and reported |
| 5. **generate** | tools | the diagrams, pointers to the relevant parts and definitions, a tour skeleton seeded from the brief |
| 6. **words** | agent | the tour's words; a few dials where the defaults fall short |

The defaults must work on most projects with no dials touched.


## Models

- **a model is a container** of diagrams and pointers to relevant parts and definitions, told by one tour
- **models are a flat list**: no sub-models; a tour stop leads `into` another model instead
- **a model stays at its level**: a diagram shows the blocks at its level; detail lives inside a block (its parts or attributes) and is drawn only when the brief asks for it


## Fact families

| Family | Facts | Feeds |
|---|---|---|
| **structure** (import paths) | units, imports, runtimes | treemap, context |
| **user paths** | entries, calls, trace | sequence, flow, swimlane |
| **data paths** | classes, schema, data reads and writes | class, entity, dataflow, state, mapping |

**Generic entries** (no framework readers): *declared* (pyproject `scripts`, package.json `bin`, `__main__`), *decorated* (an own function decorated by an outside package), *registered* (an own function or class passed to an outside call, or named in a settings string). A route's or command's text is kept where it is a literal argument. Today's Django readers (`commands`, `routes` in apps/py `entries.py`) give way to these.

## Depth by density

Facts form one graph: a containment tree (packages → modules → classes → functions) with relations between its nodes. Nothing is dropped by a threshold.

- **open level by level**, wide before deep, while the drawing stays under a comfortable density (blocks per view, lines per block); the busiest or largest branch opens first, so depth may differ by branch
- **what stays closed folds into its parent**: its relations lift to the nearest open ancestor, its contents become the block's parts or attributes
- **the agent targets**: a subtree to open further (from the brief) or the density limit, never a level by hand
- **the library** takes the same rule: one comfortable density for the whole tree

**Linking** (later): every fact anchored to its source so `check` flags drift (design.md *tools, then an agent*).


## Sets

| Set | Diagrams |
|---|---|
| **system** (default) | treemap and context (structure); the main user paths as sequence or flow; the data model as class or entity |
| **one path** | a user path end to end: sequence, flow, swimlane where it crosses runtimes |
| **data model** | class, entity, a state per status field, dataflow of one record |

More sets only by need. A set is a data file in the CLI (a recipe, not definitions).


## Commands

| Today | With sets |
|---|---|
| 11 fact tools (`imports`, `calls`, `trace`, …) | internal; `mnd facts <project>` stays to inspect them |
| 10 diagram tools, one per kind | `mnd draw <kind>`, the escape hatch; each kind brings its default facts |
| `init`, `define`, `model`, `presentation draft` | folded into `mnd set apply` |
| `check` | also reports each diagram filled, skipped or below the floor |

The agent's surface: `set list`, `set apply`, `draw`, `presentation check`/`list`, `check`.


## Evidence (round 6a, 2026-11-22)

Two agents rewrote healthchecks' tours (iteration-plan.md *Round 6a*). Mechanical decisions (9–11 each): a stop per diagram, steps in the diagram's order, an intro stop per model, marks for a part's modules. Judgement: which models, their order, which lines to step, cuts, every *why*. The words stay the agent's; sets remove the mechanical decisions and most of the model choice.


## Decided (the user, 2026-11-23)

| # | Question | Decision |
|---|---|---|
| 1 | required diagrams | every diagram optional, skipped ones reported; if all are skipped, the model's tree of parts (a treemap from structure facts) stands in |
| 2 | model names | the set's name by default, updated from the brief |
| 3 | prose in sets | intents only; the agent rewrites and adds context |
| 4 | how much to draw | density over a depth-ordered graph (*Depth by density*), not a cut per level; the agent may target a subtree or the limit |
| 5 | flat models on the map | as any containment: the standard treemap, nothing special |

**Open**: the density numbers (start from today's `LEAST` and draw ceilings, tune on rounds).


## Order

| # | Work | Done when |
|---|---|---|
| 1 | generic entries in apps/py; depth by density over the facts graph | healthchecks' entries found without the Django readers; its library opens to a readable depth with no dial touched |
| 2 | the system set as data; `set apply --dry` prints the report | the dry report on healthchecks reads true |
| 3 | `set apply`, flat models, the tour seeded from the brief; fact tools internal | a healthchecks round needs only briefs, a set pick and words |
| 4 | TypeScript behind the same facts (iteration plan 5); more sets by need | mndsite modelled by the system set |


## Rounds (2026-11-23)

Healthchecks from scratch with `set apply` and a brief (samples/trial/brief.md; outputs s7–s9 since cleared, s10haiku and s10sonnet kept with logs beside them). Every round ended with `check` and `presentation check` clean and no hand-written YAML but the brief and the tours' words.

| Round | Commands (Sonnet / Haiku) | Fixed after it |
|---|---|---|
| 7 | 15 / ~25 | context thinned to the ceiling; names said with their holder (`api views`); entity else class; `--force` removes models no longer planned; calls follow handed functions and values named for a class (sendalerts reaches delivery) |
| 8 | 11 / ~26 | brief `externals`, `parts`; dry run shows brief keys and what each path runs; clash names counted over the library only; a picked twin path said; renamed parts' old files removed |
| 9 | 16 / 22 | paths spread over parts; `--pick` by last word, unknown refused; brief `actors`; calls into a shared helper part left out of sequences; YAML hint |
| 10 | ~19 / 21 | data diagrams named for their model (a model named `Records` shadowed the diagram) |
| 11 | ~21 / 14 | (with the quality bar; both `presentation check` clean, no warnings, one apply each, no re-run) `parts` names a block below by its holder (`api.management`); the report says the parts left out of the overview and a dry run's scope; a step picks one of a pair's lines by name (`a -> b: name`), drafted so where a pair repeats; a drafted entity stop marks its entities; set.md: quote `: ` values, an entity's keys come from fields |

## Review (2026-11-23)

A code review of the first pass; every finding fixed and run on healthchecks again (`check`, `presentation check` clean; 303 tests pass).

| Finding | Fixed |
|---|---|
| `--force` removed every model the plan did not write, another set's and hand-written ones too | a folder's hidden `.set.json` says what each set wrote; only this set's earlier models are removed |
| a second set in one folder rewrote the shared library (no brief) and could write a second model of the same name | the folder keeps its brief in `.set.json`; a brief given adds to it; model names are kept per set; a name another set wrote is refused before writing |
| a brief's external naming no overview part threw halfway, the folder half-written | checked before anything is written (`--dry` too) |
| a non-number dial (`--budget 4O`) opened nothing | refused |
| a route wrapped in an outside call (`csrf_exempt(views.ping)`) was lost | the wrapper is read through; only a call naming an own module or list mounts |
| exec-form command lines (`CMD ["python", "-m", "x"]`) were missed | words read without brackets and quotes |
| `raise SystemExit(main())` ran `SystemExit` | the first own function the main block calls |
| a unique method name claimed `d.get`, `items.append` | never for a name the language's own values have |
| decorators counted as ways in | only routes, processes and scripts count |
| a scope matched sibling prefixes (`hc.api` kept `hc.apiary`) | a dot boundary |
| the lift to the library written three times | one `lifted`, one `top_units` |

Kept: `calls` is asked per path candidate, lazily, only until the set has its paths (3 to 6 runs).

**Answered (the user, 2026-11-23)**, built the same day:

| Question | Answer | Built |
|---|---|---|
| one caller per kind of way in | split per route | a route's caller is a client of the overview part it enters (`api client`, `dashboard client`); processes and scripts an `Operator`; the dry run lists them as the brief's `actors` keys |
| `--force` drops hand-written tours | keep them, no complex merge | a model rewritten keeps its `presentations:` whole, as written; only a model with none is drafted; `check` says a name a kept tour no longer reaches |
| drafted steps are bare names | use descriptions | a drafted step on a part says its library description (docstring, or the brief's `parts`), read through its `of` |
| incidental calls in sequences (a storage health check, nag dates) | leave them: the agent cuts them from the tour's words | nothing to build |

Also 2026-11-23: the door's message names the first thing it dropped (core `door.ts` `say`: "dropped 16" alone gave no clue).

