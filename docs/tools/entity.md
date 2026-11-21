# entity

**Diagram tool.** How data is stored: definitions as tables, keys and the lines between them worked out from fields.

| | |
|---|---|
| **use case** | this repo's workspace file: `Graph`, `Block` and `Relation`, a relation's ends and a block's parent each a key into the blocks (docs/tools/examples/workspace-file.json) |
| **takes** | the definitions to draw, by name, from `schema` |
| **writes** | a diagram file of kind `entity`: its blocks references to definitions; keys and lines are never written |
| **you decide** | which definitions belong together, beside which class diagram |
| **surface** | `mnd draw entity <selection.json> <out>`, or from a fact answer, pruned: `classes` (2026-11-20) |
| **later** | reading an ORM's models or SQL through `schema` |
