// Reference only (2026-11-16): the generator that laid the tree-and-chips mockup (claude.ai/artifact/Wgi6FEJTDjSKQVSSsKLexp).
// It shows the agreed rules as code: landscape-biased squarify, legible-or-closed, the shared header, wells.
// Run from the repo root: node docs/design/mockups/tree-chips/board.cjs <spec.json> <out.html>
// Builds a mockup board. Cards and chips share one header: the name, then a line of kind, presentations,
// counts and tags flowing into the width left, and the kind's square icon at the right, as tall as both
// lines. Below it a card shows its table; a chip shows its well (its children as a treemap; a diagram's
// well framed in its hue).
const fs = require("fs");
const d3 = require("d3-hierarchy");

const K = 2, TITLE = 30, PAD = 6, FLOOR = { w: 96, h: 30 };
const HUE = { flow: 350, sequence: 295, class: 85, entity: 85, mapping: 40, swimlane: 60, dataflow: 170 };

/** The app's own icons (theme `icons.tsx`), by what a cell is. */
const ICON = {
  flow: "M2.5 12h5M16.5 12h5M7.5 12L12 7.5 16.5 12 12 16.5zM19 9.5l2.5 2.5-2.5 2.5",
  sequence: "M6 3.5v17M18 3.5v17M6 9h12M15.5 6.5L18 9l-2.5 2.5M18 15H6M8.5 12.5L6 15l2.5 2.5",
  class: "M5 3.5h14v17H5zM5 8h14M5 14h14M8 11h8M8 17h6",
  entity: "M2.5 7.5h5v9h-5zM16.5 7.5h5v9h-5zM7.5 12h9M10 9.5v5M12.5 12l4-3.5M12.5 12l4 3.5",
  mapping: "M3.5 5h6M3.5 12h6M3.5 19h6M14.5 5h6M14.5 12h6M14.5 19h6M10.5 5l3 7M10.5 12l3 7",
  swimlane: "M3.5 4h17v16h-17zM9.2 4v16M14.8 4v16M5 7h2.5v2.5H5zM10.7 11.5h2.5V14h-2.5zM16.3 16h2.5v2.5h-2.5z",
  dataflow: "M3 12h4M17 12h4M7 8.5h10v7H7zM10 5.5h4M12 5.5v3",
  context: "M3.5 3.5h17v17h-17zM8.5 8.5h7v7h-7z",
  container: "M6 6h12v12H6z",
  folder: "M3.5 7.5h6l2 2h9v9h-17z",
  leaf: "M7 7h10v10H7z",
  actor: "M12 3.5a3 3 0 1 0 0 6a3 3 0 1 0 0-6zM5.5 20.5c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5",
  external: "M3.5 6.5h17v11h-17z",
  data: "M5 6.5c0-1.4 3.1-2.5 7-2.5s7 1.1 7 2.5-3.1 2.5-7 2.5-7-1.1-7-2.5M5 6.5v11c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-11M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5",
};
const PM = (n) => `<span class="pm"><svg width="7" height="8" viewBox="0 0 7 8" aria-hidden="true"><path d="M0 0 L7 4 L0 8 Z" fill="currentColor"></path></svg>${n}</span>`;
const size = (w, h) => Math.max(11, Math.min(20, Math.round(Math.sqrt(w * h) / 13)));
const weight = (n) => Math.sqrt((n ?? 0) + 1);
const kid = (k) => (Array.isArray(k) ? { name: k[0], n: k[1] ?? 0, kind: k[2] ?? "leaf" } : { n: k, kind: "leaf" });
const heft = (c) => c.n ?? (c.kids ?? []).map(kid).reduce((a, k) => a + k.n + 1, 0);

/** Which icon a cell wears. */
function icon_of(cls, k, c) {
  if (cls === "dia") return k;
  if (cls === "actor") return "actor";
  if (cls === "ext") return "external";
  if (cls === "fold") return "folder";
  if (cls === "hold") return c.word === "context" ? "context" : "container";
  return c.hue === 170 ? "data" : "leaf";
}

/** **The header**, one for cards and chips: the name, then a line that flows into the width left
 *  (kind, presentations, counts, tags; an item that does not fit drops whole), and the square icon. */
function header(c, cls, k, one) {
  /** The kind's word, where the cell's own outline does not already say it. */
  const word = ["actor", "ext"].includes(cls) ? "" : c.word ?? (k ?? "");
  const meta = [word ? `<span class="${cls === "dia" ? "kw" : ""}">${word}</span>` : "", c.pm ? PM(c.pm) : "",
    ...(c.ct ? c.ct.split(" · ").map((x) => `<span>${x}</span>`) : []),
    ...(c.tags ?? []).map((t) => `<span class="tag">${t}</span>`)].filter(Boolean).join("");
  const ic = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[icon_of(cls, k, c)]}"></path></svg>`;
  return `<div class="hd${one ? " one" : ""}"><div class="tx"><div class="nm">${c.name}</div><div class="meta">${meta}</div></div>${ic}</div>`;
}

/** A cell's children, laid in its well; each named where it has room. */
function well(c, w, h) {
  const kids = (c.kids ?? []).map(kid);
  if (!kids.length || w < 30 || h < 10) return "";
  const root = d3.hierarchy({ kids }, (d) => d.kids).sum((d) => (d.kids ? 0 : weight(d.n))).sort((a, b) => b.value - a.value);
  d3.treemap().tile(d3.treemapSquarify.ratio(1.6)).size([w / K, h]).paddingInner(2 / K)(root);
  return root.leaves().map((l) => {
    const x = l.x0 * K, y = l.y0, lw = (l.x1 - l.x0) * K, lh = l.y1 - l.y0;
    const [cls, k] = l.data.kind.split(":");
    const hue = k ? HUE[k] : cls === "actor" ? 285 : null;
    const at = `${hue !== null ? `--h:${hue};` : ""}left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${lw.toFixed(1)}px;height:${lh.toFixed(1)}px`;
    return `<div class="k ${cls}" style="${at}">${l.data.name && lw >= 58 && lh >= 18 ? `<span>${l.data.name}</span>` : ""}</div>`;
  }).join("");
}

/** One chip at (x, y, w, h): the header, then its well. */
function chip(c, x, y, w, h) {
  const [cls, k] = (c.kind ?? "leaf").split(":");
  const hue = k ? HUE[k] : c.hue;
  const s = size(w, h);
  const at = `${hue !== undefined ? `--h:${hue};` : ""}--s:${s}px;left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  const head = Math.round(s * 1.25 + 4 + 15);
  const one = h < head + 22;
  const top = 8 + head + 8, wh = h - top - 9;
  const roomy = !one && wh >= 26 && (c.kids?.length ?? 0) > 0;
  const inner = roomy ? `<div class="well ${cls}" style="top:${top}px">${cls === "dia" ? "<span class=\"tab\">diagram</span>" : ""}<div class="ks">${well(c, w - 34, wh - 8)}</div></div>` : "";
  return `<div class="c ${cls}${one ? " one" : ""}" style="${at}">${header(c, cls, k, one)}${inner}</div>`;
}

/** One card at (x, y, w, h): the same header, then its table. */
function card(c, x, y, w, h) {
  const [cls, k] = (c.kind ?? "leaf").split(":");
  const hue = k ? HUE[k] : c.hue;
  const at = `${hue !== undefined ? `--h:${hue};` : ""}--s:13px;left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  const one = h < 52;
  const rows = (c.rows ?? []).map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("");
  return `<div class="card ${cls}${one ? " one" : ""}" style="${at}">${header(c, cls, k, one)}${rows ? `<table class="rows">${rows}</table>` : ""}</div>`;
}

/** An open box: its title left, its marks right. */
function box(c, x, y, w, h, depth) {
  return `<div class="b d${depth}${c.sys ? " sys" : ""}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="t"><b>${c.name}</b><span>${c.title ?? ""}</span>${c.pm ? `<span class="bic">${PM(c.pm)}</span>` : ""}</div></div>`;
}

/** A tree laid in an area, closing its lightest boxes until every chip holds its name. */
function tree(spec, ax, ay, aw, ah, gap) {
  for (;;) {
    const root = d3.hierarchy(spec, (d) => (d.open ? d.kids : null)).sum((d) => (d.open ? 0 : weight(heft(d))))
      .sort((a, b) => b.value - a.value);
    d3.treemap().tile(d3.treemapSquarify.ratio(1.6)).size([aw / K, ah]).round(false)
      .paddingOuter((d) => (d.depth === 0 ? 0 : PAD / K)).paddingTop((d) => (d.depth === 0 ? 0 : TITLE))
      .paddingInner((d) => (d.depth === 0 ? gap : 6) / K)(root);
    const all = root.descendants().slice(1).map((d) => ({ d, x: Math.round(ax + d.x0 * K), y: Math.round(ay + d.y0), w: Math.round((d.x1 - d.x0) * K), h: Math.round(d.y1 - d.y0) }));
    const bad = all.some((a) => !a.d.data.open && (a.w < FLOOR.w || a.h < FLOOR.h));
    const open = root.descendants().filter((d) => d.data.open && d.depth >= 2);
    if (!bad || !open.length) {
      const boxes = all.filter((a) => a.d.data.open).sort((a, b) => a.d.depth - b.d.depth).map((a) => box(a.d.data, a.x, a.y, a.w, a.h, a.d.depth));
      return boxes.concat(all.filter((a) => !a.d.data.open).map((a) => chip(a.d.data, a.x, a.y, a.w, a.h))).join("\n");
    }
    /** The lightest open box closes into a chip holding its parts. */
    const light = open.sort((a, b) => a.value - b.value)[0].data;
    Object.assign(light, { open: false, kind: "hold", word: light.title?.split(" · ")[0], ct: light.title?.split(" · ").slice(1).join(" · "),
      kids: light.kids.map((k) => [k.name, heft(k), k.kind ?? "leaf"]) });
  }
}

const CSS = fs.readFileSync(__dirname + "/board.css", "utf8");
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const parts = [];
for (const it of spec.items ?? []) {
  parts.push(it.box ? box(it, it.x, it.y, it.w, it.h, it.depth ?? 1) : it.card ? card(it, it.x, it.y, it.w, it.h) : chip(it, it.x, it.y, it.w, it.h));
}
if (spec.tree) parts.push(tree(spec.tree, ...spec.area, spec.gap ?? 6));
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${spec.title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
${CSS}</style>
</helmet>
<div class="mf" style="width:${spec.w}px;height:${spec.h}px">
${spec.head ?? ""}
${parts.join("\n")}
${spec.tail ?? ""}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${spec.w},"height":${spec.h}}}'>
class Component extends DCLogic {
renderVals() { return {}; }
}
</script>
</body>
</html>
`;
fs.writeFileSync(process.argv[3], html);
console.log(process.argv[3], parts.length);
