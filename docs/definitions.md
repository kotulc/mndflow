# Definitions

**The canonical vocabulary.** One entry per term, so that a rule written anywhere else can be read
without guessing. Where any other document uses a word, this is what it means.

- **What each part does** → [spec.md](spec.md).
- **Why it is that way** → [design.md](design.md).
- **What is missing** → [tasks.md](tasks.md). **The queue** → [plan.md](plan.md).


## The project

| Term | Means |
|---|---|
| **project** | its graph, its metadata, and the history that built them. Only the **history** is stored; the other two are folded from it. The test for whether something belongs to a project is whether it is in the log — which is why display preferences are not |
| **graph** | the current state: the tree of blocks and the relationships between them. **Derived** — rebuilt by folding the log, never edited in place |
| **metadata** | what a project says about **itself** rather than about its contents: its name and its definitions. Carried by root, which is the project as a block |
| **history** | the log: the ordered steps that were taken, and which of them are currently applied. The one thing that is stored |


## The graph

Two things and no more: **elements**, which are placed and drawn, and **relationships**, which
join them. Everything else describes one of the two.

| Term | Means |
|---|---|
| **element** | anything the graph holds as an object: a block, a note, a group, a proxy, a figure. Placed, drawn, carries fields. Held in `graph.elements` |
| **node** | the graph-theory word for an element. The same thing; `element` is the word the code uses |
| **relationship / edge** | a join between **exactly two** elements. Not an element — it is placed by its ends, drawn as a line, and joins rather than sits. Anything about a *set* is a group |
| **form** | **closed and the engine's.** Which of five an element is — `block`, `note`, `group`, `proxy`, `figure` — or which of two a relationship is: `line`, `directed`. It decides what draws a thing and which rules reach it. A form is earned when the engine must know something about placement or behaviour **and cannot tell from a field** |
| **derived** | a fact the engine works out rather than being told: an **interface** from `side` being set, a **container** from holding blocks, a **reference** from a proxy at an end, a **tie** from a note at an end. Derived does not mean the engine is ignorant of it — only that nobody had to say it |
| **type** | **open and the user's.** The definition a thing names. It subtypes **within** a form, never across one, which is what keeps engine rules off user data. Empty until somebody sets one |
| **the module's word** | what a module calls its elementary block — `block`, and one day `activity`. A property of the **module**, not of the subject matter: a block diagram is built from blocks whether it describes software or a story. Derived, never stored. Not called a *unit*, which is spoken for twice over — by layout, and by a `number` field's unit of measure |
| **vocabulary** | what is left of the old `domain`: the words and starting relations a subject matter supplies. Consumed only by the terminal — see tasks.md |


## Structure

| Term | Means |
|---|---|
| **tree** | the project's core hierarchy: blocks nested inside blocks. The spine the whole project hangs from |
| **structure tree** *(planned)* | the tree of a **structure project**: the things themselves, and the truth about them |
| **behavior tree** *(planned)* | the tree of a **behavior project**: activities, and the actions and states under them. **Only behavior blocks are in it** — a participant appears inside a behavior *layer* as a ref, never as a child |
| **structural** | belonging to the tree, and nothing looser. **Only blocks are structural**, and only through `parent` — a note, a group and a proxy all sit in a layer without composing it, and a relationship joins without composing. Reserved for the tree so that it stays a useful word |
| **parent** | what an element sits inside. The tree is `parent` and nothing else |
| **containment** | being inside something. **Implied by `parent`, never stored as a relationship** |
| **block** | the base element, and the default: one discrete thing the tree is built from. The only structural element |
| **container** | a block that holds other blocks. Derived from what it holds, so it is a way a block *looks*, not a thing it *is* — it is still called a block |
| **interface** | a block sitting on its parent's frame edge. Also called a **port**. Derived from having a side, the same way containment is derived |
| **proxy** | a virtual block standing in for one that lives in another layer, so a relationship can cross a structural boundary. Shows the real block's name. What it stands for is a property of the **appearance** — one thing appearing twice, not two things joined. One per layer per block, and never for a block already in that layer |
| **root** | the block that holds every other. Carries the project's metadata and its definitions, has `parent: null`, and has no frame — a frame is a block seen from inside, and root has no outside |
| **name** | unique among an element's siblings; position in the tree is what makes it unique in the project. An unnamed element is numbered among its own form — `block 1`, `note 2` |

**Definition and usage are the spine**, and the words are SysML v2's, which draws exactly this
distinction: `part def Engine` declares, `part engine : Engine` uses. A **usage** is an element that
names a definition, and mndflow has meant that all along.

**Three ways a usage leans on something else** *(planned)*, none interchangeable:

| Term | Standard | Is | mndflow already has |
|---|---|---|---|
| **part** | SysML v2 `part`; UML part property, composition | a usage the tree **owns** — has-a, and deleting the whole deletes it | `parent`, and nothing else |
| **ref** | SysML v2 `ref part` | a usage that **points at** something it does not own — the participant an interaction acts on | the **proxy**, and the `ref` field form |
| **import** | UML `ElementImport`; SysML v2 `import` | bringing an external **definition** into scope | the path `proj_a9f/def_pump`, and the package list |

- **`part` and `ref` differ by ownership, not by distance.** A part is in the tree; a ref names
  something the tree does not compose. That is the one distinction every notation draws and the
  only one worth a word.
- **A behavior project holds refs, never parts, of the structure it acts on** — which is why its
  tree stays its own and an object block never appears in it.
- **`reference` stays what it already is**: a *relationship* with a proxy at one end, derived and
  drawn violet. A `ref` is the usage; a reference is the line that reaches one.


## Relationships

| Term | Means |
|---|---|
| **reference** | a relationship with a **proxy at one end**, so it reaches something in another layer. **Derived, never a form** — drawing a line to a proxy makes one, and it keeps whatever form it was given. Drawn violet and dashed |
| **tie** | the relationship joining a note to what it describes |
| **direction** (`dir`) | which way its arrows point. Independent of form |
| **leader** | how a tie draws: a dotted line taking no pointer, never routed. A rule about drawing, not about what a tie is |

**Anything joining two elements is a relationship.** A form may draw as something other than a
routed line, but that never makes it a second way to join things — one mechanism, one cascade
when an end is deleted, one list to read them from. The test is simple: **drawn as a line between
two things → a relationship; not a line → a field.** A tie is a line, so it is a relationship.
Membership is not — a group draws a boundary round its members, never a spoke to each.


## Fields and definitions

Descriptive values, and the types that declare them. A field has no identity of its own — it is a
named value carried by an element or a relationship, and never changes what contains what.

| Term | Means |
|---|---|
| **field** | a named, typed value on an element or a relationship. Never structural |
| **value form** | what a field holds: `text`, `number`, `flag`, `choice` or `ref`. Closed and permanent, since a field's form is written into logs |
| **definition** | a reusable subtype, held in `graph.defs`. Carries an `id`, a name, the **form** it subtypes, the fields its usages have, and how they draw. **One record for element and relationship types alike** — a project's relation vocabulary is the definitions of relationship form |
| **usage** | anything naming a definition in its `type`. The definition declares; the usage holds only the values it gives. `part def` against `part` |
| **data structure** | a definition whose fields *are* the structure. Not an element form: a block typed by it is drawn only where somebody places one |
| **membership** | the groups a block belongs to. Held on the block; a group's member list is derived from it, so the two can never disagree. Neither a field nor a relationship |
| **annotation** | an element that describes or organizes without structuring: a note or a group. Drawn on the canvas, never listed in the explorer |
| **group** | the **generic organizational element, local to one layer**: a boundary round a set, meaning whatever its definition says — a swimlane, a region, a package boundary, a trace assertion. It organizes without structuring — never a parent, and no part of the tree. A member that moves to another layer leaves the group |
| **boundary** | the line a group draws. Its members' bounds plus a margin, so it is a fact about what it holds |
| **note** | an element drawn as a card of text |
| **hug** | how far a boundary reaches past its members |


## The canvas

| Term | Means |
|---|---|
| **layer** | a **cross-section of the tree at one block**: that block's immediate contents, seen from within. Not its whole subtree — descending a level is a different cross-section of the same branch. The layer is the current **scope** |
| **layer view** *(planned)* | the **projection** of a layer: what that layer looks like once the rules and packages in scope are applied to it, rendered by one of the three base view modules. The layer is what is being looked at; the layer view is the looking. A layer is scoped to one or more **structures**, its own project's or an imported package's |
| **projection surface** *(planned)* | what a view module must provide to show a layer at all — the frame or its equivalent, the viewport, the chrome, and the place a gesture asks a question. **Per module, never per definition**: a diagram has a frame and a camera, a table scrolls and has neither. Not one of the components, which configure the things *in* a layer |
| **scope** | the layer being drawn. Set by clicking in the explorer |
| **context** | what is selected within the layer. Set by clicking on the canvas |
| **frame** | the border of the open layer, seen from within. The diagram module's answer to the projection surface; a table has no frame |
| **wall** | one of the frame's four sides. **Only the frame has walls** — a card's sides are never named, because a card has no border zone for a gesture to land on |
| **band** | the dimmed margin between the frame and the edge of the panel |
| **card** | a block as drawn on the canvas |
| **chip** | one cell of a container's treemap |


## Where a line meets a card

| Term | Means |
|---|---|
| **seat** | a place a line may meet a border: every 12 units along it, never on a corner |
| **anchor** | a seat a relationship meets that has **no element behind it**. Draws nothing |
| **port** | a seat that **is** an element, because somebody made or promoted one. Same thing as an interface. **The one anchor for every port-like thing**: a proxy port, a full port, an activity pin and a constraint parameter are all interfaces |
| **promotion** | turning an anchor into a port, where it sits. The only way a relationship's end becomes an element |
| **stub** | the short run leaving a seat before the line turns |
| **lane** | the offset given to runs that would otherwise draw on top of each other |


## Layout

| Term | Means |
|---|---|
| **unit** | anything laid out as a whole: a card, a group, or a note. Layout's word; a `number` field's `unit` is its unit of measure, and the two never meet |
| **cluster** | units drawn together by relationships, arranged as one region *(backlog)* |
| **arrangement** | a one-time **action** that lays the layer out and writes down where everything landed: `grid`, `radial`, `across`, `down`. Never a mode, so never "current" |
| **axis** | which way a layer **reads**: `none`, `across` or `down`. A setting, held per layer. Decides the sides a flow relationship takes; says nothing about where cards go. **(planned)** Also the fallback the implied order is read along |
| **diagram** | **what a layer looks like drawn on the canvas** — the picture, not a module. Every view module that draws on the canvas produces one |
| **structure project** *(planned)* | a project whose blocks are the truth: parts, fields and the relations between them. Its layer views are **block**, **table** and **matrix**, block being the default |
| **behavior project** *(planned)* | a project that scopes to one or more structures and describes what happens over them — activities, actions and states as its own blocks, holding **refs** to the participants. An overlay, never a second copy. Its layer views are **activity**, **sequence** and **state**, activity being the default |
| **structure block** / **behavior block** *(planned)* | a block, qualified by which tree it lives in. Only used where the two must be told apart; a block is a block |
| **explicit order** *(planned)* | sequence stated by a **directed relation** between two blocks. Read first, and it wins |
| **implied order** *(planned)* | sequence read from where blocks sit along the layer's **axis** — left to right, or top to bottom. The fallback where no directed relation says otherwise, so laying things out in a row states an order without drawing an arrow |
| **resting layout** | what a render runs: placed elements stay, unplaced ones fill around them |
| **rank** | one step along the axis. Things pointing at each other sit in successive ranks |
| **hard constraint** | something honoured **by** an arrangement, which survives it. Ports and walls, and nothing else |
| **retained placement** | something an arrangement **replaces** rather than honours, and which is yours again afterwards. Element positions |
| **rigid in shape, not size** | a unit keeps who sits beside whom; the distances are layout's |


## History

| Term | Means |
|---|---|
| **step** | one user action and every mutation it made, plus whether it is `applied` or `reverted`. One gesture is one step, and one edit of a field is one step — not one per keystroke |
| **mutation** | a single change within a step. The smallest thing the fold knows how to apply |
| **the log** | the ordered list of steps. The only thing stored, and the source of truth |
| **fold** | **rebuilding the graph from empty by replaying every applied step, in order.** Runs after every change, so the graph can never drift from the record that produced it. This is why undo needs no inverses: it flips a step to `reverted` and folds again |
| **undo** | flipping the last applied step and folding again. Redo re-applies it |
| **derived** | worked out rather than stored — seats, routes, boundaries, containment, a group's member list. See *the graph* above for the forms it decides |


## The workspace *(planned)*

Nothing here is built — see [design.md](design.md) under *Where this is going*.

| Term | Means |
|---|---|
| **workspace** | the projects currently loaded, and their order. Held apart from all of them: neither project data, nor a display preference, nor what the terminal has learned |
| **module** | **engine code.** An *open* module publishes components; a closed one simply does its job. Layout, routing, rules, constraints and each view type are modules |
| **component** | a capability an open module offers, switched on and shaped by a definition. Configured **per definition, never per element** |
| **view module** | the engine code behind one way of presenting: `diagram`, `table` or `matrix`. Three, and closed |
| **structure** | ordinary description, never a classifier: a project that owns its objects. What things there are, and how they are composed and connected |
| **behavior** | the same, for a project that owns its actions and holds proxies of the participants: what happens, in what order, under what conditions |
| **view** | a project holding **diagrams**, arranged in folders of its own. Nothing about it ever enters the project it reads |
| **diagram** | one presentation: a block whose definition names a view module, holding proxies of what it shows. A table and a matrix are the same thing drawn differently |
| **package** | a project whose elements are **definitions**. Data: it costs no code, and it must be useful with portable presentation alone |
| **extends** | the definition another refines, by reference. **Subtyping, never overriding** — a package's own definitions are never altered. One parent; fields union, components merge per key, and a rule naming a definition reaches everything below it |
| **translator** | code that reads a project and emits an **artifact** — source, a drawing, a standard's file. One way, and it never writes back |
| **artifact** | what a translator emits. Not a graph |
| **asset** | a stylesheet, renderer, layout law, gesture map or validation hook, held in the repo and added at **build time** |
| **preset** | a coherent set of component choices, shipped and tested together. Components configure independently; arbitrary recombination is possible and unsupported |
| **constraint** | a check bounding a thing in itself. One kind: `required` |
| **rule** | a check governing how things interact. Four kinds: `ends`, `holds`, `degree`, `match` |
| **page** | branding, navigation and the workspace. The shell everything else sits in |
| **envelope** | what a file travels inside: `{ schema, id, graph, meta }`. **The base is what cannot be ignored** — drop any of it and the file cannot be read, resolved or drawn correctly |
| **meta** | the free-form, unversioned part of an envelope. **Safely ignorable**: if dropping it changes what the project *is*, it does not belong here. Never display preferences, never the log |
| **schema** | which shape a file is, as `"1.1"`. Major must match; a higher minor is readable. The only field that changes how a file is read |
| **checkpoint** | the graph cached at one step, so a fold need not replay from zero. Internal — nobody asks for one. Also what an imported file becomes. Carries the count of steps before it, which is what makes `version` survive truncation |
| **steps** | how much work is in a project: every step ever taken, carried in `meta`. `checkpoint.at` holds the count before it and the rest is derived, so nothing tallies while you work. **Not a version** — it orders nothing across two copies that diverged |
| **project id** | which project a file is, minted once and kept for life. What a cross-project reference points at, so renaming a project or its file breaks nothing |
| **state hash** | a short hash of the canonical serialization, telling apart two copies with the same step count. **Computed on load, never stored** — a written-down hash lies as soon as somebody edits the file by hand |
| **snapshot** | a project as of a step, written out. An export, and a file |
| **bundle** | a snapshot carrying the external projects it references, so it stands alone. Done at export; inside a workspace everything is live and nothing is bundled |
| **merge** | combining two divergent logs. **Out of scope** — git's line merge, or nothing. `check.ts` reports the wreckage of a bad one rather than preventing it |
| **external proxy** | a **proxy** whose target lives in another project rather than another layer. Target is `{ project, element }`, both by id, so renaming or moving either flows through untouched. Always live; to fix a version, bundle |
| **breaking change** | the deletion of a block some proxy stands for — **the only** change reported to the user. A rename or a move is not one |
| **action surface** | the actions the engine publishes as data — name, arguments, when each applies, and the mutations each returns. **An action returns mutations rather than applying them**, which is what makes it rankable, hostable and testable. The seam both the page and the terminal work against |
| **figure** | a placed, drawn element the engine only positions — what it *is* comes from its `type`, and a module draws it. An activity's fork, decision or initial node. Never in the explorer, and **takes no interfaces** |

**Three words are deliberately absent.** *Namespace*, because every project already scopes its own
ids and a property shared by all of them is not a sort of thing. *Kind*, because what a project is
is answered twice over — by what it owns and by the packages it draws on. *Structure* and
*behavior* **as classifiers**, for the same reason; they survive above as ordinary description and
the engine never reads them.

**The first word is what it is, the second is the thing:** block tree, block diagram, activity
diagram. **`block` names the element throughout** — an activity diagram is built from blocks too —
so the qualifier carries the meaning.


## Rules, constraints and components *(planned)*

Nothing here is built — see [design.md](design.md) under *Constraints and rules*.

**Declared on a definition, holding over every usage of it**, and reaching that subtype's fields,
its interfaces and the relationships at it. **A rule naming a definition means it or anything
below it**, so an imported standard reaches what you subtyped from it.

**They advise while modelling and refuse only at translation.** A model is legitimately
unfinished, so a violation is a note in the tray; a translator asks the same checks at the moment
it emits and declines to write a non-compliant file.

| Kind | Says | Example |
|---|---|---|
| **`required`** | which of a usage's fields must carry a value. The one **constraint**: it is about a thing in itself | a requirement must have an `id` |
| **`ends`** | which definitions may sit at each end of a *relationship* definition — `from` and `to`, each a list — and optionally which **port direction** an end must be | `satisfy` runs from a design element to a requirement; a flow leaves an `out` and enters an `in` |
| **`holds`** | which definitions this one may contain, as children in the tree | a package holds blocks; a lifeline holds occurrences |
| **`degree`** | how many relationships may meet a usage, as least and most, counted `in` and `out` separately. Either bound may be absent for "no limit" | an initial pseudostate takes no incoming transition: `in: [0, 0]` |
| **`match`** | field names that must **agree across a relationship's two ends** — the one comparison, and the reason no expression language is needed | an item flow's `type` matches the `type` of both ports it runs between |

**Five, and nothing composes**: every one is a lookup, a count, or a single fixed comparison.
There is nothing to parse and no operators. **What the five cannot say is a `validate` hook** —
code a module supplies, written by somebody who has already accepted writing code.

| Term | Means |
|---|---|
| **`validate` hook** | a module's own check, in code, for what the five kinds cannot express. The deliberate escape hatch, and deliberately not a language |
| **`components`** | the field on a definition holding one entry per component, keyed by component name. **The one place the schema grows** — a new capability adds a key rather than a field |
| **`card`** | the component drawing a usage: which **card layout**, its **shape**, where its label sits, and `shows` |
| **`style`** | the component colouring a usage: a **style set** by name, over the portable typed fields that render without one |
| **`view`** | the component on a diagram's definition: which **view module**, and its arrangement |
| **card layout** | one of the standard ways a card is composed — `name`, `type` (label and subtype chip), `fields`, `compartments`, `icon`, `shape` (a shape drawn in the box, label beneath). **Open**: extended by a code change, additively |
| **shape** | what is drawn inside a card's box: `rect`, `round`, `diamond`, `ellipse`, `hex`. The engine always places a **rectangle** — every seat, route and port reads the box — so a shape changes what is drawn and never where anything attaches |
| **label placement** | `inside`, `below`, or `none`. A diamond's middle is narrow, so its text usually sits under it |
| **`shows`** | which of a usage's fields draw on its card, in that order. Absent draws none: a card with eight fields on it is unreadable |
| **`names`** | what other vocabularies call a definition, keyed by vocabulary. `name` is what the user reads and types; these are what an export writes |
| **style set** | a named collection of styles shipped as an **asset**, referenced by a definition. Absent, a usage still draws on its portable fields |

**Per definition, never per element.** Every usage of a subtype is configured alike; where two must
differ they differ in what they **hold** and in their **fields**, both of which are content.

## The surface *(planned)*

The full enumeration is in [actions.md](actions.md).

| Term | Means |
|---|---|
| **action** | something somebody meant and could say — create, relate, group, describe. Named, ranked and listed everywhere |
| **adjustment** | something positional and unsayable — where a card rests, how big a note is, where an interface sits on its edge, which wall an end leaves by. Four of them, gesture-only, never named or ranked. **A diagram declares which it accepts**, and may accept none |
| **navigation** | an action writing **no mutations** — `open`, `up`, `reveal`. One property, three consequences: no step, nothing to undo, and a text interface never offers it |
| **page action** | the shell's rather than a project's: export, import, new, undo, redo, and the workspace's |
| **sayable** | whether an input method taking words can reach an action, **derived** from its argument types rather than declared. A position cannot come from a sentence |
| **`when`** | whether an action is worth offering here at all. Decides what is **shown** |
| **`check`** | why an action would refuse, in words. Decides what happens **on commit**, and never what is shown — it cannot be answered until the arguments are in hand |

## The SysML map *(planned)*

SysML is a **translation layer** over the general model, never a shape the model bends to. This
table is what makes that claim checkable: every SysML concept mndflow targets, and what it is
already made of. Nothing in the right column is a special case.

| SysML | mndflow | |
|---|---|---|
| block | **block** | the base element |
| part property | **block** with a `parent` | the tree is composition |
| reference property | **`ref` field** | points without drawing a line |
| value property | **field**, form `number`/`text`/`flag` | `unit` where it has one |
| value type / data type | **definition** | fields *are* the structure |
| enumeration | **definition** + `choice` field | `choices` on the field |
| block definition (`part def`) | **definition**, form `block` | declares fields and how they draw |
| stereotype / profile | **definition** | a module ships a notation by shipping definitions |
| proxy port | **interface** | typed by an interface definition |
| full port | **interface** holding children | derived, the way container-ness is |
| pin | **interface** on an action | `flow` in/out, typed by a data definition |
| constraint parameter | **interface** on a constraint block | so a binding is an ordinary relationship |
| binding connector | **relationship**, form `line` | both ends are interfaces |
| connector | **relationship**, form `line` | |
| item flow | **field on a `flow` relationship** | a `ref` to the definition that travels |
| association / composition | **relationship** + definition | direction and ends from the definition |
| requirement | **block** + `id` and `text` fields | no new anything |
| satisfy / verify / derive | **relationship** + definition | dashed, hollow head, from the definition |
| action | **block** in a behavior project | |
| control node (fork, join, decision, merge, initial, final) | **figure** | the engine places, the module draws |
| object node | **interface** or **block**, by where it sits | |
| control flow / object flow | **relationship**, form `flow` | |
| state | **block** in a behavior project | doing against being is the vocabulary, not the shape |
| transition | **relationship**, form `flow` | trigger, guard and effect are its fields |
| region / composite state | **container**, or a **group** | nesting where structural, boundary where not |
| swimlane / partition | **group** | band shape is the module's rendering |
| lifeline | **group** (partition), projected | |
| message | **flow** crossing a partition, projected | |
| combined fragment (`alt`, `par`, `loop`) | decision, fork, cycle | already in the flow graph |
| trace assertion (`neg`, `assert`) | **group** with a definition | a claim about a set, so not a relationship |
| package | **container**, or a **group** | |
| actor | **figure** | |

**What does not translate**, and is accepted: inline combined-fragment notation for trace
assertions — the claim survives as a typed group, the enclosing bracket does not — and lifeline
left-to-right order, which is presentation and belongs to the view.


## What the module walk settled

Every notation above run against the model, to find out whether the closed sets could be frozen.
**They held**: five element forms, five value forms, and no additions. The relationship forms
later *shrank* from four to two, which is the same result read from the other side.

| | |
|---|---|
| **One shape, many views** | Every project is a graph of objects with views over it. `structure` and `behavior` describe what one holds; neither is a classifier the engine reads |
| **Views are editable** | A view publishes gestures and the action surface maps them to mutations. Nothing is generated-only: people sketch in a notation before the model behind it exists |
| **Every port is an interface** | Proxy port, full port, pin, parameter. Told apart by `type` and by whether they hold children |
| **Parametrics is not a hard case** | A parameter is an interface, so a binding is an ordinary relationship and `from`/`to` already reach it |
| **Requirements need nothing new** | Elements with fields, related by typed relationships |
| **A lifeline is a behavioral edge** | What a frame is to a block structurally: an occurrence on one is an **interface**, a message is a relationship between two, and order down it is `at` along an edge |
| **A data structure is a definition** | Not a form. It never clutters the tree, and it is drawn only where somebody places one |
| **A group is the generic set** | Which is why a relationship never needs more than two ends |
| **One definition record** | Element types and relationship types are the same thing, differing in the form they subtype |
| **Definitions have ids** | Typed-by and points-at are one operation, and a rename orphans nothing |

**Configuration, not two dozen modules** is the result that matters: a notation costs a package,
and at most one engine capability beside it.
