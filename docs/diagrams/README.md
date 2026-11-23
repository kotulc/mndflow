# Diagrams

**One file per diagram kind: its purpose, its utility and its surface** (model-plan.md decision 8). A kind is a flavour over one of four base views, with its own semantics and annotations; a tool makes one kind (docs/tools/). Run as the mndsite review was: one kind at a time, a mockup and a file, agreed with the user. **The pass is done (2026-11-15)**: every kind's file is agreed. Mockups: https://claude.ai/artifact/Pxqq3R9YBEADASCmZyDYqc

| Section | Holds |
|---|---|
| **purpose** | the one question the kind answers, and what it draws |
| **utility** | when to draw it, when not, and how it differs from the kinds nearest it |
| **surface** | how it is written in a diagram file, which tool makes it, its base definition |
| **open** | what is still to agree |


## Index

Reconciled with the tools 2026-11-13: one kind per diagram tool, kinds without a tool kept and drawn by hand.

| Kind | Base view | Answers | Tool | Change |
|---|---|---|---|---|
| **context** | layer | what a part is made of, its ports, and what is across them | context | merges `internal` (2026-11-13): a part's frame at every level, the system's outside at the top |
| **flow** | layer | a chain of steps, with data on its edges | flow | |
| **dataflow** | layer | where one datum comes from, what changes it, who reads it | dataflow | new kind |
| **state** | layer | how one thing changes | state | a tool since 2026-11-15 |
| **sequence** | grid | who talks to whom, in what order | sequence | |
| **swimlane** | grid | who does what, in which phase | swimlane | a tool since 2026-11-15 |
| **mapping** | records table | what goes in, where it lands, and what to know about it | mapping | new kind; a generic records table, not the grid (2026-11-14) |
| **class** | types | what data definitions there are: their fields and references | class | |
| **entity** | types | how data is stored | entity | a tool since 2026-11-15 |
| **tree** | treemap | what holds what, and where the weight is | overview | the model's overview; the stand-alone `treemap` kind retired; one tree view for map, overview and registry (2026-11-15) |

**Kinds once drawn by hand** (state, swimlane, entity): each got a use case in this repo and a tool (2026-11-15): the canvas's navigation as a state machine, the workspace file's definitions as entities, a source folder's handoff from the CLI to the canvas as a swimlane (docs/tools/examples/). A project with a database or ORM is still the better test for entity.

## Sub diagrams

**A diagram must earn its place** (2026-11-14). Many diagrams today hold one or two blocks, which says nothing a chip does not.

| Rule | |
|---|---|
| **the floor** | a diagram holds at least 3 steps, messages or states (a default, a floor); below it, it is not drawn and its owner's chip says it |
| **a cut** | an overflow cut (sub flow, sub sequence, composite state) is made only where the part cut out and the part left each keep the floor |
| **the tools** | `draw` **refuses** below the floor and names the owner whose description would say it (2026-11-21: was a warning) |
| **a reason** | every diagram says what it answers: `draw` refuses one without a description (the user, 2026-11-21) |
| **entering** | a block enters only where its inside holds the floor (core `worth_entering`): a class with one method is a block; a module part holding four classes enters, in the library too (the user, 2026-11-21) |

**Pass order**: layer kinds first (context, flow, dataflow, state), then grid (sequence, swimlane), mapping (records table), types (class, entity), treemap (tree). The tree kind is the overview (model-plan.md decisions 10 and 18), which the `overview` tool writes.
