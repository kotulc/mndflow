# mapping

**Diagram tool.** What goes in, where it lands, and by which rule.

| | |
|---|---|
| **use case** | what a build step or translator does to its inputs (mndsite part 4: the content folder to `pages/` and `public/`) |
| **takes** | input and output paths from `trace`, the rules you name, and the rows you group (each folder, every page) |
| **writes** | a diagram file: a grid, one row per mapping (reads, writes, rule), coloured by the kind of rule (converted, renamed, generated, copied, collected) |
| **you decide** | the rules' words, which rows group, what is left out |
| **surface** | `mnd draw mapping <selection.json> <out>` |
| **open** | how many rows before rows group by rule |
