/** Ids are wide enough that a collision means identity, and say what they point at. */

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** 12 base-36 characters: a collision means identity. */
function token(): string {
  let out = "";
  for (let i = 0; i < 12; i++) out += ALPHABET[Math.floor(Math.random() * 36)];
  return out;
}

export function new_id(kind: "block" | "edge" | "holder" | "def" | "rel" | "pkg" | "step"
                         | "type" | "tag" | "port" | "interface" | "constraint"): string {
  return `${kind}_${token()}`;
}
