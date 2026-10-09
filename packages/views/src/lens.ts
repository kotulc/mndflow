/** The layer views drawn from what a block means rather than what it holds. **`entity`**: the
 *  block's attributes, the entities they link to and those linking to it. **`lineage`**: what it
 *  extends, its subtypes, and what carries or uses it. **`definitions`**: a package's
 *  definitions, as the overhead boxes them, joined where one extends or links another.
 *
 *  Each draws in bands down the page, the block itself lit. Drawn, never stored: a graph handed
 *  back for a projection to read, every block keeping its id, so a pick is the block's. */

import { all_defs, attributes_of, chain_of, children, def_at, def_of, is_group, isa, links_to,
         shown_name, subtypes, traits_of, used_by, type Block, type Definition, type Graph,
         type Id, type Relation } from "@mnd/core";
import { survey_graph, FOREST } from "./survey";

/** The layer an entity or a lineage is drawn on. */
export const LENS = "@lens";

/** The most a band of users draws; the band's name says how many there are. */
const MOST = 24;

/** How an extends line draws: an open triangle at what is extended. */
const EXTENDS = { line: { to_arrow: "hollow" } };

/** How a link draws: dashed, an open head at what it names. */
const LINKS = { line: { to_arrow: "open" }, style: { border_style: "dashed" } };

/** A band: its name and what it draws. */
type Band = { name: string; blocks: readonly Block[] };


/** The block's entity or lineage on the `LENS` layer, or a package's definitions on the
 *  overhead's. */
export function lens_graph(graph: Graph, id: Id, kind: "entity" | "lineage" | "definitions",
                           across?: number): Graph {
  if (kind === "definitions") return definitions_graph(graph, id, across);
  const bands = kind === "entity" ? entity_bands(graph, id) : lineage_bands(graph, id);
  /** A lineage draws its chain's spine; the bands below say what they are without a line each. */
  const edges = kind === "entity" ? link_lines(graph, ids_of(bands))
    : extends_lines(graph, ids_of(bands.slice(0, 2)));
  return banded(graph, bands, edges, kind === "entity", across);
}

/** What draws in an entity: what it links to, itself, what links to it — and, for a usage, what
 *  it answers. */
function entity_bands(graph: Graph, id: Id): Band[] {
  const b = graph.blocks[id]!;
  const def = b.def ? id : def_of(graph, id);
  const to = attributes_of(graph, def).map((a) => links_to(graph, a)).filter((t): t is Id => !!t);
  if (b.def) {
    const from = all_defs(graph).filter((d) => d.id !== id
      && (d.def.attributes ?? []).some((a) => links_to(graph, a) === id));
    return [{ name: "links to", blocks: defs(graph, to) },
            { name: "entity", blocks: [b] },
            { name: "linked from", blocks: from }];
  }
  /** A usage links to the usages its values name, and is answered by those naming it. */
  const named = (target: Id, value?: string) => Object.values(graph.blocks).filter((x) => !x.def
    && !!value && isa(graph, x.type).some((d) => d.id === target)
    && shown_name(graph, x.id) === value);
  const links = attributes_of(graph, def).flatMap((a) => {
    const target = links_to(graph, a);
    return target ? named(target, b.values?.find((v) => v.name === a.name)?.value) : [];
  });
  const name = shown_name(graph, id);
  const from = Object.values(graph.blocks).filter((x) => !x.def && x.id !== id
    && attributes_of(graph, x.type).some((a) => {
      const target = links_to(graph, a);
      return !!target && isa(graph, b.type).some((d) => d.id === target)
        && x.values?.some((v) => v.name === a.name && v.value === name);
    }));
  return [{ name: "is a", blocks: defs(graph, def ? [def] : []) },
          { name: "links to", blocks: links },
          { name: "entity", blocks: [b] },
          { name: "linked from", blocks: from }];
}

/** What draws in a lineage: the chain it extends, farthest first, itself, the traits in force on
 *  it, its subtypes, and what carries or uses it. */
function lineage_bands(graph: Graph, id: Id): Band[] {
  const b = graph.blocks[id]!;
  const above = above_of(graph, b);
  const users = [...used_by(graph, id),
                 ...Object.values(graph.blocks).filter((x) => x.of === id)];
  const name = users.length > MOST ? `used by · ${MOST} of ${users.length}` : "used by";
  return [{ name: b.def ? "extends" : "is a", blocks: [...above].reverse() },
          { name: b.def ? "definition" : "usage", blocks: [b] },
          { name: "carries", blocks: b.def ? defs(graph, traits_of(graph, id)) : [] },
          { name: "subtypes", blocks: b.def ? subtypes(graph, id) : [] },
          { name, blocks: users.slice(0, MOST) }];
}

/** The chain above a block, nearest first: what a definition extends, or what a usage is. */
function above_of(graph: Graph, b: Block): Definition[] {
  return b.def ? chain_of(graph, b.id).slice(1) : chain_of(graph, def_of(graph, b.id));
}

/** The definitions these ids name, once each. */
function defs(graph: Graph, ids: readonly Id[]): Block[] {
  return [...new Set(ids)].map((t) => def_at(graph, t)).filter((d): d is Definition => !!d);
}

/** What the bands draw, by id. */
function ids_of(bands: readonly Band[]): Set<Id> {
  return new Set(bands.flatMap((band) => band.blocks.map((b) => b.id)));
}

/** A line from each block drawn to the nearest drawn one its chain extends. */
function extends_lines(graph: Graph, shown: ReadonlySet<Id>): Relation[] {
  return [...shown].flatMap((id) => {
    const b = graph.blocks[id]!;
    const up = above_of(graph, b).find((d) => shown.has(d.id));
    return up && up.id !== id
      ? [{ id: `@extends:${id}`, from: id, to: up.id, dir: "forward" as const, settings: EXTENDS }]
      : [];
  });
}

/** A line for each attribute a drawn definition declares that names another drawn one. Links
 *  between usages are the projection's own (`linked_graph`). */
function link_lines(graph: Graph, shown: ReadonlySet<Id>): Relation[] {
  return [...shown].flatMap((id) => (graph.blocks[id]?.def?.attributes ?? []).flatMap((a) => {
    const to = links_to(graph, a);
    return to && to !== id && shown.has(to)
      ? [{ id: `@link:${id}:${a.name}:${to}`, from: id, to, name: a.name, dir: "forward" as const,
           settings: LINKS }]
      : [];
  }));
}

/** The bands down the page on the `LENS` layer, each a group of its blocks — a block drawn once,
 *  in its first band — and only these lines. An entity's cards show their attributes. */
function banded(graph: Graph, bands: readonly Band[], edges: readonly Relation[], large: boolean,
                across?: number): Graph {
  const blocks: Record<Id, Block> = { ...graph.blocks,
    [LENS]: { id: LENS, parent: null, name: "lens",
              settings: { layout: { kind: "page", ...(large ? { face: "large" } : {}),
                                    ...(across ? { across } : {}) } } } };
  const seen = new Set<Id>();
  bands.forEach((band, n) => {
    const kept = band.blocks.filter((b) => !seen.has(b.id));
    if (!kept.length) return;
    const id = `${LENS}:${n}`;
    blocks[id] = { id, parent: LENS, type: "group", order: n + 1, name: band.name };
    kept.forEach((b, at) => {
      seen.add(b.id);
      blocks[b.id] = { ...drawn(graph, b, large), parent: id, order: at + 1 };
    });
  });
  const kept = edges.filter((e) => seen.has(e.from) && seen.has(e.to));
  return { ...graph, blocks, edges: Object.fromEntries(kept.map((e) => [e.id, e])) };
}

/** A block as a band draws it: a card — a group as a folder, its members behind it — showing
 *  its attributes where asked. */
function drawn(graph: Graph, b: Block, attributes: boolean): Block {
  const card = { ...b, ...(is_group(graph, b.id) ? { type: "folder" } : {}) };
  if (!attributes) return card;
  const said = (b.settings?.["card"] ?? {}) as { shows?: string[] };
  const shows = ["attributes", ...(said.shows ?? []).filter((s) => s !== "attributes")];
  return { ...card, settings: { ...card.settings, card: { ...said, shows } } };
}

/** A package's definitions as the overhead boxes them, joined where one extends or links
 *  another. */
function definitions_graph(graph: Graph, pkg: Id, across?: number): Graph {
  const drawn = survey_graph(graph, pkg, "tree", across ? { across } : {});
  const shown = new Set<Id>();
  const walk = (id: Id) => {
    for (const c of children(drawn, id)) {
      if (graph.blocks[c.id]?.def) shown.add(c.id);
      walk(c.id);
    }
  };
  walk(FOREST);
  const edges = [...extends_lines(graph, shown), ...link_lines(graph, shown)];
  return { ...drawn, edges: Object.fromEntries(edges.map((e) => [e.id, e])) };
}
