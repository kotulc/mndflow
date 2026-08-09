# mndflow

A nested graph editor that asks you questions, running entirely in your
browser.

mndflow composes grouped React Flow graphs from a conversation. You answer
prompts; it builds a graph of objects from your answers, and shows you the
graph as you go. Everything it builds stays editable by hand — the workflow
suggests, it never constrains.

There is **no backend and no language model**. Sentence embeddings run in your
browser over ONNX to route what you type to the right template and the right
suggestions — everything is local, and a turn is instant.

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

Three tracked documents, kept in step with the code:

- [spec.md](spec.md) — what each part does, component by component. Short, scannable.
- [design.md](design.md) — why it is that way, and what each rule was chosen over.
- [tasks.md](tasks.md) — what is missing, and what is still undecided.

---

## Getting started

**Prerequisites:** Node 18+, and [Git LFS](https://git-lfs.com) — which ships
with Git for Windows and most Git installs.

```sh
npm install && npm run dev
```

The embedding model and the ONNX runtime live under
[`public/`](public), stored in Git LFS: about 60MB of `.onnx` and
`.wasm` that a normal clone fetches for you. Nothing is downloaded at run time,
so the app works offline and on first load.

If the header reads **model not fetched**, the clone came down without LFS —
`git lfs install && git lfs pull` fixes it.

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
| Canvas | Drag to position; **drop one card on another to put it inside** — the target becomes a group; double-click empty space to make something; drag a link into empty space to make and attach something; double-click a relation to name it; `Delete` to remove |
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

[`terminal/router.ts`](src/terminal/router.ts) picks the next question from the
graph itself: what the selected object is missing, in the domain's preferred
order. An operation steps aside only once it has filled the last **two** turns,
so the conversation builds for a while and then steps back to connect what it
built — rather than repeating itself or alternating every turn.

---

## Development

```sh
npm run dev            # http://localhost:5173
npm run build          # tsc, then a production bundle
npm test               # the suite, in under a second
npx tsc --noEmit       # typecheck alone
```

Workflow YAML is compiled in at build time by `@rollup/plugin-yaml`, so nothing
parses it at runtime and a malformed file fails the build.

**The step log is the source of truth.** A graph is only ever derived by
folding applied mutations in order, so undo needs no inverse operations — it
flips a status and the graph is rebuilt by the same code that built it. An
object *is* a document: its text lives on the node, and the explorer tree is
the node hierarchy.

`src` is organised by what a thing is *for*, in the words the design documents
already use. **Dependencies run one way**, and a folder that reaches upward is a
design problem you can see rather than one you have to trace.

| Folder | Is | Depends on |
|---|---|---|
| [`graph/`](src/graph) | the project: log, fold, schema, files | nothing |
| [`embed/`](src/embed) | MiniLM over ONNX, and scoring text against it | nothing |
| [`geometry/`](src/geometry) | sizing, placement and routing, derived from the graph | `graph` |
| [`canvas/`](src/canvas) | the diagram module — the drawing half | `graph`, `geometry`, `embed` |
| [`page/`](src/page) | the shell a module sits in | `graph`, `canvas`, `terminal` |
| [`terminal/`](src/terminal) | the optional way to give input | `graph`, `geometry`, `embed` |
| [`project.ts`](src/project.ts) | the seam: state, and every action | `graph`, `terminal` |

| Module | Purpose |
|---|---|
| [`graph/types.ts`](src/graph/types.ts) | Every shared shape: graph, mutations, steps, definitions |
| [`graph/fold.ts`](src/graph/fold.ts) | Mutation replay, hierarchy walking, derived accessors |
| [`graph/check.ts`](src/graph/check.ts) | The one door a log comes in through |
| [`graph/file.ts`](src/graph/file.ts) | The envelope, the canonical layout, the state hash |
| [`graph/store.ts`](src/graph/store.ts) | localStorage, and handing a file to the user |
| [`geometry/layout.ts`](src/geometry/layout.ts) | Card sizing, treemap tiling, layer placement |
| [`geometry/route.ts`](src/geometry/route.ts) | Where a line goes, and the lanes it shares |
| [`canvas/card.tsx`](src/canvas/card.tsx) | The pieces every drawn thing is built from |
| [`terminal/router.ts`](src/terminal/router.ts) | Picks the question from the graph and the selection |
| [`terminal/turn.ts`](src/terminal/turn.ts) | What one answer does — pure, no state |
| [`terminal/workflows.ts`](src/terminal/workflows.ts) | Loads the catalogue, operations and vocabularies |

`turn.ts` is deliberately pure: given a graph and an answer it returns the
mutations and whatever is still unresolved, touching no state of its own.

**One known violation, left visible.** `project.ts` imports the terminal, where
the design says the dependency runs one way and nothing imports it. Publishing
the action surface as data is what fixes it — see tasks.md.

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

**Tune the matching.** Free text is scored against each of a template's `tags`
separately, best one winning. A tag should be a **short phrase naming something
somebody might be making** — two to six words. Single keywords are too
ambiguous (`shop` pulled "a bike shop" to *website*), and long descriptions
average into vagueness: scoring one joined sentence per template measured 3/9
against 5/9 for separate phrases. The Matching column exists to make this
visible while you tune it.

### Not yet built

- Real embeddings; today's scoring is character trigrams. This matters most for
  the group treemap, whose chip shading is meant to show how well each child
  fits its parent — trigrams score `Invoices` against `Billing` at zero, so that
  shading is close to meaningless until it is swapped. This matters most
  for the group treemap, whose chip shading is meant to show how well each
  child fits its parent — trigrams score `Invoices` against `Billing` at zero,
  so the shading is close to meaningless until this is swapped
- Switching template by hand once a project is under way
- Relations crossing a layer boundary, shown on the containing group
- Renaming from the canvas
- Multiple projects in one browser; export/import covers moving between them
- Diagram types beyond the object graph: flow, class, swimlane, activity
