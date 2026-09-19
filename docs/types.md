# Types

**One typing flow, for blocks and for lines.** What the element tab asks, what each answer writes, and what the words mean. A block and a line read the same four rows and write the same four things.


## The one rule

**An element carries its own name; where it has none, it draws its type's.** That is the whole model, and it is now literally one rule rather than two that resembled each other.

| | block | line |
|---|---|---|
| **its own name** | `Block.name` | `Relation.name` |
| **where it has none** | its definition's `name`, as the card's kind word | its definition's `name`, as the word on the run |
| **where it follows nothing** | its base's word — *Block*, *Folder*, *Note* | nothing is drawn |

**`Definition.label` is gone.** A line read a `label` where a block read the definition's `name` — two keys for one job, and the only thing that made the two groups diverge. **`Relation.name` replaced it**, so a line is named like a block: two lines may share a name, and naming one no longer mints a single-use definition to hold the word.

**`label` is a style word only** — `card.label` says where the kind word sits, and `style.label_*` says how it is set. It names nothing in the model.

**A definition is tagged, and described rather than filled.** `tags` is generic indexing — it says what a thing is like, on a definition exactly as on a block, and nothing inherits one.

**`body` and `about` are two things, so they are two keys.** A block's `body` is the content itself — the requirement's text, the script's code. A definition's `about` is a sentence *describing* the vocabulary, named as every other description here is: an action's `about`, a catalogue entry's `about`. One gesture writes either — `describe` — and it picks the key from what it was handed.

| the element tab shows | a block | a definition |
|---|---|---|
| **prose, editable** | *content* — its body | *about* — what this definition is for |
| **reference, read only** | *source* — where its content lives | *definition* — the record, exactly as filed |


## The element tab

**Four rows, the same four on both**, under one head — *element type*, since a card and a run are both elements and the rows ask the same of either.

| | an element | a definition |
|---|---|---|
| **1 name** | what this one is called — `rename` | **none.** A definition is drawn nowhere, so the box is read only and shows its type name behind it |
| **2 type** | the definition it follows, by name — the mint rule below | **itself.** A type name *is* a definition's name, so this row renames it, reaching every usage |
| **3 tags** | words that say what it is like — `tag` | the same, on the definition |
| **4 extends** | what the definition in force is built on | what this one is built on |

**The same four rows either way**, because the questions are the same ones. A definition has no name of its own for the same reason a line had none before it got one: nothing draws it.

**The options sit under the drawing**, inline, on every element tab — a definition's and an instance's alike, since both are asking about one definition. Two independent boxes, never one choice:

| | | refused on |
|---|---|---|
| **pinned** | offers it — on the rail for a relation, in the explorer's pinned folder for a block | a base |
| **default** | makes it what a plain element of its kind draws | a base, a package's, or one extending nothing from outside |

**A default stands in for whatever it extends from outside** — a base, or a package's definition — and stands in front of that one in every chain reaching it. **One per thing stood in for**, so ticking it takes it from whoever held it, in one step and one undo. Beyond that it is a definition like any other: renamed, removed and pinned freely. It is set from the options, or from the types tab's `default` column.


## The mint rule

**One box, three outcomes** — the `type` row, on a block and a line alike.

| what is typed | what happens |
|---|---|
| **a name that group already holds** | the element is retyped onto that definition |
| **a name nothing holds** | `save_def` files it, extending what the element followed, and moves the element onto it. Any look the element was wearing travels into it |
| **cleared** | the element goes back to plain: it follows its base's default and draws what that says |

**It never renames.** Changing this box moves *this element*; it does not rewrite what everything else is following. Renaming a definition is the types tab's gesture, and that one reaches every usage on purpose.


## Extends

**What the definition in force is built on**, listed with the shipped bases first.

| the element follows | the row | writes |
|---|---|---|
| **the workspace's own definition** | a picker over everything it may extend | `define` — re-bases that definition, so everything following it moves too |
| **nothing of its own** (plain, or a base) | a picker of the bases it may become | `retype` — moves this element's own base, which is how a block becomes a note |
| **a package's, or a default** | read only | — |


## A name, or where it sits

**A box that takes a name shows a name; a picker that points at one definition shows which.** The two are not interchangeable, because **two definitions may legitimately wear one name** — a base and the workspace's word about it, which is written to stand in front of it.

| | shows | because |
|---|---|---|
| **the type box** | the bare name — `line`, `block` | it is compared against what you type, so a path is a string it would refuse |
| **every picker** | the path — `base/line`, `relations/line`, `requirements/requirement` | it names one definition, and the path is the only thing telling two of one name apart |

**The path is where a definition lives, never a projection over it** — a package's under that package, the workspace's own under its group, exactly as the explorer files them. There is no `default` folder and no `pinned` one: pinning is an option a definition wears, and the workspace's word about a base is filed with its own definitions like any other. **One spelling of it**, `def_path`, read by the element tab and the types tab alike.

**A name is held once within one source.** Two workspace definitions of a group may not share a name; a workspace definition may share a base's or a package's, since that is how a word about one is written. The actions refuse a clash, and **the door repairs one** — a file may carry anything, so the check belongs there too, and it renames the later one as it does for a package.


## The types tab

**The definition, as against the element.** The element tab points an element at a definition; this tab edits the definition itself, so a rename, a removal or a re-base here reaches every usage at once.

| | |
|---|---|
| **bases first** | the shipped kinds head the list, then the defaults, then the rest by name. Every element descends from a base whether or not anybody named one, so leaving them out left the first link of every chain unpickable |
| **rename reaches everything** | the id stays, so nothing naming it is retyped |
| **a package's is fixed** | its name and what it extends are theirs. Styling it or declaring a field mints the workspace's word about it, which stands in front of it everywhere |
| **no label column** | there is no such key. What a usage draws is its own name, or this one's |


## What this refuses

- **No second word for what a thing draws.** One key, `name`, on the element and on the definition. A stereotype spelled for one notation is `names`, which already exists for exactly that.
- **No renaming from the element tab.** The box that names a type moves one element; it never rewrites what others follow.
- **No third control on a row.** One row, one question. A row that grew a second box was asking two things.
