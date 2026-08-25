/** The entire host contract. Declared here, bound by an app, implemented nowhere else.
 *
 *  Nothing but a port may assume where a project lives. An unbound port is a
 *  capability the app does without, never a feature reimplemented. */

import type { Log } from "./types";

export type Storage = {
  read: () => Log | null;
  write: (log: Log) => void;
  clear: () => void;
};

export type Files = {
  /** Hand the user a file. */
  save: (name: string, text: string) => Promise<void>;
  /** Ask the user for one. */
  open: () => Promise<string | null>;
};

/** Text similarity, for ranking.
 *
 *  **It answers now, from what it has.** Ranking happens while something is
 *  being drawn, so a text it has not measured yet scores 0 and improves once it
 *  has — `warm` is how a caller says what it is about to ask about, and `watch`
 *  is how it hears that more can be answered than could before.
 *
 *  **`nearest` keeps the floor where the numbers mean something.** What counts
 *  as close enough is a property of whatever is measuring, not of whoever is
 *  asking, and **not guessing is always an option** — null is an answer. */
export type Score = {
  /** How close the text is to each option, 0 to 1, in the order given. */
  rank: (text: string, against: readonly string[]) => number[];
  /** Which option the text means, by position, or null when none is close. */
  nearest: (text: string, against: readonly string[]) => number | null;
  /** Ask for these ahead of being asked about them. */
  warm: (texts: readonly string[]) => void;
  /** Called when more can be answered. Returns how to stop listening. */
  watch: (fn: () => void) => () => void;
};

/** Fetching something from outside the workspace.
 *
 *  **One verb, and it answers in text.** What arrives is a file like any other
 *  and comes in through the door like any other — so nothing fetched is trusted
 *  more than something opened, and a package written by a newer build is
 *  repaired rather than believed.
 *
 *  Null where there was nothing there. **Why not is not a return value**: a
 *  host that cannot fetch is a host without the port. */
export type Net = {
  get: (where: string) => Promise<string | null>;
};

export type Ports = {
  storage: Storage;
  files: Files;
  /** Both **unbound is a capability the app does without.** There is no null
   *  scorer and no null fetcher: one would make *cold* and *absent* the same
   *  answer, and what a caller does without each is its own to decide —
   *  ranking falls back to substring, and searching says it cannot. */
  net?: Net;
  score?: Score;
};

/** A storage that forgets. The default, so nothing has to guard for absence. */
export function no_storage(): Storage {
  return { read: () => null, write: () => {}, clear: () => {} };
}

export function no_files(): Files {
  return { save: async () => {}, open: async () => null };
}
