/** **Every diagram of a workspace, screenshot as the app draws it** (dev only). Run from the repo
 *  root with the dev server up:
 *    npx vite-node scripts/shots.ts <workspace.json> <out folder> [port] [path regex]
 *  Each diagram (and library definition with parts, as `mnd measure` picks them) is entered by
 *  the page's dev hook (`window.mnd`) and saved as `<out>/<n>-<path>.png`, at a landscape and a
 *  portrait window. */

import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";
import { diagram_kind, fold, is_filing, is_model, lens_of, package_of, path, placing_of, read,
         shown_name, type Id } from "@mnd/core";
import { FLOOR } from "@mnd/defs";

const [source, out, port = "5175", filter = ""] = process.argv.slice(2);
if (!source || !out) throw new Error("shots <workspace.json> <out folder> [port] [path regex]");

/** The windows looked through: the app's default landscape and a portrait one. */
const WINDOWS = { landscape: { width: 1600, height: 1000 }, portrait: { width: 900, height: 1300 } };


/** The layers `mnd measure` counts: diagrams and library definitions holding parts. */
const graph = fold(read(readFileSync(source, "utf8"), FLOOR).log, FLOOR);
const library = (id: Id) => !is_model(graph, id) && package_of(graph, id) === graph.root
  && !is_filing(graph, id) && lens_of(graph, id, "domain") !== null;
const named = (id: Id) => path(graph, id).map((b) => shown_name(graph, b.id)).join(" › ");
const layers = Object.keys(graph.blocks).filter((id) =>
  (!!diagram_kind(graph, id) || library(id)) && placing_of(graph, id) !== "treemap"
  && new RegExp(filter, "i").test(named(id)));

mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "msedge" });
const served = `/${resolve(source).replace(/\\/g, "/").split("/mndflow/")[1]}`;
for (const [shape, size] of Object.entries(WINDOWS)) {
  const page = await browser.newPage({ viewport: size });
  await page.route("**/mndflow.yaml", (r) => r.fulfill({
    body: `workspace: ${served}\ncatalogue: /packages/index.json\ntheme: light\ntray: shut\n` }));
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => "mnd" in window, null, { timeout: 30000 });
  await page.waitForTimeout(3000);
  for (const [i, id] of layers.entries()) {
    /** Read twice: from the other map, the first read only brings the block into view. */
    for (const wait of [1500, 2500]) {
      await page.evaluate((x) => (window as never as { mnd: { act: Function } }).mnd
        .act("read", { id: x }), id);
      await page.waitForTimeout(wait);
    }
    const file = `${String(i).padStart(2, "0")}-${named(id).replace(/[^\w]+/g, "_")}-${shape}.png`;
    await page.screenshot({ path: join(out, file) });
    console.log(`${file}  ${named(id)}`);
    await page.evaluate(() => (window as never as { mnd: { act: Function } }).mnd.act("widen"));
  }
  await page.close();
}
await browser.close();
