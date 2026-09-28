/** What the open layer draws, as the key to reading it. */

import { MARK_MEANING, type Mark, type Role } from "@mnd/core";
import type { Look } from "./look";
import type { Scene } from "./scene";

/** One row: a swatch and what it means. A kind row paints itself from the look it folds, so the
 *  swatch is the card's own paint rather than a second answer about it. */
export type Row = {
  key: string;
  word: string;
  /** How many of it the layer draws. */
  count: number;
  /** Kinds only: the paint, straight off a card that wears it. */
  look?: Look;
  /** Kinds only: what the icon falls back to where the look set none. */
  role?: Role;
  /** Marks only: what standing in for that thing means. */
  about?: string;
};

/** The key to one layer: what its cards are, and what they stand in for. */
export type Legend = { kinds: Row[]; marks: Row[] };

/** Cards drawn the same way fold together, so one kind restyled by hand counts its variants
 *  separately until `one_per_word` decides which of them the kind looks like. */
function kind_key(look: Look | undefined, word: string, role: Role | undefined): string {
  const paint = !look ? "" : look.hue === undefined ? look.family
                                                    : `${look.hue}/${look.intensity ?? ""}`;
  return `${word}|${paint}|${look?.icon ?? ""}|${role ?? ""}`;
}

/** One row per word, painted as most of its cards are. **A card somebody restyled is an
 *  exception, not a second kind** — listing it again would say the layer holds two sorts of
 *  block when it holds one, drawn twice. */
function one_per_word(rows: Iterable<Row>): Row[] {
  const out = new Map<string, Row>();
  for (const row of rows) {
    const had = out.get(row.word);
    if (!had) out.set(row.word, { ...row, key: row.word });
    else if (row.count > had.count) out.set(row.word, { ...row, key: row.word,
                                                        count: had.count + row.count });
    else had.count += row.count;
  }
  return [...out.values()];
}

/** What the open layer draws, folded and counted. Read off the scene alone: everything a card
 *  wears is already on it, so nothing here asks the graph a second time. */
export function legend_of(scene: Scene): Legend {
  const kinds = new Map<string, Row>();
  const marks = new Map<string, Row>();

  for (const n of scene.nodes) {
    /** A cell is its grid's lattice, not a card of its own. */
    if (n.data.marks.includes("cell")) continue;

    const word = n.data.look?.kind ?? n.data.role ?? "block";
    const key = kind_key(n.data.look, word, n.data.role);
    const kind = kinds.get(key);
    if (kind) kind.count++;
    else kinds.set(key, { key, word, count: 1,
                          ...(n.data.look ? { look: n.data.look } : {}),
                          ...(n.data.role ? { role: n.data.role } : {}) });

    for (const stamp of n.data.stamps ?? []) {
      const mark = marks.get(stamp);
      if (mark) mark.count++;
      else marks.set(stamp, { key: stamp, word: stamp, count: 1,
                              about: MARK_MEANING[stamp as Mark] });
    }
  }

  const by_word = (a: Row, z: Row) => a.word.localeCompare(z.word);
  return { kinds: one_per_word(kinds.values()).sort(by_word),
           marks: [...marks.values()].sort(by_word) };
}
