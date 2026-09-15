/** What the harness binds. */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Net } from "@mnd/core";

/** Outside the workspace is wherever the host says it is. */
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
