# dataflow

**Diagram tool.** Where one datum comes from, what changes it, and who reads it.

| | |
|---|---|
| **use case** | following one piece of data through the system, which may seed a presentation offered from the part that makes it (mndsite part 2: Config) |
| **takes** | a datum from `data --of`, its sources, the parts that change it, its readers grouped by the agent |
| **writes** | a diagram file: parts as blocks with ports, the datum and its forms on every edge, sources and readers at the ends |
| **you decide** | which datum is worth tracing, how readers are grouped, the order its steps are presented in |
| **surface** | `mnd draw dataflow <selection.json> <out>` |
| **open** | a datum read by many: when readers group by half, part or folder |
