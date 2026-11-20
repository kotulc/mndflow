# flow

**Diagram tool.** A chain of steps, with data on its edges.

| | |
|---|---|
| **use case** | how something happens, which may seed a presentation (mndsite: build a site, release) |
| **takes** | a chain from `calls` or `workflows`, the steps to cut into sub flows, and edge labels from `data` |
| **writes** | a diagram file: each step a block, each edge a line carrying its data, sub flows as uses entered by *into* |
| **you decide** | where the flow starts, where sub flows begin, which steps to drop |
| **surface** | `mnd draw flow <selection.json> <out>` |
| **open** | how a flow with branches is laid |
