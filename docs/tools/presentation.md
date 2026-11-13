# presentation

**Model tool.** Drafts, checks and lists a model's presentations: ordered, narrated ways through it, played like a slide deck. The format and how one plays are in presentations.md.

| | |
|---|---|
| **use case** | explaining a system stop by stop (mndsite: Build a site, 6 stops) |
| **takes** | a model file; to draft, a start: a flow or sequence diagram, or a chain of relations |
| **writes** | the model file's `presentations:` list: stops (`title`, `at`, `open`, `summary`, `into`) and their steps (`relation` or `mark`, `text`) |
| **you decide** | the stops and their one point each, what opens, the words |
| **surface** | `mnd presentation draft <model> --from <diagram>`, `mnd presentation check <model>`, `mnd presentation list <model>` |
| **open** | whether a draft stops at every step of a flow or groups them |
