/** The four commands the terminal answers to.
 *
 *  **The strip stays four commands wide.** Everything else a person could want
 *  is an action, and **help carries the whole action surface** — so nothing
 *  becomes unreachable by text without the strip growing a fifth thing.
 *
 *  **The verb lists are examples, not an enumeration.** Somebody will type a
 *  word nobody listed, and substring matching cannot answer that: meaning
 *  matching through the `score` port and a learned store of what this person
 *  actually reaches for are both meant to point at these same four. Until one
 *  is bound, the lists below and the help fallback are what there is. */

export type Command = "add" | "filter" | "search" | "help";

export type Said = {
  command: Command;
  /** What it does, so a completion can say what it matched. */
  about: string;
  /** What the argument is, filled with an example rather than left blank — a
   *  prompt that shows its own shape needs no syntax to learn. */
  asks: string;
  example: string;
};

export const COMMANDS: Record<Command, Said> = {
  add: { command: "add", about: "make blocks here", asks: "name them",
         example: "Heat Exchanger" },
  filter: { command: "filter", about: "narrow the workspace to what matches",
            asks: "match what", example: "pump" },
  search: { command: "search", about: "find a definition package and bring it in",
            asks: "look for", example: "sysml" },
  help: { command: "help", about: "docs, a tutorial, and every action there is",
          asks: "ask about", example: "how do I relate two blocks" },
};

/** Examples, never a closed list. A sigil may be glued to its argument. */
const VERBS: Record<Command, string[]> = {
  add: ["+", "b", "block", "new", "add", "insert", "create"],
  filter: [":", "f", "find", "filter", "scope", "view"],
  search: ["*", "s", "search", "import", "load", "package"],
  help: ["?", "h", "help", "doc", "docs", "guide", "how"],
};

const SIGILS: Record<string, Command> = { "+": "add", ":": "filter", "*": "search", "?": "help" };

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
export function reads(draft: string): Match | null {
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
  return { command: "help", verb: "", rest: line };
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
