/** The app's bootstrap: a small file the app reads and never writes.
 *
 *  It names the workspace to open when storage is empty, the catalogue, and the defaults the
 *  chrome starts from. It is not a graph. */

import { parse } from "yaml";

/** What a bootstrap file may say. Absent keys are the app's own defaults. */
export type Boot = {
  /** A workspace file to open when storage is empty, as a path the app can fetch. */
  workspace?: string;
  /** Where the catalogue is listed. */
  catalogue?: string;
  theme?: string;
  /** Whether the tray starts open. */
  tray?: boolean;
  display?: { lattice?: boolean; legend?: boolean; corner?: "top" | "bottom" };
  /** A view to land on. A layer view is the home's to decide. */
  view?: string;
  /** What the file says that this build does not read: unknown keys and values it refuses. */
  stray?: string[];
};

/** The keys a bootstrap file may say, at the top and under `display`. */
const KEYS = ["workspace", "catalogue", "theme", "tray", "display", "view"];
const DISPLAY = ["lattice", "legend", "corner"];


/** A bootstrap file read. A file that is not a mapping says nothing; what it says that is not
 *  read is listed in `stray`, never refused, so the app still opens. */
export function boot_of(text: string): Boot {
  let got: unknown;
  try { got = parse(text); } catch { return {}; }
  if (!got || typeof got !== "object" || Array.isArray(got)) return {};
  const row = got as Record<string, unknown>;
  const display = row["display"];
  const shown = display && typeof display === "object" && !Array.isArray(display)
    ? display as Record<string, unknown> : {};
  const corner = shown["corner"] === "top" || shown["corner"] === "bottom"
    ? shown["corner"] : undefined;
  const tray = row["tray"];
  const open = tray === true || tray === "open" ? true
    : tray === false || tray === "shut" ? false : undefined;
  const out: Boot = {};
  const stray = [...Object.keys(row).filter((k) => !KEYS.includes(k)),
    ...Object.keys(shown).filter((k) => !DISPLAY.includes(k)).map((k) => `display.${k}`),
    ...(tray !== undefined && open === undefined ? ["tray"] : []),
    ...(shown["corner"] !== undefined && !corner ? ["display.corner"] : [])];
  if (stray.length) out.stray = stray;
  if (typeof row["workspace"] === "string") out.workspace = row["workspace"];
  if (typeof row["catalogue"] === "string") out.catalogue = row["catalogue"];
  if (typeof row["theme"] === "string") out.theme = row["theme"];
  if (open !== undefined) out.tray = open;
  if (typeof row["view"] === "string") out.view = row["view"];
  const lattice = typeof shown["lattice"] === "boolean" ? shown["lattice"] : undefined;
  const legend = typeof shown["legend"] === "boolean" ? shown["legend"] : undefined;
  if (lattice !== undefined || legend !== undefined || corner) {
    out.display = {
      ...(lattice !== undefined ? { lattice } : {}),
      ...(legend !== undefined ? { legend } : {}),
      ...(corner ? { corner } : {}),
    };
  }
  return out;
}
