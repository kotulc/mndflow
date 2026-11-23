# Diagram and presentation sets

**Proposed (the user, 2026-11-22), not built.** Common sets of models, diagrams and presentation stops for a given use case (a type of codebase), filled in by the tools from facts, so the agent decides less and results are consistent. Taken up after the iteration plan's round 6; judged as every round is, by commands run, files written by hand and the friction log. Delete this plan once sets are built and the decisions below are in design.md and presentations.md.


## Why

| Need | Because |
|---|---|
| **less agent input** | the agent decides scope, diagrams, parts, order and words per project; most of that is the same for every project of a kind |
| **consistent results** | two agents on one codebase invent two different sets of models (rounds 1–5); a set fixes the slots |
| **better tours** | drafted stops are mechanical (`a → b: name`); a set carries each stop's intent, so the draft says why, not only what |


## The shape

| Piece | Is |
|---|---|
| **slot** | one diagram in one model: its kind, the facts that feed it, what the agent must pick (an entry, a datum), its intent in a sentence, whether it is optional |
| **set** | named slots grouped into models (one overview, decomposed by use case) and a tour outline over them; a set `extends` another |
| **core** | the slots every set has (below); a domain set adds 2 to 5 |
| **detection** | signals in the facts that score each set; the highest above a threshold is proposed, ties and low scores ask |
| **report** | each slot filled, partial (a weaker fact used), skipped (below the floor or absent) or needs the agent (no fact gives it), with why and the fix |


## The core

**A treemap is containment alone** (2026-11-22), so context is the only relation view at the top and is always in the core.

| Slot | Model | Kind | Facts | Tool or agent |
|---|---|---|---|---|
| overview | Overview | tree (treemap) | units, runtimes | parts by the tool; which are primary, the agent |
| context | Overview | context | imports (outside), entries, edges | boxes and lines by the tool; actor names, the agent |
| main flow | one model per chosen entry | flow or sequence | entries, then calls or trace | the tool, once the agent picks the entry |
| data model | Data | class | classes, schema | the tool; which classes, the agent |
| stored shape | Data | entity | classes with keys | the tool, where keyed classes exist |
| about | Overview | About band | presentations, entries, library | the tool |
| tour | every model | presentation | the set's tour outline | skeleton by the tool; words and cuts, the agent |
| what runs it | Overview | flow | workflows | the tool, where workflows exist |


## Use cases

What a newcomer needs, in order, and what the set adds to the core. Facts: units, imports, classes, entries, edges, runtimes, calls, data, workflows, schema, trace.

| # | Use case | A newcomer needs, in order | Adds | Tour after the overview and context |
|---|---|---|---|---|
| 1 | **web service / API** | what it serves, to whom; the request path; the data; auth; background work; external calls | request (sequence from a route's trace), lifecycle (state from a status field), auth (flow), background (swimlane), ingest (mapping) | request → data → stored shape → lifecycle → background |
| 2 | **server-rendered web app** | pages and who uses them; a page request; forms; data; admin and jobs | 1, plus page map (context of url prefixes), forms (flow), templates (mapping) | pages → a page request → forms → data → background |
| 3 | **CLI tool** | its commands; one run end to end; config and files; output | commands (context), one run (flow), config (class, mapping) | commands → a run → config → outputs |
| 4 | **library / SDK** | the problem; its public API; a typical use; core types; extending it | public surface (tree), typical use (sequence from an example or test), extension points (class family), dependencies (context) | surface → core types → one call → extending it |
| 5 | **data pipeline / ETL** | sources and sinks; stages; the data at each stage; schedule; failure | stages (flow), a record's life (dataflow), field mapping (mapping), schedule (swimlane) | pipeline → a record's life → mapping → schedule |
| 6 | **event-driven / workers** | what comes in; the consumers; what each does; retries; what it emits | one event (sequence), handlers (flow), message types (class), job states (state) | one event → consumers → messages → failure and retry |
| 7 | **frontend app** | screens; component structure; state and fetching; the main action; the API | screens (context), components (tree), main action (sequence), state (state or dataflow) | screens → components → one action → state → API |
| 8 | **mobile app** | as 7, plus device permissions and sync | 7, plus sync (swimlane) | as 7; agent-heavy until a Swift or Kotlin translator exists |
| 9 | **ML training / inference** | data in; preprocessing; the model; training; evaluation; serving | pipeline (flow), artifacts (mapping, from a short run), config and model structure (class), serving (sequence) | data → training → artifacts → serving |
| 10 | **game** | the main loop; entities and states; systems; one frame | main loop (flow), entities (class), states (state), one frame (sequence) | loop → entities → states → a frame |
| 11 | **compiler / interpreter** | its stages; the IR; one program through it; the runtime | stages (flow), IR types (class), one program (dataflow), runtime (state or sequence) | stages → IR → one program → runtime |
| 12 | **infrastructure as code** | resources; environments; dependency order; apply; state and secrets | resources (context), apply (flow), environments (swimlane) | agent-heavy: no translator reads HCL or YAML yet |
| 13 | **monorepo of services** | the services and who calls whom; shared libraries; one request across them; deploy units | service map (context), a request across services (sequence), shared data (class), deploys (flow); each service its own set, `into` its tour | services → one request across → each service → shared types |
| 14 | **plugin / extension host** | the host; extension points; a plugin's life; one plugin call | contract (class), lifecycle (state), one call (sequence) | host vs plugins → contract → lifecycle → a call |
| 15 | **build / generator** (mndsite) | inputs and outputs; the build run; config; what it writes | build (flow), inputs to outputs (mapping), config (dataflow, class) | inputs → the build → what it writes |

A project matching several (healthchecks: web service and workers) gets one overview with a model per matched set.


## Detection

| Signal | Points at | Confidence |
|---|---|---|
| route entries; imports django, flask, fastapi, express | 1 or 2 | high |
| …plus templates and render imports | 2 over 1 | medium |
| command entries; imports argparse, click, typer, commander; a `bin` | 3 | high |
| no entries, many exported units | 4 | medium |
| imports airflow, prefect, dbt, pandas; scheduled entries | 5 | medium |
| imports celery, kafka, rq, bullmq; task or listener entries | 6 | high |
| imports react, vue, svelte; a browser runtime | 7 | high |
| imports torch, tensorflow, sklearn | 9 | high |
| several top packages, each with entries | 13, then a set per package | medium |
| ORM base classes | adds stored shape | high |
| status or choices fields | adds a lifecycle | medium |
| workflows | adds what runs it | high |

No match: the core alone, reported as *no use case matched; closest: …*. Never fails.


## In the tools

| Command | Does |
|---|---|
| `mnd set list` | the sets and what each needs |
| `mnd set detect <project>` | the cheap facts, each set scored with the signals it matched |
| `mnd set apply <set or auto> <project> <folder> [--scope …] [--pick slot=entry] [--dry]` | the existing `init`, `define`, `draw` and `presentation draft` per slot; additive, never overwrites without `--force`; prints the report |
| `mnd set check <folder>` | slots filled, empty or below the floor; stops showing nothing |

**What the agent still decides**: the scope; which slots to drop or add; the pick a slot needs (the tool ranks candidates); the words and cuts of every tour. The set's `intent` lines seed the stops' summaries.


## Evidence (round 6a, 2026-11-22)

Two agents rewrote healthchecks' tours under *a treemap is containment alone* (iteration-plan.md *Round 6a*).

| | Haiku | Sonnet |
|---|---|---|
| decisions, mechanical / judgement | 11 / ~40 (most judgement is wording) | 9 / 15 (wording counted once) |
| mechanical | an `into` stop per sub-model, a stop per diagram, steps in the diagram's order, an intro stop per sub-model, marks for a part's modules | the same |
| judgement | which use cases earn a model, their order, which context lines to step, cuts, which parts to mark, every *why* | the same, plus which datum (the flip) a dataflow follows |

**The Django web-service set both proposed** (fills use case 1 above):

| Piece | From |
|---|---|
| overview: the Django apps as parts; actors (browser user, API client, cron job), externals (database, mail, cache, queue) | units, imports, settings |
| context | imports, `urls.py`, settings |
| a model per request family (web UI, JSON API, ping or webhook endpoints), each a sequence from a test-client trace and a flow per non-trivial view | entries (routes), trace |
| a model per management command or background job (a swimlane where it crosses view, worker and an external service) | entries (commands), calls |
| data: entity and class from the models; a state per status or choices field; a mapping from forms or serializers to fields | classes |
| tour: what it is → what it is made of → its world → data → per use case: why, sequence, flow, mapping → failure paths | the set's tour outline |

**What did not fit a template**: the *why* sentences, which datum a dataflow follows, which use cases earn a model, a plugin family (the transports), request-wide middleware, and what the trace cannot see (ORM writes, the far ends of SMTP and HTTP).


## Decisions for the user

| # | Question | Leaning |
|---|---|---|
| 1 | **where sets live**: built into the kit, or as library packages a workspace imports (*no consumer features in mndflow*; patterns compose as packages) | the core in the kit; domain sets as packages, the format general |
| 2 | a set as a new file format, or as a package of pattern definitions | decide with 1 |
| 3 | every slot optional (report and skip) or required slots | all optional, reported |
| 4 | fixed model names (*Request path*) or named from the pick (*Receive a ping*) | named from the pick, the slot's name as fallback |
| 5 | do sets carry prose templates for stops, or intents only | intents only; words stay the agent's |
| 6 | a project matching several sets | one overview, a model per set |


## Order

| # | Work | Done when |
|---|---|---|
| 1 | decisions 1–6 | agreed |
| 2 | the core, the web-service set (healthchecks), the CLI set (mndflow's own cli) and the build set (mndsite) as data; `set detect`, `set apply --dry` | each project detected right; the dry report reads true |
| 3 | `set apply` and `set check`; `presentation draft` follows the set's tour | a round on healthchecks needs fewer commands than round 5 and no hand-written YAML but the words |
| 4 | more sets, by need | a project of a new kind is modelled with its set |
