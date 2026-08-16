/** Keeping step logs across refreshes — one key per project.
 *
 *  With no server, the tab *is* the process — a stray reload would otherwise
 *  be indistinguishable from losing the project. Each project's log is the only
 *  thing saved for it, because everything else is folded from that log.
 *
 *  A key appears on the first change, not on being opened: an imported
 *  checkpoint nobody has touched is stored by nothing and costs nothing.
 *  Remembering those without a key is the workspace's job.
 *
 *  Workspace state sits on its own key: which projects are open, and in what
 *  order. It is not a step log and never shares a slot with one.
 *
 *  Storage failures are never fatal to the session — but they are never
 *  silent either. A log that has outgrown the quota goes on working until the
 *  tab is closed and then loses everything since the failure, so `save` reports
 *  whether it worked and the shell says so. Before giving up, other projects'
 *  history is folded into a checkpoint — the cheapest thing to give up — and
 *  `watchPressure` carries a note distinct from "not being saved".
 *
 *  Where Chromium offers the File System Access API, an export or import can
 *  also hold a live handle to the file on disk, so the shell can say when that
 *  file changes underneath the session. Elsewhere — and when the picker is
 *  refused — the download path stays the way out. */

import { fold, isCheckpoint, stepsIn } from "./fold";
import { newId, step as makeStep, type Step } from "./types";

/** The Chromium handle surface. Typed locally: the DOM lib this build uses
 *  does not yet name these, and a missing API is detected at the call site. */
type FileHandle = {
  /** Present on real FileSystemFileHandle — used so a workspace export does
   *  not silently overwrite a bound project file (and the reverse). */
  name?: string;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string | Blob): Promise<void>;
    close(): Promise<void>;
  }>;
  queryPermission?(opts: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(opts: { mode: "read" | "readwrite" }): Promise<PermissionState>;
};

type PickerHost = {
  showSaveFilePicker?(opts?: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }): Promise<FileHandle>;
  showOpenFilePicker?(opts?: {
    multiple?: boolean;
    types?: { description: string; accept: Record<string, string[]> }[];
  }): Promise<FileHandle[]>;
};

const FILE_TYPE = {
  description: "mndflow project",
  accept: { "application/json": [".json", ".mndflow.json"] },
};

/** Stem shared by the JSON source and the SVG that sits beside it. */
function stemOf(title: string): string {
  return (title || "mndflow").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/** Suggested download / picker name — same rule as the anchor download. */
function fileName(title: string): string {
  return `${stemOf(title)}.mndflow.json`;
}

/** Suggested name for a rendered SVG of the open layer. */
function svgFile(title: string): string {
  return `${stemOf(title)}.svg`;
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Whether this tab can open or write a live file handle. */
export function canBind(): boolean {
  const w = globalThis as PickerHost;

  return typeof w.showSaveFilePicker === "function"
    && typeof w.showOpenFilePicker === "function";
}

/** The file this session is bound to, and the lastModified we last wrote or
 *  read. Anything newer on disk is drift. */
let held: { handle: FileHandle; known: number } | null = null;
let drifted = false;
let tick: ReturnType<typeof setInterval> | null = null;
let pageWatched = false;
const listeners = new Set<(next: boolean) => void>();

function sayDrift(next: boolean) {
  if (drifted === next) return;
  drifted = next;
  for (const listener of listeners) listener(drifted);
}

/** True when the handle is the file `writeOut` would write for this title. */
function sameFile(handle: FileHandle, want: string): boolean {
  // No name (tests, odd hosts) — keep writing the bound handle.
  if (!handle.name) return true;

  return handle.name === want;
}

async function permit(handle: FileHandle, mode: "read" | "readwrite"): Promise<boolean> {
  if (!handle.queryPermission || !handle.requestPermission) return true;
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === "granted") return true;

  return (await handle.requestPermission(opts)) === "granted";
}

/** Re-check as soon as the tab is looked at again — the interval alone would
 *  leave drift invisible for up to two seconds after a switch back. */
function watchPage(): void {
  if (pageWatched || typeof document === "undefined") return;
  pageWatched = true;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void poll();
  });
  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("focus", () => { void poll(); });
  }
}

async function take(handle: FileHandle, known?: number): Promise<void> {
  const stamp = known ?? (await handle.getFile()).lastModified;
  held = { handle, known: stamp };
  sayDrift(false);
  watchPage();
  if (tick === null && typeof setInterval === "function") {
    tick = setInterval(() => { void poll(); }, 2000);
  }
}

async function poll(): Promise<void> {
  const current = held;
  if (!current || (typeof document !== "undefined" && document.hidden)) return;

  try {
    if (!(await permit(current.handle, "read"))) return;
    // A release or a new take during the await owns the warning channel now.
    if (held !== current) return;
    const file = await current.handle.getFile();
    if (held !== current) return;
    sayDrift(file.lastModified !== current.known);
  } catch {
    // Permission revoked or the file is gone — drop the handle rather than
    // keep warning about a file we can no longer see.
    if (held === current) release();
  }
}

/** Subscribe to whether the bound file has changed underneath. Fires once
 *  with the current value, then on each change. */
export function watch(listener: (next: boolean) => void): () => void {
  listeners.add(listener);
  listener(drifted);

  return () => { listeners.delete(listener); };
}

/** True while a bound file's lastModified is newer than what we last touched. */
export function isDrifted(): boolean {
  return drifted;
}

/** Drop the live handle — a new empty project, or an import with no handle. */
export function release(): void {
  held = null;
  if (tick !== null) {
    clearInterval(tick);
    tick = null;
  }
  sayDrift(false);
}

async function writeHandle(text: string): Promise<boolean> {
  const current = held;
  if (!current) return false;

  try {
    if (!(await permit(current.handle, "readwrite"))) return false;
    if (held !== current) return false;
    const out = await current.handle.createWritable();
    await out.write(text);
    await out.close();
    if (held !== current) return false;
    const file = await current.handle.getFile();
    if (held !== current) return false;
    held = { handle: current.handle, known: file.lastModified };
    sayDrift(false);

    return true;
  } catch {
    return false;
  }
}

/** Pre-keyed single log. Migrated once into the session project's slot. */
const LEGACY_STEPS = "mndflow.steps.v1";
/** Which project the single-project session is holding. */
const CURRENT = "mndflow.project.v1";
/** Open projects and their order — not any project's log. */
const WORKSPACE = "mndflow.workspace.v1";

const STEPS_PREFIX = "mndflow.steps.";
const STEPS_SUFFIX = ".v1";

/** What the strip should say after other projects' history was given up to
 *  free space. Distinct from `⚠ not being saved — export`. */
const PRESSURE_NOTE = "⚠ older history checkpointed";

function stepsKey(id: string): string {
  return `${STEPS_PREFIX}${id}${STEPS_SUFFIX}`;
}

/** Whether this log is still only what opening or importing left — nothing
 *  somebody did, so it does not earn a key. */
function pristine(steps: Step[]): boolean {
  return steps.length === 0 || steps.every((s) => isCheckpoint(s));
}

function keyed(id: string): boolean {
  try {
    return localStorage.getItem(stepsKey(id)) !== null;
  } catch {
    return false;
  }
}

/** Write one project's log. False when the browser refused the write. */
function writeProject(id: string, steps: Step[]): boolean {
  try {
    localStorage.setItem(stepsKey(id), JSON.stringify(steps));

    return true;
  } catch {
    return false;
  }
}

/** Fold another project's full history into one checkpoint, freeing quota.
 *  The project being saved is left alone — it is the one being worked in. */
function relieve(except: string): boolean {
  let trimmed = false;

  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }

    for (const key of keys) {
      if (!key.startsWith(STEPS_PREFIX) || !key.endsWith(STEPS_SUFFIX)) continue;
      if (key === LEGACY_STEPS) continue;
      const id = key.slice(STEPS_PREFIX.length, -STEPS_SUFFIX.length);
      if (!id || id === except) continue;

      try {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        const steps = JSON.parse(raw) as Step[];
        if (!Array.isArray(steps) || pristine(steps)) continue;

        const next = [makeStep("checkpoint", "checkpoint",
          [{ op: "checkpoint", graph: fold(steps), at: stepsIn(steps) }])];
        localStorage.setItem(key, JSON.stringify(next));
        trimmed = true;
      } catch {
        // This neighbour could not shrink; try the next.
      }
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

let pressure: string | null = null;
const pressureListeners = new Set<(next: string | null) => void>();

function sayPressure(next: string | null) {
  if (pressure === next) return;
  pressure = next;
  for (const listener of pressureListeners) listener(pressure);
}

/** Subscribe to the pressure note. Fires once with the current value, then
 *  when other projects are checkpointed to free space (or the note clears). */
export function watchPressure(listener: (next: string | null) => void): () => void {
  pressureListeners.add(listener);
  listener(pressure);

  return () => { pressureListeners.delete(listener); };
}

/** The advisory left after a pressure trim, or null. */
export function pressureNote(): string | null {
  return pressure;
}

/** Clear the pressure advisory — the shell dismisses it. */
export function clearPressure(): void {
  sayPressure(null);
}

/** Move the pre-keyed log into this project's slot, once. */
function migrateLegacy(into: string): void {
  try {
    const legacy = localStorage.getItem(LEGACY_STEPS);
    if (legacy === null) return;
    if (localStorage.getItem(stepsKey(into)) === null) {
      localStorage.setItem(stepsKey(into), legacy);
    }
    localStorage.removeItem(LEGACY_STEPS);
  } catch {
    // Migration failed; the keyed slot stays empty and the session starts fresh.
  }
}

/** Which project this browser is holding, minted once and kept for life.
 *
 *  Lives beside the log rather than in it: it is what a cross-project reference
 *  points at, so renaming a project — or its file — has to break nothing. Taken
 *  from an imported file where one names itself. */
export function projectId(): string {
  try {
    const held = localStorage.getItem(CURRENT);
    if (held) {
      migrateLegacy(held);

      return held;
    }

    const fresh = newId("proj");
    localStorage.setItem(CURRENT, fresh);
    migrateLegacy(fresh);

    return fresh;
  } catch {
    return newId("proj");
  }
}

/** Adopt the id an imported file carries, so a project keeps its identity
 *  across the round trip. */
export function adoptId(id: string): void {
  try {
    if (id) localStorage.setItem(CURRENT, id);
  } catch {
    // Identity lost, nothing more.
  }
}

/** What one project's storage holds, unchecked. The caller takes it through
 *  the door. */
export function loadProject(id: string): unknown {
  try {
    const raw = localStorage.getItem(stepsKey(id));

    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Whether that project's log reached storage. False means out of quota or
 *  blocked by the browser: the session carries on, and the only copy is now
 *  the tab.
 *
 *  A pristine log (empty, or only checkpoints) does not create a key — opening
 *  or importing alone is not a change. Under quota pressure, other projects
 *  lose history to a checkpoint before this write is retried. */
export function saveProject(id: string, steps: Step[]): boolean {
  if (!keyed(id) && pristine(steps)) return true;

  if (writeProject(id, steps)) return true;

  if (relieve(id) && writeProject(id, steps)) {
    sayPressure(PRESSURE_NOTE);

    return true;
  }

  return false;
}

/** The session project's log — what the single-project hook still calls. */
export function load(): unknown {
  return loadProject(projectId());
}

/** Persist the session project's log. */
export function save(steps: Step[]): boolean {
  return saveProject(projectId(), steps);
}

/** What the workspace remembers apart from every graph — unchecked. Absent
 *  means nothing has been filed yet. */
export function loadWorkspace(): unknown {
  try {
    const raw = localStorage.getItem(WORKSPACE);

    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Whether the workspace reached storage. Same failure rule as a project log. */
export function saveWorkspace(held: unknown): boolean {
  try {
    localStorage.setItem(WORKSPACE, JSON.stringify(held));

    return true;
  } catch {
    return false;
  }
}

/** Hand bytes to the user as a named download — shared by JSON and SVG. */
function offer(text: string, name: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Hand the project to the user as a file — the graph, laid out by `file`.
 *  The name follows the project's own, so the two cannot drift apart. The
 *  fallback when no live handle is available; Chromium prefers `writeOut`. */
export function download(text: string, title: string): void {
  offer(text, fileName(title), "application/json");
}

/** Hand a rendered SVG of the open layer beside the JSON source — same stem,
 *  different extension, so a commit can carry both. Always a download: the
 *  live handle is the project's JSON file, not a second pick. */
export function downloadSvg(markup: string, title: string): void {
  offer(markup, svgFile(title), "image/svg+xml");
}

/** Write the project to the bound file, or pick one (Chromium), or download.
 *  A cancelled picker writes nothing — it does not fall through to download.
 *  A bound handle whose name is not this export's suggested file is left alone
 *  and a fresh picker is offered, so a workspace export does not overwrite a
 *  project file (and the reverse). True when something was written or offered. */
export async function writeOut(text: string, title: string): Promise<boolean> {
  const want = fileName(title);
  if (held && sameFile(held.handle, want) && await writeHandle(text)) return true;

  if (canBind()) {
    try {
      const handle = await (globalThis as PickerHost).showSaveFilePicker!({
        suggestedName: want,
        types: [FILE_TYPE],
      });
      await take(handle);
      if (await writeHandle(text)) return true;
    } catch (err) {
      if (isAbort(err)) return false;
      // Picker failed for another reason — fall through to download.
    }
  }

  download(text, title);
  return true;
}

/** Open a file through the Chromium picker and bind its handle.
 *
 *  - a string is the file contents (handle held)
 *  - `false` means the user cancelled — do not fall through to a plain input
 *  - `null` means the API is absent or failed — the shell may use a plain input */
export async function pickIn(): Promise<string | false | null> {
  if (!canBind()) return null;

  try {
    const [handle] = await (globalThis as PickerHost).showOpenFilePicker!({
      multiple: false,
      types: [FILE_TYPE],
    });
    // Ask for write now so a later export can reuse this handle; a refusal
    // still leaves us able to read and watch.
    await permit(handle, "readwrite");
    const file = await handle.getFile();
    const text = await file.text();
    await take(handle, file.lastModified);

    return text;
  } catch (err) {
    if (isAbort(err)) return false;

    return null;
  }
}

/** Re-read the bound file without accepting its stamp. Null when unbound.
 *  The shell calls `settleBound` only after the text has replaced the session —
 *  otherwise a refused file would silence the drift warning. */
export async function readBound(): Promise<string | null> {
  const current = held;
  if (!current) return null;

  try {
    if (!(await permit(current.handle, "read"))) return null;
    if (held !== current) return null;
    const file = await current.handle.getFile();
    if (held !== current) return null;

    return await file.text();
  } catch {
    if (held === current) release();

    return null;
  }
}

/** Accept the bound file's current lastModified as known — after a successful
 *  reopen has taken the disk copy into the session. */
export async function settleBound(): Promise<void> {
  const current = held;
  if (!current) return;

  try {
    if (!(await permit(current.handle, "read"))) return;
    if (held !== current) return;
    const file = await current.handle.getFile();
    if (held !== current) return;
    held = { handle: current.handle, known: file.lastModified };
    sayDrift(false);
  } catch {
    if (held === current) release();
  }
}

/** The raw contents of a file, parsed and no more. Whether it is something this
 *  build can read is decided at the door — see `check.entering`. */
export function readFile(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Display preferences. Global to the app rather than to a project: they
 *  change nothing in the graph, appear in no export, and record no history,
 *  so they have no business in the step log. */
function flag(key: string, fallback: boolean) {
  const name = `mndflow.${key}.v1`;
  const initial = (() => {
    try {
      const raw = localStorage.getItem(name);

      return raw === null ? fallback : raw === "true";
    } catch {
      return fallback;
    }
  })();

  return {
    initial,
    set(on: boolean) {
      try {
        localStorage.setItem(name, String(on));
      } catch {
        // Preference lost, nothing more.
      }
    },
  };
}

/** Right-angled relations instead of curves. */
export const angular = flag("angular", false);
/** Interfaces drawn on the canvas — on by default; off reads the structure
 *  alone, with relations still meeting the frame edge where a port would be. */
export const ports = flag("ports", true);
/** Interfaces listed in the object explorer — off by default, since the tree
 *  is for structure and a port per relation would bury it. */
export const treePorts = flag("tree-ports", false);
