# Groups

A group is a parent. Its members are its children, so a block sits in one group, and deleting the group deletes them. This changes that. A group becomes a named panel on the layer, and membership is a library tag kept in sync with that block: `settings.tag.block` holds the block's id. Members stay filed where they are — on the layer, in a region, in a grid — and carry the tag. A block may be in several groups, nested or partly overlapping, and a group may cross regions. The panel is drawn around its members.

This is so grouping labels blocks that already have a place, instead of giving them a second one. Lands after plans/order.md. A group is never a model or a map organizer. A finding-tag is a different entry, so a domain tag and a group may share a spelling (`fulfilment`). Interfaces, attributes, and constraints are not changed.

## Steps

Each step ends verified: typecheck, tests, both samples `check` clean. Shop and Deployment are driven landscape and portrait after placement and the samples.

| # | Step | Where |
|---|---|---|
| 1 | **the setting**: `tag.block` on a library tag; `holder.panel` granted by *is group* instead of `holder.inline`. One question, `is_group`, read off `panel` | core `components.ts`, `types.ts` `TRAITS`, defs `group` |
| 2 | **membership**: `members_of` and `group_of` by the tag, on the group's layer. Containment questions stop using `parent` for a group | core `holders.ts` |
| 3 | **sync**: create, rename, delete, last member, and leaving the layer. One function, called by the actions | core `actions/groups.ts`, `blocks.ts` `delete` and `rename` |
| 4 | **the door**: `groups:` resolves to the layer's group tag; a group's `blocks:` is a fault. Writer emits `groups:` and leaves finding-tags in `tags:` | core `diagram.ts`, `sources.ts`, `card.ts` |
| 5 | **placement**: compounds for a tree inside one container; bounds pass for overlap and for a group across regions. The workaround marked in the code, not papered over | views `flow.ts` |
| 6 | **drawing**: the panel from member bounds, on the canvas and as a panel inside a map chip of `model_map`. No group box | views `layer.ts`, `scene.ts`, `map.ts`, stage `groups.css` |
| 7 | **tray, explorer, drag**: the tag shows as the group's, removable; the explorer has no group row and no group on a model path; a drop on the panel tags, a drop off untags, in editable views only | tray `Overview.tsx`, explorer `rows.ts`, core `drop.ts` |
| 8 | **samples** | below |
| 9 | **docs**: design.md and definitions.md already say it; the package docs still say a group holds by `parent` or deletes what it holds | core `schema.md`, `actions.md`, `model.md` |

Settled:

| | Rule |
|---|---|
| **sync** | The canvas block and its tag are one pair. Creating a group creates the tag and puts it on the selection. Renaming the block renames the tag. Deleting the block takes the tag off every carrier and deletes the tag. |
| **no members** | A group tag with no carriers is forgotten, and its canvas block goes with it. A group is made from a selection, never empty. Removing the last member removes the group. |
| **not a parent** | Members do not move. Deleting a group does not delete them. `delete_block` already deletes only the subtree under `parent`, so once members are not children they survive; the delete action still has to strip the tag. |
| **overlap** | A block may sit in groups that nest and in groups that only partly overlap. |
| **regions** | A group may gather blocks in different regions. Members stay in their bands. The panel is drawn around them anyway and may cross a band. |


## Membership

One home, core `holders.ts`: `members_of` a group is the blocks on its layer that carry its tag. Everywhere that walks a group's children for membership asks that, not `parent`. Regions, grids and folders stay parents.

| | |
|---|---|
| **the tag** | a library tag whose setting `tag.block` is the group block's id. Absent, a tag is a finding-tag. The engine reads the setting, never the tag's id. |
| **carried** | in the member's `tags`, beside its finding-tags. The tray shows it as given by that group. Taking it off there is `unmember`. |
| **scope** | the layer the group block is drawn on. A carrier that leaves the layer loses the tag. Another layer may have its own group of the same spelling; that is another tag. |
| **names** | unique among group tags on one layer. A finding-tag, a type or a definition may share the spelling: cases are separate name spaces. |
| **the block** | parented to the layer, a sibling of its regions, so it is not trapped in one band. It is notation: no explorer row, and it never opens. |
| **nesting** | derived, never stored. Group A sits inside group B when A's members are a proper subset of B's. Equal sets are two panels on the same blocks. |

`given_of` stops inventing a group's tag from enclosure. Region tags stay derived from `parent`, label tags from the tie.

| Action | Does |
|---|---|
| `group` | makes the block and the tag, adds the tag to each selected block, leaves `parent` alone. Refuses a selection that is not on this layer. |
| `unmember` | takes this group's tag off the block. The last carrier takes the group and the tag with it. |
| `delete` | on a group: strip the tag from every carrier, delete the tag, delete the block. Members stay. |
| `rename` | one name, written on the block and the tag. |
| `room` | the block is retyped a plain block, the members move under it, the tag is deleted. |
| drag onto the panel | adds the tag. Dragging a member out takes the tag off. Neither changes `parent`. |

The file says membership beside finding-tags, so a domain tag is not silently reread as a group:

```yaml
- name: eu-west cluster
  type: group
- name: gateway pod
  groups: [eu-west cluster, shop namespace]
  tags: [critical]
```

`groups:` names a group block on this layer. A group that still has a `blocks:` list is a fault. The door does not repair the old shape; the samples are rewritten.


## Placement

Members are placed by their real parent: the layer, the region, the grid. The group is not a node in that run.

**Where membership is a tree inside one container** — nested or disjoint, and every member in the same region or all loose on the layer — each group is an ELK compound of its members, nested compounds for nested groups, inside that band. Members stay together.

**Otherwise** the group is not a compound. Members land where the bands and the grid put them. This is a workaround. ELK cannot put one node in two compounds, and a compound cannot sit in two partitions. It covers two cases:

| Case | What happens |
|---|---|
| **partial overlap** | two groups share some members and neither set contains the other |
| **across regions** | members sit in more than one band |

The panel is then the bounds of wherever those blocks landed, plus the same gap a compound's panel uses. It can cross a band's rule. Alternatives, not part of this item: a layout that clusters overlapping sets directly, instead of compounds plus a bounds pass.

`is group` grants `holder.panel`, not `holder.inline`. `inline`, `is_box` and `drawn_in` stop treating a group as something that holds children. `can_hold` refuses a group. The base `group` definition loses *has parts*.


## Drawing

The panel is the members' bounds plus a gap, its name on it, no rim. Nested panels nest. Overlapping panels each draw their own bounds and may cross. A group with no placed members draws nothing.

On the map a block is drawn once, where it is filed. A group is a panel over those cells, inside the diagram chip, including across a chip's region bands. It is not a box and not a second home for a diagram.


## Samples

| Sample | Becomes |
|---|---|
| **Deployment** | cluster and namespaces are sibling groups. Each pod carries its namespace and the cluster. Nested, one container, so the compounds keep them together |
| **Estate** | the two groups are siblings; the references carry `groups:` and stay children of Estate |
| **Shop** | a group `fulfilment` on the Shop layer over Inventory and Shipping. They keep the domain tag `fulfilment` and gain the group |
| **elements** | the existing group restated without `blocks:`. One partial overlap, and one group whose members sit in two regions, so the bounds workaround is on screen |


## Done when

Deployment and Shop draw their groups, both canvas shapes, and the elements sample shows an overlap and a group across two regions. Deleting a group leaves its members and removes the tag. Removing the last member removes the group. A finding-tag of the same spelling is still a finding-tag.
