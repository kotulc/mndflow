/** A project's structure as lines a person reads: the packages' levels, then each package's
 *  score, entry, foundation and components by level, nested components indented. */

import type { Code } from "./read";
import { stem_of, type Comp, type Levels, type Shape } from "./structure";


/** The report's lines. */
export function report(code: Code, shapes: Shape[], system: Levels): string[] {
  const name = new Map(code.packages.map((p) => [p.dir, p.name]));
  const out = [`${code.name}: ${code.packages.length} packages`, ...ranked(system, (d) => name.get(d)!, "  ")];
  for (const s of shapes) {
    const { score } = s;
    out.push("", `${s.pkg.name} (${s.pkg.dir}) ${s.pkg.modules.length} modules · modularity `
      + `${score.modularity?.toFixed(2) ?? "—"} · ${score.fit ? "fits" : "over budget"} · depth `
      + `${score.depth} · cycles ${score.cycles}`);
    if (s.entry.length) out.push(`  entry       ${s.entry.map(stem_of).join(" ")}`);
    if (s.foundation.length) out.push(`  foundation  ${s.foundation.map(stem_of).join(" ")}`);
    const by = new Map(s.comps.map((c) => [c.anchor, c]));
    s.levels.ranks.forEach((rank, i) => {
      for (const anchor of rank) out.push(...comp_lines(by.get(anchor)!, `  L${i} `, "      "));
    });
    for (const c of s.levels.cycles) {
      out.push(`  cycle       ${c.map((a) => by.get(a)!.name).join(" ↔ ")}`);
    }
    const name = (key: string) => by.get(key)?.name ?? stem_of(key);
    for (const p of s.paths) {
      out.push(`  path        ${stem_of(p.entry)}: ${p.steps.map((x) =>
        `${name(x.from)} → ${name(x.to)} (${x.names.slice(0, 3).join(", ")}`
        + `${x.names.length > 3 ? ` +${x.names.length - 3}` : ""})`).join(" · ")}`);
    }
  }
  return out;
}

/** A layer's ranks, one line each. */
function ranked(levels: Levels, name: (n: string) => string, indent: string): string[] {
  const out = levels.ranks.map((r, i) => `${indent}L${i} ${r.map(name).join(" ")}`);
  for (const c of levels.cycles) out.push(`${indent}cycle ${c.map(name).join(" ↔ ")}`);
  return out;
}

/** A component's line, its modules listed where it is not split, then its parts below. */
function comp_lines(c: Comp, lead: string, indent: string): string[] {
  const head = c.modules.length === 1 ? `${lead}${c.name}`
    : `${lead}${c.name} (${c.modules.length})${c.parts.length ? ""
      : `: ${c.modules.map(stem_of).join(" ")}`}`;
  return [head, ...c.parts.flatMap((p) => comp_lines(p, `${indent}- `, `${indent}  `))];
}
