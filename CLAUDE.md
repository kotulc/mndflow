# mndflow

A client-only web app for assembling systems out of simple descriptive blocks.
No server: a step log lives in the tab, and the graph is folded from it.

## Where to look

Everything is in `docs/`, and each file has one job. Read the one that answers
your question, not all of them.

| | Answers | Update it when |
|---|---|---|
| [docs/plan.md](docs/plan.md) | **what to do next** — one row is one chunk, with the files it owns | a row lands |
| [docs/spec.md](docs/spec.md) | what each part *does* | behaviour changes — **every time** |
| [docs/design.md](docs/design.md) | *why* it is that way | a major decision changes. Not for anything smaller |
| [docs/tasks.md](docs/tasks.md) | what is missing, blocked or undecided | something is finished, blocked, or a question surfaces |
| [docs/actions.md](docs/actions.md) | every action, adjustment and gesture | the surface changes |
| [docs/definitions.md](docs/definitions.md) | what each word means | a term is coined or retired |

**Start at plan.md.** If your row is not in it, it is not the next thing to do —
say so rather than inventing one.

**`(planned)` in spec.md means the line is the target and not yet the
behaviour.** Never read spec.md as a description of the code without checking
the marker, and never leave one on something you just built.

## Subagents

Specialists live in [`.claude/agents/`](.claude/agents/). Cursor reads that
tree as well. **This session launches them**; each starts cold, so hand it the
facts it needs rather than making it rediscover them. The `run` skill is the
browser procedure; `validate` is who runs it.

| Agent | Asks | Runs |
|---|---|---|
| [`tasking`](.claude/agents/tasking.md) | which row, in what order, who does it | starting a sitting |
| [`implement`](.claude/agents/implement.md) | the row itself, owned files only | every row |
| [`validate`](.claude/agents/validate.md) | does it run, and can a person use it | every row |
| [`docs`](.claude/agents/docs.md) | is `docs/` still true | every row |
| [`structure-review`](.claude/agents/structure-review.md) | is it legal — style, imports, closed sets | structural diffs |
| [`necessity`](.claude/agents/necessity.md) | is it necessary — or is it too much code | structural diffs |
| [`project-state`](.claude/agents/project-state.md) | what does this term mean; built or planned | on demand |
| [`vision`](.claude/agents/vision.md) | does this still serve the aim; must Clay decide | **only when a gate trips** |

**The sequence.** `tasking` → `implement` → `validate` → `docs`. Add
`structure-review` + `necessity` between implement and validate when the diff
is structural — a new module, a seam cut, a moved boundary — and not when a row
only fills in what a seam already decided.

**`vision` is a gate, not a stage.** Call it when one of these trips, and never
out of habit: a `◆` row, work that is not a plan row, a closed set that would
grow, a frozen surface, a design decision in question, or a chunk outgrowing
its row. Ordinary queued work does not need it.

**`docs` is handed the facts.** `implement` reports what landed and what
deliberately did not; `validate` reports whether it was proven. `docs` writes
those down — it does not work them out from the diff, because a diff cannot
say what was left out on purpose.

**When `validate` comes back `not proven`**, the row goes back to `implement`
with the failure — not to `docs`. Nothing is struck through on a red verdict.

## Finishing a chunk

A plan row is done when all four are true. Report which you did.

1. `npx tsc --noEmit` and `npx vitest run` both pass.
2. **The app has been driven** — see `.claude/skills/run/SKILL.md` (or the
   `validate` subagent). Anything touching the canvas, the geometry, the door
   or the page is not done on a green suite alone.
3. spec.md says what it now does, tasks.md no longer says it is missing, and the
   plan row is struck through with a one-line note of what actually landed.
4. Anything you found that is *not* your row went into tasks.md rather than into
   your diff.

Do not commit. The user commits.

## The rules that are easy to break by accident

**Dependencies run one way**, and the map is in [README.md](README.md).
`src/graph` imports **nothing**. If the door or the fold seems to need something
from `modules/`, `canvas/` or `page/`, the dependency is upside down: have the
higher layer register with the lower one instead. `graph/check.ts`'s
`validating()` is the worked example.

**Two sets, and confusing them is the one unrecoverable mistake.**

| Closed — never add one | Open — extend by a code change, additively |
|---|---|
| element forms, relationship forms, field forms | card layouts, style sets, view modules |
| mutation ops | arrangements, routing strategies |
| the action set, the four adjustments | rule kinds, components |

A new capability adds a key under a definition's `components`, never a field
beside it. If you find yourself widening a closed set, stop and ask.

**A new component must be published in `src/modules/base.ts`.** Writing the
folder is not enough: unpublished, its validator never reaches the door, every
configuration under its key is accepted unchecked, and nothing anywhere fails.
`modules/card/` is the pattern to copy — the component, its `check`, its
resolver, and the line in `base.ts`.

**Presentation lives on the definition, never on an element.** An element
carrying its own colour was removed once already.

**Frozen, deliberately.** `src/terminal/` (stream Z) and the visual style. Do
not touch either while the graph model is settling, however tempting.

**One known dependency violation, left visible**: `project.ts` imports the
terminal. Seam S1 fixes it. Do not "fix" it another way.

## Tests

The suite is about **properties, never values** — nothing asserts a coordinate,
an id, a message or a count that tuning would change. One test file per module,
beside the module; the one lifecycle test lives in `tests/`.

**Do not write tests for a design that is still moving.** Seam chunks — a
registry, a contract, the door — get a handful of property tests when they land.
Features against an unsettled interface get none, because the suite is rewritten
every iteration and buys nothing. If unsure, assume the design is not settled
and ask.

`src/terminal`, `src/embed` and `project.ts` are deliberately uncovered; the
reasons are in tasks.md under *The suite*.

## Style

The code is terse, commented by purpose, and reads like prose. Match it.

- Comments say **why**, not what. A comment restating the line is noise.
- snake_case for functions and variables, CamelCase for types. Short names,
  1–4 words.
- ~100 columns. Blank lines between logical blocks, not inside them.
- A module opens with a `/** ... */` saying what it is for, before the imports.
- Never `import *`. Never add a dependency where a few lines will do.
- Add the **minimum** that implements the module's stated purpose. Anything
  else, however useful, belongs in tasks.md.
