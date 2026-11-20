# Iteration plan

**The primary plan (2026-11-19).** We improve the file format, CLI and tools by having a simpler subagent translate a real Python codebase: first its structure (the library), then its use (diagrams, models, presentations). Claude inspects each round, and the findings become changes to the surface. Rounds repeat until the user and Claude are both satisfied with the resulting project. **Delete this plan when both accept the trial project as the showcase of the split** (design.md *Vision*: structure and use).


## Why

| Need | Because |
|---|---|
| **the split must hold in practice** | structure (library) and use (models) is now the fundamental split; only a full translation shows where the format, tools and views blur it |
| **an agent is the main author** | the tools are agent-first; a less capable agent following only the docs shows where they are unclear, verbose or missing |
| **every diagram kind needs a real use** | the kinds were agreed on mockups and small samples; a real codebase tests whether each one communicates |
| **a second translator** | a Python translator tests whether the tools are general or shaped around TypeScript |


## The loop

| Step | Who | Does |
|---|---|---|
| 1 | Claude | writes the round's brief: the tasks below, what changed since last round, the docs to read |
| 2 | subagent | carries out the brief in samples/trial using only the CLI, the files and the docs; never reads mndflow's source; keeps a friction log |
| 3 | Claude | inspects: `check`, `measure --views`, each diagram opened in the app against its kind's purpose (docs/diagrams), each presentation played; scores the tasks |
| 4 | Claude + user | turn the findings into surface changes (format, CLI, tool output, docs); the user agrees the bigger ones |
| 5 | Claude | builds the changes, clears samples/trial, and starts the next round |

| Rule | |
|---|---|
| **alternate models** | each brief runs on Haiku and on Sonnet; where both stumble the surface is at fault; where only Haiku does, the docs are too thin |
| **CLI and files** | the `mnd` commands and hand-written YAML/JSON; MCP is compared in a later round once the CLI settles |
| **the subagent reads only what a user would** | docs/tools, docs/diagrams, presentations.md, design.md, `mnd --help`; the samples as examples |
| **output** | samples/trial, a workspace opened in the app, cleared each round; the friction log at samples/trial/log.md |
| **no tests** | the round is the check; `check` and `measure` are the guards |


## The subject

**A Python codebase whose own concerns need every diagram kind.** It is cloned outside the repo and never vendored. Only its translation lives in samples/trial.

| Candidate | Size | Covers | Licence |
|---|---|---|---|
| **healthchecks** (Django) — recommended | small–medium, clean | entity (Check, Ping, Channel, Flip, Project); state (a check: new, up, grace, down, paused); class (one transport class per integration); sequence (ping → API → flip → alert); swimlane (web, `sendalerts` worker, `smtpd`, user); dataflow (a ping to a notification); mapping (a flip to each integration's payload); context (HTTP clients, email, ~40 integrations) | BSD-3 |
| **paperless-ngx** (Django + Celery) | medium–large, has a frontend | a document pipeline (consume, OCR, classify, match), tasks with states, mail rules mapped to actions | GPL-3 |
| **mealie** (FastAPI + SQLAlchemy) | medium | recipe scraping (dataflow, mapping), background tasks, a REST API | AGPL-3 |


## The brief

| # | Task | Half | Shows |
|---|---|---|---|
| 1 | **find the scale**: the major components, parts and data definitions, written as the library with the translator's help | structure | the library is the system at a readable scale |
| 2 | **customise definitions** to highlight a subset of components (styles, tags, faces), for example everything an alert touches | structure | a definition carries its look to every use |
| 3 | **one diagram of each kind** (context, flow, dataflow, state, sequence, swimlane, mapping, class, entity, tree), each chosen and drawn to fully communicate what its kind answers | use | each kind earns its place |
| 4 | **combine the diagrams into models** by use case: data flows, user interactions, paths, inheritance, states and behaviours; one overview, decomposed | use | perspectives become a coherent set |
| 5 | **a presentation per model** telling its use case's story | use | the walkthrough is the end product |
| 6 | **answer questions from the model alone** (for example *what happens when a check goes down?*) using only the CLI and files | both | the model can be read back, not only written |
| 7 | **change it**: rename and move a definition; translate again after a source change; models stay whole or `check` says where they drifted | both | the surface survives revision |
| 8 | **the friction log**: each command, each error, each guess, each doc looked up, what was missing | — | the input to step 4 of the loop |

Tasks 6 and 7 join from the second round on.


## Order

| # | Work | Done when |
|---|---|---|
| 1 | **pick the subject** with the user | cloned, its size measured |
| 2 | **a Python translator, least first**: the library by units, imports, classes and models, and the fact tools the brief needs, built on proven packages (Python's `ast`, `grimp` for the import graph; searched before building); its home beside apps/ts | `mnd fact` answers for the subject; the library collects and checks clean |
| 3 | **round 1** on Haiku and Sonnet | both logs read, the tasks scored, the findings tabled below |
| 4 | **the rounds**: changes, then the next round | the user and Claude accept the trial project |


## Rounds

| Round | Model | Tasks passed | Top findings | Changes made |
|---|---|---|---|---|


## Findings

| Finding | Surface | Change | Status |
|---|---|---|---|


## Open questions

| Question | Leaning |
|---|---|
| which codebase | healthchecks: smallest that still covers every kind |
| translator before round 1, or round 1 with the library hand-written | translator first, at its least: the vision has the agent find the scale *with tools*; a hand-written round would mostly test reading Python |
| which diagram kinds are structure and which are use | structure: class, entity, tree, a definition's context; use: sequence, flow, dataflow, state, swimlane, mapping, a model's context; the rounds will show |
| does the subagent see the shop and mndsite as examples | yes, as a user would; check that it does not copy their shape blindly |


## Relation to other plans

- scale-plan.md *Next* and model-plan.md orders 6–9 pause; their items are taken when a round finds them
- backlog.md *CLI* (the full pass over the file-based surface) is this plan's work, done round by round
