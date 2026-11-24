# set

**Model tool.** A set's models written from a project's facts in one command: the library opened by density, every diagram drawn or skipped with why, the tours drafted (sets-plan.md). The agent writes a brief and the tours' words; everything mechanical is here.

| | |
|---|---|
| **use case** | modelling a codebase: the brief says what the system and each model are about, `set apply` writes the rest, the agent rewrites the tours' words |
| **reads** | the project's facts (`units`, `entries`, `imports`, `classes`, `calls`; Python today), a set from `apps/cli/sets/`, an optional brief |
| **writes** | `package.json` (its root's description from the brief), the library (`define`), a model file per model (`overview.yaml` first, then `1-<name>.yaml`, …), each with a folder of its diagrams, and the tours (`presentation draft`) |
| **surface** | `mnd set list`; `mnd set apply <set> <project> <folder> [--brief brief.yaml] [--dry] [--force] [--budget n] [--wide n] [--focus a,b] [--pick a,b]` |
| **today** | cli `sets.ts`, `depth.ts`; sets in `apps/cli/sets/` |


## The sets

| Set | Models |
|---|---|
| **system** (default) | Overview (its treemap and a context with who comes in); a path model per main way in, up to 3 (a sequence); Data (entity, else class) |
| **path** | one path end to end (a sequence and a flow, function by function) |
| **data** | Data alone (entity, else class) |


## The brief

```yaml
system: what the system is, what it does and for whom   # package.json's root description
scope: hc                                               # a unit: the part of the project modelled
models:                                                 # by the set's name for each (see --dry)
  Overview: what it illustrates and how it fits
  Ping path:
    name: Receive a ping                                # a new name
    description: what it illustrates and how it fits
parts:                                                  # the overview's parts, in plain words
  api: what it is for
  front:
    name: dashboard                                     # a plainer name
    description: what it is for
  api.management: {name: alert commands}                # a block below, by its holder
actors:                                                 # the callers, renamed
  api client: Cron job                                  # the dry run lists the callers
  Operator: Scheduler
externals:                                              # outside systems that matter, by the
  Database:                                             # overview part reaching each
    at: api
    type: code.database                                 # optional: wears the database icon
    description: what it is
  Notification services: integrations
```

Every key is optional. **Quote a value holding a colon and a space** (`description: "pings: HTTP or email"`): YAML reads it as a mapping otherwise. The brief is checked before anything is written: an external reached from no overview part, and a dial that is no whole number, are refused. Facts see outside *packages* (a framework, a driver), never outside *systems*, so a database or a mail service shows only when the brief names it. An external's `type` names a definition extending `external` (`code.database` wears the database icon); unset, it is a plain external. A model's description seeds its tour; the system's opens the top tour. Run `--dry` first, with the brief's `scope` (a dry run without it plans another library): it prints the plan, the overview's part names (the `parts` keys), the parts too small for the overview (under 3% of the lines; still in the library), each model's brief key, the paths picked (with the function each runs) and the next candidates.


## What it decides

| Step | Rule |
|---|---|
| **library** | the `units` tree opened level by level, the largest unit first, while the library holds at most `--budget` blocks (48) and an opened unit shows at most `--wide` parts (12); a unit with fewer than 3 parts stays closed; a closed unit says its parts as `values.parts`. `--focus` opens the units named first, past `--wide` |
| **relations** | imports lifted to the units opened, the same pair summed; in each view only the strongest kept, up to the drawing ceiling (8, or 1.5 a part) |
| **paths** | ways in reaching at least 3 own functions: routes and other registered callables by how many ways in run them (the best into each overview part first), taking turns with processes; ties, and processes, by how many of the data classes they touch, then reach; one reaching mostly what a taken path reaches is skipped; a decorated hook only when picked. `--pick` names them (an entry's name, its last word, or the end of what it runs; a name matching none is refused); a pick mostly reaching what another reaches is said |
| **data** | classes with two or more fields, the most referenced first, up to 10; the entity drawn where they are keyed, else the class diagram (a slot's `unless`); **an entity's keys are drawn from its classes' fields**, so its file lists blocks and no `relations:`, and its drafted stop marks each entity |
| **overview** | the top units holding at least 3% of the scope's lines, and the callers with a line to the part each enters: per route, a client of the part it enters (`api client`); an `Operator` for processes and scripts; renamed by the brief's `actors` |
| **context** | the overview's parts and callers, a dependency line per pair of parts importing each other, only the strongest pairs (by how many imports) kept under the drawing ceiling |
| **sequence** | the path's calls lifted to the library's blocks, its caller first; a call inside one block left to it, a message making a class said *creates*; a call into a shared helper part (one nearly every other part leans on, leaning on none) left to its caller; other incidental calls (a health check, bookkeeping) stay drawn, and the tour's words skip them (the user, 2026-11-23); a block named as another of the library named with its holder (`api views`) |
| **flow** (path set) | the path's calls function by function, cut shallower until 10 steps or fewer |
| **skipped** | a diagram below its floor or with nothing to draw is skipped, said why; a model with no diagram keeps its treemap of parts |

**A folder remembers** (`.set.json`, hidden, never collected): the brief it was given, shared by every set applied there, and per set its model names and the models it wrote. A later run adds the brief it is given to the saved one (or uses the saved one alone), so two sets in one folder share one library; a model named as another set's model is refused before anything is written.

**Tours**: drafted only for a model without one, each part's step saying its library description (its docstring, or the brief's `parts`). A model rewritten by `--force` keeps its `presentations:` whole as written; `check` says a name they no longer reach. The words are the agent's: write them by presentations.md *Writing one*, then `presentation check <folder>` warns of what is below its bar.

**Additive**: a file already there is kept unless `--force`; with `--force`, a model file this set wrote before and no longer plans (a renamed model) is removed with its diagrams, never another set's or one written by hand, and a library file now written under another name (a renamed part) is removed. Names in tours written by hand follow a rename only by hand: `check` says which. After writing, the folder is checked as `check` would.
