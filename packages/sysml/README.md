# packages/sysml

SysML v2 reading: formal names, the control-node ornaments that replaced
`figure`, and a concept map into what mndflow already is. Data only — no
module, no renderer, no layout law.

Ornaments are ordinary blocks whose definition carries `size` and a `card`
shape — a decision diamond, a fork bar as a thin `rect`, an initial node as a
small filled `ellipse`. Activity still *derives* control nodes from counts;
these definitions are what a package ships when somebody places or exports one.

Loading into a project is A0.3. Until then these files sit ready; nothing
imports them. The catalog folds `definitions` only; `mappings` sit for readers
and translators.
