# Defs

**Data only.** The packages the engine and the user draw on, as JSON, validated by core's door in CI.

| Package | Ships |
|---|---|
| `base` | one definition per functionally distinct kind: `block`, `folder`, `group`, `grid`, `reference`, `interface`, `note`, `tag`, `value`, and the relation kinds `line` and `tie`. The value types under `value` — `text`, `number`, `flag`, `link`, `choice` — that attributes name. Under `tags`: `tag` and `trait`, and the traits naming what the engine does, one each (`has_parts`, `has_values`, `has_ports`, `has_head`, `has_tie`, `is_group`, `is_grid`, `is_port`, `is_reference`, `is_tie`), listed by the kinds that need them. Each kind states its own look. **Authored as one JSON file per definition** under `src/base/`, collected into `src/base.json` by `npm run base`. Frozen; the engine knows it by id |
| `requirements` | a worked vocabulary: a shall statement and a verification method |
| `sysml` | formal names and stereotypes over the base definitions |
| `entity-relation` | one generic `Entity`: a table of keyed attributes, some typed by another entity, linked where drawn together. A pattern to extend; the architecture sample's records do. Collected from `src/packages/entity-relation` |
| `diagrams` | the diagram views a card's kind opens on: `class diagram`, `swimlane`, `sequence diagram`, each saying `layout.view`; and the relations a scenario's steps exchange, `message` and `reply`. Collected from `src/packages/diagrams` |
| `architecture` | general architecture vocabulary — person, component, service, database, queue, external, document, decision, and the relations `calls`, `publishes`, `reads`, `integrates` — and **patterns with parts**: `layered service`, `outbox service`, `adapter`, each part explained by a tied note. Kinds are definition files; patterns live in the folder's `package.json`, since definition files hold no parts. Collected from `src/packages/architecture`; the architecture sample uses it |

- **Every package is a JSON file**, `base` included. Code keeps only the id constants it reads.
- **A package is a graph root**: its definitions sit in its domain, organized by holders the package chooses.
- **Proven by**: every shipped package passes the door, and every module any of them names exists.
- **Where they live**: `base` ships with the build; every other package is JSON in `public/packages`, listed in its `index.json`, fetched through the `net` port. A package with a source folder under `packages/defs/src/packages` is collected by `npm run packages`, one definition file per kind.


## The rules a package lives by

- **The engine keys off a base only for how a block draws and where it sits**, never for what it is or what may contain what.
- **Core cannot reach the package that supplies its floor.** An app hands `base` in, as it hands in a port.
- **A package is data; a module is code.** A package ships definitions, tags and traits. A notation needing a new kind of behaviour is a module plus a package, shipping together.
- **A package is frozen** where it is used: subtyped, never edited.
- **A standard is a translation layer**, never a shape the model bends to.
