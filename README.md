# mndflow
A Generative system design and modeling interface built with React Flow. 

Supports interative diagram-first hierarchical system design and specification development.


## How it works
The user interacts with a chat agent (top) to develop visual system specifications (bottom)
The concept system is illustrated with a project file structure (left) and the visual graph explorer (right)

The chat agent prompts the user to build the project context and determine the most suitable architecture
The chat agent develops lists of features/specifications/requirements to outline and refine the system
The chat agent iteratively refines the user's concept through decomposition and abstraction depicted visually

New modules (nodes) are added to the working system graph and project (documentation/specification) file structure
System modules are logically grouped and automatically composed as the system specs are refined and complexity is added
Abstraction (grouping of nodes) prevents the file explorer or visual canvas from becoming too cluttered

The final product is a structured collection of docs and specs and all related diagram artifacts
Eventually support flow, class, swimlane, and activity diagram types.
