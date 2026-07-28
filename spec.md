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
| Language model | **None.** MiniLM sentence embeddings route; typed text is taken literally as a name or as content. |
| Persistence | **localStorage autosave**, plus explicit export/import of the step log. |
| Groups | **Not a type at all.** Everything is a node; a group is simply a node with one or more children, so there is no such thing as an empty one. |
| Template lifetime | **Fixed at the first answer**, switchable by hand. Scoring stays visible throughout. |

## Workflows

An answer to `add` may be a comma-separated list, which adds every name in one
step — and skips any that a sibling already has. One undo takes the lot back.

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

**Terminal.** Aligned left with no frame of its own, under the header's rule.
Past exchanges rise and fade off the upper edge rather than scrolling in a box;
the live line stays pinned at the foot, block cursor at its head. Only answered
questions appear — hand edits are the action log's business.

**Options.** Clustered at the bottom right of the top row, just above the
canvas, tiled in the same treemap shape a group uses for its contents. They
materialise out of blur the way the prompt types itself in, and the likeliest
reading of what is typed is marked as the default. A spinner above marks the
moment the set changes.

**Explorer.** Titled, with its actions as icons in the top row. Mimics a VS
Code file tree — indentation rather than drawn connectors. Any number of groups
may be expanded at once, by the arrow beside each; whichever layer the canvas
is on stays expanded regardless.

**Relations.** Under the explorer: the kinds of relation the project uses,
seeded from the domain and editable. Each shows how many edges carry it, so the
list doubles as a census — a kind used once is probably a typo, one used nowhere
is a suggestion nobody took. Renaming a kind renames every edge using it;
dropping one leaves those edges in place, unnamed.

**Canvas.** Opening a group draws it as a faint labelled frame behind its
contents — its own background, a shade off the page, with the group's name
set large in the corner — so a layer reads as somewhere you have stepped into
rather than a replaced screen. Whatever the last action changed is tinted from
within, both nodes and relations; selection is a ring, so the two can never be
confused. Groups render as semi-transparent, dotted containers holding a
treemap grid of their contents; a child that is itself a group shows its own
contents in miniature, so nesting is legible at every level without opening
anything. Each child chip's fill follows how closely it relates to its parent.
Labels appear wherever a cell has room for them.

The frame leaves a margin on every side, which is where interface blocks on its
edge will live.

Navigating centres and zooms on the selection rather than cutting to it, and
the view refits whenever the layer gains or loses something, however it
happened. Layout wraps into rows so no corner carries everything.

**Navigation.** Selecting shows a thing among its *siblings* — the layer it
lives in, not the layer it contains — so a glance never costs you your place.
Going into something is a deliberate second gesture: double-click it on the
canvas, and only if it holds anything. In the explorer, double-click renames
and the arrow expands in place; any number of layers may be expanded at once.

**Canvas gestures.** Drag to position — live, not on release. Drop one card on
another to put it inside, with the target outlined while hovering; the target
becomes a group in the same step. Drag a chip out of a group's treemap onto the
canvas to lift that object back out. Double-click empty space to create, or a
card's name to rename it.

Four anchors on a plain node — one per side — and six on one with contents, the
extra pair along the top and bottom. Each is both a source and a target, and a
relation remembers the two it was drawn between rather than snapping to a
default pair.

A chip inside a group carries its own anchor, so a relation can reach something
nested. Such a relation attaches to whichever ancestor is in view and names what
it actually reaches — `informs ↳ core` — in its own colour, rather than being
invisible until you go in or an unexplained dashed line.

Relations are directed, with an arrowhead. Double-clicking one opens its name,
offers the project's relation kinds, and can turn it around or remove it. Drag a link from a card's anchor into empty space to
create the far end and attach it. Double-click a relation to name it, `Delete`
to remove.

Dragging a card so its middle passes the frame's edge moves it up a layer, into
whatever contains the one it was in.

**Selecting and moving.** Dragging on empty canvas draws a selection box;
anything it touches comes with it, and dragging a selection moves all of it as
one action. The canvas pans with the middle button or the wheel — never with a
left drag, which is what made reaching for a link so easy to get wrong.

Panning is bounded to the layer's contents plus room on every side to put
something new, and the bound grows with the layer.

**Arrangements**, top right of the canvas: `grid` wraps into rows, `row` and
`column` lay everything on one line, and `flow` ranks by the relations so a
chain reads left to right. Beside them, a toggle between curved and
right-angled routing — a view preference, kept out of the step log.

Relations are selectable, nameable by double-click, and removed with `Delete` or
`Backspace` — as are nodes.

**Properties.** A column in the foot, between the action log and the match
scoring, so inspecting something costs no canvas. Shows the selected object's
text, its type, and whether it is a group — all editable.

**Foot.** Three equal columns: the action log with undo and redo, the live
match scoring, and the selection's context. The log records what each step did,
not how many mutations it took.

## Status

Built: the serverless port, the loop, groups and layer navigation, the
suggestion cluster, match scoring, direct editing of graph and tree,
localStorage persistence with export/import, and MiniLM embeddings running
locally over ONNX — weights and wasm runtime both committed under
`web/public/`, so a clone runs with no setup beyond `npm install`.

Matching measures 10/10 on the routing cases in `entry.yaml`'s tag set. The
treemap's affinity shading now works: `Invoices` scores 0.575 against `Billing`
where character trigrams scored 0.00.

Outstanding:

- Switching template by hand once the project is under way.
- Keyboard selection of the marked suggestion; it is shown as the default but
  Enter still submits what is typed.
- Renaming from the canvas.
- Diagram types beyond the object graph: flow, class, swimlane, activity.
