# mndflow

A generative system design and modelling interface, built on React Flow and a
small local LLM.

mndflow is a **question machine**. You answer prompts; it builds a graph of
documents from your answers, and shows you the graph as you go. The chat pane
asks, the tree on the left holds the documents, the canvas on the right shows
how they relate, and the log at the foot records every change with one undo
behind it.

Nothing leaves your machine. The model runs locally, and a session lives only
as long as the server does.

```
┌───────────────────────────────────────────────┐
│  What are the main parts of this system?      │  chat: one question at a time
│  > ________________   [chip] [chip] [chip]    │
├──────────────┬────────────────────────────────┤
│ Ledger/      │                                │
│ ├── Auth     │        ( Auth ) ──▶ ( Billing ) │  canvas: the graph, editable
│ └── Billing  │                                │
│              ├────────────────────────────────┤
│  tree:       │  # Auth                        │  document: the selected node's
│  documents   │  Issues and rotates tokens.    │  text, edited in place
├──────────────┴────────────────────────────────┤
│ Actions                              [ Undo ] │
└───────────────────────────────────────────────┘
```

---

## Getting started

**Prerequisites**

- Python 3.11+
- Node 18+
- A local OpenAI-compatible model server. [LM Studio](https://lmstudio.ai) with
  a small instruct model loaded is what this is developed against.

**Install and run**

```sh
pip install -e ".[dev]"
uvicorn server.main:app --reload --port 8000
```

```sh
cd web && npm install && npm run dev
```

Then open <http://localhost:5173>.

The server expects the model at `http://localhost:1234/v1`. If it is not
running, mndflow still works — every question's chips are answered without the
model, and only free text degrades to "no change". You can build a whole
project by clicking.

### Configuration

| Variable | Default |
|---|---|
| `MNDFLOW_BASE_URL` | `http://localhost:1234/v1` |
| `MNDFLOW_MODEL` | `gemma-4` |
| `MNDFLOW_API_KEY` | `not-needed` |

The web client talks to `http://localhost:8000`, and the server accepts
requests only from `http://localhost:5173`. Change both together if you move
either.

### Using it

Answer the opening question — click a domain or describe your project in your
own words, and the model routes free text to the closest domain. From there
mndflow asks about whichever document is **selected in the tree**; selecting is
how you steer the conversation.

Everything is editable by hand at any time:

| Where | What you can do |
|---|---|
| Tree | `+ new`, `rename`, `delete`; drag a document onto another to re-parent it |
| Canvas | Drag to position; drag between handles to relate; double-click a relation to name it; `Delete` to remove |
| Document pane | Edit the selected document's text; it saves when you click away |
| Log | One **Undo**, unwinding in the order things were applied |

A clicked chip never calls the model — it is already the exact text of an
option the application offered, so there is nothing to interpret. Typed text
costs one model call.

---

## Workflows

A workflow here is not a script. Three YAML files in [`workflows/`](workflows/)
describe the conversation, and none of them contains control flow.

**[`entry.yaml`](workflows/entry.yaml)** — the opening question and the domains
a first answer routes into. One greeting is chosen per session; the chips are
the catalogue.

**[`operations.yaml`](workflows/operations.yaml)** — the three things the
conversation can ask for, globally. A domain may not invent a fourth.

| Operation | Intent | Asked when |
|---|---|---|
| `describe` | `describe_module` | the selected document has no text |
| `add` | `add_module` | always — the default the loop returns to |
| `relate` | `link_modules` | two or more documents are in view to connect |

**One file per domain** — [`software`](workflows/software.yaml),
[`website`](workflows/website.yaml), [`writing`](workflows/writing.yaml),
[`research`](workflows/research.yaml), [`product`](workflows/product.yaml),
[`freeform`](workflows/freeform.yaml). Each supplies **wording only**:

```yaml
name: software

prompts:
  add_root:                                     # asked with the project selected
    prompt: What are the main parts of this system?
    hint: Name them one at a time — each becomes a module you can open up.
  add:                                          # asked with a document selected
    prompt: What is "{label}" made of?
  describe:
    prompt: What is "{label}" responsible for?
  relate_root:
    prompt: How do these parts depend on one another?
  relate:
    prompt: What does "{label}" depend on?
```

`{label}` is the selected document. The `_root` variants are used when the
project itself is selected and there is no document to name. Any prompt may
add `choices:` to offer suggested answers as chips.

A domain may declare `lead:` to name the operation it prefers to open with —
`research` leads with `relate`, because evidence points at a claim rather than
sitting inside one.

### The loop

[`server/router.py`](server/router.py) picks the next question from the graph
itself: what the selected document is missing, in the domain's preferred order.
An operation steps aside only once it has filled the last **two** turns, so the
conversation builds for a while and then steps back to connect what it built —
rather than repeating itself or alternating every turn.

When an answer names something that does not exist, the turn stops and asks
which document you meant, offering the closest existing names ranked by
trigram similarity plus the option to create it. Names are matched exactly and
never guessed at, and each unknown name is asked about separately.

---

## Development

Full architecture notes are in [DEVELOPMENT.md](DEVELOPMENT.md); the reasoning
behind the design is in [CONCEPTS.md](CONCEPTS.md).

The short version: **the step log is the source of truth.** A graph is only
ever derived by folding applied mutations in order, so undo needs no inverse
operations — it flips a status and the graph is rebuilt. A document *is* a
node: its text lives in `graph.specs[node_id]`, and the tree is the node
hierarchy. There is no file store and nothing on disk.

| Module | Purpose |
|---|---|
| [`server/models.py`](server/models.py) | Every shared shape: graph, intent, mutations, steps |
| [`server/log.py`](server/log.py) | In-memory step log |
| [`server/fold.py`](server/fold.py) | Mutation replay and touched-node highlighting |
| [`server/mutate.py`](server/mutate.py) | Intent → mutations; label resolution and ranking |
| [`server/interpret.py`](server/interpret.py) | Grammar-constrained JSON calls to the local model |
| [`server/workflows.py`](server/workflows.py) | Loads the catalogue, operations, and domain wording |
| [`server/router.py`](server/router.py) | Picks the question from the graph and the selection |
| [`server/group.py`](server/group.py) | Fan-out heuristic for abstraction |
| [`server/main.py`](server/main.py) | HTTP API; every response is the full app state |

### API

Every endpoint returns the complete app state, and takes an optional `?scope=`
naming the selected document — it is what decides which question comes back.

| Endpoint | Purpose |
|---|---|
| `GET /state` | Graph, question, history |
| `POST /turn` | Answer the active question |
| `POST /undo` | Unwind the most recent applied step |
| `POST /project/rename` | Name the project |
| `POST /nodes` · `DELETE /nodes/{id}` | Create and delete documents |
| `POST /nodes/{id}/rename` · `/move` · `/body` · `/place` | Edit one document |
| `POST /edges` · `DELETE /edges/{id}` · `POST /edges/{id}/relation` | Edit relations |
| `POST /group` · `GET /crowded` | Abstraction |

### Tests

```sh
python -m pytest
```

`tests/server/` mirrors `server/`. The `fold` and `log` tests are the
load-bearing ones — undo correctness is what every other guarantee rests on.
Nothing in the suite reaches the model.

Two constraints shape the model-facing code, both because the model is small:
one question per call, with the grammar pinned to the one operation being
asked about; and the model emits **labels, never ids**, because a small model
cannot track opaque identifiers across a conversation.

---

## Extensions

**Add a domain.** Write `workflows/<name>.yaml` with wording for each
operation, and add a chip for it to `entry.yaml`. That is the whole job —
control flow lives in `router.py`, so a domain declares what to say and never
how to sequence it. An unknown domain falls back to `freeform`.

**Add an operation.** Add it to `operations.yaml` with the `Intent` action it
produces and a `when` condition, teach `router.eligible()` the condition, and
give every domain wording for it. Deliberately more work than adding a
domain — the operation set is meant to stay small.

**Add a kind of change.** Define a mutation in `models.py`, add it to the
`Mutation` union, and handle it in `fold.apply_mutation()`. It becomes
undoable for free, because undo is a refold rather than an inverse.

### Not yet built

- Persistence of any kind — a session ends when the server stops
- Streaming output; turns are request/response today
- Wiring `group.crowded_parents()` into the turn flow to prompt for abstraction
- Multiple projects; one log, one project, per process
- Chips for switching operation directly — `operations.yaml` declares a `chip`
  per operation that nothing yet renders, so the tree selection is the only
  way to steer
- Renaming a node from the canvas, and drag-to-re-parent on the canvas
- Diagram types beyond the module graph: flow, class, swimlane, activity
