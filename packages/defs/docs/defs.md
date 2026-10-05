# Defs

**Data only.** The packages the engine and the user draw on, as JSON, validated by core's door in CI.

| Package | Ships |
|---|---|
| `base` | one definition per functionally distinct kind: `block`, `folder`, `group`, `grid`, `reference`, `interface`, `note`, `tag`, and the relation kinds `line` and `tie`. The traits that grant what a kind may do (`container`, `ports`, `inline`, `matrix`, `headed`, `resizable`, `fitted`, `content`, `media`, `tied`), carried by the kinds that need them. Frozen; the engine knows it by id |
| `requirements` | a worked vocabulary: a shall statement and a verification method |
| `sysml` | formal names and stereotypes over the base definitions |

- **Every package is a JSON file**, `base` included. Code keeps only the id constants it reads.
- **A package is a graph root**: its definitions sit in its domain, organized by holders the package chooses.
- **Proven by**: every shipped package passes the door, and every module any of them names exists.
- **Where they live**: `base` ships with the build; every other package is JSON in `public/packages`, listed in its `index.json`, fetched through the `net` port.


## The rules a package lives by

- **The engine keys off a base only for how a block draws and where it sits**, never for what it is or what may contain what.
- **Core cannot reach the package that supplies its floor.** An app hands `base` in, as it hands in a port.
- **A package is data; a module is code.** A package ships definitions, tags and traits. A notation needing a new kind of behaviour is a module plus a package, shipping together.
- **A package is frozen** where it is used: subtyped, never edited.
- **A standard is a translation layer**, never a shape the model bends to.
