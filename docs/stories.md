# Stories

**A story is a goal somebody has,** It says what has to be *true for a person* before any of it counts. One story spans a lot of building.

**A story is finished only when it has been driven.** Work landing makes a story *closer*, never
done. **A green suite never closes one** — every real defect this project has had came from driving
the built app, not from the suite. Twice, every piece of a story was built and the story still did
not work.


---

## The primary story

### ST.4 — One block, and everything else is data

Make a folder, a note, a resource, a group and a grid **without the app ever asking which *sort* of
thing you mean** — because there are no sorts, only eight kinds and the definitions over them. Style
one block until it reads the way you want, save that as a definition, pin it, and make the next one
from the pinned folder.

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

**On hold, and the machinery is gone.** The `view` block module and the table and matrix view
modules came out when the grid absorbed them — see ST.11 — and `pin` now offers a definition rather
than keeping a layer. *View* is reserved, not retired: it comes back naming a data perspective over
the model, and this story comes back with it.

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

### ST.13 — A definition is made by pointing at something that already reads right

Style one element until it reads the way you want, **save that as a definition**, and every usage after it names the definition rather than restating the look. A stereotype library made by pointing, rather than by writing a definition first and applying it after.

| | |
|---|---|
| **save** | `save_def` files the element's look and field schema as a definition extending what it followed, and moves the element onto it. **Saving never pins** |
| **pin** | an explicit act per definition. A pinned block definition is in the explorer's *pinned* folder; a pinned line definition is on the rail. Unpinned definitions live in the tray |
| **default** | every kind has one editable definition its plain elements follow. Edit it and every plain element of that kind follows; it is never renamed, removed or pinned |
| **remove** | dissolves losslessly — each usage takes back what it inherited |

**Pinning replaces the older reading of *pin a layer as a view***. There is no view block to make: what pinning offers is a definition, and what is left behind is an ordinary block naming it.

Wanted: **orientation** — portrait or landscape, which way round a card reads.

### ST.14 — A block wears a symbol, and every block is still a rectangle

A definition can give what names it a **symbol** — a small drawing set into the card, centre right, beside the name. A valve reads as a valve, a pump as a pump, a queue as a queue, and a vocabulary of them is what turns a diagram into a notation somebody already knows how to read.

**The card stays a rectangle.** The symbol is drawn *inside* it and changes nothing about its border. That is the whole point: every seat, every relationship end and every route is worked out against a rectangle, so a notation can grow as large as it likes without a single anchor moving.

**Retired to get here: `card.shape`.** It offered `rect`, `round`, `diamond`, `ellipse` and `hex`, and it was the wrong lever twice over — a diamond said *decision* only to somebody already taught it, while a non-rectangular border is a second geometry for everything that meets a card to agree with. Nothing shipped depended on it, so it is gone rather than deprecated.

Open, and worth answering before any of it is built:

| question | why it matters |
|---|---|
| **where a symbol comes from** | a named set the build ships, the way icons are; or a drawing a project supplies. The first is closed and safe, the second is what a real notation needs |
| **what it may be** | a path on a fixed grid, taking `currentColor` like every other mark — or arbitrary SVG, which is a hole through the whole style system |
| **how it sits with the mark** | a card already wears a role mark in its corner. Two drawings on one card is one too many unless each has a job somebody can name |
| **whether an element may set one** | or only a definition, which is what would keep a symbol meaning the same thing everywhere it appears |

---

### ST.15 — A relationship is customised the way a block is

A relationship carries a definition exactly as a block does — `group: "relation"`, the same `components`, the same `extends` chain — and is told about how it draws in the same place and in the same words.

**The tray is where it happens, not the explorer.** The explorer lists **block** definitions only, because it is a palette you drag from and a relationship is made by drawing between two ends, never by dropping. A relation definition is customised in the tray's settings, and **pinning a line definition puts it on the rail**, which is the shortlist a right drag draws from.

| | |
|---|---|
| **what a line says** | a name, a **label** drawn exactly as typed (a stereotype such as `<<relates>>`), tags, and a look: name, label, heads, colour, stroke |
| **renaming a line** | renames the definition it follows, or files one over the default or package it follows |
| **what a relation definition may say** | the two relation modules are closed and read from the ends — a line with a note at an end is a tie — so a subtype refines presentation and names, never which module it is. **The rail offers no *tie*** |

### ST.16 — Settings, at whatever you have hold of

**One panel, whatever you have hold of.** The tray's *settings* tab describes the one thing picked, and the rail's top group — *workspace*, *block*, *relation* — puts the same panel on the workspace, or on a blank block or relation definition. What is being settled changes; the panel does not.

**A scope is arrived at, never picked.** Each rail toggle puts the tray on the thing itself; which tabs exist follows from what is held. A later selection wins without anything having to arbitrate. The element scope needs no control at all: selecting something is how you arrive at it.

| scope | what it settles |
|---|---|
| **workspace** | **a block**, in the same panel as any other and with nothing extra: its name and id, its schema beside the card, and every block tab. What it draws on is the explorer's *packages* section, not a tab the root alone carries |
| **block** | a blank block definition, filed when it is named |
| **relation** | a blank relation definition, filed when it is named |
| **element** | what it is, how it draws, what it carries |

**Every scope keeps the same three slots**, and only the words change: *settings* is what this is, the second slot is what it **declares** — fields, templates — and the third is what **exists** — contents, or usages. A tab that cannot be answered is absent rather than empty.

**A vocabulary is two depths of one kind.** A **template** carries a look and is what a line is made to look like; a **stereotype** carries a name and an `extends` and is what a line is called. Nothing separates them but what they say, so four templates carry forty stereotypes and the chain resolves them. A template is simply one nothing names directly.

**The rail is a shortlist, not the vocabulary.** What a right drag draws is a few pinned templates, kept as a list on the workspace so order is sayable and a package's template can be offered without writing to something somebody else owns. Everything else is read in the tray, which is where forty of anything belongs.

**Open.** Whether a layer gets settings of its own, or keeps answering from the rail.

### ST.12 — The plan stops being prose that agents parse

Stories, work, what a thing owns and what it waits on are a **schema**, not a document. Drafted as
translator.md, and **probably its own project** rather than anything to build here.

### ST.17 — What a vocabulary asks of a usage is stated where it is read

A definition says what must be true of anything naming it — the fields a usage has to carry, what it may hold, what may sit at a relationship's ends, how many lines may meet it, which fields have to agree across one — and **all five are said in one place, in the same words, by the same gesture.**

**Pulled, and the reason is the seam.** The panel shipped reading all five and writing three: `look` sets one scalar at `key → name`, and `ends` and `degree` are nested records, so what the panel wrote was a scalar where a record was wanted — ignored by `rules_of`, then dropped by the door on the next save. A surface that can state half a vocabulary is worse than one that states none, because what it cannot say is invisible. The model side stands: the `rules` component validates all five at the door, `rules_of` resolves them down the chain, and `review` reads what survives.

| | |
|---|---|
| **what unblocks it** | `look` reaching a nested property — a dotted `name`, or a shape the fold's `set_look` and `stated` both already walk. Without that, three of five is the ceiling |
| **where it is stated** | a definition asks it of every usage; one element may state it for itself, since `looks` is already a components bag. Both, or only the definition? |
| **when it is refused** | advised while modelling, refused at translation — settled. What is unsettled is whether a violation is a mark on the card, a row in the tray, or both |
| **`holds` and the engine** | the only containment rule there is. Authoring it is the first time a user can make a layer refuse a drop, so the drop gesture has to read it |

**Wants ST.15 under it first**: `ends` is a relation definition's rule, and there is nowhere to customise a relation definition until a relationship is described the way a block is.


### ST.18 — A block holds content, so it is worth opening

Write a requirement's text, a part's description, a script's code **into the block itself** — and have it travel, export, undo and be searched like everything else the block carries. A block stops being a box with a name on it and becomes somewhere work actually lives.

**The want is utility, not annotation.** A note already says something *about* a diagram. This is different: the block **is** the requirement, and its text is the requirement's body. Anything less means the real content lives in another tool and the model points at it.

| | |
|---|---|
| **already half-built** | `Block.body` is in the schema, `set_body` folds it, `describe` writes it — and only the note reads it, with no surface offering it |
| **every block** | a requirement is a block with a description; confining bodies to `resource` forces a wrapper element around everything worth documenting |
| **a note stays a module** | and for reasons that are not about text: it is the only ordinary card that resizes, and a relationship touching one is derived as a `tie`. What changes is only that it stops being the *sole* holder of a body |
| **format is the definition's** | `Requirement` says markdown, `Script` says code. Not a new value form — the closed set stays as it is, and `body` is a slot beside `fields` |

**What it opens, and is not in scope yet:** search over content, a body rendered on the card rather than in the panel, and code with a language. Each is its own thing once the text is there at all.

**Watch for:** bodies are the first thing this project stores that is large and edited often. The browser log stores each body once by hash, beside the log, while **the graph and the file carry text rather than a content id** — so the storage choice stays reversible.

### ST.19 — A card's bottom corner says what the system knows about it

The bottom-right corner of every card is **reserved for one system mark** — something the app works out about the element rather than something a vocabulary or a user picks. The top corner says what sort of thing it is; this one says what state it is in.

**Not a style.** The old `card.mark` let a definition put any icon there, which made the corner a second, unexplained icon slot. It is gone, and nothing may set the corner by hand.

| | |
|---|---|
| **what it marks** | undecided — a rule note, a missing reference, a locked package, an unsaved working look are all candidates |
| **one mark or several** | one corner and one mark; which wins when two apply is part of the design |
| **what it answers** | whether hovering or clicking the mark says why, and where that is said |

## Future stories

**Named so nothing is built against them by accident.**

| | What waits |
|---|---|
| **Allocation** | a grid's headers already derive what is allocated to each line. A story that *reads* allocation — a matrix, a trace, a report — is what gives it a consumer |
| **Behaviour** | *the model defines itself as the user builds*. A cell address is an order and a header is an allocation; nothing reads either as behaviour yet |
| **SysML round trip** | a `tie` goes out as `comment` and comes back as a `line`. Part of ST.6 |
| **A named package is checked** | the packages tab reads what is in use; reconciling that against the catalogue |

## Recent Decisions

## Out of scope, recorded so nothing is built on it

- **Search results as a thing you look at.** Narrowing the workspace to a word and putting what matched on the stage — as a table, as a listing, anywhere. **Driven, and it was not useful**: the results were a second way of looking at blocks you can already see, and everything that supported them — the `filter` command, `matches`, the narrowing chip, the table view they presented through — cost more than they paid. Recorded rather than deleted because *finding a block by name* is a real want; what is out of scope is answering it with a view of its own. It comes back, if it does, as something the explorer does.
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


## The tray and the vocabulary

**The tray is the one place tables live.** A layer-and-selection inspector under the stage, shut or open, expanded to full height when the body has more to say. It keeps the hover-row-lights-the-stage tie — that is its whole reason to sit beside a drawing. **There are no table or matrix view modules**: the grid absorbed them on the stage, and listing is the tray's.

**The rule the rest falls out of: the tray shows whatever is in context.** Nothing picked is the open layer. One table serves contents, definitions, usages and packages, differing only in rows and columns.

**Definitions are held, not picked.** What types exist and what fields a type declares are the **vocabulary**, reached by holding a definition — from the explorer, the definitions tab, or the rail's settings — so editing one never depends on something being selected on the stage. **A folder of them is held the same way**: the explorer's sections put the tray on the whole list, narrowed to what the folder holds.


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

- **A group goes when its last member leaves.** Leaving, being deleted or moving to another layer all count, and a group emptied that way takes an emptied holder with it. **A group is empty only when it was made empty** — a group definition dropped on empty ground is room for what goes in.
- **Unpinned definitions live in the tray.** The explorer lists defaults and pinned definitions, never every definition, exactly as the rail offers only pinned relations. **Packages are a section of their own** above them, naming what the workspace draws on and listing none of it — a package's definitions are read in the tray.
- **A library row points the tray, it does not fold.** Clicking *packages*, *definitions*, *default*, *pinned* or one definition sets what the tray is about; the mark is what folds, exactly as it is on a block.

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
| **node**, **annotation**, **membership**, **hug**, **figure** | each restated something with a second word | block; a resource or a group; references; layout's business; gone |
| **a tie on a line** | a note is about a block; a relationship between a block and a relationship was a second geometry for one remark | a note tied to a block |
| **`Relation.module` stored** | it could disagree with the ends | read from the ends |
