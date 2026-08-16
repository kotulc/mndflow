# packages/uaf

UAF (Unified Architecture Framework) reading: the architecture-layer
stereotypes as ordinary block and relationship definitions, with `names` that
point at UML / SysML where the concepts line up. Data only — no module, no
renderer, no layout law.

UAF rides SysML notation underneath; import `sysml` beside this package when
ornaments and SysML relationships are needed. This folder does not re-ship them.

Loading into a project is A0.3. Until then these files sit ready; nothing
imports them.
