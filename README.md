# mndflow

A nested graph editor that asks you questions, running entirely in your
browser.

mndflow composes grouped React Flow graphs from a conversation. You answer
prompts; it builds a graph of objects from your answers, and shows you the
graph as you go. Everything it builds stays editable by hand — the workflow
suggests, it never constrains.

There is **no backend and no language model**. Client-side scoring routes what
you type to the right template and the right suggestions, so a turn is instant
and works offline.

```
┌─────────────────────────────────────────────┬──────────────┐
│ What are the main parts of this system?     │ [ Module:  ] │  terminal, and the
│ > rate limit_                               │ [ Layer:   ] │  suggestion rail
├──────────────┬──────────────────────────────┴──────────────┤
│ Ledger/      │  project / Edge          ↑                  │
│ ▾ Edge/      │      ┌╌╌╌╌╌╌╌╌┐                             │  canvas: one layer,
│   ├─ Auth    │      ┆ Edge   ┆ ──▶ ( Billing )             │  groups are dotted
│   └─ Rate…   │      ┆ ▪ ▪    ┆                             │
│ · Billing    ├─────────────────────────────────────────────┤
│              │  # Auth            [Module]  [object]       │  properties
│  explorer    │  Issues and rotates tokens.                 │
├──────────────┴──────────────────────────┬──────────────────┤
│ Actions                        [ Undo ] │ Matching         │  history, and live
└─────────────────────────────────────────┴──────────────────┘  match scoring
```

The tracked specification is [tasks.md](tasks.md).

---

## Getting started

**Prerequisites:** Node 18+. That is all — there is nothing to install
server-side and no model to download.

```sh
cd web && npm install && npm run dev
```

Then open <http://localhost:5173>.

### Using it

Answer the opening question — click a domain, or describe your project in your
own words and it is scored against every template. From there mndflow asks
about whichever object is **selected**, and selecting is how you steer.

Nothing is interpreted by a model, so answers are taken at face value: what you
type is the name of the thing, or its text, or the far end of a relation,
depending on what was asked. A name that matches nothing existing stops and
asks rather than guessing.

| Where | What you can do |
|---|---|
| Terminal | Answer; or type and pick an operation from the rail beside it |
| Explorer | New object or group, rename, delete; drag to re-parent; click a group to open it |
| Canvas | Drag to position; drag between handles to relate; double-click a relation to name it; `Delete` to remove; click a group to open it |
| Properties | Edit the selected object's text and type, or turn it into a group |
| Actions | One **Undo**, unwinding in the order things were applied |
| Matching | Every template's score against what you are typing, live |

Work is saved to `localStorage` as you go, and **export** writes the whole
history to a file that **import** reads back.

---

## Workflows

A workflow is not a script. Three kinds of file in [`workflows/`](workflows/)
describe the conversation, and none contains control flow.

**[`entry.yaml`](workflows/entry.yaml)** — the opening question and the domains
a first answer routes into. Each carries `tags`: the words someone would
actually use for a project of that kind, which is what free text is scored
against.

**[`operations.yaml`](workflows/operations.yaml)** — the three things the
conversation can ask for, globally. No domain may invent a fourth.

| Operation | Asked when |
|---|---|
| `describe` | the selected object has no text |
| `add` | always — the default the loop returns to |
| `relate` | two or more objects are in view to connect |

**One file per domain** — [`software`](workflows/software.yaml),
[`website`](workflows/website.yaml), [`writing`](workflows/writing.yaml),
[`research`](workflows/research.yaml), [`product`](workflows/product.yaml),
[`freeform`](workflows/freeform.yaml). Each supplies wording and vocabulary:

```yaml
name: software

terms:                                 # what this domain calls things
  group: Layer
  node: Module
  relation: Dependency

prompts:
  add_root:                            # asked with the project selected
    prompt: What are the main parts of this system?
    hint: Name them one at a time.
  add:                                 # asked with an object selected
    prompt: What is "{label}" made of?
  describe:
    prompt: What is "{label}" responsible for?
  relate_root:
    prompt: How do these parts depend on one another?
  relate:
    prompt: What does "{label}" depend on?
```

`{label}` is the selected object. `_root` variants are used when the project
itself is selected and there is no object to name. `prompt` may be a list, one
of which is chosen per asking. Any prompt may add `choices:` for chips.

`terms` is what the suggestion rail uses — typing `rate limit` inside a
software project offers **Module: rate limit** and **Layer: rate limit**, and
inside a novel offers **Character** and **Act**.

A domain may declare `lead:` to name the operation it prefers to open with.
`research` leads with `relate`, because evidence points at a claim rather than
sitting inside one.

### The loop

[`core/router.ts`](web/src/core/router.ts) picks the next question from the
graph itself: what the selected object is missing, in the domain's preferred
order. An operation steps aside only once it has filled the last **two** turns,
so the conversation builds for a while and then steps back to connect what it
built — rather than repeating itself or alternating every turn.

---

## Development

```sh
cd web
npm run dev            # http://localhost:5173
npm run build          # tsc, then a production bundle
npx tsc --noEmit       # typecheck alone
```

Workflow YAML is compiled in at build time by `@rollup/plugin-yaml`, so nothing
parses it at runtime and a malformed file fails the build.

**The step log is the source of truth.** A graph is only ever derived by
folding applied mutations in order, so undo needs no inverse operations — it
flips a status and the graph is rebuilt by the same code that built it. An
object *is* a document: its text lives on the node, and the explorer tree is
the node hierarchy.

| Module | Purpose |
|---|---|
| [`core/types.ts`](web/src/core/types.ts) | Every shared shape: graph, mutations, steps |
| [`core/fold.ts`](web/src/core/fold.ts) | Mutation replay, hierarchy walking, highlighting |
| [`core/match.ts`](web/src/core/match.ts) | Scoring text against known options |
| [`core/workflows.ts`](web/src/core/workflows.ts) | Loads the catalogue, operations, and domains |
| [`core/router.ts`](web/src/core/router.ts) | Picks the question from the graph and the selection |
| [`core/turn.ts`](web/src/core/turn.ts) | What one answer does — pure, no state |
| [`core/suggest.ts`](web/src/core/suggest.ts) | What the chips offer as you type |
| [`core/store.ts`](web/src/core/store.ts) | localStorage, export, import |
| [`core/project.ts`](web/src/core/project.ts) | The `useProject` hook wiring it to React |

`turn.ts` is deliberately pure: given a graph and an answer it returns the
mutations and whatever is still unresolved, touching no state of its own.

---

## Extensions

**Add a domain.** Write `workflows/<name>.yaml` with `terms` and wording for
each operation, and add a chip and `tags` for it to `entry.yaml`. That is the
whole job — control flow lives in `router.ts`, so a domain declares what to say
and never how to sequence it. An unknown domain falls back to `freeform`.

**Add an operation.** Add it to `operations.yaml` with a `when` condition,
teach `router.eligible()` the condition, handle it in `turn.answer()`, and give
every domain wording for it. Deliberately more work than adding a domain — the
operation set is meant to stay small.

**Add a kind of change.** Add a variant to the `Mutation` union in `types.ts`
and handle it in `fold.apply()`. It becomes undoable for free, because undo is
a refold rather than an inverse.

**Swap in real embeddings.** Matching runs on character trigrams behind the
`score` seam in `core/match.ts` — no dependency, no download, instant. Moving to
a sentence-embedding model means replacing `vector()` and nothing else. The
match scoring column exists to make that change measurable.

### Not yet built

- Real embeddings; today's scoring is character trigrams
- Switching template by hand once a project is under way
- Relations crossing a layer boundary, shown on the containing group
- Renaming from the canvas, and drag-to-re-parent on the canvas
- Multiple projects in one browser; export/import covers moving between them
- Diagram types beyond the object graph: flow, class, swimlane, activity
