# dataflow

**Layer kind. Where one datum comes from, what changes it, and who reads it.** New kind (2026-11-13). Agreed 2026-11-14.

## Purpose

| | |
|---|---|
| **answers** | where does this datum come from, what changes it, and who reads it |
| **draws** | the parts on one datum's path, ranked along the axis by what they do to it (make, change form, read), the datum's form on every edge, its sources and outside readers across the frame |
| **example** | mndsite: Config (review part 2, A) |

## Utility

| | |
|---|---|
| **draw it** | a datum many parts depend on, whose path is not obvious from any one part (config, a record built in one half and read in the other) |
| **skip it** | a datum made and read by one part: that part's flow shows it |
| **vs flow** | a flow is one behaviour's steps in time; a dataflow ranks parts by what they do to one datum, whatever order they run in |
| **vs context** | context shows every flow across one frame; a dataflow shows only the parts one datum touches, across as many frames as it crosses |
| **vs class** | class shows the datum's shape; a dataflow shows its life. The datum is never a block in either picture's model (model-plan.md 5) |
| **vs presentation** | a dataflow may seed one, offered from the part that makes the datum, a stop per rank (model-plan.md 12) |

## Surface

| | |
|---|---|
| **base** | `dataflow`, extending `block`: view `internal`, layered along the axis by rank |
| **file** | its own file beside the part that makes the datum (`configuration/Config.yaml`): `datum` names the definition traced; its blocks are references to the model's parts and externals (`of:`), never copies; its lines carry the datum's form. The frame is worked out, never written |
| **tool** | `mnd draw dataflow <selection.json> <out>` (docs/tools/dataflow.md) |

```yaml
# configuration/Config.yaml
name: Config
type: dataflow
datum: Config
blocks:
  - {name: mndsite.yaml, type: reference, of: overview.mndsite-yaml}
  - {name: load_config, type: reference, of: mndsite.build.configuration.load_config}
  - {name: write_site_config, type: reference, of: mndsite.build.configuration.write_site_config}
  - {name: ingest, type: reference, of: mndsite.build.ingest, groups: [build readers]}
  - {name: metadata, type: reference, of: mndsite.build.metadata, groups: [build readers]}
  - {name: site half, type: reference, of: mndsite.site}
  - {name: Next.js, type: reference, of: overview.nextjs}
relations:
  - mndsite.yaml -> load_config: Config 0.3
  - load_config -> write_site_config: Config
  - load_config -> ingest: Config
  - load_config -> metadata: Config
  - write_site_config -> site half: site.config
  - load_config -> Next.js: MNDSITE_OUTPUT
```

## The datum

**The datum is what the picture is about, so its definition is drawn first**: a band above the frame (left of it on a portrait canvas), read through from the library by `datum`, never copied and never a block in the layer.

| Shows | |
|---|---|
| **its definition** | the datum's definition card, drawn as every definition card is (docs/design/card.md: head with the *definition* badge, then the type · name · value table); a type naming another definition (`Theme`) opens that card. The band links to the datum's class diagram, where there is one |
| **its forms** | each form is a definition: the type of the port it passes through (ports are typed, context.md agreed 2). Listed in rank order as small definition faces (head only), each opening its card |
| **lit by a pick** | picking a line rings its form and washes the rows it carries, as the tray lights a card's rows; picking a row lights every line carrying it |
| **motion** | data travelling along the lines is design.md *Motion* (*flows animate*), played in a presentation seeded from the dataflow |

**A form that drops fields** (`site.config`: all but paths) is a definition of its own; whether it may say so as a projection of the datum (`of: Config, without: [paths]`) is open.

## Layout

**Flow's zones, ranked by what each part does to the datum.**

| Zone | Holds |
|---|---|
| **frame** | the smallest part holding every part that makes, changes or reads the datum; worked out, never written |
| **start** (outside) | where the datum comes from: one card per port, as context |
| **makes · changes form · reads** | ranks along the axis inside the frame; a part that reads and changes is ranked where it changes |
| **result** (outside) | readers outside the frame |
| **lane outside** | a source read straight by an outside reader, never entering the frame (environment → Next.js) |

| Grows | What happens |
|---|---|
| **parts on the path** | each a reference, its holder as its second line; holders are not drawn as boxes (the dataflow is about the datum, not containment) |
| **readers** | references, one per reader, gathered in a group named for their holder (`build readers`); a group past a default (3) members draws as one card, its members as name rows |
| **parts of the datum read** | the line into a reader names the sections it reads (`display · theme · +5`) where it reads only some |
| **forms** | every line names the datum's form there (`Config 0.3`, `site.config`, `MNDSITE_OUTPUT`); a change of form is a rank |
| **gaps, crossings** | as context and flow |

## Agreed 2026-11-14

| # | Decision |
|---|---|
| 1 | the frame is the smallest part holding every part the datum touches; worked out, never written |
| 2 | ranks: makes, changes form, reads, along the axis |
| 3 | many readers fold by holder past a default; lines name the sections read |
| 4 | the file: references to parts, `datum` naming the definition, filed beside the part that makes it |
| 5 | readers fold through a group of references (layer-local notation, members carry `groups`); a reference stays one block |
| 6 | the datum is drawn as a band above the frame, lit by a pick: its definition card, drawn as every definition card is |
| 7 | each form is a definition: the type of the port it passes through; listed as small definition faces in rank order |
| 8 | a form that drops fields (`site.config`) is a definition of its own for now; a projection (`without:`) waits on the class pass |
| 9 | **a port's `type` may name a data definition directly** (it carries that schema); interface definitions stay for protocol ports (`HTTP`, `Events`). General, a core change: `interface_of` accepts a data definition |
| 10 | **a typed port is filled with its definition's colour, semi-transparent, and outlined in it**; a base port (`interface`) is hollow, outlined in the interface hue, and its lines carry no label. The seat keeps its one shape and chevron |
