# Tasks
mndflow supports rapid composition of nested/grouped React Flow graphs directly in the user's browser using client side embeddings to quickly suggest and route user actions along prescribed templated workflows. This is a serverless design and does not require a backend greatly simplifying this project.

Workflows define the sequence of prompts peformed in a loop to push the user to expand and refine the current graph. At each step they define a prompt which is varied randomly from the supplied options to give variety (see entry.yaml "welcome") and provide one or more options to supply to the user. The user still has the ability to supply free-form input and this input sets the context for the next step of the workflow and influences (via embedding scores) which template is active. in this way templates can be named/tagged such that they are most likely to be active based on a given user context, and this process will need to be tuned over trial and error so a nice debug output (at the bottom, a new column next to "Actions) for template scoring and matching is required.

Additionally, the retro chat interface should remain as is except the text entry should blend in with the rest of the "terminaL" and the chip options should appear to the right of the terminal and fade in and out based on the user's entered text. 


## Refactor
mndflow will be refactored around a simpler concept:
The apps primary purpose it to serve as a nested/grouped graph editor enabling the user to quickly navigate between layers/views of the "system" graph, to add new object nodes, add relations between nodes, edit node names and content and change their node type. The object explorer sidebar (currently file explorer) will mimic file trees like that in VSCode but with automatically collapsing root node "layers" (currently parent folders) when the user selects a differnt group. The canvas should render groups as semi-transparent nodes with dotted outlines and small icons representing child elements. When the user selects a group or node on the canvas the object is selcted in the object explorer as well and vice versa. when the user clicks on a group the group expands to the size of the canvas and its contents take up the canvas. when the user clicks a node the content/properties/meta explorer (currently file content) displays information about the node.

The apps secondary purpose is to support user context based suggestions/autocomplete to the react flow graph. This is supported with chips that populate the options list (next to the terminal) as the user types. The default chips are set via the template but defaults to standard graph operations.

These suggested chips boil down to creating a new group (folder), adding a new object (node) at the current level, linking existing objects (relations), or refining existing elements in the graph. The names of these elements are based on the user selected use case at the first step. Each template can optionally define them otherwise they default to group/node/relation generic terms. 


