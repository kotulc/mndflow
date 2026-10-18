# Context Tray

**One context, several tabs.** The tray is about one thing at a time — the context — and its head names it plainly: **the name first, then a tag saying what sort of thing it is** — *Tank* `usage`, *Pump* `definition`, *workspace* `workspace`, *sysml* `definitions`, *new block* `definition`. **The name is bold in the body's ink, never the accent** — the accent is the selected tab's. The tag is one quiet fill whatever it says. The head never says how the context was reached. The chevron leads the head; expand sits far right.

## The context

**The selection is the context, and the open layer answers for it where there is none.** One rule, asked the same way by every view — `about_of` in the engine — so the explorer, the canvas and the tray are never about different things.

| gesture | context |
|---|---|
| pick one thing on the canvas | that thing |
| pick nothing, several things, or click the ground | the open layer — the workspace at the root |
| a definition row in the explorer | that definition |
| a definitions folder in the explorer — *blocks*, *relations*, a folder somebody made | every definition, narrowed to that folder |
| the *packages* section, or one package | what the workspace draws on, on the **packages** tab |
| a package's *types* or *tags* row, or a registry opened on the canvas with nothing picked | that registry, on the **entries** tab |
| a registry's tile picked on the canvas | its entry: a tag or a type |
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

**A definition and a usage ask the same questions, and the fewest of them.** A tab that cannot be answered is absent rather than empty; one that is not the context's own to change reads only.

| context | tabs |
|---|---|
| block | card · components · contents |
| block definition | card · settings · components · usages |
| a line | line · components |
| relation definition | line · settings · components · usages |
| the workspace | workspace · contents |
| a definitions folder | definitions |
| the packages section | packages |
| a registry | entries |

**Every element asks in one order**: what it is, how it draws, what it carries, what it lists. **The first tab is named for what is drawn** — *card* or *line* — and holds every key saying what the element is. **A definition's settings tab is laid out as its card tab**, its keys how it draws.

**A relation says what its ends mean on its line tab**: a *from end* and a *to end* key, each read `1..*, lines, composite`. On a line it answers multiplicity (chips, or `m..n` typed) and its role (typed); on a relation definition also ownership (`none`, `shared`, `composite`) and navigable (yes, no). **An attribute's key** is a choice: PK, UK or none; a foreign key reads FK from its type. **An interface's keys** — name, flow, its interface definition, seat, and where it is held — edit it where it is held: its definition's, for one a usage reads through.

**The last tab is what a thing lists**: a usage its contents — its text, then its blocks — a definition its usages. Same place, its label says which.

**Settings are a definition's, and a usage has no settings tab.** How it draws and what its usages may do are said once, on the definition, and every usage follows. A usage never lists what it cannot change: *view definition* on its type goes where they are changed. **Nobody types JSON**: a definition changes by its keys' choices alone.

**The tab is sticky by family.** Every instance is read the same way and so is every definition, so each family remembers the tab it was last read on: move from one block to the next, or from one definition to the next, and the question being asked stays put. *Card* and *line* are the same tab, so moving between a block and a line keeps it. A tab that does not fit the new context falls to what that family last read, and only then to the last that fits.

**There is no type tab.** A block is retyped on its card tab's `type`, or by dragging a definition onto it; the definitions tab is the whole vocabulary, reached by holding a library folder.

**The workspace is a block, and nothing more.** It takes the same tabs as any block, styled for wherever an export is used.

## Definitions

**A definition is a named block in a package, and what it extends.** A block or a line names one definition and draws through its chain.

| thing | is |
|---|---|
| **a package's** | a definition in a frozen package, `base` among them. Read only: subtyped, never edited |

- **Styling edits the definition.** How it draws is a definition's keys, so every usage follows. A frozen definition's keys read only.
- **A new type is filed over what the element follows.** A name one already holds applies that one; a name nothing holds files a definition extending what it followed and moves the element onto it. A base is one of the types offered, so going back to one is a pick like any other. **View definition** makes what an element follows the context, which is where it is styled and given capabilities. A line keeps the label it was drawing.
- **Removing a used definition is refused**, and says what uses it. An unused one is deleted with its structure.
- **A name is unique within its package**, across definitions and tags. A name already taken is said, never looked up.
- **Renaming keeps the id**, so every usage reads the new name and nothing is retyped.
- **Ids are minted**, never a slug of the name, so renaming touches nothing but the name.

## Card, line and settings

**The card tab and the settings tab, one layout: the drawing over every key in the left third, the lit key's choices in the right two thirds.** Nothing hides behind a button, and every key is listed whether it is said or not, so anything the element carries is changed from here.

| column | holds |
|---|---|
| **drawing** | left, at the top: **one face** — the large where its look draws one, else the small — at its own size, scaled into the column only where it is narrower; or a line's run |
| **keys** | left, under the drawing: one line a key, `key: value`, **cut short with an ellipsis** where the column is too narrow. What it says itself reads in ink, what it carries faint. A section's keys sit indented under its head |
| **choices** | right: the lit key's name, a line saying what it is for, **its whole value** — typed here where words run long, as a description's do, else read where no chip already says it — then each question it asks — titled over its chips where the key asks more than one — and last what acts on it |

| key | an element's | a definition's |
|---|---|---|
| `name` | its own, typed on its line; blank draws its type's | its name, typed on its line |
| `description` | what it is for, in a line, typed on its line. Shown on the canvas on hover | the same |
| `type` | the definition it follows, a base among them; *extends* asks what its own definition is built on | what it extends, a base among them |
| `parent` | the block it sits in, from those of its package that may hold it | the folder it is filed in |
| `tags` | its own list, else its definition's | the same |
| `traits` | — | what it can do, one capability each |
| `source` | where its content came from, typed on its line | — |
| an attribute | its value, else its default faint | its default, where it declares it |


- **The lit key is kept by name**, so moving to the next element asks the same question. ↑ and ↓ move the light; Enter types into a line that takes text.
- **Chips are gathered by where they live**: a definition under its package and folders, a parent under what holds it. **Lit is what holds; accented is what is said here.** A list — tags, traits — toggles; a single answer is picked. **A chip standing for a definition wears that definition's colour**: its outline, and lit, its ground.
- **Free text is typed on its key's line**, committed when the line is left. A key whose answer is one of a set is answered by chips; a new word, where one may be made, is typed under them.
- **The settings tab lists one key per part of the drawing** — name, label, face, head, colour, border, icon, those its kind honours — and no values: a part's settings and what each is set to are its choices. A part reads in ink where the definition says any of its settings, faint where it carries them all. Lit, the choices are each of its settings in a row — chips for a set, a slider for a quantity, the marks for an icon, a size in units for a face. *Inherit* gives the part's settings back; *reset style* on the tab strip gives every part back.
- **A frozen definition's choices read only**; what navigates — *view definition* — stays live.
- **Every tab draws the element in hand, through one renderer** (`Faces`, theme's `CardFace`).
- **A large face that shows nothing yet previews** its attributes, else sample content, at the size that fits, drawn faint, so a definition's look can be judged before it says anything. **The face wears the handle top left**: a usage its own, a definition the one its next usage takes, unless `card.alias` hides it.
- **Attach** sits at the far right of the tab strip on a usage's card tab: the host asks for a markdown file and copies it on, recording where it came from. Attached again, it refreshes.
- **Permissive**: a type or tag name nothing holds is made, and said.
- **The workspace carries a *display* band** on its own tab: the small card's size, and whether a layer draws the key to itself. **Display, not model** — the log never sees it and no file carries it.

### Parts of a drawing

| part | asks |
|---|---|
| name | font, weight, contrast, align, handle — and *shown*, for a run only |
| label | display, font, weight, contrast, align |
| face | which large face it draws with — table, document, picture; its size in units; whether it names itself |
| head | from head, to head — a run only |
| colour | family, pattern, hue, intensity, vary, opacity |
| border | width, contrast, style — *stroke* on a run |
| icon | the mark in the top corner |

**A card's small face always writes its name**, its handle over it. Its bottom-right corner is reserved for a system mark: marks describe, and stack (design.md).

## Text

**What a block holds as text is one note of markdown, at the top of its contents tab**, over the blocks it holds. Read as the card draws it; a click opens it as markdown, leaving commits it and Escape gives it back. **A description is not text**: it is one line, on the card tab, saying what the block is for.

## Keys and focus

**The keys go to one region at a time** — the explorer, the canvas, the tray or the options rail — the one last pressed or focused in, outlined faintly. Arrows walk the explorer only while it has them, and the canvas's keys answer only while it has them; undo and redo answer wherever the keys are.

## Layout

**The tray lays its tabs out by its own width**, not the window's, since the explorer and the rail take from it. The card and settings tabs give the keys a third and the choices the rest where there is room; half and half where a third would cramp the keys, as on a portrait screen; and narrower still, the choices under the keys. **Under the tabs a gutter each side** holds the content off the explorer and the options rail; **the tab strip itself spans the tray**, edge to edge, since it is the tray's own ground. **Its bar is the same height as theirs** and drops its top rule at full height, so the three read as one line across the page.

## Drafts

**A blank definition is filed when it is named**, where the user is: in the open domain, in the holder picked. Its id is minted up front, it is edited through the same actions as a real one, and it is kept through clicking away. Until something is picked, its extends shows `base/<kind>`.

## Tables

**One table for contents, definitions, type and usages.** They differ in rows and columns, which is data.

| part | behaviour |
|---|---|
| **scope** | *layer* or *workspace*, one choice shared by contents and usages and kept across tabs. The layer by default; with no layer open — a whole section — usages list the workspace and offer no *layer*. A definition is never listed as a usage, of itself or another |
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
- **A block or a line is renamed in its row**.
- **The lit row offers *view***, which selects it — opening its layer first where it lives in another.

### Definitions

- **The definitions tab is every definition the workspace can name**, its own first: name, extends, source, used. **Nothing is left out** — a package's and the shipped floor's read here beside the workspace's, since hiding them only made *all* a smaller word for *workspace*. **Source says the package, or *workspace* for its own**. Chips narrow by domain — *blocks*, *relations* — and by *all* or *workspace*. A frozen package's row is read but not written.
- **Name and extends are edited in the row**; a frozen package's are not.
- **The last row adds one**, where one domain is in view.

### Packages

**Not a table — the label-and-answer pattern**, since what it lists is a set and not rows of data. Reached by the *packages* section in the explorer, or one package under it.

| band | holds |
|---|---|
| **drawing on** | every package the workspace holds, each saying how many blocks and relations it brought. `base` is among them, marked *shipped* and never dropped |
| **out there** | what the catalogue offers that is not already here, each with a line about it and a button to bring it in |
| **add** | a package by name, for one the catalogue does not list |

- **A package comes in once**: what is held is filtered out of what is offered.
- **The catalogue is read once at startup** and may be empty — an unbound `net` leaves it so, and then only the add line is there.
- **Dragging a definition out of the explorer points what it lands on at it.** Picking alone never changes a drawing.

### Entries

**A registry's tab, read two ways**, chosen on its chip bar. Below three entries it opens on the list.

| reading | shows |
|---|---|
| **matrix** | a grid of gapped squares: the blocks using any entry down the side — the folder holding them in the first column, spanning them, each block wearing its definition's colour — the entries across, named flat under a head saying what they are, every column one width. A square is as warm as its count, a count past one written. **A readout** over the grid says in full what the pointer is on, and a crosshair marks its row and column. Past a reasonable count the rows roll up into folders |
| **list** | one row an entry: its name, what it means, its uses, and where it is used, busiest first |

- **The lit row offers *view***; an entry's head makes that entry the context.
- **Hovering a block's row lights it on the canvas.**

### Usages

- **The lines, or the blocks**, by the context's group. Chips narrow by scope, by *line / tie* for lines, and by *any / the definition in context* — **narrowed to that definition until somebody widens it**. The choice is kept as what it means rather than as one definition's id, so widening to *any* survives the move to the next definition, and leaving it narrowed follows each to its own.
- **Each row offers the definitions it may follow** — for a block, only its own kind's — and a line's row shows the name it draws.
- ***Retype all* points every listed usage at one definition**, in one step and one undo.
- **The lit row offers *view***.

## Components

**Everything an element carries, one band per kind**: its attributes (the table below), its ports — its own and its definition's, each with its interface definition in that definition's colour; *add port* on a block that *has ports* — its tags and its constraints, each a chip in its entry's colour. Ports, tags and constraints are set on the card tab's keys; this tab reads them together.

## Attributes

**One table, the same for a definition and a usage.** A definition declares — name, type, key, default, unit, and a column for any other property one of its attributes says — and a usage answers, a value beside each.

- **Quiet until lit**: rows read as text; only the lit row's cells are controls. Remove, and up and down, are offered on the lit row only.
- **What a definition inherits reads first, faint**, saying where it came from; it is edited where it is declared.
- **Type names a form, a type or a definition**: the forms, every package's types, or a block definition, which makes the attribute a link and its key column says *FK*. A name nothing holds makes a type of the workspace's, an alias of text.
- **A value is answered as its type says**: a box, a yes or a no, or one of a choice's options.
- **The last row adds one**: declared on a definition, answered on a usage.
- **Text is committed when the box is left**, never per keystroke.

## Two sizes

**Shut it is a bar; open it takes a quarter of the stage**, whatever it holds, so a row stays where it was last seen. Expand takes the full height. Nothing closes it but its own bar.

## Still open

- **What a definition extends is set here only**, and everything else that describes it: its tags, interfaces, settings and usages. There is no definition view.
