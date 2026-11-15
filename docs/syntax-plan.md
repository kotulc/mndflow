# Syntax plan

**One concise, general file syntax for packages, models and diagrams, so the tools have one stable surface to write.** Taken up 2026-11-15, ahead of the tree view and presentations (model-plan.md *Next session*). Agreed with the user over the kinds pass's example files (kinds page https://claude.ai/artifact/Pxqq3R9YBEADASCmZyDYqc). **Delete this plan when the samples collect under it.**


## Decided (2026-11-15)

| # | Decision |
|---|---|
| 1 | **two layers, split by role**: the package holds the library (definitions, components, imports) as JSON; models and diagrams are light YAML, using the package's definitions |
| 2 | **definitions are JSON, never hand written**: extracted by a translator, made in the editor or by an agent; no need to be human readable or writable. YAML definition files (`def:` in a `.yaml`) go, and so does `def` in a card source's frontmatter: markdown is usages only. The package JSON is the existing package schema, its graph holding definitions and components only |
| 3 | **imports are explicit**, as Python's `import services as svc`: the package JSON's `imports` maps each imported package to the name it is written by here (`{"services": "svc"}`; its own name when not aliased, `{"services": "services"}`). Its definitions may extend theirs. Replaces *a package's dependencies are worked out from the names it uses* |
| 4 | **a model or diagram file's scope is its own package**: its package's definitions, its imports, and `base`. A file never lists `packages:`; a qualified name never loads a package by itself |
| 5 | **names**: the owning package's definitions bare; an import's qualified by the name it is imported as (`svc.service`); `base` bare. Every definition, folder and import name is unique within the package's scope, so nothing shadows |
| 6 | **definitions hold no diagrams; only models do**: a definition says what a thing is (extends, traits, attributes, ports, records, settings), a model says how things are arranged and behave. A part's diagrams sit under its use in the model. **A pattern is a model**; reuse is a use of it, entered by *into*. A type's state machine, class or entity diagram lives in the model that owns that data |
| 7 | **kind defaults**: a kind sets the default type of its blocks and relations, never repeated in the file (table below) |
| 8 | **names are found outward**: a bare name is looked for in the file's layer, then each enclosing layer up to the model root (through regions and groups), then the package's definitions, then `base`. Class and entity blocks, and the types of ports and attributes, look in definitions only. Found twice at one level is refused; `check` reports a name that no longer resolves |
| 9 | **a reference takes its target's name**; `{name: x, of: y}` only to rename |
| 10 | **ports by flow**: `ports: {in: {content: md tree}, out: {dist: site}}`; the long form stays for `side`, `at`, `description` |
| 11 | **a mapping's records are written as relations**: `reads -> writes: info` |
| 12 | **`name` is optional** where the file's name says it (after its order prefix); required in a file of several diagrams |
| 13 | **a mark in short**: `start: Placed` |
| 14 | **several diagrams per file**: YAML documents split by `---`, each a block of its own, in file order, each named. Meant for small diagrams over the same things (a class and an entity diagram). A file of several diagrams owns no directory beside it |
| 15 | **a behaviour's signature on the definition, its body in the model**: a definition's JSON lists its behaviours as signatures (name, inputs, output), data like attributes and ports, so a class card lists them with no model behind it. A body — steps, a flow, a sequence, states — is a diagram in the model under the use that owns it. A collection of behaviours with parts (a module, a component) is a sub model. When a module becomes a sub model rather than a leaf with signatures, and how a signature names its body, are the tools pass's |
| 16 | **a model is a definition with *is model***, a trait: it may extend any block kind in scope and draws and answers as it (the services patterns: `type: service`). **A diagram file in no other file's block is a model**; inside one, a part. Base `model` is the plain model. A kind's file defaults are its `diagram.file` setting |

| Kind | Blocks default to | Relations default to |
|---|---|---|
| context, flow | a part, a step (`block`) | `line` |
| dataflow | a reference | `line` |
| state | a state (`block`) | `transition` |
| sequence | participants: a reference | `message` |
| swimlane | lanes: a reference; steps: `block` | `line` |
| class, entity | a reference to a definition | none written: worked out from fields |

**Knock-ons of 6**: `Charge a card` becomes a model; `Order`'s `place` flow and `Order states` move under the shop's Orders use; mndsite's `Config` class diagram moves from its library into the model, under configuration; the translator writes a component with parts as a sub model.


## Next

| # | Step | Status |
|---|---|---|
| 1 | agree the end-to-end flow and each kind's file | done 2026-11-15 |
| 2 | rewrite design.md *Diagram files* and *Definitions and packages*, each kind's *Surface* | done 2026-11-15 |
| 3 | the door reads the new form only (no legacy repairs); services, example and elements moved to it, each collected and compared with its old file | done 2026-11-15 |
| 4 | the translators (apps/ts) write it; `samples/code` and `samples/mndsite` do not collect until then (the user's call: strict) | with the tools pass |
| 5 | not yet built: the `context`, `dataflow`, `mapping`, `actor`, `external` base kinds, so dataflow `datum`, mapping `records` as relations and their kind defaults wait for them | with the tree view |

**Seen, not fixed**: a use of a model, entered, draws as a treemap of its own children only (views `block.ts` `layer_map`), so a use of a services pattern, now a model, shows nothing inside; before, a pattern's use drew its parts read through. The tree view (model-plan.md *Next session* 2) opens a chip as a closed box of its model's tree.
