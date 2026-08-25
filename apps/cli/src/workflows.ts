/** The wording, read off disk.
 *
 *  A surface may not read a file and the loop takes what a host gives it, so
 *  gathering the YAML is the host's — the same shape as binding a port. The web
 *  compiles it in at build time; here it is parsed, because a headless harness
 *  has a filesystem and no bundler. */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "js-yaml";
import { read_domain, read_entry, read_operations, type Domain, type Wordings }
  from "@mnd/terminal/loop";

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKFLOWS = resolve(HERE, "../../../workflows");

const parse = (name: string): unknown => load(readFileSync(join(WORKFLOWS, name), "utf8"));

/** Every file in the folder is a domain, minus the two that are not. */
export function wordings(): Wordings {
  const domains: Record<string, Domain> = {};
  for (const file of readdirSync(WORKFLOWS)) {
    if (!file.endsWith(".yaml") || /^(entry|operations)\.yaml$/.test(file)) continue;
    const one = read_domain(parse(file));
    domains[one.name] = one;
  }
  return {
    entry: read_entry(parse("entry.yaml")),
    operations: read_operations(parse("operations.yaml")),
    domains,
  };
}
