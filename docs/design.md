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
- **The model defines itself as the user builds:** Saying what happens over a structure is how that structure learns what it needs: the states it can be in, the interfaces it has to offer, the actions it performs. Somebody draws what happens and the definitions fill in behind them, so the work of modelling is spent saying things once rather than restating them in a second notation. **This is an intent, not yet a mechanism** — the inference that used to carry it was cut, and what replaces it is undesigned.


## The Unified Shape

### Everything is a block

Blocks are the fundamental unit of structure in this design, and structure and relationships are the two primary concepts in systems modelling. The following phrase is worth repeating:

> Defining structure with generic repeatable blocks is the central premise of this (and many other) useful methods of system design.

A note, a group, a folder and a reference are placed, dragged, named and laid out alike, each one is a block. Blocks appear as cards in a diagram and are defined as nodes in the workspace graph. The graph defines possible block types and the structure and instances of those types for a given workspace. 

The engine defines a set of base block kinds (`block`, `folder`, `resource`, `reference`, `interface`, `group` and `note`) that included definitions can readily subtype and customize. Block kinds (and their supporting engine modules) define how they can be configured, laid out, and how they interact. **The first three are open** ~~ a block is retyped among them freely, because they differ in what they are for and in nothing a gesture would have to invent. The rest are derived: one is arrived at by making one, and subtyping such a kind means making one and customizing it rather than retyping something else into it.


### Block structure is the foundation

The relationships between blocks, how they are nested, contained, and arranged is a picture (literally - each diagram can be exported as a "picture") that can describe more than a thousand words. Structure is everything and everything in the workspace tree is structure. 

This design defines structure with blocks. Layered compositions of blocks form the foundation that other higher-level descriptions rest on. Relationships between blocks are only useful if we understand what sits at each end of that relationship. Activities that define interactions between object blocks build off of the roles and characteristics of those blocks and simultaneously enhance them.

**Blocks are illustrated as nested layers of abstractions.** Blocks higher in the tree define more abstract concepts or objects, blocks lower in the tree define more concrete, or specialized concepts or objects. Each layer of the tree is an abstraction (or cross-section) of that part of the system and provides perspective on the structural relationships contained within that "part."


### Primary structural constraints

Where most design decisions are left up to the user, the one exception is that a **view holds references and never parts**. A view looks at a set of blocks; owning them would make a structure subtree that contains a view of itself self-referential, and it would lose its meaning in the model.

There is no structure/behaviour split. **A block is a block** — what it *is* comes from its definition, and what it may hold is a rule a vocabulary states, never one the engine imposes. Saying that a doing-block may not contain a being-block was a distinction the engine had no business making.


### A view is a perspective

`Blocks` define structure and containment, `relations` describe usage and reference, and `views` define **perspectives** on sets of blocks and relations. `Views` include the scope and methods of translation of elment data in their scope to visual formats. Views enable yet another layer of abstraction over **many** structural objects and support building on and enhancing these underlying objects.