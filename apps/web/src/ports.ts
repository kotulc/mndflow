/** What the browser binds. */

import { createStore, del, get, keys, setMany } from "idb-keyval";
import type { Files, Log, Mutation, Net, Storage } from "@mnd/core";

const DB = createStore("mnd", "workspace");
const LOG = "log";
const OLD = "mnd.log.v2";

/** A body as the stored log carries it: the hash of text kept once, beside it. */
type Ref = { $blob: string };

/** The log in IndexedDB, with every body swapped for a content hash. */
export async function browser_storage(): Promise<Storage> {
  const stored = (await get<Log>(LOG, DB)) ?? old_log();
  const kept = new Set((await keys(DB)).map(String).filter((k) => k !== LOG));
  const log = stored ? await unpack(stored) : null;
  if (log) await sweep(stored!, kept);

  let pending: Log | null = null;
  let writing = false;
  const flush = async () => {
    writing = true;
    while (pending) {
      const next = pending;
      pending = null;
      try {
        const { packed, blobs } = await pack(next, kept);
        await setMany([...blobs, [LOG, packed]], DB);
        for (const [k] of blobs) kept.add(k);
        localStorage.removeItem(OLD);
      } catch {
        window.dispatchEvent(new CustomEvent("mnd:full"));
      }
    }
    writing = false;
  };

  return {
    read: () => log,
    write(next) {
      pending = next;
      if (!writing) void flush();
    },
    clear() {
      pending = null;
      void del(LOG, DB);
    },
  };
}

/** A log from before IndexedDB, if this browser still holds one. */
function old_log(): Log | null {
  try {
    const raw = localStorage.getItem(OLD);
    return raw ? (JSON.parse(raw) as Log) : null;
  } catch {
    return null;
  }
}

/** Every body in a mutation, including those inside a checkpoint's blocks. */
function bodies(m: Mutation): { body?: unknown }[] {
  if (m.op === "set_body") return [m];
  if (m.op === "add_block") return [m.block];
  if (m.op === "checkpoint") return Object.values(m.graph.blocks);
  return [];
}

/** The log with bodies swapped for hashes, and the texts not yet stored. */
async function pack(log: Log, kept: ReadonlySet<string>) {
  const packed: Log = structuredClone(log);
  const blobs: [string, string][] = [];
  for (const step of packed) {
    for (const m of step.mutations) {
      for (const holder of bodies(m)) {
        if (typeof holder.body !== "string" || !holder.body) continue;
        const key = await sha(holder.body);
        if (!kept.has(key) && !blobs.some(([k]) => k === key)) blobs.push([key, holder.body]);
        holder.body = { $blob: key } satisfies Ref;
      }
    }
  }
  return { packed, blobs };
}

/** The stored log with every hash swapped back for its text. */
async function unpack(stored: Log): Promise<Log> {
  const log = structuredClone(stored);
  for (const step of log) {
    for (const m of step.mutations) {
      for (const holder of bodies(m)) {
        const ref = holder.body as Ref | undefined;
        if (ref && typeof ref === "object") holder.body = (await get<string>(ref.$blob, DB)) ?? "";
      }
    }
  }
  return log;
}

/** Texts no step refers to any more are dropped. */
async function sweep(stored: Log, kept: Set<string>): Promise<void> {
  const used = new Set<string>();
  for (const step of stored) {
    for (const m of step.mutations) {
      for (const holder of bodies(m)) {
        const ref = holder.body as Ref | undefined;
        if (ref && typeof ref === "object") used.add(ref.$blob);
      }
    }
  }
  const gone = [...kept].filter((k) => !used.has(k));
  await Promise.all(gone.map((k) => del(k, DB)));
  for (const k of gone) kept.delete(k);
}

/** Hashes already worked out, so an unchanged body is never hashed twice. */
const hashed = new Map<string, string>();

async function sha(text: string): Promise<string> {
  const known = hashed.get(text);
  if (known) return known;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  const hex = [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
  hashed.set(text, hex);
  return hex;
}

/** Fetching, and nothing else; what comes back goes through the door. */
export function browser_net(): Net {
  return {
    async get(where) {
      try {
        const got = await fetch(where);
        return got.ok ? await got.text() : null;
      } catch {
        return null;
      }
    },
  };
}

export function browser_files(): Files {
  return {
    async save(name, text) {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    },
    open() {
      return new Promise((done) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json,.json";
        input.onchange = () => {
          const file = input.files?.[0];
          if (!file) return done(null);
          void file.text().then(done);
        };
        input.oncancel = () => done(null);
        input.click();
      });
    },
  };
}
