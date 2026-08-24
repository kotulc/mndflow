# Stories

**A story is a goal somebody has,** It says what has to be *true for a person* before any of it counts. One story spans a lot of building.

**A story is finished only when it has been driven.** Work landing makes a story *closer*, never
done. **A green suite never closes one** — every real defect this project has had came from driving
the built app, not from the suite. Twice, every piece of a story was built and the story still did
not work.


---

## The primary story

### ST.4 — One block, and everything else is data

Make a folder, a view, a note, a script and a behavior **without the app ever asking which *sort* of
thing you mean** — because there are no sorts. Drag blocks from three projects into a view, pin it,
and come back to it.

**Everything else waits behind this one.** It is the model, and every other story is written against
it.

---

## Reorganising and reading

### ST.1 — Reorganising is easy

Move a block anywhere it could sensibly go — into another branch of the same project, into a
different project, or out to the workspace — and **see where it is going to land while dragging**.

**Driven and failed once. What it actually demands, learned the hard way:**

- A **project root** can be moved, not only the blocks inside one.
- A block promoted to the workspace **can come back**.
- A move **redraws immediately** — not when you next click something else.
- A block dropped into a folder **appears there**, without the folder needing to be opened first.

### ST.3 — Nothing is unreachable, and nothing is unreadable

Every kind of thing the app can hold can be **made from the app**, and **told apart once it is
there**.

**Driven and failed once**, and it grew in the failing: *reachable* is not enough if the result is
unreadable. A behavior could not be told from a structure — no mark distinguished them — and
right-clicking empty explorer space offered no choice of what to make.

### ST.2 — A saved view is worth saving

Pick a cross-section of several projects, **keep it, name it, come back to it**, and read it as a
requirements table or an allocation matrix.

### ST.9 — Each surface has one job

The tray inspects, the stage draws, the explorer files, the terminal says. **No two of them show
the same thing twice, and no one of them quietly does another's work.**

---

## Interaction

### ST.8 — Interaction is consistent, and the app always answers back

Every part you can adjust by hand — a card, a frame edge, a block anchor, an interface — **targets
the same way, lights the same way, and moves smoothly**. Nothing is aim-and-hope, and no two
surfaces teach different gestures for the same act.

**The goal is consistency, not the features.** Work that lands its feature while inventing a fifth
way to show a drop target has missed the point.

**Driven and failed once**: a card dragged away left its relation lines behind, the tree did not
redraw until focus changed, and an anchor was 12×12 and near-impossible to hit.

### ST.10 — A context menu offers what makes sense here, and nothing else

Right-click a block and see the handful of things worth doing **to a block** — not every action that
technically applies.

**Wants ST.7 under it first**: narrowing a menu is only honest once help is a text route to every
action.

### ST.11 — The action surface is as small as the app needs and no larger

Things that carried machinery are gone or shrinking, and what supported them goes with them rather
than being left in place *just in case*.

**The rule, so it does not become a demolition derby**: *nothing is removed for being old; a thing
goes when the last consumer of it goes.*

---

## Reaching outward

### ST.5 — The workspace reaches outside itself

Pull a package or a resource from a **public GitHub repo** and have it land as blocks you can use —
**not as a file you then have to import by hand**.

### ST.6 — A model becomes something else

Translate a project out — **the site first**, then simulator, parametrics and code in an order
nobody has set. **One way out, and it never writes back.**

### ST.7 — The terminal earns its place

One collapsible strip that says **where you are, what you just did, and what you could do next** —
with **four commands**, flexible verbs, and **the whole action surface behind `?`**.

**Not a command palette and not a chat.**

---

## Elsewhere

### ST.12 — The plan stops being prose that agents parse

Stories, work, what a thing owns and what it waits on are a **schema**, not a document. Drafted as
translator.md, and **probably its own project** rather than anything to build here.


## Recent Decisions

## Out of scope, recorded so nothing is built on it

- **Embedded content in a resource block** — a script, an image or a video carried *inside* the
  project rather than pointed at. A resource block holds content; whether that content is inline or
  a path is the open half, and **inline means the log carries bytes**, which is a durability and
  file-size decision nobody has taken.
- **Local variation, for multi-user work.** Somewhere for a view to hold a change that never reaches
  the project it read, with an explicit promotion later. **It cannot hang off a reference** — a
  reference carries nothing but where it sits, so it would need a mechanism of its own. For one user
  it is an extra step on the commonest path, so writes go straight home instead.
- **A live store for real multi-user work.** *(A cloud drive as an export destination is not this:
  it is a place one file is sent, with no sync and no server holding the project.)* Files plus git
  give one-owner-at-a-time, which is honest but is not collaboration. Genuine concurrent editing
  wants a shared store and presence, not a merge algorithm over exported JSON. **Recorded so the
  file format is never bent toward pretending to solve it.** Team management belongs with it.
- **Two SysML losses**, accepted rather than solved: trace assertions keep their claim as a typed
  group and lose the bracket notation, and lifeline left-to-right order is presentation living in
  the view.
- **Enhanced packages as a value-add, served from a private repo or a server.** That is a hosted
component.


## The tray, the table and the vocabulary

| | Is |
|---|---|
| **the tray** | a **layer-and-selection inspector** at the foot of every view. **Two sizes, shut and open.** Keeps the hover-row-lights-the-stage tie — that is its whole reason to sit beside a drawing |
| **table** and **matrix** | **stage view modules, always full**, exactly like the canvas. They own **column choice** and **drops from the explorer**, and need **no** hover tie because there is no canvas beside them |

**The rule the rest falls out of: the tray shows the contents of whatever is in focus.** Nothing
selected is the layer, and a layer's contents *are* a table. A block shows its fields, a boundary
its members, a note its text, a relationship its ends and what it could be. **One surface, one
question, answered at whatever depth the pointer is at.**

**`full` is not a tray size.** It was the view toggle's all along: setting a layer to `table` puts
the table on the stage.

> **One thing does not fit the recursion, and it is load-bearing.** Field **values** are a block's
> contents and belong in the tray. **Definitions** — what types exist, what fields a type carries,
> adding and dropping relation kinds — are the **vocabulary**, and **nothing is in focus when you
> edit them**. A focus-driven tray must not take definition editing down with it.

**Watch**: the relationship type filter came off the canvas, and a matrix over a busy vocabulary may
want one of its own. A different surface, so not a contradiction — but it should arrive by decision
rather than by the back door.


## Updated interaction rules (model rules)

- **One lit-target look, everywhere.** The explorer tree, frame edges, anchors and the terminal's
  highlights all reuse it — **never a second treatment**.
- **Hand-adjusting anything sets the layer to `free`.** Moving a block, an anchor or an interface by
  hand is a statement that the positions are yours, so the arrangement follows the gesture rather
  than being set separately. Under any **non-free** arrangement the engine owns all three: block
  positions, anchor seats and interface seats. **One rule replacing three**, and it is what makes a
  solid anchor legible — *solid means free, and placed by you*. Placement is still retained across
  the switch, so returning to `free` returns the whole layout, anchors included.
- **An anchor exists only where a relationship actually meets the block.** The always-four-per-side
  rule is retired: it read as clutter.
- **Selecting on the stage moves the explorer with you** — picking a card sets the context and
  expands the branch to it, so the two panels never disagree about where you are. This is `reveal`
  mirrored, and should reuse it rather than growing a second path.
- **The interface is the same whatever the layer or project** — no root affordance, no second door.


## Small settled rules

- **A project row carries its block count** — `Coolant Loop (34)` — so the weight of a folded
  project reads at a glance. The **explorer's alone**; derived, never stored. **It must not count
  references**, or a view of forty things reads as a forty-block project.
- **The IBD layout law is dropped.** The view inside a child block **already is** an internal block
  diagram, so no separate law or view module is wanted. Worth revisiting only if
  connectivity-ranked placement proves worth having on its own.
- **A pattern package is a set of template blocks** to import, copy and customise, built on the base
  definitions. **Not a vocabulary package**, and not in scope for resolution. A later story.
- **One sample per view module, eventually** — not just the one. A sample proves the format and
  decides what a first project looks like.
- **One design for every panel edge and every panel label.** The explorer, terminal and tray each
  fold, and each does it differently today. **One thick edge that lights on hover, carrying an arrow
  that says which way it folds.** The options column is not one of them — fixed width, does not
  fold. **The label**: the frame writes its name *on* its own border with the ground showing
  through, and every panel takes that treatment, so a panel and a frame read as the same kind of
  thing. **Not a resize handle** — drag-to-size means a stored width per panel and a refit on every
  drag.  
  

## Migration: What was retired

Kept while the migration runs, so an old document still reads.

| Retired | Because | Now |
|---|---|---|
| **element form** (`block`/`note`/`group`/`proxy`) | nothing earned one — every case was expressible as a definition plus a `holds` rule | base definitions |
| **proxy** | did five unrelated jobs, and a sixth in the SysML map | **reference** |
| **external proxy** | not a different thing | a reference whose target is in another project |
| **`reference`, the relationship form** | derived from a proxy at an end | an ordinary relationship with a reference at one end; dashed is presentation |
| **`ref`, the value form** | collided with the reference block | **`link`** |
| **set** | mixedness was never the signal, and *set* collides with *style set* and *closed set* | **folder**, which is a definition |
| **kind** (`structure` / `behavior` as classifiers) | the engine branched on something the glossary declared absent | the definition's `view` component says which modules apply |
| **node**, **annotation**, **tie**, **membership**, **hug**, **figure** | each restated something with a second word | block; a resource or a group; a relationship; references; layout's business; gone |
