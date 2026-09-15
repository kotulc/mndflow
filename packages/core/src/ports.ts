/** The entire host contract. Declared here, bound by an app, implemented nowhere else. */

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

/** Text similarity, for ranking. */
export type Score = {
  /** How close the text is to each option, 0 to 1, in the order given. */
  rank: (text: string, against: readonly string[]) => number[];
  /** Which option the text means, by position, or null when none is close. */
  nearest: (text: string, against: readonly string[]) => number | null;
  /** Ask for these ahead of being asked about them. */
  warm: (texts: readonly string[]) => void;
  /** Called when more can be answered. */
  watch: (fn: () => void) => () => void;
};

/** Fetching something from outside the workspace. */
export type Net = {
  get: (where: string) => Promise<string | null>;
};

export type Ports = {
  storage: Storage;
  files: Files;
  /** Unbound means the app does without. */
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
