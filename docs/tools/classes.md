# classes

**Fact tool.** What classes there are: what each extends, its fields and keys, its choices, its methods.

| | |
|---|---|
| **use case** | the data definitions of a class or entity diagram; the inheritance of a family (one transport class per integration) |
| **reads** | class definitions under the target; a field is annotated, or assigned a column-making call (Django's, SQLAlchemy's, Pydantic's); a key's target is its first argument |
| **returns** | each class: `name`, `unit`, `extends` (resolved through imports), `fields` (`name`, `type`, `to` for a key, `options`), `choices` for an enumeration, `methods` by signature, `source` |
| **today** | apps/py `classes.py`; TypeScript answers one at a time with `schema --of` |
| **surface** | `mnd fact classes <project> [--unit <dotted>] [--of <Name>]` |
| **feeds** | `define`'s `classes`, class, entity |
