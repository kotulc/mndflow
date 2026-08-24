# Model
Core object graph model definitions and types. **Two element kinds and no third**: `Blocks` (nodes) and `Relations` (edges). **Definitions group three ways** by what they describe — `blocks`, `relations` and `views` — which is how a file reads and how import dispatches, not three id spaces. Each group publishes a distinct icon.


## Block
A block is the fundamental unit of the workspace graph. Every object is a type of block, may be defined (`def`) and subtyped in package data, and is a member node of the graph.

### Block Module
The engine code that interprets each base block type.

### Block Types
- Folder - An organizational unit: the Workspace, a project, or simple folder
- Structure - The default base block type, may contain other structure blocks
- Behavior - A block that represents actions, activities, or states
- Reference - A placeholder for a block belonging to a different layer
- Interface - A block seated on an edge: the one anchor for every port-like thing
- Resource - A file, script, data, image or external artifact
- Group - A collection within a layer, a set of blocks
- Note - A descriptive annotation, either a single label or card of text
- View - A block representing a `pinned` view across a set of blocks


## Relationships
### Relation Module
### Relation Types
- line - The default base relation type, an untyped association
- directed - A flow or transition between two blocks. `dir` is `none`/`forward`/`back`/`both`; which way a *layer* reads is its arrangement
- reference - A reference to a block external to the current layer.
- tie - A loose association generally reserved for notes or metadata.


## View
### View Modules
**three, and closed**: `block`, `table`, `matrix`. `block` is **any planar projection** — it carries lifelines, columns and segments.

**`activity`, `sequence` and `state` are readings, not modules.** A view definition names the block module plus a reading, so the module set stays at three and a notation costs data rather than code:

```
view def "activity"  { module: block, reading: activity }
view def "sequence"  { module: block, reading: sequence }
view def "state"     { module: block, reading: state }
```

**A reading is how you look, never something inferred.** `infer` makes new blocks, once, when asked; a reading projects blocks that already exist. `activity` is the default reading for a behavior layer. See behaviors.md, *The three readings*.