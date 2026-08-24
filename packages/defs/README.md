# @mnd/defs

**Data only. No code.** The definition packages the engine and the user draw on, validated by core's door.

| | |
|---|---|
| **Entry** | `src/index.ts` — `ALL`, `by_id`, and `seed()`, which hands the base package in as mutations |
| **Depends on** | `core`, for the `Definition` shape alone |
| **Proven by** | every shipped definition passes the door, and every module any of them names exists |

```
npm test -w @mnd/defs
```

## What it ships

| | Is |
|---|---|
| `BASE` | one definition per block module — the three tiers (`structure`, `behavior`, `view`), `folder`, and the five accessories (`reference`, `interface`, `resource`, `group`, `note`) |
| `BEHAVIOR` | `action` and `state`, extending the base behavior definition, each carrying the verb its usages are named by |
| `VIEWS` | the six offered views — `block`, `table`, `matrix`, and `activity` · `sequence` · `state`, which name the block module with a reading |
| `RELATIONS` | `line` and `directed`, so an untyped relationship still resolves to something with a name |

## The rules it lives by

- **The engine may key off a base definition only for how a block draws, where it sits, and which tier it is** — never for anything a package could have said instead.
- **Core cannot depend back.** `defs` depends on core, so an app hands the base definitions into a session the same way it hands in a port.
- **A package is data; a module is code.** A package maps names and presentation, never structure — a notation needing structural change is a module, and then it is one engine capability plus a package, shipping together.
- **A package must be useful with portable presentation alone.** It degrades rather than breaks when the module it names is not in the build.

**In v1**: `base` alone. Nothing else is needed to make, nest and relate a block.

## The detail

`docs/defs.md`.
