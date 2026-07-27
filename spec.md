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

**Terminal.** The retro chat stays as it is, except the text entry blends into
the terminal — no border, no field, just a caret and a line. Chips appear to
the right of the terminal and change as the user types.

**Object explorer.** Mimics a VS Code file tree, with layers collapsing
automatically when the user opens a different group. Only the path from the
project down to the open group stays expanded.

**Canvas.** Groups render as semi-transparent nodes with dotted outlines and
small glyphs for their contents. Clicking a group opens it: its contents take
over the canvas, with a breadcrumb back up. Selecting on the canvas selects in
the explorer and vice versa.

**Properties.** Selecting an object shows its text, its type, and whether it is
a group — all editable.

## Status

Built: the serverless port, the loop, groups and layer navigation, the
suggestion rail, match scoring, direct editing of graph and tree, localStorage
persistence with export/import.

Outstanding:

- **Real embeddings.** Matching runs on character trigrams behind the `score`
  seam in `core/match.ts`; swapping in a sentence-embedding model means
  replacing `vector()` and nothing else.
- Switching template by hand once the project is under way.
- Relations that cross a layer boundary are hidden rather than shown on the
  containing group.
- Renaming from the canvas, and drag-to-re-parent on the canvas.
- Diagram types beyond the object graph: flow, class, swimlane, activity.
