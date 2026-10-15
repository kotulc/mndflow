# Defs

**Data only.** The packages the engine and the user draw on, as JSON, validated by core's door in CI.

| Package | Ships |
|---|---|
| `base` | one definition per functionally distinct kind: `block`, `folder`, `group`, `grid`, `reference`, `interface`, `note`, `tag`, `value`, and the relation kinds `line` and `tie`. The value types under `value` — `text`, `number`, `flag`, `link`, `choice` — that attributes name. Under `tags`: `tag`. Each kind lists the engine traits it needs by name (`has_parts`, `is_port`…); the traits themselves are core's table, not definitions here. Each kind states its own look, its arrangement (`card.arrange`) and the layer view it opens on (`layout.view`). **Authored as one JSON file per definition** under `src/base/`, collected into `src/base.json` by `npm run base`. Frozen; the engine knows it by id |
| `requirements` | a worked vocabulary: a shall statement and a verification method |
| `sysml` | formal names and stereotypes over the base definitions |
| `diagrams` | the diagrams a card's kind opens on: `class diagram` (`table`), `swimlane` (a grid, `allocation`), `sequence diagram` (`sequence`), each saying `layout.view`; and the relations a scenario's steps exchange, `message` and `reply`. Collected from `src/packages/diagrams` |
| `architecture` | general architecture vocabulary — person, component, service, database, queue, external, document, decision, and the relations `calls`, `publishes`, `reads`, `integrates` — and **patterns with parts**: `API gateway`, `layered architecture`, `transactional outbox`, `anti-corruption layer`, `circuit breaker`, `saga orchestrator`, each a diagram file under `patterns/` whose parts are explained by tied notes. Kinds are definition files. Collected from `src/packages/architecture`; the showcase's services are usages of its patterns |

- **Every package is a JSON file**, `base` included. Code keeps only the id constants it reads.
- **A package is a graph root**: its definitions sit in its domain, organized by holders the package chooses.
- **Proven by**: every shipped package passes the door, and every module any of them names exists.
- **Where they live**: `base` ships with the build; every other package is JSON in `public/packages`, listed in its `index.json`, fetched through the `net` port. A package with a source folder under `packages/defs/src/packages` is collected by `npm run packages`, one definition file per kind.


## The rules a package lives by

- **The engine keys off a base only for how a block draws and where it sits**, never for what it is or what may contain what.
- **Core cannot reach the package that supplies its floor.** An app hands `base` in, as it hands in a port.
- **A package is data; a module is code.** A package ships definitions and tags. A notation needing a new kind of behaviour is a module plus a package, shipping together.
- **A package is frozen** where it is used: subtyped, never edited.
- **A standard is a translation layer**, never a shape the model bends to.
