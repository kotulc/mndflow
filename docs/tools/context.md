# context

**Diagram tool.** The system, its outside, and the data flows between them.

| | |
|---|---|
| **use case** | the first diagram of an overview: who runs the system, what goes in and out (mndsite part 1, A) |
| **takes** | a system block, its top parts, the externals and actors to show, and the flows with their schemas |
| **writes** | a diagram file: the system with its parts inside, externals around it, each flow joined at a port with its schema |
| **you decide** | which externals matter, what each flow and schema is called, what stays out |
| **surface** | `mnd draw context <selection.json> <out>`, or from a fact answer, pruned: `imports` (a part per unit the library holds, one level, dependency lines; packages from outside are named by `draw`, not written: they are across, externals of the model holding it) (2026-11-20) |
| **open** | how actors and externals are placed (actors above, inputs left, outputs right, the framework below, as in A) |
