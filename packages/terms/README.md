# packages/terms

What each subject matter calls a group, a block, and a relationship.

One file per domain, named for today's `graph.vocabulary` string
(`software`, `website`, …). Chips and the object explorer use these instead
of the generic group / object / relation. Data only — not the question loop.

`src/terminal/workflows.ts` still merges them into `Domain.terms` until D.2
makes vocabulary a package import list. The catalog loader ignores these
files: they have no `definitions` array.
