# Spec

mndflow supports rapid composition of nested, grouped React Flow graphs
directly in the user's browser, using client-side embeddings to suggest and
route user actions along templated workflows. It is serverless — no backend,
which greatly simplifies the project.

## Purpose

**Primary: a nested graph editor.** The user navigates between layers of the
system graph, adds objects, relates them, edits their names and content, and
changes their type. Free-form editing is expected everywhere; the workflow
suggests, it never constrains.

**Secondary: context-based suggestion.** Chips beside the terminal populate as
the user types. They default to the standard graph operations — create a group,
add an object at the current level, relate existing objects, refine what is
there — named by whichever template is active.

## Decisions

| Question | Decision |
|---|---|
| Language model | **None.** Embeddings route; typed text is taken literally as a name or as content. |
| Persistence | **localStorage autosave**, plus explicit export/import of the step log. |
| Groups | **Explicit type, convertible.** A group is created outright, and any object can be promoted to one. |
| Template lifetime | **Fixed at the first answer**, switchable by hand. Scoring stays visible throughout. |

## Workflows

A workflow defines the prompts performed in a loop to push the user to expand
and refine the graph. Each step declares a prompt — varied randomly from a list
of options, for variety — and one or more chips.

Free-form input remains available at every step. It sets the context for the
next step, and is scored against every template so matching stays inspectable.
Templates carry `tags`: the words someone would actually use for a project of
that kind, which is what free text is matched against. Tuning this is expected
to take trial and error, so a **match scoring column** sits beside the action
log showing every template's score live.

Three operations exist globally and no template may invent a fourth:

| Operation | Asked when |
|---|---|
| `describe` | the selected object has no text |
| `add` | always — the default the loop returns to |
| `relate` | two or more objects are in view to connect |

A template supplies wording and vocabulary only. Its `terms` rename
group/object/relation into the domain's own words — Act/Character/Connection
for writing, Layer/Module/Dependency for software.

## Interface

**Terminal.** Aligned left, reading as a real session: past exchanges scroll
away above, the current question types itself out, and the block cursor sits at
the head of the line being written. The entry blends in — no border, no field,
just a caret and a line.

**Options.** A centred cluster, tiled in the same treemap shape a group uses
for its contents. A spinner above it marks the moment the set changes under the
user's typing, so options appearing and vanishing has a beat rather than
happening silently.

**Explorer.** Titled, with its actions as icons in the top row. Mimics a VS
Code file tree — indentation rather than drawn connectors — and layers collapse
automatically when the user opens a different group. Only the path from the
project down to the open group stays expanded.

**Canvas.** Groups render as semi-transparent, dotted containers holding a
treemap grid of their contents; a child that is itself a group shows its own
contents in miniature, so nesting is legible at every level without opening
anything. Each child chip's fill follows how closely it relates to its parent.
Labels appear wherever a cell has room for them.

Navigating centres and zooms on the selection rather than cutting to it, and
layout wraps into rows so no corner of the canvas carries everything.

**Canvas gestures.** Drag to position — live, not on release. Drop one card on
another to put it inside, with the target outlined while hovering; the target
becomes a group in the same step. Double-click empty space to create. Drag a
link from a card's anchor into empty space to create the far end and attach it.
Double-click a relation to name it, `Delete` to remove.

**Properties.** Selecting an object shows its text, its type, and whether it is
a group — all editable.

## Status

Built: the serverless port, the loop, groups and layer navigation, the
suggestion rail, match scoring, direct editing of graph and tree, localStorage
persistence with export/import.

Outstanding:

- **Real embeddings.** Matching runs on character trigrams behind the `score`
  seam in `core/match.ts`; swapping in a sentence-embedding model means
  replacing `vector()` and nothing else. Template routing works acceptably on
  trigrams. The treemap's affinity shading does **not** — `Invoices` scores 0.00
  against `Billing` because they share no letters, so that shading is close to
  meaningless until a real scorer is behind it. The feature is correct in shape
  and waiting on the swap.
- Switching template by hand once the project is under way.
- Relations that cross a layer boundary are hidden rather than shown on the
  containing group.
- Renaming from the canvas.
- Diagram types beyond the object graph: flow, class, swimlane, activity.
