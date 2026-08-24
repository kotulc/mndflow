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
export type Ports = {
    storage: Storage;
    files: Files;
};
/** A storage that forgets. The default, so nothing has to guard for absence. */
export declare function no_storage(): Storage;
export declare function no_files(): Files;
