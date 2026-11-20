# swimlane

**Diagram tool.** Who does what, in which phase.

| | |
|---|---|
| **use case** | this repo's source folder handed from disk to the canvas: the CLI gathers it, core collects, checks and folds it, the web app draws it (docs/tools/examples/collect-handoff.json) |
| **takes** | lanes (who), phases (when), each step in its cell, and the lines between steps carrying what is handed over |
| **writes** | a diagram file of kind `swimlane`: `lanes`, `phases`, steps with `cell: [phase, lane]`, relations |
| **you decide** | the lanes and phases, which steps matter, what each handoff is called |
| **surface** | `mnd draw swimlane <selection.json> <out>` |
