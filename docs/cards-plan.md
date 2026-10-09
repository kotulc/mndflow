# Cards plan

**One card, rendered from data, everywhere.** A card's identity is fixed data; what it shows beyond that is rendered markdown; its content may come from a markdown file. This plan records the decisions workshopped 2026-10-06 to 2026-10-08, the target shapes, and the steps to get there. What the model decides is design.md; the words are definitions.md.


## Goal

| A person or agent needs to | Met by |
|---|---|
| **read a card the same way everywhere** | one renderer — `CardFace` and `Markdown` in `theme` — used by the canvas, the tray and mndmap |
| **see a lot or a little** | two faces: small (name and marks) and large (the parts a definition lists, as markdown) |
| **write content as text** | a card's markdown source: frontmatter for identity and values, then its body |
| **define what a thing carries** | attributes on a definition, typed by type definitions, edited as one table |
| **bring a folder of documents in** | a collection: a package of JSON definitions and markdown usages |


## Decisions

| | Decided |
|---|---|
| **truth** | the JSON graph. Markdown is rendered from it and read back into ordinary changes; a file is a source, never a sync |
| **two worlds** | definitions (abstract) are JSON only; structure (usages) may be markdown. A package may hold both |
| **renderer** | `react-markdown` + `remark-gfm`, behind `theme`'s `Markdown`. The hand-written renderer goes. Frontmatter is read with `yaml` |
| **one card** | `CardFace` in `theme` draws every card; views' `carried` (`card_of`) is the one place a card's data is worked out |
| **small face** | the workspace card size (`display.card`, default 5×2, held inside `CARD`): the handle above the name, the icon, the marks. Never a body |
| **large face** | fits its content — name, handle and markdown, estimated from the text — or the definition's `card.size`, either held inside `LARGE` (20×16 units): the name, then `card.shows` — `attributes`, `body`, `preview` — in order, as one markdown document |
| **which face** | the view's: canvas small unless the nearest ancestor saying `layout.face` asks for large; the tray large then small. Never zoom |
| **fit and full** | a large face fits its content by default; `card.height: fit`, the `fitted` trait, `set_full` and the *full content* toggle are gone |
| **attributes** | `def.attributes`: `{ name, type?, key?, default?, unit?, many?, optional?, note?, extra? }`. Replaces `FieldDef` and `def.schema` |
| **values** | a usage's `values`: `{ name, value }[]`, ordered. The per-value `form` goes; an attribute types it |
| **types** | definitions under a new base kind `value`: `text`, `number`, `flag`, `link`, `choice` ship in `base`. `value.form` (closed, engine) says how one is edited; `value.choices` lists a choice's options |
| **links** | an attribute typed by a block definition. Drawn, dashed and unpickable, in the internal view only, between two drawn cards: a stand-in for the definition to a stand-in for the target, or a usage to the usage its value names |
| **grid** | pure allocation: `rows`, `cols`, `merges`. `values`, `schema`, `columns` and `size` go. Typing into an empty cell makes a plain block of that name |
| **traits** | a trait gives settings: capability, style or both. Style presets are traits |
| **card source** | frontmatter `name`, `type`, `tags`, `source`, then any key is a value; the body follows. On a definition: `name`, `extends`, `tags`, `traits`, and any other key is an attribute's default |
| **permissive names** | a frontmatter name nothing holds, or several packages hold, makes a plain definition (a tag, for `tags`) in the workspace, reported |
| **attach** | copies a file's markdown onto a block and records `source`; refresh is attach again |
| **collection** | a folder: `package.json` (definitions, optional) and `.md` usages under folders. Imported as one frozen package; undefined types are made, their attributes the union of their usages' keys |
| **tray** | the same tabs for definitions and usages: **card · settings · attributes · usages/contents**, read only where not theirs. The type, element (for blocks) and fields tabs go. A line keeps element |
| **JSON** | never typed by a person: a definition changes by traits, pickers and its card source; its JSON is shown read only |
| **mndmap** | documents are usages; tables are content cards; `sized()`, `Preview` and its own table drawing go; the kit's card tab plus a `document` tab |


## Target shapes

### Graph

```
Block {
  …
  def?      { attributes?: Attribute[] }
  values?   { name, value }[]            // a usage's answers, in order
  grid?     { rows, cols, merges? }      // allocation only
}

Attribute { name, type?, key?, default?, unit?, many?, optional?, note?, extra?: Record<string, string> }
```

| Mutation | Replaces |
|---|---|
| `set_attributes { id, attributes }` | `set_schema` |
| `set_value { id, name, value }` | `set_value { id, field }` |
| `drop_value`, `order_values` | unchanged |

### Components

| Key | Holds |
|---|---|
| `card` | `label`, `align`, `label_align`, `icon`, `alias`, `height` (`uniform`, `free`), `name`, `shows` (list), `size` (`{w, h}` in units) |
| `layout` | adds `face`: `small`, `large` |
| `value` | `form`, `choices`, `unit` — on a value type |

### Base

| Added | Removed or changed |
|---|---|
| `value` kind; `text`, `number`, `flag`, `link`, `choice` under it, in a `types` folder | `fitted` trait; `content` gives `shows: [body]`, `media` gives `shows: [preview]` |

### Card source

```markdown
---
name: Feed pump
type: Pump
tags: [critical]
flow: 12.5
---
Pumps feed water from the **tank** to the boiler.
```

| Core | Does |
|---|---|
| `card_text(graph, id)` | a block or definition as markdown |
| `read_card(text)` | `{ front, body }` |
| action `markdown { id, text }` | the text diffed into changes |
| action `attach { id, text, source }` | `card`, and `set_source` |
| `collect(name, files)` | a collection's files as a package file |

### Faces

| Function | Home |
|---|---|
| `face_of(graph, id)` — small or large | views `size.ts` |
| `size_of` — the face's size | views `size.ts` |
| `face_text`, `listed`, `table` — the large face's markdown; `fit_of` — the room it needs, from the text | views `face.ts` |
| `face_attrs(look)` — a look as attributes | views `look.ts` |
| `CardFace`, `Markdown`, `Inline` | theme |


## Steps

**Each step leaves both apps running and the suite green.** Tests change only where a removed shape is asserted.

### 1 — One renderer

- `theme`: `Markdown`, `Inline`, `plain` on `react-markdown` + `remark-gfm`; `CardFace` (small and large). stage's `Markdown.tsx` goes; `marked` leaves stage
- views: `face_attrs` (moved from stage `dressed`), `face_text`, `face_of`; `carried` carries the face; `size_of` sizes by face; `CONTENT`, `set_full` go
- core `components.ts`: `card.shows`, `card.size`, `layout.face`; `fields`, `body`, `preview`, `height: fit` go. `base.json`: `fitted` goes, `content` and `media` give `shows`
- stage `CardNode` wraps `CardFace`; tray `Card.tsx` goes, its drawing is `CardFace` twice
- kit: `Markdown`, `Inline`, `CardFace` from theme; `set_full` and `full` go

### 2 — Attributes and types

- core `types.ts`: `Attribute`, `Value`; `Field`, `FieldDef`, `ValueForm` go. `fold`, `door`, `file`, `defs` (`attributes_of`), `names` (`schema_def`, `stamps_of`, `used_by`), `capabilities` (`expects`) follow
- actions: `field`, `order_field`, `unfield` keep their names and write attributes or values; `define` and `define_from` carry attributes
- `base.json`: the `value` kind and its types; core `value` component
- views: `listed` reads attributes; the class diagram reads attributes; links drawn in the internal view
- fixtures and samples re-saved

### 3 — The grid as allocation

- core: `Grid` is `rows`, `cols`, `merges`; `label` makes or names a block; `taken_in`, `seat_in`, `shifted`, `transpose`, `empty_cells` lose values; the door drops what it no longer reads
- views: a cell carries no value; stage draws none and types a name into an empty cell

### 4 — Card sources

- core `card.ts`: `card_text`, `read_card`; actions `markdown` and `attach`; `yaml` is core's one library
- cli: `k=@path` reads a value from a file

### 5 — The tray

- tabs **card · settings · attributes · usages/contents**; a line keeps element; root keeps workspace · contents
- `CardTab`: large and small faces, the card rendered, *edit source*, *attach* (emitted as `@attach` for the host), a definition's JSON read only
- `Attributes`: one `Table`, quiet until a row is lit; inherited rows first and faint; declare on a definition, answer on a usage; extra columns where any row has them
- `Settings` read only on a usage, showing its definition's
- `Element` for lines only; `Fields`, `Content` (but the workspace's), `Data`, `Card` and the type tab go

### 6 — Collections

- core `collect`; session `bring` takes a collection's package file
- cli `collect <folder> [out.json]`; web *import a collection* through `files`

### 7 — mndmap

- scan: documents are usages typed `md.document`; read applies a document's frontmatter as its card source
- tables are `md.table` content blocks; `sized()`, `Preview` and its `Table` go; `md.*` definitions say `card.size` and `card.shows`; `md.document` says `layout.face: large`
- the kit's `Tray`, read only, with a `document` tab of its own

### 8 — Docs and release

- core `schema.md`, `actions.md`; tray `tray.md`; views, stage, theme and kit READMEs; mndmap README; cli-plan's markdown rows
- `npm run release:kit`, then mndmap re-pinned


## Deferred

| | Waits on |
|---|---|
| **definition view** | a canvas view kind: the large card centred, its interfaces on the walls, its traits, tags and attributes around it, composed by drag and drop |
| **choice options as blocks** | a choice wanting options with icons or notes of their own |
| **link index** | a layer large enough for `linked_graph`'s card-by-card match to show; a name index fixes it |
| **records tables** | many usages read from one markdown table |
| **links in content** | a syntax for a value naming a block; `[[name]]` rejected |
| **re-import by id** | a collection matched to the package it replaced; for now ids follow paths and names |
| **status columns** | stories.md |


## Status

**Steps 1–7 built and step 8's docs written, 2026-10-08; nothing committed.** Typecheck clean in both repos, 291 tests green, CSS lint clean. Both apps driven in Edge; `collect`, `attach` and `markdown` driven from the CLI. Link lines driven on a canvas, 2026-10-08, with the `erd` package, now the showcase's data layers.

### Settled while building

| | Decided |
|---|---|
| **the edit action is `markdown`** | the web app already routes `card` to the display's card size |
| **value types live in `base`** | the `value` kind, its types in a `types` folder; a separate package needed plumbing for nothing |
| **an unknown attribute type** | makes a value type of the workspace's, extending `text` |
| **a large face showing nothing** | is the small face's size on the canvas; the tray previews it with its attributes, else sample content, at the size that fits |
| **fit is estimated, not measured** | from the markdown: glyph widths, a 16px line, a 17px table row, cells cut at 12 characters; rounded up to units. Headless, so the CLI and layout size cards without a page |
| **the attributes table** | a ruled grid, a row each: type, name, then key, value and note where any row says one. No header row: columns read by place, as an ERD entity does |
| **the tray's handle** | both faces wear it top left: a usage its own, a definition its next usage's; `card.alias: hide` removes it |
| **choice options** | words in `value.choices` on the type, for now |
| **`shows` merging** | the nearest `shows` replaces, whole; traits giving parts do not add up |
| **a definition's unknown keys** | read as attribute defaults, declaring the attribute where nothing does — as a usage's keys are values |
| **a card source worked out once** | `markdown` and `attach` keep what `check` found, by args and graph, for `run` |
| **a block in a grid's cell** | draws the small face, whatever its layer asks |
| **attach says only what the file says** | a key it leaves out is kept; edit source, which is whole, takes it away |
| **a body opening with `---`** | is written after an empty frontmatter fence, so it never reads as frontmatter |
| **collection ids** | `<package>.dir.<path>`, `<package>.md.<path>`, `<package>.type.<word>`, `<package>.tag.<word>`: they follow paths and names |
| **mndmap makes no definitions** | a frontmatter type or tag word nothing loaded holds stays a value |
| **the files port** | gains optional `text` (one file of given sorts) and `folder` (every file under one) |
| **tray depends on views** | for `carried`, `face_text` and `size_of`; the law test and the package map say so |
| **the kit bundles for the browser** | tsup `platform: "browser"`, since yaml's node build broke mndmap |
| **CLI `k=@path`** | read as a file only where the file exists; otherwise the literal |

### Before the next session

| # | To do |
|---|---|
| 1 | commit both repos |
| 2 | `npm run release:kit` — it stamps the commit, so after 1 — then copy the tarball into mndmap's `vendor/` and point its `package.json` at it. Until then mndmap builds only against the linked kit in dev |
| 3 | drive the web app's *import a collection* and *attach*: both are bound, neither has been clicked |
| 4 | notes draw their name, not their body, and through `NoteNode` rather than `CardFace` |

### What changed shape

| Was | Is |
|---|---|
| `FieldDef`, `def.schema`, `set_schema` | `Attribute`, `def.attributes`, `set_attributes` |
| `Field` with `form`; `set_value { field }` | `Value { name, value }`; `set_value { name, value }` |
| `ValueForm`, `VALUE_FORMS` | `FORMS` and `value.form` on value types |
| `grid.values`, `.schema`, `.columns`, `.size`; text labels | gone; `label` names or makes the block in a cell |
| `card.fields`, `.body`, `.preview`, `height: fit`; `fitted`; `set_full` | `card.shows`, `card.size`, `layout.face` |
| stage `Markdown`, tray `Card`, `Data`, `Fields`, `Source`; mndmap `Preview`, `forms.ts`, `sized()`, `md.front` | theme `Markdown` and `CardFace`; tray `CardTab`, `Faces`, `Attributes`; mndmap `Document` |
