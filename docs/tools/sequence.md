# sequence

**Diagram tool.** Who talks to whom, in what order.

| | |
|---|---|
| **use case** | a flow where the order of messages is the point (mndsite part 3: edit and preview, 9 steps from saving a page to seeing it) |
| **takes** | participants (people, parts, externals) and the messages between them, in order, from `calls`, `entries` and what you add |
| **writes** | a diagram file: a grid read as time, each participant a lane, each message a numbered step with its words |
| **you decide** | the participants, the order, the words of each step, and steps code cannot show (Next reloads when `pages/` changes) |
| **surface** | `mnd draw sequence <selection.json> <out>` |
| **open** | how a step that waits or repeats (each change) is shown |
