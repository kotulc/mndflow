# data

**Fact tool.** What passes along a call, or is read and written.

| | |
|---|---|
| **use case** | the labels on a flow's edges and a port's schema (`Config`, `md tree`, `site.config`); with `--of`, one datum traced (mndsite part 2: Config from the YAML to 14 readers) |
| **reads** | call arguments and return values, files read and written, config keys read, the types involved |
| **returns** | per call or edge: the data, its type or file, and its source; with `--of <datum>`, where it is made, changed and read, and which keys each reader uses |
| **today** | apps/ts `read.ts` (`files`, `config`, `Def`); call arguments not read |
| **surface** | `mnd fact data <source> --at <module.function>`, `mnd fact data <source> --of <datum>` |
| **feeds** | flow (edge labels), context (port schemas), dataflow |
| **open** | untyped JavaScript: naming data from a variable or a file name |
