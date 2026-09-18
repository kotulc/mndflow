# Plan

**The block refactor: capabilities, holders, marks and external content.** What was decided in design, and what it costs to build. The goal state lives in design.md, spec.md and each package's `docs/`; this file records the conclusions that change them and the order the work lands in.


## The idea

**A block is content.** Body text, or a stand-in for something outside the workspace — a file, a module, a function, a section of a document. Everything else a block used to be is either a capability somebody switched on, or a layer-local organizing element that was never a block at all.

Three conclusions carry the rest:

| | |
|---|---|
| **capabilities replace kinds** | what a block may hold, seat or reach is configuration, not a module. `folder`, `resource` and `note` collapse into `block` |
| **holders are not blocks** | groups and grids are layer-local, own nothing, appear in no tree and are pointed at by nothing. They become a third element kind |
| **one system mark** | a new bottom-right corner writes what a card stands in for — `Ref`, `Def`, `Pkg`, `Ext`. The card icon stays above it, untouched, and fills when the card holds parts |


## Capabilities

**`rules` splits in two, and neither half is called rules.** The old key answered two unrelated questions with one name.

| Key | Asks | Enforced |
|---|---|---|
| `allows` | what may attach to or be held by this | at the gesture — the UI never offers what is refused |
| `expects` | do the values say what was asked | advice only — an unfinished model is not a broken one |

**Enforcement follows from the split** rather than being a policy to remember: structure is refused when you try to make it, values are noted when they are missing.

```
allows {
  ports?    false | true | Id[]     // may seat interfaces
  holds?    false | true | Id[]     // may own children
  members?  false | true | Id[]     // may take holder members
  degree?   { in?: Range; out?: Range }
  ends?     { from?: Id[]; to?: Id[]; fromFlow?: Flow; toFlow?: Flow }
}

expects {
  required? string[]                // field names a usage must fill
  match?    string[]                // field names that must agree across a relation
}
```

**Four settings, not a boolean**: absent inherits from the chain, `false`/`[]` is none, `true` is any, `[ids]` is those definitions or anything below them. **A rule naming a definition still means it or anything below it**, and both keys still merge along the chain, nearest first, per kind.

**`allows` only ever answers what attaches.** Body content and card height are drawing, and live in `card`. That discipline is what keeps the key explainable in a sentence.

### What this retires

Two refusals hardcoded in the `interface` action — *a boundary cannot have an interface* and *a note has no wall to set one into* — become `allows.ports: false` on the definitions that mean it.


## Kinds

**Eight modules become three.** What is left is what a stored field says, never what configuration says.

| Module | Read from | Why it survives |
|---|---|---|
| `block` | nothing — the base | content and structure. `folder`, `resource` and `note` are this plus configuration |
| `reference` | `of` | a second appearance of something that lives elsewhere |
| `interface` | `side` | a seat on a wall, which carries `side`, `at` and `flow` instead of a place |

**`note` stays a block.** The test is whether deleting it loses content: a holder loses an arrangement, a note loses text somebody wrote. Under a content-focused model a note is a block whose body is the point.

```
note:  allows { ports: false, holds: false }
       card   { height: "free" }
```

**A note still draws its name, not its body.** `card.name: "body"` would change what every existing note shows, which is outside what this refactor was held to; the setting is not built.

**`tie` goes with it.** A tie was a relation module derived from a note sitting at an end; it is a dashed line with no arrowheads, which is a relation *definition*. `RELATION_MODULES` collapses to one member, and `relation.module`, `derived_module`, `edge_module` and `relation_named` all go.


## Holders

**A third element kind, layer-local, holding members and allocation.** Called `Holder`, not `Frame`: `Frame` already names the drawn room in the view layer, and `is_holder` was already the engine's word for one. Nothing in the graph points at a holder, nothing owns one, no tree lists one, and relations already refuse them as ends — the carve-outs were already being paid for.

```
Holder = { id, parent, name?, of?, group?, order?, alias?, looks?
           arrangement: "free" | "grid"
           rows?, cols?, merges?, x?, y?      // grid only
         }
```

**One kind, two shapes.** The storage is genuinely disjoint, so it is discriminated rather than unified; everything shared — identity, naming, looks, what it stands for — is stated once.

**Membership stays on the block.** `group`, `cell` and `header` say where a block sits, and a holder's members are derived from them, so the two can never disagree and a deleted block takes its seat with it. Moving membership onto the holder would make *a cell holds one block* structurally true, but it buys that by making a stale member id possible on every block delete — a worse trade than the one it fixes. **`Block` loses the three fields that were only ever a holder's**: `rows`, `cols` and `merges`.

**Nesting is one rule, not a second axis.** A cell seats exactly one card and a holder is not a card, so grids do not nest; free holders have no cells to fit into, so they do.

**Holders need no definitions beyond `looks`.** They carry no fields, no content and no capabilities, so a named holder type would be a saved style and nothing more. The base package still ships a `group` and a `grid` definition, carrying a look and no module, and a holder draws through the one its shape names.

### Allocation

| Shape | Axes | Allocation is |
|---|---|---|
| free | one | membership — everything inside is allocated to the holder |
| grid | two | position — the row and column headers covering the cell |

- **A holder may point at a block** (`of`), meaning *this region stands for that block*. It is what would make the two shapes compose: `allocated_to` answering with blocks whichever shape was used, instead of blocks for a grid and a label for a group. **The field is in the schema; allocation still reads grid headers only** — wiring a boundary's members through `of` is the next step, not a done one.
- **Grid headers stay blocks**, seated in line 0. They are content — a team, a phase, a component — and you will want to relate to them, type them and give them fields.
- **Free holders nest, so allocation composes into a path** rather than a flat label. That is the hook translators need: ownership is the heading tree, and everything cross-cutting — tags, categories, front matter — goes to holders without disturbing it.


## Marks

**Two corners, and they answer different questions.** The top corner is the **card icon** — what sort of thing this is, or whatever icon somebody set over it with `card.icon`. It is unchanged. The bottom corner is the **system mark**, which is new: the app's own, drawn in the highlight colour, and never set by hand.

**One system mark, derived, mutually exclusive.** It answers one question: *what is this card standing in for?*

**A mark is a word, not a picture** — three letters on the icon grid, one weight, the family the explorer's sections already wear. A drawing of what a card stands in for would only repeat the icon above it.

| Mark | Stands in for |
|---|---|
| `Ref` | a block elsewhere in this workspace |
| `Def` | a definition |
| `Pkg` | a package |
| `Ext` | something outside the workspace — the `source` slot is set |

- **Precedence is `of` → `source` → nothing**, so mutual exclusivity needs no ordering anybody has to remember.
- **Holding parts is not a mark.** A card that holds parts **fills its own icon** — a filled folder, a filled block — which is what containing has always looked like. The treemap retires into that fill, not into a second stamp.
- **`Ref`, `Def` and `Pkg` are one mechanism** — `of` pointing at something — and differ only in what it resolves to. The schema already promises one id space.
- **The explorer's sections wear the same words**: `Wks`, `Pkg`, `Def`. `ABC` and the isometric crate are gone.
- **A card icon is not a mark.** It stays in the top-right corner and keeps saying what sort of thing the card is; the mark sits below it in a highlight colour that says the app chose it, not a person. A reference wears both — its own icon above, its `Ref` mark below.
- **A reference stands for a block and holds nothing**, so it wears `Ref` below and an unfilled icon above.


## Packages

**A package becomes a thing with a name and an id**, because `of` has to be able to land on one.

```
Package { id, name }              // the name is unique in the workspace
graph.packages: Record<Id, Package>
Definition.from: Id               // was a bare package name
```

- **`base` is a reserved package id**, since `shipped()` reads `from` as its sentinel.
- **This re-saves the samples**, which is what a schema change does here.
- **The floor lists with the rest.** `packages()` used to skip anything shipped, so `base` was invisible and the list lied about where the kinds came from. Every workspace stands on it, and it says so.
- **A file never carries `base`.** The floor ships with the app; a workspace file carries only what it drew on besides.

### The packages tab

**The explorer's packages section opens a tab, not a listing.** It says what the workspace draws on — each package, what it brought, and whether it is the shipped floor — and takes one more.

- **The catalogue is read, not guessed.** `session.listing()` returns what is out there, so the tab offers names rather than asking somebody to remember one. An unbound `net` leaves it empty and the text box still works.
- **Bringing one in is `session.search`**, which fetches and grafts through the same door as any other file. The tray asks for it by name through `@package`, the way it already asks for `@name`.
- **The floor cannot be dropped.** Everything else can, and what it brought goes with it.
- **It reads as the `fields` tab reads** — banded bodies of labelled lines, ending in an `add` line. That resemblance is the point, and making it one shared pattern rather than two that look alike is the next piece of work.


## External content

**Provenance, not a link.** The graph is the truth and the app never syncs to what a block came from, so a locator may go stale, the file may move, and nothing breaks. Translators convert external representations into blocks; nothing converts back on its own.

```
source? { uri: string; at?: string; rev?: string }
```

- **A first-class slot, not a field.** Translators write it uniformly across every vocabulary, so it is not user schema — and the five value forms stay five.
- **`at` is opaque.** A heading path, a line range, a symbol name; every content type spells it differently and the app never parses it.
- **`Ext` is drawn from it**, which is where the retired `resource` kind went.


## Content and translators

**The initial use case: complex external compositions — code, documents, collections — represented as blocks, linked and re-organized quickly, with major component interactions visible.** That needs an automated translation between a supported content type and blocks.

| Markdown | Block |
|---|---|
| heading nesting | `parent` |
| sibling order | `order` |
| prose under a heading | `body` |
| front matter | `fields` |
| where it came from | `source` |
| lists, tables, fences | the translator's call — a block, or body text |

**Everything is a block or lives in a block's body.** The per-construct choice is translator policy rather than schema, which is the right place for it.

**The test that settles the body question**: translate a real README in, translate it back out, diff. It is the only thing that says whether `body` needs structure or stays opaque markdown.


## Order of work

**Each lands on its own, and nothing before six blocks on six.**

| | |
|---|---|
| **1 — capabilities** | `allows` and `expects` replace `rules`; the two hardcoded refusals move into them |
| **2 — kinds** | `folder`, `resource` and `note` collapse into `block` + configuration; `card.height` arrives; `tie` becomes a definition |
| **3 — packages** | the record, `from: Id`, and the path that adds one |
| **4 — marks** | the system mark as a second corner element, the precedence rule, and `Def`/`Pkg`/`Ext` targets. The card icon is left where it was |
| **5 — uniform cards** | the treemap retires; a container says so by filling its own icon |
| **6 — holders** | out of `Block`, as their own element kind. The largest single step |
| **7 — the floor, and a way in** | `base` listed with the other packages, and a `packages` tab that reads the catalogue and brings one in |

**Everything except container cards and the marks looks and behaves as it did before.** That is the bar this refactor is held to.


## The floor, and what stands in front of it

**`default` was a placeholder pretending to be a definition.** One was laid per base whether or not anybody wanted it, shown as its own collection, and written to a file only once touched. What it *is* — the workspace's one editable definition extending a base — was right; **when it existed and where it showed were not**.

| | |
|---|---|
| **minted, not laid** | nothing exists until somebody edits a base. An untouched workspace has none |
| **filed with the rest** | it appears under `definitions › blocks` or `› relations`, because it is the workspace's own definition like any other. The `default` collection is gone |
| **the base is where you edit** | select the kind under `packages › base` and change it. The floor is never written; the edit lands on the word about it, minted on the spot |
| **it stands in front of its base** | `isa` splices it in wherever the base turns up, so **editing what `block` means reaches every subtype of `block`** — not only blocks that named nothing |
| **the floor wears a lock** | `base` lists with the other packages and says it cannot be written into |

**The widening is the real change.** A default used to reach *plain elements only*; a subtype extended the base directly and never saw it. That was the behaviour nobody would predict — "I changed what a block looks like and my Pump did not move". Splicing at chain resolution fixes it in one place and needs no re-pointing of anything that already exists.

**A package's definition works the same way**, and the floor is a package like any other. There is one rule — *nothing from outside the workspace is written; an edit mints the word about it* — and `base` is not a special case of it. What stays the package's is a definition's **identity**: its name, and what it extends. What it *says* is yours.

**A package is a set of definitions, and the instances it chose to bring.** `graft` already carries blocks, holders and relations out of a package file, so `sysml.json` shipping a block alongside its nine definitions is the shape, not an accident.

**The scope chips went with it.** `default` had no collection left to name, and `packages` was redundant — every definition comes from a package in some sense, and a package's own definitions read in the explorer.

**`outside` is the one predicate.** It answers *did this come from somewhere else* — a package's `from`, or a shipped base id — and `isa`, `writable` and every identity refusal ask it. Splitting it back into "shipped" and "a package's" is what made the two behave differently in the first place.


## What is next

**One tab pattern.** The `fields` tab is the shape every editing tab should read as: banded bodies of labelled lines, and a final `add` line that takes what is being added and commits it. `packages` follows it. The rest do not yet, and `Commit` and the add line still live inside `Fields.tsx` rather than beside the other body primitives. **Pull them out and bring the other tabs into line** — the resemblance should be one thing, not a coincidence.

**Then the translator.** Everything above was clearing the ground for it: a block that is content, a capability surface that says what may hold what, holders for the cross-cutting organization a heading tree cannot carry, and a `source` slot to say where a block came from. The test that settles the body question is still the one to run first — a real README in, out, and diffed.
