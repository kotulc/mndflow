# packages

Definition data — one folder per package. Module code lives in `src/modules/`.

| Folder | Ships |
|---|---|
| `core/` | relationship seeds a new project starts with (one file per domain) |
| `terms/` | what each subject matter calls a group, a block, a relationship |
| `requirements/` | requirement + five relationships |
| `flow/` | control flow, object flow, transition |
| `parametrics/` | constraint block |
| `behavior/` | action + state, and activity / sequence / state words |
| `sysml/` | SysML v2 names, ornaments, concept mappings |
| `uml/` | UML classifiers, use cases, ornaments, mappings |
| `uaf/` | UAF architecture-layer stereotypes and cross-layer traces |

`terms/` holds vocabulary only — not definitions; the catalog loader skips them.
A package maps names and presentation, never structure.
