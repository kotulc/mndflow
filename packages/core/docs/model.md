# Model
Core object graph model definitions and types. **Two element kinds and no third**: `Blocks` (nodes) and `Relations` (edges). **Definitions group three ways** by what they describe — `blocks`, `relations` and `views` — which is how a file reads and how import dispatches, not three id spaces. Each group publishes a distinct icon.


## Block
A block is the fundamental unit of the workspace graph. Every object is a type of block, may be defined (`def`) and subtyped in package data, and is a member node of the graph.

### Block Module
The engine code that interprets each base block type.

### Block Types
- Folder - An organizational unit: the Workspace, a project, or simple folder
- Structure - The default base block type, and the one every ordinary block is
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
**Three**: `block`, `table`, `matrix`. `block` is **any planar projection**.

**A notation is a definition, never a module.** A view definition names one of the three and configures it, so what a package adds costs data rather than code. There is no notation the engine knows by name — activity, sequence and state were configurations the engine carried, and carrying them was the engine doing a package's job.

**Which view is showing is session state**, kept outside the log. Switching changes what you see and nothing about the model.