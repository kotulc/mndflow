# Context Tray

**One context, several tabs.** The tray is about one thing at a time — the context — and its head names it plainly: *block workspace*, *block Tank*, *relation feeds*, *block definition Pump*, *definitions sysml*, *new block definition*. The head never says how the context was reached. The chevron leads the head; expand sits far right.

## The context

**Whatever was picked last is the context.**

| gesture | context |
|---|---|
| pick one thing on the canvas | that thing |
| pick a row in contents or usages | that thing — the table keeps its tab and its listing |
| pick nothing, several things, or click the ground | the open layer — the workspace at the root |
| an elements toggle on the rail | the workspace, or a blank block or relation definition |
| a definition row in the explorer | that definition, opened on its element tab |
| a library folder in the explorer — *pinned*, *blocks*, *relations*, a package, a folder somebody made | every definition, narrowed to that folder |
| a definition row in the definitions tab | that definition |
| a definition row in the types tab, with something picked | nothing changes — the row lights and offers *apply to …* |

**A hold — a definition, a library section or a draft — is given up by any pick of an element**, on the canvas or in a table. The explorer sets the layer; the canvas and the tables set the context within it.

## Hover and pick

**They differ in what is shown, not in how loudly.**

| | card | run |
|---|---|---|
| **hover** — a table row under the pointer | an accent outline | an accent stroke |
| **pick** | an accent border and a raised fill | an accent stroke and its grips |

A hovered row never becomes the context.

## Tabs

**A tab that cannot be answered is absent rather than empty.**

| context | tabs |
|---|---|
| block | element · style · types · fields · contents · usages |
| a line | element · style · types · usages |
| block definition | element · style · fields · usages |
| relation definition | element · style · usages |
| a library folder | definitions |

**Element and style are two tabs over one thing.** Element is what it *is*; style is how it is painted. Both draw the same card, so it stays where it was when the tab changes.

**The element tab reads down each column.** The card column captions itself first — *card type* and how many instances — and the drawing comes under it, **taking whatever height the identity column set**, so the two read as one block rather than a small picture beside a long list. A run keeps its own size: a line has no height to fill. The identity rows end in an **options** row — the boxes, what is true of the thing as against what it is — which is where *pinned* sits.

**Types is an element's, definitions is the workspace's.** The types tab lists what the one thing in context may follow — its own kind's definitions, and nothing else. The definitions tab is the whole vocabulary, reached by holding a library folder, and says where each came from.

**Contents are an instance's.** With a definition in context, the fields tab declares that definition's schema instead of values.

**The workspace is a block, and nothing more.** It takes the same tabs as any block, styled for wherever an export is used, with its schema beside the card.

## Definitions

**A definition is a name and what it extends**; a relation definition also carries a `label`. A block or a line names one definition and draws through its chain.

| thing | is |
|---|---|
| **a package's** | a definition somebody else wrote — the shipped floor's among them, since `base` is a package like any other. Its identity is theirs: never renamed, never re-pointed, never removed |
| **a word about one** | what an edit to a package's definition mints — the workspace's own, wearing that definition's name and standing in front of it in every chain that reaches it. Dropping it gives the package's word back |
| **label** | what a line naming a relation definition draws, **exactly as typed** — a stereotype such as `<<relates>>`. Its own and never inherited |
| **working look** | what a block or a line says about its own drawing while it names no workspace definition — kept by naming it on the element tab, dropped by *reset style* |

- **Styling edits the definition where there is one.** A block or a line naming a workspace definition styles that definition, so every usage follows. One naming a default, a base or a package's definition — or already carrying a working look — styles itself.
- **Naming is what saves.** A working look is kept by naming it on the element tab, which files a definition and moves the element onto it — there is no save button. A line keeps the label it was drawing. **Saving never pins.**
- **Pinned offers a definition; it never makes or removes one.** A pinned relation definition is on the rail — a line definition only, since the rail offers no *tie*; a pinned block definition is in the explorer's *pinned* folder. **Pinning is a shortlist, not a listing**: the explorer lists every definition either way.
- **Removing dissolves.** Its looks go down into each usage, anything extending it extends what it extended, and it is unpinned.
- **A name is unique within its group.** A block definition and a relation definition may share one. A name already taken is said, never looked up.
- **Renaming keeps the id**, so every usage reads the new name and nothing is retyped.
- **Filed when first needed.** A default is laid by the fold until its first edit files it, so a workspace nobody customised writes nothing.
- **Ids are minted**, never a slug of the name, so renaming touches nothing but the name.

## Element

**What it is, then the drawing.** The card is a column of its own on the left, captioned by its kind and how many usages name this exact definition, with the drawing under that caption. The identity rows sit beside it and end in an *options* row of boxes. A body runs below both.

| holder | identity rows |
|---|---|
| workspace | name, type, tags |
| block | name, definition *(while it has a working look)*, type, tags |
| a line | name, type, label, tags |
| block definition | name, extends |
| relation definition | name, label, extends |

- **An instance is named for itself; a line is named by its definition.** A block's name is its own. A line's name row shows the definition it follows and, typed into, files a new definition over it and moves the line onto it — so a line and a block are named by the same gesture.
- **Type is a dropdown** of every definition of the element's own kind. **A block moves among `block`, `folder` and `note` freely** and no further; every other kind is fixed when it is made.
- **Extends is a definition's**, and says the same word for both groups. Read-only for a base.
- **Label is editable wherever it reads** — on the relation definition, and on a line, where it edits the definition the line follows.
- **Tags are chips**, on a block or a line, with a box to add another. Never inherited.
- ***Pinned* sits under the card.** Bases and defaults offer none.
- **Reset style** sits at the far end of the style tab's strip, since it acts on that whole tab.

**A body is what the block represents.** A block's is its text — the workspace's included, as its description — and a definition's is its data, the stored definition exactly as filed, read only. A line has none. Text is committed when the box is left. See ST.20.

## Two shapes, by width

**The tray lays its tabs out by its own width**, not the window's, since the explorer and the rail take from it. **Under the tabs a gutter each side** holds the content off the explorer and the options rail; **the tab strip itself spans the tray**, edge to edge, since it is the tray's own ground. **Its bar is the same height as theirs** and drops its top rule at full height, so the three read as one line across the page. Narrow is the card beside its rows with the body under both; wide puts everything in one row, the body a third column on the element tab and the style groups a column of their own on the style tab.

### Style groups

| group | rows |
|---|---|
| name | font, weight, contrast, align, handle — and *shown*, for a run only |
| label | display, font, weight, contrast, align |
| head | from head, to head — a run only |
| colour | family, pattern, hue, intensity, opacity |
| border | width, contrast, style — *stroke* on a run |
| icon | the mark in the top corner |

**A card always writes its name.** Its bottom-right corner is reserved for a system mark — see ST.19.

## Drafts

**A blank definition is filed when it is named.** Its id is minted up front, it is edited through the same actions as a real one, and it is kept through clicking away. Until something is picked, its extends shows `base/<kind>`.

## Tables

**One table for contents, definitions, types and usages.** They differ in rows and columns, which is data.

| part | behaviour |
|---|---|
| **scope** | *layer* or *workspace*, one choice shared by contents and usages and kept across tabs. The layer by default |
| **chips** | narrow what is listed; each group is one question and narrows on its own |
| **columns** | the data columns share the width evenly |
| **a cell** | a value, or a control: a box committed when left (Enter leaves, Escape gives it back, a clash is said beside it) or a pick. Every control fills its cell |
| **actions** | a row's chips and its remove, right-aligned in one action column reserved at a fixed width, so nothing reflows when they appear. Remove is offered on the picked row only |
| **the last row** | adds one, where a table can |

- **Hovering a row lights its element on the canvas**; picking it makes it the context.
- **No table scrolls on its own**; the tray body scrolls under the tabs.
- **Opening or shutting the tray frames the drawing again**, since the stage just changed size. Taking the full height does not: there is no room left to fit into.
- **Everything is derived.** The tray reads the graph and stores nothing but tab, scope, chips and drafts.

### Contents

- **Layer scope lists one level**: a container in context lists its own contents, anything else the open layer. **Workspace scope lists everything**, each row saying where it sits.
- **Chips narrow by what a row is.**
- **A column is a field in scope**, asked for by name, and its values are edited in the row.
- **A block is renamed in its row**; a line is named by its definition.
- **The picked row, when it is in another layer, offers *view***, which opens that layer and picks it there.

### Definitions and types

- **The definitions tab is every definition the workspace can name**, its own first: name, label *(relations)*, extends, source, used. **Nothing is left out** — a package's and the shipped floor's read here beside the workspace's, since hiding them only made *all* a smaller word for *workspace*. **Source says the package, or *workspace* for its own**. Chips narrow by group — *blocks*, *relations* — and by *all*, *pinned* or *workspace*. A package's row is read but not written: its name and what it extends are its package's, and an edit elsewhere mints the workspace's word about it.
- **The types tab is the same table, narrowed to one element**: what the thing in context may follow, and nothing else. It offers no chips and adds no row, since a definition is added in the explorer or on the definitions tab.
- **Name, label and extends are edited in the row**; a package's are not, and a default's name is not.
- **The last row adds one**, where one group is in view — a definition needs a group, and a mixed listing has none to give it.
- **With something picked, the lit row offers *apply to …***, which points the picked elements at it. Picking alone never changes a drawing. **Dragging a definition out of the explorer does the same thing** on the drawing.

### Usages

- **The lines, or the blocks**, by the context's group. Chips narrow by scope, by *line / tie* for lines, and by *any / the definition in context*.
- **Each row offers the definitions it may follow** — for a block, only its own kind's — and a line's row shows the label it draws.
- ***Retype all* points every listed usage at one definition**, in one step and one undo.
- **The picked row, when it is in another layer, offers *view***.

## Fields

- **A usage lists its whole schema**, answered or not, then values of its own.
- **Text is committed when the box is left**, never per keystroke.

## Two sizes

**Shut it is a bar; open it takes a quarter of the stage**, whatever it holds, so a row stays where it was last seen. Expand takes the full height. Nothing closes it but its own bar.

## Still open

- **Rules** — see ST.17.
- **Adding a field from the bar**, which the legacy app had.
