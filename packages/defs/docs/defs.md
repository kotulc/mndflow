# Defs

**Data only. No code.** The definition packages the engine and the user draw on, validated by core's door in CI, and every module any of them names must exist.

| | Ships |
|---|---|
| `base` | one definition per block module — the three tiers, `folder`, and the five accessories — plus one view definition per offered view. **Shipped and locked, and the engine knows it by id** |
| `behavior` | `action` and `state`, extending the base behavior definition, plus the verb |
| `requirements` · `flow` · `parametrics` | the worked vocabularies |
| `sysml` · `uml` · `uaf` | formal `names` and mappings over the definitions above |

- **The engine may key off a base definition only for how a block draws and where it sits** — never for what it is, and never for what may contain what.
- **A package must be useful with portable presentation alone.** It brings its data and renders on the simple typed fields, gaining its custom look only where the module it names is in the build. It degrades rather than breaks.
- **Proven by**: every shipped definition passes the door, and every module any of them names exists.

**In v1**: `base` alone. Nothing else is needed to make, nest and relate a block.

## The rules a package lives by

- **The engine may key off a base definition only for how a block draws, where it sits, and which tier it is** — never for anything a package could have said instead.
- **Core cannot reach the package that supplies its floor.** `defs` depends on core, so core may not depend back — an app hands the base definitions in, the same way it hands in a port.
- **A package is data; a module is code.** A package ships definitions and costs nobody anything. **A package maps names and presentation, never structure** — a notation needing structural change is a module instead, and then it is one engine capability plus a package, shipping together.
- **A package resists editing.** A write against one refuses with the reason and offers **unlock** or **fork**.
- **A standard is a translation layer, never a shape the model bends to.** A part property is a block with a parent, a value property is a typed field, a port is an interface, a requirement is a block with two fields. **A notation that cannot be reached this way is a notation this tool does not do.**
