# Plan

**Content, and what stands on it.** The block refactor landed; tasks.md says where the app stands. This file records what the foundation still owes a content-centric use, and the order it lands in. The goal state lives in design.md, spec.md and each package's `docs/`.


## The idea

**A block is content, and mndflow is the foundation under anything that says so.** mndflow is the diagram editor: the graph's mechanics, how a graph is drawn, manual adjustment of what is there, and composition through packages and nesting. Everything that reads a foreign form into blocks — markdown, requirements, code — is a translator standing on the kit, with a surface of its own.

**The test for a change here is whether it is general.** A restructuring or a schema change that any consumer would want belongs in mndflow. A component, an action, a port or an export that one consumer wants is that consumer's job, and asking for it here is a sign that either the foundation has a general gap or the consumer is doing its own work in the wrong place.

| | |
|---|---|
| **the file is the whole contract** | a consumer holds `@mnd/kit` and a `.json`. It reads a graph with `open`, edits it as data, asks `validate`, and writes it with `write`. The kit needs no editing surface for that, and gains none |
| **the components are reused as they are** | `Explorer` and `Viewer` ship in `kit/react`, with the theme. A consumer builds what else it needs in the same style over the same Scene and graph |
| **the vocabulary is a package** | a translator's definitions are data in `public/packages`, so its file opens here with the look it was given |

**The first consumer is mndmap**, a browser dashboard for translated markdown. Its plan is its own; what follows is only what it needs from the foundation, stated generally.


## What the foundation owes

| | Change | General because |
|---|---|---|
| **1** | **The kit at HEAD.** `release/kit.json` names 0.3.0 from before holders, packages, `source` and marks, and `packages/kit/.types` still carries retired modules, a `Role` with `resource` and `container` in it, and `source` as a record. Re-pack, stamp, and clear the stale types | nothing outside the repo can build against the current schema until it lands |
| **2** | **The `doc` package**, shipped in `public/packages` beside `requirements` and `sysml`. Block definitions `doc.set` over `folder`, `doc.page` and `doc.section` over `block`, `doc.item` and `doc.code` over `block`; one relation, `doc.link`, over `line`. A table is a grid holder and a list is a group holder, so neither needs a definition | a vocabulary is data, and this one is the markdown vocabulary any reader of markdown would want |
| **3** | **Allocation through a holder's `of`.** `allocated_to` answers with blocks for both shapes: a grid's members through its headers, a boundary's members through what the holder stands for | plan.md already named it the next step; a table standing for its section is the first thing to read it |
| **4** | **A body is content, and the panel says so.** The tray renders a body as markdown rather than a textarea of it, and a definition may say what its body is — `card.body` cascading like every other card key, with the format the definition's business | ST.18 and ST.20. A requirement's text and a script's code want it as much as a section's prose |
| **5** | **A relation carries no provenance, on purpose.** Whether a line was read from a body or drawn by hand is answered by reading the body again, never by a stored flag | the schema stays as it is; a translator that wants to know already holds both |

**Nothing else.** The session, the log, the actions and the surfaces stay internal. Undo for a consumer is a stack of graphs it keeps itself.


## Order of work

| | |
|---|---|
| **1 — the kit** | re-pack at HEAD as 0.4.0, stamp `release/kit.json`, drop the stale `.types` |
| **2 — `doc.json`** | the package, through the door in CI like the other two |
| **3 — allocation** | `of` on a holder answers `allocated_to` for both shapes |
| **4 — the body** | rendered in the tray; `card.body` as a cascading key |
| **5 — the round trip, as acceptance** | a real README read into a file by mndmap, emitted, and diffed. The only thing that says whether `body` stays opaque markdown, and it is run before anything is built on the answer |

**Then tasks.md continues where it left off** — one tab pattern, and tests for what has settled — and definitions.md, design.md and spec.md are brought up to the three-kind model, which they still trail.


## What this refuses

- **No action, component, port or export for one consumer.** The kit grows only by general restructuring.
- **No second reader.** A consumer's file goes through `open`, and its faults are the door's.
- **No app-specific vocabulary in code.** A notation's words are a package, or they are a feature request against the engine.
