/** Scoring text against a fixed set of options.
 *
 *  This is the seam the whole suggestion system sits on: templates, chips, and
 *  near-miss names all come down to "which of these known options is this text
 *  closest to". Choosing among known options is a similarity problem, not a
 *  generation one, which is why nothing here calls a language model.
 *
 *  Character trigrams are the stand-in implementation — no dependencies, no
 *  download, instant. Swapping in sentence embeddings means replacing
 *  `vector()` and nothing else. */

const CACHE = new Map<string, Map<string, number>>();

/** Padded character trigrams, so short strings still overlap. */
function vector(text: string): Map<string, number> {
  const key = text.toLowerCase().trim();
  const hit = CACHE.get(key);
  if (hit) return hit;

  const padded = `  ${key}  `;
  const grams = new Map<string, number>();
  for (let i = 0; i < padded.length - 2; i += 1) {
    const gram = padded.slice(i, i + 3);
    grams.set(gram, (grams.get(gram) ?? 0) + 1);
  }

  CACHE.set(key, grams);

  return grams;
}

function magnitude(grams: Map<string, number>): number {
  let total = 0;
  for (const count of grams.values()) total += count * count;

  return Math.sqrt(total);
}

/** Cosine similarity of two strings, 0 when they share nothing. */
export function similarity(left: string, right: string): number {
  const a = vector(left);
  const b = vector(right);
  let dot = 0;
  for (const [gram, count] of a) dot += count * (b.get(gram) ?? 0);

  const size = magnitude(a) * magnitude(b);

  return size ? dot / size : 0;
}

export type Scored = { id: string; score: number };

/** Every option scored against the text, best first. Options map an id to the
 *  words that describe it — a chip's label, a template's tags. Zero scores are
 *  kept so a debug view can show what lost as well as what won. */
export function score(text: string, options: Record<string, string>): Scored[] {
  const said = text.trim();
  if (!said) return Object.keys(options).map((id) => ({ id, score: 0 }));

  return Object.entries(options)
    .map(([id, about]) => ({ id, score: similarity(said, about) }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** Scored against the closest single phrase of each option, rather than all of
 *  them joined. A long tag list otherwise dilutes every match: the more words
 *  an option is described by, the worse it scores against any one of them. */
export function scoreAny(text: string, options: Record<string, string[]>): Scored[] {
  return Object.entries(options)
    .map(([id, phrases]) => ({
      id,
      score: Math.max(0, ...phrases.map((phrase) => similarity(text, phrase))),
    }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/** Best match above a floor, or "" when nothing is close enough. Not guessing
 *  is always an option — the caller has a fallback and the user has eyes. */
export function best(text: string, options: Record<string, string[]>, floor = 0.3): string {
  const [top] = scoreAny(text, options);

  return top && top.score >= floor ? top.id : "";
}
