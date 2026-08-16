# Sample review — `mndflow.json`

H.2. Read against [docs/spec.md](../docs/spec.md) (file layout, closed forms, defaults).
Validated with `file.read` / `file.write`: loads, every id resolves, round-trip is
byte-identical (including the bad edge key below).

## Verdict

A solid hand-authored picture of the app and a real workout of the format. Nesting
reads. The closed sets are all present. One edge key is wrong (`"undefined"`); it
still loads. The rest of what a reviewer would want is about **reading and writing
by hand**, not about the loader.

## What is in it

| | Count | Notes |
|---|---|---|
| Envelope | schema `1.1`, id `proj_mndflow` | Correct |
| `meta` | `steps: 1`, `module: "block"` | See *meta* below |
| Definitions | 7 | Module, Door (`extends` Module), Layer, seam mark; depends / feeds / mentions |
| Elements | 30 | All four forms |
| Relationships | 16 | Both forms; ties and a reference derived |

**Element forms:** block 25 · note 2 · group 2 · proxy 1  
**Field forms on root alone:** text, number, flag, choice, ref — all five  
**Also exercised:** interfaces (side/at/flow), membership (`groups` on the member),
`components.card` (several layouts/shapes), `names.sysml`, definition `size` on a
shaped block, definition `extends`, port-pinned ends (`from` / `to`), edge fields
(`why`, `item`)

## Nesting — does it read at depth?

Yes. Three levels, and each layer is a sentence:

```
mndflow
  Page, Graph, Canvas, Geometry, Modules, Terminal, Embed
  engine / surface (groups), two notes, seam mark (shaped block)
    Graph → types, fold, check (Door), file, store, two ports
    Canvas → Frame, NodeCard, proxy of store
    …
```

Parent is omitted; position in `holds` is the parent — as the format intends. Siblings
are sorted by id. Opening Graph is the best page in the file: the door subtype, the
ports, and the feed chain are all visible without leaving the record.

**Awkward at depth:** `edge_modules_publishes` joins `block_modules` (root layer) to
`block_card` (inside Modules). At root, `edgesIn` will not draw it; inside Modules it
reads as a line from the open frame to its own child. Fine as data, poor as a teaching
edge — a root-level Modules→something, or a card field, would read more clearly.

## Relationship records — ids only

Every edge is `source` / `target` by id. To learn that Page hosts Canvas you search
the tree for both ids. That is correct for the model (ids are stable; labels rename)
and hard for a human diff.

**What a reviewer would want beside the ids:** the end labels, as commentary the
writer does not round-trip — either a convention in samples (`// Page → Canvas` is
illegal in JSON), a non-stored preview in a future pretty-printer, or accepting that
hand files name edges so the *key* carries meaning (`edge_page_hosts_canvas` already
does; most keys here are good). The keys are doing more readability work than the
records. Keep that: require meaningful `edge_*` keys in samples even though the
runtime treats them as opaque.

## The bad key

```json
"undefined": {
  "source": "block_page",
  "target": "block_graph",
  …
}
```

Loads. Round-trips. Violates “ids say what they point at” (`edge_…`). Almost certainly
a template slip when the file was authored. **Not load-breaking**; left as-is per H.2.
Rename when next touching the sample (e.g. `edge_page_feeds_graph`).

## `meta` — should it carry more?

Today: `steps` and `module` only. Spec: nothing in `meta` affects how a file is read;
display preferences stay out; the project’s name and body live on root.

| Candidate | Verdict |
|---|---|
| Title / body | Already on root — do not duplicate |
| `module` | Preference; correctly ignorable |
| `steps: 1` | Honest for an imported checkpoint, odd for a hand file nobody stepped. Harmless. A hand sample could omit it (writer always emits it) |
| Author, created, description | Tempting, and would turn `meta` into a bucket. Spec’s test: dropping it must not change what the project *is*. Keep them out |
| Vocabulary | Already `graph.vocabulary` |

**No addition recommended.** The open question in tasks.md resolves as: meta is fine;
root is where a reviewer should look.

## Hand-authoring — is it pleasant?

**Pleasant**

- Nesting under `holds` matches how you think about the tree.
- Omitting `form` on ordinary blocks and text fields works (defaults fill in).
- Ties need no `type`; the note at an end is enough.
- Proxy `of`, group membership on the member, port `side`/`at`/`flow` are all short to write.
- Definitions-first, then tree, then edges — you can author top-down.

**Unpleasant / easy to get wrong**

1. **Edge keys are free strings.** The runtime will happily store `"undefined"`.
2. **Root fields keep defaults the rest of the file strips.** Four root fields write
   `"tags": []`; two write `"form": "text"`. Nested fields and definition fields omit
   both. Cause: `file.write` runs `fieldsOut` / `said` on branch fields, but dumps root
   fields through `said(rest)` whole. The sample mirrors the writer; a careful hand
   author copying a nested field as a model will “over-clean” root and still be valid.
3. **Cross-references are by id before the record exists.** You invent `group_engine`
   then point members at it; same for `type`, `of`, edge ends. No forward-reference
   problem in JSON, but you need a naming scheme up front (`block_`, `def_`, …).
4. **Declared fields vs edges.** `def_module` declares `depends` (ref, many); the sample
   expresses depends-on as edges instead and never fills the field. Both are legal;
   a reader may wonder which is canonical. (Edges draw; the field would not.)
5. **Coordinates only on the open layer’s cards.** Correct, and easy to forget when
   hand-placing a nested demo you expect to see from root.

**Defaults the sample still writes** (valid, noisy in diff): empty `tags` on root
fields; explicit `form: "text"` on root `kind` / `schema`; explicit `form: "block"` on
element definitions (necessary — definitions have no “default form” worth omitting).

## Spec checklist

| Rule | Sample |
|---|---|
| Schema 1.1 envelope | yes |
| Layout: defs → tree → edges | yes |
| Nesting; no written `parent` | yes |
| Siblings / edges in canonical order | yes |
| Nothing on an element’s own presentation | yes (colour on defs only) |
| Closed element / edge / field forms | all present |
| Derived reference and tie | proxy end; two note ends, typeless |
| `extends`, `components`, `names`, `size` | yes |
| Ids prefixed by kind | one miss: `"undefined"` |

## Fixes worth making later (not H.2)

- Rename `"undefined"` → `edge_page_feeds_graph` (or similar).
- Drop empty `tags` / default `form` on root fields once `file.write` runs them
  through `fieldsOut` (writer fix, then re-export).
- Reconsider `edge_modules_publishes` so it draws on the root layer.

## For Z.5 (tutorial)

The file can carry a walk: open root → open Graph → select check (Door) → follow feeds.
Notes on the right state the two laws. Missing for a tutorial: a scripted order of
gestures, and one relationship a newcomer can add without fighting cross-layer drawing.
