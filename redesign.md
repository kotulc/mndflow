# Working re-design: modules and components

*Proposed, not adopted. Held apart from [design.md](design.md) until it is settled, then it either
graduates into design.md and spec.md or is discarded. Nothing here is built.*

**The aim** is to decouple modules so that standards (SysML, UML) and advanced views (state,
parametric) are extensions rather than engine changes — isolating each module against side effects,
giving the schema a foundation that stops moving, and letting packages, components and extensions
be built in parallel.


## The words

| | Is |
|---|---|
| **module** | **code**, belonging to the engine. Some are open to configuration, and those implement and support components |
| **component** | a configurable capability a module provides, switched on and shaped by a definition |
| **view** | a projection over one or more block structures: it **presents proxies** of blocks that live in them |
| **view module** | the engine code behind a base view type — **diagram, table, matrix** — configurable by its own definitions, exactly as a block is |
| **package** | data: definitions for blocks, relations **and views** |

**The base diagram view is the block tree as it stands today.** Every other diagram view is a
re-configuration of it rather than a new thing.


## The base sets

*Settled.* Everything else in this document is still proposal; these are agreed.

**A form is earned when the engine must know something about placement or behaviour and cannot
tell from a field.** If it can tell, the fact is **derived** — and it governs the engine just the
same. Derived does not mean the engine is ignorant of it; it means nobody had to say it.

### Elements — five declared, two derived

| Declared | The engine must know |
|---|---|
| `block` | the tree, containment, and **it takes interfaces** |
| `note` | least size, tied by leaders, a layout unit, never in the tree |
| `group` | bounds from its members, membership cascade, a layout unit, never in the tree |
| `proxy` | resolves to another layer or project, never nested into, cleaned up when its target goes |
| `figure` | drawn by a module, outlined as a rectangle, **takes no interfaces** |

| Derived | From |
|---|---|
| interface | `side` is set |
| container | it holds blocks |

Unchanged in membership. What sharpened is `figure`'s reason: not merely *not mine to draw* but
**takes no ports**, which is a rule the engine enforces — and enforcing something is what earns a
form.

### Relations — two declared, two derived

| Declared | The engine must know |
|---|---|
| `line` | the base. Its ends are plain seats, and the layer puts them where the path wants |
| `directed` | it goes one way, so its ends take the sides the layer's axis gives them, and it biases placement |

| Derived | From |
|---|---|
| `reference` | an end is a **proxy** |
| `tie` | an end is a **note** |

Down from four declared. **`directed` is what was called `flow`**, named for the thing the engine
actually reasons about — one-wayness — rather than for a domain word. `dir` still decides which way
the arrowheads point, exactly as before. **`assoc` was never engine-visible**: it is a weaker
mention drawn lighter, which is presentation, so it becomes a definition subtyping `line`. **`tie`
derives the same way `reference` does**, since a note only ever relates by being tied.

A relationship therefore toggles between two states rather than cycling three, with meaning and
style coming from its type.

### Views — three declared

| | The engine must know |
|---|---|
| `diagram` | placement on a canvas, routing, layers to descend into |
| `table` | rows and columns of fields |
| `matrix` | two axes crossed, relationships in the cells |

The explorer is not among them: it belongs to the shell, is always present, and is not a
project-level view.

### What this costs

- **Enforcement, for the first time.** *Figures take no ports* is a rule the engine applies rather
  than advises, so the `interface` action refuses on a figure.
- **A proxy shows its target's interfaces and owns none**, which needs saying beside the rule
  above or the two read as contradicting each other.
- **A migration**: existing edges heal `flow` → `directed` and `assoc` → `line` with a definition,
  at the door, the way `kind` → `form` already heals.


## Elements as entities

Elements are entities; components are configuration attached through the definitions that subtype
them. **A subtype keeps the placement and behaviour of the base form it subtypes** — configuration
changes what a thing looks like and what is valid on it, never how the engine places it.

**Everything is a block or a relation.** Those are the two fundamental units, and the fixed object
types are all blocks of some kind — several of them derived rather than declared: ports and
interfaces, containers, proxies. A custom block inherits one of the fixed behaviours and adds
optional component configuration.

*(Superseded by* The base sets *above: two declared, two derived.)*

### Example subtypes

| | Base | Components |
|---|---|---|
| decision | block | outline style, svg layout |
| swimlane | group | segment style, container layout |
| lifeline | block | edge layout |

### Example components

- **block**: label, layout, body, style, icon/svg, slots, interfaces, size, relations, fields
- **relation**: label, style, icon, direction, anchors


## The definition schemas

**A block definition**: `name`, `icon`, `element`/`form`, `names`, then its block components.

**A view definition**: `name`, `icon`, `module`, `arrangement`, `parent-package`, `style-ref`.

The two are the same idea one level apart — a block definition configures the components of an
element, a view definition configures the components of a diagram.


## Rules and constraints are components

Both become configurable components with modules of their own:

- **validation rules** govern what block structures, local interactions, slots and parts are valid.
- **constraints** bound what is possible, per component and per field.


## Packages

| | |
|---|---|
| included | flow, requirement, activity, sequence |
| later | parametric, state, UML/SysML |

**A package is data, but enabling one is sometimes an engine change.** Sequence needs an
arrangement — columns by lifeline, order down each — that no component implements yet; activity
needs the svg layout. So each of those is *one engine capability plus a package*, and the two ship
together. Saying this plainly is what stops "just write a package" being promised and not
delivered.


## Settled since

- **A `part` is a field**, the way SysML's part property is. No named positions inside a block, and
  containment is untouched.
- **Rules and constraints are declared on a definition and hold over every instance of it**,
  reaching all of that subtype's local properties: its fields, its interfaces and the relationships
  at it.
- **A view project is a folder structure of diagrams, tables and matrices**, so those *are* objects
  — in the **view** project's tree, never in a structure's. That is what lets views be grouped by
  behaviour, requirements and so on. A diagram is a block whose definition names a view module, and
  what it projects it holds as proxies; a folder is an ordinary block. So *everything is a block or
  a relation* holds here too, and the earlier rule stands unbroken: nothing about a view enters the
  object tree it reads.
- **Components are configured per definition, never per element.** Every usage of a subtype shares
  them. `Element.color` was the one per-usage exception and has been **removed** — nothing read it
  and nothing set it, so it was written back out on every save forever.

## Still open

- **Package extension** — a package referencing another and overriding definitions. Deferred, and
  it likely wants an `extends` on a definition when it lands: an overriding definition keeps its own
  id and declares what it refines, so a picker prefers it while nothing that already points at the
  original is silently redirected. Shadowing by name stays impossible.
- **Where component configuration lives on a definition** — one open bag keyed by component, or
  named fields. Deferred until the component set is known.
- **The isolation rule.** Components share one `Element` and one log, so separate code is not
  separate state. The promise needs: *a component owns its configuration key and reads no other's.*
