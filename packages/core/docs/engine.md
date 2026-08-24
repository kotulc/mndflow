# Core

**The closed engine.** One package, no React, no DOM, no `window` — the log, the fold, the door, containment, rules, ids, references and the action set. Everything else in the monorepo depends on it, and it depends on nothing.

**The one law: only `core` may name a closed set.** Any other package enumerating sorts of things is doing the engine's job in the wrong place.

| Module | Is |
|---|---|
| model | the object graph: blocks, relations, definitions, and the block modules that interpret them |
| schema | the data contract, and what the door enforces on the way in |
| workspace | the root, the one log, and definition resolution up the tree |
| actions | the closed action set: scope, arguments, `check`, and the mutations each writes |
| behaviors | the behavior module: inference, order, lanes, and the write-home gate |
| ports | the entire host contract. Nothing else may assume where a project lives |

**Placement and routing are not here** — they are layout, which depends on core and is equally headless. Splitting them keeps the fold free of geometry and lets either be tested without the other.
