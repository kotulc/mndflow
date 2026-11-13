# tree

**Diagram tool.** The system's parts by containment.

| | |
|---|---|
| **use case** | the overview model: primary parts expanded, secondary boxes (presentations, information) minimized (mndsite part 1, E) |
| **takes** | units from `units`, the groups the agent names, which boxes are primary, the presentations to offer |
| **writes** | a diagram file: the containment tree, a presentations box beside the system box, collapsed boxes marked |
| **you decide** | how units group into parts, their names, which are primary, which flows seed presentations |
| **surface** | `mnd draw tree <selection.json> <out>` |
| **open** | how a collapsed box is stored and opened |
