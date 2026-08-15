# packages/core

The base package: relationship definitions a new project starts with.

One file per subject matter, named for today's `graph.vocabulary` string
(`software`, `website`, …). Each file is a list of definitions — name and
form — the same facts entry used to mint via `set_def`. Loading them into a
project is A0.3; turning vocabulary into a package import list is D.2.

Until then, `src/terminal/workflows.ts` fills `Domain.relations` from these
files so entry still seeds via `turn.ts` as before. A0.3 replaces that bridge.
