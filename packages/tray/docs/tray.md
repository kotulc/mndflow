# Context Tray

**One context, several tabs.** The tray is about one thing at a time — the context — and its head names it plainly: **the name first, then a tag saying what sort of thing it is** — *Tank* `usage`, *Pump* `definition`, *workspace* `workspace`, *sysml* `definitions`, *new block* `definition`. **The name is bold in the body's ink, never the accent** — the accent is the selected tab's. The tag is one quiet fill whatever it says. The head never says how the context was reached. The chevron leads the head; expand sits far right.

## The context

**The selection is the context, and the open layer answers for it where there is none.** One rule, asked the same way by every view — `about_of` in the engine — so the explorer, the canvas and the tray are never about different things.

| gesture | context |
|---|---|
| pick one thing on the canvas | that thing |
| pick nothing, several things, or click the ground | the open layer — the workspace at the root |
| an elements toggle on the rail | the workspace, or a blank block or relation definition |
| a definition row in the explorer | that definition |
| a definitions folder in the explorer — *pinned*, *blocks*, *relations*, a folder somebody made | every definition, narrowed to that folder |
| the *packages* section, or one package | what the workspace draws on, on the **packages** tab |
| a row in any of the tray's tables | nothing changes — the row lights and offers what acts on it |
| *view* on a lit row | that thing, selected where it lives |

**The tray never sets the selection.** A table lights a row of its own and offers what acts on it; *view* is what asks for the selection to move, and moving it is what changes the context. So reading a listing never drags the canvas or the explorer somewhere else.

**A hold — a definition, a library section or a draft — is given up by any pick of an element on the canvas.** The explorer sets the layer; the canvas sets the context within it.

## Hover, light and pick

**They differ in what is shown, not in how loudly.**

| | card | run |
|---|---|---|
| **hover** — a table row under the pointer | an accent outline | an accent stroke |
| **pick** — the selection, which is the context | an accent border and a raised fill | an accent stroke and its grips |

**A lit row is the tray's own.** Neither hovering a row nor lighting one becomes the context; a lit row is what the table's own actions act on.

## Tabs

**A tab that cannot be answered is absent rather than empty.**

| context | tabs |
|---|---|
| block | element · type · fields · contents |
| a line | element · type |
| block definition | element · settings · fields · usages |
| relation definition | element · settings · usages |
| a definitions folder | definitions |
| the packages section | packages |

**Usages are a definition's question.** An instance *is* one usage and has none of its own, so the tab is a definition's and a relation definition's only.

**Settings are a definition's too.** How it draws and what its usages may do are said once, on the definition, and every usage follows — so a usage has no settings tab, and is restyled by restyling what it follows or by following something else.

**The tab is sticky by family.** Every instance is read the same way and so is every definition, so each family remembers the tab it was last read on: move from one block to the next, or from one definition to the next, and the question being asked stays put. A tab that does not fit the new context falls to what that family last read, and only then to the last that fits.

**Element and settings are two tabs over one definition.** Element is what it *is*; settings are how it is painted and, under that, full width, its **capabilities** — what its usages may do. Both draw the same card, so it stays where it was when the tab changes.

**The element tab reads down each column, and each column is headed.** *type* heads the card column — bold, with the base kind and its mark following it directly — and the drawing comes under it, **taking whatever height the identity column set**, so the two read as one block rather than a small picture beside a long list. A run keeps its own size: a line has no height to fill. *identity* heads the rows beside it, ending in an **options** row of boxes — what is true of the thing as against what it is. *content* runs under both, and **source** under that.

**Type is an element's, definitions is the workspace's.** The type tab lists what the one thing in context may follow — its own kind's definitions, and nothing else. The definitions tab is the whole vocabulary, reached by holding a library folder, and says where each came from.

**What an element follows heads its type tab.** It is lifted out of the listing to the top, ruled off from the candidates under it, and tagged *applied* beside its actions — a state of that row, never a section heading and never something to press.

**Contents are an instance's.** With a definition in context, the fields tab declares that definition's schema instead of values.

**The workspace is a block, and nothing more.** It takes the same tabs as any block, styled for wherever an export is used, with its schema beside the card.

## Definitions

**A definition is a named block in a package, and what it extends.** A block or a line names one definition and draws through its chain.

| thing | is |
|---|---|
| **a package's** | a definition in a frozen package, `base` among them. Read only: subtyped, never edited |
| **label** | what a line naming a relation definition draws, **exactly as typed** — a stereotype such as `<<relates>>`. Its own and never inherited |

- **Styling edits the definition.** The settings tab is a definition's, so every usage follows. A frozen definition's settings are read only.
- **Naming a type makes one, once.** A name one already holds applies that one. A name nothing holds **renames the workspace definition the element already follows** — so editing the box is editing that one definition, never filing another per edit — and files a new one only where the element follows a base or a frozen definition. Clearing the box gives the element back to its base. **View definition** beside the row makes that definition the context, which is where it is styled and given capabilities. A line keeps the label it was drawing. **Making one never pins.**
- **Pinned offers a definition; it never makes or removes one.** A pinned relation definition is on the rail; a pinned block definition is in the explorer's *pinned* folder. **Pinning is a shortlist, not a listing**: the explorer lists every definition either way.
- **Removing a used definition is refused**, and says what uses it. An unused one is deleted with its structure and unpinned.
- **A name is unique within its package**, across definitions, tags and traits. A name already taken is said, never looked up.
- **Renaming keeps the id**, so every usage reads the new name and nothing is retyped.
- **Ids are minted**, never a slug of the name, so renaming touches nothing but the name.

## Element

**What it is, then the drawing.** The card is a column of its own on the left, headed *type* and its base kind, with the drawing under that head. The identity rows sit beside it and end in an *options* row of boxes. The content runs below both, and source or the definition's record under that.

| holder | identity rows |
|---|---|
| workspace | name, tags — then a *display* band of its own |
| block | name, type *(with view definition)*, tags |
| a line | name, type, label, tags |
| block definition | name, extends |
| relation definition | name, label, extends |

- **An instance is named for itself; a line is named by its definition.** A block's name is its own. A line's name row shows the definition it follows and, typed into, files a new definition over it and moves the line onto it — so a line and a block are named by the same gesture.
- **Type is a dropdown** of every definition of the element's own kind. **A block moves among `block`, `folder`, `note`, `group` and `grid` freely** and no further; every other kind is fixed when it is made.
- **Capabilities are a block definition's**, a section of its settings tab and never an instance's — a block follows its definition's, so it shows none. One radio row each, **its answers in fixed columns so every row lines up**, and the picklist in the last, wrapping as it fills — the row grows rather than the answers moving: **children**, **members** and **ports** — inherit, yes, no, or *limit to:* the definitions in the picklist beside it. **The picklist is always drawn**, taking input only while limiting; otherwise it reads what the chain gives, where that is a list, and is empty where it is not. *Members* shows only while the definition holds. **Traits head the section** as chips: inherited ones faint until the definition states its own set, and *reset* gives the set back to the chain.
- **Extends is a definition's**, and says the same word for both domains. It offers only definitions above it: never itself, never one extending it. Read-only for a base.
- **Label is editable wherever it reads** — on the relation definition, and on a line, where it edits the definition the line follows.
- **Source is a block's own**, never its definition's, and has a section of its own under the content it is the provenance of: one *uri* row. **Provenance, not a link** — nothing syncs to it, so it may go stale and nothing breaks. Whatever anchor or revision the locator needs is part of the uri, since nothing here parses one. Clearing it gives the slot back, and a block carrying one wears the `Ext` mark.
- **Tags are chips**, on a block, a line or a definition, named by their tag's name, with a box to add another: a new word makes a workspace tag. **What it carries from its definition reads after, faint and dashed**, and takes no click. **Traits are a row of their own**, apart from tags.
- **The workspace carries a *display* band** the other holders have none of: the room a card takes where its definition asked for none, and whether a layer draws the key to itself with which corner it keeps it in. **Display, not model** — the log never sees it and no file carries it, which is what keeps it off the identity rows above.
- ***Pinned* sits under the card.** Bases offer none.
- **Reset style** sits at the far end of the settings tab's strip, and gives the definition's settings back to what it extends.

**A body is what the block represents.** A block's is its text — the workspace's included, as its description — and a definition's is its data, the stored definition exactly as filed, read only. A line has none. Text is committed when the box is left. See ST.20.

## Two shapes, by width

**The tray lays its tabs out by its own width**, not the window's, since the explorer and the rail take from it. **Under the tabs a gutter each side** holds the content off the explorer and the options rail; **the tab strip itself spans the tray**, edge to edge, since it is the tray's own ground. **Its bar is the same height as theirs** and drops its top rule at full height, so the three read as one line across the page. Narrow is the card beside its rows with the body under both; wide puts everything in one row, the body a third column on the element tab and the style groups a column of their own on the settings tab, its capabilities full width under both.

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

**A blank definition is filed when it is named**, where the user is: in the open domain, in the holder picked. Its id is minted up front, it is edited through the same actions as a real one, and it is kept through clicking away. Until something is picked, its extends shows `base/<kind>`.

## Tables

**One table for contents, definitions, type and usages.** They differ in rows and columns, which is data.

| part | behaviour |
|---|---|
| **scope** | *layer* or *workspace*, one choice shared by contents and usages and kept across tabs. The layer by default |
| **chips** | narrow what is listed; each group is one question and narrows on its own |
| **columns** | the data columns share the width evenly |
| **a cell** | a value, or a control: a box committed when left (Enter leaves, Escape gives it back, a clash is said beside it) or a pick. Every control fills its cell |
| **actions** | a row's chips and its remove, right-aligned in one action column reserved at a fixed width, so nothing reflows when they appear. Remove is offered on the lit row only |
| **the lit row** | what the table's actions act on: whatever is selected and listed, else the first row. **A table always has a row in hand**, so what acts on one is reachable without a click |
| **the lead row** | where one row answers a different question than the rest, it is lifted to the top and ruled off from them — what an element follows, what a reference stands for. It is a row like any other, and lights as the first |
| **the last row** | adds one, where a table can |

- **Hovering a row lights its element on the canvas**; clicking it lights the row and no more.
- ***View* is the only way a row moves the context** — it selects that thing where it lives, opening its layer first where that is elsewhere. Offered on the lit row.
- **No table scrolls on its own**; the tray body scrolls under the tabs.
- **Opening or shutting the tray frames the drawing again**, since the stage just changed size. Taking the full height does not: there is no room left to fit into.
- **Everything is derived.** The tray reads the graph and stores nothing but tab, scope, chips, its lit row and drafts.

### Contents

- **Layer scope lists one level**: **whatever is in context lists its own contents**, whether or not it holds anything yet, and the open layer answers where the context is a line, a definition or the root. One rule — `frame_of` in the engine — so the same gesture never gives two answers. **Workspace scope lists everything**, each row saying where it sits.
- **A reference lists the one it stands for.** It holds nothing of its own, so its contents is that one block, under a *stands for* column head and offering *view*. Nothing is read through a reference: what it points at is listed as what it is, where it really lives.
- **Chips narrow by what a row is.**
- **A column is a field in scope**, asked for by name, and its values are edited in the row.
- **A block is renamed in its row**; a line is named by its definition.
- **The lit row offers *view***, which selects it — opening its layer first where it lives in another.

### Definitions and type

- **The definitions tab is every definition the workspace can name**, its own first: name, label *(relations)*, extends, source, used. **Nothing is left out** — a package's and the shipped floor's read here beside the workspace's, since hiding them only made *all* a smaller word for *workspace*. **Source says the package, or *workspace* for its own**. Chips narrow by domain — *blocks*, *relations* — and by *all*, *pinned* or *workspace*. A frozen package's row is read but not written.
- **The type tab is the same table, narrowed to one element**: what the thing in context may follow, and nothing else. It offers no chips and adds no row, since a definition is added in the explorer, on the definitions tab, or by naming a type. **The lit row offers two acts**: *apply*, which points the element at it — never offered on the one already applied — and *view definition*, which makes it the context.
- **Name, label and extends are edited in the row**; a frozen package's are not.
- **The last row adds one**, where one domain is in view.

### Packages

**Not a table — the `fields` pattern**, since what it lists is a set and not rows of data. Reached by the *packages* section in the explorer, or one package under it.

| band | holds |
|---|---|
| **drawing on** | every package the workspace holds, each saying how many blocks and relations it brought. `base` is among them, marked *shipped* and never dropped |
| **out there** | what the catalogue offers that is not already here, each with a line about it and a button to bring it in |
| **add** | a package by name, for one the catalogue does not list |

- **A package comes in once**: what is held is filtered out of what is offered.
- **The catalogue is read once at startup** and may be empty — an unbound `net` leaves it so, and then only the add line is there.
- **The type tab's *apply* points the element in context at a definition** — or everything picked, where the canvas has picked several. Picking alone never changes a drawing. **Dragging a definition out of the explorer does the same thing** on the drawing.

### Usages

- **The lines, or the blocks**, by the context's group. Chips narrow by scope, by *line / tie* for lines, and by *any / the definition in context* — **narrowed to that definition until somebody widens it**. The choice is kept as what it means rather than as one definition's id, so widening to *any* survives the move to the next definition, and leaving it narrowed follows each to its own.
- **Each row offers the definitions it may follow** — for a block, only its own kind's — and a line's row shows the label it draws.
- ***Retype all* points every listed usage at one definition**, in one step and one undo.
- **The lit row offers *view***.

## Fields

- **A usage lists its whole schema**, answered or not, then values of its own.
- **Text is committed when the box is left**, never per keystroke.

## Two sizes

**Shut it is a bar; open it takes a quarter of the stage**, whatever it holds, so a row stays where it was last seen. Expand takes the full height. Nothing closes it but its own bar.

## Still open

- **Rules** — see ST.17.
- **Adding a field from the bar**, which the legacy app had.
