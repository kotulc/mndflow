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
| a definitions folder in the explorer — *blocks*, *relations*, a folder somebody made | every definition, narrowed to that folder |
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

**A definition and a usage ask the same questions, and the fewest of them.** A tab that cannot be answered is absent rather than empty; one that is not the context's own to change reads only.

| context | tabs |
|---|---|
| block | card · settings · attributes · contents |
| block definition | card · settings · attributes · usages |
| a line | element |
| relation definition | element · settings · usages |
| the workspace | workspace · contents |
| a definitions folder | definitions |
| the packages section | packages |

**The fourth tab is what a thing lists**: a usage its contents, a definition its usages. Same place, its label says which.

**Settings are a definition's.** How it draws and what its usages may do are said once, on the definition, and every usage follows — so a usage's settings tab is its definition's, read only, and is restyled where it is defined. A definition's own settings change by its traits and the pickers, which is the only way its JSON changes: **nobody types JSON**.

**The tab is sticky by family.** Every instance is read the same way and so is every definition, so each family remembers the tab it was last read on: move from one block to the next, or from one definition to the next, and the question being asked stays put. A tab that does not fit the new context falls to what that family last read, and only then to the last that fits.

**There is no type tab.** A block is retyped by its card source's `type`, or by dragging a definition onto it; the definitions tab is the whole vocabulary, reached by holding a library folder.

**The workspace is a block, and nothing more.** It takes the same tabs as any block, styled for wherever an export is used.

## Definitions

**A definition is a named block in a package, and what it extends.** A block or a line names one definition and draws through its chain.

| thing | is |
|---|---|
| **a package's** | a definition in a frozen package, `base` among them. Read only: subtyped, never edited |
| **label** | what a line naming a relation definition draws, **exactly as typed** — a stereotype such as `<<relates>>`. Its own and never inherited |

- **Styling edits the definition.** The settings tab is a definition's, so every usage follows. A frozen definition's settings are read only.
- **Naming a type makes one, once.** A name one already holds applies that one. A name nothing holds **renames the workspace definition the element already follows** — so editing the box is editing that one definition, never filing another per edit — and files a new one only where the element follows a base or a frozen definition. Clearing the box gives the element back to its base. **View definition** beside the row makes that definition the context, which is where it is styled and given capabilities. A line keeps the label it was drawing.
- **Removing a used definition is refused**, and says what uses it. An unused one is deleted with its structure.
- **A name is unique within its package**, across definitions, tags and traits. A name already taken is said, never looked up.
- **Renaming keeps the id**, so every usage reads the new name and nothing is retyped.
- **Ids are minted**, never a slug of the name, so renaming touches nothing but the name.

## Card

**The card drawn, and what it says.** The card column draws it as every surface does — **the large face over the small one**, each at its own size, scaled into the column only where the column is narrower. **A large face that shows nothing yet previews** its attributes, else sample content, at the size that fits, drawn faint, so a definition's look can be judged before it says anything. **Both faces wear the handle top left**: a usage its own, a definition the one its next usage takes, unless `card.alias` hides it. Beside it, what it says, rendered: its frontmatter as a quiet list — name, type, tags, source, its values — then its body.

| chip | does |
|---|---|
| **edit source** | the card's whole markdown — frontmatter, then body — in one box, committed when the box is left as ordinary changes. Escape gives it back |
| **attach** | a usage's: the host asks for a markdown file and copies it on, recording where it came from. Attached again, it refreshes |
| **view definition** | a usage's: makes what it follows the context, where it is defined |

- **A definition's card source** is its name, what it extends, its tags and traits, its attributes' defaults and what it is for. **Its record reads under both as JSON** — its own word, or resolved down its chain — and is never typed into.
- **A body is what the block represents**: a block's is its content, a definition's describes it. Markdown, rendered by the one renderer the cards use. See ST.18.
- **Permissive**: a type or tag name nothing holds is made, and said.

## Element

**A line's.** The run drawn, and its identity rows beside it: name, type, label, tags. A block's is its card tab.

- **A line is named by its definition.** Its name row shows the definition it follows and, typed into, files a new definition over it and moves the line onto it.
- **Label is editable wherever it reads** — on the relation definition, and on a line, where it edits the definition the line follows.
- **Traits are a block definition's**, a section of its settings tab: every trait as a toggle chip, lit **on** while in force, **set** (accent) where this definition differs from what it extends, struck where it lets an inherited one go. A style preset is a trait like any other. **Reset traits**, beside *reset style* on the tab strip, gives the set back. A frozen definition's traits read only.
- **The workspace carries a *display* band**: the small card's size, and whether a layer draws the key to itself. **Display, not model** — the log never sees it and no file carries it.
- **Reset style** sits at the far end of the settings tab's strip, and gives the definition's settings back to what it extends.

## Two shapes, by width

**The tray lays its tabs out by its own width**, not the window's, since the explorer and the rail take from it. **Under the tabs a gutter each side** holds the content off the explorer and the options rail; **the tab strip itself spans the tray**, edge to edge, since it is the tray's own ground. **Its bar is the same height as theirs** and drops its top rule at full height, so the three read as one line across the page. Narrow is the card beside what it says; the style groups take a column of their own on the settings tab, its traits in the card column under the drawing.

### Style groups

| group | rows |
|---|---|
| name | font, weight, contrast, align, handle — and *shown*, for a run only |
| label | display, font, weight, contrast, align |
| face | what the large face shows, in order; its size in units; whether it names itself |
| head | from head, to head — a run only |
| colour | family, pattern, hue, intensity, vary, opacity |
| border | width, contrast, style — *stroke* on a run |
| icon | the mark in the top corner |

**A card's small face always writes its name**, its handle over it. Its bottom-right corner is reserved for a system mark: marks describe, and stack (design.md).

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

### Definitions

- **The definitions tab is every definition the workspace can name**, its own first: name, label *(relations)*, extends, source, used. **Nothing is left out** — a package's and the shipped floor's read here beside the workspace's, since hiding them only made *all* a smaller word for *workspace*. **Source says the package, or *workspace* for its own**. Chips narrow by domain — *blocks*, *relations* — and by *all* or *workspace*. A frozen package's row is read but not written.
- **Name, label and extends are edited in the row**; a frozen package's are not.
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

### Usages

- **The lines, or the blocks**, by the context's group. Chips narrow by scope, by *line / tie* for lines, and by *any / the definition in context* — **narrowed to that definition until somebody widens it**. The choice is kept as what it means rather than as one definition's id, so widening to *any* survives the move to the next definition, and leaving it narrowed follows each to its own.
- **Each row offers the definitions it may follow** — for a block, only its own kind's — and a line's row shows the label it draws.
- ***Retype all* points every listed usage at one definition**, in one step and one undo.
- **The lit row offers *view***.

## Attributes

**One table, the same for a definition and a usage.** A definition declares — name, type, key, default, unit, and a column for any other property one of its attributes says — and a usage answers, a value beside each.

- **Quiet until lit**: rows read as text; only the lit row's cells are controls. Remove, and up and down, are offered on the lit row only.
- **What a definition inherits reads first, faint**, saying where it came from; it is edited where it is declared.
- **Type names a definition**: a value type, offered from every one loaded, or a block definition, which makes the attribute a link and its key column says *FK*. A name nothing holds makes a value type of the workspace's.
- **A value is answered as its type says**: a box, a yes or a no, or one of a choice's options.
- **The last row adds one**: declared on a definition, answered on a usage.
- **Text is committed when the box is left**, never per keystroke.

## Two sizes

**Shut it is a bar; open it takes a quarter of the stage**, whatever it holds, so a row stays where it was last seen. Expand takes the full height. Nothing closes it but its own bar.

## Still open

- **Composing a definition by dropping type, trait and tag blocks on it**, which waits on the definition view (cards-plan.md).
