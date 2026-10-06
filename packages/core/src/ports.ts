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
