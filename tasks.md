# Tasks

The difference between what [spec.md](spec.md) describes and what the code does, plus the
questions that have not been answered yet. Reasoning for any of it lives in
[design.md](design.md).


## Status

**Frozen, pending refinement.** Built and working; left alone while the graph model settles,
and revisited deliberately rather than drifting:

- **Terminal rail** — the contextual prompt and option chips. Its role in the tool is the open
  question, not its implementation.
- **Visual style and theme** — colour, type, spacing, and the overall look.

**Built last.** The context menu. Until then, right-click performs the default action in
spec.md's table.


## Open questions

**What the export format is.** The Export rule under Interfaces says an implied interface is
not written out. Nothing does this, and it is not clear it can: the export *is* the step log,
and a log records the making of a thing rather than the thing. Filtering nodes out of it means
either rewriting steps on the way out — which breaks undo across a save — or exporting a folded
graph instead, which is a second format. This has to be settled before the sample project below
is worth authoring, because that file is the format's first real user.

**Whether `flow` survives.** An interface can be marked input, output or both, and the mark
constrains nothing — it was decorative from the start. Now that relationships put an interface
at each end automatically, most interfaces have a direction implied by the relationship they
belong to. Either `flow` is genuinely a note to the reader worth keeping, or it is a leftover
from the SysML port model that the tool never took up.

**What an attribute is made of.** The design says every attribute carries a name, a label and
tags. The code has `name`, `value` and `tags` — no label, and `value` is not mentioned in the
design at all. Two names for one field, or two fields, is the question; the answer decides what
the panel should show.

*Settled and built: what happens to a moved node's annotations and relationships, reference
chains, which layer a route belongs to, and what a note is made of — an attribute with a place,
belonging to the layer it was drawn in, sized by its text so that nothing on the canvas is
manually resized. See design.md under Relationships, References and Notes.*


## Not built yet

- **The sample project.** `samples/mndflow.json` does not exist, and the directory does not
  either. Its stated precondition — interfaces, references and groups — is now met, so it is
  unblocked and waiting on the export question above. It should describe this application —
  mndflow's own components, interfaces and data structures — exercise every feature in spec.md,
  and load from the viewer without setup.
- **`Ctrl`/`Cmd` + `A`** is in the keyboard table and is not implemented.
- **Icons.** An attribute is supposed to be able to draw an icon on the canvas as well as a
  boundary or a note. Nothing draws an icon, and no icon set has been chosen.
- **Adding a node to an existing group from the panel.** The panel removes members and cannot
  add one. The action exists (`attachAttr`) but is not wired to anything, so the only way into
  an existing group is the drag.
- **Tags.** Every attribute carries them and nothing shows or edits them.
- **Ties made from the note's side.** A note is its own name all the way through, so a right
  drag cannot set off from one — ties are drawn node-to-note only. Fine so far; if it turns out
  to read backwards in use, the note needs some part of it that is not its text to start from,
  and that is exactly the tiny target the card's border zone was removed for.
- **A note picking up what the drag enclosed.** The rectangle swept out is discarded, and it
  could instead tie the note to everything inside it. Deliberately not done: it would make the
  drag mean two things at once, and the size of a gesture is a poor way to state intent. Worth
  revisiting only if tying notes one at a time proves tedious.
- **The context menu**, still the last thing to build. Every entry above now performs its
  default action directly and correctly, so the menu is no longer covering for anything wrong —
  it is only the alternatives that are missing: direction and reversal for a relationship,
  ungroup for a group, lay-out-again and paste for the canvas, delete throughout.
- **A menu trigger.** With the right button spent entirely on direct creation, the context menu
  has no gesture left. The intended answer is that selecting an element reveals its options in
  the attribute panel, which would mean the panel is the menu and no gesture is needed at all.
  Not designed yet.


## Aspirations, not descriptions

**The layout acceptance criterion.** Layout is supposed to be good enough when, for thirty
nodes, no relationship passes through a block it does not attach to and crossings are visibly
fewer than straight routing would give. Placement avoids overlap and keeps related blocks near
each other, and does nothing whatever about crossings — there is no code aimed at that sentence.
It stands as a target; it is not a description of what happens.

**Fluid transitions between layers.** Stepping in and out animates the viewport, but the
contents of the two layers cut. The nesting-doll effect the canvas is meant to give is not what
is drawn.

**Segments under a card.** Cards are drawn above the relationship layer, so a segment passing
beneath one cannot be grabbed there. Reachable everywhere else; no decision taken on whether
lines should sit above cards for the purpose.

**The frame drifts off the grid when the window is resized.** `frameBox` is snapped, but it is
derived from the panel's aspect ratio, so a resize moves it — and the interfaces seated on it
with it. Cards are unaffected. Fixing it means a frame that does not fit the panel, which is
worse; it is recorded because it is the one place seats do not hold, not because it is a bug
with a known fix.

**Route corners are still free.** They cannot be snapped while ports carried by a segment are
free, and those cannot be seated without breaking the router's straightness guarantee. A route
laid out by hand is therefore the one thing on the canvas not on the grid. Untangling this means
teaching the router about seats, which is a change to the one part of the tool with a fuzz test
behind it, and there is no evidence yet that it matters.

**The selection box takes things it does not enclose.** Dragging a box across the canvas can
come back holding elements outside it, and the reported case involves dragging over
relationships. Not diagnosed. The leading suspect is the invisible grab band over every
relationship segment, which is wide and might be catching the drag — but that would explain a
box that fails to start, not one that over-selects, so the cause is still open.
