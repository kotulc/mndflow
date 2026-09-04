/** The commands the terminal answers to.
 *
 *  **Three, and the strip stays short.** Everything else a person could want is
 *  an action, and **help carries the whole action surface** — so nothing becomes
 *  unreachable by text without the strip growing a fourth thing.
 *
 *  **The verb lists are examples, not an enumeration.** Somebody will type a
 *  word nobody listed, and substring matching cannot answer that: meaning
 *  matching through the `score` port and a learned store of what this person
 *  actually reaches for are both meant to point at these same three. Until one
 *  is bound, the lists below and the help fallback are what there is. */

import type { Score } from "@mnd/core";

export type Command = "add" | "search" | "help";

/** One thing that can be reached from here. **The sentence is what gets
 *  matched**, because a name is too short to match against. */
export type Offer = {
  name: string;
  about: string;
  /** What it needs said, so **help teaches whatever the app currently is**:
   *  derived from the action's own arguments, never written down twice. */
  asks?: string;
  /** What it would act on. **Help points at the control it is describing**, and
   *  it points with the one lit-target look every surface uses. */
  on?: readonly string[];
};

export type Wording = {
  command: Command;
  /** What it does, so a completion can say what it matched. */
  about: string;
  /** What the argument is, filled with an example rather than left blank — a
   *  prompt that shows its own shape needs no syntax to learn. */
  asks: string;
  example: string;
};

export const COMMANDS: Record<Command, Wording> = {
  add: { command: "add", about: "make blocks here", asks: "name them",
         example: "Heat Exchanger" },
  search: { command: "search", about: "find a definition package and bring it in",
            asks: "look for", example: "sysml" },
  help: { command: "help", about: "docs, a tutorial, and every action there is",
          asks: "ask about", example: "how do I relate two blocks" },
};

/** Examples, never a closed list. A sigil may be glued to its argument. */
const VERBS: Record<Command, string[]> = {
  add: ["+", "b", "block", "new", "add", "insert", "create"],
  search: ["*", "s", "search", "import", "load", "package"],
  help: ["?", "h", "help", "doc", "docs", "guide", "how"],
};

const SIGILS: Record<string, Command> = { "+": "add", "*": "search", "?": "help" };

export type Match = {
  command: Command;
  /** The word that reached it, so a completion can say what it matched. */
  verb: string;
  /** The rest of the line. */
  rest: string;
};

/** What a line reads as.
 *
 *  **Help is the fallback**, so anything unmatched lands in interactive docs
 *  rather than in a refusal — which is what keeps every action reachable by
 *  text without the strip knowing about any of them. */
export function reads(draft: string, score?: Score): Match | null {
  const line = draft.trimStart();
  if (!line) return null;

  const sigil = SIGILS[line[0]!];
  if (sigil) return { command: sigil, verb: line[0]!, rest: line.slice(1).trim() };

  const [word = "", ...rest] = line.split(/\s+/);
  const want = word.toLowerCase();
  for (const command of Object.keys(VERBS) as Command[]) {
    if (VERBS[command].some((v) => v === want)) {
      return { command, verb: word, rest: rest.join(" ") };
    }
  }

  /** **The verb lists are examples, not an enumeration**, and substring cannot
   *  answer a word nobody listed. This is the gap the port closes: what the
   *  word *meant*, if it meant one of them. Unbound, help is the fallback,
   *  which is not a refusal. */
  const meant = score ? nearest(want, score) : null;
  if (meant) return { command: meant, verb: word, rest: rest.join(" ") };
  return { command: "help", verb: "", rest: line };
}

/** One sentence per command, and **never the verbs themselves**.
 *
 *  A verb is one short word, and a short word is close to every other short
 *  word — scoring against the lists is what makes nonsense reach a command
 *  rather than help. The verbs are matched literally above; what is left to
 *  answer is what the word *meant*, and that needs a sentence to mean it
 *  against. */
function phrases(): { said: string; command: Command }[] {
  return (Object.keys(VERBS) as Command[]).map((command) => {
    const w = COMMANDS[command];
    return { said: `${w.command} — ${w.about}, ${w.asks}`, command };
  });
}

/** What a word this build never listed most likely meant, or null. */
function nearest(word: string, score: Score): Command | null {
  const said = phrases();
  const at = score.nearest(word, said.map((p) => p.said));
  return at === null ? null : said[at]?.command ?? null;
}

/** What to ask the scorer about before anybody types: the commands, and
 *  whatever a caller is about to offer. */
export function warming(offered: readonly Offer[] = []): string[] {
  return [...phrases().map((p) => p.said), ...offered.map(sentence)];
}

const sentence = (offer: Offer) => `${offer.name} — ${offer.about}`;

/** The offered list, ordered against what is typed.
 *
 *  **Ranked, never filtered** — a low score is a weak match and dropping one
 *  needs a floor the caller does not own, so meaning reorders and keeps
 *  everything. **Substring is the cold fallback**, and it filters, because a
 *  substring miss is a definite miss and ordering is all it could otherwise do.
 *  A literal match still leads, so binding the port never buries an exact hit. */
export function rank(offered: readonly Offer[], draft: string, score?: Score): Offer[] {
  const want = draft.trim().toLowerCase();
  if (!want) return [...offered];
  const holds = (o: Offer) => `${o.name} ${o.about}`.toLowerCase().includes(want);
  if (!score) return offered.filter(holds);

  const got = score.rank(draft.trim(), offered.map(sentence));
  return offered
    .map((offer, n) => ({ offer, at: n, score: got[n] ?? 0, holds: holds(offer) }))
    .sort((a, b) => Number(b.holds) - Number(a.holds) || b.score - a.score || a.at - b.at)
    .map((o) => o.offer);
}

/** **A name typed with separators reads as spaced words**, so nobody has to
 *  reach for the shift key to name a thing: `heat_exchanger` → `Heat Exchanger`. */
export function spaced(raw: string): string {
  return raw
    .split(/[\s_\-.]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}
