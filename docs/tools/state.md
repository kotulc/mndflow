# state

**Diagram tool.** How one thing changes: its states, and the events that move it between them.

| | |
|---|---|
| **use case** | this repo's navigation: the canvas between a section's map, a layer entered from it, a registry and a presentation playing (docs/tools/examples/navigation.json) |
| **takes** | the states in order, the first after a `start` mark, and the transitions between them, each named by its event, a guard in brackets |
| **writes** | a diagram file of kind `state`: states as blocks, transitions as relations by the kind |
| **you decide** | which states are worth naming, the event words, where a composite state is cut |
| **surface** | `mnd draw state <selection.json> <out>` |
| **later** | a `states` fact tool reading a status field's literal values and the assignments that change it |
