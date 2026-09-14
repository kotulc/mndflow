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

export function new_id(kind: "block" | "edge" | "def" | "step"): string {
  return `${kind}_${token()}`;
}

/** A definition minted from a name somebody typed, so it settles rather than
 *  churning on every fold. **Each group has its own prefix** — `def_` for a
 *  block, `rel_` for a relation — so a block and a line may share a name. */
export function def_id(name: string, group: "block" | "relation" = "block"): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${group === "relation" ? "rel" : "def"}_${slug || "unnamed"}`;
}
