import { readFileSync } from "node:fs";
import { read, fold, shown_name, travels, edges_in, behaviours_of } from "@mnd/core";
import { FLOOR } from "@mnd/defs";
for (const ws of ["mndsite", "code"]) {
  const g = fold(read(readFileSync(`../../samples/${ws}.json`, "utf8"), FLOOR).log, FLOOR);
  const owners = Object.values(g.blocks).filter((b) => behaviours_of(g, b.id).length && !b.def);
  for (const o of owners) {
    const layer = Object.values(g.blocks).find((b) => b.id === o.parent)!;
    let at = o.parent; while (at && g.blocks[at] && ["entry points","components","shared"].includes(g.blocks[at]!.name)) at = g.blocks[at]!.parent;
    const t = travels(g, o.id, at!);
    console.log(ws, shown_name(g, o.id), "on", shown_name(g, at!), "blocks", t.blocks.length, "lines", t.lines.length, "of", edges_in(g, at!).length);
  }
}
