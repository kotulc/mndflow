# Stories

**A story is a goal somebody has,** It says what has to be *true for a person* before any of it counts. One story spans a lot of building.

**A story is finished only when it has been driven.** Work landing makes a story *closer*, never
done. **A green suite never closes one** — every real defect this project has had came from driving
the built app, not from the suite. Twice, every piece of a story was built and the story still did
not work.

---

## Reaching outward

### ST.5 — The workspace reaches outside itself

Pull a package or a file from a **public GitHub repo** and have it land as blocks you can use —
**not as a file you then have to import by hand**.

### ST.6 — A model becomes something else

Translate a project out — **the site first**, then simulator, parametrics and code in an order
nobody has set. **One way out, and it never writes back.**

### ST.7 — The terminal earns its place

One collapsible strip that says **where you are, what you just did, and what you could do next** —
with **four commands**, flexible verbs, and **the whole action surface behind `?`**.

**Not a command palette and not a chat.**

---

### ST.12 — The plan stops being prose that agents parse

Stories, work, what a thing owns and what it waits on are a **schema**, not a document. Drafted as
translator.md, and **probably its own project** rather than anything to build here.


### ST.18 — A block holds content, so it is worth opening

Write a requirement's text, a part's description, a script's code **into the block itself** — and have it travel, export, undo and be searched like everything else the block carries. A block stops being a box with a name on it and becomes somewhere work actually lives.

**The want is utility, not annotation.** A note already says something *about* a diagram. This is different: the block **is** the requirement, and its text is the requirement's body. Anything less means the real content lives in another tool and the model points at it.

| | |
|---|---|
| **already half-built** | `Block.body` is in the schema, `set_body` folds it, `describe` writes it — and only the note reads it, with no surface offering it |
| **every block** | a requirement is a block with a description; confining bodies to one kind forces a wrapper element around everything worth documenting |
| **a note stays a module** | and for reasons that are not about text: it is the only ordinary card that resizes, and a relationship touching one is derived as a `tie`. What changes is only that it stops being the *sole* holder of a body |
| **format is the definition's** | `Requirement` says markdown, `Script` says code. Not a new value form — the closed set stays as it is, and `body` is a slot beside `fields` |

**What it opens, and is not in scope yet:** search over content, a body rendered on the card rather than in the panel, and code with a language. Each is its own thing once the text is there at all.

**Watch for:** bodies are the first thing this project stores that is large and edited often. The browser log stores each body once by hash, beside the log, while **the graph and the file carry text rather than a content id** — so the storage choice stays reversible.


### ST.20 — A block is the content it represents

Open any block and **find the thing it stands for in its body**: a definition's data, a requirement's text, a script's code. A definition reads as a block too — listed in the explorer with the same rows and marks, dragged out to make an instance or onto an element to retype it — so vocabulary and model stop being two forked worlds with two sets of gestures.

**This is the start, not the whole.** It sharpens ST.18: the body is not an annotation slot but *the* content, and what that content is depends on what the block is.

| block | its body holds |
|---|---|
| **a definition** | its data — the stored definition, exactly as filed. Read only for now |
| **an ordinary block** | text: a description, a requirement, the reason it exists |
| **a script or an external file** | code, or what the block's `source` points at |

| | |
|---|---|
| **definitions are blocks to the user, not to the graph** | they draw as block rows and take block gestures, but are not in `graph.blocks` until dragged onto the drawing as an instance |
| **one gesture to apply** | dropping a definition on an element retypes it where the kinds agree, and refuses in words where they do not; on the empty drawing it makes one, and a relation says lines must connect existing blocks |
| **filed like the tree** | the workspace's own definitions sit in folders the user makes and reorders; *pinned* and *default* are the system's, and a package is frozen |

**Open:** whether a definition's data becomes editable in place, and what a body's format is — markdown, code with a language, JSON — and who says so, the definition or the block.

### ST.21 — Finding a thing beats knowing where it is

Type a few words into the explorer and **have what you are looking for come back ranked**, whatever it is and wherever it sits — a block three layers down, a definition a package brought, a note whose text you half remember. The tree is how a workspace is *arranged*; this is how it is *searched*, and a workspace outgrows the first long before the second.

**A filter, not a second tree.** It takes over the explorer's body while a term is in it and gives the tree straight back when it is cleared. Nothing is folded, revealed or selected by searching — finding is not going.

| | |
|---|---|
| **where it lives** | first control in the explorer bar, under the hamburger the options rail used to wear. It may end up a layer over the panel rather than part of it |
| **what it reads** | name, type and label, then body content. **Relevance is one order**, not four lists — a name match outranks a body match, and how far is part of the design |
| **what a result is** | a card: the element's icon and its name in bold, and under it the properties that matched, so a hit says *why* it is a hit |
| **what it spans** | blocks, definitions, relations and holders. Whether packages and their definitions are in by default is open |

**Open:** whether relevance is scored or merely ordered; whether a result is picked, revealed or opened in the tray; what happens to a term when the graph changes under it; and whether this is the same machinery as the terminal's `search`, which already exists and fetches packages.

## Future stories

**Named so nothing is built against them by accident.**

| | What waits |
|---|---|
| **Allocation** | a grid's headers already derive what is allocated to each line. A story that *reads* allocation — a matrix, a trace, a report — is what gives it a consumer |
| **Behaviour** | *the model defines itself as the user builds*. A cell address is an order and a header is an allocation; nothing reads either as behaviour yet |
| **SysML round trip** | a `tie` goes out as `comment` and comes back as a `line`. Part of ST.6 |
| **A named package is checked** | the definitions tab reads what each package brought and what is in use; reconciling that against the catalogue |

## Recent Decisions

### A layer draws the key to itself

**The legend lists what the open layer draws and what it means** — each kind's colour, mark and word, and under a rule the system marks they wear. Each half is dropped where the layer has none. The rail toggles this layer; the workspace tab says what a layer does when it has said nothing. **A default, never a lock:** a layer overrides the workspace either way, and one toggled back into agreement drops its answer and follows again. What it lists is always the open layer, whichever right-hand corner it sits in.

### The defect it found, and the rule that comes out of it

**Driving is not enough — it has to be driven against the shipped sample.** A seed written by whoever is looking tests the path they already had in mind.

| | |
|---|---|
| **what happened** | `look_of` asked `"type" in b` to tell a block from a holder. **A block naming no definition carries no `type` key at all**, so it failed the test and was read as a holder — called `grid` where it carried a layer `arrangement`, `group` otherwise |
| **how long it hid** | since the field became optional. `look.kind` is written on a card only where a definition asks for the label, and no sample asked; nothing else read it |
| **what surfaced it** | the legend, which puts every kind word in one list. Two rows read *group* and *grid* against a reference's mark and a block's, and the real *block* and *reference* rows were missing — swallowed into them |
| **the rule** | **key presence is not a type discriminator.** Where two shapes share a lookup, ask the graph which one it is — `graph.blocks[id]` against `graph.holders[id]` — never whether the object happens to carry a field. An optional field makes the test wrong for the commonest case, so it reads as correct right up until something looks |

**A green suite said nothing**: 372 tests and a clean typecheck, across two rounds of driving. The synthetic seed written to exercise the legend gave every block a type, so it never took the path. The extended sample did, on the first draw.

## Out of scope, recorded so nothing is built on it

- **Search results as a thing you look at.** Narrowing the workspace to a word and putting what matched on the stage — as a table, as a listing, anywhere. **Driven, and it was not useful**: the results were a second way of looking at blocks you can already see, and everything that supported them — the `filter` command, `matches`, the narrowing chip, the table view they presented through — cost more than they paid. Recorded rather than deleted because *finding a block by name* is a real want; what is out of scope is answering it with a view of its own. It comes back, if it does, as something the explorer does.
- **Embedded content in a block** — a script, an image or a video carried *inside* the
  project rather than pointed at. A block holds content; whether that content is inline or
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


