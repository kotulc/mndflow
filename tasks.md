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

**A member moved to another layer.** Moving a node to another scope is supposed to drop it from
its groups. It does not: it stays a holder, and the boundary simply stops drawing it, because a
boundary only gathers members sitting in the layer being drawn. So a group can hold a member
nobody can see. Either moving out should detach, or a group should be understood to span layers
and the spec should say what that draws.

**Reference chains.** A reference can point at a reference; the code follows up to eight hops
and gives up. A reference whose target is deleted is dropped. Neither is written down, and
neither has been thought about deliberately.

**Where a route belongs.** A relationship carries its corners on itself, in canvas coordinates,
and a relationship can be drawn in more than one layer — once directly, and again wherever a
reference stands in for one of its ends. The two layers place their nodes independently, so one
set of corners cannot be right in both: route a line in one layer and it is routed, through the
same points, in the other, where those points mean nothing. Either a route belongs to the layer
that laid it out rather than to the relationship, or a relationship drawn through a reference is
understood to route itself and ignore one. Untouched, because the case has not come up in
practice yet — but it is a second appearance of the reference problem, and it will.


## Not built yet

- **The sample project.** `samples/mndflow.json` does not exist, and the directory does not
  either. Its stated precondition — interfaces, references and groups — is now met, so it is
  unblocked and waiting on the export question above. It should describe this application —
  mndflow's own components, interfaces and data structures — exercise every feature in spec.md,
  and load from the viewer without setup.
- **`Ctrl`/`Cmd` + `A`** is in the keyboard table and is not implemented.
- **Annotations other than group boundaries.** An attribute is supposed to be able to draw a
  label or an icon on the canvas. Only the boundary draws; an attribute is otherwise panel-only.
- **Adding a node to an existing group from the panel.** The panel removes members and cannot
  add one. The action exists (`attachAttr`) but is not wired to anything, so the only way into
  an existing group is the drag.
- **Tags.** Every attribute carries them and nothing shows or edits them.
- **The context menu**, still the last thing to build, and now with several entries that have no
  default action standing in for it:
  - a group boundary and a relationship both fall through to "new object", which is wrong — and
    more visible now that both light up under the pointer;
  - an existing interface falls through to "new interface" and stacks a second one on the same
    spot, which is wrong the same way: the port highlights, so the button looks as though it is
    about to act on the port it is over;
  - a name does nothing at all, deliberately, and wants "rename" when there is a menu for it.


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
