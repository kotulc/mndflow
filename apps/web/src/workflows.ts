/** The wording, compiled in at build time.
 *
 *  A surface may not read a file and the loop takes what a host gives it, so
 *  gathering the YAML is the app's — the same shape as binding a port. Nothing
 *  parses anything at run time: the plugin turns each file into a module.
 *
 *  Every file in the folder is a domain, minus the two that are not. Adding one
 *  is adding a file. */

import { read_domain, read_entry, read_operations, type Domain, type Wordings }
  from "@mnd/terminal/loop";
import entry from "../../../workflows/entry.yaml";
import operations from "../../../workflows/operations.yaml";

const files = import.meta.glob("../../../workflows/*.yaml",
                              { eager: true, import: "default" }) as Record<string, unknown>;

export function wordings(): Wordings {
  const domains: Record<string, Domain> = {};
  for (const [path, raw] of Object.entries(files)) {
    if (/(entry|operations)\.yaml$/.test(path)) continue;
    const one = read_domain(raw);
    domains[one.name] = one;
  }
  return { entry: read_entry(entry), operations: read_operations(operations), domains };
}
