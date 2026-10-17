# Redesign plan

**What the model's elements are, agreed 2026-10-15, and the steps to build it.** Blocks carry meaning; everything simpler is a component a block carries, an annotation on a layer, or organization. **This plan goes before anything else, and is finished whole**; next-plan.md is then revised from the results. Once a step is built, it leaves this plan and design.md records it. **Also the handoff document**: *Where things stand* and *Handoff* say how to pick up.


## Where things stand

| | |
|---|---|
| **built, uncommitted** | the first pass (steps 1–9, 12) and the second (steps A–H), 2026-10-16 (see *Built*). Suggested message: *Redesign: interfaces as blocks, relation ends, behaviours, class and entity diagrams, library and model sections, faces by category* |
| **verified** | `npm run typecheck` clean; `npm test` 286/287, the one failure pre-existing (*Known issues*); `npm run lint:css` clean; showcase `check` clean; driven in Edge on the showcase: library then model sections, a definition's parts and a package's types and tags; a definition opened on its own view; the class diagram (fields, a behaviour's signature, stored associations with roles, multiplicities, a composition diamond); the entity diagram (PK/FK, crow's feet); Containers' `https` room port; a label floating clear of region headings; definitions as outlines and relation definitions as wire swatches on the package view; a relation definition's ends in the tray; an empty region from the room's menu; a reload reading the log back |
| **reviewed** | first pass: 10 issues, 8 fixed. Second pass: a high-effort review found 10; 6 fixed (interfaces seated into cells, `flip` keeping ends, a made type and definition sharing an id, `*` drawn as one-or-many, an unsaid flow not read as both, a retype dropping runs to block parts), 4 left (*Known issues*) |
| **under review** | nothing open in *Decide* blocks this plan. Open questions are in *Known issues* and *Decide* (earlier rows 5, 8–10) |
| **next** | the user reviews the second pass; then steps 8 and 11, and next-plan.md is revised from the results |


## Why

| Goal | Means for the model |
|---|---|
| **blocks carry weight** | a block is a visual stand-in for a part, a system or a template of one: something with parts, data or deeper significance. Never decorative |
| **round-tripping code** | named types (enums, aliases) and structs survive a translation both ways; a struct is a block definition, an enum or alias a component |
| **data-flow simulation, later** | typed interfaces are where flows enter and leave; collections hold records; flows are relations between interfaces |
| **mndmap content rows** | a layer can be cut into bands that reorder on the canvas |


## The five categories

| Category | Is | Explorer | Canvas | Model meaning |
|---|---|---|---|---|
| **block** | a part, a system, or a definition (its template): `block`, `reference` | a row; opening one gives its layer | a card | yes |
| **relation** | a meaningful join between two blocks: data flow, dependency. `line` and its subtypes | under the block carrying it | a line | yes |
| **component** | carried by a block, never drawn alone: attributes and values, types, tags, traits, settings, interfaces | tray; named types and tags under their package in the *Library* section (step D) | inside a card only (table, chips), interfaces on its wall | yes |
| **annotation** | explains or organizes a layer: `note`, `label`, `group`, `region`, attached by a tie | none | drawn on one layer | none, except the tags its name gives its members |
| **organization** | arranges blocks: package, `folder`, `grid` | a row | a folder is a box on its parent's layer, its contents drawn inside; a grid opens onto its allocation | none |


## Rules

### Layers

- **a layer is the inside of a block**: its parts, the relations among them, and its annotations
- layers follow composition — system, subsystem, part — never organization
- **composition looks through folders and grids**: a block in a folder or grid in system S is a part of S. A folder never makes a layer
- **a grid opens onto its allocation**: cells and lanes seating blocks, for sequence diagrams and swimlanes. It arranges what it holds; it is a view of organization, not a composition layer
- a group and a region never make a layer either

### Blocks and relations

- a relation is carried by the block whose layer it sits on
- **a relation into a dropped diagram (region stage B) joins only that block's interfaces**, never its inner parts
- a `tie` is a relation kind that attaches a note or label to what it describes and carries no model meaning; every other relation means something

### Components

- **traits**: the engine's fixed table (`TRAITS`), by name. Built 2026-10-14
- **forms**: `text`, `number`, `flag`, `link`, `choice` — the engine's, never blocks
- **types**: named, reusable data shapes — an enum (`Order status`: a `choice` and its options), an alias (`uuid`: a `text`). Stored as data in their package, with a name, description and usages; never drawn on a layer. An enum with methods or fields is a class: a block definition
- **an attribute's `type` names** a form, a type, or a block definition (a link)
- **tags**: named words with a description, stored as data in their package, never blocks
- **interfaces**: a block's boundary, drawn on its wall. No card, no layer, no frame view, no explorer row. **Definable and customizable as blocks are** — interface definitions, settings, values, tags — and **any block may have its own** (user, 2026-10-16): blocks of an interface kind, built in step A
- **collections**: the `has_records` trait — the block holds many records of one type (`records.of`), shown as a table on its card. Simulation later: a flow in appends, a flow out reads. A queue, table or store is a package definition carrying it. Records are values, never blocks

### Annotations

| | Content | Draws as | Attached | Tags |
|---|---|---|---|---|
| **note** | a markdown body | a card with a face | free, or tied | never: it is prose |
| **label** | one line, a name | text only, no card, **no icon** | free, tied, or seated on a line | what it is tied to |
| **group** | a name | a box round its members | encloses | its members |
| **region** | a heading | a band across the layer, between separators | encloses | its members |

- **an annotation's name tags its members**: membership is enclosure (group, region) or ties (label)
- a group has no explorer row; a region neither
- regions stack and reorder by drag

### Folders and groups

| | Folder | Group |
|---|---|---|
| explorer | a row; what it holds nests under it | none: what it holds lists at its level |
| canvas | a box on its parent's layer, its contents inside, as the package view draws it today | a box round its members |
| holds | anything: definitions, usages, documents | blocks of the layer it sits on |
| meaning | organization only | tags its members |
| selected in the explorer | the canvas zooms to the box | — |

### Tags in the tray

- **grouped by source**: stated on the element, carried from its definition, and one group per annotation giving it (*group: Billing*, *label: hot path*)
- **every tag is removable**. Removing a stated tag takes it off the list; **removing a tag given by an annotation removes the membership**, never the annotation: the block moves out of the group or region onto the layer, or the label's tie to it is deleted. A label left with no ties stays as free text


## Base package

**The kinds the engine treats differently, nothing else.** Filed under `packages/defs/src/base/` by category folder; `npm run base` collects them.

| Kind | Category | Folder now |
|---|---|---|
| `block`, `reference` | block | `blocks/` |
| `line`, `tie` | relation | `relations/` |
| `folder`, `grid` | organization | `organization/` |
| `note`, `label`, `group`, `region` | annotation | `annotations/` |
| `interface` | component | `components/` (returned in step A) |

| Left the blocks | Became |
|---|---|
| `text`, `number`, `flag`, `link`, `choice` | engine forms (core `types.ts` `FORMS`) |
| `value` | a package's types, as data |
| `tag` | a package's tags, as data |


## Built

**What the first and second passes made, and where it lives.** design.md and definitions.md record the goal, updated with the second pass; code-homes.md records each home.

| Step | Built | Home |
|---|---|---|
| 2 storage | a package root's `library: { types, tags }`, each `{ id, name, description, … }`, carried by id; a diagram file adds to it with a `library:` key; ops `set_library`, `set_ports`, `set_records`, each written whole; `collection.ts` renamed `sources.ts`; export and collecting share one id remap | core `library.ts`, `sources.ts`, `file.ts` `renamed`, `types.ts` |
| 3 tags | the `tag` base, tag blocks and the tags folder gone; `tag`, `define_tag`; the tray's tags key grouped by source; the explorer's library section | core actions `named.ts`; tray `pairs.ts` `tags`, `components.ts`; explorer `rows.ts` `library_rows` |
| 4 types | the form blocks and `value` gone; `define_type`; `form_of` reads a form, a type or a definition; a new type name in `field` makes an alias of text | core `defs.ts` `form_of`, `library.ts` `typed_as` |
| 5 interfaces | stored in `def.ports` (`{ id, name, type, flow, side, at, alias }`), inherited down the chain; views draw each as a block `owner/port` (`read_through`); a run meets one by `fromPort`/`toPort`; actions `interface`, `port`, and `rename`, `delete`, `note` on interfaces; no interface layer; the tray's interface tab; the SysML translator writes and reads them | core `tree.ts` (`ports_of`, `ports_on`, `port_at`, `port_end`), actions `relations.ts` `ported`; views `through.ts`; tray `components.ts` |
| 6 folders | always inline: a box on the parent's layer, never opened; selecting one zooms to it | core `holders.ts` `is_box`, `inline`, `members_of`; stage `room.ts` |
| 7 annotations | `label` (has *has tie*, text-only style); groups, regions and labels tag their members (`given_of`); taking one off is `unmember`; typing in an empty grid cell makes a label; annotations never list in the explorer | core `library.ts` `given_of`, `defs.ts` `is_annotation`, actions `groups.ts` |
| 8 regions | `region` base (*is region*, `holder.band`); a band spanning the room, heading and separator; reordered by drag on an arranged layer; made from a selection's menu | views `arrange.ts` `spanned`, `block.ts`; stage `moves.ts` `restacked`, `groups.css` |
| 9 collections | *has records* (`allows.records`), `records.of`, `Block.records`; a records table drawn in the card's markdown; a `records:` key in diagram files; `database` and `queue` carry it | views `face.ts` `records_text`, `size.ts` `face_of` |
| data | showcase re-collected: `Order status` and `critical` declared by `library:` keys, `System/4-bands.yaml`, `Data/3-store.yaml`, the `https` room port on `Containers` dropped; catalogue patterns' interfaces moved into `def: ports:`; `requirements.json`'s method a library type; `sysml.json`'s `port` kind removed | `samples/showcase/src`, `packages/defs/src`, `public/packages` |
| A interfaces | **blocks again**, of a kind running the `interface` module (*is interface*), on any block that *has ports*; a usage wears its definition's chain's as `usage/port`, a run meeting one by `fromPart`/`toPart`; edits go home (`stored_of`); `def.ports`, `set_ports`, `Port`, `port_at`, `ported` gone; ops `set_port`, `mark_port` back; YAML interfaces are entries again (`type: interface`); `Containers::https` restored | core `tree.ts`, actions `relations.ts` (`interface`, `port`); views `through.ts`; tray `components.ts` |
| B tie | `tie` filed in `relations/`, a relation with no model meaning | `packages/defs/src/base/relations/tie.json` |
| C faces | `card.face` gains `class` and `text` (a label: name alone); a group dashed, a reference dashed; a relation definition a wire swatch, its head where its lines point; box and band stay the holder shapes, already their own drawing | core `components.ts` `LARGE_FACES`; views `look.ts` (`face`), `derive.ts` (`relation`, `directed`); theme `face.css` |
| C2 colour | on the canvas a definition, or a stand-in for one, is outlined (no ground, its border in its colour, a pill while small); a usage filled. A subtype's shade strays from its parent's, `vary` halving each step | views `derive.ts` (`definition`), `look.ts` `hue_of`; stage `flow.css` |
| D sections | `library` then `model` (core `EDITOR`); the library lists each definition's parts and a package's *types* and *tags* groups; the model usages only; the explorer's bar adds a part to the definition in focus; the open-definition special case in the chain gone | core `sections.ts` `on_side`; explorer `rows.ts` `named_rows`, `chain.ts`, `Explorer.tsx` |
| E definition view | retired: a definition opens on the view its chain names; `views/definition.ts`, core `aspects.ts` and the web app's drop and act rerouting gone | core `navigate.ts` `lens_of`, `kind_at` |
| F class and entity | views `class` and `er` (was `table`); `class_graph` draws stored lines with their ends, *extends* on a class diagram only; the class face lists fields then behaviour signatures under a rule; attribute `key` is `primary` or `unique` (PK, UK, FK); derived attribute links (`links.ts`) gone; `diagrams` ships `er_diagram` | views `classes.ts`, `face.ts` `class_table`; core `types.ts` `KEYS` |
| G ends | `End { multiplicity, role, ownership, navigable }` on `Relation.ends` and `def.ends`; `ends_of` reads the chain, a line saying multiplicity and role; action `end`, op `set_ends`; a definition and a usage never relate (but by a tie), two definitions may; the not-navigable cross half a unit in from its end, words beside each end, diamonds and crow's feet; `diagrams` ships `association`, `composition`, `aggregation`, `dependency`, `flow`; the tray's *from end* and *to end* keys | core `ends.ts`, actions `relations.ts` `end`, `mixed`; views `scene.ts` `heads`, `crossed`, `end_words`; stage `Wire.tsx`; tray `pairs.ts` `ended` |
| H behaviours | *is behaviour* (`block.behaviour`); `diagrams` ships `behaviour` (a layered internal flow), and `sequence diagram` and `swimlane` carry it; `behaviours_of`, `signature_of` from interfaces | core `ends.ts` |
| rest | labels always float aside, every region heading's strip taken; a region made empty from the room's menu; retyping refused across categories (a block never becomes an annotation) | views `float.ts` `floated`; stage `Stage.tsx`; core `defs.ts` `may_retype` |
| data | showcase: Records gain stored associations and a composition with ends, Order a `place` behaviour; `Data/4-schema.yaml` an entity diagram; keys `primary`; Orders' links stored; patterns' interfaces as entries again. Library types minted as `datatype.` ids | `samples/showcase/src`, `packages/defs/src`, `public/packages` |


## Order

**What is left of this plan.** Steps 1–9, 12 and A–H are built (see *Built*).

| # | Work | Done when |
|---|---|---|
| 8 | **mndmap rows on regions** | mndmap's content rows are regions, on its next re-pin of the kit |
| 11 | **regions, stage B** | a diagram dropped into a region draws open; relations join its interfaces across bands |


## Decide

### 1 — Interfaces: how they are stored and defined (answered 2026-10-16: B)

**The problem.** The first pass stores interfaces in `def.ports`, so only a definition declares them. A block whose `type` names no definition of its own — the base `block` — has nowhere to keep one, and `interface` refuses with *define it first*. Called a *plain block* in the code: a usage typed by a base, which is what every block made on the canvas is until somebody types it. **The user finds this arbitrary**, and wants interfaces definable and customizable as blocks are: their own definitions, settings, values and tags, on any block, never a card or a layer.

| Option | Stores | For | Against |
|---|---|---|---|
| **A — interface records on any block** | `Block.ports: Port[]` on any block, definition or usage; `Port.type` names an **interface definition** (a third definition domain beside block and relation, extending a returned base `interface`); a port carries its own `settings`, `values`, `tags`; what it carries moves to its definition (an attribute or a `carries` setting) | keeps interfaces out of `blocks`, as the first pass did; the read-through drawing, `fromPort`/`toPort` and the tray's interface tab stay | a second copy of the block machinery for port instances: settings resolution, values, tags, retype, the door. `Port.type` changes meaning (data type → interface definition) |
| **B — interfaces back in `blocks`, as a component kind** | a block under its owner with base `interface` (definable and extendable), never drawn as a card, never a layer, never an explorer row; a usage wears its definition's by read-through, as before the first pass; runs join the interface block | every block feature comes free: definitions, settings, values, tags, retype, the tray, the door. *Storage is not category* (design.md) already allows it; the old routing code was built for it | undoes step 5's storage (`def.ports`, `fromPort`/`toPort`, `ported`); `is_interface` and every *not an interface* filter come back |
| **C — first pass, plus own ports on usages** | `def.ports` stays; a usage also keeps `ports` of its own | smallest change | interfaces still cannot be defined or customized as blocks are |

**Recommended: B.** The ask — *defined, templated and customized like blocks* — is what a block kind already is; A rebuilds that machinery beside it. Keep from the first pass what still fits: no interface layer or frame view, no explorer row, the tray's interface tab (the definition view's port cards go with it, step E).

| If B | Work |
|---|---|
| core | base `interface` returns (`blocks/`? `components/`?) with *has values* and a new *is port* or a `block.module: interface`; `ports_of` reads interface children again; `is_interface` by base; `def.ports`, `set_ports`, `Port`, `fromPort`/`toPort`, `ported`, `port_at`/`port_end` go; runs join interface ids, a usage's read-through copies `usage/port` as before; `interface` action adds an interface block under any block that *has ports*, never refusing a plain one |
| views | `read_through` copies interface blocks onto usages and rooms as it did |
| sources | `def: ports:` in diagram files becomes interface entries again, or stays as short form for them; `Gateway::routes` paths resolve to the interface block |
| data | `npm run base`, `npm run samples`; patterns and the showcase re-saved; `Containers::https` restored |

### 2 — `tie`: annotation or relation kind (answered 2026-10-16: relation kind)

**The problem.** design.md and definitions.md list `tie` under annotations, and base files it in `annotations/`. The user: *it is clearly a specialized line type the engine reasons about*; the annotations are the cards it connects.

| Option | |
|---|---|
| **relation kind with no model meaning (chosen)** | `tie` is filed with `line` (`relations/`), category *relation*; the annotation table loses the word *joined by `tie`* and gains *attached by a tie*; a relation's *model meaning* column reads *yes, but a tie: none* |
| **its own sixth category, connector** | clearer word, but the categories were closed at five |

Needs design.md *The model* and definitions.md *Bases* changed when answered.

### 3 — Faces for every category (answered 2026-10-16)

**One face per category, from a closed set; colour by role on the canvas only.** Builds as steps C and C2.

| Element | Face |
|---|---|
| block usage | the card, filled in its colour |
| block definition | the same card, outlined on the canvas: no fill, its border in its colour, medium weight, pill corners |
| reference | dashed border, its target's colour |
| entity | `table`: schema rows (type, name, keys) |
| class | `class`: name, fields, then behaviour (*Decide* 15) |
| note | `document`, folded corner |
| label | `text`: no border, fill, icon or marks |
| group | `box`: neutral, dashed, name tab |
| folder | `box`: neutral, solid, folder tab |
| region | `band`: heading and separator |
| interface | a pill on its block's wall, its flow an arrow |
| relation definition | a wire swatch: its name over a short line wearing its ends (*Decide* 14) |

- **colour**: the nearest `family` or `hue` in the chain. Families stay open: any definition may set its own or change its subtypes'. A subtype setting none strays from its parent's shade (`hue_of` keys only from the root today: *Known issues*)
- **role is not colour**: outlined or filled says definition or usage; the family or hue says what it is. The two never mix
- **canvas only, for now**: the tray, the explorer and a host draw every card filled, in its colour
- outlined definitions must not read as groups or folders: those stay neutral and boxed; a definition is coloured and pill-shaped
- a transparent card has no fill to wash, so pick and focus light its border
- **where**: theme `CardFace` (`face.tsx`, `card.css`), views `look.ts` `look_of` (definitions draw through `stand_in` today, as usages do), stage `nodes.tsx` (`CardNode`, `GroupNode`, `NoteNode`)

### 4 — The library in the explorer (answered 2026-10-16)

**Two sections, Library first.** Builds as step D.

| Section | Purpose | Lists |
|---|---|---|
| **Library** | what you build with | per package: definitions in their folders, each definition's parts under it, then *Types* and *Tags* |
| **Model** | what you are building | usages only: the structure tree |

- a definition holding structure no longer lists in both sections; a pattern is a template, so it lives in the library
- opening a definition always gives one thing (step E), so no section decides how it opens

### 14 — Relations: ends and how a relation definition reads

**The problem.** A relation is `from`, `to`, `fromPort`, `toPort` and its type; its ends carry nothing of their own. What it means at each end — how many, in what role, owned or shared — is unsaid, and an entity or class diagram needs it. How it draws is settings: `line.dir`, `line.from_arrow`, `line.to_arrow`; which definitions its ends may join is `allows.ends`. A relation definition draws as a card in the package and definition views, read *as a block definition does*, though it has no layer and no parts. The user: *explicit end multiplicities and properties; how we define relations as cards needs work*.

**Answered 2026-10-16: ends are data** — `Relation.ends?: { from?: End, to?: End }`, and the same on a relation definition's `def`. Meaning lives in the model and survives translation (SysML, an ORM, a schema). Settings (`line.*`) stay drawing only.

**An end's properties:**

| Property | Values | UML / SysML notation |
|---|---|---|
| **multiplicity** | `1`, `0..1`, `*`, `1..*`, or `m..n` | a label at the end; a crow's foot on the `er` view |
| **role** | a name | a label at the end |
| **ownership** | `none`, `shared`, `composite` | nothing, a hollow diamond, a filled diamond, at the owner's end |
| **navigable** | `yes`, `no`, unsaid | an open head; a cross on the line half a unit in from that end; nothing. Unsaid is unspecified, read as both ways: a plain line may be navigable |
| **joins** | the definitions this end may meet | today's `allows.ends`, per end |

**Navigable is not direction.** In UML and SysML one arrowhead stands for three different things, and the relation's kind says which:

| Meaning | Says | Notation | Our field |
|---|---|---|---|
| **navigability** | which end can reach the other (an association) | open head, cross, or nothing per end | `ends.*.navigable` |
| **flow** | which way something moves (a SysML item flow, a data flow) | a filled triangle on the line, or a head at the receiving end | `line.dir` |
| **dependency** | what relies on what (a dependency, a use) | dashed, open head at the supplier | `line.dir` |
| **extends** | generalization | hollow triangle at the general end | a definition's `type`, drawn on the `class` view, never a stored line |

- **`line.dir` stays**: it is the direction of a flow or dependency, never navigability
- **a view draws what it is about**: the `class` and `er` views draw ends (multiplicity, role, ownership, navigability); the internal and sequence views draw `line.dir`. One relation may show both, in different views
- `line.from_arrow` and `line.to_arrow` stay as drawing overrides; unsaid, a view derives a head from the end or from `dir`

**What a relation definition is.** Aligned with a block definition as closely as a line allows:

| | Block definition | Relation definition |
|---|---|---|
| boundary | its interfaces | its two ends |
| members | attributes, values, tags, settings | the same |
| inside | its layer | none: nothing to open |
| a usage may | answer values, rename, restyle | the same, **and narrow an end** (proposed below) |

**Overrides and subtypes (answered 2026-10-16).** A line's name decides nothing and mints nothing, never its type (design.md, *a relation definition says what a line describes, never its name*), so the question is only what a line may change of its ends:

| An end's | On a line | Why |
|---|---|---|
| multiplicity, role | **may say its own**, as a usage answers a value; never minted | it varies per use (each foreign key has its own cardinality); minting would fill a package with near-twins |
| ownership, navigability, joins | **only on a definition**; a line wanting others needs another relation type | they change what the relation *is*: a composition is not an association |
| a new relation type | made only by an explicit gesture (*define from this line*), as a block definition is | never automatically |

- base ships a few relation definitions covering the notation families — association, composition, aggregation, dependency, flow — so most lines need no definition of their own

**How a relation definition reads**, wherever it is not a run:

| Where | Today | Proposed |
|---|---|---|
| explorer | a row (`line`, `tie` marks) | the same, under *Library* |
| tray | a card face | a wire swatch: name, line, both ends drawn |
| canvas, package view | a card, as a block definition | a wire swatch on the same pill footing as a block definition |
| opened | its definition view | nothing to open: it has no layer. Picking it shows it in the tray |

**Lines between definitions (answered 2026-10-16: stored).** The rule *a definition is never linked, only tied* goes (core `relations.ts` `abstract`; design.md *Annotations*, core `model.md` and `schema.md` say it). A line between two definitions is a definition-level relation, an association, carried by the layer it sits on, as any relation is. The `class` and `er` views draw them.

| Follows from it | Proposed |
|---|---|
| **a usage reads nothing through** | a line between definitions states the association; it never copies a line onto each pair of usages. Usages are joined by their own lines, which may be typed by the same relation definition |
| **a definition to a usage** | still refused, but by a tie: a template and an instance never relate (to confirm) |
| **no derived lines** (answered 2026-10-16) | a view draws only stored lines. An attribute typed by a definition shows its type in the table and draws no link; the `table` view's attribute links go. An association is a stored line, and a translator writes one |

**Where the cross sits (answered 2026-10-16).** On the line, half a unit in from the end that is not navigable: it says which end, stays clear of the middle (a name, a seated label, an item-flow triangle), and stays off the end itself, where a head, a diamond or a crow's foot sits. Multiplicity and role labels sit beside the line, never on it, so they do not meet it

### 15 — Behaviour: methods and what they draw as (answered 2026-10-16: B)

**A method is a block under its owner, and its layer is its behaviour.** Which diagram it draws is the view its kind opens: a flow (`internal`), a state machine (a future `state`), a swimlane (`allocation`) or a `sequence`. It is defined, extended and customized as any block, and a pattern can ship behaviours.

- **listed by a trait, *is behaviour*** (answered 2026-10-16): a behaviour may be a block (a flow, a state machine) or a grid (a swimlane, a sequence), so no single base covers them. Base ships `behaviour` (a block) and `sequence` and `swimlane` grids carrying it; the class face lists every child whose kind carries it
- **listed in the explorer**, as the blocks they are, under their owner
- **its signature from its interfaces** (proposed): with *Decide* 1 B a behaviour has interfaces like any block. Its `in` interfaces are its parameters, its `out` its return, each typed. A class face draws `name(param: type, …): type` from them, and a flow into a behaviour is its call. Nothing new is stored

### Before building

**Everything steps A–H touch, answered 2026-10-16: each recommendation taken, except where the row says otherwise.** Rows marked *later* stay out of the swing.

| # | Question | Recommended |
|---|---|---|
| a | **`extends` on the `class` view** is drawn from `type`, a derived line | kept for now as the one exception: it is the chain itself, not an association |
| b | **a line from a definition to a usage** | refused, but by a tie |
| c | **a behaviour's signature from its interfaces** (*Decide* 15) | yes: `in` are parameters, `out` the return |
| d | **the returned `interface` base** (*Decide* 1): its folder and trait | `components/`, a fifth base folder; trait *is interface* |
| e | **an entity's keys** (step F) | an attribute flag `key`: `primary` or `unique`. A foreign key is an attribute typed by a definition, drawn as its type only (no derived lines); the relationship is a stored line |
| f | **enums on the `class` and `er` views** (old *Decide* 7) | no cards: a type is library data, not a block, and drawing one would be derived. It shows as the attribute's type |
| g | **a `state` view** for state-machine behaviours | none: a state machine is an internal flow |
| h | **the second section's name** | *Model* |
| i | **retyping across categories** (old 11) | refused: a block never becomes an annotation or back |
| j | **values on folders and groups** (old 10) | stay off; a translator's origin is `source`, a field any block has |
| k | **unmember from an outer box** (old 12) | keep the refusal |
| l | **making a region** (old 13) | also from the layer's right-click menu, empty; perhaps the rail's tool group later |
| m | **label drawing** (old 5) | **a label always floats aside**, treating a band's heading as taken; never seated on a line |
| n | **samples** | the showcase's class and table layers (`Data/1-model.yaml`, `Records`) gain stored lines where links were derived; `npm run base`, `npm run samples` |
| — | type structure (old 8), regions stage B (old 9), mndmap rows (step 8), kit re-release | later |

### Earlier, still open

| # | Question | |
|---|---|---|
| 5 | **label drawing** | where a free label sits, and how one seats on a line. Today a free label floats aside, so on a layer cut into regions it lands across a band's heading |
| 6 | **definition view** | answered 2026-10-16: retired (step E) |
| 7 | **class cards and diagrams** | answered 2026-10-16: class and entity are two faces and two diagrams (step F), as a Mermaid class diagram and ER diagram are. Open: enums as their own cards on both views; what an entity's keys are stored as (flags on an attribute, an FK being an attribute typed by a definition) |
| 8 | **type structure** | what round-tripping needs beyond `many` and `optional`: maps, unions, generics. Added only as translation needs them |
| 9 | **region stage B** | how a dropped diagram sizes, whether it can be edited in place, and how lines route through band edges |
| 10 | **values on organization and annotations** | the first pass took *has values* off `folder` and `group` (organization and annotation mean nothing); a translator's folder can no longer carry a `source` value. Keep, or give it back |
| 11 | **retyping across categories** | the tray offers `group`, `label`, `note`, `region` as types a block may become (core `defs.ts` `OPEN`); whether a block may turn into an annotation, and back |
| 12 | **unmember from an outer box** | taking off the tag of a group a block sits in through another group is refused (*take it out of that one first*); or move the inner group out with it |
| 13 | **making a region** | only from a selection's menu (*region*) today; whether the layer's menu or a tool makes an empty one |


## Known issues

| Area | Issue |
|---|---|
| **tests** | `packages/views/test/seat.test.ts` › *crosses straight where a group note sits square beside the group* fails on the showcase's `System::Deployment`; it failed before this work began |
| **speed** | every library lookup (`tag_at`, `type_at`, `is_tag`, `library_home`) rescans every package; `uses_of`, `project` and `form_of` call them per element, so large workspaces go quadratic. A per-graph index fits, but `sources.ts` writes libraries while reading them, so it must be built where nothing mutates |
| **picked region** | draws a full outline rather than its band |
| **base colour** | the base `block` sets a `family`, not a `hue`, so definitions extending it with no colour of their own all read alike; the parent-relative shade only shows under a definition that sets `hue` and `vary`. Whether `block` should set them is the user's call |
| **end words** | on the class diagram a role and multiplicity can sit on a line's name or another end's words; placed from the run alone, never against what is drawn |
| **dead parameter** | core `holders.ts` `inline(…, _flat)` is unused since folders always draw inline; `layer_of`, `drawn_in`, `holders_in` and `edges_in` still thread it |
| **empty region, layered** | an empty region made on a `layered` layer lands over a card: layered places a band as a node, never spanning it |
| **grid definitions** | a definition extending `grid` (a swimlane, a sequence diagram) opens on `internal`: `feeds` asks `is_grid`, and a definition is never a holder |
| **tags carried by lines** | core `library.ts` `users_of` counts blocks only; `named.ts` and tray `components.ts` each add a line's tags by hand (review, second pass) |
| **kit** | not re-released; `packages/kit/.types` is stale; mndmap's re-pin meets the new schema — library, interfaces as blocks again (`fromPart`/`toPart`), `ends`, views `class`/`er` (was `table`), sections `library`/`model`, no definition view — besides the renames in next-plan.md *Rough edges* |


## Handoff

| Need | Where |
|---|---|
| **the goal** | design.md and definitions.md (the user's, updated 2026-10-15); this plan's *Rules* |
| **what is left after this plan** | next-plan.md, revised 2026-10-16 from the first pass |
| **where each rule lives** | code-homes.md, rows dated 2026-10-16 for this work |
| **user's standing rules** | never commit, suggest a message; never update docs unless directed (this plan directs its own and next-plan.md's); no tests for unsettled design, but fix existing tests the change breaks; no legacy migrations — on a schema change run `npm run base` and `npm run samples`; consolidate duplicated rules and record them in code-homes.md |
| **verify** | `npm run typecheck`; `npm test`; `npm run lint:css`; `npm run start -s -w @mnd/cli -- check ../../samples/showcase/workspace.json` → `clean` |
| **drive** | the `vitest` skill: `npm run dev`, read the port from the log, Playwright on installed Edge from the scratchpad. Right-click a card's lower body for its menu (its name gives rename only); a folder row unfolds by its mark and never opens; the tray's keys lie below the fold until the tray is enlarged |
| **schema facts** | Graph is `{ root, blocks, edges }` only. Library: `Block.library` on a package root. Interfaces: blocks of an interface kind under their owner, `side`/`at`/`flow`; read through as `usage/port`, met by `Relation.fromPart`/`toPart`. Ends: `Relation.ends`, `def.ends`. Behaviours: blocks whose kind has `block.behaviour`. Records: `Block.records`, `settings.records.of`. Regions: `holder.band`. Attribute `key`: `primary` or `unique` |
| **decisions taken with the user, 2026-10-16** | every *Decide* row 1–4, 14, 15 and *Before building*, as recorded there; types and tags on the package root's `library`; mndmap is not touched |
