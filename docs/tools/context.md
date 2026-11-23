# context

**Diagram tool.** The system, its outside, and the data flows between them.

| | |
|---|---|
| **use case** | the first diagram of an overview: who runs the system, what goes in and out (mndsite part 1, A) |
| **takes** | a system block, its top parts, the externals and actors to show, and the flows with their schemas |
| **writes** | a diagram file: the system with its parts inside, externals around it, each flow joined at a port with its schema |
| **you decide** | which externals matter, what each flow and schema is called, what stays out |
| **surface** | `mnd draw context <selection.json> <out>`, or from a fact answer, pruned: `imports` (a part per unit the library holds, one level, dependency lines; packages from outside are named by `draw`, not written: they are across, externals of the model holding it) (2026-11-20). **Untangled** (2026-11-21): a pair importing each other is one line both ways (`a <-> b`); parts from several packages are written in a group per package, drawn as boxes ranked together; too many lines to follow warns, with the fix |
| **coarse, then in** | draw the system at its packages first (few parts, one line a pair); a part there is its library definition, and **entering it draws its parts with what is across** — no second `draw` (`--unit` asks what a unit imports, not what it holds). One diagram of every module is a reference, not a story |
| **open** | how actors and externals are placed (actors above, inputs left, outputs right, the framework below, as in A) |
