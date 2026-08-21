# The docs translator — draft

**Story `ST.12`.** A tool that reads `docs/` as a model and writes it back. Not a
multi-agent framework: a **requirement translator**, and mndflow's first real project.

- **Why it is worth building** → *The cost, measured* below.
- **What the words mean** → *The vocabulary*. None of it is defined anywhere today.
- **What to build** → *The plan*.


## The cost, measured

Counted on `plan.md`, 2026-08-21. Not opinions about tidiness — each has cost a sitting.

| | Today | Why it hurts |
|---|---|---|
| distinct row ids | **149** | — |
| ids appearing **3+ times** in one file | **92** | a status change is an n-place edit, done by hand |
| worst case | `B.8`, **19 mentions** | nobody changes it without missing one |
| identical `Does / Owns / Waits` tables | **15** | no single list to read; a parser needs all of them |
| status glyphs | **6** (`⊘ ◆ ◐ ⚠ ✓ ✗`) | one of them (`⊘`) is derivable from `waits` |
| process terms in `definitions.md` | **0 of 87** | the glossary covers the *product*, never the *method* |

**`owns` is the weakest field and the one the scheduler depends on.** Paths are written four
ways — `src/graph/`, `graph/check.ts`, `workspace/`, `page/Files.tsx` — so `workspace/` and
`src/workspace/` do not string-match, and `B.6b` owns `src/`, which collides with every row
in the file.

**Five failures, one root.** The record is prose, so nothing can check it.

| | What happened |
|---|---|
| `C.10`, `B.3` | `owns` omitted a file the row's own *done when* named → `order-queue` found no startable row and stopped dead |
| `B.3` again | a note written for Clay — *"fix the owns first"* — was read by an agent as a hard gate |
| the `B.6` split | three new rows hand-transcribed into two tables, then every `waits: B.6` retargeted by hand |
| `C.2` → defect **34** | a row landed green while `ST.8` was unusable, because *done* was structural (*files deleted*) and never behavioural |
| the wave jump | four wave-5 rows ran during wave 1; nothing noticed, because the ordering lives in prose |


## The vocabulary

**Two of these are the same thing, one is runtime-only, one is a homonym.** Settling that is
most of the value.

| Term | Means | Verdict |
|---|---|---|
| **story** | a goal a person has — *true for a person*, not *built*. Spans rows. **Only Clay closes one, after driving it** | **keep.** The best thing in the system; it caught `ST.1`, `ST.3`, `ST.8` |
| **row** | one unit of work: small enough for a sitting, with the files it owns | **keep.** This is the atom |
| **chunk** | …a row | **retire.** Pure synonym, 8 uses |
| **stream** | a lettered family of rows (`B` block model, `C` canvas, `N` reorganising) — **and** where settled decisions and standing rules are written | **split.** The grouping is a **tag**; the decisions belong in `design.md`. One thing doing two jobs is most of why the file is 1,100 lines |
| **wave** | which phase a row runs in. Orthogonal to stream — a wave cuts across several | **keep**, as a field, not a section |
| **batch** | the rows one sitting takes together: `waits` met, `owns` disjoint, ≤3 | **keep, never author.** It is *computed*. Writing a batch down is how the plan and reality drift |
| **owns** | the files a row may edit — an exclusive lock for the length of the row | **keep**, as a real path list |
| **waits** | rows that must land first; a dependency edge | **keep** |
| **done** | what makes the row true — today split between an inline *Done when* and a separate *Proven by* table | **keep, merged.** One field |
| **holds** | *the product's* containment rule (`rules.holds`) | **never process vocabulary.** A homonym; using it for rows collides with the model |
| **defect** | a numbered problem in `tasks.md`, own id space, linked to rows by prose | **fold into rows.** A defect is a row nobody has scheduled |

**Status is five states, not six glyphs.** `⊘` means *nothing blocks it*, which is just
`waits: []` — derive it, never write it.

| State | Means |
|---|---|
| `queued` | ready or waiting; `waits` says which |
| `gated` | needs a decision before code (`◆`) |
| `landed` | done and proven |
| `short` | landed, but part of it is still work (`◐`) — the gap is named |
| `superseded` | the want stands, the mechanism named in the row does not (`⚠`) |

Stories carry their own — `open`, `parked`, `failed`, `closed` — and **only a person moves one
to `closed`**.


## The ideal workflow

**Four stages, one of which fans out.** This is what we run today; what changes is that the
queue is data, so the stages can trust it.

| Stage | Does | Concurrency |
|---|---|---|
| **order** | computes a batch: `waits` met, `owns` pairwise disjoint, no shared-shape row beside others | one |
| **implement** | lands one row in its owned files | **N in parallel** |
| **prove** | `tsc`, the suite, and a browser drive when the row touches what a suite cannot see | one, over the whole batch |
| **record** | writes what landed back onto the row | one at a time |

**Seven rules, each bought with a sitting:**

1. **One record per row, in one place.** Every table, wave list and story roll-up is a
   **generated view**. A status change is one edit, never nineteen.
2. **`owns` is checked against `done` when the row is written.** A row whose acceptance names
   a path its `owns` does not cover is *invalid* — caught at authoring, not at dispatch.
3. **`owns` is a real path list**, normalised from the repo root, overlap computed rather than
   eyeballed. `src/` as an `owns` value is rejected outright.
4. **`done` carries checks a machine can run** where one exists — a named test, a `tsc` pass, a
   driven gesture. *Files deleted* is not acceptance; *a relationship meeting an interface
   reaches the DOM* is.
5. **A story is acceptance at the human level, and only a person closes it.** Unchanged. Rows
   landing does not close a story and a green suite never does.
6. **Prose is addressed to people; fields are addressed to machines.** An agent reads fields. A
   note in a description is never a gate.
7. **The parent may repair a row mechanically** — adding a path the row's own `done` names — and
   must escalate anything that changes what the row *does*.


## The refactor

**One file of records, many generated views.** `docs/rows.yaml` holds every row and story;
`plan.md` becomes **output**.

```yaml
- id: B.6a
  kind: row
  title: note and group become base definitions
  story: ST.4
  stream: B
  wave: 1
  status: queued
  waits: [B.5]
  owns: [packages/base/, src/modules/block/, src/graph/types.ts]
  done:
    - both ship in packages/base/ and resolve through resolved()
    - check: node scripts/test-ci.mjs tests/modules/conformance.test.ts
    - drive: a note and a group still draw
  note: |
    Prose for a person. Never read as a gate.
```

| File | Becomes |
|---|---|
| `plan.md` | **generated** — the queue, the waves, the stories, in the shape we read today |
| `landed.md` | **generated** — every row with `status: landed`. No more moving rows by hand |
| `tasks.md` | **generated** for the defect list (defects become rows); keeps its open questions as prose |
| `spec.md`, `design.md`, `definitions.md`, `behaviors.md`, `actions.md` | **unchanged.** They describe the product, not the work, and they are not the problem |

**The stream headers' settled decisions move to `design.md`, where decisions already live.**
That is most of the 1,100 lines.


## The plan

**Its own project**, consuming this repo. Nothing in mndflow's queue waits on it.

| | Does | Done when |
|---|---|---|
| **X.1** | **Parse today's `docs/` into records.** All 15 tables, both id spaces, the six glyphs; emit `rows.yaml`. **Lossy is fine, silent loss is not** — anything it cannot place goes to a `leftovers` file for a person | every row and story in `plan.md` is a record, and the leftovers file is short enough to read |
| **X.2** | **Validate.** `owns` normalised and non-overlapping within a batch; `owns` covers every path `done` names; `waits` resolves; no cycles; no id twice | it fails on today's records and names each offender — `B.6b`'s `src/`, the `workspace/` prefixes, the `C.10` class of gap |
| **X.3** | **Render `plan.md` and `landed.md` from records**, in the shape we read now | a person cannot tell the generated file from the handwritten one, and `status: landed` moves a row without anybody editing two files |
| **X.4** | **The batch query.** Given records, return the next batch under the four rules — `order-queue`'s whole job, done by a program instead of by reading prose | it returns `B.5`'s remainder today, and refuses to return `B.6b` beside anything |
| **X.5** | **Write-back.** `set status`, `add row`, `split row` as operations — a split mints ids, carries `owns` and `waits`, and retargets dependents in one step | the `B.6` split is one command, not two tables edited by hand |
| **X.6** | **Import the records as an mndflow project** — story and row as base-package definitions, `waits` as a relationship, `owns` and `status` as fields, stream as a folder | the plan opens on the canvas, `waits` draws, and a table view lists what is queued |
| **X.7** | **Export back to `docs/`** — the round trip. `X.3` renders; this proves nothing was lost going through the graph | records → project → records is identity |

**`X.6` is the point.** Everything before it is a YAML tool. `X.6` is **mndflow's first real
project**: a live model with 149 blocks, a real dependency graph, cross-cutting views, and a
person who needs it to work. It exercises `ST.4`'s block model, `B.21`'s views-holding-views and
`ST.6`'s translation on data we actually care about — which no synthetic test does.

**Order**: `X.1` → `X.2` → `X.3` → `X.4` → `X.5`, then `X.6` → `X.7`. `X.1`–`X.3` are worth
having alone; stopping there still removes the n-place edit.

**Two things to decide before `X.1`:**

| | Question |
|---|---|
| **X-a** | Do defects fold into rows now, or stay a second id space until `X.5`? Folding is cleaner and touches `tasks.md`, which is 2,900 lines |
| **X-b** | Is the record file the source of truth from day one — `plan.md` generated and never hand-edited — or do both run in parallel for a while? **Parallel means they drift**, which is the problem this exists to remove |
