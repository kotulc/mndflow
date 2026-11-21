# define

**Library tool.** The library written from what was picked out of the fact tools: the structure half of the system (design.md *Vision*).

| | |
|---|---|
| **use case** | after listing a system with `units`, `imports` and `classes`, keep the components, parts and data that matter, at the scale that reads, and write them as the library |
| **reads** | a JSON file: a `units` answer alone, or `{units, relations \| imports, classes}` |
| **writes** | **the library as containment** (2026-11-19): a `package` unit a folder; every other unit under folders alone a **definition**, its own file in the `code` kinds, its parts inline (a part whose parts hold parts its own file in a directory named as its holder's). Relations, each end lifted to the nearest unit picked: inside one definition a `dependency` line in the file holding both ends; between two definitions an edge in `package.json` (ids `define.…`, replaced each time). Classes as definitions under `types/<module path>/`, a field keyed to another class picked typed by it, a key to one not picked a note, a base picked its type; the class's part in its module a use of its definition |
| **edits allowed** | prune parts, rename (`name`), regroup (move parts under a new unit), change `kind`, write a `description`; `unit` keys relations to it |
| **adds** | new files; a file already there is kept as edited, the parts a new pick adds grafted into its `blocks` by name at every depth (`merged`), its edges added to (2026-11-20), so a finer pick folds into an edited library; a top unit is written in the deepest folder already named for what holds it (`--unit hc.integrations` lands in `hc/`); a file moved or renamed is found by its `source` and merged where it is, and a part now given a file of its own is grafted into its holder's file where that holds it inline; `--force` rewrites every file and replaces the edges `define` wrote before |
| **refuses** | an unknown kind; a folder without `package.json`. Notes once per package folder a relation ends on (pick a finer `--depth`), a relation with an end in no unit picked, a class name picked twice, a project base class not picked. A package picked with no parts is a definition, not an empty folder |
| **surface** | `mnd define <picked.json> <folder> [--keep a,b,…] [--force]`: `--keep` writes only the units named (name or dotted path) whole, and what holds them; the folder needs a `package.json` importing `code` |
| **today** | cli `define.ts` |
