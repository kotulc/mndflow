# Model
Core object graph model definitions and types. The model contains three possible graph node elements: `Blocks` (nodes), `Relations` (edges), and `Views` (nodes) with each set of element types publishing a distinct icon.


## Block
A block is the fundamental unit of the workspace graph. Every object is a type of block, may be defined (`def`) and subtyped in package data, and is a member node of the graph.

### Block Module
The engine code that interprets each base block type.

### Block Types
#### Folder - An organizational unit: the Workspace, a project, or simple folder
#### Structure - The default base block type, may contain other structure blocks
#### Behavior - A block that represents actions, activities, or states
#### Reference - A placeholder for a block belonging to a different layer
#### Resource - A file, script, data, image or external artifact
#### Group - A collection within a layer, a set of blocks
#### Note - A descriptive annotation, either a single label or card of text
#### View - A block representing a `pinned` view across a set of blocks


## Relationships
### Relation Module
### Relation Types
#### line - The default base relation type, an untyped association
#### directed - A flow or transition between two blocks, left/right/both
#### reference - A reference to a block external to the current layer
#### tie - A loose association generally reserved for notes or metadata


## View
### View Modules
View modules map a given set of blocks to a view rendered in the canvas --
**three, and closed**: `block`, `table`, `matrix`. The behavior views (`activity`, `sequence`, `state`) are a subset of the standard block view. Each publishes a distinct icon.
