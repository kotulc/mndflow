/** Ids are wide enough that a collision means identity, and say what they point at.
 *
 *  A name is never part of an id: it would go stale on a rename, or force the
 *  id to be rewritten everywhere, which is the whole point of having one. */

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** 12 base-36 characters — enough that an accidental collision is not a case
 *  worth designing for, so a collision on import means the two really are the
 *  same thing. */
function token(): string {
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[Math.floor(Math.random() * 36)];
  return out;
}

export function new_id(kind: "block" | "edge" | "def" | "rel" | "step"): string {
  return `${kind}_${token()}`;
}

/** The id a kind's default definition is filed under: `def_default_note`,
 *  `rel_default_tie`. */
export function default_id(kind: string, group: "block" | "relation" = "block"): string {
  return `${group === "relation" ? "rel" : "def"}_default_${kind}`;
}
