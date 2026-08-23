# Design

**Why mndflow is the way it is** — the vision, the goals, and the reasoning behind the rules that shape everything else. Not what each part does, and not what each word means.

mndflow is for rapidly building and composing descriptive visual blocks into systems models. It is a client-only app. Visual scope is constantly constrained, so a user's perspective is carefully constrained to a narrow subset of the system.

**It stays general on purpose.** Hard rules are only the few that prevent an incoherent project — a block cannot contain itself, and block composition may be restricted. Nothing is forbidden for being unusual, and where a choice could be enforced or left to the user, it is left to the user.


## The Goal

**Rapid, general concept modelling.** Speed, simplicity and generality come first, and a special case never overrides them.

**Nobody should have to learn a notation to use one.** A person describing a system says what the parts are, what they are made of, what flows between them and what has to be true — and that is already the whole base model. The specialised vocabulary and symbols of a standard are a layer somebody chooses to put on top, not a toll on the way in: the same graph reads as plain blocks and flows to one person and as a parametric diagram to another, because what changed is the names and the drawing, never the structure. **A notation that cannot be reached this way is a notation this tool does not do**, which is a better answer than bending the base model until it can.

**The cheapest possible modelling gesture carries meaning.** Somebody who laid ten blocks in a row has already said what happens in what order, without drawing a single arrow. That is what *rapid* has to mean if it means anything.


## Driving Concepts

These key concepts carry most of the weight, and most of the rules below are one of them applied.

- **Keep assumptions to a minimum:** Do not apply organizational rules or constrain the user to a given standard. The tool must be general enough to support various modeling and drafting use cases.
- **Keep representations simple, lightweight and honest:** Anything that can be derived from the layer elements is derived — routes, boundaries, roles, control nodes, messages, etc. User annotation, intervention and manual adjustments should be minimized.
- **The model defines itself as the user builds:** Describing behaviour over a structure is how that structure learns what it needs: the states it can be in, the interfaces it has to offer, the actions it performs. Somebody draws what happens and the definitions fill in behind them, so the work of modelling is spent saying things once rather than restating them in a second notation.


## The Unified Shape

### Everything is a block

Blocks are the fundamental unit of structure in this design, and structure and relationships are the two primary concepts in systems modelling. The following phrase is worth repeating:

> Defining structure with generic repeatable blocks is the central premise of this (and many other) useful methods of system design.

A note, a group, a folder and a reference are placed, dragged, named and laid out alike, each one is a block. Blocks appear as cards in a diagram and are defined as nodes in the workspace graph. The graph defines possible block types and the structure and instances of those types for a given workspace. 

The engine defines a set of base block types (e.g. `structure`, `view`, `resource`, `folder`, `group`, and `note`) that included definitions can readily subtype and customize. Block types (and their supporting engine modules) define how they can be configured, layed out, and how they interact.


### Block structure is the foundation

The relationships between blocks, how they are nested, contained, and arranged is a picture (literally - each diagram can be exported as a "picture") that can describe more than a thousand words. Structure is everything and everything in the workspace tree is structure. 

This design defines structure with blocks. Layered compositions of blocks form the foundation that other higher-level descriptions rest on. Relationships between blocks are only useful if we understand what sits at each end of that relationship. Activities that define interactions between object blocks build off of the roles and characteristics of those blocks and simultaneously enhance them.

**Blocks are illustrated as nested layers of abstractions.** Blocks higher in the tree define more abstract concepts or objects, blocks lower in the tree define more concrete, or specialized concepts or objects. Each layer of the tree is an abstraction (or cross-section) of that part of the system and provides perspective on the structural relationships contained within that "part."


### Primary structural constraints

Where most design decisions are left up to the user, the one exception is that of subgraph containment. `Folder` blocks are a general organizational tool and may contain any type of block. `Structure` blocks MUST contain `structure` child blocks. These blocks may refer to blocks of other types but they do not own or contain them. Similarly, `behavior` and `view` block types maintain specific rules about what types they may contain. 

This contrivance keeps the workspace sub-trees organized and interpretable -- a structure subtree containing a view block may be self-referential and would lose its meaning and interpretability in the model.


### A view is a perspective

`Blocks` define structure and containment, `relations` describe usage and reference, and `views` define **perspectives** on sets of blocks and relations. `Views` include the scope and methods of translation of elment data in their scope to visual formats. Views enable yet another layer of abstraction over **many** structural objects and support building on and enhancing these underlying objects.