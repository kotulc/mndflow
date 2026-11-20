# schema

**Fact tool.** What shape a piece of data is.

| | |
|---|---|
| **use case** | a data definition for the library, and the schema on a port (mndsite part 2: Config and its sections) |
| **reads** | types where the code has them; in untyped JS, a defaults literal (`DEFAULTS`), the validators' allowed values, and a sample file (`mndsite.yaml`) |
| **returns** | a definition: its fields, their types or allowed values, defaults, what is derived, and references to other definitions |
| **today** | apps/ts `read.ts` (`Def`, `Field`, `Datatype`) for typed code; untyped JS not read |
| **surface** | `mnd fact schema <source> --of <name>` |
| **feeds** | class, ports on context, flow and dataflow |
| **open** | how far to trust a sample file over the code |
