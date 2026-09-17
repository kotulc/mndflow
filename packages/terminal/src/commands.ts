/** The commands the terminal answers to. */

import type { Score } from "@mnd/core";

export type Command = "add" | "search" | "help";

/** One thing that can be reached from here. */
export type Offer = {
  name: string;
  about: string;
  /** What it needs said, derived from the action's arguments. */
  asks?: string;
  /** What it would act on, for help to light. */
  on?: readonly string[];
};

export type Wording = {
  command: Command;
  /** What it does, so a completion can say what it matched. */
  about: string;
  /** What the argument is, with an example. */
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

/** Examples, never a closed list. */
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

/** What a line reads as. */
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

  /** A word nobody listed is matched by meaning through the score port. */
  const meant = score ? nearest(want, score) : null;
  if (meant) return { command: meant, verb: word, rest: rest.join(" ") };
  return { command: "help", verb: "", rest: line };
}

/** One sentence per command to score against; never the verbs themselves. */
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

/** What to warm the scorer with: the commands and whatever is about to be offered. */
export function warming(offered: readonly Offer[] = []): string[] {
  return [...phrases().map((p) => p.said), ...offered.map(sentence)];
}

const sentence = (offer: Offer) => `${offer.name} — ${offer.about}`;

/** The offered list, ordered against what is typed. */
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

/** A name typed with separators reads as spaced words: `heat_exchanger` → `Heat Exchanger`. */
export function spaced(raw: string): string {
  return raw
    .split(/[\s_\-.]+/)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}
