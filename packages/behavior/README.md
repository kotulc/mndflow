# packages/behavior

The `action` and `state` block definitions, and each behavior view module's
words: what it calls an action, a state, a message, and the verb a derived
label opens with (`do Pump`). Data only — no module, no renderer, no layout
law.

An `action` may carry an `outcome` ref; that is the ordinary field that flips
activity→state reading B in [behaviors.md](../../docs/behaviors.md). A
container typed `action` is an *activity* and a leaf an *action* — shape, not
a second definition.

Loading into a project is A0.3. Until then these files sit ready; nothing
imports them. Formal `names` (SysML / UML / UAF) ship with A.11. The `words`
map is for activity / sequence / state; the catalog loader only folds
`definitions` today.
