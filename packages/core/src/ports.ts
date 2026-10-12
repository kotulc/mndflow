/** The entire host contract. Declared here, bound by an app, implemented nowhere else. */

import type { Log } from "./types";

export type Storage = {
  read: () => Log | null;
  write: (log: Log) => void;
  clear: () => void;
};

/** A file read in: where it was, and what it says. One of a collection is a leaf of its folder. */
export type Leaf = { path: string; text: string };

export type Files = {
  /** Hand the user a file. */
  save: (name: string, text: string) => Promise<void>;
  /** Ask the user for a workspace or package file. */
  open: () => Promise<string | null>;
  /** Ask the user for one text file of the sorts said, by extension: a card's markdown, say. */
  text?: (accept: readonly string[]) => Promise<Leaf | null>;
  /** Ask the user for a folder, and read every file under it. */
  folder?: () => Promise<{ name: string; files: Leaf[] } | null>;
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
};

/** A storage that forgets. The default, so nothing has to guard for absence. */
export function no_storage(): Storage {
  return { read: () => null, write: () => {}, clear: () => {} };
}

export function no_files(): Files {
  return { save: async () => {}, open: async () => null };
}
