/** What the harness binds.
 *
 *  The whole host contract as a filesystem sees it. `score` is absent — the
 *  scorer is the browser's, and everything here works without it, which is the
 *  claim an unbound port is supposed to prove. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Net } from "@mnd/core";

/** **Outside the workspace is wherever the host says it is.** A workspace here
 *  is a file, so the rest of the disk is already outside it — and a URL is
 *  outside in the ordinary way. One port, two answers, and nothing above it
 *  knows which it got. */
export function node_net(): Net {
  return {
    async get(where) {
      try {
        if (/^https?:/.test(where)) {
          const got = await fetch(where);
          return got.ok ? await got.text() : null;
        }
        return readFileSync(resolve(where), "utf8");
      } catch {
        return null;
      }
    },
  };
}
