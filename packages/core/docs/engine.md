# Core

**The closed engine.** One package, no React, no DOM, no `window` — the log, the fold, the door, containment, rules, ids, references and the action set. Everything else in the monorepo depends on it, and it depends on nothing.

**The one law: only `core` may name a closed set.** Any other package enumerating sorts of things is doing the engine's job in the wrong place.

| Module | Is |
|---|---|
| model | the object graph: blocks, relations, definitions, and the block modules that interpret them |
| schema | the data contract, and what the door enforces on the way in |
| workspace | the root, the one log, and definition resolution by id |
| actions | the closed action set: scope, arguments, `check`, and the mutations each writes |
| rules | the one constraint and four rules, asked rather than enforced. Advice while modelling, a refusal at translation |
| ports | the entire host contract. Nothing else may assume where a project lives |

## Source layout

| File | Is |
|---|---|
| `types.ts` | every shared shape: the graph, the mutations, the steps |
| `fold.ts` | replay: a log folded into a graph over the shipped floor, defaults laid |
| `tree.ts` | layers, children, order, owners and the relations drawn in a layer |
| `holders.ts` | groups and grids: membership, cells, merges, headers, allocation |
| `defs.ts` | definitions: chains, kinds, defaults, and what an element resolves through — a relation's module included |
| `names.ts` | what elements are called: names, handles, labels, roles |
| `door.ts` · `file.ts` | the one way in, and the envelope |
| `components.ts` · `rules.ts` | what a definition configures, and the advice it gives |
| `session.ts` | the log, undo, batches, grafts, and the ports bound |
| `actions/` | the action set, one file per subject, registered on import |

**Placement and routing are not here** — they are layout, which depends on core and is equally headless. Splitting them keeps the fold free of geometry and lets either be tested without the other.

## The log

- **One log, at the workspace.** One document, one history, so **nothing routes** and no action can write to the wrong place.
- Every change is one step holding one or more mutations; the graph is folded from the applied ones in order.
- **Undo flips the last applied step and refolds**; redo re-applies. **No mutation needs an inverse.** Undo is workspace-wide, which is what a single document means.
- **Undo restores the graph, never the context.** Where you are looking is the user's.
- **One gesture is one step**, however many things it changed.
- **Successive placements of the same thing are one step** — nudging a card writes one `place`, replaced as the run goes on.
- **Capped.** Past the cap the oldest steps fold into a single **checkpoint** holding the whole graph. The graph is unchanged; what is lost is reach. A checkpoint is not something anybody did, so it cannot be undone.
- **The log is internal, and it is a workspace concern.** It exists so undo can be a refold, and it goes no further — no step and no mutation is ever offered outside. What leaves is state, which is the seam `kit` keeps.

## The door

- **Every log comes in through one door**, from storage or a file, and is checked before it is folded. What can be repaired is repaired; what cannot is dropped rather than folded into a broken graph.
- **A repair is a step**, written like any other work — so it is visible, undoable, and never made twice.
- **The user is told once**, and a clean log says nothing. **A normalisation that carried nothing is not a repair**: a false alarm is what teaches people to ignore the real ones.
- **A module the build does not know falls back to the base block, and says so.** Falling back silently is the one thing to avoid.
- **The door checks; it never migrates.** It keeps integrity, component validation, one default per kind, and a definition extending nothing pointed at its base. A schema change re-saves the samples rather than adding a repair.

## Files

**A file is state, never history.** What travels is what the model *is* — self-describing, and readable without replaying anything against the engine that wrote it.

- **An export is the graph, not the log** — `{ schema, id, graph, meta }`, pretty-printed JSON. Its size follows the model rather than how long somebody worked.
- **Any subtree exports**, and the workspace export is simply the root folder's. One path, no special case, and no type had to exist for it.
- **A subtree travels with its dependencies** — the definitions anything in it names, and their `extends` chains. That closure is what makes it open somewhere else.
- **A reference out of the subtree is kept, not tidied away**, and reads *missing* where it lands. Same rule as a deleted target, so importing needs no second answer. A relationship with one end outside is dropped, exactly as moving a block drops what does not travel.
- **Importing one is a checkpoint**, so there is no second format and no second reader.
- **Importing replaces the session and is saved from then on** — a file is a snapshot, the session is the working copy.
- **Grafting is not importing**: a file's definitions and elements come into a layer as one step, and **the workspace wins** — nothing it holds is replaced, its defaults stand for the file's, and incoming elements take its next handles.
- **The base is what cannot be ignored**; everything else is `meta`, free-form and safely ignorable. The test is whether dropping a field changes what the model *is*.
- **Nothing still at its default is written** — a file the size of the choices in it. **Only touched definitions travel**: never the shipped floor, never a default nobody edited.
- **Major schema must match; a higher minor is readable.**
- **Exporting changes nothing**, so re-exporting an unchanged subtree is byte-identical — which is what the canonical layout is for.
- **Laid out for reading**: definitions first, then blocks, then relationships, each flat and sorted by id so a rename is one line. A block writes its `parent`.
- **Ids say what they point at** — `block_`, `edge_`, `def_`, `rel_`, `step_`. **Minted, never derived from a name**; a default is `def_default_<kind>` or `rel_default_<kind>`, and is still read by its marker rather than its id.
- **A log is not a file.** The reader takes envelopes only, so nothing can hand the engine a history it did not write itself.
- **Session state stays out**, `meta` included: opening somebody's file must not rearrange your toggles.

**Two readers, and only one is offered outward.** `read` gives the log a session works in; `open` gives the graph, and is what anything outside this repo gets.
