# Defs

**Data only. No code.** The definition packages the engine and the user draw on, as YAML, validated
by core's door in CI.

| | Ships |
|---|---|
| `base` | one definition per block module — folder, structure, behavior, reference, interface, resource, group, note, view. **Shipped and locked, and the engine knows it by id** |
| `behavior` | `action` and `state`, extending the base behavior definition, plus the verb |
| `requirements` · `flow` · `parametrics` | the worked vocabularies |
| `sysml` · `uml` · `uaf` | formal `names` and mappings over the definitions above |

- **The engine may key off a base definition only for how a block draws and where it sits** — never
  for what it is, and never for what may contain what.
- **A package must be useful with portable presentation alone.** It brings its data and renders on
  the simple typed fields, gaining its custom look only where the module it names is in the build.
  It degrades rather than breaks.
- **Proven by**: every shipped definition passes the door, and every module any of them names
  exists.

**In v1**: `base` alone. Nothing else is needed to make, nest and relate a block.
